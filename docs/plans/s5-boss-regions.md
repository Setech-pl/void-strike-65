# Plan — S5: bosses for regions 2–4 on the shared boss engine, with per-region overlays (plan-s5)

**Status:** S5-1 implemented on `chore/s5-platform`, `OWNER-SMOKE CANDIDATE`
(§6.1). The plan itself: `OWNER REVIEW CANDIDATE` (2026-10-09, branch `docs/plan-s5`,
planning only; **the owner answered every question of §7 the same day — §7.1 —
and the session table of §6 carries the answers**). No artifact byte changed: the ATR and the boot image are
`main` `9c41738`'s (§0.1). Phase A measured on probe builds under
`build/level-1-s6/` and `build/level-2-s0/`, every edit reverted before each
commit; the probes' sources and run logs live outside the repository.

**What this plan is for.** Region 1's boss (the layered fortress *Blockade
Breaker*) ships; regions 2–4 need theirs from the same engine. The binding
resources are the boss overlay slots (A 6 B, C 168, D 9, E 310 with 200
reserved for the torpedo), the boss entry's load (64 sectors, 245 host frames
against a 250 bound) and the boss sector's native work budget (8,434 of 8,500
in the stress fixture). The owner's requirement of 2026-10-08
([gameplay-variety.md](gameplay-variety.md) §7.1 Q6) is that region-specific
boss code and data live in **per-region overlays** read at the boss entry, so
only the current region's code is resident. This document inventories the
engine (§1), measures what the design rests on (§2), keeps the ledgers (§3),
designs the overlay and the three regions (§4), specifies the debug routes
(§5), splits the work into sessions (§6) and lists the owner questions (§7).

Labels: **M** measured on a build, a probe or the trace; **M-N** measured
natively with the 6502 harness on the built bytes (no emulator); **IC**
instruction count on written code; **AN** analogy to a measured routine;
**G** guess, already multiplied by 2–3 and carrying ~20 % reserve. Frames are
PAL host frames unless said.

---

## 0. Step 0, baseline, differences

### 0.1 Step 0 record

| Item | Value |
| --- | --- |
| Branch at start | `main`, clean (`git status --short` empty) |
| `main` HEAD | `9c41738` docs(sector-flow): the owner's smoke fix of 2026-10-09 — plan §4, STATUS, the smoke checklist with the (b) → boss route |
| Worktrees | the primary checkout only (`git worktree list`: one entry) |
| `dist/void-strike-65.atr` | `977108bf32d4832f67e4d8e389b5a487f7ca6d853762f42f1e2f67f8b44ac94f` (92,176 B) |
| `dist/void-strike-65-boot.bin` | `a25c3e3ab1b85c0c1f604a2198963c0b6297f1f291398751a24fb4271abd186f` (27,264 B) |
| Sector-flow merge present | yes: `docs/plans/sector-flow.md` §4 carries the boss-entry debris fix (`3cd5438`), evidence bound by `7ae494d` |
| `build/` | the default build's (its manifest's artifact hashes equal `dist/`'s) |
| Branch created | `docs/plan-s5` |

### 0.2 Baseline, each figure with its source

