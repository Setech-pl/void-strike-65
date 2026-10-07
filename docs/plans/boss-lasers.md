# Plan — M5b-S4b: the boss lasers

**Status: implemented, pending the owner's smoke — `OWNER-SMOKE CANDIDATE`
(2026-10-07, S4b.5).** Phase B is built to §12's owner decisions, the
addendum's (§13: AUD-03, the AUD-04 cap) and the smoke rounds' (§15: D1, D3;
§16: B2 reversing Q1's option A, the centred beam; §17: W1, E4, the projector
tower, the first shot on exposure, the 90–120 s fight; §18: slot E, F1's
flicker warning, the band flash removed, the capsule from destroyed modules
but not the defeating kill); the final figures are §18, the clause coverage
§14. Branch `feat/boss-lasers` from `main` `1a3c8bf`. §0–§11 are Phase A's
record (audit, options, previews), kept as written: their probes were reverted
and none of their output is committed as evidence.

Parent plan: [m5-loading-boss.md](m5-loading-boss.md) — S4b in §5.13.7, the
lasers in §5.5, the contact scenario in §5.8, decisions A–O in §1.6.
Conventions are that plan's §0.4: **M** measured, **IC** instruction count,
**AN** analogy, **G** guess, **EMULATOR** for figures Atari800 cannot vouch
for on hardware. Code estimates on this project run 2–3× low; every IC byte
figure below is shown raw and ×2–3, and the ×3 figure is the one a fit is
decided on.

---

## 0. Step 0, baseline, differences

### 0.1 Step 0

