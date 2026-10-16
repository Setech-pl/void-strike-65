# Plan — S5: bosses for regions 2–4 on the shared boss engine, with per-region overlays (plan-s5)

**Status:** S5-1 implemented on `chore/s5-platform`, `OWNER-SMOKE CANDIDATE`
(§6.1); **S5-2 implemented on `feat/boss-finale`, `OWNER-SMOKE CANDIDATE`
(§6.2)**; **S5-3 implemented on `feat/boss-region-3`, `OWNER-SMOKE CANDIDATE`
(§6.3: Phase A, the owner's answers §6.3.6, as built §6.3.7)**. **S5-4 implemented on `feat/boss-region-4` (§6.4:
Phase A, A-2 §6.4.6, as built §6.4.7), merged; its follow-up `fix/r4-immobile`
(§6.4.8: the still citadel, G2, no engines, no refuge at the core),
`OWNER-SMOKE CANDIDATE`.** **S5-5 implemented on `feat/boss-region-2` (§6.5:
Phase A, the owner's choice §6.5.7, as built §6.5.8), `OWNER-SMOKE CANDIDATE` -
with it every S5 session is built (S5 complete, pending the owner's smokes).** The plan itself: `OWNER REVIEW CANDIDATE` (2026-10-09, branch `docs/plan-s5`,
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

> **Art rule (fix/boss-polish, owner answers of 2026-10-12), for S5-3, S5-4,
> S5-5 and every later boss:** every damage stage of every destructible
> module (intact, cracked, broken; open looks included) must contain clearly
> visible colour-3 pixels (COLPF2, or COLPF3 in a bit-7 cell). The hit flash
> toggles bit 7 of the hit module's cells and shows nothing on a stage without
> them. A data test holds it for every region (plan `boss-polish` §10.3).
> **The boss's name (decision AL 1):** each region's boss name is data - a
> region's own `modules.json` `"name"` (S5-3 Siege Spine, S5-4 Void Citadel,
> S5-5 Bastion: keep the final names), until then its `placeholders.json`
> entry's. The converter writes it with INCOMING into the region's theme run
> at byte `$C0`, so the theme may use 192 B (`docs/level-authoring.md`).
> **Slot E:** after the hit flash it is 358 B of code in 3 sectors (373 of 576
> B RAM); the M6 torpedo's ~200 B no longer fits beside it, and the torpedo's
> home is M6's decision (candidates: plan `boss-polish` §10.4).

> **Superseded by owner decision AM (2026-10-12):** the boss entry's limit is
> **280 host frames** in every task, and the rule "more than 65 sectors is a
> STOP" below is replaced by it. The sector count is still reported; the
> frames are the gate (`tests/runtime-wall-trace.test.mjs`,
> `scripts/runtime-wall-trace.mjs`). At 3.5–4.0 frames a sector, 280 admits
> about 72-73 sectors (EST), the torpedo's two included.

> **Superseded again by owner decision AV (2026-10-16, `feat/boss-art`):** the
> standing limit is **300 host frames** (the gates moved with that reason), so
> the loading banner fits. After the boss art pass (plan
> [boss-art.md](boss-art.md): a palette per band row in R1, R2 and R4, slot C
> 14 sectors) the entries are R1 **249**, R2 **264**, R3 **260**, R4 **264**
> host frames (65 / 69 / 68 / 69 sectors).

**The target for every region is ≤ 65 sectors after S5** (the 250 bound now
and the torpedo's 260 later; superseded by AM, above). Region 3 reaches it with two of three levers,
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

**Superseded for the escort's flow (feat/boss-escort-flow, owner decision AI of
2026-10-10, docs/plans/boss-escort-flow.md):** R2's escort reuses region 1's
mechanism - the region's `escort` block (`afterWeapons`, `baseFrames`,
`jitterMask`; today region 1's 1 / 150 / 63, which the placeholder copies
carry) and one boss-sector wave of `count 1`; the Director publishes it at the
first weapon kill and admits one Interceptor every 150 + 0..63 frames until the
boss falls. S5-5 may retune R2 (the Bastion) by data only.

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

**Clauses (each with its subject):** the entry ≤ 280 host frames (owner
decision AM; was ≤ 65 sectors and < 250 host frames) (subject: the session's
one entry); the fight reaches the chain
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
| **S5-3** | `feat/boss-region-3` | §4.4: Siege Spine's placeholder art (≤ 112 codes), the generators, the field (block code), the DLI row move, P1 / P2 glow, the clauses, the region-3 stress fixture at tiers 2 and 4 with **its own pin at 8,750 (Q4)**; **a comparison build of the field as (a) for the owner's smoke, before the choice of (b) is final (Q2) — a deliverable of this session** | block ≈ 335 → 400 of 512; charset ≤ 896 | **≤ 280 host frames** (owner decision AM, 2026-10-12; was ≤ 65 sectors with "over 65: STOP", Q7) | tier 4: ≈ 8,740 native on the stress frame against the 8,750 pin; ≈ 8,050 over GO on the fence | entry over 280 host frames; the tier-4 fixture over 8,750; a seam in the field row or the sprites on hardware (owner) | 6502: the absorb, the pass-through for lasers and boss shots, the halves, the switch-off, the DLI's row; trace: the field clauses of §5 (subject: field-live frames) | the region-3 debug sessions (no default change) | **comparison builds**: the field as (b) and as (a) (§4.4, Q2: the choice is final only after this smoke); the generators' glow colour (two options) |
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

### 6.2 S5-2 as built (2026-10-09, `feat/boss-finale`) — `OWNER-SMOKE CANDIDATE`

**Implemented, pending the owner's smoke** (hardware-testing §22). ATR
`70063213c1c765870cd7de91f1e82e6549abf3e7809f406557225431f08a73a1`, boot
`8cc7d10a9e30f09eaf85104e0452b83dfd276b5f6de521d800d3b5e08c002d3f`.