| Figure | Value | Source | Brief |
| --- | ---: | --- | --- |
| Worst fence margin | **1,447** (`2-sweep-fire6` f311) | STATUS "Sector flow" §Gates | agrees |
| DMA-on maximum | **31,304** (`memory-integrity-atr-2-hunt-fire5` f2388) | same | agrees |
| Boss frames, worst fence margin / DMA-on | **8,650** (`director-complete-1-natural-sweep-fire0` f4604) / **29,134** (`director-complete-2` f5255), over 12 boss sessions, 35,560 boss frames | **M** this session, `build/runtime-wall-trace/*.csv` of the 2026-10-09 regeneration (the committed evidence carries no boss-frame margin field; STATUS's last restated figure is 8,687 / 29,126 at fix/smoke-2026-10-07) | brief "about 8,300": the measured figure is 8,650 |
| Boss stress, native | **8,434 / 8,500**; the boss frame's own work **5,404 / 7,000**; the fortress 6,671 | STATUS "Sector flow" §Gates; `tests/boss-stress.test.mjs` | agrees |
| Boss entry | **64 sectors, 245 host frames** (bound `< 250`, `tests/runtime-wall-trace.test.mjs:388`) | `docs/runtime-wall-trace.json` `coverage.director_level_complete`; **M** this session on the `level-1-s6` route: 245 | agrees |
| Initial block | **13,618 B** (STOP 13,652; ceiling 13,684) | `build/manifest.json` `transportCapacity.initialBootContentBytes` | agrees |
| Transport | boot 107 / extension 106 / total **213** sectors | manifest | — |
| ATR menu frame | **553** cold (limit 603) | STATUS "Sector flow" §Gates | agrees |
| `DIRECTOR_RAM` free | **32 B** | STATUS | agrees |
| `$AE00` window free | **1,022 B** | STATUS | agrees |
| Boss slot A | 2,042 of 2,048, **6 free**, 16 sectors (528–543) | manifest `boss.slotA` | agrees |
| Boss install run | 352 of 384, 32 free, 3 sectors (544–546) | manifest `boss.install` | — |
| Boss slot C | code + rodata + ASM 1,659 B (13 sectors, 547–559), BSS 221, **168 free** of 2,048 | manifest `boss.slotC` | agrees |
| Boss scratch page | 244 of 256, 12 free | manifest `boss.scratch` | — |
| Boss slot D | code 1,695 B (the look tail 98 + the lasers 1,597; 14 sectors, 563–576), BSS 88, **9 free** of 1,792 | manifest `boss.slotD` | **brief says 19**: 9 since fix/smoke-2026-10-07 (m5 §1 note); 19 was S4b.5's |
| Boss slot E | code 254 B (2 sectors, 577–578), BSS 12, **310 free** of 576; **200 reserved** for the torpedo (Q6) → **110 for S5** | manifest `boss.slotE`; gameplay-variety §7.1 | agrees |
| Region 1's charset | 976 B, **122 codes, 6 free**, 8 sectors (640–647) | manifest `boss.regions[0]` | agrees |
| Region 1's look tail | **98 B** (first in slot D) | manifest `boss.slotD.lookTail` | — |
| Region 1's disk reservation | 632–647, **16 of 16** used (theme 2, band A 3, band B 3, charset 8) | `build/boss-runs.inc` | — |
| Level 1 fight (bot, E / M / H) | **76.7 / 92.2 / 112.4 s** | STATUS "Sector flow" | agrees |
| `npm test` | 1,227 / 1,226 / **1** recorded (`preview` @ `tests/preview.test.mjs:164`); 0 recorded clause failures | STATUS "Sector flow" §Tests | agrees |

**Where the brief and the repo differ:** only slot D (19 → 9 B) and the
boss-frame margin ("about 8,300" → 8,650 measured). Neither changes a
decision below.

### 0.3 Conventions

* The boss entry's host frames are counted by the harness on the entry row
  (`next_start_host_frame − start_host_frame`); the bound is `< 250`.
* "Sectors" of an overlay run are `ceil(code bytes / 128)`: a BSS is never
  read from disk (`cfg/boss.cfg`).
* The stress limit (8,500 native) is `tests/boss-stress.test.mjs`'s sum of
  the three boss DLIs, UPDATE, SECTOR_COMPLETION and MOTION on a synthetic
  kill frame of the tier-4 laser fixture; the fence margin is the real
  frame's measure. A native cycle before the fence costs ~2.0–2.4 of margin
  (boss-lasers §5.2).

---

## 1. Phase A — inventory (what is true today, with file:line)

### 1.1 The engine's homes: resident and overlay

| Part | Home | Size | Read when | Source |
| --- | --- | ---: | --- | --- |
| The boss entry's resident half: the WARNING screen, the region's theme run (directory entry 2–5 by `min(3, (id − 1) / 3)`), slot A marked overlaid, the boss code run (entry 1) | `HYBRID_ASM_WINDOW` `$B36C–$B3D8` (109 B), window | 109 | resident | `src/hybrid/c-asm-abi.s:618–668` `_asm_boss_enter` |
| The Director's half: `FLAG_BOSS_DUE` on entering the BOSS sector; the drain and the debris wait; `asm_boss_enter()` | window C | — | resident | `src/c/director.c:384–390`, `src/c/lifecycle.c:679–693` |
| Slot A: the head (reads install, C, D, E and the region's three runs), the vector image, the band, the DLI, motion, UPDATE, the column map, hit feedback, fire, the draw queue, nozzles, the hand-off | `$6DE8–$75E7` (`BOSS_HEAD`, `BOSS_CODE`, `BOSS_HEAD_CHECK`) | 2,042 | every boss entry, 16 sectors | `src/hybrid/boss.s:191–330` (head), `:344–560` (DLI, motion, UPDATE), `:714–781` (fire), `:2824–3012` (install) |
| The install run (once, in place at the staging RAM) | `$7810–$796F` | 352 | every entry, 3 sectors | `boss.s:2824` |
| Slot C: the C controller (cover, stages, tier, defeat, the one fire countdown, salvo bursts, the chain, bonus, clock) + `boss_prepare` (ASM) | `$1000–$17FF` | 1,659 + BSS 221 | every entry, 13 sectors | `src/c/boss.c` (`boss_c_init` `:270`, `boss_c_hit` `:343`, `boss_fire_next` `:398`, `boss_c_tick` `:433`), `boss.s:1428–1574` |
| Scratch: the column map, the ring, slot A's state | `$1800–$18FF` | 244 | set by the install | `boss.s:1580–1652` |
| Slot D: **the region's look tail first (98 B)**, then the lasers (M1 / M2, the column, warning, beam, hit test) and the boss's shots inside the band | `$1900–$1FFF` | 98 + 1,597 + BSS 88 | every entry, 14 sectors | `boss.s:1685–1690` (tail), `:1690–2810` (lasers); `scripts/boss-assets.mjs:70–75` (the tail's home) |
| Slot E: the capsule from a destroyed module, the warning's flicker colour, the shots drawn late | `$4C00–$4E3F` | 254 + BSS 12 | every entry, 2 sectors | `boss.s:1989–2133`, `:2412–2431` |
| The region charset (codes 7–127 the region's; 0–6 the divider's, copied by the install) | `$0C00–$0FFF` | ≤ 1,024 | every entry, ≤ 8 sectors | `boss-assets.mjs:40–47`; `boss.s:2833–2838` |
| Band A / band B + the tables page (`$AD00`, 256 B: header, armour columns, open-look offsets, 16 × 12-B module records) | `$A880–$A9FF`, `$AC80–$ADFF` | 384 + 384 | every entry, 3 + 3 sectors | `boss-assets.mjs:125–175` |
| The region's theme | `$7990` (256 B) | 256 | first, 2 sectors | `c-asm-abi.s:638–647` |
| The run table the head walks | slot A, `boss_runs` (16 × 5 B) + `boss_region_runs` (4 B) | 84 | — | `boss.s:286–291`, `build/boss-runs.inc` |
| The head's checksum of its seven runs, per region (audit-hardening) | `BOSS_HEAD_CHECK`, `build/boss-sums.inc` | 38 | — | `boss.s:304–330` |

**Resident versus overlay today:** the only resident boss bytes are the
window's 109-B entry half and the Director's flag logic; everything else is
read at the entry. **Nothing region-specific is code today**: region 1 is
data (band, tables, charset, look tail, theme). The look tail is the one
per-region datum that rides a *shared* run (slot D's), which is why the build
refuses a second region (m5 §1, "only one region's table fits there").

### 1.2 The boss-entry load path

`_asm_boss_enter` (`c-asm-abi.s:618`): music off, the level buffer's magic
cleared, the WARNING screen (`pin_sector_reader_show_records`), the region's
theme run through the overlay directory (`BOSS_READ_RUN` = `$A006`,
`sector_reader_read_run`, `src/hybrid/sector-reader.s:447–462`), the theme
copied over the level's track and started, `sr_slot_a_overlaid` = 1, the boss
code run (directory entry 1, 16 sectors) → `boss_head` (`boss.s:220`): the
install run, slot C, slot D, slot E, then the region's band A, band B and
charset runs through `boss_read_run` (`:263`), each run's sectors read by
`sector_reader_read_sectors`; then `boss_head_check` (`:306`) folds the seven
runs against `boss_head_sums_*` for the region (AUD-02) and bounds the module
count; then `boss_install` (`:2826`). Every run is checksummed by the disk
guard's fold (audit-hardening §3); slot A itself by the reader's run read.

| Run | Sectors | Destination |
| --- | ---: | --- |
| theme | 2 | `$7990` |
| boss code (slot A) | 16 | `$6DE8` |
| install | 3 | `$7810` |
| slot C | 13 | `$1000` |
| slot D | 14 | `$1900` |
| slot E | 2 | `$4C00` |
| region band A / band B / charset | 3 / 3 / 8 | `$A880` / `$AC80` / `$0C00` |
| **total** | **64** | 245 host frames (**M**) |

The reservation 528–583 holds the shared runs (slot C up to 16, slot D up to
14, slot E up to 4 — a 5-sector slot E run is refused by the build's
reservation check, **M** this session: `.res 300` in slot E → "the boss run
boss-slot-e leaves its reservation"); 632–695 the four regions at 16 each;
**696–720 are free** (25 sectors; the ATR is 720 sectors, 345 used).

### 1.3 The region data and the converter

`scripts/boss-assets.mjs` (formatVersion 2) converts `band.png`,
`cracked.png`, `broken.png`, `open.png`, `extras.png` and `modules.json` into
the four runs and the look tail; `npm run boss:preview -- --region=N` renders
them. Region 1: 13 modules (4 pulse, 1 emitter, 8 plates), K = 19 staged
glyphs, 122 codes, 976 B, look tail 98 B. The bastion fixture
(`assets/graphics/boss-regions/bastion/`, style 2): 6 modules (2 pulse, 1
emitter, 2 plates, the core), K = 21, 896 B (7 sectors), look tail 88 B
(**M**, the converter on both drafts). The charset's fixed overhead per
region: 7 divider codes, 4 player-shot codes, 2 hostile-shot codes, spark,
deflection, muzzle, cavity, 3 capped-plate codes, 6 nozzle phases, 2 blasts =
**28 codes**, leaving **100** for the hull and the 3K staged block
(`boss-assets.mjs:265–300`; `docs/level-authoring.md` "The boss").

### 1.4 The lasers, the band and the DLIs, PMG

* The lasers: `laser_tier` (`boss.s:1727`, 1 / 2 / 4 slots by level id, a
  `BOSS_LASER_TIER_OVERRIDE` define on fixture builds), `laser_prepare`,
  `laser_frame` (`:2262`), `laser_publish` from the DLI's phase 0 (`:362`);
  missiles M1 / M2 in `$46`, at most two lasers on (`LASER_MAX_ON`), the
  warning and reload from `boss_def` per difficulty
  (`scripts/level-compiler.mjs:512–571`).
* The band: 8 rows of 64 B with HSCROL and per-row LMS into slot B
  (`boss_apply_pos` `:400`), the drift and the win's shake in `boss_motion`
  (`:439`); the DLI (`:344`): phase 0 on the HUD's last line (CHBASE `$0C`,
  the band's palette, the lasers' HPOS), phase 1 on the band's last line
  (the gameplay charset and palette back, next frame's HSCROL / LMS), phase 2
  the HUD's (`gameplay_dli_sync_hud`). The display list is rebuilt by the
  install (`:2865–2893`): `$54` rows for the band, `$D4` on its last row,
  `$44` ring rows, `$C4` on the ring's last.
* PMG in the boss sector (boss-lasers §1.6): P0 the ship, **P1 / P2 free
  (`COLPM1/2` = `$44`, `HPOSP1/2` 0)**, P3 the capsule, M1 / M2 the lasers,
  M0 / M3 free, PRIOR `$00` never written, `GRACTL` 3, `DMACTL` `$3E` (PMG
  DMA already on every frame). Missile and player DMA cost nothing extra.

### 1.5 The boss's per-frame work and its worst frames

UPDATE is `boss_update` (`boss.s:492`): the player's cooldown, the frame's
timers, `laser_frame`, the shot loop (`boss_shot_admit`, `boss_hit`), the C
tick, `laser_first_shot`, `boss_open_looks`, `boss_fire`, one chain blast,
one queued module draw (deferred on a kill or an exposure frame), the
nozzles. SECTOR_COMPLETION draws the shots' band cells (`boss_shots_late`,
slot E). The stress test composes DLI ×3 + UPDATE + COMPLETION + MOTION on
synthetic kill frames; its worst reads **8,434** of 8,500 on the tier-4
fixture's warning sweep, 7,732 reachable (m5 §1 note). The real worst boss
frame has **8,650** of fence margin (§0.2). A native cycle of boss work costs
**2.0–2.4** of margin (boss-lasers §5.2, **M**).

### 1.6 The Light escort in a boss sector

The compiler admits **one Light and no Heavy** in a boss sector
(`level-compiler.mjs:163`, `:661–665`); a boss-sector wave must arm on row 0
(`:759`); the install arms the sector's first wave once the boss is in
(`boss.s:2962–2967` → `_director_c_try_event`); the Director's row tick
returns in a boss sector (`director.c:594`). A Light wave hands its `count`
members to the window's stepper, **one admission attempt a frame, one member
every `spacing` frames (floor 16)**, under the sector's Light ceiling
(`director.c:298–349`): with `lights: 1` a count-N wave is **a stream of N
Lights one at a time**, the next admitted once the slot is free and the
spacing has elapsed. Region 1 authors none (`assets/levels/level-01.json`
sector 6).

### 1.7 The HUD and its rebuild sites (owner's smoke: the booster bar)

| Site | What it redraws | Booster cells (30–39) | Source |
| --- | --- | --- | --- |
| `start_gameplay` | `init_screen`, score, status (lives, hull) | n/a: the booster is released at teardown | `src/main.s:2643–2644` |
| `respawn_player` | status | restored by `weapon_booster_release` on the life lost (`restore_weapon_booster_hud`) | `:8127`; `:10467–10477` |
| the lethal tail of `apply_player_damage` | status | same | `:8222–8224` |
| pause / resume | the whole screen from the 960-B backup | kept | `:2830–2935` |
| **the boss install** | **the whole HUD row from `hud_ascii`**, then score and status | **lost**: `show_weapon_booster_hud` is not called, and the per-frame `update_weapon_booster_hud` (`:8256`) only blanks a cell at each quarter boundary and blinks the last one — so an active booster's label and cells stay blank until it expires, exactly the owner's finding | `src/hybrid/boss.s:2873–2885` |
| the capital entry | nothing (no screen rebuild) | kept | `c-asm-abi.s` (no HUD write) |
| after the summary | `start_gameplay` | n/a | — |

The fix is one site: after the install's `update_hud_status`, if
`ENTITY_STATE+WEAPON_BOOSTER_SLOT` ≠ 0, redraw the label and cells
(`show_weapon_booster_hud`, 34 B) and blank the quarters already spent
(the 16-bit timer against `HUD_BOOSTER_*` thresholds, ~25 B **IC**). Lives,
score and hull are redrawn at every site above; the weapon label is the
booster's.

### 1.8 The target machine today

Every launcher passes `-xe` (130XE, 128 KB): `scripts/runtime-wall-trace.mjs`
(4 sites: `:2661`, `:3396`, `:4245`, `:8015`), `scripts/capacity-window-watch.mjs:234`,
`scripts/artifact-launch.mjs:111`; the documented commands in
`docs/hardware-testing.md` (12 lines) and `docs/level-data-howto.md:164`. The
game writes PORTB **once**: `disable_basic_rom` (`src/main.s:1565–1567`,
`lda PORTB / ora #$02 / sta PORTB`), which preserves bits 0, 4, 5 and 7. The
trace header snapshots `PIA_PORTB` (`scripts/atari800-wall-trace.h:1570`).

---

## 2. Measurements (this session)

Probe builds: `node scripts/build.mjs --level=1:sector=6` into
`build/level-1-s6/` (the game entered at level 1's boss sector) and
`--level=2` into `build/level-2-s0/`; focused trace runs
`node scripts/runtime-wall-trace.mjs --artifacts=build/level-1-s6
--only-session=<id> --atari800-source=build/atari800-trace`; native figures
from the 6502 harness (`tests/boss-harness.mjs`) on the default build's bytes
with scratch probes assembled by the repository's ca65/ld65. Every source edit
was reverted and both variant directories rebuilt from clean sources before
the commit; `git diff -- src cfg scripts assets` was empty at each commit.

### 2.1 The boss entry per sector (M, EMULATOR)

Slot E padded with `.res` after its last routine (`src/hybrid/boss.s:2430`),
so its run grows by whole sectors; session
`director-complete-1-natural-sweep-fire0` on the `level-1-s6` route (the
entry is its first frame):

| Slot E code | Slot E sectors | Entry sectors | Entry host frames | Δ |
| ---: | ---: | ---: | ---: | ---: |
| 254 B (as built) | 2 | 64 | **245** | — |
| 264 B (`.res 10`) | 3 | 65 | **249** | +4 |
| 454 B (`.res 200`) | 4 | 66 | **252** | +7 |

**3.5–4.0 host frames per sector** (two added sectors cost 7 frames). So the
`< 250` bound admits **65 sectors** (249) and refuses 66 (252). The torpedo's
two sectors (slot E 2 → 4) then land at 67 ≈ 256–257 against its 260 bound —
**only if S5 leaves every region at 65 sectors or fewer**. A 5-sector slot E
run is refused by the build (the reservation check): slot E's run tops at 4.

### 2.2 An Interceptor escort in the boss sector (M, EMULATOR)

Level 1's boss sector given `archetypes: ["interceptor"], lights: 1,
waves: [{ archetype: "interceptor", count: 8, row: 0 }]` (data only; the
install arms it), session `s41-diag-1` (the sweep bot, MEDIUM, fire delay 2,
lives held, 3,999 boss frames). The stream admitted **8 Interceptors one at a
time**, 714 frames with a Light live (≈ 89 frames each under the bot's fire).

| Boss frames | Rows | Worst fence margin | Mean margin | DMA-on max |
| --- | ---: | ---: | ---: | ---: |
| no Light live | 3,285 | 9,443 (f401) | 16,248 | 28,990 |
| one Interceptor live | 714 | **7,835** (f317) | 14,839 | **29,261** |

An escort costs a boss frame **≈ 1,400 of margin (mean), ≈ 1,600 at the
worst, +271 of DMA-on**; it runs in the window's Light kernel, outside the
boss's own stress sum. Composed with the full run's worst boss frame (8,650):
**≈ 7,000 over GO** (ESTIMATE from M parts), DMA-on ≈ 29,400 of 32,568. The
entry is unchanged (245). A count-N wave with `lights: 1` is already the
"escort that keeps coming" of §4.3: **0 bytes of code**.

### 2.3 A salvo step (M-N)

Region 1's gun-2 made a `salvo` kind (the only armed module), the countdown
at 1, the band at p 32, the harness's post-entry memory:

| Path | Native cycles |
| --- | ---: |
| `_boss_c_tick`, nothing due | 74 |
| `_boss_c_tick` reaching `boss_fire_next` (salvo armed) | 326 (a pulse: 307) |
| `boss_fire`, the burst's shot 1 / 2 / 3 (`offset` −1 / 0 / +1) | 420 / 462 / 495 (a pulse's shot: 420; `boss_fire` with nothing to fire: 13) |
| `_boss_c_tick`, burst step 2 / 3 | 93 / 98 |
| `_boss_c_tick` after the burst | 74 |

**A salvo step is ≈ 95 (tick) + 420–495 (spawn) ≈ 515–590 native on each of
three consecutive frames**; the first frame also pays `boss_fire_next` (326).
A pulse's firing frame pays 307 + 420 = 727 once. The later shots of a burst
cost more because the spawn walks past the burst's earlier, still-occupied
hostile slots.

**Finding (pre-existing, not S5's):** the stress fixture never fires — no
countdown expires on its synthetic kill frames — so a kill frame on which a
weapon also fires (420–495 native, reachable today in region 1) is outside
the 8,434 figure. Reported for the stress composition's owner (§7, Q4).

> **Correction (2026-10-09, S5-1, M-N):** the 326 above was a short walk (the
> probe's cursor next to the salvo gun). `boss_fire_next`'s walk costs ≈ 110
> native **a module walked** (`boss_bit_of` and the mask test each step), and
> in region 1 as shipped only gun-2 is armed when the fight begins with the
> cursor resting on it, so every firing walks all 13 modules: the tick 88 →
> 1,521, and a firing frame costs **+1,902** native (tick +1,433, `boss_fire`
> +469 — the latter as above). The composition with the spawn put region 1 at
> 8,751 reachable / 9,457 worst (`BLOCKED_BOSS_STRESS_SPAWN`,
> [the diagnostic](../diagnostics/s5-1-stress-spawn-blocked.md)). The owner's
> decision (journal §AG): no gun fires on a module-kill frame (the firing moves
> to the next frame) and the walk in ASM at ≈ 24 a module; slot C +4 B. A
> firing frame now costs ≈ +920 with region 1's full walk (the tick 537
> against 88) and ≈ +625 with a one-step walk.

### 2.4 The force field, option (b) — a glyph row under the band, P1 / P2 as the generators (M-N)

A probe written as the production routine would be (`field_prepare`,
`field_frame`, `field_shot`, the row drawn only on a change, the generators'
sprites at `cell × 4 + 33 − p` with the window test, the absorb with a
2-frame cell flash and the absorb tick), assembled at `$4D0A`, run on the
harness's post-entry memory with region 1's plate-a / plate-h as the
generators' stand-ins:

| Item | Value |
| --- | ---: |
| Code | **212 B** + 3 B BSS + a zero-page pair |
| `field_prepare` (once) | 32 |
| `field_frame`, steady (no change) | **103–134** |
| `field_frame` on a change (the 40-cell row redrawn) | **621–653** (twice a fight at most: a generator's death) |
| `field_shot`, a shot flying past the row | 17–34 per live shot |
| `field_shot`, a shot absorbed | **122** (and the band's hit path, ≥ 1,000 on a module hit, is *not* paid for that shot) |
| the DLI | 0: the phase-1 DLI moves from the band's last row to the field's (one `.byte` in the install's list builder) |

### 2.5 The force field, option (c) — P1 / P2 re-triggered across the width in a DLI kernel (M-N)

Each player's HPOS rewritten five times a scanline (quad width: 32 colour
clocks = 16 CPU cycles apart) over N scanlines, after `WSYNC`:

| Lines | Native cycles | Wall time (the WSYNC waits, 114 a line, ESTIMATE) | Code |
| ---: | ---: | ---: | ---: |
| 2 | 155 | ≈ 228 | 67 B |
| 4 | 293 | ≈ 456 | 67 B |
| 8 | 569 | ≈ 912 | 67 B |

The native figure is the stress test's; the wall figure is what the fence
loses on **every** boss frame. The kernel's HPOS stores land between ANTIC 4's
DMA steals on a ring row (40 + 40 cycles of a 114-cycle line on the row's
first line), so the segments' positions depend on cycle-exact timing per line:
**risk 4**, emulator and hardware can disagree. Measured for the record; not
recommended (§4.4).

### 2.6 The finale phase in C (M, `cc65 -Oirs`, `build/level-2-s0/`)

Two probes of the second phase (§4.2) in `src/c/boss.c`: once the last armour
module falls, every weapon fires three-shot volleys at a finale cooldown (the
tables' reserved byte 4), the reload halved.

| Variant | Slot C code | Δ | Sectors |
| --- | ---: | ---: | ---: |
| as built | 1,659 | — | 13 |
| the finale with an armour scan on the kill (16-module loop) | 1,755 | **+96** | 14 |
| the finale with an **armour counter** (O(1) on the kill) | 1,729 | **+70**, BSS +2 | 14 |

The counter version is the one to build: the scan would land ≈ 400 native on
the kill frame, the stress frame. Its per-frame cost is one flag test in
`boss_fire_next` (≈ 15 native, **IC**) and the burst steps of §2.3. **Slot C
crosses its 13-sector boundary at 1,665 B**: the finale needs −65 B of trims
elsewhere in `boss.c` to stay at 13 sectors (§3.3).

### 2.7 Where a per-region block can live (M from the maps, the listings and the source)

| Candidate | Room | Verdict |
| --- | ---: | --- |
| slot E's free 110 B (after the 200-B reserve) | 110 | too small for region 3 (≈ 335 B); a 3-sector slot E costs +1 entry sector |
| slot D's head (the look tail's place) | 9 … 107 | slot D is 1,597 + BSS 88 after the tail leaves; a fixed 256-B head would overflow it by 149 B |
| `BROADSIDE`'s tail after slot A, `$75E8–$780C` (549 B) | 549 | **not capital-only**: `wait_for_master_pal_frame` (`$768A`), `free_broadside_slot`, `light_add_score` (`$77A1`), the debris release, the Heavy renderer's tables live there (the labels at `$75E8–$780D`); overlaying it needs the second regrouping (risk 3–4) |
| the arena `$7BD0–$7F0F` (Heavy C, 797 B of code idle without a Heavy) | ≈ 800 | the boss's exit calls `heavy_publish_hull_colour` there (`scripts/build.mjs:2753`); a restore run (+7 sectors at START GAME after a boss) and an exec-watch proof: risk 3 |
| the install staging `$7810–$798F` after the install ran | 352 | the pause backup (`$7810–$7BCF`, 960 B) overwrites it on a pause in the boss sector |
| **the HUD charset's upper half `$5200–$53FF`** | **512** | `copy_hud_charset` (`src/main.s:3520–3561`, called once at start-up, `:11583`) clears all 1,024 B and fills codes 0–58 only (digits 16–25, letters 33–58, the status glyphs 5–12, space 0); the HUD row shows nothing above code 58 (`hud_ascii`, `hud_booster_label`, `CH_HUD_*`), so ANTIC never fetches `$51D8–$53FF`; no other link, cfg area or boot range names it after boot (the loader bitmap over `$5000–$5E0F` is the boot loader's, before `copy_hud_charset`); the summary screen draws at `$4000` (`SUMMARY_SCREEN`), its art stages at `$7810`. **Recommended: slot F**, 512 B, read at the boss entry, **no restore** (nothing reads it; the next session's start-up rewrites it) |

The proof the implementation owes for slot F is the one `$1900–$1FFF` got
(boss-lasers §3.2): a native write-watch over `$5200–$53FF` from `start`
through boot, menu, START GAME, a level with its capital, the boss entry and
fight, the summary, a game over and RESET — 0 writes outside the entry's
read — plus a static test that no HUD write emits a code ≥ 64.

---

## 3. Ledgers

### 3.1 The boss slots, resident versus per-region overlay

Bytes after S5, per slot. "S5-1 … S5-5" are the sessions of §6. **IC** unless
marked; the finale and the field are **M** (§2.6, §2.4).

| Slot (capacity) | Today used / free | S5 items | After S5 (expected → budgeted) | Free after |
| --- | ---: | --- | ---: | ---: |
| A (2,048; 16 sectors) | 2,042 / 6 | the head's 4th run per region (+20: four 5-B entries) and the check's index for a 20-B stride (+6); `boss_module_scored` moved to slot D (−50); the region hooks: `jsr region_frame` in UPDATE and a flag-gated `jsr region_shot` in the shot loop (+8 → +12) | **2,026 → 2,030** | 22 → 18 |
| install (384; 3) | 352 / 32 | the booster cells put back after the HUD rewrite (+14, §4.7); `jsr region_init` (+3) | 369 | 15 |
| C (2,048; 13) | 1,659 code + 221 BSS / 168 | the finale **+70 (M)**, BSS +2; trims **−65 (target)** so the run stays 13 sectors | 1,729 → 1,664 code | 96 → 161 (BSS 223) |
| scratch (256) | 244 / 12 | the 10 HUD booster cells' backup (+10) | 254 | 2 |
| D (1,792; 14 → 13) | 98 tail + 1,597 code + 88 BSS / 9 | the look tail leaves (−98); `boss_module_scored` arrives (+50) | 1,647 code + 88 BSS | 57 (17 to the 13-sector boundary) |
| E (576; 2) | 254 + 12 BSS / 310 | nothing (the 200-B torpedo reserve kept; 110 unassigned) | 254 | 310 (110 after the reserve) |
| **F, new** (`$5200–$53FF`, 512; per region) | — | region 1's block: the look tail 98; region 2: ≈ 100 (G); **region 3: tail ≈ 100 + the field 212 (M) + hooks 20 = ≈ 335 → 400 (G ×1.2)**; region 4: ≈ 110 (G) | per region | 512 − block |
| window (`$AE00`) | 1,022 free | the booster cells backed up before the WARNING screen (+14) | — | 1,008 |
| charset (1,024; ≤ 8 per region) | R1 976 / 48, 122 codes | per region ≤ 128 codes (§3.5) | per region | — |

The torpedo's 200 B of slot E are untouched by every row. No initial-block
byte moves (nothing resident but the window's 14 B).

### 3.2 The boss entry per region (sectors and host frames)

3.5–4.0 host frames a sector (§2.1); the bound `< 250` admits 65 sectors.

| Run | Today | After S5: R1 | R2 | R3 | R4 | Basis |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| theme | 2 | 2 | 2 | 2 | 2 | fixed |
| boss code (A) | 16 | 16 | 16 | 16 | 16 | 2,030 ≤ 2,048 |
| install | 3 | 3 | 3 | 3 | 3 | 369 ≤ 384 |
| slot C | 13 | **14 → 13** | 14 → 13 | 14 → 13 | 14 → 13 | 1,729 (M) → 1,664 with the trims |
| slot D | 14 | **13** | 13 | 13 | 13 | 1,647 ≤ 1,664 |
| slot E | 2 | 2 | 2 | 2 | 2 | 254 |
| band A + B | 6 | 6 | 6 | 6 | 6 | fixed |
| charset | 8 | 8 | 7 → 8 | **7 (target)** → 8 | 8 | §3.5 |
| **region block (F)** | — | **1** | 1 | **3 → 2** | 1 | §3.1 |
| **total** | **64** | **65 → 64** | 65 → 63 | **67 → 64** | **65 → 64** | |
| host frames (M slope) | 245 | 249 → 245 | 249 → 241 | **256 → 245** | 249 → 245 | |
| with the torpedo (+2) | — | 256 → 252 | 256 → 248 | **263 → 252** | 256 → 252 | bound 260 (M6) |

**The target for every region is ≤ 65 sectors after S5** (the 250 bound now
and the torpedo's 260 later). Region 3 reaches it with two of three levers,
each worth one sector: (L1) the finale fitted into slot C's 13 sectors (−65 B
of trims in `boss.c`); (L2) region 3's charset ≤ 112 codes (896 B, 7
sectors) — a design constraint on its placeholder art; (L3) region 3's block
≤ 256 B (the field ≤ ≈ 150 B with its tail ≤ ≈ 106 B — the probe is 212 B
unoptimised). Without L1 every region is at 65 and region 3 at 67: **STOP
in S5-3 if region 3 exceeds 65 sectors** (§6), and the question goes to the
owner with the measured basis (§7 Q7).

### 3.3 Boss work per region against the limits

| Region | Added work on the worst frames | Stress (native, fixture) | Fence margin basis | Verdict |
| --- | --- | ---: | ---: | --- |
| R1 (no change but the hooks) | `jsr region_frame` + `rts` 12; the shot hook gated by a block flag 7 × ≤ 5 shots = 35 | 8,434 + ≈ 47 = **8,481** of 8,500 | 8,650 − ≈ 110 | fits; 19 left |
| R2 (the escort) | the Light kernel in the window (not in the stress sum): −1,400 … −1,600 of margin, +271 DMA-on (M §2.2) | 8,481 | ≈ 7,000 over GO; DMA-on ≈ 29,400 | fits |
| R3 (the field, tiers 2 and **4 on level 9**) | `field_frame` 103–134 (M); an absorbed shot 122 instead of a band hit; the row redraw 621–653 twice a fight (deferrable to a non-kill frame) | at tier 4: 8,481 + 134 + 122 = **≈ 8,740** | 8,650 − ≈ 600 ≈ 8,050 over GO | **over the 8,500 proxy by ≈ 240 while ≈ 8,000 over the real fence**: owner question Q4 (a limit of 8,750 for region 3's tier-4 fixture, or the field's frame work deferred on kill frames) |
| R4 (salvo launchers, the finale, tier 4) | a burst step 515–590 on three frames (M §2.3) against a pulse's 727 on one; the finale's test ≈ 15; a kill frame coinciding with a spawn is the pre-existing gap of §2.3 | 8,481 (+ 495 if the composition adds the spawn: 8,976, as today's R1 would) | 8,650 − ≈ 1,300 ≈ 7,350 over GO | fits the fence; the composition question is Q4's |

DMA-on never moves above 29,400 on any boss frame (the band's DMA is the
same; the escort is pre-fence work); the 32,568 gate is far.

> **Correction (2026-10-09, S5-1, M-N):** the "+ 495 if the composition adds
> the spawn: 8,976" of R4's row was low — the spawn frame cost +1,902 with the
> walk of §2.3's correction (region 1 8,751 reachable, the fixture 9,393). After
> the owner's decision (journal §AG: no firing on a kill frame, the cheap walk,
> **the 8,500 limit gating the reachable cases**, at most two boss hits a
> frame) the stress with the spawn reads **6,895** (region 1), **7,744** /
> **6,954** (the tier-4 fixture, lasers warn / beam), worst on the meeting
> frame in every layout; the held spawn's frame is cheaper. These, not 8,434,
> are the bases the rows above start from (the hooks and the field still add
> their own).

### 3.4 Disk sectors

| Range | Today | After S5 |
| --- | --- | --- |
| 528–583 shared boss runs | A 528–543, install 544–546, C 547–559 (≤ 16 reserved to 562), D 563–576, E 577–578 (≤ 4 to 581) | C 13–14, **D 13**, E 2; 582–583 spare |
| 632–695 regions (16 each) | R1 632–647 (16 of 16) | R1 16; R2 15–16; R3 15–16; R4 16 |
| **696–711 region blocks (new, 4 each)** | free | R1 1, R2 1, R3 2–3, R4 1 (each padded to its 4-sector slot) |
| 712–720 | free | free (9) |
| ATR used | 345 of 720 | ≈ 345 + 48 (regions 2–4) + 6 (blocks) − 1 (D) = **≈ 398** |

### 3.5 Charset codes per region

Fixed overhead 28 codes (§1.3); the staged block is 3K for K distinct staged
glyphs; the rest is hull art and bays.

| Region | Style, layers, modules | K | Staged | Hull and bays | Total | Sectors |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| R1 Blockade Breaker (M) | 1, 2 layers, 13 | 19 | 57 | 37 | **122** | 8 |
| R2 the Bastion grown (G) | 2, core + cover group, ≈ 10 | ≤ 22 | ≤ 66 | ≤ 30 | ≤ 124 | 7–8 |
| R3 Siege Spine (G, **constraint L2**) | 1, 3 layers, ≤ 14 | ≤ 22 | ≤ 66 | ≤ 16 + 2 field codes | **≤ 112** | **7** |
| R4 Void Citadel (G) | 1, 4 layers, 16 | ≤ 26 | ≤ 78 | ≤ 22 | ≤ 128 | 8 |

The rule that already holds region 1 inside 128 — every plate of a size
shares one cracked and one broken look — is what keeps K at these values;
the converter refuses a layout over 128 codes, so a draft that overflows is
caught at `npm run boss:preview`.

### 3.6 Fight length per region (ESTIMATE; tuned by data in each session, reported E / M / H)

| Region | Driver | Expected on MEDIUM | How it is tuned |
| --- | --- | ---: | --- |
| R1 | as built (M 92.2 s) | 92 s | unchanged (the finale off, Q6) |
| R2 | the Bastion's HP sum (its 6-module fixture ≈ 60 HP → grown to ≈ 10 modules ≈ 200 HP) + the escort's pressure | 90–120 s | `modules.json` HP, `hpScale`, the stream's count and spacing |
| R3 | the field: shots into a live half are wasted until its generator falls (+15–30 %, G) | 90–120 s | the generators' HP, the plates' HP |
| R4 | 4 layers, 16 modules, the finale's volleys (dodging, not HP) | 90–120 s | HP, `finaleCooldown`; the torpedo (M6) takes 15–30 % back and is rebalanced then |

---

## 4. The design

### 4.1 Per-region overlays: slot F and the region block

**The block.** Each region's run on the disk gains a fourth item, the
**region block**: its look tail (today 98 B of slot D's head) followed by its
region code and that code's BSS. It is read by the head as the region's
fourth run into **slot F, `$5200–$53FF`** (§2.7), checksummed with the
region's other runs by the head's fold (eight runs, `boss-sums.inc`), and
starts with a 9-byte jump table — `init` (from the install, after
`boss_prepare`), `frame` (from UPDATE, after the controller's tick), `shot`
(from the shot loop, before the band test, X = the slot, C = absorbed) — plus
one flag byte (bit 7: the block has a shot hook; bit 6: the field row is on,
for the install's display-list builder). A region without code has an `rts`
at each entry and a zero flag; slot A's shot hook is gated by bit 7 so R1,
R2 and R4 pay ≈ 7 cycles a shot, not a call (§3.3). The look tail's
address, which `boss_shots_prepare` reads from the tables (`BOSS_T_LOOK_TAIL`,
`boss-assets.mjs:124`), becomes `$5200 + 10` for every region: the converter
writes it, no code changes.

**Why slot F and not a bigger shared slot.** The owner's requirement is
that only the current region's code be resident; every shared slot is at a
sector boundary (§3.2) and the only resident-RAM home that is dead in a boss
sector, needs no restore and crosses no other link's page is the HUD
charset's unused upper half. The alternatives are priced in §2.7.

**What moves to make room in slot A.** The head's table grows by four 5-B
entries (+20) and the check's region index changes from the 15-B stride's
top nibble to a 20-B stride (+6); `boss_module_scored` (50 B, kill-time)
moves to slot D's 67-B slack after the look tail leaves, so slot A ends at
≈ 2,030 (§3.1). Slot D's run falls to 13 sectors.

**The HUD booster cells (owner's smoke).** The resident entry half backs
the ten cells `$401E–$4027` up into the scratch page's free 10 B before the
WARNING screen blanks the row (+14 B window); the install copies them back
after its HUD rewrite (+14 B install). Exact, no booster logic duplicated;
the backing `hud_booster_backing` keeps the pre-booster cells as before, so
the release still restores the plain HUD. A native test runs the entry with
a booster at three quarters and compares the ten cells; a trace clause
compares the HUD row before and after every boss entry (§6, S5-1).

### 4.2 The second phase: the finale (decision B, every region, data-switched)

When the last **armour** module falls — the plates are the visible progress,
and the boss still falls on its last weapon (the decision in force) — the
controller enters the finale: every surviving weapon fires **three-shot
volleys** (the salvo kind's burst, which exists) at half its reload, the
countdown's floor stepped from `fire.cooldown` to `fire.finaleCooldown`
(the tables' reserved byte 4; 0 = no finale). C in slot C, O(1) on the
kill through an armour counter (§2.6: +70 B, BSS +2, ≈ 15 native a firing
frame, the burst steps 515–590 on three frames). The compiler takes
`fire.finaleCooldown` from `modules.json`; region 1 keeps 0 unless the owner
turns it on (Q6). The trace sees it: after the last armour kill the hostile
pool shows three spawns on three consecutive frames and the countdown's
floor; the stress test composes a burst step on a kill frame.

### 4.3 Region 2: the Bastion with an Interceptor escort

Style 2 (the S3 core boss rebuilt as a layout: the core behind a cover
group of guns, `assets/graphics/boss-regions/bastion/`), **grown** from the
fixture's 6 modules to ≈ 10 (the core, two emitter slots for tiers 1–2, four
pulse guns, three to four plates) so its HP sum reaches the 90–120 s target;
the fixture's hull under its right plate is redrawn (owner's note; decision
O's rule for weapons is already enforced by the converter, plates are the
owner's call). **The escort is data:** the boss sector authors
`archetypes: ["interceptor"], lights: 1` and one wave
`{ archetype: "interceptor", count: N, spacing: S, row: 0 }`; the kernel
admits one at a time, the next S frames after the slot frees (§1.6, §2.2):
an escort that keeps coming for N lives. Recommended N 6, S 100 (two seconds
between escorts; M8 tunes). **0 bytes of code**, −1,400 … −1,600 of margin
while it lives (§2.2). Region 2's block is its look tail only.

### 4.4 Region 3: Siege Spine with the force field (option (b) recommended)

Style 1, three layers, ≤ 14 modules, two emitter slots (levels 7–8) and
four (level 9), ≤ 112 charset codes (L2). **Two generators** are armour-like
modules (kind `armour`, their own art) at the boss's ends, drifting with the
band as every module does; each powers its half of the field. **The field**
is a row of two region-charset glyphs (the field, its flash) drawn in ring
row 8 — the first row under the band, shown under the band's CHBASE because
the phase-1 DLI moves one row down for a region whose block flag says so —
the left 20 cells while the left generator stands, the right 20 while the
right one does; **P1 and P2** are the generators' glow sprites (8 scanlines,
quad width, `COLPM1/2` the region's field colour) at the generators'
columns, following the drift through the window test; destroying both
switches the field off for good (the row cleared, the sprites hidden). **A
player shot entering the field row over a live half is absorbed**: freed,
the cell it struck flashed two frames, the absorb tick (no damage, not a hit
for accuracy, as a covered module); the lasers, the boss's shots and the
player pass through. Cost: 212 B of block code (M, unoptimised; L3 aims at
≈ 150), 103–134 native a frame, 122 an absorbed shot, 0 on the DLI (§2.4).
Alternatives for the owner (Q2): (a) P1 / P2 alone as two 32-clock field
segments beside the generators (≈ 60 B, ≈ 40 native; the field covers 64 of
160 colour clocks, not each half); (c) the full-width P1 / P2 line kernel
(§2.5: 293 native + ≈ 456 wall a frame, risk 4).

### 4.5 Region 4: Void Citadel, everything together

Style 1, four layers, 16 modules, four emitter slots (levels 10–12 are tier
4), **salvo launchers** (the engine's kind) in the deepest layer, the finale
on (`finaleCooldown` set), the densest hull inside 128 codes (§3.5). No
region code: its block is its look tail. It is the stress composition's
worst case: four lasers held, a burst step and a kill on one frame (§3.3).

### 4.6 Bastion versus fortress per region (recommendation, Q1)

| Region | Recommended | Why | Alternative |
| --- | --- | --- | --- |
| R1 | Blockade Breaker, fortress (built) | decision H | — |
| R2 | **the Bastion, style 2** | the teaching contrast after a fortress (a core the player must unmask), the engine's second style gets a shipping region, the escort gives it the pressure its small layout lacks | Siege Spine here and the Bastion in R3 |
| R3 | **Siege Spine, fortress, 3 layers** | the field needs ends to hang its generators on and layers for the fight behind it | the Bastion with the field (the core behind a field reads well too; its 6–10 modules make a shorter fight) |
| R4 | **Void Citadel, fortress, 4 layers** | decision E / Q-B1: the final boss with the salvo launchers | — |

Both mappings cost the same bytes and sectors (regions are data); the choice
is the owner's.

### 4.7 The target machine and the HUD audit (session 1)

* `-xe` → `-xl` at every launcher, harness run, boot smoke, capture and
  documented command (§1.8); **one boot-smoke session stays on `-xe`** as the
  130XE compatibility check (named in the boot smoke's session table).
* `tests/portb-writes.test.mjs`: every listing of every link holds exactly
  one store to `$D301` / `PORTB`, and that routine run natively with PORTB =
  `$FD` and `$B1` keeps bits 0, 4, 5 and 7 and sets bit 1. The session proves
  it RED on a planted write (`and #$EF` before the store, reverted) and GREEN
  on the tree.
* The regenerated trace is compared with the previous evidence **replay by
  replay**: every non-entry frame of every replay identical (the block's
  extra sector and slot D's lost sector cancel for region 1: 64 sectors
  either way), the HUD row restored after every entry; every difference
  explained in the session's record.
* The HUD audit of §1.7 is applied at its one failing site (§4.1).

---

## 5. Debug routes and fixtures (regions 2–4 have no level data)

The region comes from the level id (`min(3, (id − 1) / 3)`) in both the
window's entry half and the boss head, and so does the laser tier. A new
build flag **`--boss-region=N`** (2–4; composable with `--level=1:sector=M`
and `--laser-fixture=T`) patches the level image's id to the region's
**first level (4 / 7 / 10)** at the debug start, so the region, its theme,
the summary's region art, the hull style and the laser tier (1 / 2 / 4)
follow together; `--laser-fixture=4 --boss-region=3` is region 3's level-9
case. Variant directories `build/boss-region-N-level-1-s6/` (entered at the
boss sector) and `build/boss-region-N-level-1-s5/` (elite (b) → the boss,
for the entry from a live sector); `scripts/trace-artifacts.mjs`'s
`DEBUG_ROUTE_VARIANT` admits the names.

**Trace sessions (debug route only, like the laser fixture's; a default run
is unchanged):** `region-N-diag-{0,1,2}` (the sweep bot, fire delay 2, lives
held, 5,000 frames) and `region-N-dodge-2` (policy `laser-dodge`, HARD).
The natural-sweep bot does not finish a fight on the `s6` route inside
15,000 frames (**M** this session, region 1): the region sessions use the
sweep-with-fire policy the S4b.1 diagnostics used, which reaches every
emitter's warning and beam in 4,000 frames.

**Clauses (each with its subject):** the entry ≤ 65 sectors and < 250 host
frames (subject: the session's one entry); the fight reaches the chain
(`boss_state` ≥ 3) on MEDIUM inside the budget (subject: the diag-1
session); no debris on the entry (the existing clause); region 2: a Light
live on ≥ 1 frame, never 2 at once, the stream's admissions ≥ 2 (subject: the
Light-live frames); region 3: a shot freed in the field row over a live half
≥ 1 time and 0 band hits in that half while its generator stands, the field
row's cells cleared on the frame after both generators fall (subject: the
field-live frames); region 4: a burst (three hostile spawns on three
consecutive frames) ≥ 1, the finale's floor after the last armour kill
(subject: the firing frames); every region: the stress fixture at its tier
under the limit in force (`tests/boss-stress.test.mjs`, a region parameter).

**For the owner's smoke:** copies of the review ATRs in `build/play/`
(`hardware-testing.md` §12's rule), one per region at `s6` and at `s5`,
plus the default ATR for region 1; the comparison builds of §6 where a
visual choice is open. When M7 authors levels 4, 7 and 10 the routes become
`--level=N:sector=…`; the flag stays as the fixtures' route.

---

## 6. The sessions

Each on its own branch from `main`, one at a time, each leaving the game
shippable, ordered by risk (the platform and the evidence first, then the
region with hardware-sensitive code, then the stress worst case, then the
data region). Every session: `npm test` on the default build, the focused
set with `tests/runtime-evidence-binding.test.mjs`, the evidence regenerated
when the artifacts move, `docs/memory-map.md` and STATUS updated, the free
tails stated in the commit, `git diff -- src cfg scripts assets` empty of
probes.

| # | Branch | Scope | Bytes (slot / record) | Entry | Boss work and margins | STOP | Tests and clauses | Evidence | Owner smoke |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| **S5-1** | `chore/s5-platform` | §4.7: `-xl` everywhere, the PORTB test, one `-xe` boot-smoke session; the HUD booster cells (§4.1); **slot F** and the region block (the look tail out of slot D into region 1's block, the head's 4th run, `boss_module_scored` → slot D, the fold over 8 runs, the memory map's claim); **regions 2–4 on the disk as copies of region 1** (placeholders the later sessions replace) so the 4-region disk layout, the `--boss-region=N` routes and sessions, and the per-region entry ledger are real; the slot F write-watch proof; **the stress composition gains a weapon's spawn on the kill frame (Q4) and region 1 is measured with it first**; **the HUD audit of every field (booster, lives, score, weapon, hull) at every rebuild (boss entry, capital, after a death, after the summary), any other missing redraw fixed the same way (Q8)** | A 2,042 → ≈ 2,030; D 1,695 → 1,647 (13 sectors); scratch +10; install +17; window −14 (1,008); block R1 98 B; disk +48 (regions 2–4) +4 (blocks) | **64** (R1: D −1, block +1) → 245 | +≈ 47 native on the stress frame (the hooks) → ≈ 8,481; fence −≈ 110 on boss frames | entry > 65 sectors; slot A > 2,048; a writer of `$5200–$53FF` outside the entry; a non-entry frame differing from the previous evidence; a HUD cell differing after any rebuild; the PORTB test not RED on the plant; **region 1 over 8,500 native with the spawn in the composition → STOP and report with the frames (Q4)** | build: the block's layout, the fold, the directory, the claim; 6502: the entry with a booster at three quarters, the PORTB routine, the head reading 8 runs, **the stress test's composition with a spawn on the kill frame on region 1**; trace: the HUD-row clause (subject: 12 entries), the regenerated run compared replay by replay | regenerated on `-xl` (the whole trace, boot smoke, menu raster, media) | the booster bar intact through a boss entry on the default ATR; the game on a 65XE-class machine as before; **no visible change otherwise** |
| **S5-2** | `feat/boss-finale` | §4.2 in slot C with the −65 B trim target; `fire.finaleCooldown` through the compiler; the stress composition (with the spawn since S5-1) gains a burst step on a kill frame | C 1,659 → 1,729 → ≤ 1,664 with the trims (13 sectors) else 14 | 64 (R1) or 65 if slot C is 14 | +≈ 15 native a firing frame; a burst step 515–590 (M) | slot C at 14 sectors **and** region 3's ledger (§3.2) then over 65 → owner (Q7); the stress over the limit in force | 6502: the counter, the floor, the volley on the frame after the last armour kill, nothing on the last weapon; trace: on a fixture with `finaleCooldown` set (region 1's data in a review build), three spawns on three frames after the last armour kill (subject: ≥ 1 finale) | regenerated only if region 1's default data changes (Q6: no) | a review ATR with region 1's finale on, against the default (comparison build): does the finale read as a last stand? |
| **S5-3** | `feat/boss-region-3` | §4.4: Siege Spine's placeholder art (≤ 112 codes), the generators, the field (block code), the DLI row move, P1 / P2 glow, the clauses, the region-3 stress fixture at tiers 2 and 4 with **its own pin at 8,750 (Q4)**; **a comparison build of the field as (a) for the owner's smoke, before the choice of (b) is final (Q2) — a deliverable of this session** | block ≈ 335 → 400 of 512; charset ≤ 896 | **≤ 65** (target 64–65 with L2 + L3; **over 65: STOP and ask, the bound is not raised, Q7**) | tier 4: ≈ 8,740 native on the stress frame against the 8,750 pin; ≈ 8,050 over GO on the fence | entry > 65 sectors; the tier-4 fixture over 8,750; a seam in the field row or the sprites on hardware (owner) | 6502: the absorb, the pass-through for lasers and boss shots, the halves, the switch-off, the DLI's row; trace: the field clauses of §5 (subject: field-live frames) | the region-3 debug sessions (no default change) | **comparison builds**: the field as (b) and as (a) (§4.4, Q2: the choice is final only after this smoke); the generators' glow colour (two options) |
| **S5-4** | `feat/boss-region-4` | §4.5: Void Citadel's art, 16 modules, salvo launchers, the finale on, tier 4; the worst-case stress composition | block ≈ 110; charset ≤ 1,024 | 65 | a burst step on a kill frame with four lasers held | entry > 65; the stress over the limit | 6502: the layout's cover graph, the launchers' bursts; trace: the region-4 clauses | the region-4 debug sessions | the final boss's silhouette; the volleys' dodgeability on HARD |
| **S5-5** | `feat/boss-region-2` | §4.3: the Bastion grown (≈ 10 modules), its art corrected, the escort stream as data, the escort clause; **`v0.3.0` prep**: README EN + PL, `hardware-testing.md` §21 (the four regions' smoke), the release checklist | block ≈ 100; charset ≤ 1,024 | 64–65 | the escort −1,400 … −1,600 of margin, +271 DMA-on (M) | entry > 65; two Lights live on one frame | 6502: the stream's admission under `lights: 1`; trace: the region-2 clauses | the region-2 debug sessions | the escort's cadence (two comparison data builds: N 6 / S 100 and N 4 / S 200); the Bastion's look |

Projected at the end of S5 (expected → budgeted): worst fence margin
**1,447 unchanged** (no fighter-row work); DMA-on 31,304 unchanged; boss
frames' worst margin ≈ 8,540 (R1, the hooks) … ≈ 7,000 (R2 with the escort);
the stress 8,481 (R1 / R2 / R4), region 3 at tier 4 ≈ 8,740 under the Q4
limit; boss entry **64 / 64 / 65 / 65 sectors** → 245 / 245 / 249 / 249 host
frames (R1 / R2 / R3 / R4; region 3 at 67 → 256 if L1–L3 all fail); slot E's
200-B reserve intact (310 free); initial block 13,618 unchanged; window
1,008 free; ATR menu frame 553 unchanged (no transport record moves); ATR
≈ 398 of 720 sectors; `npm test`'s recorded set unchanged (the `preview`
record stays).

### 6.1 S5-1 as built (2026-10-09, `chore/s5-platform`) — `OWNER-SMOKE CANDIDATE`

**Implemented, pending the owner's smoke** (hardware-testing §21). ATR
`67d95ed878f008bf2e559a0688c0093556d475986097c6622b0c10d0a190414c`, boot
`6d946eade3b465076ae900e90212bcddae6e4fcd6779af04ba23f39b8f0b088e`.

**The stress composition (Q4, measured first).** With a weapon's spawn on the
meeting frame region 1 measured **8,751** reachable / 9,457 worst against 8,500
— `BLOCKED_BOSS_STRESS_SPAWN` ([the diagnostic](../diagnostics/s5-1-stress-spawn-blocked.md)).
The owner's decision (journal §AG): (B) no gun fires on a module-kill frame,
(A) the next-gun walk at ≈ 20 a module, the 8,500 limit gating the reachable
cases (≤ 2 boss hits a frame). As built: region 1 **6,895**, the tier-4 fixture
**7,744** / **6,954** (warn / beam); slot C 1,659 → 1,663 B (13 sectors); 0
frames with a kill and a spawn.

**The target machine.** `scripts/atari800-machine.mjs` holds `-xl` (the target)
and `-xe` (the 130XE); every launch takes them (`tests/target-machine.test.mjs`
refuses a literal flag elsewhere); the boot smoke's seventh session
`atr-a5-130xe` is the one 130XE boot. The trace on `-xl`: 45 of 57 replays
byte-identical to `main`'s evidence, frame by frame — the machine switch moved
nothing.

**PORTB.** One write in `src/` (`disable_basic_rom`, `src/main.s:1567`,
`PORTB | $02`, boot stage 2 with the OS ROM mapped) and four PBCTL writes
(`sector-reader.s:729` `$34`, `:764`, `:769`, `:1103` `$3C`, bit 2 kept), all
safe (`tests/portb-writes.test.mjs`, RED on an in-tree plant).

**The HUD audit (Q8).** Every field at every screen rebuild, native
(`tests/hud-audit.test.mjs`) and by the trace's writer inventory of
`$4000-$4027` (`coverage.hud_row_writers`):

| Rebuild | Score 6-10 | Lives 18 | Hull 25-28 | Booster / weapon 30-39 | Before S5-1 | How it is redrawn |
| --- | --- | --- | --- | --- | --- | --- |
| Boss entry | ok | ok | ok | **blank until the booster expired** | defect (the owner's smoke) | **fixed**: the ten cells backed up before the WARNING screen, put back by the install after its HUD rewrite; RED on `main` for Rapid, Spread and Shield |
| The capital entry | ok | ok | ok | ok | no rebuild | nothing writes the HUD row there but the field routines (the inventory) |
| A death and the respawn | ok | ok | ok | ok (released to the plain HUD) | correct | `update_hud_status`, `restore_weapon_booster_hud` |
| After the summary (START GAME) | ok | ok | ok | ok (idle) | correct | `start_gameplay`: `clear_screen`, `init_screen`, score, status |
| Pause / resume | ok | ok | ok | ok | correct | the whole screen from the 960-B backup |

No other missing redraw. The backup routine (14 B) is the Light kernel link's
last segment — the window's free tail — called by a ninth boss-entry pin: as
the window's Director half it moved the Light kernel by 14 B (MEASURED, then
moved); as the arena's tail it ate M3-H's arena budget (the heavy-breakup pin).
Window 1,022 → **1,008** free, as §3.1 priced.

**Slot F (Q9).** `$5200-$53FF`; each region's block (its look tail, 98 B, 1
sector) read by the head as the region's fourth run from 696 + 4 × region,
folded into the head's check with the other seven (a changed byte refused).
The look tail left slot D (14 → 13 sectors); `boss_module_scored` moved to slot
D (slot A 2,042 → 2,016 B); the head keeps the region's index for its check.
**Write-watch** (trace, every replay and boot-smoke session, RESET included):
the writers are the start-up ones (the OS's cold start, the boot loader's
staging — the ones that wrote before the first `copy_hud_charset`, and again
after a RESET), `copy_hud_charset`, and the sector reader's store at `$A262`
— 12 block reads in the 12 boss-entry replays; **0 foreign writers**.

**Regions 2-4 on the disk (Q10)** as copies of region 1, each with its theme,
bands, charset, block and head sum; directory entries 3-5. Entry: **64
sectors, 245 host frames** for every region (`tests/slot-f.test.mjs`; the trace
measured 245 on the region-2 / 3 / 4 routes, the fight reaching the chain at
frame 5,131 on MEDIUM). **Fixed on the way (latent, pre-existing):** the region
from the level id in both the window's entry half and the head subtracted 4,
not 3, after the first pass (a CPX between the CMP and the SBC) — levels 4-12
read the wrong region; same bytes, reordered.

**The routes (§5).** `--boss-region=N` with `--level=1:sector=M` (and
`--laser-fixture=T`): the level run becomes the region's first level with level
1's content; `build/[laser-fixture-T-]boss-region-N-level-1-sM/`; trace sessions
`region-N-diag-{0,1,2}` (MEDIUM's 12,000 frames, ending at the summary) and
`region-N-dodge-2`, debug route only.

**Deviations from §4.1 / §6, reported.** (1) The block carries the look tail
only — no 9-byte jump table and no `region_frame` / `region_shot` hooks in slot
A: no region has code until S5-3, which adds them with the first region code
(slot A has 32 B free for them); the stress figures above carry no hook cost.
(2) The initial block: its code and data are `main`'s, its size 13,618 B and
107 sectors; 12 bytes differ — the boot chunk manifest's entries (lengths and
CRC-16) of the window, kernel, reader and `$9D75` records this session changes,
and its check. (3) The scratch page is 255 of 256 (the region index), not
254.

**Ledger after S5-1 (M):** slot A 2,016 / 2,048 (16 sectors); install 363 /
384; slot C 1,663 code (13); scratch 255 / 256; slot D 1,647 code (13); slot E
254 (2; 310 free, 200 for the torpedo); slot F 98 / 512 per region; window 1,008
free; ATR **345 → 396** of 720 sectors carrying data (+48 regions 2-4, +4
blocks, −1 slot D's run; MEASURED as non-empty sectors).

---

## 7. Owner questions

| # | Question | Recommended answer | Cost of the recommendation | The alternative and its cost |
| ---: | --- | --- | --- | --- |
| **Q1** | Style per region | **R2 the Bastion (style 2) with the escort; R3 Siege Spine (fortress, 3 layers) with the field; R4 Void Citadel (fortress, 4 layers) with the launchers and the finale** (§4.6) | 0 B: regions are data | R2 Siege Spine / R3 the Bastion with the field: the same bytes; R3's fight shorter unless the Bastion is grown further |
| **Q2** | The R3 field's look | **(b)**: a glyph row under the band in two region codes, P1 / P2 as the generators' glow, each generator its half (§4.4) | block 212 → ≈ 150 B; 103–134 native a frame, 122 an absorbed shot; the DLI one row lower | (a) P1 / P2 as two 32-clock segments beside the generators: ≈ 60 B, ≈ 40 native, the field covers 64 of 160 clocks; (c) the full-width P1 / P2 line kernel: 293 native + ≈ 456 wall a frame, risk 4 (cycle-exact under ANTIC 4 DMA; emulator / hardware disagreement) |
| **Q3** | The salvo and finale pattern | **three shots on three frames at columns x − 1, x, x + 1** (the engine's burst), the reload halved in the finale, the floor `finaleCooldown` (data) | +70 B of slot C (M), 515–590 native a burst step | five-shot bursts: +1 B of data, +2 frames of spawns; a fan (dx) needs the hostile pool to carry a dx: resident bytes, not taken |
| **Q4** | The boss-sector stress limit with the hooks and region 3's field at tier 4 (level 9) | **keep 8,500 for regions 1, 2 and 4** (the hooks flag-gated: ≈ 8,481) and **give region 3's tier-4 fixture its own pin at 8,750**, on the measured basis: the real worst boss frame has 8,650 of margin and a native cycle costs ≈ 2.4, so ≈ 240 native over the proxy leaves ≈ 8,050 over GO; and **let the stress composition add a weapon's spawn on the kill frame** (the pre-existing gap of §2.3), re-pinning the limits to what that measures | 0 B; the pin values | defer the field's frame work on kill frames (the sprites one frame late, invisible; the absorb cannot be deferred: ≈ 8,610, still over); or the field as (a) |
| **Q5** | The escort stream's data | **count 6, spacing 100** (two seconds between escorts), tuned in M8 | 0 B | count 4 / spacing 200: fewer, rarer; count 8 / spacing 16: a near-constant escort, −1,400 of margin on most frames |
| **Q6** | The finale in region 1 | **off** (`finaleCooldown` 0): the fight is accepted at 92 s | 0 | on: region 1's fight changes (shorter plates-to-win, more volleys); the evidence re-recorded |
| **Q7** | If region 3 cannot reach 65 sectors (§3.2 L1–L3 all failing) | **STOP in S5-3 and ask then** with the measured sectors | — | decide now: the bound 250 → 260 for S5 (then the torpedo's +2 lands at ≈ 264, over its 260 — the torpedo would need its own lever) or the field as (a) |
| **Q8** | The HUD booster fix | **the ten cells backed up before the WARNING screen and put back after the install's rewrite** (28 B: window 14, install 14, scratch 10) | exact, no logic duplicated | a redraw routine from the booster's timer: ≈ 60 B of window |
| **Q9** | Slot F — the boss claims `$5200–$53FF` (the HUD charset's unused half) for the boss sector | **yes**, with the write-watch proof and the static HUD-code test (§2.7) | 0 restore, 0 resident bytes | slot E's 110 B (region 3 does not fit); the arena as a restored slot (risk 3, +7 sectors at START GAME after a boss) |
| **Q10** | Regions 2–4 as copies of region 1 on the disk after S5-1 | **yes**: the platform session ships a 4-region disk whose placeholders are real runs, so the routes, ledgers and clauses are measured before any art exists | +48 sectors of a 720-sector disk | the regions land one by one: the ledger and the routes wait for S5-3 |

### 7.1 The owner's answers (2026-10-09)

Every question is answered; the session table of §6 carries them. Recorded in
the decision journal as §AF.

| # | Answer | Applied in |
| ---: | --- | --- |
| Q1 | **Yes**: R2 the Bastion with the escort, R3 Siege Spine with the field, R4 Void Citadel | §4.6, S5-3 … S5-5 |
| Q2 | **(b)**, the glyph row under the band with P1 / P2 as the generators' glow. **S5-3 also builds a comparison build of (a) for the owner's smoke before the choice is final** — an S5-3 deliverable | §4.4, S5-3 |
| Q3 | **Yes**: three shots on three frames at x − 1, x, x + 1, the reload halved, a data floor | §4.2, S5-2 |
| Q4 | **Yes**: 8,500 stays for R1 / R2 / R4 with the hooks flag-gated; R3's tier-4 fixture gets its own pin at **8,750** on the measured fence basis. **The stress composition must add a spawn on the kill frame, and that moves to S5-1** — the gap applies to region 1 as shipped. **S5-1 measures region 1 with the new composition; over 8,500 it STOPs and reports with the frames** | §3.3, S5-1, S5-3 |
| Q5 | **Yes**: 6 escorts, spacing 100; tuning in M8 | §4.3, S5-5 |
| Q6 | **The finale stays off in region 1** | §4.2, S5-2 |
| Q7 | **STOP in S5-3 and ask then; the bound is not raised now** | §3.2, S5-3 |
| Q8 | **Yes**, the ten-cell backup (28 B). **S5-1 also audits every HUD field (booster, lives, score, weapon, hull) at every screen rebuild (boss entry, capital, after a death, after the summary) and fixes any other missing redraw the same way** — an S5-1 deliverable | §1.7, §4.1, S5-1 |
| Q9 | **Yes**: slot F at `$5200–$53FF`, with a write-watch proof | §2.7, §4.1, S5-1 |
| Q10 | **Yes**: regions 2–4 as copies of region 1 after S5-1 | S5-1 |

---

## 8. What this document did not do

No source, cfg, build-script, level, harness, scenario, clause or evidence
change is committed; three probe edits (`src/hybrid/boss.s` slot E pads,
`src/c/boss.c` the finale twice, `assets/levels/level-01.json` the escort)
were built under `build/level-1-s6/` and `build/level-2-s0/`, traced where
said, and reverted; both directories were rebuilt from clean sources. The
probe sources, the scratch assembler, the CSV analysis and the four run logs
stayed in the session's scratch directory (not evidence). No baseline
worktree was needed (`main`'s figures are the committed ones). Not measured:
region 2–4 art (none exists), the field's seam on hardware, the arena's
exec-watch, the −65 B of slot C trims. Every **G** figure is to be replaced
by the session that builds it.