| | |
| --- | --- |
| `main` | `1a3c8bf chore(evidence): bind the plasma FX ATR e0aa7062...`; tree clean; contains the plasma-fx merge ([plasma-fx.md](plasma-fx.md) status "implemented (B2, 2026-10-06), `OWNER-SMOKE CANDIDATE`") |
| worktrees | one: `~/Projects/dark-fighter` (no baseline worktree was needed: nothing changed before the measurements, so the branch measured `main`'s bytes) |
| ATR SHA-256 | `e0aa70620e1ae07449410521c65eade0a8cd77254a78a44a140743dc348f41a1` |
| boot SHA-256 | `3be9a2410be344f6aa84931b7440708f9013cf5b9f0937d289d983faf8a8531a` |
| boss debug ATR (`build/level-1-s4/`) | `0ad326648b89241d274b7efbf4b46726916430ace4897c4d3d385055ec35de95` (rebuilt clean after the burn probe, same hash) |
| evidence binding | `build/manifest.json` `runtimeEvidence.status: final-bound`, the two hashes above |

### 0.2 Baseline, each figure with its source

| Figure | Value | Source |
| --- | --- | --- |
| worst fence margin, non-boss frames | **1,472** (`2-sweep-fire6` f311) | M this session: fence scan of the 54 default replay CSVs with `scripts/pal-timing-audit.mjs`'s samples (scratch `fence-scan.mjs`); = STATUS |
| DMA-on maximum | **31,240** (`director-complete-2` f5797) | same scan; = STATUS, `docs/runtime-wall-trace.json` |
| boss frames: worst fence / DMA-on | **12,974** (`director-complete-1` f11216, a module destroyed) / **28,687**, over 12,499 boss rows, 0 misses | same scan; = STATUS |
| DLIs per host frame / violations | 2, 3 in the boss sector / 0 | STATUS (plasma-fx table) |
| boss stress work, native (limit 7,000) | **6,689** fortress / **5,518** core boss | M this session: `node --test --test-name-pattern=Q-B6 tests/boss-fortress.test.mjs tests/boss-runtime.test.mjs` |
| the boss's UPDATE stage on boss rows (DMA-on) | mean 1,788, max **7,851**; **7,668** on f11216 | M: profile clocks 7→8 of the three `director-complete-*` CSVs |
| initial block / STOP | **13,618 / 13,652 B** | `build/manifest.json` `transportCapacity.initialBootContentBytes` |
| boot / extension / total sectors | **107 / 104 / 211** | manifest; STATUS |
| slot A / slot C / install run / scratch page | **1,995 / 2,003 / 346 / 249 B** (53 / 45 / 38 / 7 free) | manifest `boss` |
| boss entry | 49 sectors, 188 host frames (EMULATOR) | plan §5.16.6 |
| boss charset / summary module | `$0C00`; `$0500-$0BFF` (1,677 B, 115 free) | manifest |
| `$1900-$1FFF` | unclaimed, 1,792 B — **now proven by source and measured on `main` (§3.2)** | generated memory map; this session |
| ATR menu frame / baseline | **550 / 596** | `docs/runtime-wall-trace.json` `boot_deadline` |
| boss fight, EASY / MEDIUM / HARD | 46.0 / 48.6 / 71.2 s | plan §5.16.8; STATUS |
| `npm test` | 1,090 tests, 2 recorded failures (`preview`, "ten heaviest frames …") | STATUS (not re-run in Phase A); [../recorded-test-failures.json](../recorded-test-failures.json) |
| recorded clause failures | 1 — `lower-playfield-hostile-contact-atr-hard` | [../recorded-gate-failures.json](../recorded-gate-failures.json) |

No material disagreement with STATUS.

### 0.3 Where the brief, the plan and the repo differ

The repo wins over the plan, the plan over the brief. Each is reported, none
silently adopted.

1. **"The missiles are unused today" is not true of every sector** (brief,
   Phase A item 2). MEASURED (§2): **M1–M3 carry the capital broadside
   warning** in capital sectors; M0 is unused everywhere; **in the boss sector
   all four are unused**. The owner's "the missiles are reserved for the
   lasers" holds where the lasers live.
2. **The plan's colour (§5.5: `COLPF3` through `PRIOR $10`) is two colours in
   the boss sector.** The band's DLI sets `COLPF3` to the region's hull bulk
   `$32`; below the band it is the hostile `$46`. A fifth-player beam is
   `$32` inside the band and `$46` below it (captured, §4). Decision 8 asks
   for one colour.
3. **The plan's warning fills the missile column 8 rows a frame** (§5.5).
   MEASURED on a probe: **1,295 native cycles per laser per frame**, and the
   same again to erase. §4.2 offers a column written once at the install.
4. **There is no damage source id** (§5.5, §5.8 clause 2). `apply_player_damage`
   (`src/main.s:8154`) takes the amount in A and nothing else. Cheapest honest
   form: the harness watches the laser's own call site (0 runtime bytes).
5. **Damage: the plan keeps the player alive** (§5.8 clause 3: hull 10 →
   10 − `LASER_DAMAGE[HARD]`, alive); **the brief says a beam kills.** Owner
   question Q5.
6. **The warning tone: the plan says channel 2** (§5.5, §5.8 clause 4);
   Q-B4 later put every boss sound on channel 3 so the lead voice is never
   pre-empted. Owner question Q4.
7. **"The missile-plane clause exception"** (§5.9, §5.13.7): no clause reads
   `missile_plane_rows` in OPEN frames today (grep), so there is nothing to
   except. A different observer is affected by option (c): the trace's
   Heavy stale-body check rebuilds the expected P1/P2 plane and flagged a
   laser column on 918 of 919 boss frames in the preview run (§4.5).
8. **`lower-playfield-hostile-contact-atr-hard` "must pass with its clause
   untouched"** (brief) — its clause asserts a capital *shell*: a broadside
   slot FLYING → IMPACT, `capital_player_damage_calls` = 1, exactly two hull
   units, cooldown 25, the shell's final-raster box
   (`scripts/runtime-wall-trace.mjs:4377-4410`). A laser cannot satisfy it as
   written. The plan (§5.8) and **owner answer Q4 (2026-10-03)**: a new session
   `lower-playfield-laser-contact-atr-hard` with its own clauses; the old one is
   **retired by name** once the new one passes. That is followed here (§7);
   owner question Q9 confirms it against the brief's wording.
9. **`boss-escort`** (plan §5.13.7's S4b tests): region 1 has no escort (owner
   answer §5.15.6 item 4). Not applicable to S4b; the Light-in-the-beam branch
   waits for the first region with an escort (S5).
10. **The plasma-fx register audit lists `COLPM3 $28` for the boss band.**
    MEASURED in every boss row: **`COLPM3 = $1C`** (the sector reads OPEN, so
    the capsule's latch publishes it), `COLPM1/2 = $44`, `PRIOR = $00`.
11. Game design decision I's "about two seconds" warning against decision 8's
    ~0.5 s: already recorded by the plan (§5.13, item 5); decision 8 kept.

---

## 1. Inventory (what is true today, file:line)

### 1.1 What the plan specifies for S4b

* **§5.13.7, S4b row**: §5.5's lasers as emitters by tier, the heat through the
  cell-flash ring, the laser damage source id, §5.8's contact session and Q4's
  retirement, the missile-plane clause exception, `PRIOR $10` / `SIZEM $FF`
  with the Q-S4 restore already in place; STOP if slot A passes 2,048 after the
  laser ASM; smoke: the warning readable, the beam's hit and its sound, a
  level-9 review ATR with four emitters.
* **§5.5**: one colour (`COLPF3`, `PRIOR $10`), one missile per laser, up to
  four; warning ~25 frames (two heating looks, a rising tone, the column filled
  off screen); beam 50 frames, one `HPOSM` write; column compare against the
  player and the shots; "destroys everything in its path"; erase; damage
  through `apply_player_damage`; never fires from a dead gun.
* **§5.13.2 item 7**: up to four `emitter` modules with `slot` 1–4; the tier
  `(level − 1) / 4` enables 1 / 2 / 4 slots; the rest become capped armour.
* **§5.8**: the contact session and eight clauses (§7 below).

### 1.2 Weapon modules — emitters against pulse guns

| Fact | Where |
| --- | --- |
| kinds `armour 0, pulse 1, emitter 2, salvo 3, core 4` | `scripts/boss-assets.mjs:69` |
| an emitter carries `slot` 1–4 (each slot authored once); only an emitter may | `scripts/boss-assets.mjs:373-380` |
| any kind may carry `reload` (0 = never fires) | `scripts/boss-assets.mjs:381`, record byte 11 (`:123`) |
| the record's kind byte: kind in bits 0–3, the emitter's slot in bits 4–7 | `scripts/boss-assets.mjs:120`, `:726` |
| a capped emitter: the `capped` plate glyph and `capped.hp` | `scripts/boss-assets.mjs:442-443`, `:701-705` |
| region 1 has **one** emitter slot (`emitter`, 30–33, rows 1–2, 10 HP, `cavityRows` 2, **no reload**), behind `plate-d` | `assets/graphics/boss-regions/region-1/modules.json` |
| the tier rule is switched off: `boss_enabled = 0u` caps every slot | `src/c/boss.c:239-242`, `:261-270` |
| the countdown arms an exposed weapon with a nonzero reload, round-robin; names it in `boss_fire_module` | `src/c/boss.c:219-222`, `:387-420`, `:455-461` |
| `boss_fire` spawns a PULSE shot for whatever module it is named, whatever its kind | `src/hybrid/boss.s:642-698` |

So an emitter with a reload would already be armed and named by the
controller; S4b's dispatch is one kind test in `boss_fire`.

### 1.3 Module states and what a laser does in each

| State | Today | With S4b |
| --- | --- | --- |
| capped (slot not enabled by the tier) | armour with the plate look | unchanged: never a laser |
| covered (alive, `cover & alive ≠ 0`) | absorbs hits, never armed | never fires |
| exposed (open bay / cover gone) | armed if `reload ≠ 0` | when named: warning → beam; one laser per emitter |
| destroyed (`hp = 0`, decision L: disappears) | leaves `armed`, its cells drawn gone | its laser ends on the kill frame (beam off), never restarts |
| the chain (defeat) | `_boss_phase` 2 | every laser off |

### 1.4 Pulse fire and the player's contact with boss shots

`boss_fire` (`src/hybrid/boss.s:642`) puts a PULSE shot (`BOSS_SHOT_ACTIVE
$0E`) into the hostile half of the shared PairShot pool at the module's centre
column. The pool's resident update moves it and tests it against the player
(`interceptor_projectile_hits_player`, `src/main.s:4194`; the call at
`:4130-4132`, `ENEMY_PULSE_DAMAGE_UNITS` 1). `apply_player_damage`
(`src/main.s:8154`) is the one damage gate: ALIVE only, Shield absorbs, the
one-event latch, a 25-frame cooldown (`BROADSIDE_DAMAGE_COOLDOWN`), death at 0
health. In the boss sector the cooldown is counted down by `boss_update`
(`src/hybrid/boss.s:425-428`, the fortress session's fix).

### 1.5 The boss frame's work and the stress test

The capital vector table's UPDATE entry is `boss_update` (`src/hybrid/boss.s:421`),
run inside `handle_collisions` (`src/main.s:5301`); PREPARE_ROW is `boss_motion`
(`:369`); the third DLI is `boss_dli` (`:278`). The stress tests drive five
player shots a frame into every reachable module and count UPDATE + motion +
the three DLIs natively: `tests/boss-fortress.test.mjs:707` (limit `:730`,
**6,689**), `tests/boss-runtime.test.mjs:650` (limit `:679`, **5,518**).

### 1.6 PMG in the boss sector

| Item | Value | Where |
| --- | --- | --- |
| `PMBASE` | `$38`; single-line PMG: missiles `$3B00`, P0 `$3C00`, P1 `$3D00`, P2 `$3E00`, P3 `$3F00`; `$3800-$3AFF` is not PMG DMA (RODATA, loader lists) | `src/main.s:149`, `:163-167`, `:11582`, `:3344-3353` |
| `GRACTL` | 3 (players and missiles) | `src/hybrid/boss.s:1852`; `src/main.s:2681` |
| `DMACTL` | `$3E` (normal playfield, single-line PMG DMA): missile and player DMA run on every frame whatever is drawn | `src/hybrid/boss.s:1854` |
| `PRIOR` | `$00` everywhere (MEASURED on every row of every replay) | `src/main.s:11593`, `:3230` |
| P0 | the ship, `SIZEP0` 1, `COLPM0 $0E` (Shield `$84`) | `src/main.s:2655` |
| P1/P2 | **free** — no Heavy in a boss sector (level compiler refuses one, `scripts/level-compiler.mjs:636-640`); `COLPM1/2 = $44` left by `start_gameplay` (`src/main.s:2667`); `SIZEP1/2` set by every Heavy draw (`:4881`) | — |
| P3 | the capsule (cleared at the boss install) and the death's outer mask; `COLPM3 $1C` in OPEN, the death fire cycle patches it | `src/main.s:3158-3176`, `:4753-4778` |
| M0–M3 | **unused in the boss sector** (§2); `SIZEM` 0; `HPOSM0-3` 0 | Q-S4 table `build/boss-restore.inc` |
| hardware collision registers | **never read** anywhere; `HITCLR` written every frame mid-display by `handle_collisions_clear_latches` | `src/main.s:5330-5333`; grep `M[0-3]PL`/`P0PL` |

### 1.7 Colour registers per region in the boss sector

| Region (scanlines) | Set by | `COLPF0` | `COLPF1` | `COLPF2` | `COLPF3` |
| --- | --- | --- | --- | --- | --- |
| HUD (8–15) | `gameplay_dli_sync_hud` (`src/main.s:3636`) | ring's | `$0E` text | `$00` | ring's (unused by ANTIC 2) |
| divider + band (16–87) | `boss_dli` phase 0 (`src/hybrid/boss.s:282-293`) | `$0A` plates, in-band shots | `$06` | `$28` amber | **`$32` hull bulk** |
| ring (88–239) | `boss_dli` phase 1 (`:300-310`) | `$0E` white stars, hostile heads | allied steel (level data) | `$AE` mint player shots | **`$46` hostile** |
| everywhere | GTIA, unchanged by the DLIs | `COLPM0 $0E`, `COLPM1/2 $44` (no object), `COLPM3 $1C`, `COLBK $00` + flashes | | | |

RGB (Atari800 PAL, the captures' own PLTE): `$46` 128,48,111 · `$32` 80,4,10 ·
`$AE` 159,240,195 · `$0E` 211,211,211 · `$0A` 137,137,137 · `$28` 155,84,70 ·
`$88` 66,111,167 · `$1C` 211,164,104 · `$44` 100,19,83.

### 1.8 Death and respawn in the boss sector

`apply_player_damage` → `PLAYER_DYING` (`src/main.s:8192`), 25 frames
(`player_dying_tick`, `:13054`), then `respawn_player` (`:8097`): position,
health 10, `PLAYER_RESPAWN_INVULNERABLE` for **250 frames**
(`RESPAWN_INVULNERABLE_FRAMES`, asserted at `:931`), counted by
`tick_respawn_invulnerability` (`:8124`). Damage acts only on ALIVE, so a beam
already cannot hurt during the death or the respawn; S4b additionally holds
the lasers there (§8).

### 1.9 Why `lower-playfield-hostile-contact-atr-hard` fails

Its policy `lower-contact-hostile` (`scripts/atari800-wall-trace.h:3342`)
waits for a *hostile capital shell* in the lower rows. On HARD level 1 the
hostile shells stop at Y 180 (MEASURED 2026-10-01) and a low one appears only
rarely and late; its steering predates the final-raster collision (diagnosis
F5/F6 in `docs/recorded-gate-failures.json`). Class (a): the scenario cannot
contain the behaviour; decision 13 moves it to the lasers.

---

## 2. The missiles today (MEASURED)

Code: every missile write in the source is the capital broadside's warning
span — `render_broadside_warning` (`src/main.s:8637`),
`draw_broadside_span` (`:9900`), `broadside_erase_missile_span` (`:9861`),
`set_broadside_slot_*` (`:9925-9946`), `init_broadside`'s `SIZEM` (`:8062`,
"preserve M0 size pair") — M1–M3 through `HPOSM1,x`. M0 has a mask constant
(`:445`) and no writer. Slot A holds that code; in the boss sector slot A is the
boss overlay, so none of it is resident.

Trace (the plane at `$3B00`, counted by the observer every frame,
`scripts/atari800-wall-trace.h:4401-4407`), all 59 committed replay CSVs:

| Sector state | Rows | Rows with any missile byte | Max rows lit | `PRIOR` | `GRACTL` |
| --- | ---: | ---: | ---: | --- | --- |
| OPEN (7) | 100,530 | **0** | 0 | 0 | 3 |
| capital 1–5 | 31,038 | 15,597 | 14 | 0 | 3 |
| 0, 6 | 4,295 | **0** | 0 | 0 | 3 |
| **boss** | 12,503 | **0** | 0 | 0 | 3 |

Every START GAME clears the whole PMG DMA area (`clear_pmg`, `src/main.s:3344`,
from `start_gameplay` `:2620`), and the Q-S4 restore zeroes `PRIOR`, `SIZEM`
and `HPOSM0-3` (`build/boss-restore.inc`, run by `summary_boss_restore`,
`src/hybrid/level-summary.s:821`).

---

## 3. A home for the laser code

### 3.1 What it needs (bytes)

| Part | Raw | ×2–3 | Basis |
| --- | ---: | ---: | --- |
| per-frame kernel: timers, phase, HPOS/size shadows, the player and shot compares | **≈ 280** | 280 (measured) | M: the probe kernel assembled with the repo's ca65 (§5.1), less its comparison-only routines |
| the install: the tier, the object per enabled emitter, the column written once, `COLPM1/2` (option c) | 70 | 140–210 | IC |
| warning look (the ring's heat phases) and the tone | 45 | 90–135 | IC |
| the hold (death, respawn, defeat), the kill of an emitter, the damage call | 45 | 90–135 | IC |
| state (4 lasers × 6 + shadows) | 30 | 30 | fixed |
| **total, new home** | **≈ 470** | **630–790** | ×3 decides: **≤ 800 B, 7 sectors** |
| slot A: `jsr` from the DLI's phase 0, `jsr` from UPDATE, the kind test in `boss_fire` | 15 | 15–25 | IC (exact small edits) — slot A **53 free** |
| install run: two `jsr` (the tier before `_boss_c_init`, the column after `boss_prepare`) | 6 | 6 | — install **38 free** |
| slot C: `boss_enabled = boss_laser_slots` (the tier computed in ASM, so the C stays the size it is) | 0–3 | 0–6 | — slot C **45 free** |
| `$0500` module (option c only): two Q-S4 restore entries, `HPOSP1/2` | 6 | 6 | generated table — **115 free** |

### 3.2 `$1900-$1FFF` — nothing owns it in any phase

**Source (every phase).** No `MEMORY` area of any `cfg/*.cfg` starts or ends
inside it (below `$2000`: zero page, `$0500` splash and summary, `$1000` slot C,
`$1800` scratch only). No equate or literal in `src/` names an address in
`$0700-$1FFF` (scan; the only hits are offsets such as `PMG_BASE+$700` and
size asserts). The reader writes only where a run table points: every
destination in the build is `$6DE8` (slot A, ≤ 16 sectors), `$7810`, `$7990`,
`$0500` (14 sectors → `$0BFF`), `$1000` (14 sectors → `$16FF`), `$0C00`
(8 → `$0FFF`), `$A880`, `$AC80` and the level buffer at `$A600`
(`build/overlay-directory.inc`, `build/boss-runs.inc`, manifest). The boot
loads at `$2000` (`cfg/atari-boot.cfg`, 107 sectors); stage 2's SIO buffer is
`$8100`; `MEMLO` `$3B00`; the pause backup `$7810`; the save buffer `$7810`.
After `start` the game owns the machine (no OS VBI, CIO or SIOV).

**Emulator, current `main` (EMULATOR).** A scratch copy of the trace emulator
filled `$1900-$1FFF` with `$A5` at `start` (`$201E`, host frame 236) and counted
the bytes that differed once per host frame through
`director-complete-1-natural-sweep-fire0` on the default ATR: boot, menu, the
START GAME summary and level read, all of level 1 with its capital sector, the
49-sector boss entry, the fight, the chain, the level-end summary and its save
write (frames 12,332–12,492). **0 bytes changed over 12,000+ host frames**, and
the replay's CSV is **byte-identical** to the one recorded without the fill, so
nothing reads the range either. BASIC was off (the harness's launch); the
2026-10-03 diagnostic covered BASIC on (`docs/diagnostics/low-ram-0700-1fff-2026-10-03.md`).
Hardware evidence stays the owner's 65XE smoke, as for `$0500` and `$0C00`.

### 3.3 The homes compared

| | **(b) slot D at `$1900` (recommended)** | (a) slot A, the M5a overlay slot | (c) slot C grown to `$1EFF`, scratch moved to `$1F00` (plan §5.13.6) |
| --- | --- | --- | --- |
| room | 1,792 B for ≤ 800 | **53 B free** — needs ~750 B moved out first, and the only home for them is (b) or (c) | 1,792 B |
| what moves | nothing: a new `MEMORY` area in `cfg/boss.cfg`, one more run in `boss-runs.inc`, read by the head like slot C | — | the scratch page (every `$18xx` address, `manifest.boss.scratch.columnMap 6144` and the tests that pin it), slot C's BSS |
| claim | `$0C00-$18FF` → **`$0C00-$1FFF`** (owner decision, as Q-B5) | unchanged | the same growth |
| disk | 528–583 holds code 16 + install 3 + slot C 14 = 33; slot D ≤ 7 → **40 of 56** | — | the same sectors, one run |
| boss entry | 49 → **≤ 56 sectors, +≤ 27 host frames (+0.5 s EMULATOR; ~1 s on a 1050, ESTIMATE)** | — | the same |
| risk | the claim's evidence class (EMULATOR until the 65XE smoke) | — | a relink of every scratch address for no gain |

**Recommendation: (b).** The laser code lives in slot D (`$1900`, sized to
use, read at every boss entry); slot A gains three calls; the C is unchanged
in size.

---

## 4. Rendering the beam

### 4.1 The options

All four were rendered by **Atari800 itself**: a scratch copy of the trace
emulator (same trace header, byte-identical, so the harness accepted it) runs
a "laser lab" at the main loop's entry, after the game's own frame, the way the
trace header's PMG lab does (`scripts/atari800-wall-trace.h:3046-3090`): it
writes the PMG planes once and the GTIA registers every frame through
`GTIA_PutByte`, the beam centred on region 1's emitter (and on gun-3, gun-1,
gun-4 as stand-ins for 2 and 4 lasers), tracking `boss_shown_pos`. The game is
the unmodified debug-route ATR `0ad32664…` (level 1's boss sector, HARD,
the `sweep` bot of `2-sweep-fire2`). Only the PMG state is the lab's; every
other pixel is the game's, the colours are the emulator's PLTE.

| | **(c) P1/P2, + M1/M2 at tier 4, `PRIOR $00` (recommended)** | (a) missiles, `PRIOR $10` (fifth player) — the plan's | (b) missiles, `PRIOR $00` | (a-plan) as (a), column filled during the warning (§5.5) |
| --- | --- | --- | --- | --- |
| colour, band | **`$46`** (`COLPM1/2`, set at the install) | **`$32`** — the hull bulk's own colour; visible on black, gone on hull | `$46` (M1/M2) | `$32` |
| colour, ring | **`$46`** | `$46` | `$46` | `$46` |
| colour, HUD | never reaches it (beam top ≥ line 32; region 1: 48) | — | — | — |
| 1 / 2 / 4 lasers | P1 / P1 P2 / P1 P2 M1 M2 — **one colour at every tier** | M0 / M0 M1 / M0–M3 — one colour, two values by region | M1 / M1 M2 / **+ M0 `$0E` white (the ship's `COLPM0`) and M3 `$1C` gold (the capsule's `COLPM3`)** — not one colour at tier 4 | as (a) |
| width | 1 bit of the plane; `SIZE` normal = 1 colour clock (warning), quad = 4 (beam) | the same through `SIZEM` | the same | the same |
| shared register touched | `COLPM1/2` only — no object uses them in a boss sector | `PRIOR` bit 4 (nothing else uses missiles there) | `COLPM1/2` | `PRIOR` |
| cycles a frame, native (M, §5.1) | 1 / 2 / 4 lasers: steady beam **421 / 644 / 1,054**; fire start **445 / 692 / 1,150**; warning 198 / 266 / 402; beam end 147 / 171 / 219; + DLI publish **62** | the same kernel; DLI publish **46** | as (a) | as (a) **+ 1,295 a laser a frame** while filling, the same while erasing |
| PMG memory writes | the install: ≤ 192 lines per laser, once; **0 a frame** | the same | the same | 64 lines RMW a laser a frame (warning and erase) |
| registers a frame | `HPOSP1/2`, `HPOSM1/2`, `SIZEP1/2`, `SIZEM`, in the band DLI's phase 0 | `HPOSM0-3`, `SIZEM` | as (a) | as (a) |
| hit detection | logic: the beam's shown HPOS span against the player's collision envelope, every frame, ALIVE only, through `apply_player_damage`; the shots by their x | the same | the same | the same |
| reliability | frame-coherent: the DLI publishes the frame's HPOS before line 24, the compare uses that value; independent of `HITCLR` (mid-frame) and of emulator/hardware collision quirks | the same | the same | the same |
| risks | P1/P2 newly used in the boss sector (no Heavy there; the level compiler's own comment calls them free); the trace's Heavy stale-body observer needs a boss exception (~15 lines, §4.5); two Q-S4 restore entries | a two-colour beam; the band part merges with the hull | tier 4 impossible in one colour; recolouring `COLPM0/3` would recolour the ship and the capsule — forbidden | 1,295 a laser a frame is the plan's 1,750 native that broke Q-B6 |

### 4.2 The column written once

The emitters never move inside the band; only the band moves. So each enabled
emitter is given one PMG object at the install, and its plane is written once:
from the line under the emitter's bottom row to the ring's last line (239).
From then on a laser is **only register writes**: `HPOS` = the emitter's centre
column × 4 + 32 − *p* − half the width (0 = off screen), `SIZE` = normal for
the warning, quad for the beam. The boss DLI's phase 0 publishes the frame's
values before the band, so the whole beam moves with the band in the same frame
(a write from UPDATE would leave a one-clock kink every second frame). Start,
stop, fire, a death, a pause: no plane write. `clear_pmg` empties the planes at
the next START GAME, as today.

### 4.3 The warning (~0.5 s, 25 frames) and the beam (50 frames)

No shared register changes in either phase.

| Look | What the player sees | Cost |
| --- | --- | --- |
| **pulsing thin line (recommended)** | the beam's own column at 1 colour clock, widening to 2 every other 2-frame group (`warning-pulse-*.png`) — the capital broadside warning's language ("two-frame pulse groups, never PAL flicker", `src/main.s:8663`) | 0 B beyond the size bit; 0 cycles |
| steady thin line | the same at 1 colour clock throughout | 0 |
| dashed line | needs the plane rewritten at the warning and again at the beam: ~190 RMW a laser (~3,400 native on the fire-start frame) | not recommended |
| no line (the plan's) | only the emitter's heat look and the tone | 0 |

With any line, the emitter's bottom-centre cell alternates the region's muzzle
and spark glyphs through the cell-flash ring (no new glyph; ~90 native per
change, every 4 frames) and a rising tone plays (Q4).

**Readability (from the captures).** `$46` against the mint shots `$AE`, the
white heads and stars `$0E`, the steel `$88`: distinct in hue and luminance.
Against the hull: under (c) the beam is a brighter, cooler magenta than the
`$32` bulk and reads as leaving the emitter; under (a) its band part is the
bulk itself. Under `PRIOR $00` a P1/M1 beam crossing a white star or head ORs
to `$4E` (pale pink) for that pixel; P2/M2 pass behind it; the ship (P0) is
always drawn over a beam. A beam crossing a still-standing plate cannot happen
in play (a weapon fires only once its cover is gone), so the previews use late
fight frames, plates down.

### 4.4 Previews

`build/boss-laser-preview/` (not committed; regenerate with the scratch tools
named in §10):

* `/Users/marcinkrzetowski/Projects/dark-fighter/build/boss-laser-preview/option-a.png`
* `/Users/marcinkrzetowski/Projects/dark-fighter/build/boss-laser-preview/option-b.png`
* `/Users/marcinkrzetowski/Projects/dark-fighter/build/boss-laser-preview/option-c.png`
  — each: rows 1 / 2 / 4 lasers; columns now (no laser, f741), warning (f711),
  fire (f741); 2×.
* `/Users/marcinkrzetowski/Projects/dark-fighter/build/boss-laser-preview/band-detail.png`
  — the band at 3×: fire with 4 lasers for (a), (b), (c), and (c)'s 1-laser warning.
* `/Users/marcinkrzetowski/Projects/dark-fighter/build/boss-laser-preview/warning-pulse-a.png`,
  `/Users/marcinkrzetowski/Projects/dark-fighter/build/boss-laser-preview/warning-pulse-c.png`
  — eight consecutive warning frames (f705–f712).
* `/Users/marcinkrzetowski/Projects/dark-fighter/build/boss-laser-preview/palette.png`
  — the colours from the capture's PLTE.

The previews' 2 and 4 lasers sit on region 1's gun columns (region 1 has one
emitter slot); the tier fixtures (§8.4) carry real emitters there. **Corrected
in A2 (§11.1 item 4):** these Phase A lab runs drew a beam at a gun's column
whether or not its cover stood, so the 4-laser frames show gun-1's beam under
the standing plate-c — a preview error, not game behaviour. §11.3 has the
corrected option A previews.

### 4.5 Harness consequences per option

Option (c) writes P1/P2 planes in the boss sector; the trace's stale-body
observer (`scripts/runtime-wall-trace.mjs:3951-3960`, rows' `enemy_pmg_mismatch1/2`)
expects them empty when no Heavy member is live. In the lab run it flagged 918
of 919 boss frames. It needs a boss-sector exception (the plane holds the laser
column; ~15 lines, class (b)). Options (a)/(b) touch only the missile plane,
which no clause reads.

---

## 5. Cycles and the work limit

### 5.1 The laser kernel (MEASURED, native, `scripts/nmos6502.mjs`)

A scratch probe (`probe-lasers.s`, assembled at `$1900` with the repository's
ca65/ld65) written as the kernel would be: four laser records, the timers, the
warning → beam → off phases, the HPOS/size shadows with the window test, the
player compare and the five-shot retirement for each firing beam, the DLI
publish of both options, and the plan's fill/erase for comparison.

| Case | 1 laser | 2 lasers | 4 lasers |
| --- | ---: | ---: | ---: |
| idle (no laser running) | 123 | 123 | 123 |
| warning, steady | 198 | 266 | 402 |
| beam, five shots in flight, none in a beam | 421 | 644 | 1,054 |
| beam, the player in the first beam | 442 | 665 | 1,090 |
| the warning's last frame (fire start) | **445** | **692** | **1,150** |
| the beam's last frame | 147 | 171 | 219 |
| start (from `boss_fire`) | 25 | | |
| DLI publish (c) / (a) | 62 / 46 | | |
| plan §5.5: fill or erase 64 lines of one missile | **1,295** per laser per frame | | |

Budgeted with the parts not in the probe (heat via the ring ~90, the tone
~15, the hold ~10, call overhead ~20): **tier 1 ≤ 650, tier 2 ≤ 900, tier 4
≤ 1,400** native on the worst frame (ESTIMATE from MEASURED parts).

### 5.2 What a native cycle costs a boss frame (MEASURED, probe reverted)

The debug-route build with **1,001 native cycles of busy loop** added to
`boss_update` (`src/hybrid/boss.s`, before the shot loop; built into
`build/level-1-s4/`, traced with `2-sweep-fire2`, reverted, rebuilt to
`0ad32664…`) against the same replay on the clean build, frame by frame (919
boss frames, game state identical on every frame):

| | |
| --- | --- |
| worst fence margin | 11,730 → **9,693** |
| margin lost per frame, per 1,001 native | median **2,382**, min 790, max **4,308** |
| ratio wall/native | median **2.4**, range **0.8–4.3** |
| why it varies | the UPDATE runs at a different scanline on each frame; inside the band's rows (ANTIC 4 with HSCROL, a 48-byte fetch plus the charset every line, PMG, refresh) the CPU gets a fraction of each line, below the band most of it |

### 5.3 The limit

| Composition (ESTIMATE from MEASURED parts) | Tier 1 | Tier 2 | Tier 4 |
| --- | ---: | ---: | ---: |
| laser budget, native | 650 | 900 | 1,400 |
| worst real boss frame margin (12,974) − budget × 4.3 (the worst ratio) | ≥ 10,170 | ≥ 9,100 | **≥ 6,950** |
| the same at the median ratio 2.4 | ≥ 11,410 | ≥ 10,810 | ≥ 9,610 |
| GO | 500 | 500 | 500 |
| the stress drive (6,689) + the budget, if a beam runs on its worst kill frame | ~7,340 | ~7,590 | **~8,090** |
| the limit | 7,000 | 7,000 | 7,000 |

* **The fence is not at risk.** Even four lasers at the worst ratio leave a
  boss frame ~6,950 over the fence — fourteen times GO. DMA-on is unaffected
  (the PMG DMA is on already; work moves the fence entry, not the wall).
* **The 7,000 stress pin is.** The drive (five hits a frame on one module, a
  case real fire cannot make) already reads 6,689; any laser running on its
  worst frame passes 7,000 — at tier 1 by ~340, at tier 4 by ~1,090. At tier 1
  the overlap is uncertain (the beam eats the drive's shots in its own column,
  so the emitter cannot die under its beam); at tier 4 it is near certain.
* Trims that do not change gameplay: none that reaches 7,000 at tier 4 (the
  shot retirement is ~400 of the 1,150; dropping it changes the plan's "nothing
  survives the beam").

**Recommendation (owner question Q8): the boss sector's stress limit 7,000 →
8,500 native**, on the measured basis above: at 8,500 the worst composed real
frame is still ≥ 6,950 over the fence at the worst measured ratio, and the
tier-4 fixture's composition (~8,090) keeps ~400 of slack. **Not changed in
Phase A**; Phase B STOPs if a measured stress case exceeds the limit in force.
Alternative: keep 7,000 for the engine and give the lasers their own pin
(≤ 1,400 native at tier 4), the stress drive run with the lasers held.

---

## 6. Recommended design for Phase B (if the answers are the recommendations)

1. **Objects**: emitter slot *k* of the enabled ones → P1, P2, M1, M2 (option
   c); `PRIOR $00`; `COLPM1 = COLPM2 = $46` at the install.
2. **The column** written once at the install (§4.2); HPOS/size shadows
   published by `boss_dli` phase 0 (`jsr` into slot D, A only).
3. **Cadence**: the emitter gets a `reload` in `modules.json` (data; region 1
   proposed 150, EASY +½, HARD −¼ by the existing rule, M8 tunes). The
   countdown names it like any weapon; `boss_fire` sends an emitter to
   `laser_start` instead of the PULSE spawn; a busy laser ignores the call.
4. **Warning 25 frames**: the pulsing thin line, the heat look through the
   ring, the rising tone (Q3, Q4). **Beam 50 frames**: 4 colour clocks,
   tracking the band; each frame, first the compare against what is on screen,
   then the shadows for the next frame.
5. **Contact**: the player's collision envelope (`PLAYER_COLLISION_WIDTH` 8)
   overlapping the beam's span → `apply_player_damage` from one labelled call
   site with `LASER_DAMAGE[difficulty]` (data; Q5); player shots whose x lies in
   the beam are retired (Q6).
6. **Hold**: while the player is not ALIVE no laser starts and a running one
   goes off; on an emitter's kill its laser goes off that frame; at the defeat
   all go off.
7. **Tier**: computed in slot D's install from the level id (decision 8:
   levels 1–4 → 1 slot, 5–8 → 2, 9–12 → 4) into `boss_laser_slots`, which
   `boss_c_init` reads instead of 0 (`src/c/boss.c:242`). A debug-only build
   flag overrides it for the fixtures (§8.6).
8. **Restore**: the Q-S4 table gains `HPOSP1/2`; everything else is in place.

Nothing runs in non-boss frames: the three calls live in slot A's boss
overlay and slot D; no resident byte changes.

---

## 7. The lower-row contact scenario (decision 13, Q4)

**Session `lower-playfield-laser-contact-atr-hard`** (default ATR, HARD, level
1, new policy `lower-contact-laser`): the `sweep` bot plays level 1 into the
boss sector (entry at ~f8,787 on HARD today) and fights on until the first
laser warning starts (region 1: plate-d must fall first; on the debug route
the plates over the emitter were down by ~f600 of the fight); the policy then
steers to the warned emitter's column (band position included, tracked every
frame) at the bottom clamp (y 225) with no damage cooldown and no respawn
invulnerability, and waits. The beam's first frame is the contact. Budget: the
entry + ~1,500 fight frames (~10,500), as long as `director-complete-*`.

Clauses, as the plan wrote them, with the differences named:

1. 16 consecutive contact rasters captured; on each, the laser's column (its
   object's HPOS span and plane rows) intersects P0's raster bounds; the
   player's rows ≥ 191.
2. exactly one `apply_player_damage` entry in the capture window, **from the
   laser's call site** (the harness watches its PC; §0.3 item 4), and
   `apply_broadside_player_damage` not entered.
3. hull 10 → 10 − `LASER_DAMAGE[HARD]`; lives, lifecycle and cooldown as
   Q5's answer makes them (alive with cooldown 25, or DYING with lives 3 → 2);
   no invulnerability on the hit frame.
4. the warning preceded the beam by ≥ 24 frames: the emitter's heat looks seen
   in the band map, the tone seen on the channel Q4 names.
5. the beam lasts 50 ± 1 frames on one band column; it ends with its HPOS 0.
6. nothing survives in the column: no player shot with an x inside the beam on
   the beam's first frame + 1 (no Light exists in region 1).
7. PAL: 0 miss events; fence ≥ 500 on every boss frame; 3 DLIs in the boss
   sector, 0 violations (the harness models the boss DLI since S3).
8. the boss-entry read: one command frame per sector, 0 retries, inside its
   recorded window, no gameplay frame inside it.

Harness work (new scenario, class (a) plus observers): the policy (~40 lines of
the trace header), the laser state and HPOS columns in the CSV (~15), the call
site's PC (~5), the clauses (~90 in `scripts/runtime-wall-trace.mjs`), and
(option c) the stale-body exception (~15). Then
`lower-playfield-hostile-contact-atr-hard` is **retired by name** into a
`removed_2026_10_…` block of `docs/recorded-gate-failures.json` with F5/F6
kept (Q4); the recorded clause failures fall 1 → 0.

---

## 8. Tests, evidence, smoke (Phase B)

### 8.1 RED on `main`'s build, GREEN after (`tests/boss-lasers.test.mjs`, 6502 harness on the built bytes)

1. the laser count per tier: region 1 on level 1 → 1 object enabled; the
   laser fixture (§8.6) installed at level 5 → 2, at level 9 → 4;
2. the warning: 25 frames from the emitter being named to the beam's first
   frame; the beam 50 frames;
3. contact: the player's envelope under a beam → one `apply_player_damage`
   entry from the laser's call site and the hull change Q5 decides;
4. an emitter destroyed during its warning and during its beam → its object off
   on that frame, never on again;
5. no laser while the player is DYING or RESPAWN_INVULNERABLE; a beam running
   at the death goes off;
6. outside the boss sector: after START GAME (the Q-S4 restore and
   `clear_pmg`) `PRIOR`, `SIZEM`, `HPOSM0-3`, `HPOSP1/2` are 0 and the planes
   empty; a capital sector after a boss draws its broadside warning with no
   foreign missile bit;
7. the stress test on the tier-4 fixture with its lasers running, against the
   limit in force (Q8).

### 8.2 Evidence

`build:candidate` → `runtime:wall-trace` → `build`, `npm test` on the default
build twice (the same names), the hash-bound media rebound by their own tools,
`npm run memory-map` (the claim grows to `$1FFF`), the fight lengths on EASY /
MEDIUM / HARD measured against MEDIUM 45–60 s and not tuned (M8).

### 8.3 Smoke (owner, on copies of the ATRs)

The default ATR (`npm run play:atr`); the boss debug route `level-1-s4`; the
tier-2 and tier-4 fixture builds. What to look for: the warning, then the
beam, from each emitter; the beam against the hull, the stars and the HUD; mint
shots and white enemy heads next to a beam; death by beam and a respawn with no
beam; an emitter destroyed silences its laser; the boss falls with its last
weapon.

### 8.4 The tier fixtures

Region 1 has one emitter slot, so tiers 2 and 4 need a fixture: a layout
`assets/graphics/boss-regions/laser-fixture/` (region 1's art; gun-1, gun-3 and
gun-4 become emitter slots 2–4 with reloads), used by the 6502 tests through
`installRegion` with level ids 5 and 9, and by two debug-only review builds
(a build flag that installs the fixture as region 1 and overrides the tier;
`build/<variant>/`, never `dist/`, no gate consults them).

---

## 9. Owner questions

| # | Question | Recommended answer | Its cost | The alternative and its cost |
| ---: | --- | --- | --- | --- |
| **Q1** | How is the beam drawn? | **(c)**: P1/P2, plus M1/M2 at tier 4, `PRIOR $00`, `COLPM1/2 = $46` in the boss sector — one colour in band and ring at every tier | P1/P2 used in the boss sector (no Heavy there); 2 restore entries (6 B, `$0500`); a ~15-line trace exception | (a) the plan's fifth player: 0 extra registers, but `$32` in the band (the hull's colour) and `$46` below; (b) missiles only: tiers 1–2 fine, **tier 4 impossible in one colour** |
| **Q2** | How does the column get on screen? | **Written once at the install; a laser is register writes only** (§4.2) | ~0 a frame; the install +~190 stores a laser | the plan's fill/erase: **+1,295 native a laser a frame** |
| **Q3** | The warning's look | **the pulsing thin line** (1/2 clocks, 2-frame groups) + the emitter's heat through the ring + a rising tone | 0 B, 0 cycles for the line; ~90 native per heat change | steady thin line (0); no line (the plan's) — only the glyph and the tone |
| **Q4** | The warning tone's channel | **channel 3 over the engine bed**, the bed back after (Q-B4's rule: the lead voice is never pre-empted) | a hit tick on the same frames wins for its 2 frames | channel 2 (the plan): pre-empts the music's lead for 25 frames a laser |
| **Q5** | What a beam does to the player | **a kill: `LASER_DAMAGE` = 10 on every difficulty, as data per difficulty** (the brief's "kills"; Shield still absorbs, invulnerability still protects) | 3 B of data; the bot dies under beams it does not dodge (lives are held in the replays; the fight lengthens by the 5-s respawns) | the plan's partial damage (e.g. 4 / 5 / 6 units, alive, 25-frame cooldown): the beam hits again after the cooldown if the player stays |
| **Q6** | Does the beam retire the player's shots in its column? | **Yes** (plan §5.5, clause 6): the emitter can be shot only between its beams | ~100 native a firing laser | no: −~400 native at tier 4; the beam is decoration for shots |
| **Q7** | The home | **slot D at `$1900`, the claim `$0C00-$18FF` → `$0C00-$1FFF`** | ≤ 7 sectors, the entry +≤ 27 host frames (EMULATOR) | slot C grown to `$1EFF` with the scratch moved (a relink of every scratch address, the same claim) |
| **Q8** | The boss sector's stress limit | **7,000 → 8,500 native** (§5.3): ≥ 6,950 over the fence at the worst measured ratio | the pin protects less against a pathological drive | keep 7,000 for the engine and pin the lasers alone (≤ 1,400 at tier 4), the drive run with lasers held |
| **Q9** | The lower-row contact | **Q4 as decided**: the new laser session with §7's clauses; the old one retired by name when it passes | 0 runtime B; ~160 harness lines | keep the old one recorded beside the new (the brief's "pass with the clause untouched" cannot be met: the clause asserts a shell) |
| **Q10** | The tier fixtures | **the `laser-fixture` layout (region 1's art, gun-1/3/4 as emitter slots 2–4) and a debug-only tier override flag** | one fixture folder, ~15 lines of build | a per-level `lasers` byte in `boss_def` (level data, shipped bytes change) |
| **Q11** | Timings | **warning 25, beam 50, region 1's emitter reload 150** (all data, M8 tunes) | — | — |

---

## 10. What Phase A did not do

No source, cfg, script, asset, test, level or evidence change is committed;
`git diff -- src cfg scripts assets tests` is empty at the commit. The burn
probe (§5.2) was a three-line edit of `src/hybrid/boss.s`, reverted, and
`build/level-1-s4/` was rebuilt to its recorded hash. The laser lab, the
`$1900` watch, the probe kernel and the preview composer are scratch files of
this session (`atari800-lab/src/laser_lab.h` hooked into a copy of
`build/atari800-trace`'s `cpu.c`, `lab-run.mjs`, `compose.mjs`,
`probe/probe-lasers.s`, `probe/measure.mjs`, `fence-scan.mjs`); none is
committed, and none of their output is evidence. The harness's own emulator
in `build/atari800-trace` was not touched. `docs/STATUS.md` is unchanged until
Phase B.

---

## 11. Addendum A2 (owner, 2026-10-06): the shots' origin, option A re-evaluated

Phase B is on hold. Step 0 of A2: the branch was at `aa63737`, tree clean,
Phase B not started. Two probes were made in A2 and reverted (§11.2 item 1,
§11.4); `build/level-1-s4/` was rebuilt to `0ad32664…` after each.

### 11.1 Shots leaving a destructible module instead of a gun (diagnosis)

**1. Every weapon of region 1** (compiled region, `scripts/boss-assets.mjs`;
rows counted from the top, layer = rows from the player's side, row 7 = layer 1):

| Module | Kind | Cells (x, rows) | Layer | Cover (converted mask) | Column under it, to the band's edge | Muzzle flash (code) | Shot spawn (code) |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| gun-2 | pulse | 26–28, 2–3 | 5 | none (the open bay) | rows 4–7 empty | cell (27, 3): its own bottom row | (27, **line 88**) |
| gun-4 | pulse | 44–46, 2–3 | 5 | plate-g | row 4 empty; rows 5–7 plate-g | cell (45, 3): its own | (45, **line 88**) |
| gun-1 | pulse | 22–24, 1–2 | 6 | plate-c | row 3 empty; rows 4–7 plate-c | cell (23, 2): its own | (23, **line 88**) |
| emitter (capped) | emitter slot 1 | 30–33, 1–2 | 6 | plate-d | row 3 empty; rows 4–7 plate-d | cell (32, 2) (never fires today) | — |
| gun-3 | pulse | 38–40, 1–2 | 6 | plate-e | rows 3–6 plate-e; row 7 empty | cell (39, 2): its own | (39, **line 88**) |

The muzzle flash is placed in the gun's own bottom-row cell at its centre
column (`src/hybrid/boss.s:648-664`); the shot is put into the hostile pool at
the same column but at **`BAND_BOTTOM_Y` (line 88), the band's bottom edge**
(`:689-698`, `lda #BAND_BOTTOM_Y` at `:691`), because the pool's shots are not
drawn inside the band (fortress session, plan §5.13.2 item 6: "from the
module's centre column at the band's bottom edge"). Every cover is exactly the
plate under the gun; no weapon sits under a module other than its cover.

**2. Every boss-shot spawn, measured (EMULATOR).** A scratch logger in a copy of
the trace emulator stopped at `boss_fire`'s spawn (`$717A`, the same in both
builds) and recorded the firing module, its cover's state, its exposure and
every live module in its column below it:

| Replay | Spawns | By module | Cover still standing | Not exposed | A live module between the gun and the spawn |
| --- | ---: | --- | ---: | ---: | ---: |
| `director-complete-0` (default ATR, EASY) | 23 | gun-2 4, gun-4 8, gun-1 4, gun-3 7 | 0 | 0 | 0 |
| `director-complete-1` (MEDIUM) | 36 | 7 / 11 / 10 / 8 | 0 | 0 | 0 |
| `director-complete-2` (HARD) | 66 | 13 / 28 / 14 / 11 | 0 | 0 | 0 |
| `level-1-s4` `2-sweep-fire2` (HARD) | 16 | 9 / 4 / 0 / 3 | 0 | 0 | 0 |
| `level-1-s4` `2-evasive-fire3` | 15 | 10 / 3 / 0 / 2 | 0 | 0 | 0 |

**No shot of the 156 starts on a gun's muzzle: every one starts at line 88**,
3 rows (gun-2, gun-4: 32 lines) or 5 rows (gun-1, gun-3: 40 lines) under its
gun, at the height of the plates' lower edges. Frames, debug route (host
frame, module): 994, 1062, 1130, 1198, 1266, 1383, 1545, 1707, 1869 gun-2;
1334, 1451, 1613, 1775 gun-4; 1500, 1662, 1824 gun-3 (the complete lists with
every field are the scratch logs `spawn-*.log`). What the player sees
(`shot-spawn-a2-1.png`): gun-3 flashes at its turret, and two frames later the
shot appears 40 lines lower **against the bottom-left corner of plate-f**,
which stands beside gun-3's column down to the band's edge; gun-4's shot
appears at the edge in the column beside plate-f's right side. Next to a still
standing plate the shot reads as leaving that plate. (In the same frames the
pink-amber burst at a plate's foot is the spark of a player shot hitting it —
also an impression of "something at the plate".)

**3. Class.** Not (ii): no gun fired with its cover standing (0 of 156). Not
(iii): the data and the converter put nothing but its cover under any gun, and
`tests/boss-recess.test.mjs` already refuses hull art under a weapon. It is
**(iv) by design, a player-visible defect**: the spawn point is the band's edge
by construction, so the shot never leaves the gun visibly. Under the trace's
classes it is **(c)** — a runtime defect a player sees; the frames are above.

**The fix (proposed, owner question QA1):** the boss shot is born at the gun's
muzzle — the line under its bottom row — and is **drawn inside the band** on its
way to the band's edge, exactly as decision M draws the player's shots inside
the band: in the cell it is in, only while that cell is blank (decision O
guarantees the recess under an exposed weapon is blank), the cell given back
the next frame; at line 88 the pool draws it as now.

| Item | Bytes | Where | Cycles (native) |
| --- | --- | --- | --- |
| spawn Y from the module record instead of `BAND_BOTTOM_Y` | 8 IC → 16–24 | slot A (`boss_fire`, 53 free) | +~12 on a firing frame |
| the in-band draw and restore of the hostile slots (the player shots' `boss_shot_meet` / `boss_shots_restore` pattern for the five hostile slots) | 70 IC → **140–210** | **slot D** (with the lasers; slot A and slot C cannot hold it) | ~70 a shot in the band + ~35 restore; **≤ 600** with five in the band, typically 1–2: **~120–240** |
| restore cells (10 B) | 10 | slot D BSS (the scratch page has 7 B free) | — |
| the hostile shot's glyphs in the region charset (2 phases) | 0 runtime; 2 of the 18 free codes | converter (as the player shot's 4 codes) | — |
| gameplay | the shot needs 16–20 frames more (PULSE steps 2 lines every frame) to reach the band's edge | — | — |

It lands with S4b's slot D: without slot D there is no home for it (slot A 53
B, slot C 45 B free). Alternatives: (2) a one-frame **tracer** — the muzzle flash
plus a streak glyph in the recess cells under the gun through the cell-flash
ring (~40 B, ~430 native on the firing frame, ≤ 5 of the ring's 8 records); the
shot still materialises at the edge. (3) Leave it.

**4. The laser fixture's emitter slots.** gun-1, gun-3 and gun-4 are real weapon
positions, each in its own recess (decision O; `tests/boss-recess.test.mjs`),
each covered by exactly the plate in front of it (c, e, g); as emitter slots
they arm only once exposed, like every weapon (`src/c/boss.c:219-222`). The
rule holds for the fixture. The **Phase A preview** broke it: its lab drew a
beam at gun-1's column while plate-c stood (the "leftmost beam under the plate
stack"); the corrected previews (§11.3) draw a beam only from an exposed, live
weapon, read from the compiled module table and `_boss_hp` every frame.

### 11.2 Option A re-evaluated (the owner's preferred look)

**1. Where `COLPF3` changes, and the band edge.** Phase 0 of the boss DLI (on
the HUD's last line, scanline 15; `src/hybrid/boss.s:282-293`) sets the band's
`$32`; no beam reaches above line 32. Phase 1 (on the band's last mode line,
scanline 87; `:300-310`) sets `$46` **as the fifth of five stores after
`WSYNC`**. MEASURED in Atari800 (captures, column by column): the beam is `$32`
through **scanline 88** and `$46` from 89 — **one stray `$32` line under the
band's edge on every beam**. On hardware the store lands ~23–30 cycles into line
88 plus DMA (IC): a `$32` tip on line 88 for a beam left of about HPOS 60–80.
**Fix, probed and reverted:** store `COLPF3` first after `WSYNC` (in the
horizontal blank of line 87, after its last visible pixel at ~cycle 104, before
line 88; `CHBASE` moves 6 cycles later, still before line 88's glyph fetches).
MEASURED: the beam `$32` through **87**, `$46` from **88** — the boundary exactly
at the band's edge; with no laser the frames are **pixel-identical** to today's
(168, 171, 172 compared); **0 B, 0 cycles** (the same stores in another order).
Hardware is the owner's smoke (`option-a-band-edge.png` shows both).

**2. `PRIOR`.** `$00` in every region of the boss sector today (no DLI writes it;
MEASURED on every boss row). The fifth-player bit is global (no region can
differ without a DLI store); set at the install, zeroed by the Q-S4 restore
(already in its table). The priority nibble stays 0, so nothing else changes.
What it does (MEASURED in the captures unless marked):

| Against | Effect |
| --- | --- |
| the playfield, band | the beam covers every band colour in the band's `COLPF3`: plates `$0A`, bevels `$06`, amber `$28` → `$32` (a beam never crosses a standing plate: it fires only once its cover is gone) |
| the playfield, ring | covers mint shots `$AE`, white heads and stars `$0E`, steel `$88` → `$46` (the shots in it are retired anyway, Q6) |
| P0, the ship | **the ship stays drawn over the beam** (f171, both options) |
| P1/P2 | unused in the boss sector |
| P3 (capsule, death mask) | the capsule is cleared at the boss install; the lasers are held off during the death (§6 item 6), so the death mask never meets a beam; GTIA's rule for P3 over a PF3-priority pixel would OR `$1C` with `COLPF3` (ESTIMATE, not reachable) |
| the one permitted Light | drawn in playfield characters: the beam covers it like any playfield pixel; no Light in region 1 |
| the band flash | the beam's band part takes the flash with the band: `$32` → `$36` for one frame on a damaging hit (f172) |

**3. Option A against option C.**

| | **A: missiles, `PRIOR $10`** | C: P1/P2 (+ M1/M2), `PRIOR $00` |
| --- | --- | --- |
| colour | `$32` in the band (the region's `COLPF3`), `$46` in the ring, switched by the existing DLI | `$46` everywhere (`COLPM1/2`) |
| slot D | the same kernel (~280 B M) + install; **~10 B less** (no `COLPM1/2`) — ≤ 790 B with ×3 | ≤ 800 B |
| slot A | the three calls (15 IC) | the same |
| boss DLI | phase 1 reordered, **0 B** | unchanged |
| `$0500` module (Q-S4) | **0 B** (`PRIOR`, `SIZEM`, `HPOSM0-3` are in the table) | +6 B (`HPOSP1/2`) |
| cycles, native (M, the probe kernel is the same for both) | steady beam 421 / 644 / 1,054; warning 198 / 266 / 402; fire start 445 / 692 / 1,150; beam end 147 / 171 / 219 (1 / 2 / 4 lasers) | the same |
| DLI publish | **46** (`HPOSM0-3`, `SIZEM`) | 62 |
| PMG memory | the missile plane once at the install, read-modify-write (four missiles share a byte; ~18 a line, ≤ 192 lines a laser, DMA off); **0 a frame** | the player planes once, plain stores; 0 a frame |
| hit detection | **logic** (recommended): the shown HPOS span against the player's envelope, every frame, testable on the 6502 harness | the same |
| … M-to-P instead | `M0PL-M3PL` bit 0 read just before `HITCLR` (`src/main.s:5330-5332`, every frame, mid-display) covers one whole raster, but split across two frames (the lower part of the previous one): a hit is up to a frame late; the warning's thin line also collides and must be masked by the previous frame's phase; the 6502 harness has no GTIA collisions, so the contact tests could run only in the emulator. Not recommended | the same (`M1PL/M2PL`, `P1PL`/`P2PL`) |
| trace | **no exception** (no clause reads the missile plane) | the Heavy stale-body observer needs a boss exception (~15 lines) |
| risks | the band part is dark (`$32`, luminance 2) and flashes with the band; the reorder of phase 1 is needed | a new use of P1/P2 in the boss sector |

**Option A costs less than C** and needs one 0-byte DLI change. Its look is the
owner's call (Q1 revised: **A**, with the phase-1 reorder).

**4. The warning in option A.** In the band the line runs only through the
empty recess under the emitter (decision O and the exposure rule: never over
hull or a plate), so it is a `$32` line on black — dark but visible
(`option-a-warning-band.png`, 3×), pulsing 1/2 clocks with the ring part. The
band's warning is carried by the **emitter's heat**: its bottom-centre cell
alternates the region's spark and muzzle glyphs every 4 frames through the
cell-flash ring (1 record a laser, ≤ 4 of 8; no new glyph). The ring part
pulses `$46` at 1/2 clocks in 2-frame groups, as in Phase A's preview
(`warning-pulse-a.png`).

**5. The values per region and level.** The beam's band colour is the region's
`palette.colpf3`; its ring colour is `GAMEPLAY_COLPF3` = `INTERCEPTOR_PROJECTILE_COLOR`
`$46`, a build constant, the same on every level (`src/main.s:567`; the
`--enemy-palette` review variants change the Heavy body colour, not `COLPF3`).

| Region | Band `COLPF3` | Ring `COLPF3` | Note |
| --- | --- | --- | --- |
| 1 Blockade Breaker (levels 1–3) | `$32` (80,4,10), flash `$36` | `$46` (128,48,111) | visible on the black recess, **dark** |
| Bastion (fixture, a later region's boss) | `$32`, flash `$34` | `$46` | the same |
| 2–4 | not authored (S5) | `$46` | — |

**Flag:** a region whose `COLPF3` has luminance 0 (`$x0`) would make the band
part invisible on black. Proposed for S5 (QA3): the converter refuses a region
with emitter slots whose `COLPF3` luminance is under 2.

### 11.3 Previews (A2, option A only)

Atari800 on the debug-route build **with the phase-1 reorder probe** (§11.2
item 1), the laser lab reading the compiled module table and `_boss_hp` every
frame: a beam only from an exposed, live weapon; 4 emitter slots on the real
weapons (emitter, gun-3, gun-1, gun-4); the emitter's heat in the band.

* `/Users/marcinkrzetowski/Projects/dark-fighter/build/boss-laser-preview/option-a-tier4-real.png`
  — f711/f741: the emitter, gun-3 and gun-4 fire, gun-1 is silent behind
  plate-c; f1011/f1041: gun-1, gun-3, gun-4 fire, the destroyed emitter is
  silent. Four at once never occurs in this fight (the emitter falls before
  plate-c).
* `/Users/marcinkrzetowski/Projects/dark-fighter/build/boss-laser-preview/option-a-tier1.png`
* `/Users/marcinkrzetowski/Projects/dark-fighter/build/boss-laser-preview/option-a-warning-band.png`
  — f705–f712 at 3×.
* `/Users/marcinkrzetowski/Projects/dark-fighter/build/boss-laser-preview/option-a-band-edge.png`
  — today's DLI against the reorder, 6×.
* `/Users/marcinkrzetowski/Projects/dark-fighter/build/boss-laser-preview/shot-spawn-a2-1.png`
  — §11.1's spawns, gun-3 and gun-4, five frames each.

### 11.4 Revised costs (option A, the shot-origin fix included)

| Home | Phase A (C) | A2 (A + QA1's fix) | Limit |
| --- | ---: | ---: | ---: |
| slot D (`$1900`) | ≤ 800 | ≤ 790 + 210 = **≤ 1,000 B, 8 sectors** | 1,792 |
| slot A | +15–25 | +31–49 (the calls + the spawn Y) → ≤ 2,044 | 2,048 |
| `$0500` | +6 | **0** | — |
| boss entry | +≤ 7 sectors | **+≤ 8 sectors** (49 → 57; +~31 host frames EMULATOR) | — |
| worst-frame native, tier 1 / 4 | 650 / 1,400 | **~730 / ~1,630** (+46 publish, the in-band shots ~240 typical) | Q8 |
| stress composition, tier 4 fixture | ~8,090 | **~8,300** | Q8's 8,500 still holds; 7,000 does not |

Slot A's fit becomes tight (≤ 4 B left at the ×3 end); if it binds, the spawn's Y
computation moves to slot D with the in-band draw (−~16 B in slot A).

### 11.5 Owner questions A2 raises

| # | Question | Recommended answer | Its cost | The alternative |
| --- | --- | --- | --- | --- |
| **QA1** | The boss shot's origin (§11.1) | **born at the gun's muzzle and drawn in the band down to its edge**, in S4b with slot D (no other home) | ≤ 210 B slot D, ≤ 24 B slot A, 2 glyph codes, ~120–240 native typical; the shots arrive 16–20 frames later; the fight's lengths move (measured in Phase B) | (2) a tracer through the ring (~40 B, the shot still pops at the edge); (3) leave it |
| **QA2** | Option A's band edge | **the phase-1 DLI writes `COLPF3` first** | 0 B, 0 cycles; the gameplay frames pixel-identical in the emulator | keep the order: a stray `$32` line under the band (emulator: the whole line; hardware: a tip on the left) |
| **QA3** | Future regions' band colour | **the converter refuses a region with emitter slots whose `COLPF3` luminance is under 2** (S5) | ~5 lines of the converter | none: S5 checks by eye |
| **QA4** | The band flash also flashes the beam's band part (`$32` → `$36`, one frame) | **accept** | 0 | hold the flash while a beam runs (~10 B, the hit feedback weakens) |

Q1 is revised to **A** by the owner's preference; Q2–Q11 stand as written, with
Q5's clause wording and Q8's figures as §11.4 revises them.

---

## 12. Owner decisions (2026-10-06) — they replace the draft answers to Q1–Q11

| # | Decision |
| --- | --- |
| **QA1** | Boss shots are born at the gun's muzzle and drawn inside the band down to its edge, as the player's shots are (decision M). Ships with S4b. The gameplay change (the shots reach the band's edge 16–20 frames later) is reported in the fight-length measurements; no tuning (M8). |
| **QA2** | The band's last-line DLI writes `COLPF3` first. The band must be proven pixel-identical otherwise, by a capture comparison. |
| **QA3** | **S5 requirement:** the converter refuses a region with emitter slots whose band `COLPF3` luminance is under 2. Not implemented in S4b. |
| **QA4** | Accepted: the beam's band part flashes with the band's hit flash. |
| **Q1** | **Option A**: missiles with `PRIOR`'s fifth-player bit, set in the boss sector only and restored on leaving it; the beam is `$32` in the band and `$46` below. No `COLPM` changes, no Heavy-sprite trace exception; P1/P2 stay free. |
| **Q2** | The column is written once at the install and erased at the end. |
| **Q3** | Warning: in the band the emitter's bottom cell heats (spark/muzzle alternating every 4 frames); below the band the beam pulses 1/2 colour clocks in 2-frame groups; a rising tone. |
| **Q4** | The tone on POKEY channel 3 over the engine bed; the music's lead on channel 2 is never cut. |
| **Q5** | Beam damage is per-difficulty data: EASY 5 units, MEDIUM 10, HARD 10. A beam damages the player at most once per firing. Hit detection by software compare. |
| **Q6** | The beam absorbs the player's shots in its column. |
| **Q7** | Home: slot D at `$1900`. The plan proves from the generated memory map and the code that nothing owns `$1900-$1FFF` in any phase (boot, loading, transitions, summary, menu, gameplay, boss); the boss claim covers the boss sector only and the memory map shows it so; slot D's bytes and the remainder of `$1900-$1FFF` for S5 and the finale's volleys are reported. If the proof fails anywhere: STOP. |
| **Q8** | Stress limit **8,500 native in the boss sector only**; 7,000 stays everywhere else. The measured basis is §5.2–5.3 and §11.4. |
| **Q9** | A new laser contact session; the old session is retired by name; the requirement of `lower-playfield-hostile-contact-atr-hard` is evaluated, its clause untouched, in the new session (class (a)). Every other clause the old session carried is listed with where it is covered now; a clause left uncovered is a STOP. |
| **Q10** | The laser-fixture layout and a debug-only tier override, which must not change the default ATR's bytes (proven by a test). The tier 4 fixture exposes **four emitters firing at the same time**, so that the worst case (cycles, DMA, four missiles, four software hit tests) is measured. |
| **Q11** | Timings in data: warning 25 frames, beam 50, region 1's emitter reload 150. M8 tunes them. |

**Phase B gates** (any breach is a STOP with the figures): worst fence margin
≥ 500 everywhere and DMA-on ≤ 32,568, the tier 4 four-beam fixture included;
boss stress work ≤ 8,500 in the boss sector (measured with four beams firing),
≤ 7,000 elsewhere; slot A ≤ 2,048 B (over it: STOP and report what could move to
slot D, move nothing without the owner); slot C ≤ 2,048 B; scratch page ≤ 256 B;
slot D within its proven range; initial block ≤ 13,652 B, no new boot sector, the
ATR menu frame within the rule; nothing in non-boss gameplay frames changes
except the `PRIOR` restore on leaving the boss sector; `PRIOR` and the missiles
proven off and restored outside the boss sector by a test.

## 13. Owner addendum (2026-10-06): AUD-03 and AUD-04 — `STOP` for the owner

The running evidence trace was stopped on the addendum; nothing of it was
committed. The addendum as received was cut off: item 2 ends at "the display
writes must be identical for D=0 and D=1, and the", and item 3 (the
recorded-failure reconciliation gap) is missing. Item 2 below follows its
received text, and the RED/GREEN test also checks that A, X, Y and P come
back unchanged. Item 3 waits for its text.

### 13.1 AUD-03 — the boss DLI and decimal mode (done)

Verified on `main` `1a3c8bf` and here:

* `boss_dli` had no `CLD`.
* The boss's scoring runs between `SED` and `CLD` (`boss_module_scored`).
* `boss_apply_pos` and, here, the lasers' publish run binary `ADC`/`SBC` in
  the DLI.

The test is `tests/boss-lasers.test.mjs` "AUD-03". It covers every phase,
positions 0..63, D and C both ways, and A/X/Y = `$5A/$A5/$3C`.

* **RED** (`4dc8161`, on `02136eb`'s build): 374 cases differ, 122 in phase
  0 (HPOSM, the lasers' publish) and 252 in phase 1 (HSCROL/LMS). The audit's
  case reproduces: phase 1, pos 14, shown 0 writes HSCROL 12 with D set and 2
  with D clear.
* **GREEN** (`a9a7336`): `CLD` at the DLI's entry. Slot A 2,034 → 2,035 B,
  +2 cycles a DLI. `boss_dli` is the boss's only NMI code. The HUD tail that
  phase 2 jumps to does no arithmetic.

### 13.2 AUD-04 — distinct modules met in one frame (`STOP`)

The audit's figures on `main` reproduce exactly in a temporary detached
worktree (removed): 7,343 (columns 30/43/50), 7,388 (12/30/43) and 10,745
(12/17/21/26/30), against 3,150 for one column. The same three on this
branch, tier 1, no laser: 7,923 / 7,968 / 11,438.

**The test** is `tests/boss-stress.test.mjs` (`077e879`), RED:

* **The cases:** every subset of up to five front modules (plate-a, plate-b
  and plate-h included), killed or one hit from their next damage stage.
  Region 1 runs at five band positions with no plate, each single plate or
  every plate destroyed. The tier-4 fixture runs every destroyed-plate set,
  with its four lasers in a warning's heat frame (their costliest, every
  fourth warning frame: +~1,230 cycles) and in their beams.
* **On `main`** (7,000): the audit's 30/43/50 measures **7,348** under this
  frame order (the audit's 7,343 + 5).
* **Here** (8,500): RED, figures below.

**Reachability.** Five player slots, 6 lines a frame.

* **SPREAD:** three shots on one Y; the sides drift ½ HPOS a frame from ±4.
  At most three are in flight, since a second volley needs three free slots.
  Meeting lines are 8 apart and shots move 6, so one volley's shots meet
  together only at one meeting line.
* **Rapid fire:** shots 36 lines apart can meet rows 4–5 apart in the same
  frame.
* **Labels:** one or two meetings a frame are labelled **reachable**. Three
  are **unproven**: SPREAD triples at one line exist geometrically (plate-f /
  plate-g / plate-h on region 1; gun-1 / emitter / gun-3 on the fixture), but
  none was traced. Four or five need another weapon's shots in flight,
  **unproven**.
* **The rule:** the owner's rule applies the limit to unproven cases too.

| Case (worst of its kind) | Label | Native (harness) | Emulator fence margin (`aud04-inject`) | DMA-on |
| --- | --- | ---: | ---: | ---: |
| Region 1, 1 kill (plate-d, p 32) | reachable | 3,613 | 14,028 | 26,970 |
| Region 1, 2 kills (plate-c, plate-d, p 32) | reachable | 5,573 | 9,807 | 27,079 |
| Region 1, 3 kills (plate-f/g/h, one meeting line, p 32) | unproven (SPREAD-plausible) | 7,683 | 5,255 | 26,973 |
| Region 1, 3 kills (audit 30/43/50) | unproven | 7,923 | 4,799 | 27,079 |
| Region 1, 3 kills (audit 12/30/43) | unproven | 7,968 | 4,715 | 26,970 |
| Region 1, 4 kills (a/d/g/h, plate-c destroyed, p 32) | unproven | 10,497 | **221** | 26,973 |
| Region 1, 5 kills (audit 12/17/21/26/30) | unproven | 11,438 | **−1,629 (missed frame)** | 62,538 |
| Region 1, 5 kills (a/d/e/g/h, plate-c destroyed, p 32) | unproven | 12,586 | **−2,388 (missed frame)** | 62,541 |
| Region 1, 5 stage changes (p 4) | unproven | 8,323 | 4,615 | 27,083 |
| Fixture, heat, 1 kill (gun-2) | reachable | 5,066 | 11,415 | 27,049 |
| Fixture, heat, 2 kills (gun-2, gun-4) | reachable | 6,993 | 7,285 | 26,943 |
| Fixture, heat, 3 kills (gun-1/emitter/gun-3, one meeting line) | unproven (SPREAD-plausible) | **9,012** | 2,871 | 27,052 |
| Fixture, heat, 3 kills (plate-a/b/h) | unproven | **9,382** | 2,103 | 26,946 |
| Fixture, heat, 4 kills | unproven | **10,843** | **−780 (missed frame)** | 62,511 |
| Fixture, heat, 5 kills (every weapon: the defeat) | unproven | **13,670** | **−4,324 (missed frame)** | 62,644 |
| Fixture, beams, 5 kills (the defeat) | unproven | 11,542 (test sweep) | **−1,864 (missed frame)** | 62,535 |
| Fixture, heat, 5 stage changes | unproven | **10,695** | **−121 (missed frame)** | 62,512 |

The sweep's worst figures (`tests/boss-stress.test.mjs`, this build):

* Region 1: 12,176 (five kills, p 16).
* Fixture with heat: 13,871.
* Worst reachable: 7,446 (fixture, two kills, heat).

The emulator charges a kill about **2.1× its harness cycles**: about 4,600
cycles of fence margin per extra kill against about 2,150 native. The band's
DMA is most of it, plus the kill's work outside the overlay (score, sound;
the defeat's explosion). After a missed frame the main loop's phase stays
shifted (wall ~35,500 on the following frames, margins ~29,000), so one
overrun shows as 145 deadline overruns in the session.

**Gates breached:**

* **Q8 (8,500):** unproven cases up to 13,871.
* **Fence margin ≥ 500:** 221 (four kills) and missed frames (four or five
  kills, five stage changes), on region 1 as shipped and on the fixture.
* Region 1's breach is **independent of the lasers**; it is on `main` too.
* **Unchanged:** no limit raised, no deferral added.

### 13.3 Proposal for the owner: a bounded allowance a frame (measured as a reverted probe)

**What it does:**

* At most **K = 2** player shots meet the band a frame.
* A later shot is **kept**: it is not freed, and its Y gets +6, undoing its
  next move. It meets on a later frame, and its damage is counted then, once.
* A shot that meets nothing is unaffected; the laser's absorb still applies
  to kept shots.

**The code:**

* `boss_shot_admit` in slot D wraps `boss_shot_meet`: `jsr`, `bcc`, `dec`
  budget, `bmi` → defer.
* The budget is reset at `laser_frame`'s entry, which runs before the shot
  loop every boss frame.
* The shot loop's one `jsr boss_shot_meet` points at the wrapper instead.

**Bytes and slots:**

* Slot A: **+0 B** (2,035 of 2,048).
* Slot D: **+31 B** (30 code + 1 BSS): 1,083 → 1,114 of 1,792. The `$1900–$1FFF`
  remainder falls 709 → 678 B.

**Cycles:** an admitted meeting costs +22 cycles and a deferred one about +40.
With no meetings the cost is +6 a frame, for the reset.

**Measured with K = 2 (probe, reverted):**

* **Harness worst:**
  * Fixture with heat: 7,805 (five shots arriving, two admitted).
  * Fixture with beams: 6,097.
  * Region 1, its laser forced heating (synthetic while the emitter is
    covered): 6,731. All under 8,500.
* **Emulator, every case that failed above:**

| Case (K = 2) | Native | Fence margin | DMA-on |
| --- | ---: | ---: | ---: |
| Region 1, audit 12/17/21/26/30 | 5,700 | 8,485 | 27,369 |
| Region 1, 4 kills (a/d/g/h) | 6,574 | 8,243 | 27,611 |
| Region 1, 5 kills (a/d/e/g/h) | 6,681 | 7,807 | 27,819 |
| Fixture, heat, 3 kills (gun-1/emitter/gun-3) | 7,327 | 6,389 | 27,267 |
| Fixture, heat, 3 kills (plate-a/b/h) | 7,423 | 6,147 | 27,373 |
| Fixture, heat, 4 kills | 7,434 | 5,919 | 27,463 |
| Fixture, heat, 5 kills (the defeat) | 7,435 | **5,706** | 27,780 |
| Fixture, heat, 5 stage changes | 7,559 | 6,387 | 27,778 |

* **The deferral lands:** in the fixture's five-kill case, two weapons fall on
  f755, two on f756 and the last on f757 (the defeat), each frame about
  27,000.
* **Gameplay:** a volley meeting more than two modules at once lands over two
  or three frames (40–60 ms). Damage totals are unchanged.
* **Alternatives:**
  * **K = 1** is smaller still: worst one meeting, 5,701 native with heat,
    margin ≥ 11,000. It spreads a SPREAD volley over three frames.
  * **Bounding kills only**, not all meetings, needs the kill decided before
    `boss_c_hit` and does not bound stage changes (five of them miss a frame
    above).

**Owner questions:**

* **AUD-04-Q1:** adopt the allowance, with **K = 2** (recommended) or K = 1,
  or another remedy?
* **AUD-04-Q2:** the remainder of the addendum's item 2 and its item 3.

### 13.4 Owner decision (2026-10-06) and the cap as built

**Decision AUD-04:** at most **2** player shots meet the boss a frame.

**How the cap behaves:**

* A third or later shot that would meet the boss stays where it is.
* It is tested again next frame, against the boss as it then stands. Its
  damage counts exactly once; no shot is lost or duplicated.
* If its target was destroyed meanwhile, it meets whatever the column holds.
* A beam that covers its column while it waits absorbs it (Q6).

**The addendum's items 2 and 3**, received in full:

* AUD-03 (§13.1) also requires A, X, Y and P to come back unchanged.
* Its test now also runs on builds without the lasers. It is **RED on `main`**
  (252 cases differ, all in phase 1) and GREEN here.
* Item 3 (recorded failures reconciled by their first failing assertion) is
  done in the final reconciliation.

**As built** (`a6dcfce`):

* **The code:**
  * `boss_shot_admit` (slot D) wraps `boss_shot_meet` in UPDATE's shot loop.
  * The loop's one `jsr` is retargeted, so slot A gets 0 B.
  * `boss_shots_admit_left` is reset at `laser_frame`'s entry, before the
    loop, every boss frame.
  * A kept shot's Y gets + `PLAYER_FIGHTER_PROJECTILE_SPEED`; the game's
    projectile update moves it back.
* **Bytes and cycles:**
  * Slot A 2,035 B (+0 for the cap; +1 for AUD-03's `CLD`).
  * Slot D 1,083 → **1,114 B** (+30 code, +1 BSS); the `$1900–$1FFF`
    remainder falls 709 → **678 B**.
  * Cycles: +6 a frame (the reset), +22 an admitted meeting, about +40 a
    kept one.
* **Tests** (`tests/boss-stress.test.mjs`, 7 tests: RED on the code before
  the cap, GREEN with it; RED on `main` under its 7,000 accounting, where the
  audit's 30/43/50 measures 7,348):
  * **The sweep:** every kill and stage-change combination up to five
    modules, plate-a, plate-b and plate-h included. Each case also runs the
    two following frames, with the shots in flight moved as the projectile
    update moves them.
    * Worst native: **7,810** (fixture, four lasers heating, five shots
      arriving); beams 6,685; region 1 6,302.
    * Worst reachable: 7,505. All under 8,500.
  * **SPREAD volley:** three distinct modules on one meeting line land over
    two frames, each hit counted once.
  * **Three kills:** score and kills counted once each, over two frames;
    accuracy (`STATS_HITS`) +3.
  * **Target dies meanwhile:** a kept shot whose target falls on the next
    frame meets exactly what a fresh shot at its place meets.
  * **Beam absorb:** a beam that starts while a shot waits absorbs it.
* **Gameplay effect:** a volley meeting more than two modules at once lands
  over 2–3 frames (40–60 ms). Damage, score and accuracy totals are
  unchanged.

**The gate is the emulator** (`aud04-inject`, debug routes
`build/level-1-s4` and `build/laser-fixture-4-level-1-s4`). These are every
case of §13.2, without the cap (`a9a7336`'s code) and with it (`a6dcfce`).
"Native" is the case's first frame in the harness. "Heat" means the four
lasers are held in a warning's heat frame.

| Case | Label | Native, no cap | Margin, no cap | DMA-on, no cap | Native, cap | Margin, cap | DMA-on, cap |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| R1, 1 kill: plate-d (p 32) | reachable | 3,613 | 14,028 | 26,970 | 3,651 | 14,015 | 27,201 |
| R1, 2 kills: plate-c, plate-d (p 32) | reachable | 5,573 | 9,807 | 27,079 | 5,633 | 9,700 | 27,201 |
| R1, 2 kills: plate-a, plate-g (plate-c destroyed, p 16) | reachable | 6,336 | 9,719 | 27,115 | 6,395 | 9,615 | 27,234 |
| R1, 3 kills: plate-f, g, h (one meeting line, p 32) | unproven (SPREAD-plausible) | 7,683 | 5,255 | 26,973 | 6,023 | 8,689 | 27,400 |
| R1, 3 kills: audit 30/43/50 (plate-d, g, h) | unproven | 7,923 | 4,799 | 27,079 | 6,023 | 8,689 | 27,400 |
| R1, 3 kills: audit 12/30/43 (plate-a, d, g) | unproven | 7,968 | 4,715 | 26,970 | 6,054 | 8,646 | 27,412 |
| R1, 3 kills: plate-a, d, g (plate-c destroyed, p 4) | unproven | 8,089 | 5,563 | 27,088 | 6,174 | 9,452 | 27,340 |
| R1, 4 kills: plate-a, d, g, h (plate-c destroyed, p 32) | unproven | 10,497 | **221** | 26,973 | 6,574 | 8,243 | 27,611 |
| R1, 5 kills: audit 12/17/21/26/30 | unproven | 11,438 | **−1,629** | 62,538 | 5,700 | 8,485 | 27,369 |
| R1, 5 kills: plate-a, d, e, g, h (plate-c destroyed, p 32) | unproven | 12,586 | **−2,388** | 62,541 | 6,681 | 7,807 | 27,819 |
| R1, 5 stage changes (plate-f destroyed, p 4) | unproven | 8,323 | 4,615 | 27,083 | 5,451 | 10,245 | 27,388 |
| T4, heat, 1 kill: gun-2 | reachable | 5,066 | 11,415 | 27,049 | 5,104 | 11,378 | 27,059 |
| T4, heat, 2 kills: gun-2, gun-4 | reachable | 6,993 | 7,285 | 26,943 | 7,053 | 7,115 | 27,165 |
| T4, heat, 3 kills: gun-1, emitter, gun-3 (one meeting line) | unproven (SPREAD-plausible) | 9,012 | 2,871 | 27,052 | 7,327 | 6,389 | 27,267 |
| T4, heat, 3 kills: plate-a, b, h | unproven | 9,382 | 2,103 | 26,946 | 7,423 | 6,147 | 27,373 |
| T4, heat, 4 kills | unproven | 10,843 | **−780** | 62,511 | 7,434 | 5,919 | 27,463 |
| T4, heat, 5 kills (every weapon: the defeat) | unproven | 13,670 | **−4,324** | 62,644 | 7,435 | **5,706** | 27,780 |
| T4, beams, 5 kills (the defeat) | unproven | 11,542 | **−1,864** | 62,535 | 5,592 | 8,609 | 27,328 |
| T4, heat, 5 stage changes (plate-f destroyed) | unproven | 10,695 | **−121** | 62,512 | 7,559 | 6,387 | 27,778 |

**With the cap**, every case passes:

* Worst fence margin **5,706** (≥ 500).
* Worst DMA-on **27,819** (≤ 32,568).
* PAL audit PASS in every session.
* In the fixture's five-kill case the weapons fall over frames f755
  (two), f756 (two) and f757 (the defeat).
* The multi-kill frame defect existed on `main` before S4b (region 1 as
  shipped, no laser), and this cap fixes it.

### 13.5 The boss DLI's timing with `CLD` and QA2; the QA2 comparison on the final build

**DLI timing** (harness, native cycles, D set so the `CLD` path runs; phase 1
republishes the position). WSYNC's wait is not modelled, so "after WSYNC" is
each store's offset from the WSYNC store.

| Phase | `main` `1a3c8bf` | This branch (`CLD`, QA2, the lasers' publish) |
| --- | --- | --- |
| 0 (HUD's last line: the band palette) | entry → WSYNC 14; after: CHBASE +6, COLPF0 +14, COLPF1 +22, COLPF2 +30, COLPF3 +38; total 71 | entry → WSYNC 16; after: CHBASE +6, COLPF0 +14, COLPF1 +22, COLPF2 +30, COLPF3 +38, HPOSM0 +57, HPOSM1 +74, HPOSM2 +91, HPOSM3 +109, SIZEM +121; total 162 |
| 1 (band line 87: the ring palette) | entry → WSYNC 13; after: CHBASE +6, COLPF0 +12, COLPF1 +20, COLPF2 +26, **COLPF3 +32**, HSCROL +84; total 460 | entry → WSYNC 15; after: **COLPF3 +6**, CHBASE +12, COLPF0 +18, COLPF1 +26, COLPF2 +32, HSCROL +84; total 462 |
| 2 (the HUD) | entry → WSYNC 20; after: CHBASE +6, COLPF1 +12, COLPF2 +18; total 57 | entry → WSYNC 22; after: CHBASE +6, COLPF1 +12, COLPF2 +18; total 59 |

* **`CLD`** adds 2 cycles before WSYNC in every phase and nothing after it.
* **QA2** moves COLPF3 from +32 to +6 after WSYNC. The other colours move by
  at most 6 cycles, and HSCROL keeps its place.
* **Phase 0's missile stores** land within the band's first lines, where the
  missile plane is blank: a beam starts at line 48 or lower.
* **On the emulator** (2-sweep-fire2 on `build/level-1-s4`): DLI ordering
  errors 0, missed frames 0.

**QA2 comparison on the final build**:

* **Method:**
  * `build/level-1-s4`, ATR `c8df400c…`, the cap and `CLD` in.
  * 2-sweep-fire2, frames 0–919 captured by the trace emulator.
  * Against a reverted probe of the same build with phase 1's old store order.
* **The trace:** CSVs identical.
* **The pictures:**
  * **875 frames are identical.** The 45 that differ differ only on
    screenshot row 80, scanline 88, the band/ring boundary: `$32 → $46` 218
    pixels, `$36 → $46` 22. That is the stray band `COLPF3` the reorder
    removes.
  * **Each differing frame shows a laser** (warning pulse or beam) crossing
    line 88. No frame without a laser differs.
* **Frame 739:**
  * It differs on line 88 only. Its picture shows the beam (screen columns
    184–191) with the death flash's first frame.
  * The trace's rows run one frame ahead of the pictures. Picture 738 shows
    the ship alive under the beam; row 738 already has the player dying and
    the lasers off (HPOS 0).
  * Picture 739 is therefore frame 738 as displayed. The beam was published
    before that frame's UPDATE detected its hit, and it is gone from picture
    740.
  * The beam stays visible through the frame of its hit and leaves with the
    death flash, as designed. No defect.

## 14. As built — status: **implemented, pending the owner's smoke** (`OWNER-SMOKE CANDIDATE`, 2026-10-06)

**What the lasers are:** §12's decisions as built (option A, slot D at
`$1900`).

* **The tier:** from the level (`laser_tier`), with a debug-only
  `BOSS_LASER_TIER_OVERRIDE` for the fixture builds.
* **The column:** the missile plane is written once at the install
  (`laser_prepare`, which also sets `PRIOR $10`) and erased at the end, 32
  lines a frame, `PRIOR` then back to 0.
* **Per frame:** a laser is only HPOS and SIZEM, published by the band DLI's
  phase 0 from the band position shown.
* **The warning (25 frames):**
  * In the band, the emitter's bottom cell heats through the ring, spark and
    muzzle every 4 frames.
  * Below the band, the line pulses 1/2 clocks in 2-frame groups.
  * A rising tone plays on channel 3; channel 2 is never cut.
* **The beam:** 50 frames.
* **Damage:** EASY 5, MEDIUM 10, HARD 10 (level data), at most once per
  firing, by software compare.
* **The absorb:** the beam absorbs the player's shots in its column.
* **Emitter killed:** its laser goes off.
* **The player dies:** every laser goes off; no beam while dying or
  respawning.
* **QA1:**
  * The boss's shots are born at the gun's muzzle and drawn in the band down
    to its edge.
  * Inside the band they ride the band's drift (`02136eb`), so they fall down
    their own gun's recess.
* **QA2:** the band's last-line DLI writes `COLPF3` first.
* **AUD-03:** `CLD` at the boss DLI's entry.
* **AUD-04:** at most two player shots meet the boss a frame (§13.4).

**The retired session's clauses and where each is covered now.**
`lower-playfield-hostile-contact-atr-hard` moved to `removed_2026_10_06` in
`docs/recorded-gate-failures.json` (`3fa8e22`); recorded clause failures
1 → 0.

| # | Clause the old session carried | Covered now by |
| --- | --- | --- |
| 1 | 16 consecutive contact rasters captured | `lower-playfield-laser-contact-atr-hard`, the same assertion |
| 2 | the capital damage pipeline entered exactly once | the laser's call (`boss_laser_damage`) exactly once and no capital call, in the new session; the shell pipeline once in `capital-contact-hostile-medium` |
| 3 | a FLYING → IMPACT shell on the player | `capital-contact-hostile-medium` (hostile shell) and `lower-playfield-allied-contact-atr-hard` (lower rows); the laser's analogue: BEAM after a ≥ 24-frame warning |
| 4 | two hull units through the canonical gate | the shells' units in `capital-contact-hostile-medium`; the laser's HARD 10 through the same gate (10 → 0, lifecycle 1, cooldown 25) |
| 5 | no repeated damage | no laser call while dying, every laser off (24 rows after the contact) |
| 6 | the final-raster hitbox | the beam over the player's envelope, rows ≥ 191 |
| 7 | PAL timing | the same audit, PASS |

No clause is uncovered.

**The contact scenario's measured run:**

* MEASURED on the bound ATR `6b44d477…`.
* The boss entered at f7877; warning 25 frames; beam f8334; contact f8335.
* Hull 10 → 0 through `boss_laser_damage`, lifecycle 1, cooldown 25; 16
  rasters captured.
* PAL: 0 misses, headroom 4,328.
* The policy steps clear of boss shots until a laser warns (`45978b9`,
  class (a)): with QA1, gun-2's shots otherwise chipped the waiting bot
  first.

**QA3 — an S5 requirement, not implemented in S4b:** the converter refuses a
region with emitter slots whose band `COLPF3` luminance is under 2 (the beam's
band part is `COLPF3`).

**Figures, before (`main` `1a3c8bf`) and after (this branch, bound ATR
`6b44d477…`):**

| Figure | Before | After | Source |
| --- | ---: | ---: | --- |
| Worst fence margin | 1,472 (2-sweep-fire6 f311) | 1,472 (same frame) | full trace, `main`'s run in a worktree and this one |
| DMA-on maximum | 31,240 | 31,240 | the same |
| Boss frames: worst fence margin | 12,974 (dc1 f11216) | 11,608 (dc2 f11435) | the same |
| Boss frames: DMA-on maximum | 28,687 | 28,689 | the same |
| Tier-4 four-beam fixture | — | worst four-beam margin 15,189 (74 four-beam frames), DMA-on 27,248; boss worst 13,143, DMA-on 27,706 | `laser-dodge-2-fire0` on the final `build/laser-fixture-4-level-1-s4` (`72751798…`) |
| AUD-04 cases, emulator, worst | missed frames (−4,324) | margin 5,706, DMA-on 27,819 | `aud04-inject`, §13.4 |
| Boss stress, native (Q8 8,500 boss sector) | Q-B6 test 6,689 (single column) | fortress 5,408; four-laser 6,956; AUD-04 sweep 7,810 | `tests/boss-*.test.mjs` |
| Slot A | 1,995 / 2,048 B | 2,035 / 2,048 B (13 free) | `build/manifest.json` |
| Slot C | 2,003 / 2,048 B | 2,006 / 2,048 B | the same |
| Slot D (`$1900`, boss sector only) | — | 1,114 / 1,792 B (code 1,054 + BSS 60); 9 sectors from 563 | the same |
| `$1900–$1FFF` remainder | 1,792 B (nothing owns it, §3.2) | **678 B** (`$1D5A–$1FFF`) | the same |
| Scratch page | 249 / 256 B | 249 / 256 B | the same |
| Install | 346 / 384 B | 352 / 384 B | the same |
| Initial block | 13,618 / 13,652 B | 13,618 B | the same |
| Boot / extension sectors | 107 / 104 | 107 / 104 | the same |
| Non-boss frames | — | identical to `main` in all 52 shared sessions, every common column | `main`'s CSVs against this run's |
| Fight length EASY / MEDIUM / HARD | 46.0 / 48.6 / 71.2 s (0 / 0 / 0 deaths) | 46.0 / 47.1 / 71.1 s (1 / 3 / 2 deaths) | `director-complete-*`, the fight's first frame to the defeat |
| Boss shot spawns (2-sweep-fire2, s4 route, game frames) | gun-2 24 92 160 228 296 413 575 737 899; gun-4 364 481 643 805; gun-3 530 692 854 | gun-2 24 92 160 228 296 413 575 850; gun-4 364 481 643 918; gun-3 530 805; the emitter's warning 692, beam 717 | the trace's `enemy_projectiles` and the lab's spawn logger |
| ATR SHA-256 | `e0aa7062…` | `6b44d477…` | `dist/` |

## 15. Owner smoke findings (2026-10-06): S4b.1 and the S4b.2 probes

### 15.1 S4b.1 — decisions D1 and D3 (built, `b6731a3` RED, `fdc7db8` GREEN)

**D1, one weapon per module:**

* An emitter fires only its laser, never a pulse shot: `boss_fire` ignores
  it.
* The converter refuses an emitter with a pulse reload, a gun with a laser,
  and a combined kind.
* The laser fixtures carry dedicated emitters (emitter-2/3/4) with the
  emitter's art, never a pulse gun reused.

**D3, the cadence:**

* Warning EASY / MEDIUM / HARD 40 / 32 / 25 frames, reload 300 / 225 / 150, in
  the level data (`boss_def` bytes 8–16).
* At most two lasers warn or fire at once; ready emitters wait in a rotating
  order; a destroyed one leaves the queue.

**Step 1 — the "laser from nowhere":** no defect.

* 194 warnings and 170 beams on the level-1-s4 route and both fixtures, at
  every difficulty: none started after its emitter died or while its shield
  stood, none outside its emitter's cells, none ran on after the emitter died.
* What the owner saw is region 1's emitter. The ribbed panel reads as hull,
  and its beam leaves it once plate-d is gone (`build/s41-diagnosis/`).

### 15.2 S4b.2 — why the beam still reads as coming from nowhere (MEASURED)

**The two causes:**

1. **The emitter reads as hull** (§15.1).
2. **The beam's band segment is hull-coloured.** With option A the missile
   takes `COLPF3`. On level-1-s4 MEDIUM (warning frame 781, beam frame 813),
   every beam pixel on scanlines 48–87 is `$32`, the hull's burgundy, beside
   `$00`. The bright `$46` starts at scanline 88, the band's edge. The eye reads
   a beam that starts at the edge, the illusion QA1 removed for the boss shots.
   The beam's root also begins below the emitter's bottom row, not at its core.

**Also MEASURED:**

* The band DLI's `COLPF3` store lands one line late in some frames:
  scanline 88 under the beam shows `$32`, in S4b.1 and S4b.2 captures alike.
* The beam sat about 1 colour clock right of the emitter's centre.

**The probe** (build flags, never the default build: `--beam-root`,
`--emitter-art=A|B|C`, both centring the beam):

* **The root:** P1 / P2, one per running laser (at most two, D3).
  * In the warning, a glow at the core grows 2 / 4 / 6 lines and pulses every
    4 frames.
  * In the beam, a column grows from the core's last 6 lines through
    scanline 88 (24 lines a frame), joining the `$46` missile beam with no gap.
  * A freed root clears 12 lines a frame, off screen.
* **Placement:** the band DLI places the players exactly as it places the
  missiles.
* **Colour:** `COLPM1` / `COLPM2` = `$46`, set at the install and restored on
  leaving (`_heavy_hull_colour`, single width, off screen).

### 15.3 S5 question (R3), recorded, nothing decided

The force field was also planned on P1 / P2. If the beam root ships, the
force field and the roots compete for the same two players in the boss sector.
S5 must choose: give the force field other hardware, give the roots up while
the field shows, or share the players by band zone.

### 15.4 S4b.3 — centring, the taller emitter, B2 against the root (probes, 2026-10-06)

**Owner decisions:**

* Art A (lens) with the plates' damage looks shared.
* The beam exactly under the lens core.
* The emitter as tall as the turrets.
* A cheaper bright beam probed ("B2") before choosing the root.

**Centring (MEASURED):**

* On Atari800 captures of the art-A probe, the lens core's top row located in
  an intact frame and followed by cross-correlating the band's hull rows.
* With S4b.2's −1 clock shift, the 4- and 2-clock beam sat exactly 1 colour
  clock left of the core, at every band position, in the band and below it.
* The S4b.2 "1 clock right" was a measurement error: the band position was
  read from the wrong frame.
* The shift is removed. The 4-clock beam now centres on the core to the pixel
  (0 px at band positions 40–60, both probes).
* The warning's 1-clock pulse sits half a clock right, unavoidably: an odd
  width cannot share an even-width core's centre.
* The test "S4b.3: the beam's centre is the emitter core's centre" pins
  edge + width/2 = x × 4 + width × 2 from the module data.

**The taller emitter (probe, `--emitter-art=A`):**

* Rows 1–3, its bottom level with the lower turrets (gun-2, gun-4).
* The added row is the housing row repeated; the core row moves down into
  the empty recess; plate-d still covers it.
* No new glyphs: region 1 stays at 115 codes, 1,018 of 1,024 B. The fixtures'
  emitters follow, at 115 and 109 codes.

**B2 (probe, `--beam-b2`):**

* **Missiles:** M1 / M2 in COLPM1 / COLPM2 = `$46`, set in the boss sector,
  restored on leaving. PRIOR is not written in the boss sector.
* **Assignment:** each running laser (at most two) takes M1 or M2 when its
  warning starts and frees it when it ends.
* **The column:** written once at the install, from the lens core's line 3
  down to the playfield's end. The warning's pulse and the beam start at the
  core.
* **What B2 makes unnecessary:**
  * PRIOR's fifth-player bit and its restore: removed.
  * QA2's COLPF3-first order: reverted under B2, since no laser pixel is
    COLPF3.
  * QA4 (the beam flashes with the band): gone; the beam is COLPM.
  * QA3's S5 refusal of an emitter region with a dark COLPF3: obsolete.
  * The root's scanline-88 cover: not needed.
* **Priority** (PRIOR bits 0–3 = 0, as in all gameplay): GTIA ORs overlapping
  playfield and missile colours.
  * Over the lens art the beam reads `$4E`.
  * Under an emitter the column is empty recess (decision O), and plate-d
    falls before the emitter fires. So the beam crosses no hull and no
    standing plate.
  * P0 outranks M1 / M2: the ship is drawn over the beam exactly as in S4b.1
    (contact frame 820: identical pixels).
* **The trace:** the stale-sprite check reads P1 / P2 ($3D00 / $3E00), not
  the missile plane; no check reads COLPM1 / COLPM2 in the boss sector. B2
  passes every clause.
* **The root fails that check** on 2,043 frames of `laser-dodge-2-fire0`.
  Narrowest exemption if it ships: skip player slot p's rows when the boss
  sector is active and `root_owner[p] != $FF` or `root_dirty[p] != 0`
  (RAM).

**Measured:**

| | `fdc7db8` | root | B2 |
| --- | ---: | ---: | ---: |
| Slot A | 2,032 B | 2,032 B | 2,032 B |
| Slot D, level-1-s4 | 1,306 B (code 1,228) | 1,782 B (code 1,684) | 1,492 B (code 1,398) |
| Slot D, tier-4 fixture | 1,290 B | 1,766 B | 1,476 B |
| Worst boss frame, native (tier 4, two on, kills) | 7,575 | 8,245 | 7,593 |
| DLI phase 0, native | 161 | 204 | 171 |
| Two beams on: worst fence margin / DMA-on (Atari800, tier 4) | 14,460 / 27,530 (S4b.1) | 12,575 / 27,399 | 14,761 / 27,448 |
| Trace clauses | pass | stale-sprite failure | pass |
| P1 / P2 | free | taken | free (S5's force field) |

## 16. Final (owner decisions of 2026-10-06): B2, art A, the taller emitter — status: implemented, pending the owner's smoke

**Decisions:**

* **B2** (2026-10-06; **reverses Q1's option A**):
  * The lasers use missiles M1 / M2 in COLPM1 / COLPM2 = `$46`, one for each
    running laser (at most two, D3).
  * The colours are set in the boss sector only and restored on leaving (the
    Heavy's hull colour); PRIOR is never written there.
  * The reason: with option A's fifth-player bit the beam's band segment took
    COLPF3, the hull's `$32`, so the beam read as starting at the band's edge
    (MEASURED, §15.2).
* **Superseded** (2026-10-06):
  * **QA2** — phase 1's COLPF3-first store order: reverted to main's order.
    Nothing else needed it once no laser pixel is COLPF3.
  * **QA3** — S5's refusal of an emitter region with a dark COLPF3: obsolete.
  * **QA4** — the beam flashing with the band: gone, the beam is COLPM.
* **The beam root is not shipped** (2026-10-06). Its code, flag and tests are
  removed. Findings: §15.2, §15.4.
  * It cost 476 B of slot D (1,784 of 1,792) and 670 native cycles on the
    worst frame (8,245 of 8,500).
  * It took P1 / P2.
  * It failed the trace's stale-sprite clause (P1 / P2's memory) on 2,043
    frames.
* **Art A** (lens) for region 1's emitter and the fixtures' emitters; every
  plate shares one cracked and one broken look; the warning heat reuses the
  spark and muzzle glyphs.
  * The emitter spans rows 1–3, its bottom level with gun-2's and gun-4's; the
    added row repeats the housing row.
  * `cavityRows` 3, as the turrets.
  * The strip beside its base cut (decision O): cell (34, 3).
* **Beam centring** as probed: the 4- and 2-clock beam centres on the lens
  core, pinned by its test. The warning's thinnest 1-clock pulse sits half a
  colour clock right; **accepted**.
* **S5:** P1 / P2 stay free in the boss sector for the force field. §15.3's
  conflict is **resolved**.
* **Unchanged:**
  * D1, D3, AUD-03, AUD-04, QA1.
  * Slot D at `$1900`, with the boss claim in the boss sector only.
  * The 8,500 boss-sector limit.

**Build flags:** the probe flags (`--emitter-art`, `--beam-root`,
`--beam-b2`) are gone. `--laser-fixture=2|4` stays: the tier-2 and tier-4
fixture builds and `tests/build-variants.test.mjs` use it. `--level=N:sector=M`
(the debug route) is unchanged.

**Final figures** (bound ATR `3df058a6…`; `main` `1a3c8bf` in brackets, its own
trace run in a temporary worktree):

| Figure | Value | Source |
| --- | ---: | --- |
| Worst fence margin | 1,472, 2-sweep-fire6 f311 (1,472) | full trace |
| DMA-on maximum | 31,240 (31,240) | the same |
| Boss frames: worst margin / DMA-on | 10,040 dc2 f8735 / 28,879 (12,974 / 28,687) | the same |
| Tier-4 fixture, two beams on (648 frames): worst margin / DMA-on | 14,761 / 27,448 | `laser-dodge-2-fire0` |
| Boss stress, native (8,500) | 7,670 two-laser; AUD-04 sweep 7,619; fortress 5,653 | `tests/boss-*.test.mjs` |
| Slot A / C / D | 2,032 / 2,006 / 1,480 B (1,995 / 2,003 / —) | `build/manifest.json` |
| `$1900–$1FFF` remainder | 312 B (`$1EC8–$1FFF`) | the same |
| Region 1's charset + look table | 1,018 of 1,024 B (994) | the converter |
| Initial block / boot sectors | 13,618 B / 107 (13,618 / 107) | `build/manifest.json` |
| Non-boss frames | identical to `main` in all 52 shared sessions | CSV comparison |
| Fight EASY / MEDIUM / HARD | 38.3 / 56.2 / 71.4 s, 1 / 1 / 1 deaths (46.0 / 48.6 / 71.2 s, 0 / 0 / 0) | `director-complete-*` |

## 17. S4b.4 (owner decisions of 2026-10-07) — status: implemented, pending the owner's smoke

The owner's smoke of the §16 candidate (`3df058a6…`): the emitter still read
as the ribbed panel, its warning heat looked like a player's hit, its damage
looked like a plate's, and level 1 had too many Bomber waves after the capital.

### 17.1 Decisions (2026-10-07)

* **W1** — level 1 after the capital: exactly one wave of each kind that was
  there, in the order of first appearance. Sector 3 (144 rows) keeps one
  Raider + Wingman wave, the flight-lead one (the level's only re-skinned
  escort wave); sector 4 (312 rows) one Bomber wave. Decision 8's played
  order and density after the capital are superseded; the waves before the
  capital and the capital are unchanged.
* **E1–E3** — the emitter gets its own silhouette, its warning heats the lens
  with its own glyphs (never a hit's spark or muzzle flash), and its damage
  looks are its own or none.
* **E4, option (b)** — region 1's 98-B look table leaves the charset area: it
  is linked first in slot D (`BOSS_D_LOOKS`, `$1900`) and read with slot D's
  run, with no loader code (98 of the 110 B allowed).
* **Owner answers 1–10:**
  1. **Design 1, the projector tower**, for region 1 and the fixtures:
     `assets/graphics/boss-regions/region-1/emitter.png`. **Only the lens
     stages** (`"stages": "lens"`): its own cracked and dark looks; the tower
     keeps its look until destroyed (decision L).
  2. Designs 2 and 3 and the `--emitter-design` flag are removed.
  3. W1 stays.
  4. **The first shot on exposure**: when an emitter's shield is destroyed, it
     warns on the next frame, at the front of the two-laser queue (both
     places busy: the first that frees); then its normal reload.
  5. **The emitter's durability ×2** (10 → 20 hit points).
  6. **Decision I changes**: the MEDIUM fight target is now **90–120 s**
     (it was 45–60 s), reached in data only. **S5 requirement:** a 90–120 s
     fight needs a second phase — the finale volleys of decision B. M8 does
     the final tuning on hardware.
  7. **Laser cadence per level is M8's**: `bossDef.laserWarning` and
     `bossDef.laserReload` are per-level, per-difficulty data in each
     `assets/levels/level-NN.json`, so faster fire on levels 5–8 and 9–12
     needs no code.
  8. **The laser contact session is a bot policy**, not a memory write.
  9. No `git stash` or other working-tree change under a running trace.
  10. **S5 requirement:** slot D is shared by every region, so each region's
      look table needs a home of its own (recorded in
      [m5-loading-boss.md](m5-loading-boss.md)).

### 17.2 As built

* **The tower:** 3 × 3 cells at columns 31–33, rows 1–3, its bottom level
  with gun-2's and gun-4's; the lens is the bottom row's centre cell. The beam
  is centred on the lens (colour clock 130) and the warning heats that cell
  with heat A and B (tables 252 / 254).
  * The art is five panels in `emitter.png` (rest, heat A, heat B, cracked,
    broken), painted over band, open, cracked and broken.
  * Region 1 uses 122 of 128 codes (6 free; the tower takes 10 of the 16 it
    was given) and 976 B of charset.
* **Lens-only stages:** the tower's cells are plain glyphs. `boss_draw_module`
  adds K or 2K to staged codes only (tables[255] is the first plain code):
  12 B in slot A, which is now 2,047 of 2,048 B.
* **The first shot:** an emitter covered at the install is *shielded*.
  * `laser_first_shot`, run right after the controller's tick, marks a
    shielded emitter that the tick just exposed as ready, with priority, and
    admits it that frame.
  * The tick exposes a module on the frame after its cover's kill, so the
    warning starts on the frame after the shield falls.
  * `laser_admit` serves priority lasers before the rotating order.
  * Slot D is 1,714 B, leaving 78 B of `$1900–$1FFF` (`$1FB2–$1FFF`).
* **Durability** (region data; `boss_def`'s per-difficulty scale, ×3/4,
  ×1 and ×5/4, is unchanged):

  | Module | S4b | S4b.4 | EASY / MEDIUM / HARD now |
  | --- | ---: | ---: | --- |
  | gun-1 to gun-4 | 14 | 28 | 21 / 28 / 35 |
  | plate-d, plate-e | 10 | 20 | 15 / 20 / 25 |
  | plate-a, -b, -c, -g, -h | 8 | 16 | 12 / 16 / 20 |
  | plate-f | 6 | 12 | 9 / 12 / 15 |
  | emitter | 10 | 20 | 15 / 20 / 25 (S4b: 8 / 10 / 12; quarter rounding puts EASY at 15, not 16) |

* **The laser contact session** (`lower-playfield-laser-contact-atr-hard`):
  * The `lower-contact-laser` policy parks the fighter under the lens from the
    boss's entry, firing up into the shield (plate-d). The shield falls, the
    emitter warns, and the beam meets the fighter away from the guns'
    recesses, where the boss's shots fall.
  * MEASURED: health 10 from the entry (frame 2,861) to the first laser hit
    (3,311), 10 → 0.
  * The policy keeps full health inside the boss sector. This replay enters
    the sector at full health because the bot respawns at the entry.

### 17.3 Trace classes met on the way (clauses never weakened)

* **(a), scenario rewritten:**
  * the laser contact (above);
  * the booster-cycle clause, `>= 10`: the hunt integrity replays now reach
    the boss, which has no capsules, and collected 7.
    `memory-integrity-atr-2-hunt-fire7` joined, for 11; the other candidates
    were measured.
* **(b), harness or observer fixed:**
  * the boss-entry frame, set aside by design, is now counted by the frame
    totals (`measuredFrames`; seven replays reach the boss since W1);
  * the booster rotation is compared within a replay (each replay starts on
    Rapid); the evidence records `granted_booster_modes_by_replay`;
  * the build's cycle model ends a session at the reader's disk vectors.
* **(c):** none.

### 17.4 Final figures

The ATR is `7a9a35c3…`. `main` `1a3c8bf` is in brackets, from its own trace
run in a temporary worktree.

| Figure | Value | Source |
| --- | ---: | --- |
| Worst fence margin | 1,472, `2-sweep-fire6` f311 (1,472, same frame) | full trace |
| DMA-on maximum | 31,074 (31,240) | full trace |
| Boss frames: worst margin / DMA-on | 8,658 (`debris-effects-2-sweep-fire4` f3830) / 28,788 (12,974 / 28,687) | full trace |
| Tier-4 fixture, two beams on (651 frames) | worst margin 14,637, DMA-on 27,456 | `laser-dodge-2-fire0` |
| Boss stress, native | two-laser 7,502; fixture warning sweep 7,685; fortress 6,743; per-frame 5,376 (limits 8,500 / 7,000) | `tests/boss-*.test.mjs` |
| Slot A / C / D | 2,047 / 2,006 / 1,714 B (1,995 / 2,003 / —) | `build/manifest.json` |
| `$1900–$1FFF` remainder | 78 B, `$1FB2–$1FFF` | the same |
| Region 1's charset; free codes | 976 B (+ the 98-B look table in slot D); 6 free (978 B with the table, 18 free) | the converter |
| Initial block / boot sectors | 13,618 B / 107 (the same) | `build/manifest.json` |
| Level length to the boss, EASY / MEDIUM / HARD | 67.3 / 59.5 / 55.1 s (190.3 / 169.9 / 155.1) | `director-complete-*` |
| Boss fight | 81.3 / 101.8 / 130.5 s (46.0 / 48.6 / 71.2) | the same |
| Bot deaths, whole run (in the fight) | 1 (1) / 5 (3) / 5 (3) (2 (0) / 6 (0) / 6 (0)) | the same; lives held at 3 |
| Non-boss frames | identical to `main` in 41 of 52 shared sessions; the 11 others first differ on the frame they enter the post-capital sector (W1) | CSV comparison |

## 18. S4b.5 (owner decisions of 2026-10-07) — status: implemented, pending the owner's smoke

The owner's smoke of the S4b.4 candidate (`7a9a35c3…`) asked for F1–F4 and for
memory to fit them. The first S4b.5 step (`ee9d38e` RED, `cbd0de6` GREEN)
added slot E and built F1 as two variants behind a flag for the owner's
choice. The owner's answers on the variants (2026-10-07) are built here.

### 18.1 Decisions

* **F1, the warning: variant (a), flicker, is the default.** Only the warning
  line flickers, in its own missile's colour register (COLPM1 / COLPM2):
  white `$0E` and the beam's `$46`, alternating every 2 frames. It widens from
  1 to 2 to 4 colour clocks by thirds of the warning. The beam is `$46` at four
  clocks. Variant (b), the ramp, is removed with its code, its state and the
  `--warning-variant` flag. The lens heat and the rising tone are unchanged.
* **F2, then the band flash removed (a further change to decision C).** Nothing
  flashes the band's colours: not a hit, not a stage change, not a module's
  destruction. The DLI shows the region's palette. What remains:
  * a hit: its spark and its tick;
  * a stage change: the damage looks;
  * a destruction: the module disappearing (decision L), its sound and its
    score.

  `boss_flash_on`, `boss_flash_timer` and `boss_palette` are gone. The region
  data's `flashLuma` is refused, and its table byte 4 is reserved (0), so the
  offsets are unchanged.
* **F3, the capsule.** A destroyed module counts for the capsule rule as an
  enemy kill does (none while one is pending or showing; every third kill earns
  one). The capsule shows just below the band at the module's column and falls
  at the gameplay rate. **The defeating kill** (the last weapon module) neither
  counts nor spawns.
* **F4, the scores:** unchanged; M8 tunes them.
* **Slot E** (`$4C00–$4E3F`, 576 B): read at the boss entry over the expanded
  hull maps, for the boss sector only. **Its contract:**
  * only the capital's `draw_hull_row` reads the maps;
  * every gameplay start rebuilds them (`hull_maps_built`);
  * the trace holds every replay to no reader of the maps between a boss entry
    and the next rebuild.

  Three replays take the ways out 300 frames into the HARD fight: a pause and
  resume, the last life lost, and RESET.
* **No bytes move from slot E to slot D** to save a sector (decision 5). The
  boss entry's load is an S5 constraint
  ([m5-loading-boss.md](m5-loading-boss.md)).

### 18.2 As built

* **Bytes freed by removing the flash:** 77 B in all.
  * slot A, 24 B: the hit path's call and the decay;
  * slot C, 14 B: the init;
  * slot E, 34 B: `boss_flash_on`;
  * scratch, 5 B: `boss_palette` and `boss_flash_timer`.

  The defeating-kill rule costs 5 B in slot E.
* **Slots:**
  * A: 2,007 B (41 free);
  * C: 1,992 B;
  * D: 1,773 B, leaving `$1FED–$1FFF` (19 B);
  * E: 102 B (474 free, 1 sector);
  * scratch: 244 B.
* **The defeat chain's background flash is unchanged.** Each chain blast sets
  the shared enemy-explosion timer, which flashes COLBK (plan §5.6, pinned by
  `tests/boss-runtime.test.mjs`'s win test). It belongs to the win sequence, not
  to a hit, a stage change or a module's destruction. **Open for the owner.**

### 18.3 Trace classes met on the way (clauses never weakened)

* **(a):** none.
* **(b), harness or observer fixed:**
  * the aggregation's `Math.max(...allRows)` overflowed the stack once the
    three slot E replays were added; it now uses a reduce;
  * the slot E driver counts fight frames, not host frames (the entry's load
    had eaten 240 of its 300);
  * the RESET's reboot frame is found from the data and set aside like the
    boss entry's;
  * the frames set aside keep their hull-map counters (the boss head runs
    inside the entry's frame).
* **(c):** none.

### 18.4 Final figures

The ATR is `bd5c5c2d…`. `main` `1a3c8bf` is in brackets.

| Figure | Value | Source |
| --- | ---: | --- |
| Worst fence margin | 1,472, `2-sweep-fire6` f311 (1,472, same frame) | full trace |
| DMA-on maximum | 31,074 (31,240) | full trace |
| Boss frames: worst margin / DMA-on | 8,199 (`weapon-pickup-spread-0-hunt-fire4` f5762) / 29,169 (12,974 / 28,687) | full trace |
| Tier-4 fixture, two beams on (651 frames) | worst margin 14,451, DMA-on 27,392 | `laser-dodge-2-fire0` on `build/laser-fixture-4-level-1-s4` |
| Boss stress, native | fixture warning sweep 7,982; two-laser 7,486; fortress 6,591; per-frame 5,259 (limits 8,500 / 7,000; `main`'s Q-B6 test 6,689) | `tests/boss-*.test.mjs` |
| Slots A / C / D / E | 2,007 / 1,992 / 1,773 / 102 B (1,995 / 2,003 / — / —) | `build/manifest.json` |
| Region 1's charset; free codes | 976 B; 6 free (978 B, 18 free) | the converter |
| Initial block / boot sectors | 13,618 B / 107 (the same) | `build/manifest.json` |
| ATR menu frame | 550 cold, 541 warm (the same) | boot smoke |
| Boss entry | 64 sectors, 245 host frames (49 / 188) | `director-complete-*` |
| Level length to the boss | 67.3 / 59.5 / 55.1 s (190.3 / 169.9 / 155.1) | the same |
| Boss fight | 73.4 / 100.1 / 129.0 s (46.0 / 48.6 / 71.2) | the same |
| Capsules in the fight, shown / collected | 3 / 1, 3 / 1, 4 / 0; none on the defeat (`main`: none - F3 is new, and the boss sector's Director grants no capsule) | the same, `pickup_state`; `main` by its code |
| Bot deaths, whole run (in the fight) | 1 (1) / 5 (3) / 5 (3) (2 (0) / 6 (0) / 6 (0)) | the same; lives held at 3 |
| Slot E's ways out | pause: the fight resumes, no rebuild; game over and RESET: one rebuild, then 256 capital rows drawn from it; 0 dirty reads in 55 replays | `slot-e-*` |
| Non-boss frames | identical to the S4b.4 candidate in all 65 shared sessions on every common column. After the boss, 2 sessions (`capital-muzzle-ring-2-sweep-fire4`, 1,758 rows; `debris-effects-2-sweep-fire4`, 759 rows) shift their clocks and host frames by 8 frames, the entry's load (237 → 245); nothing else differs | CSV comparison |