**The finale (§4.2, Q3, Q6).** In `src/c/boss.c`: an armour counter
(`boss_armour_left`, `boss_count − boss_weapons_left` at the init, one down on
each armour kill — a capped emitter is armour) and `boss_finale`, the floor once
the finale has begun (0 before, and always without one). The last armour kill
sets the floor from the tables' byte 4 and the countdown to 1, so the first
volley comes on the next frame (rule (B) holds the kill frame); in the finale
`boss_fire_next` gives every weapon the salvo's burst (offsets −1, 0, +1 on three
frames) and halves the reload after the difficulty's adjustment, floored by the
finale's cooldown. Nothing fires after the last weapon (the chain phase).
**Measured (M-N):** the finale +60 B (the plan's probe +70), BSS +2; a firing
tick +13 native outside the finale (537 → 550 with region 1's full walk); in the
finale a volley's first frame 283 + 469 = 752 native, its later shots 103 + 489
and 107 + 509 ≈ 590–620 (§2.3's estimate 515–590).

**The data.** `fire.finaleCooldown` in `modules.json` (0 default, at most
`fire.cooldown`) → the tables' byte 4 (`reserved4` → `finaleCooldown`); the
manifest records it per region. Region 1: 0 (Q6). Regions 2–4, the copies of
region 1, take `assets/graphics/boss-regions/placeholders.json` — each copy's
`fire` block only (the build refuses anything else): `finaleCooldown` 12, half of
region 1's 24. **Deviation, reported:** the plan put the trace's finale on "a
fixture (region 1's data in a review build)"; the region 2–4 placeholders are
exactly that build on the existing routes (region 2's route is level 4, laser
tier 1, as level 1), so no new review flag was added.

**Slot C (the trims, L1).** 1,663 → **1,648 B** of code (13 sectors, 16 B
before the boundary), BSS 221 → 223, free 164 → 177 of 2,048. The finale +60;
the trims −75, every one behaviour-preserving and pinned by
`tests/boss-finale.test.mjs` (the init against the documented policy on four
layouts × three tiers × three difficulties × five HP scales, 180 inits with 75
capped emitters; every exposure after random kill orders, 270 kills) and the
existing `boss-fire-rule` (A) model:

| Trim | Bytes | What changed | Proof |
| --- | ---: | --- | --- |
| one hit-point read path for a capped emitter and a module (an offset into the tables) | −36 | `boss_c_init` | the init model test |
| the HP scale indexed by the difficulty directly | −6 | `boss_c_init` | the init model test |
| the init's stores grouped by value | −4 | `boss_c_init` | the init model test |
| the exposure's two cover tests as one | −11 | `boss_expose` | the exposure model test |
| the cover tests as expressions | −6 | `boss_expose` | the exposure model test |
| the reload's difficulty without temporaries | −12 | `boss_fire_next` | `boss-fire-rule` (A): 1,251 firings, 36 bursts against `main`'s policy |

**The stress composition (Q4).** The finale's layouts — the placeholders (region
1 + the finale, level 4) and the tier-4 fixture with the same entry (level 10),
lasers warn / beam — swept in the finale and one plate short of it, each case
also with a volley's second and third shot due on the meeting frame (the volley
started by the controller one or two frames earlier, its shots in the pool):
**6,682** / **7,034** / **6,217** reachable of 8,500 (information, ≤ 5 meetings:
7,250 / 7,734 / 6,991); 0 frames with a kill and a spawn; 29 / 115 / 115 kill
cases with a burst step's spawn. Region 1 and the fixture as shipped have no
volley: **6,910** and **7,784** / **6,994** (`main`'s build: 6,897 / 7,764 /
6,974 — the +13 / +20 are the finale's tests on firing and kill frames).

**The entry.** 64 sectors, 245 host frames in every region (trace: 12 default
entries and every region-route session). Initial block 13,618 B / 107 sectors;
15 bytes of the boot image differ, all checksums: the disk guard's expected fold
of the boss-code run (`$8C69` → `$0299`, in the Light kernel's extension
record), that record's CRC-16 in the boot chunk manifest, the manifest's CRC-16
and the initial block's trailer check.

**The trace.** New columns `boss_finale`, `boss_spawns`, `boss_armour_left`. The
finale clause on the region routes (subject: the finale's frames): the floor is
the region's, nothing is born on the last armour kill's frame, at least one
volley (boss shots born on three consecutive frames). **The plain sweep bot never
reaches the finale** (it moves between HPOS 94 and 154; two edge plates are
never hit), so the clause's subject is the new sessions
`region-N-finale-{0,1,2}` with the policy `sweep-wide` (58 ↔ 190). Also fixed on
the way (pre-existing since S5-1, reproduced on `main`): the EASY / HARD diag
sessions now end at the summary (EASY's fight ended at 3,819 and the route
entered the boss again). Regions 2–4 give identical results (one copy):

| Session (region 2 / 3 / 4) | Bot | Finale from | Volleys | Boss shots (before / finale) | Boss down (chain) | Bot deaths |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `finale-0` EASY | wide sweep | f2,446 (49 s) | 25 | 20 / 121 | f5,298 (106.0 s) | 1 |
| `finale-1` MEDIUM | wide sweep | f2,698 (54 s) | 43 | 35 / 210 | f7,003 (140.1 s) | 2 |
| `finale-2` HARD | wide sweep | f7,438 (149 s) | 26 | 136 / 127 | f9,806 (196.1 s) | 5 |
| `diag-0` EASY | sweep | never | — | 38 / 0 | f3,819 (76.4 s) | 1 |
| `diag-1` MEDIUM | sweep | never | — | 72 / 0 | f5,131 (102.6 s) | 2 |
| `diag-2` HARD (5,000 frames) | sweep | never | — | 92 / 0 | not reached | 5 |
| `dodge-2` HARD (3,000 frames) | laser-dodge | never | — | 44 / 0 | not reached | 0 |

Every session: entry 245 host frames, 0 miss events; the finale sessions' worst
boss-frame margin 9,783, DMA-on 30,102. Fight length: the wide-sweep bot's 140 s
on MEDIUM is the bot's (it clears the edge plates slowly), not a tuned figure;
the placeholders' fight is tuned by each region's session (§3.6). Region 1 is
unchanged (the default replays: every fight ends on `main`'s frame).

**Tests.** `npm test` twice on the default build: 1,265 / 1,264 / 1 / 0 skipped,
the recorded `preview` failure; reconciled (0 NEW, 0 MOVED). Re-pointed:
`level-summary-build.test.mjs:256` (the region 2-4 copies differ from region 1
in the tables' byte 4 now). RED on `main`'s build: `boss-finale`'s five finale
tests (the counter, the volley, the halved reload and floor, rule (B) in the
finale, the last weapon) and the stress test's finale-layout tests (no volley
state).

**Gates.** 57 replays, 0 clause failures, 0 miss events; worst fence margin
1,447 and DMA-on 31,304 unchanged; boss frames 10,038 → 10,017 (the same frame),
DMA-on 29,238; ATR menu 553 / 544. Against `main` frame by frame: 46 of 58 CSVs
identical, the 12 boss-entry replays differ on boss rows only and only in timing
(and two observer samplings of it).

### 6.3 S5-3 (2026-10-13, `feat/boss-region-3`) — Siege Spine, the force field — `OWNER-SMOKE CANDIDATE`

**Recommendation first.** Ship field look **(b)** — the field glyph row across
both halves, the P1 / P2 glow rings — with three changes against §4.4, each
forced by the repo and measured below: (1) the field row is the band's own front
row (row 7), not ring row 8; (2) the glow shows in the lasers' colours (P1 / P2
share `COLPM1` / `COLPM2` with M1 / M2); (3) the field stops shots through the
column map, so slot A, the window, the install and the initial block stay at
0 B. Then Phase B tunes the hit points so MEDIUM lands in 90–120 s (today
130.9 s). Region 3 enters in **256 host frames (67 sectors)** against the 280
limit; its tier-4 stress figure is **8,057** native against the planned 8,750
pin (and under 8,500).

**Step 0.** `main` `9b7ccaf` (the interceptor-armour merge, decision §AN, present),
clean; worktrees: the primary checkout only; `dist/` ATR `581fa463…`, boot
`70643ea4…`. Branch `feat/boss-region-3`. Every Phase A build is a review
variant (`--field-variant=a|b`, below): **the default build stays
byte-identical to `main`** (rebuilt and compared at each commit).

#### 6.3.1 Audit — what region 3 takes from the shared boss code (file:line at `9b7ccaf`)

| Need | Where it is | What S5-3 does with it |
| --- | --- | --- |
| Modules, stages, cover, the column map | `src/hybrid/boss.s` `boss_prepare` (`:1463`), `boss_column_at` / `boss_column_base` (`:1238–1310`), `boss_rebuild_module` (`:1314`); `src/c/boss.c` (cover, stages, defeat) | unchanged; the field sets its columns to `BOSS_COLUMN_ARMOUR` with the stop line under the field row, and a falling half rebuilds each column with `boss_column_at` |
| A shot's meeting and the hull's deflection | `boss_shot_meet` (`:1559`), `boss_hit`'s ARMOUR path (`:573–600`): deflection on the stop row's cell, the hull tick, no damage, not a hit (Q-B7) | the field's absorb **is** this path: 0 B, no per-shot code |
| Look table (slot F) | `scripts/boss-assets.mjs` `BOSS_LOOK_TAIL_MAX_BYTES` 110, `BOSS_SLOT_F_ADDRESS` `$5200` | R3's look tail is **80 B** (no open looks: open guns show their gun from the start); the field's code follows the tail's 110 B at `$526E` |
| Lasers (M1 / M2, ≤ 2 beams, PRIOR untouched) | slot D `laser_tier` (`:1760`), `laser_prepare`, `laser_frame` (`:2295`), `laser_publish` from the DLI's phase 0 (`:2872`) | unchanged; two gated calls added (the field's frame and its DLI publish) |
| Escort | the region's `escort` block → tables 17–19, `src/c/director.c` | region 1's 1 / 150 / 63 (decision AI), as data |
| Final salvos | `fire.finaleCooldown` → tables byte 4, `boss.c` `boss_finale` | 12 (the placeholders' value) |
| Hit flash b3 | slot E `boss_mflash_frame` (`:2457`) | unchanged: generators and every module flash |
| Rule (B) | `boss.c` (no firing on a kill frame) | unchanged: 0 frames with a kill and a spawn (stress) |
| Title | `boss-assets.mjs` `bossTitleRecords`, the theme run at `$D8` | `modules.json` `"name": "Siege Spine"` → SIEGE SPINE (seen on the emulator, below) |
| P1 / P2 in the boss sector | free since S4b (`boss.s:1745`), owner decision "reserved for the R3 field" | the glow / the segments |

**Where the plan and the repo disagree (reported):**
* **The field row.** §4.4 put it in ring row 8 under the band's CHBASE (the
  phase-1 DLI one row lower). Ring row 8 is gameplay playfield: the player's
  shots, the boss's pulse shots and the Interceptor escort are drawn there with
  the gameplay charset's codes, which the region charset would show as region
  glyphs. The field is drawn in **band row 7** instead (the band's front row,
  under the spine and the plates, which end at row 5): no DLI change, no
  display-list change, no garbled objects.
* **The glow's colour.** P1 / P2 wear `COLPM1` / `COLPM2`, which the band DLI
  publishes every frame for the lasers' M1 / M2 (B2): the glow is the beam's
  `$46` and flickers white during a warning. A separate colour needs a DLI
  inside the band (raster-critical; not proposed).
* **Hooks.** §4.1 put `jsr region_frame` / `region_shot` in slot A (2,047 of
  2,048 B since boss-polish: no room). They live in slot D (frame, DLI publish:
  +16 B, still 13 sectors, 1 B to the boundary) and slot E (the collapse step
  at SECTOR_COMPLETION: +8 B, 366 B, 3 sectors); each is `lda $526E / beq /
  jsr`, so a block without code (regions 1, 2, 4) pays ~7 cycles a call.
* **No per-shot hook.** The plan's `field_shot` (122 native an absorb) is not
  needed: an absorbed shot is the hull's path.

#### 6.3.2 The design as built (Phase A, review variant)

**The band** (`assets/graphics/boss-regions/region-3/`, drawn by
`scripts/boss-r3-art.mjs`; preview `build/play/boss-r3-band-preview.png`,
stages `build/play/boss-b3-stages-after.png`): a segmented spine with dorsal
spikes (columns 14–48, rows 0–3), a generator sphere at each end (`gen-l`
11–13, `gen-r` 49–51, rows 1–3, armour, 20 HP), the domed siege cannon at the
centre (emitter slot 1, region 1's projector tower under a dome, exposed: fires
from the first frame), emitters 2 and 3 behind plates a and d, guns 2 and 3
behind plates b and c, guns 1 and 4 open near the ends; vents (the nozzles)
beside each sphere; the field in row 7 from column 14 to 48 in two halves (14–31
`gen-l`, 32–48 `gen-r`). 13 modules; **108 of 128 codes** (K 21 staged ×3, 30
plain); charset **864 B, 7 sectors** (region 1: 8); look tail 80 B. Palette:
cold steel `$0C`, field blue `$96`, amber `$28`, dark steel hull `$04` (region 1
burgundy) — the owner retouches. **Art rule:** every stage of every module has
colour-3 pixels — the lowest the capped plate 8 / 7 / 5 and the guns 16 / 13 / 8, generators
44 / 37 / 30 (floor 4). **Coverage** (`npm run boss:coverage -- --region=3`):
no safe position at the opening or with every weapon exposed.

**The field** (`src/hybrid/boss.s`, `BOSS_FIELD`, region 3's block):
* first boss frame: every field column `ARMOUR`, stop line under row 7; P1 /
  P2's shapes written, their size;
* every frame (slot D's `laser_frame`): a half whose generator(s) are all
  destroyed starts to fall (its glow off); look (b) swaps the field glyph's two
  phases every 4 frames (one 8-byte glyph rewrite animates every field cell);
* SECTOR_COMPLETION (slot E), not on a kill or exposure-check frame: one
  column of a falling half a frame, from its generator's side — the cell
  cleared, its map and stop line rebuilt by `boss_column_at`; a cell showing a
  deflection waits a frame;
* the DLI's phase 0 (slot D's `laser_publish`, A only): P1 / P2's HPOS from the
  band position, 0 off the window or once its half fell; at the defeat or the
  last life lost, both off.
* The converter takes `modules.json` `field` (row, framesPerPhase, halves with
  their generators) and `field.png` (the glyph's two phases); field cells must
  be blank in `band.png` (the converter draws them), are left out of the hull
  stop and of decision O, and refuse a generator inside its own field.

**The looks compared.**

| | (b) — recommended | (a) — comparison |
| --- | --- | --- |
| field row | phase A/B glyph across both halves (blue / white shimmer) | none |
| P1 / P2 | double-width ring round each generator (28 lines) | quad-width bar, 32 colour clocks × 4 lines, beside each generator (columns 14–21, 41–48) |
| where a shot stops | on the field cell it struck (the deflection shows there) | the same cells — so in columns 22–40 the deflection shows on an **invisible** field |
| gameplay | identical (MEASURED: the same fight frame for frame, 3,166 frames MEDIUM) | identical |
| field code / region block | 339 B / 449 B, **4 sectors** | 270 B / 380 B, 3 sectors |
| entry | **67 sectors, 256 host frames** | 66, 253 |

#### 6.3.3 Measurements (labels: **M** emulator trace, **M-N** native harness)

Routes: `node scripts/build.mjs --field-variant=b|a --boss-region=3
--level=1:sector=6` (and `--laser-fixture=4` for tier 4, `sector=0` for the aim
bot's whole-level replay). Region 3 on its route is level 7: laser tier 2
(emitter 3 capped); tier 4 is level 9's.

| | main R1 (`9b7ccaf`) | R3 (b) | R3 (a) | Source |
| --- | ---: | ---: | ---: | --- |
| boss entry, host frames / sectors | 249 / 65 | **256 / 67** (tier 4: 257) | 253 / 66 | M, the entry row (limit 280) |
| boss frames, worst fence margin, tier 2: E / M / H (aim bot) | 8,569 (all three, STATUS) | 8,469 / 8,017 / **7,415** | — / 8,035 / — | M |
| … DMA-on max, tier 2 | 29,884 | 30,327 / 30,319 / 30,106 | — / 30,318 / — | M |
| boss frames, tier 4: E / M / H (aim bot) | — | 8,076 / 8,921 / 8,473; DMA-on 30,259 / 30,164 / 30,051 | — | M |
| wide-sweep finale sessions (tier 2 / tier 4) worst margin, DMA-on | — | 9,155 / 8,659; 30,321 / **30,386** | 9,587 / 9,285 | M |
| stress, reachable (lasers warn / beam), tier 2 | R1 7,006 (no lasers forced) | 7,831 / 6,965 | 7,753 / 6,892 | M-N |
| stress, tier-4 (planned pin 8,750) | R1 fixture **8,006** / 7,037 | **8,057** / 7,045 | 8,048 / 7,036 | M-N (`scripts/measure-boss-stress-field.mjs`) |
| … the worst any (≤ 5 meetings, unproven) | 8,892 / 8,443 | 8,546 / 7,722 | — | M-N |
| frames with a kill and a spawn | 0 | 0 | 0 | M-N (rule (B)) |
| fight by the aim ratio, tier 2: E / M / H | 82.4 / 108.3 / 150.5 s | **109.9 / 130.9 / 207.4 s** | — / 130.9 / — | M (ratio of main's plain sweep, `boss-r1-tuning`) |
| … tier 4 (level 9) | — | 109.4 / 140.7 / 207.3 s | — | M |
| escorts in the fight, tier 2: E / M / H | 9 / 12 / 17 | 11 / 12 / 18 | — | M |
| hits on the bot (laser / other), tier 2 E / M / H | — | 2/3, 2/5, 3/10 | — / 2/5 / — | M (`laser_damage_calls` / the rest: pulses, escort) |
| slot A / install / window / Light kernel / initial block | 2,047 / 362 / 1,322 / 847 / 13,623 | unchanged | unchanged | M (manifest) |
| slot D / slot E | 1,647 (13) / 358 (3) | **1,663 (13)** / **366 (3)** | same | M |
| slot F, region 3's block | 110 (R1) | 449 of 512 (4 sectors) | 380 (3) | M |
| charset | 976 B, 8 sectors | 864 B, 7 | same | M |
| RAM | — | field state in the block (11 B); P1 / P2 planes 28 / 4 lines | — | M |

The stress figure moved from **8,907 to 8,057** during Phase A: the collapse
step first ran in the frame hook and landed on a two-kill frame; it now runs at
SECTOR_COMPLETION and skips kill and exposure-check frames, as the draw queue
does (plan §5.15.7). The brief's "tier-4 fixture about 7,805" is stale: `main`'s
own `tests/boss-stress.test.mjs` prints 8,006 (lasers warn) on this tree.

**The diag bots and region 3.** The plain sweep (HPOS 94–154: band columns
≈ 17–48) never meets the generators, so `region-3-diag-*` never leave the field
(MEDIUM: 12,000 frames, chain not reached); the wide sweep (58–190) breaks both
generators but needs more than 12,000 frames (`region-3-finale-*`: finale from
f11,208 on EASY). The aim bot (`boss-aim`, taught the field: it does not shoot
into a powered half and takes a generator while a weapon is behind the field)
finishes every difficulty. Phase B rewrites region 3's diag / finale sessions
on the aim bot (a bot change, not a memory write).

**Harness fixes on the way (each ≤ 15 lines, committed):** the slot F
write-watch admits the block's own code writing its state inside the block;
the Heavy P1 / P2 body check has no subject in the boss sector (P1 / P2 are the
field's); `DFTRACE_SHOT_PREFIX` / `DFTRACE_SHOT_HOSTS` take host-frame
screenshots (the loading screen); `boss-aim` sees the field through
`DFTRACE_BOSS_COLUMN_MAP` (R1-neutral: an exposed live module's centre column
is never ARMOUR without a field). With them the region-3 dodge and aim sessions
pass every clause.

**Not reached:** no full-game route reaches region 3 (only levels 1–2 are
authored; `LEVEL_MAX_ID` 16); the level route (`sector=0`, level 1's content
played as level 7, then the R3 boss) stands in for it.

#### 6.3.4 Review builds (`build/play/`)

| ATR | SHA-256 (prefix) | What |
| --- | --- | --- |
| `s5-3-r3-field-b-boss-route.atr` | `1327aedb` | R3, look (b), level 7 (tier 2), entered at the boss |
| `s5-3-r3-field-a-boss-route.atr` | `3eef6480` | R3, look (a), level 7 |
| `s5-3-r3-field-b-tier4-boss-route.atr` | `6a387bbc` | R3 (b), tier 4 (level 9's lasers) |
| `s5-3-r3-field-a-tier4-boss-route.atr` | `161d70b6` | R3 (a), tier 4 |
| `s5-3-r3-field-b-level-route.atr` | `2f2046b4` | level 1's content as level 7, then the R3 boss (b) |
| `s5-3-main-r1-boss-route.atr` | `1bfe9f5e` | main's R1 boss route, for comparison |
| `s5-3-full-game.atr` | `581fa463` | the default build (= `main`) |

Screenshots: `s5-3-r3-loading-screen.png` (WARNING / SIEGE SPINE / INCOMING),
`s5-3-r3-band-b.png`, `s5-3-r3-band-b-laser.png`, `s5-3-r3-band-a.png`;
previews `boss-r3-band-preview.png`, `boss-b3-stages-after.png` (every module in
its three stages, normal and with the b3 flash).

#### 6.3.5 Owner questions (recommendation first)

| # | Question | Recommended | Alternative |
| ---: | --- | --- | --- |
| S3-1 | The field's look | **(b)** the glyph row with the generators' rings | (a) the segments beside the generators (one sector less, −3 host frames; the middle of the field invisible) |
| S3-2 | The field in the band's front row (row 7), not ring row 8 | **yes** (no DLI change, nothing garbled in the playfield) | ring row 8 needs every gameplay object kept out of it or the region charset to carry their glyphs: not proposed |
| S3-3 | The rings' colour is the lasers' (`$46`, white flicker in a warning) | **keep the rings** (they read as the generators feeding the cannon) | drop P1 / P2 from (b): the glyph row alone, block 4 → 3 sectors (−3 host frames), −≈ 60 B |
| S3-4 | A half falls with its own generator (plan §4.4) | **per half** (the fight has a middle: one side opens first) | one field until both generators fall (`halves` with both generators each: data only) |
| S3-5 | Phase B's tuning: MEDIUM 130.9 → 90–120 s | **hit points by data**: generators 20 → 16, plates 12 → 10, guns 12 → 10, the siege cannon 24 → 20 (target ≈ 105 s MEDIUM; EASY and HARD follow the scale) | the escort or the fire cooldown (changes the pressure, not the length) |
| S3-6 | The palette (steel hull, blue trim and field) | **as drawn**; the owner retouches the PNGs | region 1's burgundy hull |

Phase B starts on the owner's answers: tests first (RED on `main`), the chosen
look as the default build's region 3, the other look removed, the hit points
tuned, region 3's sessions on the aim bot with the field clauses, the
evidence regenerated.


#### 6.3.6 The owner's answers (2026-10-13, after playing the Phase A builds)

Journal §AO. (1) Look (b). (2) The field in the band's front row. (3) **The
glow rings dropped** — the answer list carried two contradictory item 3s; asked,
the owner chose "drop". (4) Each half falls with its own generator. (5) Hit
points as proposed (generators 20 → 16, plates and guns 12 → 10, the siege
cannon 24 → 20), aiming for about 105 s on MEDIUM, EASY shorter, HARD not
shorter; HARD's length noted for M8. (6) The palette against the levels 7-9
ally steel `$84`. Also: the two observer exceptions narrowed to the field's own
state and its glow, each with a test that a real violation still fails; the
tier-4 baseline recorded (8,006 on this tree, the brief's 7,805 stale) and R3's
pin set from the measured value (≤ 8,750), the reachable stress ≤ 8,500; region
3's diag and finale sessions on the aiming bot that sees the field.

#### 6.3.7 Phase B as built — `OWNER-SMOKE CANDIDATE`

**What ships.** Region 3 is Siege Spine from
`assets/graphics/boss-regions/region-3/` in every build (its
`placeholders.json` entry removed); regions 2 and 4 stay copies of region 1.
The field is look (b) without any sprite: the field glyph in band row 7,
columns 14-48, two halves (14-31 `gen-l`, 32-48 `gen-r`); P1 / P2 stay unused
in the boss sector. `--field-variant` and look (a) are gone (no variant script
keeps them).

**Code and bytes (M, the manifest).**

| | main | S5-3 |
| --- | ---: | ---: |
| slot A / install / slot C | 2,047 / 362 / 1,662 (13 sectors) | unchanged |
| slot D | 1,647 B, 13 sectors | **1,655 B**, 13 (`laser_frame`'s gated call, +8) |
| slot E | 358 B, 3 sectors | **366 B**, 3 (`boss_shots_late`'s gated call, +8) |
| region 3's block (slot F) | 110 B, 1 sector (a copy) | **323 B, 3 sectors**: look tail 80 B, the field's code from `$526E` (213 B: frame, late step, init, the tables, 8 B of state) |
| region 3's charset | 976 B, 8 sectors | 864 B, 7 sectors (108 of 128 codes) |
| region 3's entry | 65 sectors, 249 host frames | **66 sectors, 253 host frames** (limit 280) |
| window, Light kernel, pickup tail, DIRECTOR_RAM, initial block, boot, transport | 1,322 / 847 / 9 B / 2 B / 13,623 B / 107 / 213 | unchanged |

Per frame (IC, native): the frame hook ~7 cycles on regions 1, 2 and 4 (a
zero hook byte) at each of the two call sites; region 3's frame step ≈ 45
(the halves' generator test) + ≈ 90 every 4th frame (the glyph's phase); the
late step ≈ 25, and on a collapsing half ≈ 400 once a frame (the
`boss_column_at` walk), never on a kill or exposure-check frame; the absorb is
the hull's existing path.

**The fight (M, the aiming bot's ratio; owner answer 5).** The proposal
measured 91.6 / 118.8 / 161.1 s on levels 7-8 (tier 2) and 90.3 / 128.8 /
171.4 s on level 9 (tier 4): level 9's MEDIUM over 120. One more step toward
the aim — generators 14, plates 8, the siege cannon 18, emitters 2-3 16, guns
10 — gives:

| Levels | EASY | MEDIUM | HARD | Escorts E / M / H | Hits on the bot (laser / other) E / M / H |
| --- | ---: | ---: | ---: | --- | --- |
| 7-8 (tier 2) | **89.5 s** | **118.8 s** | **150.1 s** | 10 / 12 / 13 | 1/3, 2/9, 3/7 |
| 9 (tier 4) | **109.4 s** | **118.2 s** | **152.0 s** | 12 / 13 / 14 | 1/5, 1/9, 2/9 |
| region 1 (main, unchanged) | 82.4 s | 108.3 s | 150.5 s | 9 / 12 / 17 | — |

MEDIUM is inside 90-120 on every level, EASY shorter, HARD not shorter — but
**not about 105 s**: on levels 7-8 MEDIUM did not move between the two steps
(2,873 frames both times). The fight there is bound by when the generators'
columns drift into reach at the band's ends (each about a third of the
travel), not by hit points; nearer 105 s needs a layout change (the generators
a column or two inward) — offered to the owner's smoke, or M8. **HARD is far
longer than MEDIUM** (≈ 150 s against ≈ 118 s) — for review in M8, as region
1's.

**The palette (owner answer 6, M).** The ally steel `$84` is hue 226°. Region
3: hull `$04` and plate steel `$0C` grey (no hue), amber `$28` 34°, trim and
field `$96` → **`$66`** (204° → 294°: 22° from the ally steel → 68°).
`tests/boss-region-3.test.mjs` holds every coloured register ≥ 45° from `$84`.
Previews: `build/play/s5-3-palette-before-trim-96.png`,
`s5-3-palette-after-trim-66.png`.

**Timing (M).**

| | main `9b7ccaf` | S5-3 | Source |
| --- | ---: | ---: | --- |
| worst fence margin (default replays) | 1,260 (`2-sweep-fire6` f311) | **1,260** (same frame) | `build/runtime-wall-trace/pal-timing-audit.json` |
| DMA-on maximum | 31,483 | **31,483** | the evidence |
| boss frames, region 1 (director-complete) | 8,569 / 29,884 | **8,558 / 29,932** | `scripts/measure-boss-fight.mjs` |
| region 1's fights | 1,985 / 2,619 / 3,359 frames | **identical** | the evidence (`boss-aim`'s field view is region-1-neutral) |
| region 3 boss frames, aim bot, levels 7-8 E / M / H | — | 8,781 / 8,878 / **8,198**; DMA-on 30,409 / 29,949 / 30,455 | M, focused runs |
| … level 9 E / M / H | — | 8,431 / **7,396** / 7,968; DMA-on 30,352 / 30,256 / **30,668** | M |
| stress, region 3 level 7 / level 9 (warn) | — | **7,782 / 8,007** (pin 8,750, reachable limit 8,500) | M-N, `tests/boss-region-3.test.mjs` |
| stress, region 1 / the tier-4 fixture (warn) | 7,006 / 8,006 | **7,019 / 8,018** (the two gated calls, +12-13) | M-N, `tests/boss-stress.test.mjs` |

**The trace.** Region 3's route sessions (`--boss-region=3`, debug only)
play the boss with the aiming bot (`region-3-diag-*`, `region-3-finale-*`;
regions 2 and 4 keep their bots). New columns `field_state`,
`field_deflections`, `field_violations`, `field_cells_down` and the clause
(subject: boss frames with a powered half): **0 hit points lost behind a
powered half**, a deflection on a powered half (the bots that attack the
boss), no field glyph left in a fallen half, both halves down before the
chain. All seven sessions pass: entry 253 host frames; MEDIUM: the field
powered on 1,726 frames, 96 with a deflection, down at f1,745, the chain at
f3,215, 12 finale volleys. The default run (58 replays) is unchanged in
behaviour; its slot F clause saw 14 block reads and 0 foreign writers.

**Observer changes and their tests.** The slot F write clause moved to
`scripts/trace-clause-observers.mjs`; its one exception is a PC inside the
field's code writing only `field_state` … `field_state_end` (by the watch's new
lowest / highest address); `tests/slot-f-write-clause.test.mjs` proves a
foreign write into the state, a field-code write anywhere else in slot F, a
writer that strayed between its first and last address and any field write on
a disk without field code still fail. The Heavy P1 / P2 body check's
boss-sector exception (Phase A, for the glow) is **reverted** — no sprite uses
P1 / P2 now, so the check is `main`'s, unchanged.

**Tests.** New: `tests/boss-region-3.test.mjs` (7) and
`tests/slot-f-write-clause.test.mjs` (5), RED on `main` `9b7ccaf` in a detached
worktree (7 of 7; the clause file fails to import), GREEN here. Re-pointed,
each with its reason at the site: `boss-look-tail` (region 3's block is its tail
and the field code; regions 2 and 4 copies), `boss-overlay` (region 3's own band
A, charset, block on the disk), `level-summary-build` (region 3 no placeholder),
`slot-f` (BOSS_F_CODE after the tail's 110 B is region 3's block code),
`boss-polish`'s art rule (region 3 from its draft). The loading-screen title
test (SIEGE SPINE) was already green on `main` (the placeholder carried the
name). Two full `npm test` runs on the default build (ATR `e079093e…`): 1,340
tests, 1,339 pass, 1 fail each (the recorded preview test); reconciled after
each: 0 NEW, 0 MOVED.

### 6.4 S5-4 (2026-10-13, `feat/boss-region-4`) — the Void Citadel, the gravity well — Phase A

**Recommendation first.** Ship the Void Citadel as drawn with the **gentle
well G1** (the ship steps 2 colour clocks towards the core every 8 frames
while a spire stands): the pull is on for about 83 % of the fight and the
aiming bot still finishes every difficulty; MEDIUM is unchanged by it (108.8 s
against 108.4 s without it), the worst-case escape from a beam leaves 15 of
HARD's 25 warning frames. G2 adds 20 % to MEDIUM. Everything is inside its
limit: entry **253 host frames** (66 sectors; limit 280), stress **8,322**
reachable (8,500), boss frames ≥ 7,613 margin / ≤ 30,550 DMA-on, 0 resident
bytes, 0 B of slots A–E (the well is 117 B of region 4's block in slot F),
charset 108 codes / 7 sectors. **Phase B's open work is the length:** at the
t1 hit points MEDIUM is in range but **EASY is longer than MEDIUM and HARD is
195–230 s** — the spires at the band's ends bind the fight's end. The
optional scanline fix (COLPF2 first) is measured on all four regions and
recommended (0 B).

**Step 0.** `main` `e7d9020` (the twin-lasers work, decision §AP, present),
clean; worktrees: the primary checkout only; `dist/` ATR `3c8f1110…`, boot
`a187caef…`. Branch `feat/boss-region-4`. Every Phase A build is a review
variant (`--r4-variant=g0|g1|g2`): **the default build stays byte-identical
to `main`** (rebuilt and compared at the Phase A commit, `ee97f08`).

**Baseline (each figure with its source; the brief agrees with all of them).**
Worst fence margin 1,260 (`2-sweep-fire6` f311) and DMA-on 31,483 (STATUS,
`docs/runtime-wall-trace.json`); boss frames 9,219 / 29,902 (region 1,
director-complete; STATUS); region 3 7,396 / 30,668 (STATUS §S5-3); entry 249
host frames / 65 sectors (regions 1, 2, 4), region 3 67 sectors (manifest);
stress region 1 7,032, region 3 7,810 / 8,063, the tier-4 fixture 7,822
(STATUS, `tests/boss-stress.test.mjs`); 58 replays, 0 clause failures; window
1,322 of 1,387 B, Light kernel 847 of 875 B, slot A 2,047 of 2,048 B, slot D
1,661 B, slot E 496 B (4 sectors), install 374 B; region 1 105 codes, look
tail 110 B; initial block 13,623 B / 107 sectors; region 1's fight 89.1 /
108.7 / 154.0 s; `npm test` 1,354 tests, 1 recorded failure (preview).

#### 6.4.1 Audit — what region 4 takes from the shared boss code (file:line at `e7d9020`)

| Need | Where it is | What S5-4 does with it |
| --- | --- | --- |
| 16 modules, stages, cover, the column map | `scripts/boss-assets.mjs` `resolveModules` (`BOSS_MAX_MODULES` 16, a module ≤ 6 × 4 cells, ≤ 24); `src/c/boss.c` `boss_c_init`, `boss_expose` | the Void Citadel is 16 modules; the core's cover is an explicit list (the shutter plate and both spires) |
| The core | `BOSS_KIND.core` (4): a weapon without a reload (`boss_c_init` counts it; never in the fire rotation) — the Bastion fixture's kind | the void core; the boss falls with its last weapon, the core one of them |
| Salvo spires | `BOSS_KIND.salvo` (3); `boss.c:423` `boss_fire_next`: three shots on three frames at x − 1, x, x + 1 | the two spires at the band's ends |
| Every gun's fire column (the finale's volleys) | `boss-assets.mjs` the fire-column rule: no module under a gun's columns `centre`, `centre + 1` that does not cover it | the guns are 3 cells wide (a 2-wide gun fires down its neighbour's column) |
| Decision O | `boss-assets.mjs` "hull art below module": nothing under a weapon but a module | every gun hangs in a recess down to the belt |
| Look table, charset | `BOSS_LOOK_TAIL_MAX_BYTES` 110, ≤ 128 codes | region 4: tail 80 B, 108 codes, 7 sectors |
| Lasers per tier | slot D `laser_tier` (`boss.s:1771`): levels 10–12 = tier 4, slots 1–4; `LASER_MAX_ON` 2; slot E `laser_admit` (`:1975`) | four emitters, slots 1–4 (no twin) |
| Escort | the region's `escort` block → tables 17–19, `src/c/director.c` | region 1's 1 / 150 / 63 (decision AI) |
| Final salvos | `fire.finaleCooldown` → tables byte 4; `boss.c:400` | 12 (the placeholders' value) |
| Rule (B) (a) | `boss.c:480`, `:501`: no gun fires on a kill frame | unchanged (0 frames with a kill and a spawn, stress) |
| Hit flash b3 | slot E `boss_mflash_frame` (`boss.s:2570`): a request byte, 3 frames of bit 7 on the module's cells, the frame's one module draw | **the core's pulse asks it** (below) |
| The shown band | slot D `boss_band_measure` (`:2953`) | region 4 ends at row 4: 5 shown rows |
| Region code | slot F's block, `BOSS_F_HOOK` = `$526E` (`:3387`): `jsr` from slot D's `laser_frame` (`:2402`, every boss frame, before the shots meet the band) and slot E's `boss_shots_late` (`:2188`), each gated by the hook's first byte | **the gravity well is region 4's block code** — 0 B of slots A–E |
| Title | `modules.json` `"name"` → the theme run | `VOID CITADEL` (seen on the emulator) |
| **Where the player's X moves** | `src/main.s` `read_input` (`:3787`): left / right by 2 colour clocks, edges `cmp #PLAYER_X_MIN / beq` (**equality**, `PLAYER_X_MIN` 48, `PLAYER_X_MAX` 200, `:522`), `HPOSP0` from `player_x` (`:3878`); the main loop calls it before `integration_update_enemy` (`:2741`, `:2744`), whose boss UPDATE runs `laser_frame` | the well moves `player_x` from the frame hook after the input, in **2-clock steps** (an odd x would pass the equality edge tests), and writes `HPOSP0` as `main.s:9765` does |

**Where the brief and the repo disagree (reported):**
* **"1 px every 4 frames".** The input moves the ship 2 colour clocks a
  frame and tests its edges for equality; a 1-clock step would make
  `player_x` odd and let the ship run past `PLAYER_X_MIN` / `PLAYER_X_MAX`.
  The well steps 2 clocks: **G1 = 2 every 8 frames, G2 = 2 every 4** — the
  brief's averages (0.25 and 0.5 clock a frame).
* **"16 modules in two blocks of 8"** (the banner) is 16 modules in the band,
  but not 8 + 8: the spires and the core are three of them (below).

#### 6.4.2 The design (Phase A, review variant)

**The band** (`assets/graphics/boss-regions/region-4/`, drawn by
`scripts/boss-r4-art.mjs`; previews `build/play/s5-4-r4-band-preview.png`,
`s5-4-r4-stages.png`, `s5-4-r4-plates-gone.png`). Symmetric about column 31.5:

| Columns | Rows | What |
| --- | --- | --- |
| 14–49 | 0 | **the deck**, one continuous hull from end to end, the octagon's corners cut at 14 and 49 — it never breaks |
| 14, 49 | 1–3 | the octagon's sides; 13 / 50 rows 1–2 the **gantries** to the spires, a vent under each (row 3) |
| 11–12, 51–52 | 0–3 | **spire-l, spire-r** (salvo): twin needles with void-magenta coils, the muzzle at the foot |
| 30–33 | 1–3 | **the void core** (kind core, 4 × 3, no damage stages): a black void inside a bright rim, a magenta glow ring, a curl — hung under the deck so the deck stays whole when it falls |
| 15–17, 46–48 | 1–2 | **gun-1, gun-4** (outer guns) |
| 18–20, 43–45 | 1–3 | **emitter-3, emitter-4** (region 1's projector tower) |
| 22–24, 39–41 | 1–3 | **emitter-1, emitter-2** |
| 26–28, 35–37 | 1–2 | **gun-2, gun-3** in open bays beside the core (25–29, 34–38): they fire from the first frame, where the well pulls the ship |
| 21, 42 | 1–4 | struts between the blocks, their feet on the belt row |
| 15–20, 22–24, 30–33, 39–41, 43–48 | 4 | **the armour belt**: plate-a, plate-b, plate-c (the core's shutter), plate-d, plate-e — one row, steel faces, a magenta rim |

Nothing below the belt: 5 shown rows. 16 modules (2 spires, the core, 4
emitters, 4 guns, 5 plates); **108 of 128 codes** (K 18 staged × 3, 39 plain,
2 nozzles, 7 divider); charset **864 B, 7 sectors**; look tail **80 B**.
**Every stage of every module has colour-3 pixels** (the stages preview:
normal and flashed — each darkens). Palette: pale steel `$0C`, mid steel
`$06`, void magenta `$58` (COLPF2: the core's glow, the coils, lights; hue
326°, 100° from the ally steel `$84`), dark violet hull `$62` (hue 294°, 68°).
Every hued register is ≥ 45° from `$84`.

**The fight.** Opening: the spires (salvos at the band's ends) and the two
open inner guns (beside the core) fire; the four lasers and the outer guns
wait behind the belt (a laser's first shot as its plate falls, S4b.4). The
core cannot be hurt while a spire stands (its cover) or its shutter stands
(in front). The boss falls with its last weapon — the core included. The
finale (every plate down) as the region 2–4 placeholders: volleys, floor 12.

**The gravity well** (`src/hybrid/boss.s`, `BOSS_GRAVITY`, region 4's block;
117 B at `$526E`, its state 5 B inside the block):
* **when:** every boss frame (slot D's frame hook) while `_boss_phase` is the
  fight, `PLAYER_LIFECYCLE` is alive (0: never while dying or in a respawn's
  invulnerability) and either spire has hit points — the entry is over before
  the first hook runs; the chain and the hold are not the fight;
* **the pull:** every `GRAVITY_FRAMES` frames (G1 8, G2 4) one 2-clock step of
  `player_x` towards `GRAVITY_X_BASE − boss_shown_pos` (152 − p: the ship's
  centre under the core's centre as the band now shows it), `HPOSP0` with it;
  within one clock of the target, no step;
* **never off-screen:** the target is 89…152, inside the input's 48…200
  (asserted at link time), and a step only ever moves towards it;
* **slower than the player:** at most 2 clocks every 4 frames (G2) against the
  input's 2 a frame — holding still against it costs a tap, and moving away
  still makes 1.5 clocks a frame (G2) or 1.75 (G1);
* **the signal:** every 16 frames the core's hit flash is asked
  (`boss_mflash_req`) — 3 frames of bit 7 on the core's cells: its magenta glow
  dims, a heartbeat — unless a hit's flash is waiting or showing (a hit goes
  first). No colour register, no other cell;
* **off:** both spires destroyed → the pull and the pulse stop on that frame,
  for good;
* **G0** is the Void Citadel without the well (no block code), for comparison.

**The regenerating-plates fallback (priced, not built; owner's alternative).**
A repair node (one of the 16 modules, e.g. a third spire or the core's
role) and block code that, while it lives, gives a destroyed plate back its hit
points every N frames: the kill run backwards — its alive and exposed bits,
the armour counter (and the finale: a regrown plate after the last armour fell
needs a rule — the finale stays on, or stops), its columns rebuilt
(`boss_rebuild_module`, `boss.s`), its draw queued. **G (analogy to region 3's
field code, 213 B):** 90–140 B of block code (block 2 sectors, as the well);
the regrow frame about one kill's rebuild, deferred to quiet frames as the
field's collapse is. Not measured.

#### 6.4.3 Measurements (labels: **M** emulator trace, **M-N** native harness, **IC** instruction count, **R** the aiming bot's ratio, **S** simulation of the game's steps)

Routes: `node scripts/build.mjs --r4-variant=g0|g1|g2 --boss-region=4
--level=1:sector=0` (level 1's content played as level 10, then region 4's
boss; the aim bot's `boss-aim-N`) and `--level=1:sector=6` (entered at the
boss; `region-4-dodge-2`, `boss-park-left-1`). Level 10 is laser tier 4. The
ratio rule as region 1's: seconds = aim frames × plain[d] / aimMain[d] / 50
(plain 3,834 / 4,612 / 5,964, aimMain 1,847 / 2,231 / 2,663). Hit points:
**t1** (below); the opening values in the last rows.

| | main R1 (`e7d9020`) | R4 G0 (no well) | R4 G1 (2 / 8 frames) | R4 G2 (2 / 4 frames) | label |
| --- | ---: | ---: | ---: | ---: | --- |
| boss entry, host frames / sectors | 249 / 65 | 249 / 65 | **253 / 66** | 253 / 66 | M (limit 280) |
| region 4's block (slot F) | 110 B (R4 a copy of R1) | 80 B, 1 sector | **227 B** (tail 80 in 110 + the well 117), 2 sectors | 227 B, 2 | M (manifest) |
| fight E / M / H, frames | ≈ 2,146 / 2,629 / 3,438 (from the seconds) | 2,884 / 2,622 / 4,350 | 3,079 / **2,631** / 4,643 | 3,331 / 3,138 / 5,141 | M |
| fight E / M / H, s | 89.1 / 108.7 / 154.0 | 119.7 / 108.4 / 194.8 | 127.8 / **108.8** / 208.0 | 138.3 / 129.7 / 230.3 | R |
| the pull on (frames of the fight) E / M / H | — | 0 | 2,666 / 2,170 / 3,653 (≈ 83 %) | 2,927 / 2,674 / 4,400 (≈ 86 %) | M (`gravity_on`) |
| the pull's steps E / M / H | — | 0 | 332 / 270 / 452 | 725 / 661 / 1,090 | M (`gravity_steps`) |
| the pull off (both spires down), fight frame E / M / H | — | — | 2,939 / 2,443 / 4,475 | 3,200 / 2,947 / 4,948 | M |
| plates all down, fight frame E / M / H | — | 912 / 861 / 885 | 928 / 852 / 918 | 1,045 / 879 / 1,093 | M (the finale from there) |
| hits on the bot E / M / H (laser) | 1 (0) / 8 (0) / 8 (2) (twin plan §9.3, l2b1) | 2 (0) / 6 (1) / 18 (2) | 3 (1) / 7 (1) / 18 (2) | 5 (1) / 5 (1) / 17 (1) | M |
| … of them while the pull was on (laser) E / M / H | — | — | 1 (1) / 6 (1) / 15 (2) | 4 (1) / 4 (1) / 15 (1) | M |
| deaths (lives held) E / M / H | — | 0 / 1 / 3 | 1 / 1 / 3 | 1 / 1 / 2 | M |
| escorts in the fight E / M / H | 11 / 16 / 19 (twin plan §9.3) | 16 / 15 / 24 | 17 / 15 / 25 | 19 / 18 / 27 | M |
| boss frames worst margin E / M / H | 9,219 (director-complete) | 9,903 / 10,049 / 8,595 | 8,679 / 9,342 / **7,613** | 8,381 / 7,957 / 8,499 | M |
| … DMA-on max E / M / H | 29,902 | 30,192 / 30,296 / **30,676** | 30,045 / 30,388 / 30,550 | 30,065 / 30,392 / 30,352 | M (gate 32,568) |
| left edge (`boss-park-left-1`, parked at x 48, 4,000 frames) | 17 hits (`boss-edge-left-1`) | 18 hits, 1 death | 18, 1 | 18, 1 | M — no refuge |
| `region-4-dodge-2` (HARD, laser-dodge): hits, worst margin / DMA-on | — | 3; 15,142 / 28,282 | 3; 12,875 / 28,233 | 3; 12,875 / 28,230 | M (the bot breaks no plate: no laser fires) |
| stress, reachable (lasers warn / beam; limit 8,500) | 7,032 (R1) | 8,164 / 7,447 | **8,322** / 7,605 | 8,322 / 7,605 | M-N (`scripts/measure-boss-stress-r4.mjs`) |
| … the finale's worst reachable (warn / beam) | 6,976 (regions 2–4) | 7,494 / 6,751 | 7,652 / 6,904 | 7,652 / 6,904 | M-N |
| … the worst any (≤ 3 meetings, unproven) | — | 8,398 | 8,556 | 8,556 | M-N |
| frames with a kill and a spawn (rule (B)) | 0 | 0 | 0 | 0 | M-N |
| the well's own cost on the worst frame (step + pulse request) | — | — | +158 native | +158 | M-N (G1 and G2 run the same code on their step frames) |
| the well a frame, IC | — | — | ≈ 30 cycles (no step), ≈ 75 (a step), +≈ 20 (the pulse request) | same | IC |
| worst escape from a beam against the pull and the band's drift / HARD's 25-frame warning | — | 8 frames / 17 left | 10 / **15 left** | 12 / 13 left | S (MEDIUM's 32: 24 / 22 / 20 left) |
| charset / look tail / shown rows | 840 B, 7 / 110 B / 5 | 864 B, 7 sectors / 80 B / 5 | same | same | converter |
| slot A / install / C / D / E / window / Light kernel / initial block | 2,047 / 374 / 1,662 / 1,661 / 496 / 1,322 / 847 / 13,623 B | unchanged | unchanged | unchanged | M (manifest) |
| **opening hit points**, fight E / M / H (s) | — | 161.3 / 175.9 / 246.3 | 172.9 / 175.1 / 279.5 | 173.0 / 226.2 / 278.9 | R |
| … hits on the bot (laser) | — | 8 (1) / 6 (1) / 20 (2) | 13 (3) / 9 (1) / 17 (3) | 11 (2) / 15 (2) / 26 (4) | M |

Notes on the table:
* **The well is felt and beatable.** With G1 the pull is on for about 83 % of
  the fight (the spires die last: the core waits for them), 270 steps on
  MEDIUM; the aim bot, which only steers at its target, finishes every
  difficulty. G1 leaves MEDIUM where it was (108.8 against 108.4 s) and costs
  about one hit on EASY and MEDIUM; **G2 adds 20 % to MEDIUM** (129.7 s) and,
  at the opening hit points, doubled the hits on MEDIUM (15 against 6).
* **The spires bind the fight's end.** Cutting every hit point by about 40 %
  shortened the fight only by about 26–38 % (EASY 161 → 120 s): the spires
  stand at the band's ends (in reach 39 % / 50 % of the travel), and the core
  opens only after both. **EASY is longer than MEDIUM in every variant** and
  **HARD is 195–230 s** — both for Phase B's tuning (below).
* **Stress:** the worst reachable frame is a two-kill frame with two lasers in
  their warning and a spire's salvo due: 8,322 with the well, 158 over G0, 178
  under the limit. The finale's frames are cheaper (7,652). No new fixture is
  needed for a pin: the measured value sits under 8,500 (Phase B adds it to
  `tests/boss-stress.test.mjs` from the measurement).
* **The core's pulse (M-N):** on the harness, the core's twelve cells carry
  bit 7 for 3 frames every 16 while a spire stands; the drift steps 2 clocks
  every 4 frames (G2) and stops one clock from the target (x 90 at p 62–63).
  Screenshots `build/play/s5-4-r4-loading-screen.png` (WARNING / VOID CITADEL /
  INCOMING), `s5-4-r4-band-ingame.png`.

**The optional scanline fix (M, measured on all four regions' routes, a probe
build reverted afterwards).** Phase 1 of the band DLI writes CHBASE, then
COLPF0, COLPF1, COLPF2, COLPF3 after `WSYNC`; on the first line under the band
the later stores land after the line has started. Probe: COLPF2 written right
after CHBASE (the pinned assertions — charset first, COLPF3 last,
`tests/boss-engine.test.mjs:172-180` — still hold; 0 B, 0 cycles). 600 host
frames each (1,100–1,699), the dodge session firing, the first line under the
band:

| route | line | before (band colours on the line) | after |
| --- | ---: | --- | --- |
| R1 (`level-1-s6`, `laser-dodge-2-fire0`) | 64 | `$28` 20 px (COLPF2), `$32` 24 (COLPF3), `$0A` 10 (COLPF0) on 18 frames | **`$AE` 20** (the shot's own colour), `$32` 24, `$0A` 10 |
| R2 (`region-2-dodge-2`) | 64 | the same as R1 | the same as R1 after |
| R3 (`region-3-dodge-2`) | 88 | `$28` 22, `$0C` 4 (+ PMG pixels: beams, escort) | **`$AE` 22**, `$0C` 4 |
| R4 G1 (`region-4-dodge-2`) | 64 | `$58` 22, `$0C` 8 | **`$AE` 22**, `$0C` 8 |

The player shot's top pixel takes its own colour on every route; the band's
COLPF0 / COLPF3 pixels there (other objects' edges) stay as they are — no
order fixes all four stores. Every other pixel of the 600 frames is identical.

#### 6.4.4 Review builds (`build/play/`, `atari800 -xl -pal -nobasic <absolute path>`)

| ATR | SHA-256 (prefix) | What |
| --- | --- | --- |
| `s5-4-r4-g1-boss-route.atr` | `c88ad309f4bf9e27` | **R4 with the gentle well (recommended)**, level 10 (tier 4), entered at the boss |
| `s5-4-r4-g2-boss-route.atr` | `2907c520a214df78` | R4, the stronger well |
| `s5-4-r4-g0-boss-route.atr` | `8e0ce28076fd43a6` | R4 without the well |
| `s5-4-r4-g1-level-route.atr` | `2ee9f871ff0c93ca` | level 1's content as level 10, then the R4 boss (G1) |
| `s5-4-r4-g2-level-route.atr` | `bab9bd07a1b9ce52` | the same, G2 |
| `s5-4-r4-g0-level-route.atr` | `a3470b3f6ee7d9cc` | the same, G0 |
| `s5-4-main-r1-boss-route.atr` | `fba21e9b63edc9a3` | main's R1 boss route, for comparison |
| `s5-4-full-game.atr` | `3c8f1110129242fd` | the default build (= `main`) |

Previews: `s5-4-r4-band-preview.png` (every panel), `s5-4-r4-stages.png`
(intact / cracked / broken, normal and flashed), `s5-4-r4-plates-gone.png`
(intact; every plate gone; every module gone). All at the t1 hit points.

**What to look for:** the band reads as one ship and as the banner's
fortress (spires, the void core, the two blocks, the belt); the pull is felt
— the ship slides towards the core when the stick is let go — and is always
beatable; the core's heartbeat while it pulls; the pull stops at once when
the second spire falls (the heartbeat with it); stepping out of a beam's
warning against the pull; the two open guns beside the core; the finale's
volleys once the belt is gone; the escort.

#### 6.4.5 Owner questions (recommendation first)

| # | Question | Recommended | Alternative |
| ---: | --- | --- | --- |
| S4-1 | The well's strength | **G1** (2 clocks every 8 frames): felt all fight long, MEDIUM unchanged (108.8 s), escape margin 15 frames on HARD | G2 (2 every 4): +20 % on MEDIUM, 13 frames' margin on HARD; or G0 / the regenerating plates (priced in §6.4.2) |
| S4-2 | The core's signal | **the heartbeat as built** (the b3 flash on the core every 16 frames, 3 frames dimmed; 0 B outside the well) | a longer beat (e.g. every 24 frames), data only; or a colour cycle of the core's own glyphs (≈ 30 B, one glyph rewrite a step) |
| S4-3 | The first scanline under the band (COLPF2 first) | **do it here** (0 B, 0 cycles, every region's shot pixel right, the pin's assertions hold; `tests/boss-engine.test.mjs` gains the order) | leave it (the line as main has it) |
| S4-4 | Phase B's tuning | **by data, MEDIUM about 105 s, EASY shorter, HARD not shorter but nearer region 1's (≈ 155 s)**: the spires' hit points first (they bind the end), then EASY's own lever — HARD and EASY are the open part | move the spires one column inward (art; their reach 45 % / 56 %) |
| S4-5 | The band | **as drawn** (the palette violet hull `$62`, magenta `$58`, steel `$0C` / `$06`); the owner retouches the PNGs | — |

Phase B starts on the owner's answers: tests first (RED on `main`), the
chosen well as region 4's in every build (`--r4-variant` removed), the hit
points tuned, region 4's route sessions with the well's clauses, the
evidence regenerated.

#### 6.4.6 Phase A-2 — laser cannons beside the core, the gravity column (the owner's smoke of 2026-10-14)

**The owner's finding:** the pull works but is no threat, and a player cannot
see what is happening. Asked for: (1) laser cannons directly beside the core,
tougher than guns, behind the belt, so the pull drags the ship into their
fire; (2) a bright gravity column under the core while the well is on, from
the band down, following the drift, never in a laser's colour register, one
of P1 / P2 kept free for the M6 VOID LANCE; stress under 8,500; no resident
bytes. Standing answers for after this look are recorded in the brief (G1, the
scanline fix, the palette, the tuning rule, the spires' rule).

**Recommendation first.** The **straight shimmer column** (`g1s`): it reads
at once, costs 72 native on the worst frame (8,414 / 8,500) and keeps the
boss frames' margin ≥ 7,189; the wave (`g1w`) undulates and reads as a gravity
field, at 8,395 on the stress frame but ≈ 1,500–2,000 of margin on every quiet
frame it redraws (worst 5,675). Both use **missile M0**; P1 and P2 stay free.

**The cannons (data, `assets/graphics/boss-regions/region-4/`).** `cannon-l`
27–29 (slot 1) and `cannon-r` 34–36 (slot 2) hug the core, region 1's
projector tower, 12 HP (guns 6), each behind its own belt plate (plate-b
27–29, plate-d 34–36 — the belt under the core is now continuous, 27–36);
the open guns stand where the inner emitters were (gun-2 22–24, gun-3 39–41);
emitters 3 and 4 and the outer guns behind plates a and e. 16 modules, 108
codes, every stage with PF2 (`build/play/s5-4-a2-stages.png`).
**How they fire:** each cannon its own laser (slots 1 and 2), the four lasers
of decision AC on levels 10–12, at most two warning or firing at once
(`LASER_MAX_ON`), the existing rotation — 0 B. Why: AC's count stays four (a
twin pair would make it three), and the two cannons' beams are 7 columns (28
colour clocks) apart, so with both on there is a safe corridor of 17 positions
between them — exactly where the well's rest point (the ship under the core)
lies: the pull holds the ship in the eye and drags it **across** a cannon's
beam whenever it comes back from the sides.

**Fairness (S, the game's steps):** a beam endangers 11 positions of x; any
two beams are ≥ 28 clocks apart (cannon to cannon; cannon to emitter 36), so a
safe spot is never more than 11 clocks away. Escaping against both the pull
(G1) and the band's drift: **10 frames** at worst — EASY 40 → **30 left**,
MEDIUM 32 → **22 left**, HARD 25 → **15 left**.

**The PMG audit (file:line at `57933dc`).**

| Object | Register | In region 4's boss sector |
| --- | --- | --- |
| P0 | COLPM0 = `$0E` white (`src/main.s:579`; the shield booster pulses `$84`, `:585`, `:11490`) | the ship |
| **M0** | **COLPM0** (the ship's) | **the gravity column** (was parked, `src/hybrid/boss.s` `b2_prepare`) |
| P1, P2 | COLPM1 / COLPM2 — written every frame for the beams (`laser_publish`, `b2_prepare`) | **free** (the M6 VOID LANCE: either; the column uses neither) |
| M1, M2 | COLPM1 / COLPM2 = `$46`, white flicker in a warning | the laser beams |
| P3 | COLPM3 = gold `$1C` | the capsule (and the death fire's colours) |
| M3 | COLPM3 | parked |
| PRIOR | `$00` (never written in the boss sector; no fifth player) | — |
| collision registers | never read (`M0PL`/`P0PL` defined only, `src/main.s:96-100`) | — |

**No PMG object has a colour register of its own**: P1 / P2 are the beams'
(region 3's problem), P3 / M3 the capsule's gold, P0 / M0 the ship's white.
M0 was chosen: white as asked, no laser register; its price is that it wears
the ship's colour — where the ship sits in the column their pixels merge, and
with the shield booster on the column pulses blue with the ship. The
alternative is **M3** in the capsule's gold (the same code, one register
apart) — not white.

**The column (region 4's block code + 2 B of slot D + 8 B of slot E).** M0's
bits from line 64 (the first line under the band) to 239, in the missile
bytes the beams share (M0's bits only); `HPOSM0` centred under the core as the
band shows it (published by the band DLI's phase 0, like the beams: slot D's
`laser_publish` ends in a jump to slot E's `boss_m0_publish`); off screen (0)
whenever the pull is off — dying, respawning, the chain, both spires down.
Drawn a slice (22 lines) a quiet frame, never on a kill or exposure frame: a
one-time 176-line draw cost the first fight frame 2,500–7,000 of margin
(MEASURED, then fixed, `d58ca03`).
* **Shimmer (`g1s`):** quad (8 clocks) and double (4 clocks) width by 4-frame
  halves, re-centred.
* **Wave (`g1w`):** an S-bend over 16 lines (M0's left / both / right halves
  at quad width), one line in eight rewritten each quiet frame, the bend moving
  2 lines down every 8 frames.

**Measurements (M, MEASURED unless marked; t1 hit points, the cannons 12).**

| | G1 (A, no column) | **G1 + shimmer** | G1 + wave | label |
| --- | ---: | ---: | ---: | --- |
| region 4's block / sectors | 228 B / 2 | **353 B / 3** | 342 B / 3 | manifest |
| slot D / slot E | 1,661 (13) / 496 (4) | 1,663 (13) / 504 (4) | 1,663 (13) / 504 (4) | manifest |
| boss entry, host frames / sectors | 253 / 66 | **257 / 67** | 257 / 67 | M (limit 280) |
| stress, worst reachable warn / beam (8,500) | 8,338 / 7,605 (cannons in) | **8,414** / 7,681 | 8,395 / 7,662 | M-N |
| … finale warn / beam | 7,652 / 6,920 | 7,728 / 6,996 | 7,709 / 6,977 | M-N |
| … headroom to 8,500 (M6 VOID LANCE) | 162 | **86** | 105 | M-N |
| frames with a kill and a spawn | 0 | 0 | 0 | M-N |
| fight E / M / H (s) | — | 117.9 / 139.9 / 217.1 | identical (the column is visual only) | R |
| hits on the bot E / M / H (laser) | — | 5 (1) / 4 (1) / 22 (2) | identical | M |
| … of them under the pull | — | 4 / 3 / 19 | identical | M |
| escorts E / M / H | — | 16 / 18 / 25 | identical | M |
| boss frames worst margin E / M / H | — | **9,593 / 9,239 / 7,189** | 7,999 / 7,665 / 5,675 | M |
| … DMA-on max E / M / H | — | 29,917 / 30,509 / 30,365 | 30,023 / 30,508 / 30,429 | M |
| left edge (`boss-park-left-1`) | — | 18 hits | 18 hits | M |
| worst beam escape, frames left E / M / H | 30 / 22 / 15 | 30 / 22 / 15 | 30 / 22 / 15 | S |
| P1 / P2 | free | free | free | audit |

The cannons made the fight longer (MEDIUM 108.8 → 139.9 s, HARD 217 s) —
Phase B's tuning (standing answer: the spires' hit points first, then the
spires one column inward if EASY stays longer than MEDIUM). **`region-4-diag-*`
(the plain sweep) never reach the spires** — the chain clause fails on the
debug route as region 3's did before Phase B moved them to the aiming bot;
Phase B does the same for region 4.

**Review builds (`build/play/`, `atari800 -xl -pal -nobasic <absolute path>`).**

| ATR | SHA-256 (prefix) | What |
| --- | --- | --- |
| `s5-4-a2-r4-g1s-boss-route.atr` | `49a344e26df6aced` | **the shimmer column**, the cannons, G1 — entered at the boss |
| `s5-4-a2-r4-g1w-boss-route.atr` | `52ed04d6fe92e54c` | the wave column |
| `s5-4-a2-r4-g1s-level-route.atr` | `01d2c5a050244348` | level 1's content as level 10, then the boss (shimmer) |
| `s5-4-a2-r4-g1w-level-route.atr` | `b756661f77db4650` | the same, wave |

Contact sheets from the emulator (Atari800 frames, `DFTRACE_SHOT_*`):
`s5-4-a2-column-shimmer-sheet.png`, `s5-4-a2-column-wave-sheet.png` (32
consecutive frames each, cropped round the column; the core's heartbeat shows
in frames 5–7), `s5-4-a2-column-shimmer-wide.png`, and
`s5-4-a2-shimmer-beside-cannon.png` / `s5-4-a2-wave-beside-cannon.png`
(cannon-l's warning line beside the column, 16 frames). Previews:
`s5-4-a2-band-preview.png`, `s5-4-a2-stages.png`, `s5-4-a2-plates-gone.png`.

**Owner questions (A-2).**

| # | Question | Recommended | Alternative |
| ---: | --- | --- | --- |
| A2-1 | The column's look | **the shimmer** (cheap, readable, margin ≥ 7,189) | the wave (reads as a field; margin ≥ 5,675, 19 more native of stress headroom) |
| A2-2 | The column's register | **M0 (the ship's white)** — as asked, no laser register; the ship merges with it where it sits in the column, and it pulses with the shield | M3 in the capsule's gold (same bytes; not white) |
| A2-3 | The cannons' fire | **independent, four lasers, two at once (AC)** — the corridor between the cannons is the well's eye | the cannons as a twin pair (one laser between them; levels 10–12 then have three) |

#### 6.4.7 Phase B — as built (2026-10-14) — `OWNER-SMOKE CANDIDATE`

**The owner's answers to §6.4.6 (journal §AQ).** (1) The column as the
**wave**. (2) **M0, white.** (3) The cannons **independent**. (4) **The well
must pull the player into danger** — no safe spot on its axis: preferably the
cannons moved inward so their beams cover the core's column; else the core
fires its own beam down the gravity column; fairness a hard rule (≥ 10 frames
left on HARD). Standing answers: G1; the scanline fix here; the palette as
drawn; the fight length rule (spires' and cannons' hit points first, then the
spires one column inward without asking); `region-4-diag-*` on the aiming
bot; the records below.

**Answer 4 — why the alternative.** A beam hits the ship when its left edge
is within −3 … +7 colour clocks of `player_x` (`laser_collide`, 4-clock beam,
`LASER_PLAYER_WIDTH` 8); for the well's rest point that puts the beam's lens
in band column 30 or 31 — inside the core. The cannons are 3-cell towers that
cannot overlap the core: hugging even a one-column core they leave a corridor
between their beams (a 2-column core: 9 clocks of safe x right of the rest
point). So **the core fires its own beam**: `core-lens`, a 3 × 1 lens emitter
under the core in the belt row (30–32, lens column 31, laser slot 2); **the
well's axis is its beam** — the pull's target is the x whose hit window its
beam centres on (`GRAVITY_X_BASE` = beam centre − 4), the column is centred
on it (`GRAVITY_AXIS`), flares in the beam's warning (shown by 2-frame
groups) and gives way to the beam. **The lens is covered by both spires**: it
cannot be hurt while the well is on, yet it fires — the well's block code
counts its reload while it is covered (`laser_rearm` counts an exposed
emitter's only; `laser_admit` and `laser_frame` then run it as any other); the
spires down, it is exposed, fires at once (the shield's first shot) and can be
destroyed; the core falls after it. (First built exposed: on the route session
`region-4-diag-0` the aiming bot destroyed it before its first reload and the
axis was a refuge for the rest of the fight — MEASURED, then covered.)
**Consequence (recorded):** the engine has four laser slots and takes at most
four emitter modules (slot 1 twice at most); independent cannons + the lens +
two outer emitters would be five, so **the outer emitters became pulse guns**
(gun-5, gun-6): three lasers on levels 10–12, all at the well (cannon-l 1,
core-lens 2, cannon-r 3). Decision AC sets the slots a tier enables; region 1
also authors fewer emitters than its tier.

**The band as built** (`assets/graphics/boss-regions/region-4/`,
`scripts/boss-r4-art.mjs`; previews `build/play/s5-4-band-preview.png`,
`s5-4-stages.png`, `s5-4-plates-gone.png`, the spires before / after
`s5-4-spires-before.png` / `s5-4-spires-after.png`):

| Columns | Rows | What |
| --- | --- | --- |
| 14–49 | 0 | the deck, whole, corners cut |
| 12–13, 50–51 | 0–3 | spire-l, spire-r (salvo; **one column inward** — standing answer, EASY ran longer than MEDIUM — against the hull's sides; the vents in the hull's feet, 14 / 49 row 3) |
| 30–32 | 1–3 | the void core (3 × 3, round on screen; no stages; cover: core-lens and the spires) |
| 30–32 | 4 | **core-lens** (the axis; cover: the spires) |
| 27–29, 34–36 | 1–3 | **cannon-l, cannon-r** (slots 1, 3), each behind its own belt plate (plate-b, plate-d) |
| 15–17, 18–20, 43–45, 46–48 | 1–2 | gun-1, gun-5, gun-6, gun-4 behind plate-a (15–20) and plate-e (43–48) |
| 22–24, 39–41 | 1–2 | gun-2, gun-3 in open bays |
| 21, 33, 42 | 1–4 | struts and the core's right flank |

16 modules, **106 of 128 codes**, charset **848 B, 7 sectors**, look tail
80 B, 5 shown rows; PF2 in every stage of every module (test).

**The well's code** (`src/hybrid/boss.s`, `BOSS_GRAVITY`; region 4's block
**406 B, 4 sectors** — the look tail 80 B in its 110, the code 296 B; the
data in `modules.json` `gravity`, resolved by `scripts/boss-assets.mjs`): the
pull (G1, 2 clocks every 8 frames), the axis laser's reload while covered,
the column's flare, the pulse (the core's b3 flash every 16 frames), the wave
(one line in eight a quiet frame, never on a kill or exposure frame).
Shared slots: slot D +2 B (1,663 B, 13 sectors), slot E +8 B (504 B, 4
sectors). Resident, window, slot A, install, slot C, initial block: 0 B.
**The scanline fix:** the band DLI's phase 1 writes COLPF2 first after the
charset (0 B; `tests/boss-engine.test.mjs` re-pinned with the reason).

**Fairness (owner answer 4's hard rule).** MEASURED on the 6502 harness
(`tests/boss-region-4.test.mjs`): from every x inside the axis beam's hit
window, every band position and direction, every phase of the pull, holding
away from the axis against the pull and the drift — **worst 5 frames** to
leave: **35 / 27 / 20 frames of the warning left** (EASY / MEDIUM / HARD; the
rule ≥ 10). The analytic worst (crossing the whole 11-clock window against the
pull and the drift): 10 frames — 30 / 22 / 15 left.

**The fight (the aiming bot's ratio; trials on the level route):**

| trial | spires / core / lens / cannons / guns / plates | E / M / H (s) |
| --- | --- | ---: |
| A-2 | 10 / 14 / — / 12 / 6 / 5 (the inner emitters) | 117.9 / 139.9 / 217.1 |
| t0 (the lens, exposed) | 10 / 14 / 16 / 12 / 6 / 5 | 137.6 / 138.2 / 207.0 |
| t2 | 5 / 14 / 12 / 8 / 6 / 5 | 98.4 / 87.3 / 172.9 |
| t3 (spires inward) | the same | 77.0 / 86.6 / 139.8 |
| t6 | 6 / 16 / 14 / 10 / 7 / 6 | 87.0 / 119.6 / 153.0 |
| u1 (the lens covered) | the same | 97.4 / 105.4 / 166.3 |
| **u3 (shipped)** | **6 / 12 / 10 / 10 / 7 / 6** | **91.8 / 102.2 / 158.3** |

EASY shorter, MEDIUM about 105, HARD 4 s from region 1's 154. Between t2 and
t8 MEDIUM stepped between ~89 s and ~120 s with no hit-point value between
(the spires' reach windows, one band cycle each); covering the lens moved the
spires' fall earlier in the fight and opened the middle.

| | E | M | H | label |
| --- | ---: | ---: | ---: | --- |
| hits on the bot (laser) | 4 (2) | 7 (3) | 10 (3) | M (`boss-aim-N`, level route) |
| … under the pull (laser) | 3 (2) | 4 (2) | 7 (3) | M |
| deaths (lives held) | 1 | 3 | 2 | M |
| escorts | 12 | 14 | 18 | M |
| the pull on (frames) / steps | 1,670 / 194 | 1,748 / 211 | 2,669 / 330 | M |
| boss frames worst margin / DMA-on | 7,503 / 30,090 | 6,881 / 30,433 | 7,077 / 30,503 | M (gate 32,568) |
| boss entry | 261 host frames, 68 sectors | | | M (limit 280) |

**Stress (native, `scripts/measure-boss-stress-r4.mjs`, `tests/boss-region-4.test.mjs`):**
worst reachable **8,315** (two kills, two lasers in their warning's heat
step, a spire's salvo due, the well's step and pulse due) — **185 to the
8,500 limit**; 0 frames with a kill and a spawn. **The M6 headroom and the
reclaim candidates** (the VOID LANCE runs in the boss sector too): the
lasers' warning heat step on a kill frame ≈ **770** native (the same
composition with the beams on: 7,452 against 8,224); the well's step and
pulse request on that frame **154** (8,224 without them); the second kill of
a two-kill frame (AUD-04's cap). Recorded in plan
[gameplay-variety.md](gameplay-variety.md) §3.5 (the M6 note) and STATUS.

**Design rules (the owner, 2026-10-14; STATUS, this plan, the M6 note):**
1. **A module that gates the end of the fight must not sit at the band's
   extreme ends** — its reach windows, not its hit points, bind the fight.
2. **A boss's signature mechanic must create danger, not a refuge.**
3. **PMG in the boss sector:** the gravity column is **M0** (COLPM0, the
   ship's white; region 4 only); **P1 / P2 free** for the M6 VOID LANCE
   reticle (their colour registers are the beams', written every frame);
   M1 / M2 the lasers; P3 / M3 the capsule (gold); P0 the ship.

**Tests.** New `tests/boss-region-4.test.mjs` (12): 11 RED on `main`
`e7d9020` (11 of 11, in a detached worktree, removed), GREEN here; the
twelfth (the axis fires while covered) added with the covered lens.
Re-pointed with their reasons at the sites: `boss-lasers` (M0 the column),
`boss-look-tail` (region 4's block), `boss-overlay`, `level-summary-build`
(region 4 its own draft), `slot-f` (`BOSS_G_CODE`), `boss-region-3` (region 4
has code); re-pinned: `boss-engine` (phase 1's colour order, the scanline
fix). `scripts/memory-map-report.mjs` names `BOSS_G_CODE`.

**The trace.** `gravity_on`, `gravity_steps`, `gravity_column` columns; the
well's clause on region 4's route sessions (subject: boss frames with the
pull on): never on a frame that starts with the ship not alive; at most one
step per 8 frames of a run, x even; once off with the ship alive, never on
again, and off at the chain; the column never without the pull.
`region-4-diag-*` and `region-4-finale-*` on the aiming bot. MEASURED, the seven sessions on `build/boss-region-4-level-1-s6`,
every clause holding (the diag and finale sessions are the same replay since
both play the aiming bot):

| session | entry | the pull on / steps | the column shown | off for good | chain | worst margin / DMA-on |
| --- | --- | ---: | ---: | --- | --- | --- |
| `region-4-diag-0` / `-finale-0` (EASY) | 261 | 3,065 / 367 | 2,560 | f3,614 | f3,713 (finale from f906, 13 volleys) | 6,765 / 30,426 |
| `region-4-diag-1` / `-finale-1` (MEDIUM) | 261 | 2,339 / 278 | 1,962 | f3,710 | f4,039 (f996, 16) | 7,423 / 30,429 |
| `region-4-diag-2` / `-finale-2` (HARD) | 261 | 2,849 / 348 | 2,203 | f4,220 | f4,588 (f1,185, 16) | 6,942 / 30,353 |
| `region-4-dodge-2` (HARD) | 261 | 2,332 / 290 | 1,787 | — | — | 11,543 / 28,154 |

The column is hidden on the frames of the axis's beam and half of its
warning's (the flare). The clause's first form judged a death frame by its
end-of-frame lifecycle (the well tests it when it runs: a death later that
frame left the pull on) — a harness fix, judged by the frame-start lifecycle.

**Gates and evidence.** Evidence bound at `69e38b6` (ATR `3a8f014d…`,
boot `c473b3a1…`; build:candidate -> runtime:wall-trace -> --menu-raster-only
-> build -> memory-map -> showcase:gif -> showcase): 58 replays, 0 clause
failures, 0 miss events; worst fence margin 1,260 and DMA-on 31,483
unchanged, every replay's summary equal to `main`'s (`e7d9020`); region 1's
boss frames (director-complete) 9,219 / 29,902 -> 9,191 / 29,821 (the
scanline fix's store order and the M0 publish in the shared slot D); every
stress composition but region 4's +14 native (region 1 7,046, the fixture
7,836 / 6,880, the finale layouts 6,715, region 3 7,824 / 8,077), region 4
8,315 of 8,500. Two full `npm test` runs on the default build: 1,366 tests,
1,365 pass, the recorded preview failure only; `failures:reconcile` 0 NEW,
0 MOVED after each.

#### 6.4.8 `fix/r4-immobile` — the still citadel (2026-10-14) — `OWNER-SMOKE CANDIDATE`

**The owner's smoke of the merged citadel:** the boss makes sense, but its
horizontal drift together with the gravity well is a mishmash. Asked: no drift
in region 4 (regions 1-3 unchanged; region data and the boss overlay only, 0
resident bytes), the whole ship on screen and centred, the engines removed if
that is art and layout only, the pull one step stronger (G1+, 2 colour clocks
every 6 frames) with G2 (every 4) to compare; fairness a hard rule. Phase C
(a look) then the owner's answers (journal §AR): **G2**, the refuges next to
the core closed by narrowing the gap between the cannons and the lens (option
3; no gun bursts - the stress headroom stays for M6), the engines stay
removed, the banner task's entry headroom left to that task.

**What changed.**

| | before (`main` `53847b2`) | after |
| --- | --- | --- |
| band | drifts 0-63 and back, one colour clock every 2 frames | **still at position 32** (`motion.framesPerColourClock` 0: the install leaves `boss_dir` 0, `boss_motion` adds nothing; the converter keeps a still band's start inside 1..travel-1, where it never turns); the win's shake stays |
| ship | columns 12-51 (40), the hull 14-49, open bays with two empty columns each side | **14-49 (36)**: the bays closed up, the hull 16-47, the spires 14-15 / 48-49 against its ends - HPOS 56-199 at position 32, 8 clocks clear each side of the screen (48-207) |
| engines | a vent cell at each end of the hull's foot | **none** (the converter takes empty nozzle lists; the engine still steps the two nozzle codes' glyphs, unseen) |
| cannons | 3 x 3 towers at 27-29 / 34-36, beam edges 112 / 140 | **2 x 3 at 28-29 / 33-34**, beam edges 114 / 134 (region 1's tower without its outer flanges, `emitter.png`); the plates b / d under them 2 wide; walls at 27 and 35-36 |
| pull | G1, 2 clocks every 8 frames | **G2, every 4** |
| hit points | spires 6, core 12, lens 10, cannons 10, guns 7, plates 6 | spires 11, **core 29, lens 26**, cannons 18, guns 12, plates 10 |
| install | 374 of 384 B | **381** of 384 B |

**Why the ship had to shrink, not only stop.** A player's shot leaves the
fighter's centre, x + 8 with x 48..200: HPOS 56-208, band columns
(24 + p) / 4 .. (176 + p) / 4 at position p - two fewer than the screen shows.
Centred at 32, the old ship's left spire (columns 12-13, HPOS 48-55) was out
of every shot: the well would never fall and the fight never end. On a still
band the S5-4 rule "a module gating the fight's end does not sit at the
band's extreme ends" becomes the test's rule: every module in the player's
reach (`tests/boss-region-4.test.mjs`).

**The refuges (answer 2).** A still band no longer sweeps the guns' fire
across the screen. A beam threatens x in [edge - 7, edge + 3]; three-cell
emitters beside the three-cell core leave a two-clock hole between beams -
x 116 (between cannon-l's and the lens's: the lens and the core shootable from
outside every laser) and 128-132. The 2-cell cannons put the three beams edge
to edge: x 108-136 under fire. MEASURED (the coverage model,
`scripts/boss-coverage.mjs --region=4 --lasers=4`, now counting a still band's
one position, every laser slot, and no core as a weapon), every weapon alive:
the gaps are 48, 74-76, 86-92, 102-106, 138-144, 154-160, 170-172, 182-184; the
endgame's reach (x 112-122, the shots meeting the lens's or the core's
columns) holds none. From 102-106 a shot meets cannon-l, not the core. While a
spire stands the pull drags the ship off any gap towards the axis.

**Measurements** (M emulator trace, M-N native harness, R the aiming bot's
ratio).

| | value | label |
| --- | --- | --- |
| escape from the warned axis beam against the pull, worst | 4 frames: **36 / 28 / 21 left** (E / M / H; rule >= 10) | M-N |
| fight, Phase C untuned (G1+ / G2, the old cannons) | 65.7 / 60.4 / 85.1 s; 70.9 / 60.4 / 88.6 s | R |
| fight, x 1.75 (d1) / the core 25, the lens 22 (d2) | 87.7 / 100.9 / 145.2 s; 90.2 / 104.1 / 148.9 s | R |
| **fight, as built (d3: the core 29, the lens 26)** | **92.6 / 107.3 / 154.3 s** | R |
| hits on the bot (laser), as built | 11 (2) / 17 (1) / 21 (3); deaths 2 / 2 / 3; escorts 13 / 15 / 18 | M |
| boss frames, worst margin / DMA-on (the aim runs) | 7,163 / 30,277; 6,527 / 30,204; 6,849 / 30,440 | M |
| stress, region 4's worst reachable | **8,094** of 8,500 (main 8,315): 406 left for M6 | M-N |
| entry | 261 host frames, 68 sectors (limit 280: 19 left; the banner task's ~25 does not fit - STATUS) | M |
| region 4's charset, block | 108 of 128 codes, 864 B (7 sectors); 406 B (4 sectors) | M |

The aiming bot led its aim for a drifting band (region 1's motion): on the
still band it shot two columns beside its target and never finished. It now
leads only when the region's motion byte drifts (`DFTRACE_BOSS_MOTION_STEP`,
region 1's path unchanged); the stress composition and the coverage model take
a still band's one position.

**Tests.** `tests/boss-region-4.test.mjs` 15 (12 + the band never moves,
everything on screen and in reach, no refuge in the endgame's reach): RED on
`main` `53847b2` 6 of 15 with this branch's coverage model (the data, one
ship, the pull, the band, on screen, the refuge at x 116); fairness passes on
`main` too (a guard). Re-pinned, exact layout values with their source: the
hit points (the tuning above), G1's 8 -> G2's 4 frames a step (answer 1), the
deck 14-49 -> 16-47 (the compacted hull). The trace: the manifest records a
still band's position (`stillAt`), and the well's clause on the region routes
holds the band there on every fight frame.

**Gates and evidence.** Worst fence margin 1,260 and DMA-on 31,483 unchanged (58 replays, 0 misses, 0 clause failures); region 1's boss frames 9,191 / 29,821 and entry 249 unchanged; region 4's entry 261; the install 374 -> 381 of 384 B (transient), 0 resident bytes. The evidence bound to ATR `fee54bea...` (build:candidate -> runtime:wall-trace -> --menu-raster-only -> build -> memory-map -> showcase:gif -> showcase); full `npm test` twice, 1,368 of 1,369 (the recorded preview failure), reconciled PASS, 0 NEW, 0 MOVED. Two diagnostic region route sessions (region-4-diag-1, finale-1) hit the level-end stats clause by one shot - a shot fired on the boss's completion hand-off frame, counted by the observer but not by the game's `stats_scan` (earlier in the frame); pre-existing, reported, not changed (STATUS).

---

### 6.5 S5-5 (2026-10-15, `feat/boss-region-2`) — the Bastion: hangar, cannons, sliding rails — Phase A

**Recommendation first.** Ship the Bastion as **N-C with the t1 hit points**:
a one-cell hangar column (the core under a cap, the doors under it) at
column 31, the two laser cannons two cells wide hugging it, a sliding rail
of four 3-cell guns each side - the owner's estimate for the rails (two safe
slides, the third covers the cannon, a fourth gun left on the stopped rail);
cannons 8, rail guns 12, doors 28, core 32 hit points. Everything is inside
its limit: entry **253 host frames** (66 sectors; 27 left under 280 for the
banner task's ~25), stress **7,920** native worst reachable (580 left under
8,500), boss frames >= 8,713 of margin, DMA-on <= 30,218, **0 resident bytes,
0 bytes of slots A-D**, slot E +7 B (511 of 512, still 4 sectors), region 2's
block 510 of 512 B. The fight by the aiming bot's ratio: **careful 90.0 /
105.8 / 152.2 s**, careless 82.2 / 97.3 / 130.1 s (E / M / H).

**What the data says about the order puzzle (the owner should know before
choosing).** In no geometry does the *aiming bot* find the careless order
harder in hits: careless skips the cannons' hit points (the fight 8-20 %
shorter) and the covered cannons add 1-4 laser hits (careful 0-1), with one
more death on HARD; most hits on a bot that never dodges are the boss's pulse
shots and the core's volleys. Two geometric facts drove the design:
1. **A beam endangers x in [edge - 7, edge + 3]** (`laser_collide`, the ship's
   collision box is its left eight clocks while its shot leaves its centre):
   a beam threatens far to its left and only a clock to its right. Beside the
   owner's 4-cell hub the two beams leave a corridor (x 116-132) over the
   whole hangar - a covered cannon never threatens a player shooting the doors
   or the core (G-A, G-B: the refuge the owner's rule forbids). A 2-cell core
   between hugging cannons still leaves its centre column (x 122, where the
   bot stands) between the beams (N-A, N-B). Only a **one-cell core and doors**
   put their whole reach (x 116-119) under the left cannon's beam - and under
   the core's own volley (columns 30-32), closing the endgame's last gap (N-C).
2. **The hit points decide the rest:** cheap cannons and heavy doors / core
   (t1) shrink careless's saving to ~8 % and keep a careless player longer
   under the covered beams. More levers for Phase B are listed in the
   questions (S5Q-4).

**Step 0.** `main` `131fd8f` (S5-4 §AQ, r4-immobile, interceptor-speed §AS
merged), clean; worktrees: the primary checkout only; `dist/` ATR
`0f639496...`, boot `e3d3b9e8...`. Branch `feat/boss-region-2`. Every Phase A
build is a review variant (`--boss-variant=r2ga|r2gb|r2na|r2nb|r2nc[t1]`): **the
default build stays byte-identical to `main`** (ATR `0f639496`, rebuilt and
compared at every commit).

**Baseline (each with its source; the brief agrees).** Worst fence margin
1,260 (`2-sweep-fire6`), DMA-on 31,059 (STATUS, interceptor-speed; the trace);
region 1's boss frames 8,869 / 30,211 (STATUS); stress region 1 7,046, the
tier-4 fixture 7,836 / 6,880, the finale layouts 6,715, region 3 7,824 /
8,077, region 4 8,094 (MEASURED on this tree = `main`, `tests/boss-stress`,
`boss-region-3`, `boss-region-4`); entry R1 249, R3 256 (67 sectors), R4 261
(68) host frames (STATUS); 58 replays, 16 boss entries, 0 clause failures;
window 1,322 / 1,387, Light kernel 847 / 875, slot A 2,047 / 2,048, slot E
504 B code (4 sectors), initial block 13,623 B / 107 sectors (manifest);
fights R1 97.4 / 111.0 / 152.7, R3 109.3 / 112.3 / 174.9, R4 100.2 / 107.0 /
139.3 s (STATUS); `npm test` 1,374 with the recorded preview failure (STATUS).

#### 6.5.1 Audit — what region 2 takes from the shared boss code (file:line at `131fd8f`)

| Need | Where it is | What S5-5 does with it |
| --- | --- | --- |
| A module's columns at run time | `src/hybrid/boss.s` `boss_mx` / `boss_mxe` (`:1648`, BSS), the module record's x (`BOSS_T_MODULES`, slot B RAM, read by `boss_draw_module` `:1156`, `boss_fire` `:726`, `boss_capsule_kill` `:2132`, the trace's aim bot) | **all RAM**: a slide adds ±1 to every rail gun's record x and span each column step - draws, fire columns, the capsule and the bot follow |
| Hit detection | `boss_shot_meet` (`:1574`): column = (x - 32 + p) / 4, `boss_column_map` + `boss_stop_y` (scratch page); `boss_column_at` (`:1253`) the front-first walk, `boss_column_base` (`:1279`) the hull bitmap and the hull-stop table (look tail) | a step **shifts the map entries and stop lines** with the cells (one copy loop); the static tables are read only by `boss_prepare` and a kill's rebuild |
| A kill's columns | `boss_module_scored` (`:3060`) → `boss_rebuild_module` (`:1329`): only the dead module's columns, later live modules first, else the static hull | every rail-gun kill happens in its rail's **front-gun slot** (the next gun locks in there), so the converter gives that slot's columns the stop under the rail's last row: a dead socket stays solid with **no code** |
| Covering | the column map's front module | a slide shifts the rail's entries over the cannon's columns: the rail is their front, the cannon's columns deflect (hull path, `boss_hit` `:588`) |
| Cover and exposure | `src/c/boss.c` `boss_expose` (`:215`), the record's cover bytes (RAM); `boss_c_hit` (`:331`), the defeat at `boss_weapons_left == 0` (`:376`) | a covered cannon: `boss_weapons_left` - 1, its bit cleared from the doors' cover, the exposure check asked (`boss_expose_pending`); the guns behind the front one carry the core's bit (the lock) until they lock in |
| Rule (B), the fire countdown | `boss_c_tick` (`:454`, `:480`) | unchanged; a locked-out gun is not exposed, so never armed - it never fires on the move |
| Lasers per tier, twins | slot D `laser_tier`, `laser_prepare` (`:1797`), slot E `laser_twin_index` (`:2045`), `laser_rearm` (`:1936`, counts an exposed emitter) | a covered cannon stays exposed to the controller: it reloads and fires; **the twin pair is independent from tier 2** (`BOSS_RAIL` builds: +7 B of slot E, 511 of 512) - one beam on level 4, two on levels 5-6 (decision AC) |
| A beam's heat on a covered cannon | `laser_warn` (`:2480`): the ring's heat glyph on the emitter's bottom-centre cell | that cell is now the rail's: the heat shows on the rail (the warning stays visible); the ring's records are given back before every step |
| Region code | slot F `BOSS_F_HOOK` = `$526E` (`:3414`), called from `laser_frame` (`:2406`) and `boss_shots_late` (`:2192`) | **`BOSS_RAIL`**: 400 B of code at `$526E`, its tables and state in the block's room between the 80-B look tail and the hook (`BOSS_R_DATA`) |
| The escort | `src/c/director.c` `director_c_boss_weapon_down` (`:594`), `director_c_boss_escort_frame` (`:615`, `$80FD` the clock); its column the wave's `entry` (`src/c/lifecycle.c:1014`; level 1's boss wave: the default 124) | entry 124 is band column 31 at position 32 - **the doors' column**: the escort launches from the doors with 0 bytes; the block flashes the doors (b3) at the clock's 6th frame and zeroes the clock once they fall |
| Hit flash b3 | slot E `boss_mflash_frame` (`:2574`) | every module; the cover warning and the launch cue are its requests |
| Title | `modules.json` `"name"` → the theme run | BASTION (the placeholder's name already) |
| Stress | `tests/boss-stress.test.mjs` | `scripts/measure-boss-stress-r2.mjs` (new): every rail-position pair, kill frames and step frames |

**Where the brief and the repo disagree (reported).**
* **"A gun about 3 columns wide + 1 gap; the rail front at the outermost
  on-screen position; about 12 columns between the edge and the cannon."**
  Measured on the band: the screen shows columns 12-51 at the still position
  32, a shot reaches **14-52** (HPOS 56-208) - the outermost gun slot in reach
  is 14-16. G-A is exactly the estimate (2 safe slides, the third covers, 4
  guns a side). The hub's width is the disagreement: the estimate's 3-4-cell
  hangar with 3-cell cannons beside it leaves a corridor between the beams
  over the whole hangar (above, fact 1).
* **"The rail front blinks while one position from the cannon."** Region 2's
  block has 2 B left (400 of 402 B of code): a three-cell blink with its
  restore costs ~45 B. Built instead: **the gun whose fall would cover the
  cannon pulses** (its b3 flash every 16 frames, ~20 B) - the dangerous
  target is marked, not the rail. The blink stays an option if bytes are
  found (S5Q-5).
* **"Shots that hit the rail over a covered cannon are deflected; its beam is
  drawn from under the rail."** As built - but the cannon is hidden: the rail's
  cells replace its cells (character graphics cannot overlay), the beam leaves
  from under the rail, its warning heat shows on the rail.
* **A rail gun may be hit while it moves (brief: "hit detection follows the
  rail exactly").** Built: the next gun is **locked out while its rail slides**
  (covered by the core's bit until it locks into the front slot): a shot at a
  moving gun deflects, it never fires on the move, and no second slide can
  queue during one. Hit detection follows every column step exactly (the
  harness: a gun's columns hit, its old columns not).
* **Step on hit frames.** A column step costs ~1,700 native; on a frame with
  two non-kill hits and both lasers warning it measured **9,663** (over 8,500).
  A slide now steps only on a frame no shot met the band (AUD-04's count) and
  not the exposure check's: worst **7,920**.

#### 6.5.2 Geometry (MEASURED on the band; diagrams `build/play/s5-5-r2-geometry-*.png`)

Band columns at the still position 32: the screen shows **12-51**, a shot
reaches **14-52**; HPOS = 4 x column. One shift = one gun pitch.

| | G-A (estimate) | G-B (+1 safe shift) | N-A | N-B | **N-C (recommended)** |
| --- | --- | --- | --- | --- | --- |
| hangar / core / doors | 30-33 / 31-32 / 30-33 | same | 31-32 / 31-32 / 31-32 | same | **31 / 31 / 31** (one cell) |
| cannons (rows 1-3) | 27-29, 34-36 (3 cells) | same | 29-30, 33-34 (2) | same | **29-30, 32-33** (2) |
| gun width / pitch | 3 / 4 | 2 / 3 | 3 / 4 | 2 / 3 | **3 / 4** |
| left rail front, start → each slide | 17 → 21 → 25 → **29** | 17 → 20 → 23 → 26 → **29** | 18 → 22 → 26 → **30** | 18 → 21 → 24 → 27 → **30** | **18 → 22 → 26 → 30** |
| front-gun slot (left / right) | 14-16 / 47-49 | 15-16 / 47-48 | 15-17 / 46-48 | 16-17 / 46-47 | **15-17 / 45-47** |
| safe slides before covering | 2 | 3 | 2 | 3 | **2** |
| guns per side (slides + 1) | 4 | 5 | 4 | 5 | **4** |
| modules / codes / charset | 12 / 105 / 840 B (7) | 14 / 99 / 792 (7) | 12 / 88 / 704 (6) | 14 / 82 / 656 (6) | **12 / 75 / 600 B (5)** |
| the slide window (columns a step shifts) | 18 | 18 | 19 | 19 | 19 / 20 |

Each slide's front and the rail's cells move one column per step (4 frames a
step, 12 frames after the kill: ~28 frames a slide); the girder runs to the
band's edge, so at every position the rail runs off the screen; the next gun
peeks in at column 12 (left) and 51 (right). G-B's alternative look: 2-cell
guns (their barrel on the cells' boundary). Other options priced: a shift
smaller than a pitch (the next gun revealed over two kills) needs a gun to
lock in on every other kill - the lock's code twice (no room in the block).

#### 6.5.3 The design (review variants; previews in `build/play/`)

**The ship** (`scripts/boss-r2-art.mjs`, drafts in
`build/boss-variants/r2*/region-2/`): one overhead **track** (row 0) from
screen edge to screen edge, rivets every other column (the slides read against
them); the **hangar** at the centre - G-A/G-B a 4-cell sphere with the core
inside, N-* a cap over the core column - the **doors** under it (row 4, amber
hazard chevrons); the **laser cannons** (region 1's tower; 2-cell as region
4's) hang from the track beside it; outside them the **rails**: a lattice
girder (row 1) under the track from the band's edge to the rail's front (a
hazard-striped buffer, rows 1-3), its guns hanging from it (rows 2-3); a dead
gun leaves an **empty socket** (the region's cavity glyph: a dark rack). Still
band at 32 (the slides are the only motion). Palette: pale steel `$0C`, mid
steel `$06`, hazard amber `$28` (hue 34°, 168° from the ally steel `$88`),
olive bulk `$E2` (hue 82°, 144°) - every hued register >= 45° from `$88`.
5 shown rows. Every stage of every module has colour-3 pixels
(`s5-5-r2-*-stages.png`: intact / cracked / broken, normal and flashed).

**The fight.** Cannons and each rail's front gun exposed from the start;
behind each front gun its rail's others (each covered by the one in front, and
locked); the **doors** open when every cannon and every rail gun is destroyed
or covered (cover = the cannons and the rails' last guns); the **core** - a
salvo launcher (reload 90) - opens behind them and falls last (the defeat, the
last weapon). The finale (the doors are the region's only armour): the core's
volleys at half reload. Escort: region 1's cadence (after the first weapon
kill, 150 + 0..63 frames, one at a time), launched from the doors (column 31)
with the doors' flash as the cue, none after the doors fall (the block zeroes
the Director's clock) and none after the boss falls (as before).
* **Rail kill:** the front gun dies (its spark, its gone draw - the socket);
  12 frames on the rail slides one pitch, one column every 4 frames with a
  clank on channel 3 (the hull tick's poly4); the next gun locks into the
  front slot and is exposed on the next tick.
* **Cover:** the slide that reaches the cannon covers it: a standing cannon
  is hidden behind the rail's dead socket and buffer, shots there deflect, its
  beam keeps firing from under the rail (its heat on the rail), the defeat and
  the doors stop waiting for it. A destroyed cannon is simply passed over.
* **Warning:** one slide from covering a standing cannon, the front gun (the
  one whose fall covers it) pulses every 16 frames.
* The rail never reaches the hub (the converter proves it for every layout).

**The previews (`build/play/`):** `s5-5-r2-ga-sequence.png` and
`s5-5-r2-nc-sequence.png` (the harness's band through a scripted fight: the
start, mid-slide, each slide, a cannon covered with its heat showing, all rail
guns gone, the doors open, the doors gone), `s5-5-r2-geometry-{ga,gb,na,nb,nc}.png`
(one side at every rail position, the ruler: green the screen, cyan the
shots' reach, red the cannon, amber the hangar), `s5-5-r2-{ga,gb,na,nb,nc}-stages.png`.

**The block code** (`src/hybrid/boss.s` `BOSS_RAIL`; the converter's `rails`
and `hangar` blocks, `scripts/boss-assets.mjs`; `boss-rail.inc` from
`scripts/build.mjs`): 400 B at `$526E` (the late hook only; the frame hook is
an `rts`) + 30 B of tables and state in the block's room after the look tail.
Per frame (IC): ~60 cycles idle, a kill's detection ~40, a column step ~1,700
(the ring's records given back, 19-20 columns x 5 arrays shifted, 4 guns
moved). Shared code: slot E +7 B (the twins' tier rule, `BOSS_RAIL` builds
only); slots A, C, D, install, window, Light kernel, resident: 0 B.

#### 6.5.4 Measurements (M emulator trace, M-N native harness, R the aiming bot's ratio, S the coverage model)

Routes: `node scripts/build.mjs --boss-variant=r2<v> --boss-region=2
--level=1:sector=0` (level 1's content as level 4, then the boss; tier 1) and
`--laser-fixture=2` added (tier 2: levels 5-6's two lasers); `sector=6`
entered at the boss. Sessions `boss-aim-careful-N` / `boss-aim-careless-N`
(new: the aiming bot preferring the emitters / the pulse guns),
`boss-aim-N` (the plain bot = careful here: the cannons are nearest),
`region-2-dodge-2`, `boss-park-left-1`. Seconds = frames x plain[d] /
aimMain[d] / 50 (3,834 / 4,612 / 5,964 over 1,847 / 2,231 / 2,663, region 1's
rule).

**Fight time (R), E / M / H, tier 1 (level 4); careful | careless:**

| variant (hit points gun / cannon / doors / core) | careful | careless | hits on the bot careful / careless (laser) E, M, H | deaths careful / careless E, M, H |
| --- | --- | --- | --- | --- |
| G-A (12/16/16/24) | 87.3 / 106.8 / 149.5 | 77.7 / 86.1 / 119.3 | 7(0)/8(1), 15(1)/16(1), 21(1)/19(1) | 0/1, 2/1, 3/2 |
| G-B (12/16/16/24) | 102.2 / **134.9** / 168.7 | 93.9 / 107.1 / 143.2 | 7/10, 22/17, 21/22 | 0/1, 2/2, 3/3 |
| N-A (12/16/16/24) | 87.3 / 110.2 / 145.5 | 75.5 / 90.6 / 116.6 | 8/9, 15/18, 21/16 | 0/1, 2/1, 3/2 |
| N-B (12/16/16/24) | 101.8 / **127.5** / 163.1 | 86.6 / 106.4 / 144.1 | 8/11, 24/17, 25/24 | 0/1, 2/2, 3/4 |
| N-C (12/16/16/24) | 87.3 / 110.1 / 145.8 | 75.6 / 89.0 / 117.9 | 9(0)/8(1), 15(1)/14(2), 21(1)/18(2) | 0/1, 2/2, 3/3 |
| G-A t1 (12/8/28/32) | 91.3 / 113.5 / 150.9 | 83.6 / 95.4 / 131.5 | 8(0)/8(1), 19(0)/18(1), 21(1)/21(1) | 0/1, 2/1, 3/2 |
| **N-C t1 (12/8/28/32)** | **90.0 / 105.8 / 152.2** | **82.2 / 97.3 / 130.1** | 8(0)/8(1), 14(0)/15(2), 21(1)/20(3) | 0/1, 1/2, 3/3 |

Tier 2 (levels 5-6, `--laser-fixture=2`): N-C t1 careful identical frame for
frame on EASY/MEDIUM (the cannons die first), HARD 152.2; careless 82.2 /
100.7 / 132.0 s, laser hits 3 / 3 / 4 (tier 1: 1 / 2 / 3), deaths 1 / 3 / 4.
G-A t1 tier 2: 91.3 / 113.5 / 150.9 | 83.6 / 95.2 / 131.2. **Bold:** MEDIUM
outside 90-120 (G-B, N-B at these hit points; their extra slide adds ~25 s).

**Per fight (M, N-C t1, MEDIUM):** rails 3/3 slides each, careless 2 covers,
careful 0 (the cannons died first); escorts careful 13 (12 shot down, 1 left),
careless 12 (10 shot down, 2 left); hits in the boss sector 15 / 15: escort
lasers 0 / 0, boss lasers 0 / 2, the rest the rail guns' pulses and the core's
volleys (`measure-interceptor-hits.mjs`, `measure-interceptor-play.mjs`,
`--hit-trace`). Escorts per fight, all variants: 9-17.

**Gates and budgets (M / M-N):**

| | main R1 | R3 (L7) | R4 | R2 G-A | R2 G-B | R2 N-A | R2 N-B | **R2 N-C** | source |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| boss entry, host frames / sectors | 249 / 65 | 256 / 67 | 261 / 68 | 260 / 68 | 260 / 68 | 256 / 67 | 257 / 67 | **253 / 66** | M (limit 280) |
| … headroom for the banner (~25) | 31 | 24 | 19 | 20 | 20 | 24 | 23 | **27** | |
| boss frames worst margin (the aim runs, all) | 8,869 | 7,396 | 6,527 | 8,255 | 8,210 | 8,675 | 7,709 | **8,713** | M |
| … DMA-on max | 30,211 | 30,668 | 30,440 | 30,210 | 30,160 | 30,122 | 30,324 | **30,218** | M (gate 32,568) |
| stress worst reachable, level 4 / 5 | 7,046 | 7,824 / 8,077 | 8,094 | 7,876 / 7,920 | 7,901 / 7,793 | 7,876 / 7,920 | 7,647 / 7,542 | **7,876 / 7,920** | M-N (limit 8,500) |
| … worst with a column step on the frame | — | — | — | 7,222 / 7,212 | 7,377 / 7,317 | 7,288 / 7,278 | 7,443 / 7,383 | **7,346 / 7,346** | M-N |
| … headroom (M6 VOID LANCE) | 1,454 | 423 | 406 | 580 | 599 | 580 | 853 | **580** | |
| frames with a kill and a spawn | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** | M-N |
| region 2's block (slot F) | 110 B (copy) | | | 510 / 512 B, 4 sectors (code 400 / 402, tail 80, data 30) | same | same | same | **same** | manifest |
| charset / codes | 840 / 105 | 864 / 108 | 864 / 108 | 840 / 105 | 792 / 99 | 704 / 88 | 656 / 82 | **600 B / 75** | manifest |
| slot E code | 504 (4) | | | 511 (4) | | | | **511 (4)** | manifest |
| slots A / C / D, install, window, Light kernel, initial block, resident | 2,047 / 1,662 / 1,663 … | | | **unchanged** (0 B) | | | | | manifest |

The escort's own Light tick (outside the boss routines): 532 native worst
(interceptor-speed's catch harness) - on a step frame 7,346 + 532 = 7,878.
`region-2-dodge-2` (HARD, the laser-contact bot): 5 laser hits, every
variant; boss frames >= 12,573 margin. Every R2 session: 0 PAL misses, the
slot F write clause 0 foreign writers (the rails' code writing only its
state), the entry's debris and HUD clauses held.

**Fire gaps (S, `scripts/boss-coverage.mjs`'s model per rail state; x even
48-200).** The doors' / core's reach: G-A/G-B x 112-126 / 116-122; N-A/N-B
116-122; N-C 116-118.

| state | G-A | N-A | **N-C** |
| --- | --- | --- | --- |
| opening (both cannons, the front guns) | safe 116-132 over the hangar | 122 | **none in reach of the doors / core** |
| careless, covered cannons + last guns | 116-132 | 122 | **none** |
| careless core phase (covered beams + the core's volley) | 116 | none | **none** |
| careful doors phase (no boss weapon; escorts only) | 112-126 | 116-122 | 116-118 |
| careful core phase (the core alone) | 116 | 116 | **none** |

The careful doors phase has no boss weapon by design (every weapon but the
core is gone); the escorts - launched from the doors, over the ship - are its
danger until the doors fall. Elsewhere: between a rail's front and its cannon
(x ~66-110) nothing reaches the ship, and nothing there can be hit but the
track (a stalemate, no progress).

**The left edge (`boss-park-left-1`, x 48, 4,000 frames, MEDIUM):** G-A 20
hits, 2 deaths (from x 48 the shot meets column 14 - G-A's front gun - so the
player kills it and the escort starts); G-B, N-A, N-B, N-C **0 hits** - from x
48 the shot meets the girder (their front-gun slot starts at 15-16), nothing
dies, the escort never starts, and no weapon reaches x 48. A stalemate, not a
winning refuge (the fight cannot end from there); options in S5Q-6. Region 1's
left-edge guard is untouched (the default build is `main`'s).

**The difficulty curve (R, the aiming bot, E / M / H):** R1 97.4 / 111.0 /
152.7 · **R2 (N-C t1, careful) 90.0 / 105.8 / 152.2** · R3 109.3 / 112.3 /
174.9 · R4 100.2 / 107.0 / 139.3 s. R2 sits with R1; its HARD between R1's and
R3's. "Hardest boss" in hits on this bot: R2 15 (MEDIUM) against R4's 17
(fix/r4-immobile) - the bot does not dodge; the owner's play decides.

**RAM:** 0 resident bytes; region 2's state 13 B inside its block (rail k,
front; step, timer, dead, scratch); the scratch page, slot C/D BSS unchanged;
slot E BSS unchanged.

#### 6.5.5 Review builds (`build/play/`, `atari800 -xl -pal -nobasic <absolute path>`)

| ATR | SHA-256 (prefix) | What |
| --- | --- | --- |
| `s5-5-r2-nct1-boss-route.atr` | `232f89f6` | **N-C, t1 hit points (recommended)**, level 4 (one laser: the twins alternate), entered at the boss |
| `s5-5-r2-nct1-tier2-boss-route.atr` | `b054ce3a` | the same, two lasers (levels 5-6) |
| `s5-5-r2-nct1-level-route.atr` | `b06a5fda` | level 1's content as level 4, then the boss |
| `s5-5-r2-nc-{boss-route,tier2-boss-route,level-route}.atr` | `b55c3725` / `54c0b63f` / `87eadd2c` | N-C at the first hit points |
| `s5-5-r2-ga-{…}.atr` | `337199ba` / `56ccc817` / `76b54534` | G-A, the owner's estimate (the sphere hangar) |
| `s5-5-r2-gat1-{…}.atr` | `f7aa4155` / `83f34c57` / `77d310f1` | G-A at t1 |
| `s5-5-r2-gb-{…}.atr` | `6c2e7ce1` / `23d4b781` / `a06f1660` | G-B (one safe slide more, 2-cell guns) |
| `s5-5-r2-na-{…}.atr` | `6b533d80` / `dd27968e` / `d2771bc8` | N-A (2-cell hangar) |
| `s5-5-r2-nb-{…}.atr` | `92cb9e36` / `91e77929` / `f182d1f5` | N-B |
| `s5-5-main-r1-boss-route.atr` | `d4c143b0` | `main`'s region 1 boss route, for comparison |
| `s5-5-full-game-main.atr` | `0f639496` | the default build (= `main`) |

The measurements of G-A ... N-B ran on builds before `efaf609` (the rails'
window per side, `rail_dead` moved: the same behaviour, other bytes); every ATR
here is rebuilt from the branch's head.

**What to look for:** the BASTION title; one ship (the track edge to edge,
the hangar, the cannons hung from the track, the rails under it running off
both screen edges); a rail-gun kill - the socket stays, after a beat the rail
clanks one pitch inward and the next gun locks in; the pulsing gun one slide
before a cannon; the slide that hides a standing cannon - its beam and heat
still come from under the rail, shots there deflect; the rail never reaches
the hangar; the doors flash before each escort launches and the escorts stop
when they fall; the core's volleys at the end; careful (cannons first) against
careless (rails first); fight length on MEDIUM; on N-C, whether the slim
hangar still reads as the Bastion's hub.

#### 6.5.6 Owner questions (recommendation first)

| # | Question | Recommended | Alternatives |
| ---: | --- | --- | --- |
| S5Q-1 | The geometry | **N-C**: the one-cell hangar column with the cannons hugging it - the only layout whose covered cannons threaten the endgame and whose core leaves no refuge; 2 safe slides, the 3rd covers, 4 guns a side; 253 host frames | **G-A** (the estimate's look, the sphere hangar; a covered cannon never reaches the hangar's corridor x 116-132 - the refuge rule fails there); G-B / N-B (one safe slide more, 5 guns a side; MEDIUM 128-135 s at these hit points - needs lighter guns); N-A |
| S5Q-2 | When the doors open | **after every cannon and rail gun is destroyed or covered** (built): the order puzzle binds, the core is the finale | from the start (the core could be rushed while everything fires; the escorts stop early); after the cannons only (the rail guns then outlive the core - the defeat rule needs a C change, slot C has 2 B) |
| S5Q-3 | The core | **a salvo launcher** (its volleys are the endgame's danger; the doors are the only armour, so the finale halves its reload) | a passive core (the endgame safe but for escorts until the doors fall) |
| S5Q-4 | The careless order is not harder for the bot | **t1 hit points** (cannons 8, guns 12, doors 28, core 32: careless only ~8 % shorter, 2-4 laser hits against 0-1); tune further on the owner's play | Phase B levers, priced: a covered cannon fires on its own cadence even on level 4 (the twins' turn-taking off once one is covered: ~5 B, the block has 2 - a trim needed; two beams on level 4 after a cover, against decision AC); covered cannons' reload halved (bossDef per level, levels 4-6 are not authored: data then); heavier doors / core still |
| S5Q-5 | The cover warning | **the gun whose fall would cover the cannon pulses** (built, ~20 B) | the rail's front blinks (~45 B: the block has 2 B; needs a trim elsewhere) |
| S5Q-6 | The left edge (x 48) on N-C | **leave it**: a stalemate - nothing reaches the ship, nothing can be hit from there | move the rails' front-gun slot to column 14 (as G-A: x 48 then shoots the front gun and the escort starts; the cover then needs the cannons one column further out) |
| S5Q-7 | The lasers per level (AC) | **one beam on level 4 (the twins alternate), two on levels 5-6 (independent from tier 2)** - covered cannons keep their turn | the twins on every level (one beam on levels 5-6 too, as region 1's copies had) |
| S5Q-8 | The slide | **12 frames after the kill, one column every 4 frames (~28 frames a slide), a clank a step** | faster (2 frames a column) or slower; data |
| S5Q-9 | The palette | **olive `$E2` / amber `$28` / steel** (as drawn); the owner retouches the PNGs | — |

Phase B starts on the owner's answers: tests first (RED on `main`), the chosen
variant as region 2's own directory (`assets/graphics/boss-regions/region-2/`,
its placeholder entry removed), the hit points tuned, region 2's route
sessions on the aiming bot with the rails' and the hangar's clauses, the
evidence regenerated; the unchosen variants removed.

#### 6.5.7 The owner's choice (2026-10-15, after playing N-C; journal §AT)

Straight to Phase B, no new comparison round:
1. **N-C with W2:** the rails start one position closer - the second rail-gun
   kill covers the cannon (one safe slide a side); the rail guns a side fitted
   to the new geometry; the rails never cover the doors or the core.
2. **A covered cannon** stays invulnerable (shots deflected) and keeps firing;
   it may fire more often than an exposed cannon by data only, or by code only
   if a trim inside region 2's block pays for it - else the rate stays.
3. **The cover warning** on the gun whose kill would cover a cannon stays.
4. **Fairness:** in the core phase, repeated windows to stand in the core's
   reach and shoot it outside every warned or active beam; at least 10 frames
   left after leaving a warned beam (as R4) - per level and difficulty, else
   STOP.
5. **The doors' readability (required):** locked and unlocked doors look
   different (colour and pattern), shots on locked doors visibly deflected, the
   unlock unmistakable (a visible change and a sound), damage with b3 and PF2
   in every stage after it - the cheapest technique, its bytes reported, a STOP
   with options if the block cannot hold it; no resident bytes.
6. As built: the doors open only after every cannon and rail gun is destroyed or
   covered; the core fires volleys and falls last; lasers per decision AC (one
   beam on level 4, the cannons in turn; two on levels 5-6); the slide's timing
   and the palette stay; the colour-distance test covers R2 against `$88`.
7. **The left edge:** the stalemate stays, confirmed by a replay that the
   escort attacks a player who has killed a module and parks there - else STOP.
8. **Hit points:** from t1 (8 / 12 / 28 / 32), tuned by data: careful MEDIUM
   90-120 s, EASY shorter, HARD not shorter; the honest difficulty measure
   reported - beams in the doors and core phases, hits on a bot that leaves a
   warned beam, careful and careless, E / M / H.
9. G-A, G-B, N-A, N-B and W1 rejected; the variants' code removed.

#### 6.5.8 Phase B — as built (2026-10-15) — `OWNER-SMOKE CANDIDATE`

**W2 (MEASURED on the band; `build/play/s5-5-r2-w2-geometry.png`, one side at
every rail position).** Band columns at the still position 32: the screen
shows 12-51, a shot reaches 14-52.

| | left | right |
| --- | --- | --- |
| hangar: cap / core / doors | 31 (rows 0 / 1-3 / 4) | |
| cannon (rows 1-3, 2 cells) | 29-30 | 32-33 |
| rail front: start -> slide 1 -> slide 2 (stops) | 22 -> 26 -> **30** (covers 29-30) | 40 -> 36 -> **32** (covers 32-33) |
| guns (3 cells, pitch 4), front first | 19-21, 15-17, 11-13 (the third partly beyond the edge) | 41-43, 45-47, 49-51 |
| front-gun slot | 19-21 | 41-43 |
| safe slides before the cover / guns a side | 1 / **3** (2 that slide + 1 left on the stopped rail) | the same |
| modules / codes / charset | 10 / 76 / 608 B | |

Three guns a side, not four: with two slides a fourth gun would stay locked
behind the stopped rail - never exposed, so never killable (the converter
refuses fewer guns than slides + 1). Each slide: 12 frames after the kill,
one column every 4 frames (a clank each) on frames no shot met the band.

**The doors' readability (0 resident bytes).** Data: `band.png` draws them
locked - steel bars and a brace over the olive bulk (the PF3 bank), another
colour and another pattern than the open look; `open.png` draws them
unlocked - amber chevrons (PF2), staged (cracked / broken), so they take
damage with b3 and PF2 pixels in every stage; the converter now refuses a
hangar whose doors have no open look. A shot at locked doors is the
controller's covered hit: the deflection glyph and the absorb tick (no
code). The unlock: the exposure check that opens them draws their open look
(the controller's queue, existing code); the block adds the moment's flash
and a held tone - the hit's high tone ($18 / $A6) for `hangar.unlockFrames`
16 frames - **19 B**, paid inside the block by assembling the cover masks'
high bytes only when a module bit lives there (the core's lock and the doors'
cover: the core is module 5, the cannons 4 and 6) - **17 B** - plus its 2
free bytes. Region 2's block **512 of 512 B** (look tail 81 B, the rails'
tables and state 28 of 29 B, code 402 of 402 B); the look +1 code (8 B of
charset, the charset's sector count unchanged), the look tail +1 B.

**A covered cannon's rate: unchanged** (the owner's answer 2). No data lever:
the beam's reload is `boss_def`'s per difficulty, shared by every laser - a
covered cannon is not a state the data names. Code: an extra reload countdown
for a covered cannon's laser in the block, about 36 B (IC); after the unlock
cue the block has 0 B and no further trim was found that pays for it (the
remaining code is the slide, the lock, the warning and the escort's cue). It
fires at the exposed rate, through to the end of the fight (tested).

**The fight (R, the aiming bot's ratio; tier 1 = level 4, tier 2 = levels
5-6, `--laser-fixture=2`).** Trials on the level route:

| trial (guns / cannons / doors / core) | careful E / M / H | careless E / M / H |
| --- | ---: | ---: |
| t1 (12 / 8 / 28 / 32) | 71.8 / 86.2 / 117.6 | 64.6 / - / - |
| t2 (14 / 8 / 40 / 44) | 84.3 / 103.2 / 136.6 | 79.5 / 93.5 / 126.5 |
| **t3 (15 / 8 / 46 / 50), shipped** | **91.5 / 110.1 / 149.8** | **85.8 / 102.6 / 133.9** |

The doors and the core are the heavy modules: their phases are the ones a
careless player spends under covered cannons. W2 has two guns fewer than
N-C's four a side, so t1 ran 15-20 s shorter than Phase A's N-C t1.

**The honest difficulty (M, t3).** Per difficulty E / M / H:

| | careful | careless | careful-dodge | careless-dodge |
| --- | --- | --- | --- | --- |
| tier 1: fight (s) | 91.5 / 110.1 / 149.8 | 85.8 / 102.6 / 133.9 | 91.5 / 110.1 / 150.2 | 92.9 / 118.8 / 161.9 |
| … beams in the doors + core phases | 0 / 0 / 0 | 2 / 2 / 4 | 0 / 0 / 0 | 2 / 3 / 7 |
| … hits on the bot (boss laser) | 10 (0) / 18 (0) / 21 (1) | 10 (1) / 19 (1) / 17 (3) | 10 (0) / 18 (0) / 21 (0) | 9 (0) / 19 (0) / 19 (0) |
| … deaths (lives held) | 1 / 1 / 3 | 1 / 2 / 3 | 1 / 1 / 2 | 0 / 2 / 2 |
| tier 2: fight (s) | 91.5 / 110.1 / 149.8 | 85.6 / 102.6 / 138.1 | 91.5 / 110.1 / 150.2 | 94.4 / 119.4 / 165.5 |
| … beams in the doors + core phases | 0 / 0 / 0 | 2 / 4 / 8 | 0 / 0 / 0 | 4 / 6 / 16 |
| … hits (boss laser) / deaths | 10 (0) / 18 (0) / 21 (1); 1 / 1 / 3 | 11 (1) / 19 (2) / 22 (5); 1 / 2 / 5 | laser 0 | laser 0 |

The careful order meets no beam after the cannons fall (both cannons are its
first targets, the twins' first shots aside). The careless order covers both
cannons (every careless run, tier 1 and 2) and meets 2-16 beams in the doors
and core phases: a bot that does not dodge takes 1-5 laser hits (careful 0-1)
and dies up to 2 times more; **a bot that leaves every warned beam** (the
`-dodge` bots: the aiming bot with the laser-contact bot's escape, the
existing scoped dodge of `lower-contact-laser`, reused - no aiming policy
dodged before) takes no laser hit in either order but pays the careless order
in time - **+8 % on MEDIUM, +8-10 % on HARD** (118.8 / 161.9 s against 110.1 /
150.2 s on tier 1; 119.4 / 165.5 on tier 2). In hits alone the aiming bot does
not find careless harder (most hits are the boss's pulse shots and the
core's volleys); the owner's play decides.

**Hits by source and the escort (M, `--hit-trace`, tier 1, careful | careless,
E / M / H; `measure-interceptor-hits.mjs`, `measure-interceptor-play.mjs`).**
Escort contacts 0 and escort lasers 0 in every run; every hit in the boss
sector is the boss's (its shots, volleys and beams). Escorts per fight 11 /
12 / 14 | 9 / 11 / 12; shot down 9 / 11 / 14 | 9 / 10 / 11 (the rest left).

**Fairness (M-N, `tests/boss-region-2.test.mjs`).** The core's and the doors'
reach (x 116, 118) lies under the left cannon's beam (its hit window x
111-121), not the right's (123-133): danger, not a refuge. Leaving a warned
beam: worst 3 frames from inside either window at 2 colour clocks a frame -
**37 / 29 / 22 warning frames left** (E / M / H; the rule >= 10). The core
phase with both cannons covered and still firing, 3,000 frames, windows
between the left beam's warnings and beams (each >= 50 frames, the test's
floor):

| | EASY | MEDIUM | HARD |
| --- | ---: | ---: | ---: |
| level 4 (one beam, the twins in turn) | 3 windows of 689 | 4 of 531 | 6 of 374 |
| levels 5-6 (two beams, independent) | 7 of 300 | 9 of 225 | 13 of 150 |

**The left edge (M, `region-2-edge-left-1`, MEDIUM, the new policy
`boss-aim-park-48`: aim until a module falls, then park at HPOS 48, firing):**
3,847 of the fight's first 4,050 frames at the edge, **22 escorts and 20 hits**
on the parked player (the first escort at frame 99) - the left-edge guard's
clause holds: a stalemate, not a refuge.

**Gates and budgets (M / M-N; R1, R3, R4: STATUS / §6.5.4 on `main`
`131fd8f`; the stress re-measured on this branch):**

| | R1 | **R2 (W2, t3)** | R3 (L7 / L9) | R4 | limit |
| --- | ---: | ---: | ---: | ---: | --- |
| boss entry, host frames / sectors | 249 / 65 | **253 / 66** | 256 / 67 | 261 / 68 | 280 (AM) |
| … headroom for the banner task (~25) | 31 | **27** | 24 | 19 | |
| boss frames worst margin / DMA-on (all R2 sessions: 32) | see the evidence | **8,881 / 30,198** | 7,396 / 30,668 | 6,527 / 30,440 | 500 / 32,568 |
| stress, worst reachable (native) | 7,046 -> **7,043** | **7,523** (977 left) | 7,824 / 8,077 -> **7,821 / 8,074** | 8,094 -> **8,091** | 8,500 |
| frames with a kill and a spawn | 0 | 0 | 0 | 0 | rule (B) |

The −3 on R1, R3, R4 and the finale fixture (6,715 -> 6,712): slot E's code
grew 7 B (the twins' tier rule, now in every build) and shifted what follows
it (MEASURED, the same composition). R2's worst stress frame: a column step
of the left rail with two stage hits (cannon-l and a gun) and both lasers in
their warning's heat (`scripts/measure-boss-stress-r2.mjs`, levels 4 and 5).

Bytes: **0 resident**; slots A 2,047, C 1,662, D 1,663 code unchanged; slot E
504 -> **511 B** code (4 sectors); the install 381; region 2's block 512 of
512 (4 sectors); window record 1,322 of 1,387, Light kernel 847 of 875,
initial block 13,623 B / 107 sectors - unchanged (the manifest).

**Difficulty curve (R, the aiming bot, E / M / H):** R1 97.4 / 111.0 / 152.7 ·
**R2 careful 91.5 / 110.1 / 149.8, careless 85.8 / 102.6 / 133.9 (dodging:
92.9 / 118.8 / 161.9)** · R3 109.3 / 112.3 / 174.9 · R4 100.2 / 107.0 / 139.3 s.
By beams in the endgame R2's careless order is the most dangerous phase of the
four bosses; by the non-dodging bot's hits on MEDIUM R2 (18-19) sits with R4
(17, fix/r4-immobile) - the bot does not dodge the boss's shots.
The owner sets the order after playing all four.

**Tests.** New `tests/boss-region-2.test.mjs` (15): RED on `main` `131fd8f`
(15 of 15, a detached worktree, removed), GREEN here. Re-pointed with their
reasons at the sites (no floor, gate or budget moved): `boss-look-tail`
(region 2's block is its own), `boss-overlay` (region 2's own runs on the
disk), `slot-f` (`BOSS_R_CODE` at the hook, `BOSS_R_DATA` between the look
tail and the hook), `boss-region-3` (only region 1's block has no code),
`level-summary-build` (no region is a copy), `boss-stress` (the S5-2 finale
composition kept as a fixture - region 1 with `finaleCooldown` 12 - its label
"the finale fixture"), and the copies' coverage / escort / art / shown-rows
tests (`boss-r1-tuning`, `boss-escort-flow`, `boss-polish`,
`boss-r1-twin-lasers`) on the regions' own drafts. `scripts/memory-map-report.mjs`
names `BOSS_R_CODE` / `BOSS_R_DATA`.

**The trace.** Column `boss_alive`; the rails' and the hangar's clause on
region 2's route sessions (per side the slides and front-gun kills step by
one, a slide only after its kill and within 12 + 4 x 4 + 40 frames, never past
the last position; a covered cannon never falls and fires again; the doors
before the core; no escort admitted after the doors fell; never two Lights at
once; the careless sessions must cover a cannon); `region-2-diag-*` on the
careful aiming bot, `region-2-finale-*` on the careless one,
`region-2-edge-left-1` under the left-edge guard's clause. MEASURED on
`build/boss-region-2-level-1-s6`, every clause holding, 0 misses:

| session | chain | slides / covers | doors fell / core | escorts | worst margin / DMA-on |
| --- | --- | --- | --- | ---: | --- |
| `region-2-diag-0` / `-1` / `-2` (careful) | f2,233 / 2,774 / 3,379 | 2 / 2, none | f1,863 / 2,233; 2,287 / 2,774; 2,775 / 3,379 | 10 / 12 / 15 | 10,179 / 29,619; 10,147 / 29,807; 9,922 / 29,788 |
| `region-2-finale-0` / `-1` / `-2` (careless) | f2,108 / 2,569 / 3,167 | 2 / 2, both cannons | f1,677 / 2,108; 2,082 / 2,569; 2,501 / 3,167 | 9 / 11 / 13 | 9,729 / 29,232; 9,228 / 29,373; 8,881 / 30,198 |
| `region-2-dodge-2` (laser-dodge, HARD) | - | 0 | - | 0 | 12,555 / 27,975 |
| `region-2-edge-left-1` | - (stalemate) | 0 | - | 28 | 11,044 / 29,236 |

The finale (the core's volleys at half reload) from the doors' fall in every
session that reached it (3-8 volleys).

**Review builds (`build/play/`, not committed):** see STATUS.

#### 6.5.9 "B - the window" (2026-10-15, after the owner's smoke of the N-C candidate) — review build, awaiting the owner's play

**The owner's smoke: NOT accepted.** The one-cell hangar read as a thin pole (the
doors a sliver, the core no module, no centre to the ship), and both cannons
exposed from the start let him kill them first and clear the rails. His choice
"B - the window": a wide hangar, the cannons in armoured bays that the first
rail-gun kill on a side opens, the second kill covering a standing cannon for
good. Evidence not regenerated (the owner's order); the default build waits on
it (`build:candidate` only).

**As built (review).**
* Geometry (band columns at the still position 32; the screen 12-51, the
  shots 14-52): the hangar's hull **29-33** (five cells, rows 0-4), the core
  **30-32** (rows 1-3), the doors **30-32** (row 4); the cannons **27-28 /
  34-35** beside it; the rail fronts **20 -> 24 -> 28** and **42 -> 38 -> 34**
  (the second slide covers the cannon, the rail stops short of the hull);
  three 3-cell guns a side (17-19, 13-15, 9-11 / 43-45, 47-49, 51-53): two
  slide the rail, the third stays on the stopped rail and is killed in the
  front slot - every gun destroyable. Off screen at the start: the left rail's
  third gun (9-11) and the girders to the band's edges; the right third gun
  shows one cell (51). Each first slide brings the next gun in from the edge.
* The bays are data: each cannon's cover is its rail's front gun (`"bay":
  true`: band.png draws the locked bay, emitter.png the cannon it opens on); the
  controller absorbs a shot at a locked bay (the deflection glyph) and opens it
  on the tick after that gun's kill (the open look, the existing queue). A
  locked cannon fires: region 2's frame hook runs slot D's reload countdown for
  a laser whose emitter is not exposed and drops its shield (no first shot at
  the opening) - `rail_frame`, 21 B. The unlock cue (flash + held tone) now
  for the doors and both bays (`RAIL_UNLOCKS`), +12 B.
* No refuge at the core: a volley (columns c - 1 .. c + 1 of its centre c)
  meets every position that shoots columns c .. c + 2 and the left one of the
  two that shoot c - 1 not; a three-cell core has that one column. Once the
  doors fall the block armours it (`RAIL_JAMB`, column 30, +5 B): the core's
  reach x 116-122 lies entirely under its volley. The doors' phase has no boss
  weapon by the engine's fire-column rule (the core's shots would cross the
  doors' cells): the escort the doors launch is its danger.
* Bytes: region 2's block 510 of 512 (look tail 41 B - the unseen nozzle
  phases left out, `"phases": false`, the two cannons' open looks shared,
  `"shareOpenLooks": true`; BOSS_R_DATA 65 B: tables, state, scratch,
  `rail_frame`, `rail_index`; code 400 of 402); charset 79 codes, 632 B, 5
  sectors; the boss entry 66 sectors / **253 host frames** (27 left for the
  banner's ~25); 0 resident bytes, slots A-E unchanged (slot D +0: a label).
* Hit points unchanged (t3: guns 15, cannons 8, doors 46, core 50).

**Measured (M: Atari800 debug routes; R: the aiming bot's ratio; M-N native).**
| E / M / H, seconds (R) | careful | careless | careful-dodge | careless-dodge |
| --- | --- | --- | --- | --- |
| level 4 | 93.3 / 110.6 / 143.7 | 84.8 / 101.4 / 132.8 | 93.2 / 110.6 / 149.1 | 86.8 / 114.0 / 144.4 |
| levels 5-6 | 93.3 / 113.7 / 144.7 | 84.8 / 100.8 / 131.9 | 93.2 / 117.6 / 152.2 | 85.6 / 111.5 / 139.0 |
| level 4: covers; beams in the doors + core phases | none; 0 | both; 2 / 3 / 5 | none; 0 | both; 2 / 3 / 5 |
| levels 5-6 | none; 0 | both; 4 / 8 / 10 | none; 0 | both; 4 / 6 / 10 |
| hits (boss laser), level 4 | 10 (1) / 18 (0) / 18 (1) | 9 (0) / 18 (0) / 19 (1) | 8 (0) / 18 (0) / 20 (0) | 9 (0) / 19 (0) / 19 (0) |
| hits (boss laser), levels 5-6 | 10 (1) / 14 (2) / 19 (2) | 9 (0) / 24 (1) / 20 (2) | 8 (0) / 18 (0) / 19 (0) | 9 (0) / 19 (0) / 19 (0) |

The careless order still runs shorter than the careful one (it skips the
cannons' 16 hit points); its permanent beams no longer stand over the wide
core's reach, so they cost the bot little in hits (0-2) and the dodging bot
+3-13 % in time. Tuning by data is the owner's step after he has played.
Fairness: >= 10 warning frames after leaving a beam - 37 / 29 / 22 (E / M / H);
in the careless core phase no beam ever endangers the core's reach (x 116-122:
the window is always open, the core's volleys are its danger); the left
beam covers the jamb's left shooter (x 112). Route sessions (boss route,
level 4 unless noted): `region-2-diag-0/1/2` 94.3 / 112.1 / 147.5 s,
`region-2-finale-0/1/2` 85.8 / 105.2 / 136.3 s (both cannons covered),
`region-2-edge-left-1` 27 escorts and 25 hits on the parked player (no
refuge), `region-2-dodge-2` 5 laser hits; 0 PAL misses, every clause held;
worst margin 8,532, DMA-on <= 29,939. Stress (M-N, `tests/boss-region-2`):
worst reachable **7,388** (level 4), 7,280 (level 5) - two kills on the
cannons with a gun's firing due, lasers warning; 0 kill frames with a spawn.

Tests: `tests/boss-region-2.test.mjs` rewritten (19): RED on the N-C candidate
`6130ca4` 12 of 19 (every rule that changed; the palette, one ship, the cover
warning, the escort, the lasers per level, the beams' escape and the stress
unchanged), GREEN here; the other boss tests 290 of 291 then 291 (the
generated memory map regenerated).

#### 6.5.10 The window's graphics pass (2026-10-15) — awaiting the owner's look

**The owner's play of the window build:** the mechanic accepted as built; the
core's armoured left column accepted; the doors phase kept without a boss
weapon but short (8-15 s on MEDIUM, careful); the look not yet good enough.

**As drawn** (`scripts/boss-r2-art.mjs`; previews `build/play/s5-5-gfx-*`):
one visual language - grey bars only on the locked doors and bays; amber on
what can be hurt; steel and olive the structure; a destroyed module a dark,
broken socket (the cavity glyph, no bars). The hangar a sphere (13 glyphs:
round on screen at the 2:1 pixel, the track behind it), the doors the gate at
its foot; the core a round amber reactor in a bright ring, a white eye at its
centre - only the eye staged (`"stages": "centre"`, the converter now allows
it for any module; the runtime steps staged codes only). Gun pods with two
lamps and an amber muzzle; the rail ends one solid steel bumper glyph; a
guide track under the beam in each gap between a rail's front and its bay.
The warning's heat a lamp of its own (decision E2), so a covered cannon's
warning shows on the bumper as a light - the old heat was the tower's lens
half, which read as a piece of the cannon beside the rail.

Codes: 78 of 80 (5 sectors, 624 B): the gun staged a cell at a time (its two
corner stubs one glyph), the track one glyph, the girder mount dropped, and
the capped plate's look left out (`"capped": { "look": false }`: both cannons
are slot 1, never capped - three codes). Regions 1, 3, 4 byte-identical.
Region 2's block 510 of 512 (unchanged), entry 66 sectors / 253 host frames.

Hit points: doors 46 -> **22**, core 50 -> **74**. MEASURED (R, level 4 /
levels 5-6): the doors phase, careful, 10.2 / 12.1 / 16.6 s and 10.2 / 13.2 /
16.5 s (E / M / H); the core phase 19.0 / 32.4 / 45.4 s; the fight careful
89.8 / 109.6 / 142.8 s and 89.8 / 112.4 / 143.7 s, careless 85.1 / 100.4 /
130.1 s and 85.1 / 99.6 / 129.2 s; the dodging bots 90.4 / 109.6 / 147.8 and
84.7 / 109.9 / 139.4 s (level 4). 0 PAL misses, every clause held.

#### 6.5.11 The bays' beams and the look's regressions (2026-10-15) — awaiting the owner's look

**The owner's look at the graphics pass:** (1) a locked bay showed only bars
and its beam started inside them - the beam's top hidden behind the panel, no
cannon visible; (2) against the window build the pods became small saucers
with a gap under the girder, the rail ends a grey pillar that vanished, the
ship mostly grey.

**The beam (MEASURED cause):** `laser_prepare` (slot D) ORs the beam into the
static missile plane from line 3 of the emitter's bottom row (B2_CORE_LINE)
down; the playfield is in front of the missiles, so every pixel of that row's
cells - the bars, the muzzle, a covering rail's end - hid the beam's top.
Region 2's frame hook now clears those five lines of the plane every frame
(`rail_frame`, +9 B, nothing else in the boss sector uses the plane in the
band): every beam starts on the row under the cannons, in the locked, open
and covered states alike (tested on levels 4 and 5). Paid by the unlock cue's
module kept on the stack (-3 B) and a redundant reload of X in the side loop
(-3 B); `rail_state` and `rail_stepped` moved after the code (the data room
before the hook is full). Region 2's block **509 of 512 B**.

**The look:** the window build's pods restored as they were (solid inverted
triangles hung straight from the girder - no gap - olive stripes, amber
lights, the amber muzzle); the rail end a solid amber bumper in a steel frame
(one glyph, both rails); a locked bay shows the cannon's steel mount (the
open look's top row) above the armour panel, which covers its body and muzzle;
open, the body and muzzle are amber. Kept: the dome, the sphere core, the
bars only on the locked doors and bays (tested: nowhere else), the guide
track, the dark sockets.

**Codes 79 of 80** (5 sectors, 632 B) - from the graphics pass's 78: the pods
+1 staged glyph (5 -> 6 triples, +3 codes), the dome's top three cells one
glyph (-2), the bay's mount shared with the open look (0); the bumper still
one glyph. Entry 66 sectors / 253 host frames.

#### 6.5.12 The armour between the cannon and the player (2026-10-15) — awaiting the owner's look

**The owner's look at `110c274`:** a bay's armour must be between the cannon
and the player - the whole cannon always visible (steel locked, amber open;
nothing over it but a covering rail), the armour a separate shield in the
row under it; locked, the beam visibly starts under the armour and a shot
deflects on the armour; open, the armour gone, the beam from the muzzle and a
shot hits the cannon; covered, the beam from under the rail's end.

**As built:** each cannon's module is the cannon (rows 1-3) over its armour
row (row 4, the doors' row: `"height": 4`, `"cavityRows": 3`; the converter
checks a bay's last row is its armour and puts its lens - the warning's
heat, a `"lens"` stage - on the cannon's last row). Locked (`band.png`): the
cannon's own open-look glyphs in the olive bank (its amber parts the bulk's
dark olive), the doors' bar glyph under it; open (`open.png`, the module's
open look): the amber cannon over an empty row. The modules re-sort (the
cannons' bottom row is 4): cannon-l 0, doors 1, cannon-r 2, the rails 3-5 and
7-9, the core 6.

**Hit detection:** `boss_hit` (slot A) takes the struck cell from the
column's stop line (read before the controller's hit can rebuild the column)
instead of the module's record - the same cell for every module of regions
1, 3, 4 (their stop lines are their bottom rows), -13 B. Locked, a shot stops
under the armour row and deflects there; a bay's opening (its rail's front
gun's kill, `rail_side`) moves its two columns' stop to the cannon's muzzle
row, so a shot hits the cannon there - and, after the second kill, the
cannon's socket or the rail closing in.

**The beams (MEASURED: gameplay's PRIOR is 0):** a missile is not behind the
playfield - M1 ORs with PF0/PF1 and is in front of colour 3, M2 is behind
PF0/PF1 and ORs with colour 3 (Atari800's `gtia.c`, the hardware's priority
equations) - so §6.5.11's "the playfield in front" was a partial reading,
and bars cannot hide a beam. `laser_prepare` gives every beam the plane from
the armour row's lens line; region 2's frame hook (`rail_frame`) writes the
armour row's eight lines every frame - every beam's bits but the missile of
a locked cannon in its warning or beam (`b2_three`): a locked bay's beam
starts under its armour, an open or covered cannon's right under its muzzle
or the rail's end, each beam on its own missile when both fire at once
(levels 5-6: 1,274 frames with one bay open and one locked and both beams
on, 0 wrong bits). The hook also moves the warning's heat from the armour row
to each lens (the cell's low byte; the page asserted).

**Bytes (MEASURED, the labels):** region 2's block **509 of 512 B** (look
tail 43, data room 65 of 67, code 401 of 402), unchanged in sum:
`rail_frame` 31 -> 57 B (+26); `rail_side` 118 -> 120 (+2: the bays' stop
+11, the slide check hoisted -5, `dey` for the warning's check -1, the fall
into `rail_lock` -3); `rail_lock` 55 -> 51 (`boss_record_a`, -4);
`rail_column` 140 -> 128 (the ring's flush as four passes of
`boss_frame_timers` -10, one window for both rails, -12); `rail_late` 75 -> 71
(the jamb's fall-through, `tya` for the stack, -4); the tables 20 -> 14 B
(`rail_cannon` / `rail_module` / `rail_record` / `rail_window` out - side x 2,
`rail_guns + 2 + side` - the lens cells in, -6); the scratch and state 10 ->
6 B (slot D's and the column map's idle bytes, -4); the look tail 41 -> 43
(the cannons' shared open look two cells taller, +2). Slot A 13 B
lighter. Charset **80 of 80 codes** (5 sectors, 640 B: the locked lens one
plain glyph; a steel - not olive - locked cannon would need 3 glyphs more).
Entry 66 sectors / 253 host frames. Stress 7,433 -> 7,723 (level 4) and
7,325 -> 7,615 (level 5) of 8,500 (MEASURED, the composition: its worst, two
cannons' kills with the lasers warning, draws and rebuilds a four-row
module; the hook ESTIMATE about +60 cycles a frame, the flush's four passes
about +330 on a slide's column frames). Regions 1, 3, 4 compile
byte-identical. `tests/boss-region-2.test.mjs` to the new rules: RED on
`110c274` 5 of 20 (the layout, the looks, the locked bay, the window, the
beams), GREEN here 20 of 20; the boss tests 299 of 299. Atari800 frames of
the built ATR (`region-2-diag-1`, `DFTRACE_SHOT_HOSTS`): a locked bay's beam
from under its bars, an open cannon's from its muzzle.

#### 6.5.13 The look's quality (2026-10-15) — awaiting the owner's look

**The owner's look at `3b5a8ea`:** the bay layout accepted; the quality not -
the cannons blockier and less detailed than in the window build, the locked
cannon muddy olive, the rail ends plain blocks (the charset at 80 of 80).
The owner allows a simple gate for the doors and pre-approves one more
charset sector (no more).

**Codes freed:** the open doors one plain gate glyph (`"stages": false`, -2);
the two nozzle codes - never drawn in region 2 - out of the charset's run
(the converter: a region with `nozzles.phases` false and no nozzle cell keeps
them at codes 126-127, the charset area's last bytes, which the engine's
nozzle step writes unseen; -2); the bays' armour is the doors' bar glyph.
Not enough: the art below needs 88 codes - **the sixth sector** (96 codes,
768 B).

**The art:** the cannon redrawn (it was region 1's tower cropped to two
cells, its lens cell broken): a stepped spire pointing up at the track, a
belt, the legs' arch round the lens at its foot - open lit amber (windows,
panels, lens), locked the same steel unlit: grey with dark insets, no
colour-3 pixel (tested); the lens alone staged, the heat its own lamp (E2).
The rail ends a buffer beam each side (mirrored): a steel post, a plate with
diagonal hazard stripes facing the bay, a rounded buffer head with an amber
pad. The dome's top three cells their own glyphs again (round). Pods and
core unchanged.

**Budget:** charset **88 of 96 codes, 6 sectors**; the boss entry **67
sectors, 256 host frames** (MEASURED, `region-2-diag-1`: +3), the banner
task's headroom 24 frames under the hard 280 (decision AM; the banner task
absorbs it with R3 and R4, the owner's call). Region 2's block 511 of 512 B
(509 used, 2 unused in its data room)
(no code change), 0 resident bytes, stress 7,723 / 7,615 of 8,500
(unchanged), the PAL audit 0 misses. Regions 1, 3, 4 byte-identical.

#### 6.5.14 Phase B finished — as built (2026-10-15) — `OWNER-SMOKE CANDIDATE`

**The owner's look at `478389b`: accepted**, and his standing rule (journal
§AU 6): a boss may spend charset / disk sectors and memory on its quality
while the hard gates hold - the boss entry <= 280 host frames, the worst
fence margin >= 500, the DMA gate 32,568, the boss-sector stress <= 8,500, no
resident byte without asking.

**Tuning by data (MEASURED, the aiming bot's ratio; level 4 / levels 5-6,
E / M / H, seconds; before = `478389b`, after = this branch):**

| bot | level 4 | levels 5-6 | doors phase on MEDIUM (L4 / L5-6) |
| --- | --- | --- | --- |
| careful | 89.8 / **109.6** / 142.8 | 89.8 / **112.4** / 143.7 | 12.1 / 13.2 s |
| careful, leaving beams | 90.4 / 109.6 / 147.8 | 90.4 / 116.7 / 149.6 | 12.1 / 12.5 s |
| careless | 85.1 / 100.4 / 130.1 | 85.1 / 99.6 / 129.2 | 13.2 / 13.2 s |
| careless, leaving beams | 84.7 / 109.9 / 139.4 | 85.1 / 108.7 / 137.4 | 13.2 / 12.9 s |

Every target holds before any change - the careful bot on MEDIUM inside
90-120 s, EASY shorter, HARD not shorter, the doors phase 8-15 s with the time
in the core (core phase 783 / 786 frames on MEDIUM against the doors' 293 /
320) - so **no hit point moves** (rail guns 15, cannons 8, doors 22, core 74);
the escort's cadence (decision AI) unchanged: 8-12 escorts a fight. After =
before, frame for frame (the game's bytes did not change in this step).

**Trace clauses (scripts/runtime-wall-trace.mjs, the rails' block; new
observer columns `boss_exposed`, `bay_cells`, `bay_stops`, `bay_maps`,
`laser_missiles`, `beam_rows`, `beam_armour`, `beam_below`, `jamb_map`; the
manifest's `rails.sides[].bay` and `hangar.jamb`):** the bays locked at the
start (neither cannon exposed, both armour cells the doors' bars, a bay's
shots stopped under its armour row); a cannon exposed only after its side's
first rail kill and at most 8 frames after it (MEASURED: 1 frame); open and
uncovered, its armour gone and its shots meeting its muzzle row; a covered
cannon never met by a shot's column again; no beam line in the cannons' rows
on any fight frame; a beam's armour-row bit off while its cannon was locked
and on once it was open or covered, on under the band always; the doors
unlocked only with every cannon destroyed or covered and every rail gun
destroyed; the core's flank armour on every frame after the doors fall; the
careful bot's doors phase on MEDIUM <= 15 s. The aiming bots' sessions on a
boss-region route are that region's sessions (its clauses run on them).
**34 sessions** (the 24 aiming-bot sessions on the level routes of level 4
and levels 5-6, `region-2-diag-0..2`, `-dodge-2`, `-finale-0..2`,
`-edge-left-1`, and the two-beam `region-2-diag-1` / `-finale-1`): 0 clause
failures, 0 misses; 24-1,000 beam frames checked a session; the careless
order covers both cannons in every run; the left-edge guard holds. Region 2's
boss frames: worst fence margin **5,804** (a slide's column frame - the
ring's flush, four passes of `boss_frame_timers`; 6,478 on the window build),
DMA-on **29,984**, the entry **256** host frames in every session.

**The evidence (regenerated: build:candidate -> runtime:wall-trace -> the
menu raster -> build -> memory-map -> the GIF -> the showcase):** 58 replays,
0 misses, 0 clause failures, 16 boss entries; worst fence margin 1,260
(2-sweep-fire6) and DMA-on 31,059 unchanged; region 1's boss frames 8,937 /
30,315 (8,897 / 30,315: slot A's `boss_hit` -13 B shifted the code after it).
Region 2's block 511 of 512 B (509 used), slot A 2,034 of 2,048 B, 0 resident
bytes; ATR `77382e29`. `npm test` twice on the default build: 1,393 of 1,394
(the recorded preview failure), reconciled, 0 NEW, 0 MOVED. **S5 complete.**

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

### 7.2 Region 1's boss tuning (2026-10-09 / 2026-10-10)

The owner's smoke of region 1's Blockade Breaker on 2026-10-09 found two things.
The player could hide at a screen edge, and the guns were too durable. The
owner's decisions of 2026-10-10 (journal §AH; plan
[boss-r1-tuning.md](boss-r1-tuning.md)):
* **variant B**: far-end guns gun-5 and gun-6 behind plate-a and plate-h; every
  gun 28 → 14, the emitter 20; plates a and h 16 → 12; one Interceptor stream in
  region 1's boss sector (`lights: 1`, 6 escorts, spacing 100), replacing "no
  Light escort in R1";
* **the fight's length is measured with the aiming bot** (`boss-aim`) in the
  boss sector, as a ratio against `main`'s plain-sweep replay; the
  director-complete replays switch to it in the boss sector only;
* the look tail at its 110 B cap is accepted.

The later region sessions inherit three things. Regions 2–4 are copies of this
region 1: 15 modules, the look tail full, the escort in level 1's data only. The
tier-4 laser fixture is at the 16-module limit. The fight-length rule is read by
the aiming bot's ratio.

### 7.3 Region 1's twin laser cannons and the band rework (2026-10-13)

`feat/boss-r1-twin-lasers` (journal §AP; plan
[boss-r1-twin-lasers.md](boss-r1-twin-lasers.md); `OWNER-SMOKE CANDIDATE`)
reworked region 1, and **regions 2 and 4 inherit it** as its copies (their
review routes `--boss-region=2|4`; entry 65 sectors each):
* **two laser cannons in slot 1**, fired in turn, never two beams at once on
  any level - region 1 and its copies carry no slot-2 emitter, so on levels
  5-6 and 10-12 the tier's second and later slots find none; region 3 keeps its
  own three emitters;
* **the hull spine** along row 0, the weapons hanging from it, the plates a
  **one-row belt** at row 4; 16 modules (the converter's limit), 105 codes,
  the look tail unchanged at 110 B;
* **the shown band:** the list ends the band under its last row with a cell
  (5 rows for regions 1, 2 and 4, 8 for region 3, whose field is row 7), so a
  shot under the belt is drawn in the playfield's charset and colours; a later
  region's layout must keep every module and the field on a shown row (the
  converter refuses one below);
* slot E 366 → 496 B (3 → 4 sectors, the lasers' admission moved there for the
  twins), slot D 1,655 → 1,661 B (13 sectors): the boss entry stays 65
  sectors for regions 1, 2 and 4 (region 1's charset 7 sectors, one fewer),
  region 3 66 → 67;
* the laser fixture's slot-1 emitter is region 1's emitter-l (named "emitter"),
  with plate-c removed as well.

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
