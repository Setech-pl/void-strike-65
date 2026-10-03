# Plan — M5: the loading platform (M5a) and the boss (M5b)

**PLANNING session, 2026-10-03. `OWNER REVIEW CANDIDATE`.** Branch
`docs/plan-m5` from `main` `7ccd57e` (tag `v0.2.1`). **Nothing here is
implemented; this document is the deliverable.** No source, cfg, build-script,
harness, level or evidence byte changed; three probe builds were made under
`build/level-1-s0/` and reverted (§3). The ATR and the boot image are the ones
`main` ships.

Owner decisions of 2026-10-02 that this plan records (and
[../plan-realizacji.md](../plan-realizacji.md) §0 now carries): **M5 is split
into M5a, the loading platform — code overlays loaded from disk at
transitions and a fast SIO loader with automatic fallback — and M5b, the
boss built on it.** Release `v0.2.1` is the checkpoint before the loading
rework; `v0.3.0` ships after the whole of M5. The order stays M5 → M4 →
M3 + M3-H → M6 → M7 → M8 → M9, systems freeze after M6.

**The short answer.**

* **The overlay platform changes who pays for the boss.** Priced as resident
  code the boss took the `$AE00` window negative (budget §3: −535 B at M5 in
  the old order; [m3-waves-heavy.md](m3-waves-heavy.md) §6.3: the M3 sessions
  start 738 → 1,058 B short). As an **overlay** the boss costs the window
  **~170 B of resident hooks** and lives on disk otherwise. Re-priced in the
  new order the window ends M6 at **−38 B budgeted (+112 on expected
  figures)**, before any wish-list item and before any lever; one lever
  (§6.2) covers it with the whole of M3 and M6 inside. The brief's three
  levers stay reserves.
* **The overlay slot is the capital-phase code.** 4,791 B of resident code and
  data run only while a capital hull is on screen (MEASURED, label spans,
  §2.4); 3,795 B of it is in `BROADSIDE`. Regrouped contiguous and reached
  through a 20-entry vector table, that range is the slot the boss overlays
  at boss entry and the level read restores afterwards. No new DFMC record,
  no boot sector, no initial-block code.
* **The HSCROL/LMS band is feasible in this engine, with one condition.**
  The ring is already a per-row LMS list rebuilt every rotate frame
  (§2.6), so a band of fixed rows with the HSCROL bit costs ~30 cycles of
  CPU per frame. What it costs is **DMA: MEASURED 90 cycles of fence margin
  per band row** (§3), 720 for an 8-row band — more than the budget's 72 (IC)
  — and a third DLI **MEASURED 174**. With one Light allowed, a boss frame
  clears GO only if the **world scroll stops in the boss sector** (the ring
  returns ~1,545 per frame and has no rotate frames for a break-up to be
  forced onto); with the scroll kept, the worst one-Light frame is **~300
  under GO** (§5.4). Owner question Q1.
* **The fast loader is hardware-proven only.** Atari800's SIO is patched for
  speed and models no drive latency; the standard-speed figure the evidence
  carries (49 frames for 13 sectors, 3.77 frames/sector) is wire time. The
  owner's smoke on SIO2SD and on a real drive is the first test of the
  high-speed negotiation; a stock 1050 has no high-speed mode and takes the
  fallback, where debt item 5 (no sector interleave) doubles every figure.
* **Of the twelve wish-list items, nine are recommended** at a combined
  ~550 B of window plus overlay and disk space; speech is possible but costs
  0.9–4.6 s of load per level and is recommended against; nacelles and the
  far-star layer are deferred (§7).

---

## 0. Step 0, sources and conventions

### 0.1 Step 0 record

| | |
| --- | --- |
| `main` | `7ccd57e docs: contact-scenario-redesign done — STATUS, plan as built, M5 follow-up`; tag `v0.2.1` on the same commit; tree clean |
| contact-scenario-redesign on `main` | yes — `docs/plans/contact-scenario-redesign.md` |
| worktrees | one: `/Users/marcinkrzetowski/Projects/dark-fighter` (no baseline worktree was needed: no source changes) |
| ATR SHA-256 | `f127d7a48674c7b2cdf103d3808b4145938a8d687586b82e83b3bcb651f33cd1` (92,176 B) |
| boot SHA-256 | `1daed1be86e54b1e3195228aa3b05f20d2501a87efc5403ca0638b60e943bd33` (26,752 B) |
| evidence binding | `build/manifest.json` `runtimeEvidence.status: final-bound`, the same two hashes |
| trace emulator | `build/atari800-trace`, prepared from the current header (the harness's own freshness check passed on every run) |

### 0.2 Baseline, each figure with its source

| Figure | Value | Source |
| --- | --- | --- |
| worst line-238 fence margin (GO ≥ 500) | **1,439** (`2-evasive-fire3` f287, Heavy spawn on a rotate frame) | STATUS "Heavy break-up rotate gate" table; re-measured in this session's focused run of that replay: 1,439 |
| DMA-on maximum / physical headroom | **31,133 / 4,435** (`director-complete-2-natural-sweep-fire0` f5797) | `docs/runtime-wall-trace.json`; manifest `gameplayMusic.measuredWallCyclesDmaOn` |
| DLI per host frame / sequence violations | 2 / 0 | same, `gate.memory_integrity` |
| initial block content / STOP / ceiling | **13,621 / 13,652 / 13,684 B** (31 B to STOP) | manifest `transportCapacity.initialBootContentBytes`; AGENTS.md |
| boot / extension / total sectors | **107 / 102 / 209** | manifest |
| ATR menu frame / recorded baseline | **547 / 596** (warn 606, fail 646) | evidence `boot_smoke.sessions[].boot_deadline`; `docs/boot-deadline-baseline.json` |
| `$AE00` window used / free | **2,104 / 1,480** (Director half 1,369, Light kernel 735) | manifest `residentCapacity.basicWindow` |
| `HYBRID_C_ARENA` used / free | **797 / 35** (record 7: 719 packed of 747) | manifest `residentCapacity.arena` |
| `BROADSIDE` zero pins | **119 B** (103 + the 16-B codebook reserve) | STATUS rotate-gate table; `src/main.s` |
| `DIRECTOR_RAM` | **602 / 645** (43 free) | `build/encounter-director.map` (`DIRECTOR_C_RODATA` 20 + `DIRECTOR_C_CODE` 582) |
| record 2 (pickup stream + `HYBRID_C_SECTOR`) | **1,128 / 1,131**, 3 B spare | manifest records |
| unowned RAM | **22 B** (`$8133-$813F` 13, `$85E6-$85EE` 9) | `cfg/encounter-director.cfg`; m3-waves-heavy §6.3 |
| recorded clause failures | **1** — `lower-playfield-hostile-contact-atr-hard`, class (a), assigned to M5 | `docs/recorded-gate-failures.json` |
| `npm test` | **910 tests**; recorded failures: `preview` (C, fails) and `runtime-wall-trace` "ten heaviest frames…" (D, recorded, passes by coincidence) | contact-scenario-redesign §8.3; `docs/recorded-test-failures.json` |
| sector reader | 1,473 / 1,536 B, **63 B free**; AI pool 8 × 38 B = 304 B of placeholders | manifest `sectorReader`; `src/hybrid/sector-reader.s` |
| level read at START GAME | **49 frames for 13 sectors** (3.77 frames/sector), 0 wire retries — EMULATOR, patched SIO | evidence `boot_smoke.sector_reader` |
| free ATR sectors | **511** transport-free; levels occupy 13 of the 400 reserved from sector 320, so **498** are free today and **319** after twelve 16-sector levels | manifest `remainingAtrSectors`; `scripts/build.mjs` `levelBaseSector` |
| latest release | `v0.2.1` = `main` `7ccd57e` | `git tag` |

### 0.3 Where the brief and the repo differ

The repo wins in each case.

1. **"Roughly 330 free sectors after twelve levels"** — 319 at 16 sectors per
   level, 355 at 13 (arithmetic on the manifest). In range; the plan uses 319.
2. **"The listed levers give about 1,190 B"** — m3-waves-heavy §6.3 totals
   **1,187 B** (`LEVEL_BUFFER` 256, `STARFIELD` tail 309, arena 95, pins 15,
   splash RAM 512). Of those, the arena's 95 and the pins' 15 are what is left
   *after* the M3 sessions' own moves, not today's figures (35 and 119).
3. **"Sector change where a loading screen already exists"** — none exists
   mid-level today. The only loading screen is START GAME's
   (`sector_reader_show_loader`); the capital sector is entered seamlessly
   through the drain test. The boss entry therefore needs a transition of its
   own (§5.2), and this plan designs one.
4. **The boss concepts** are `docs/boss-concepts.md` with the three
   illustrations in `docs/media/concepts/`, not a `docs/media/boss-concepts`
   directory.
5. **The budget's band DMA figure (72 cycles per HSCROL row, IC) is low.**
   MEASURED 90 of fence margin per row on the binding frame (§3). The budget's
   third-DLI range (62–180) holds: MEASURED 174.
6. **`package.json` says `0.1.1`** while the latest tag is `v0.2.1`. Not
   touched here (release packaging is M9's); noted so the next release bumps
   it.
7. **The boss sector exists in the Director already**: `SECTOR_KIND_BOSS` has
   its ceiling row (`subtype_ceiling_light[3] = 0`, `heavy[3] = 0`,
   `src/c/director.c:187-231`), `boss_id` and the 62-B `boss_def` are reserved
   in the level format, and a level whose last sector is `boss` validates.
   Nothing consumes them; the owner's "no Heavy, at most one Light" is a table
   edit (`light[3] = 1`).

### 0.4 Conventions

* **M** measured (file or run named); **IC** instruction count from the
  source; **AN** analogy to a named routine of measured size or cost; **G**
  guess. **EMULATOR** marks a load-time or SIO figure that Atari800 cannot
  vouch for on hardware (debt items 2 and 5).
* Estimates are `expected → budgeted`, budgeted = expected + 20 %. Measured
  figures carry no reserve unless the text says so.
* Sizes of existing routines are label-to-next-label spans from the `.lbl`
  files, local labels attributed to the preceding global label (script in
  the session scratchpad; not committed — it is forty lines of `node` over
  `build/void-strike-65.lbl`).
* Packed size of new code: 0.78 of raw (the window record's ratio). **AN**.
* Load time: **3.77 frames per sector** at standard speed, EMULATOR
  (49 / 13). A real 1050 with logically ordered sectors: ×2 (debt item 5,
  owner-accepted estimate). SIO2SD at ultra speed divisor 6: the wire runs
  ~3.6× faster (§2.9 arithmetic); the drive's own latency is unmeasured, so
  the plan quotes ÷3 as an **ESTIMATE**.
* "Window" is `HYBRID_C_WINDOW` `$AE00-$BBFF`; "slot A" is the capital
  overlay slot of §4.1; "the reader" is `src/hybrid/sector-reader.s`.

---
## 1. Decisions this plan records and works under

### 1.1 In force — not reopened

ATR only; stock 65XE/800XL-class PAL, 64 KB, no 130XE RAM, no stereo, no
NTSC. `LEVEL_MAX_ID` 16 and the 16-sector level image budget; level 2 out of
the default replays. No new boot sector; initial block ≤ 13,652 B; the ATR
menu frame inside the recorded rule (baseline 596, warn +10, fail +50). GO
needs a worst fence margin ≥ 500; hard DMA gate 32,568. The ATR boots with
BASIC on or off, without OPTION; RESET is a cold start to the splash. The
Spread volley is all-or-nothing; capsules every third Heavy or debris shot
kill. The Heavy break-up is deferred off rotate frames (released `v0.2.1`);
the spawn rotate gate is a reserve lever, not taken. **Boss sector: no Heavy,
at most one Light.** Order: M5 (M5a, then M5b) → M4 → M3 + M3-H → M6 → M7 →
M8 → M9; systems freeze after M6; `v0.3.0` after the whole of M5.

### 1.2 Taken on 2026-10-02 for this plan

| # | Decision | Where it lands |
| ---: | --- | --- |
| 1 | Code overlays loaded from disk at transitions; code used in one phase leaves resident RAM; the boss is the first overlay; the other candidates are named with bytes returned | §4 |
| 2 | A fast SIO loader, always with automatic fallback to standard speed; owner smoke on SIO2SD and on a real drive | §4.3 |
| 3 | Window levers allowed if overlays are not enough: `LEVEL_BUFFER` 16 → 14, the `STARFIELD` tail, the splash RAM; the plan picks the cheapest | §6.2 — none is needed for M5; the `STARFIELD` tail is the one named for M6 |
| 4 | Re-price the window with M5 before M4 | §6.1 |
| 5 | Four regional bosses on one code path; graphics and parameters per region from disk | §5.1 |
| 6 | The boss body in its own display-list band, moved with HSCROL/LMS at almost no CPU; feasibility confirmed or the cheapest alternative asked | §5.3 — feasible; the condition is Q1 |
| 7 | Phases: 2–3 destructible guns, then the core | §5.1 |
| 8 | Lasers: PMG projectiles in one colour; 1 / 2 / 4 on levels 1–4 / 5–8 / 9–12; a vertical beam with a ~0.5-s warning | §5.5 |
| 9 | A third DLI, in the boss sector only | §5.3 |
| 10 | End of the fight: chain explosion, screen shake, score bonus; until M4: "SECTOR CLEARED" and back to the menu | §5.6 |
| 11 | Fight length ~45–60 s on MEDIUM, tuned by data in M8 | §5.1 (data), M8 |
| 12 | Nova Missile is not in M5; an M6 booster; no hook unless free | §5.7 — one free hook named |
| 13 | The hostile lower-row contact gets an honest scenario on the boss's lasers | §5.8 |
| 14–25 | The wish list, priced; the owner chooses before the freeze | §7 |

---

## 2. Phase A — inventory (what is true today, with file:line)

### 2.1 How the game loads

| Step | Mechanism | Where |
| --- | --- | --- |
| Boot | The OS loads 107 consecutive boot sectors (the initial block, 13,621 B of content) raw to `$2000`; `boot_entry` (24 B at `$2006`) calls the stage-2 loader, which runs as an **overlay at `$21C1-$26F4`** inside `CODE` and is overwritten by the resident suffix once the records are in | `src/main.s:1169-1224`, `:12142-12831`; `cfg/atari-boot.cfg` `BOOT2_RAM` |
| Extension records | A DFMC v1 manifest (190 B, 11 of `CHUNK_MAX_COUNT` 11 records, CRC-16) read through the **OS `SIOV` (`$E459`)** while the OS is still alive, each record validated (CRC-16 per record, staging and final-destination overlap checks), LZ-10/5 records expanded by `broadside_unpack_command`, raw records landed in place | `src/main.s:12294-12599` (`boot_stage2_atr_entry`, `:12356 jsr SIOV`), `:12758 boot_stage2_crc16`; `scripts/chunk-loader.mjs` |
| Record capacity | `sectors × 128 − 21` B; the full map is budget §1.2; the two full ones are record 2 (3 B) and record 5 (0 B); record 8 (the window) is 9 sectors, 1,067 / 1,131 | manifest `transportCapacity.manifest.parsed.records` |
| The LZ decoder | `broadside_unpack_command` + `broadside_copy_match`, **90 B at `$205C-$20B5` in the resident prefix of `CODE`** — resident for the whole runtime, and already called at level start by `unpack_capital_hull_maps` (`:3326`) with a source/destination pair in zero page | `src/main.s:1252-1300` |
| START GAME | The frontend jumps to the frozen vector `$A000`; the reader blanks the display, silences audio (`AUDCTL = 0` — POKEY channels 3+4 become the serial clock), shows the loader screen, reads the level, validates it, then `start_gameplay` rebuilds everything | `src/hybrid/sector-reader.s:168-199` |
| The level read | **Direct SIO** (owner decision W): one 5-byte command frame per sector (`'R'`, D1:), ACK, COMPLETE, 128 data bytes + checksum, polled on `IRQST` with `sei` set and `NMIEN = 0`; `SKCTL $23` to send, `$33` to receive; three wire attempts per sector, two device probes per load; budgets in VCOUNT frames | `sector-reader.s:300-660`; facts in `docs/diagnostics/sio-protocol-facts.md` |
| The level image | 16-sector `LEVEL_BUFFER` at `$A600` (2,048 B); the image is 13 sectors: header 8 B + gameplay music player (code 262 + data 241 in a 512-B block, 120 B free) in sectors 1–5, the enemy hull block (280 B + 104 B pad) in 6–8, the LevelDef core page 9–10 (`$AA00`), the payload page 11–12 (`$AB00`, `boss_def` 62 B at offset 194, unread), the HullGeometry page 13 (`$AC00`); sectors 14–16 spare (384 B) | manifest `sectorReader`, `gameplayMusic.placement`, `capitalHulls.levelBlock`; `docs/level-authoring.md` |
| Validation | magic `VS`, format 1, level id, sector count against the 16 × 3 B directory (`sector_reader_lookup`, `_resident_hit`, `_validate`); no CRC on the level image — the per-sector checksum is the wire check | `sector-reader.s:742-812` |
| Resident skip | A buffer already holding the requested level sends no command frame (the second START GAME) | `sector-reader.s:382-390` |
| The loading screen | `frontend_text_display_list` (ANTIC 2), `render_frontend_data`, title + `ENGAGING ENEMY SECTOR` + one of 8 AI placeholder lines, a dotted row stepped once per sector (decision O), `DISK READ FAILED` / `PRESS FIRE` on the failure path; DLI-free, `NMIEN = 0`, DMA on | `sector-reader.s:205-320`, `:818-880` |
| Failure | `NO DRIVE` / `READ ERROR` / `BAD DISK` / `WRONG DISK`, FIRE returns to the menu | `sector-reader.s:277-319` |

**What the reader can already do that the overlay platform needs:** read N
sectors from an absolute sector into any destination (`sr_dst` is a zero-page
pointer, set from `LEVEL_BUFFER` at `:396-399`); whole-sector granularity;
retries; a settle between attempts. **What it cannot do:** read to a caller's
address (the destination is a constant), read a run that is not a level (the
directory is 16 levels), send a data frame (write), or run at any speed but
`AUDF3 = $28`.

### 2.2 What is resident, and in which phase each piece runs

Phases: **boot** (stage 2, splash), **menu** (MAIN MENU, OPTIONS, TOP SCORES,
EXIT, GAME OVER), **loading** (the reader's screen), **fighter** (SWARM /
ELITE sectors), **capital** (hull traversal), **boss** (not built), **pause**
(inside fighter/capital). MEASURED label spans, `build/void-strike-65.lbl`.

| Group | Bytes | Segments (initial block unless noted) | Phase | Overlay candidate? |
| --- | ---: | --- | --- | --- |
| Stage-2 loader | 1,332 | `BOOT_STAGE2`, an overlay over `CODE` | boot | already one |
| Splash blob | 512 | `BOOT_SPLASH`, copied to `$0500-$06FF` | boot | already one; its RAM is lever 10 |
| Loader bitmap + its display list (packed) | 496 | `RODATA` | boot | no — shown before any record is in |
| **Frontend code** | **706** | `CODE` `$2210-$25CE` (interleaved with the stage-2 overlay's addresses) | menu | yes, with 149 B shared (`render_frontend_data` 41, `encode_frontend_character` 62, `read_frontend_data` 11, `frontend_text_display_list` 32, `clear_pmg_graphics_latches` 3 — the loader and pause screens use them) |
| Frontend screen data and tables | 565 | `RODATA` | menu | yes |
| Menu music player + data | 867 | `STARFIELD` `$58D1-$5C34` (code 353, data 514) | menu | yes |
| Menu stars | 49 + 59 | `STARFIELD`, `ENTITY_CODE` | menu | yes |
| Frontend display lists, structure draws, H3.1 glyphs | 778 | `ENTITY_CODE` | menu | yes (the game-over list and draws, 179 B, stay if GAME OVER is to appear without a read) |
| Difficulty/options/game-over helpers | 164 | `BROADSIDE` | menu | yes |
| Pause (menu, quit, backup/restore, silence/resume audio) | ~470 | `BROADSIDE` `$5F3B-$61E7` | pause | no — reached from every gameplay phase |
| **Capital group** (hull rows, muzzles, broadside shells, launch flashes, capital explosions, player-vs-hull contact, hull data) | **3,795** | `BROADSIDE` (33 call sites from `main.s`, ~20 distinct entries) | capital | **yes — slot A** |
| Capital scroll and row preparation | 332 | `ENTITY_CODE` `$92EA-$95CE` | capital | yes (part of slot A's vector set; stays resident in v1, §4.1) |
| Hull map unpack | 115 | `CODE` `$286A` | level start | no (runs at `start_gameplay`) |
| Allied hull glyphs | 549 | `RODATA` `capital_hull_glyphs` | level start (copied into the charset) | data; the boss reuses the charset codes 59–89 at run time (§5.1) |
| Heavy formation C (spawn, tick, break-up claim, veneers, RODATA) | 606 | `HYBRID_C_ARENA` (record 7) | fighter | not needed in the boss sector, but the arena is one LZ record landed at boot: a second slot there costs a second restore run; not taken in v1 |
| Light kernel C + ASM | 735 + 1,369 (Director half) | window (record 8) | fighter, capital, boss | no |
| Everything else (`CODE`, `ENTITY_CODE`, `PICKUP_CODE`, `A2_KERNEL`, `STARFIELD`, the rest of `BROADSIDE`) | — | — | all gameplay phases | no |

The 3,795 B of the capital group are listed by routine in the session
scratchpad; the names are the `broadside_*`, `*_hull_*`, `*muzzle*`,
`capital_*`, `*_prow_*`, `launch_flash*`, `engine_animation*`,
`*_sector_module*` and `*_sector_row` labels of `BROADSIDE` from
`clear_top_hull_row` (`$6537`) to `provisional_capital_broadside_request`
(`$77B2`), excluding the shared pads and `world_rotate_due`. The group is
**not contiguous today**: `update_enemy`, `draw_enemy_member`, the pause code,
`gameplay_dli`, `init_broadside`'s neighbours (`update_player_death`,
`respawn_player`) and the frontend helpers sit between its members.

### 2.3 The `$AE00` window ledger today

| | Bytes | Source |
| --- | ---: | --- |
| capacity | 3,584 | `cfg/encounter-director.cfg` |
| Director C half (`HYBRID_C_WINDOW` + RODATA, record 8) | 1,369 | manifest `basicWindow.directorHalfBytes` |
| Light kernel (`HYBRID_ASM_WINDOW`, record 9) | 735 | `lightKernelBytes` |
| **free** | **1,480** | `freeBytes` |
| guard | 6 at `$BC1A` | cfg |

`DIRECTOR_RAM` (`$9D75-$9FF9`): 602 / 645, **43 free**; it overflows into the
window by design at 3 B per veneer (Director plan §3.3). `HYBRID_C_SECTOR`
215 / 248 (33 free, record 2 has 3 packed B). Arena 797 / 832 (35 free).

### 2.4 PMG and DLI use per sector type

| Sector | Players | Missiles | DLIs | Palette | Source |
| --- | --- | --- | --- | --- | --- |
| fighter OPEN | `P0` player; `P1`/`P2` Heavy; `P3` capsule + explosion mask | all four free | 2 (HUD → gameplay, gameplay → HUD; `gameplay_dli` phases 0/1) | `COLPF0` white, `COLPF1` allied steel (patched per level), `COLPF2` `$1E`, `COLPF3` hostile red, `COLPM3` gold | `src/main.s:3546-3600`; `docs/memory-map.md` "PMG ownership" |
| capital | `P0`; `P1`/`P2` undrawn, their colour lent to `M1`/`M2`; `P3` mask | `M1`–`M3` broadside shells, `M0` free | 2 | `COLPM3` `$28` | same |
| boss (planned) | `P0`; `P1`/`P2` unused (no Heavy); `P3` capsule/mask | **`M0`–`M3` lasers**, `PRIOR` `$10` so all four take `COLPF3` — the mode the capsule's move to `P3` freed | **3** (the band's palette DLI, decision 9) | band palette on `COLPF0-3` under the third DLI; the HUD and the ring keep theirs | §5.3, §5.5 |

The missile plane `$3B00-$3BFF` is written only by the broadside today and
the trace watches it as `missile_plane_rows` in OPEN frames — a boss-sector
exception to that clause is harness work (§5.9).

### 2.5 The display list, for the band

`build_playfield_display_list` (`src/main.s:5665-5725`, `A2_KERNEL`, 19 B
free) writes 90 B: `$C2` + LMS `$4000` (HUD, DLI), `$44` + LMS (the fixed
divider), 27 × (`$44` + LMS from `PLAYFIELD_ROW_LO/HI`) with the last row `$C4`
(DLI), `$41` JVB. Two lists on page `$7F` (`$7F10`, `$7F6A`), the next one
prebuilt on rotate frames (`prebuild_next_playfield_display_list`) and
selected mid-frame by the first DLI writing `DLISTL` (`:3557-3560`). The game
never writes `HSCROL` or `VSCROL` (grep). The ring rows are 40 B each in
`$8140-$8577`; a row with the HSCROL bit makes ANTIC fetch 48 B, so the band
rows need their own memory of ≥ 48 B per row — the level buffer's dead
sectors in a boss sector (§4.1, slot B).

### 2.6 The music player and its data, per-track loading

Gameplay music is **already loaded per level**: the player (262 B code) and
its track (241 B data) are the first 512 B of every level image
(`src/hybrid/gameplay-music.s`, `cfg/gameplay-music.cfg`, vectors at `$A608`),
so a different track per region costs **no resident byte and no sector** — it
is a build mapping and a JSON per region (§7 item 14). The data is addressed
absolutely inside the block (`gm_columns + id*8`), so a **second track at run
time is a copy over the first** (241 B, up to 361 with the block's pad), not
a pointer change; the player restarts through `GAMEPLAY_MUSIC_START`. The
menu player (`music_tick` etc., 353 + 514 B in `STARFIELD`) is resident and
menu-only.

### 2.7 Is the OS SIO path usable at transitions? Read and write.

**No, for either direction**, and owner decision W already settled it. The
runtime holds `sei`, `NMIEN` carries only the DLI bit, the OS VBI never runs,
and the OS display shadows point at `$BC20` or — cold-started with BASIC —
at `$9C20`, inside Director code (memory-map "The window at `$A000-$BFFF`").
`SIOV` needs the serial IRQ vectors and the VBI-driven timeout timer
(`CDTMV1`), so it would require reviving the OS VBI for the call and
protecting the display from its shadows on both sides. The direct reader
avoids all of it. **Writing** (the high-score save, §7 item 16) is the same
direct path with the data frame sent instead of received: the transmit
primitive (`sector_reader_tx_loop`, `:447-470`) already sends a 5-byte frame
from a table; generalising it to a pointer and a count (~15 B) plus the
`'W'`/`'P'` command, the ACK after the data frame and the COMPLETE wait is
**~70 → 84 B**, IC.

### 2.8 What a POKEY volume-only sample needs

Volume-only mode is `AUDCx = $10 | volume`: one 4-bit write per sample, paced
by `sta WSYNC` (one PAL line = 64.3 µs → 15.6 kHz, two lines → 7.8 kHz, three
→ 5.2 kHz). The player is ~40 → 48 B (IC); the CPU is fully occupied while it
plays, which is fine on a transition screen. The sample must be **in RAM**
before it plays: at 19 kbaud the wire delivers ~1,900 B/s and the polled
receive loop cannot interleave a paced write, so streaming is out at
standard speed and marginal at 52 kbaud (5,200 B/s against 3,900 B/s for
7.8 kHz 4-bit). It cannot play *during* a read either: channels 3+4 are the
serial clock. Costs and the recommendation are §7 item 17.

### 2.9 Fast SIO — the facts the loader session builds on

Standard speed is `AUDF3 = $28` (40): PAL POKEY 1,773,447 Hz / (2 × (40 + 7))
= **18,866 baud** (NTSC 19,040). The high-speed protocols the SIO2SD and the
common drive upgrades implement (sources: the SIO2SD and a8-pico-sio
documentation, the HiassofT highspeed-SIO notes; **to be re-checked against
the Altirra HRM ch. 9 "high-speed" material in the loader session before
any byte is written**, exactly as 4.3 did for the base protocol):

| Protocol | Negotiation | Command frame | Data frame | Divisor → PAL baud |
| --- | --- | --- | --- | --- |
| **Ultra speed** (US Doubler, Happy, Speedy, SIO2SD's default) | command `$3F` "get speed index" at standard speed; the reply is a one-byte data frame carrying the POKEY divisor | at the high rate | at the high rate | `$0A` → 52,160; `$09` → 55,420; `$06` (SIO2SD default) → 68,209 |
| XF551 | none; bit 7 of the command byte | standard speed, command `| $80` | divisor `$10` → 38,553 | SIO2SD v3 supports it as an option |
| 1050 Turbo | its own | — | divisor `$06` | not planned |
| Stock 1050, 810 | none: `$3F` is NAKed or ignored | standard | standard | fallback |

Wire time per 128-B sector (command 5 B + ACK + COMPLETE + 128 + checksum =
136 B × 10 bits, plus the two hold windows ≈ 1.8 ms): **3.7 frames at
18.9 kbaud** — which is what the emulator measured (3.77), so Atari800 models
the wire and nothing else; **1.3 frames at 52 kbaud, 1.0 at 68 kbaud**. The
receive loop's per-byte budget at 68 kbaud is 147 µs ≈ 260 cycles, of which
ANTIC's text-mode DMA takes up to ~35 %: ~170 cycles for a loop that needs
~70 (IC on `sector_reader_rx_loop`). Fine without changing the loop.

**Whether `build/atari800-trace` emulates the `$3F` reply is unverified.**
Atari800's `sio.c` is the gate's SIO; if it answers `$3F` with a NAK the
emulator proves only the fallback path, and the fast path is hardware-trust
like the hold windows (decision R). The loader session checks `sio.c` first
and records which it is.

---

## 3. Measurements (this session; probe builds under `build/level-1-s0/`, reverted)

Method: `node scripts/build.mjs --level=1` (the debug-route variant the
harness accepts for `--artifacts=`), then `runtime-wall-trace.mjs
--artifacts=build/level-1-s0 --only-session=2-evasive-fire3` (the binding
replay: 920 frames, the worst row f287). One run takes 17 s; a build 4 s.
Baseline on the variant: margin **1,439**, max wall **30,409**, identical to
the default build's. Every probe was byte-neutral in its segment so that no
label moved. `git diff -- src cfg scripts assets` was empty before and after.

| # | Probe | Edit | preWait (binding row) | fence margin | max wall | Label |
| ---: | --- | --- | ---: | ---: | ---: | --- |
| P1 | HSCROL on **all 27** ring rows | `$44` → `$54`, `$C4` → `$D4` in `build_playfield_display_list` | 23,826 → 26,487 (+2,661) | 1,439 → **−1,222** | frames overran (64,347) | MEASURED but polluted by overruns: ≈ 99 per row, corroboration only |
| P1b | HSCROL on the **last** ring row | `$C4` → `$D4` | 23,826 → 23,826 | 1,439 → 1,451 | 30,409 → 30,407 | the last row is below line 238: **a band row under the fence costs the margin nothing** |
| **P1c** | HSCROL on the **divider row** (above the fence) | divider `$44` → `$54` | 23,826 → 23,882 (+56) | 1,439 → **1,349 (−90)** | 30,409 → 30,369 | **MEASURED: one HSCROL row above the fence = −90 of margin** (IC said −72) |
| **P2** | A **third DLI** (WSYNC + four colour stores + phase) on the divider row | divider `$44` → `$C4`; 36 B of handler in the `LOADER_SPLASH_CODE_SLACK` pin; +3 B `jmp` paid from the codebook reserve | 23,826 → 24,000 (+174) | 1,439 → **1,265 (−174)** | 30,409 → 30,506 (+97) | **MEASURED: −174 of margin, +97 DMA-on**; the `WSYNC` wait is most of it. `dli_ordering_errors` 1,839 as expected from the harness's two-DLI model |
| M4 | Standard-speed read | — | — | — | — | MEASURED (evidence): 49 frames / 13 sectors, 0 retries, EMULATOR |
| M5 | Capital group, frontend group, Heavy C | label spans | — | — | — | MEASURED: 3,795 + 332 + 115 + 549 B capital; 3,129 B frontend (2,800 movable); 606 B Heavy C |

**What the overlay design rests on and was checked by reading, not run:**
the LZ decoder is resident (`$205C`); the reader's destination is a zero-page
pointer; the frozen vector table at `$A000` has a reserved third entry
(`sector_reader_drain_ready`, `:$A006`); the build places level runs at
absolute sectors from 320 and refuses overlaps (`scripts/build.mjs:2047-2060`),
so overlay runs are the same mechanism from a second base.

---
## 4. M5a — the loading platform

### 4.1 The overlay model: slots, not a loader rewrite

An **overlay** is a run of raw sectors the resident reader copies to a fixed
address at a transition. Two slots:

| Slot | Address | Bytes | Resident content outside the boss | Boss-sector content | Restored by |
| --- | --- | ---: | --- | --- | --- |
| **A** | inside `BROADSIDE`'s run range — the capital group regrouped contiguous (the exact bounds fall out of the regrouping; ~`$6500-$73FF` is the shape) | **≥ 2,048** of the group's 3,795 | the capital group's code and data (hull rows, muzzles, shells, flashes, explosions, contact) | boss code: ASM (band, lasers, DLI, collision, explosion) **and** the boss C controller (its own cc65 segment linked at an address inside the slot) | the level read, when a "boss resident" flag says the slot was overwritten: 16 sectors |
| **B** | the level buffer's hull block and spare sectors, `$A880-$A9FF` (384 B) and `$AC80-$ADFF` (384 B) | 768 | the enemy hull block (dead once the capital sector is over) and the spare | the band's screen memory (8 rows × 64 B = 512 B) and the boss region tables | the next level read, by definition: **0 extra sectors** |

**Why slot A is the capital group and not the window, the arena or the
frontend.** The window's two halves run in every phase. The arena's Heavy C
(606 B) is idle in a boss sector but is one LZ record landed at boot with
non-Heavy code interleaved, and 606 B is too small for the boss alone: a
second slot there buys nothing in v1. The frontend (2,800 B movable) is idle
during every level, but it lives in the initial block across four segments
whose addresses tests and the ABI pin — moving it is risk 4 and its reward
is initial-block room, which M5 does not need (§4.5). The capital group is
3,795 B of one segment, idle exactly when the boss is on screen, and it is
reached from the resident code through ~20 entry points — few enough for a
vector table.

**The vector table.** Twenty 3-byte `jmp`s (60 B) that every resident call
into the capital group goes through: frame tick (`update_broadside`), shell
scheduling, warning render, scene scroll, launch flashes, engine animation,
sector completion, player-hull contact, hull row generation and preparation,
muzzle tracking (three), capital explosions (tick, render, restore), shell
collisions (three), slot free, `init_broadside`. The 33 `jsr` sites in
`main.s` become operand-only edits to the table (byte-neutral in `CODE`,
`ENTITY_CODE` and `BROADSIDE`; the packed initial block may move by a few
bytes — STOP condition below). The capital overlay's table entries point at
the real routines; the boss overlay ships its own table image with the same
slot meanings (tick → boss tick, render → band and lasers, contact → laser
and module collisions, completion → boss death, the rest `rts`). **The table
lives in the window** (`HYBRID_ASM_WINDOW`, 60 → 72 B), because `BROADSIDE`
has 3 free bytes and its pins are priced to M3; each overlay carries its
table image at its head and the loader copies it in after the read (15 →
18 B in the reader). The 332 B of capital scroll code in `ENTITY_CODE`
stay resident in v1 and are reached through the same table, so a boss
sector never executes them.

**Regrouping `BROADSIDE`.** Source-order moves inside `src/main.s` so that
the group's members are contiguous and the slot's first byte is the table
image. Everything else in `BROADSIDE` keeps its relative order; the zero
pins keep their sizes; the segment's total is unchanged. Risk 3 (a layout
change): hot Light and Heavy code may cross pages (memory
`window-layout-page-crossings`), so the session proves cycles with the
binding replay on both builds, not with CSV diffs.

**Which variant of restoring.** Two were priced:

| | (a) the capital group leaves record 1 at boot and is read with every level | (b) the group stays in record 1; only the slot is restored after a boss |
| --- | --- | --- |
| Boot | −25 sectors (record 1 LZ 44 → ~19), ATR menu ≈ −50 frames | unchanged |
| Every level start | +30 raw sectors (3,795 B) ≈ +113 frames (2.3 s) EMULATOR, every level | +16 sectors ≈ +60 frames (1.2 s) EMULATOR, **only after a boss was fought** (never on the first level of a game) |
| Mechanism exercised | on every START GAME from day one | only after the boss exists (M5b); M5a S1 exercises it through a harness-only "force restore" and the boot smoke's byte compare |
| Transport bytes | record 1 shrinks; nothing else moves | nothing moves |
| **Recommendation** | — | **(b)**: cheaper per level, byte-neutral in transport, and the menu baseline has room already (547 of 596). Q6 |

### 4.2 The loader's generalisation (reader changes, S1)

| Change | Bytes (reader) | Basis |
| --- | ---: | --- |
| `sector_reader_read_run`: read `count` sectors from `sector_lo/hi` to `(sr_dst)`, the loop `:401-445` factored out of `sector_reader_load` with the destination and the run taken from a 5-B directory entry; reached through the reserved vector `$A006` (`sector_reader_drain_ready` moves to `$A009`; the order is "append, never reorder", and 4.9 has not bound `$A006` yet — a frozen-vector change the plan states, Q11) | 40 → 48 | IC |
| Overlay directory, generated by the build like `level-directory.inc`: `{sector_lo, sector_hi, count, dest_lo, dest_hi}` × 8 entries (capital restore, boss code, 4 × boss region, hangar, scores) | 40 | fixed by the format |
| "Boss resident" flag: set by the boss transition, cleared by the restore; tested at `sector_reader_start_gameplay` before the level read | 15 → 18 | IC |
| Table-image copy after a read (60 B to the window table) | 15 → 18 | IC |
| A read entry that keeps the current display (the boss-entry banner) instead of the loader screen: skip `sector_reader_show_loader`, keep `AUDCTL = 0` | 10 → 12 | IC |
| **Total** | **120 → 136** | against 63 free |

The reader is 73 B short on budgeted figures. The cheapest cover is **the AI
line pool 8 → 4 lines (+152 B)**: the lines are placeholders, decision O's
shape (8–16) is kept as the pool's *format*, and the hangar screen (§7 item
18) moves the texts to disk altogether and returns the rest. Q3 lists the
two alternatives (the buffer 16 → 15 with every level address moved; the
loader logic in the window at −200 B).

### 4.3 The fast loader (S2)

| Change | Bytes (reader) | Basis |
| --- | ---: | --- |
| `$3F` probe once per cold start, at the first read: send the frame at standard speed, expect ACK, COMPLETE, one data byte + checksum; store the divisor (`sr_divisor`, 1 B BSS); a NAK, silence or a bad checksum leaves `$28` | 55 → 66 | AN `sector_reader_read_sector` (the same frame/ACK/COMPLETE/data path with count 1) |
| `sector_reader_pokey_setup` writes `AUDF3 = sr_divisor` instead of `#$28`; the command frame goes out at the same rate (Ultra speed) | 4 | IC |
| Fallback: a sector whose two first wire attempts fail at the fast rate resets `sr_divisor` to `$28` for the rest of the session and retries at standard speed; the failure screen is reached only after the standard attempts fail too | 25 → 30 | IC |
| XF551 mode | not in v1 (needs a per-frame speed switch and the `| $80` command); priced at 30 → 36 B if the owner's drive is an XF551 (Q10) | — |
| **Total** | **84 → 100** | funded by the AI pool with §4.2 (120 + 84 = 204 → 236 budgeted against 63 + 152 = 215: **21 B short on budgeted figures, 20 B spare on expected**; the hangar session returns the remaining 152) |

Load time per sector, wire only: 3.7 frames standard, ~1.3 at `$0A`, ~1.0 at
`$06`. SIO2SD latency per command is unmeasured; the plan quotes **÷3** for
SIO2SD at ultra speed as an ESTIMATE until the owner's smoke gives a
wall-clock figure. A stock 1050 takes the fallback: ×2 (debt item 5).

**Owner smoke items for S2** (added to `hardware-testing.md` §11 by the
session): SIO2SD with ultra speed enabled (default index 6) — the level
loads, the dotted row steps faster, no `READ ERROR`; SIO2SD with high speed
disabled in its menu — the game loads at standard speed with no visible
difference from today; the real drive (Q10: a stock 1050 proves the
fallback, a CA-2001 or an upgraded drive proves the fast path on real
electronics); the SIO2SD powered off mid-read — the failure screen within a
few seconds on both paths; a marginal cable — a fast-path error falls back
rather than failing.

### 4.4 The boss-entry transition (platform half; the boss half is §5.2)

The Director raises `BOSS_DUE` as it raises `CAPITAL_DUE` (a flag bit, C in
the window, 20 → 24 B) when its row clock enters the BOSS sector; the sector
C waits for `sector_c_drain_clear` (no Light, no shot, no debris published)
exactly as the capital entry does, then calls the transition: freeze the
frame, write a one-row banner into the HUD row (`WARNING` — the HUD charset
has the glyphs), silence audio, read the boss overlay (slot A code 16
sectors + the region's data 10 sectors into slot B, the glyph staging and
the music copy), copy the table image, install the band's display list,
start the boss music, unfreeze. The read runs with the display on (ANTIC 4
DMA; the receive loop's margin at standard speed is ~900 cycles per byte,
§2.9) and the gameplay DLIs off (`NMIEN = 0` as in the reader, then
restored). **Duration: 26 sectors ≈ 98 frames (2.0 s) EMULATOR, ~0.7 s
SIO2SD fast (ESTIMATE), ~4 s on a 1050.** Channel 1 is free during the read
and carries a held warning tone. The harness treats the window as the level
read is treated (a milestone with a frame window, not missed frames).

### 4.5 Overlay candidates, with bytes returned

| Candidate | Phase | Bytes it returns | Where they are returned | Cost | Session | Verdict |
| --- | --- | ---: | --- | --- | --- | --- |
| **Boss** | boss | — (it never becomes resident: 1,980 B budgeted that the window would otherwise pay) | window | 26 sectors read at boss entry; 16 restored at the next level | M5b | **the first overlay** |
| **Capital phase** (as the slot) | capital | the slot itself: ≥ 2,048 B of RAM that another phase may use | `BROADSIDE` run range | regrouping (risk 3); 16-sector restore after a boss | M5a S1 | **built in M5a** |
| Menu / title | menu | **2,800 B raw ≈ 2,180 packed B of the initial block** (code 706 + data 565 + music 867 + lists and draws 599 + helpers 164, less the 149 B shared with the loader and pause and the 179 B of GAME OVER kept resident) | `CODE`, `RODATA`, `STARFIELD`, `ENTITY_CODE`, `BROADSIDE` — four initial-block segments; the menu then lives in slot A and is re-read at every return to the menu (22 sectors ≈ 83 frames, 1.7 s EMULATOR) | risk 4: every pinned address in those segments moves; boot −17 sectors but the menu read lands before the first menu frame (≈ net 0 on the deadline) | optional M5a S4, or never | **defer**: M5 does not need initial-block room; revisit only if the initial block binds before M6 (Q7) |
| Hangar / loading screen | loading | 152–304 B of the reader (the AI pool to disk) | reader | 10 sectors per level start | M5a S3 (§7 item 18) | **do** |
| End of campaign (decision P's animation) | end | 0 (nothing resident today) | — | its own overlay in slot A when M4 adds the campaign-complete screen | M4 | **plan for it**: the slot exists |
| Heavy C in the arena | boss | 606 B | arena | a second slot and restore run | — | **not in v1** |

### 4.6 What M5a does not change

The DFMC format and the 11 records; the boot path and stage 2 (no boot
smoke re-baseline); the level format; the window's two records beyond the
72 B table; the harness's clauses (M5a adds clauses, §4.7).

### 4.7 Tests and clauses for M5a

* Build-time: the overlay directory's runs do not overlap levels or each
  other and lie inside the 720 sectors; the capital restore run equals the
  bytes the resident image holds at the slot (a byte compare in
  `tests/`, the way the level image is compared); the slot's bounds and
  the table's 20 entries pinned.
* Boot smoke: the slot's bytes after START GAME equal the restore run
  (so the restore path cannot silently diverge from the boot image) — a
  byte compare like `level_image_verified`.
* A harness-only "force restore" env (`DFTRACE_FORCE_OVERLAY_RESTORE`) sets
  the boss-resident flag before START GAME so the restore read runs on a
  default-build replay: one command frame per sector, 0 retries, and the
  binding replay's PAL figures unmoved (the read is outside the measured
  frames).
* The fast loader: the 6502 harness tests `$3F` with ACK/COMPLETE/data,
  NAK, silence and a bad checksum, and a fast-rate failure falling back
  mid-load; in the emulator, whichever path `sio.c` supports is gated
  (§2.9).

---

## 5. M5b — the boss

### 5.1 Form: one code path, four regions of data

The boss is a **BOSS sector** (the level's last; the format already carries
`sector_kind = BOSS` and `boss_id`), not an enemy archetype (decision 21).
One overlay of code; per region (levels 1–3, 4–6, 7–9, 10–12 as AC has it;
Q5 on the 4-level tiers) one data run:

| Region data | Bytes | Lands in | Notes |
| --- | ---: | --- | --- |
| band map, 8 rows × 64 B | 512 | slot B (`$A880`–, `$AC80`–) | 64 cells = 1.6 screens wide; the visible 40 scroll across 24 cells of travel |
| module glyphs, 31 | 248 | charset codes **59–89** — the capital hull's codes, free in a boss sector; restored by `publish_level_hull_style` at the next level start | staged through the pause backup (`$7810`, 960 B) and copied, because a 2-sector read would overrun into code 90 |
| module table: up to 12 modules × (cell x, row, width, HP, kind: armour / gun / core, laser column) | 72 | slot B | the guns' order of exposure is the data's business |
| laser parameters: count by level tier (1 / 2 / 4), warning frames, beam frames, cadence, damage by difficulty | 16 | slot B | decision 8; M8 tunes |
| palette for the third DLI (4 colours) and the shake amplitude | 6 | slot B | |
| boss theme (music v2 track data) | 241 → ≤ 361 | copied over the level's track at `$A608 + 262` | §2.6 |
| **Per region** | **≈ 1,160 → 10 sectors** | | 4 regions = 40 sectors |

The **boss code** (slot A) is one image for all regions:

| Part | Bytes | Owner | Basis |
| --- | ---: | --- | --- |
| controller: phases (guns → core), module HP and damage, exposure rule, laser cadence and selection, win, score bonus | 600 → 720 | **C** (`HYBRID_C_BOSS`, its own cc65 segment linked into the slot) | AN budget §2 M5 |
| band draw and module damage (cell rewrites in the band map) | 290 → 348 | ASM | AN `draw_hull_row` 191, `broadside_hits_opposite_hull` 124 |
| shot-versus-module test (five player shots against the module table, with the scroll offset) | 60 → 72 | ASM | IC |
| lasers: missile column fill during the warning, `HPOSM` on fire, erase, the column collision | 200 → 240 | ASM | AN `update_broadside` 249 and the missile erase/draw ~110 |
| band display-list builder variant (fixed top rows with HSCROL + LMS into slot B; the ring continues below), reached by re-pointing the `jmp` at `prebuild_next_playfield_display_list` | 60 → 72 | ASM | AN `build_playfield_display_list` 90 |
| the boss DLI (three phases; replaces `gameplay_dli` through `VDSLST` for the sector) | 80 → 96 | ASM | AN `gameplay_dli` 60 + P2's 36 |
| HSCROL / coarse LMS motion (one `HSCROL` store per frame; eight LMS low bytes every 16 colour clocks) | 40 → 48 | ASM | IC |
| chain explosion, score bonus, "SECTOR CLEARED" hand-off | 120 → 144 | ASM + C | AN `render_shared_fighter_explosions` 83 |
| entry transition (boss half: banner, glyph and music copies, band install) and exit | 80 → 96 | ASM | IC |
| the table image | 60 | — | fixed |
| **Total** | **1,650 → 1,980 B → 16 sectors** | | fits slot A's ≥ 2,048 |

**Resident hooks (what M5b costs the window and the rest):**

| Hook | Bytes | Where | Basis |
| --- | ---: | --- | --- |
| `BOSS_DUE` raised on sector entry; the drain wait; the transition call | 40 → 48 | window (C, beside `sector_c_update_first_capital`'s pattern) | AN `sector_c_update_first_capital` 60 |
| screen shake (vertical: the HUD header's blank-line count toggled 8 → 7 → 6 for N frames) + `COLBK` flash trigger, **shared with the player's death (§7 item 25)** | 40 → 48 | window | IC |
| `subtype_ceiling_light[3]` 0 → 1 | 0 | window RODATA (a value) | decision 5a |
| boss state: phase, module cursor, laser timers (4), shake timer, flag | 10 | `ENTITY_STATE`'s ~32 free or zero page `$AC+` — **not** the unowned gaps M3 is priced on | IC |
| `DIRECTOR_RAM` | 0 (the dispatch is in the window's `compute_ceiling_row` already) | | |
| initial block | 0 → ~8 (operand re-points of S1 can move the packed size) | `CODE`/`ENTITY_CODE` operands only | G |

### 5.2 The boss sector, frame by frame

Entry as §4.4. Then: the world scroll **stops** (Q1 — the recommendation),
so the ring does not rotate and `rotate_playfield_rows` (1,545–1,614, M)
is not paid; the near stars keep their one-line fine phase inside the cell
for eight frames and then hold (`update_white_starfield_phase`), which
reads as a station-keeping fighter under a drifting sky. The band oscillates
with one `HSCROL` store per frame and a coarse LMS step every 16 colour
clocks (slow: one colour clock per 2–3 frames, data). The player fights in
the 19 ring rows below the band (152 scanlines; the lower playfield rows
≥ 191 are inside it). Phase 1: 2–3 guns exposed in the module table's
order; a gun with HP 0 becomes a wreck glyph; phase 2: the core. Each gun
owns a laser column (its cell x + the scroll offset); the controller picks
the next firing gun by cadence; the warning runs ~25 frames with the gun's
glyph cycling through two "heating" phases and a rising tone, then the beam
fires for 50 frames as a full-height missile column from the gun's row to
the bottom, in `COLPF3`. One Light (the Director's own admission, ceiling
1) may escort. The win: the core's HP reaches 0 → the chain explosion
(six shared fighter explosions sequenced along the band, `COLBK` flashes,
the shake), the score bonus, then `sector_c_begin_complete`'s path
("SECTOR CLEARED" through the existing LEVEL COMPLETE route, then the menu).

### 5.3 The band and the third DLI — feasibility

* **HSCROL/LMS**: feasible. The list is per-row LMS already, rebuilt by a
  routine the overlay can re-point; eight band rows get `$54` and LMS into
  slot B, the remaining 19 rows are the ring's. The band's rows never
  rotate; the ring's rotation (if kept) touches only its own 19 rows, so
  `rotate_playfield_rows`' row count shrinks to 19 in a boss sector (one
  constant the overlay patches, or the ring keeps 27 with 8 hidden rows —
  the session measures which is cheaper; the first is the IC favourite).
* **CPU**: ~30 → 48 cycles per frame (IC). "Almost no CPU" confirmed.
* **DMA**: **MEASURED −90 of fence margin per band row above the fence**;
  8 rows −720, 6 rows −540. An all-rows probe put the 27-row figure at
  −2,661, consistent. This is the band's real price and it is paid on every
  boss frame.
* **The third DLI**: **MEASURED −174** of margin and +97 of DMA-on wall on
  the binding frame for a `WSYNC` plus four colour stores; budgeted 210.
  It gives the band its own palette (the module art may use four colours
  that are not the ring's) without a change to the art rule for the rest of
  the game — the rule says gameplay adds no DLI for a *local* colour; the
  owner decided the boss sector is the exception (decision 9).
* **The one condition** is cycles with a Light on screen: §5.4.

### 5.4 Cycles on a boss frame

Start from the binding ELITE row (1,439 over the fence at line 238). The
boss sector does not run the Raider pair (**1,467–1,585, M**; 1,500 taken)
or, with no Light, the Interceptor (257, M): **3,196 available**. Costs,
budgeted:

| Item | Cycles | Basis |
| --- | ---: | --- |
| controller tick | 240 | AN one Light's update (257 mean) |
| shot-versus-module (five shots) | 108 | IC |
| lasers, 1 / 2 / 4 | 100 / 200 / 400 | IC (missile fill a few rows per frame, staggered) |
| band DMA, 8 rows | **864** (720 M + 20 %) | P1c |
| third DLI | **210** (174 M + 20 %) | P2 |
| HSCROL / LMS motion | 48 | IC |
| M6's booster hook | 48 | budget §2 M6 |
| module-destroyed burst (deferrable, token) | 200 | budget |
| one Light: standing / on a path / firing / its break-up burst | 257 / +115 / +150 / **1,063** | M (budget §2 M5) |

| Boss frame (4 lasers, 8-row band, M6 included) | scroll kept | **scroll stopped** (+1,545 returned; no rotate frames) |
| --- | ---: | ---: |
| 0 Lights, steady | 1,278 | 2,823 |
| 1 Light on a path, firing | 756 | 2,301 |
| 1 Light's break-up on its forced frame | **−307 — under GO** | **1,238** |
| 2 lasers / 1 laser, worst row above | −107 / −7 | 1,438 / 1,538 |
| DMA-on maximum on a boss frame (31,133 − 1,757 + costs) | ~31,800 — over the 31,200 target, under the hard gate | **~30,270** |

**So the owner's form is affordable only with the world scroll stopped in
the boss sector, or with a 6-row band and no Light, or with the pool
lever.** The recommendation is the first: it is a property of the boss
design (a station-keeping fight in front of a slowly oscillating hull), it
costs no byte, and it keeps every boss frame under the 31,200 target. Q1.

The band's DMA also applies to the **capital** frames of nothing — the band
exists only in boss sectors. Fighter and capital frames are unchanged by
M5b: nothing resident runs on them except the `BOSS_DUE` test, ~12 cycles
on the sector row tick, which runs on world rows, not frames.

### 5.5 Lasers

One colour (`COLPF3`, hostile red, through `PRIOR $10`), one missile per
laser, up to four on levels 9–12 — the hardware maximum, and the Nova
Missile mark must stay on `P3` (budget). A laser's life: **warning** ~25
frames (decision 8's ~0.5 s): the gun glyph alternates two heating phases
(two of the 31 region glyphs), a rising tone on channel 2 (the lead voice,
which the hit SFX already pre-empts), and the missile column is filled
below the gun 8 rows per frame (~100 cycles/frame) but kept off screen
(`HPOSM` 0); **beam** 50 frames: one `HPOSM` write puts the column on the
gun's x; the collision is a column compare per frame against the player's
`HPOSP0` ± width (20 cycles) and against the one Light and the five shots
(~130); "destroys everything in its path" removes the Light (its own
break-up, token-gated) and retires the shots; **erase**: `HPOSM` 0, the
column cleared over the next frames. Damage to the player goes through
`apply_player_damage` with a new source id so the contact clauses can tell
a laser from a shell. A laser never fires on a frame whose gun is dead.

### 5.6 End of the fight

Chain explosion: six `render_shared_fighter_explosions` instances sequenced
every 8 frames along the band's modules (the existing shared explosion
records, resident), `COLBK` flash on each, the shake for 24 frames (window
routine, §5.1), the band's cells rewritten to wreck glyphs as the chain
passes. Score bonus: `boss_def`'s reward through the BCD add
(`light_add_score`'s path). Then `sector_c_begin_complete` → the complete
scroll → until M4 exists, the LEVEL COMPLETE route to the menu with the
HUD row reading `SECTOR CLEARED` (the text through the HUD glyphs, 14 B in
the overlay). The boss-resident flag is set before the hand-off so the next
START GAME restores slot A.

### 5.7 Nova Missile — not in M5; one free hook

Nothing is built. The one hook that is free: the laser collision's "retire
a player shot in the column" branch is keyed on the shot's weapon class,
and the class byte already exists per slot; a Nova class would fall through
it untouched. No byte is spent on it.

### 5.8 The hostile lower-row contact scenario (decision 13)

The recorded session `lower-playfield-hostile-contact-atr-hard` asks for a
capital-shell contact in the lower rows from the hostile hull — rare and
late on HARD, and its steering predates the raster collision (F5/F6). The
boss's lasers make a low hostile hit ordinary: the beam reaches the bottom
rows on every firing. M5b replaces the session's premise with one the game
can keep:

**Session `lower-playfield-laser-contact-atr-hard`** (ATR, HARD, level 1,
policy `lower-contact-laser`): the `sweep` bot plays level 1 to the boss
sector (level 1's last sector arms at ~8,249 frames today; the budget is
~9,500 frames with the boss entry's read window excluded as the START GAME
read is); on `sector_state = BOSS` the bot holds the bottom clamp (y 225,
x 148) with the respawn invulnerability released through the game's own
tick (the preamble mechanism of the contact redesign); when a gun's warning
starts, the bot steers to that gun's column (the band scroll offset
included) and waits; the beam's first frame is the contact.

Clauses, in order:
1. 16 consecutive contact rasters captured; on each, the laser's missile
   column (`HPOSMn`, missile rows) intersects P0's raster bounds, and the
   player's rows are ≥ 191 (lower playfield);
2. exactly one `apply_player_damage` entry in the capture window, with the
   **laser** source id (not a shell: `apply_broadside_player_damage` is not
   entered);
3. full hull 10 → 10 − `LASER_DAMAGE[HARD]`, lives 3, alive, no
   invulnerability on the hit frame, cooldown armed after it;
4. the warning preceded the beam by ≥ 24 frames (the gun's glyph phases
   observed in the band map, the channel-2 tone observed in `AUDC2`);
5. the beam lasts 50 ± 1 frames at a constant column; it ends with
   `HPOSMn = 0`;
6. nothing else in the column survives it: no live Light and no player shot
   with an x inside the column on the beam's first frame + 1;
7. PAL: 0 miss events; fence margin ≥ 500 on every boss frame; the two
   gameplay DLIs are three in the boss sector (the harness's DLI model
   learns the third: `maximum_dlis_per_host_frame` 3 and the ordering check
   extended to the three-phase sequence — harness work);
8. the boss-entry read: one command frame per sector, 0 retries, inside a
   recorded window; no gameplay frame inside it.

**The old session**: retired by name into `removed_2026_…` of
`docs/recorded-gate-failures.json` when the laser session passes (its
diagnosis F5/F6 is kept there), so the recorded set does not carry a
scenario the game cannot contain. Q4 offers "keep both".

### 5.9 Harness work M5b owes (not runtime bytes)

The third DLI in the harness's DLI model; a boss-sector exception for
`missile_plane_rows` in OPEN frames; a boss-entry read milestone; the band's
map as an observable (slot B); the laser source id; `sector_state = BOSS`
in the CSV. The M5b session that touches the harness regenerates the
evidence and re-points nothing that passes today.

### 5.10 Tests for M5b

Build: the boss code image ≤ the slot; the four region runs ≤ 10 sectors;
the band map's rows do not cross a 4 KB boundary (ANTIC's LMS counter);
glyph count 31; the music copy ≤ 361 B. 6502 harness: the controller's
phase machine (guns before core, exposure order, HP, win), the laser
cadence and selection with dead guns skipped, the shot-versus-module test
with a scroll offset, the shake timer. Native: `director-complete-1/2`
extended through the boss (today they end at LEVEL COMPLETE: they gain the
fight), the laser session of §5.8, a `boss-escort` replay with the one
Light alive through a break-up, PAL audit on all of them with the fence
≥ 500. Cycle pins: the boss tick ≤ 300 native, the band DMA by the measured
90 × rows, the third DLI ≤ 180.

---
## 6. Ledgers

### 6.1 The `$AE00` window in the new order (M5 → M4 → M3 → M6), with and without overlays

Figures `expected → budgeted`; the M3 sessions are the m3-waves-heavy plan's
928 → 990, M4 and M6 the budget's 150 → 180 each.

| Point on the road | **With overlays** (this plan) | Without overlays, boss B-A | Without, boss B-B |
| --- | ---: | ---: | ---: |
| today | 1,480 | 1,480 | 1,480 |
| after M5a (the vector table, 60 → 72) | 1,420 → 1,408 | 1,480 | 1,480 |
| after M5b (`BOSS_DUE` + shake, 80 → 96) | 1,340 → **1,312** | 340 → **112** (−1,140 → −1,368) | 270 → 28 |
| after M4 | 1,190 → 1,132 | 190 → −68 | 120 → −152 |
| after M3 session 1 (333 → 352) | 857 → 780 | −143 → −420 | −213 → −504 |
| after session 2 (99 → 114) | 758 → 666 | −242 → −534 | −312 → −618 |
| after session 3 (496 → 524) | 262 → **142** | −738 → **−1,058** | −808 → −1,142 |
| after M6 | 112 → **−38** | −888 → −1,238 | −958 → −1,322 |
| the brief's levers (1,187) | not needed until M6; one (`STARFIELD` tail, 309) covers M6 with 271 to spare | −51 after all five levers | −135 |

The totals without overlays are §6.3's — the order moves who is short, not
by how much. **With overlays the shortfall of 1,058 B at the M3 sessions
disappears**; what is left is M6's 38 B, which any single lever covers.

**With the recommended wish-list items** (§7: attract 200 → 240, starfield
density/speed 50 → 60, high-score initials entry 150 → 180 — the items that
have no home but the window): after M6 **−518 B budgeted (−288 expected)**.
Levers in the order this plan recommends: the `STARFIELD` run tail (309,
risk 3) and the arena's post-M3 95 → −114; then `LEVEL_BUFFER` 16 → 15
(128, the buffer keeps two spare sectors so slot B still holds the band)
→ +14; the splash RAM (512) stays the reserve — **its risk falls from 4 to
2 with the loader, which can read four sectors to `$0500` at START GAME**
instead of needing a boot-time copy. `LEVEL_BUFFER` 16 → 14 is **not**
recommended: slot B needs the spare sectors (§4.1).

### 6.2 RAM, by home, after M5

| Home | Today free | M5a | M5b | After M5 | Note |
| --- | ---: | ---: | ---: | ---: | --- |
| window | 1,480 | −72 | −96 | **1,312** | §6.1 |
| sector reader | 63 | +152 −136 −100 = −84 → **−21 budgeted, +20 expected** (S1 + S2); the hangar session (S3) returns +152 → **+131** | 0 | 131 with S3, −21 without | Q3 |
| `BROADSIDE` | 3 (+119 pins) | 0 (regrouped, byte-neutral) | 0 (the boss lives in the slot) | 3 (+119) | the pins stay M3's |
| arena | 35 | 0 | 0 | 35 | |
| `DIRECTOR_RAM` | 43 | 0 | 0 | 43 | |
| `HYBRID_C_SECTOR` / record 2 | 33 / 3 | 0 | 0 | 33 / 3 | |
| `ENTITY_STATE` (~32) | ~32 | 0 | −10 | ~22 | boss state |
| unowned RAM | 22 | 0 | 0 | 22 | left for M3 |
| initial block to STOP | 31 | ±8 (G: operand re-points move the packed size) | 0 | **23 … 31** | STOP if negative |
| slot A (new) | — | ≥ 2,048 | −1,980 | ≥ 68 | the boss's home |
| slot B (new) | — | 768 | −610 | 158 | band map 512 + tables ~100 |

### 6.3 Transport, sectors and the disk

| | Today | After M5 | Note |
| --- | ---: | ---: | --- |
| boot sectors | 107 | 107 | no new boot sector |
| extension sectors | 102 | 103 | the window record 9 → 10 (1,067 + ~131 packed B of hooks and table > 1,131) |
| total transport | 209 | 210 | |
| ATR menu frame (baseline 596, warn 606) | 547 | ~549 | 2 frames per sector, sizing rule |
| disk, level runs from 320 | 13 used | 192 reserved (12 × 16) | sectors 320–511 |
| disk, overlay runs from 512 | — | capital restore 16, boss code 16, regions 40, hangar 10, attract 4, scores 1 = **87** | sectors 512–598; speech would add 12–61 |
| free sectors after twelve levels and every recommended item | 319 | **232** | |

### 6.4 Load time, by transition (frames at 3.77 per sector; EMULATOR; 1050 ×2; SIO2SD fast ÷3 ESTIMATE)

| Transition | Today | After M5 (standard speed) | SIO2SD fast (est.) | 1050 (est.) |
| --- | ---: | ---: | ---: | ---: |
| START GAME, first level of a game | 49 (1.0 s) | 49; +38 with the hangar (1.7 s) | 0.3 … 0.6 s | 2.0 … 3.5 s |
| START GAME after a boss was fought (slot A restored) | — | 109 (2.2 s); +38 with the hangar (2.9 s) | 0.7 … 1.0 s | 4.4 … 5.9 s |
| boss entry (code 16 + region 10) | — | 98 (2.0 s) | 0.7 s | 3.9 s |
| return to the menu | 0 | 0 (the frontend stays resident) | 0 | 0 |

### 6.5 Cycles and DMA, by row family

| Row family | Today | After M5 | Basis |
| --- | ---: | ---: | --- |
| binding ELITE row (fence margin) | 1,439 | ~1,410 (the vectored calls that run every frame: ~+3 cycles each, ~10 of them — IC) | §4.1 |
| capital frames (no fence; maximum 30,568) | 30,568 | ~30,630 (+3 per vectored call, ~20 per frame) | IC |
| boss frames, worst with one Light, scroll stopped (recommended) | — | **1,238 over GO**; DMA-on ~30,270 | §5.4 |
| boss frames, worst with one Light, scroll kept | — | **−307 (under GO)**; DMA-on ~31,800 | §5.4 |
| DLIs per frame | 2 | 2; **3 in a boss sector** | decision 9 |

---

## 7. The wish list, priced (items 14–25)

"Home" names the segment or slot; "load" the per-transition effect; cycles
are on the worst row of the phase the item runs in. Recommendation: **do**
(in the milestone named), **later** (after M6's freeze it must be data
only, so "later" means the last code session before the freeze or never),
**drop**.

| # | Item | Lands | Bytes, per home and record | Resident / overlay / disk | Sectors | Cycles (worst row) | Load | Risks | Recommendation |
| ---: | --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| 14 | **Music per region (4 tracks) + a boss theme, from disk** | tracks: **M7** (data); the boss-theme copy hook: **M5b S5** | tracks **0 B** — the player and its track already ride in every level image (§2.6), so a region's track is the build picking a JSON per level; boss theme: 25 → 30 B of copy code in the boss overlay, 241 → ≤ 361 B of data per region run | tracks: disk (in the level images, 0 extra sectors); boss theme: overlay data | 0 (+ ~2 per region inside the 10 already counted) | 0 standing (same player; the GRA-2 figures 118 / 336 hold) | 0 | a region track must fit 361 B (16 patterns + the pad); composition is owner work | **do** (must-have, and nearly free) |
| 15 | **Attract / demo mode from the deterministic replays** | its own session after **M4** (the menu idle timer needs the campaign's menu flow), before M6 | input override in the window: a `jmp` re-point at `read_input` (byte-neutral in `CODE`) to a stream reader 60 → 72; menu idle timer + `DEMO` HUD label + exit on FIRE 80 → 96; the recorded input stream (RLE of stick/fire runs for ~1,000 frames, G 300–500 B) rides in a **level-image variant** of level 1 (id 13 of the 16 `LEVEL_MAX_ID` allows: level 1's 13 sectors + the stream in its 3 spare) **or** in a 4-sector overlay run into slot B; the Director's seed is the level header's (`CORE_SEED ^ difficulty`, `director.c:398`), so the demo forces the difficulty it was recorded on and nothing else — the harness replays prove the determinism the demo rests on | resident 200 → 240 (window); stream on disk | 16 (level variant) or 4 (run) | +20 on every frame (the stream read) — IC | the demo's level read (49 frames) when the menu idles | the recorded stream is hardware-deterministic only if every input-independent state is (the RNG and the frame clock are; VCOUNT-seeded choices like `sector_reader_pick_line` are not and must be excluded) | **do** (must-have); session `feat/attract-mode` |
| 16 | **High-score table on disk with initials; silent skip when write-protected** | **M4** (the campaign loop's frontend session) | SIO write primitive in the reader 70 → 84 (§2.7); the scores sector read at the first menu entry 20 → 24 (reader); initials entry (3 letters by stick) 150 → 180 — `CODE` is full, so the window; TOP SCORES rows with initials +40 → 48 (window, called through the frontend draw); RAM: 10 × 3 B initials 30 B (`$4FFA-$4FFF` holds 6; the rest in `ENTITY_STATE`) | resident; 1 disk sector | 1 | 0 in gameplay | +1 sector at the first menu entry (~4 frames); the write after a qualifying game over (~1 s on a real drive) | a write-protected ATR or disk answers `ERROR`/NAK: the skip is "any non-COMPLETE"; **the harness mounts `dist/` — a write during a trace session would change the shipped ATR's bytes and break the evidence binding**, so the harness must mount a copy (or `-readonly`) before this lands; a shared disk image carries its finder's scores (the owner's parked concern, now accepted) | **do** (must-have); the harness mount change is the prerequisite |
| 17 | **Digitised speech on the transition screen** | later, after the hangar; **M6** at the earliest | player 40 → 48 B (reader or the hangar overlay); the sample in transition-time scratch RAM: PMG pages `$3B00-$3FFF` 1,280 B + the gameplay charset `$4400-$47FF` 1,024 B + the hull maps `$4C00-$4E3F` 576 B (all rebuilt by `start_gameplay`) = **2,880 B in three pieces**; at 4-bit 7.8 kHz that is 0.74 s; 5.2 kHz gives 1.1 s | disk, read at every level start | **12 (0.6 s at 5.2 kHz) … 23 (2,880 B)**; a 2-s clip at 7.8 kHz is 61 sectors and does not fit RAM | 0 in gameplay; the CPU is the player's during playback | **+0.9 s (12) … +1.7 s (23) per level at standard speed, ×2 on a 1050**, to hear 0.6–1.1 s of 4-bit speech; the sample cannot play while the level reads (channels 3+4 are the clock) | intelligibility of 4-bit volume-only at ≤ 7.8 kHz is "recognisable 1980s"; the load it adds is longer than the clip | **possible; recommended against** ("not everything must be done"); if wanted: one word, ≤ 12 sectors, only with the fast loader landed |
| 18 | **Loading screen with a hangar** | **M5a S3** (or M4 if the owner prefers the loader untouched until then) | reader: a bitmap band (ANTIC E, 40 × 48 lines = 1,920 B, or ANTIC 4 with 64 custom glyphs = 240 + 512 B) read into the PMG pages / charset scratch before the level, the loader display list gaining the band (40 → 48 B); the AI texts move into the same overlay (−304 B resident, +80 → 96 B of band-and-text install) | overlay (slot: transition scratch), disk | 10 (ANTIC 4 form) … 16 (ANTIC E) | 0 | +38 … +60 frames per level start (0.8 … 1.2 s), ×2 on a 1050 | the band is on screen while the wire runs: ANTIC E's DMA takes ~35 % of a line, inside the receive loop's margin at every speed (§2.9); drawing is owner art | **do** (must-have); ANTIC 4 form recommended (10 sectors, reuses the frontend charset path) |
| 19 | **Capital hulls take damage where hit — both hulls** | later: **M7** (after the capital overlay exists) or **M8** | in **slot A** (0 window): after `restore_capital_explosion` the cell gets a damage glyph instead of its backing when the backing is a hull cell, 40 → 48; player-shot-versus-enemy-hull (today shots do not collide with hull cells beyond the prow) 60 → 72; 2 damage glyphs (16 B) in the free hostile-weapon codes 93–98 | overlay | 0 | **+150 … +200 on capital frames** for the shot-versus-hull test (five shots × ~35, IC) — capital frames have no fence and 2,000 to the hard gate | 0 | the mark scrolls away with the row (free: the ring row is recycled); the allied hull's marks from enemy shells are the existing impact path | **do later** (M7/M8): cheap once slot A exists |
| 20 | **Variable protruding nacelles narrowing the corridor (4.8a)** | **M7**, with the hull sets | slot A: per-row corridor extent read by the player clamp and the hull contact (`player_inside_universal_hull_corridor` assumes a fixed width) 150 → 180; a 27 × 2 B extent table 54 B (`ENTITY_STATE` is short: the window's RAM or zero page); the `hull_params` block (32 B, reserved in the payload page) becomes data; +1 B per map row in the hull block (104 B of pad there) | overlay + data | 0 | +40 … +80 on capital frames | 0 | fairness: the scroll squeezing the player (River Raid kills; here hull contact damages, 10 → 8); the hull row generator and the collision read the same table or they disagree | **later** (M7); it is 4.8a itself; the open "geometry 4.8a" item in budget §5.2 (13) gets this price |
| 21 | **Capital colours change every 4 levels, aligned with the laser tiers** | **M7** (data) | **0 B**: the allied steel is level data since hull step 2, the enemy style since step 2; the build's mapping (`alliedColpf1ForLevel`, `hullStyleIdForLevel`, `scripts/build.mjs:331-339`) changes | data | 0 | 0 | 0 | the enemy hull's colour is `COLPF3`, shared with every hostile accent — a per-tier *enemy* colour recolours shots and Interceptor pods; the allied steel and the enemy *style* per tier are free of that; **it supersedes AC's "regions of three" and the 1–6 / 7–12 steel split**, and with 4-level tiers over twelve levels the fourth enemy style is never used | **do** (Q5 decides what "colour" covers) |
| 22 | **A booster that lasts until the player loses a life** | **M6** | 15 → 30 B: the timed boosters' countdown skipped for the "life-long" kind (`weapon_pickup_rapid_tick`'s family in `PICKUP_CODE`, 65-B tail; or as a data value: a timer sentinel) ; the HUD label as today | resident (`PICKUP_CODE`; record 2 +1 sector) | 1 transport | 0 (a Spread held for a life makes the heaviest family the common case; the pool bounds it, no new worst row) | 0 | balance: feel, M8 | **do** (M6, with K1) |
| 23 | **Damaged Bombers** | **M3-H session 2** | — | — | — | — | — | — | **confirmed covered**: m3-waves-heavy §3.4 "the look and the damaged look — one mechanism" and §7 session 2 `feat/heavy-looks` (variant C); nothing to add |
| 24 | **A varied starfield per sector: density, speed, layers** | **M7** (data) with ~50 B of code before the freeze | density: a per-sector mask read by `generate_starfield_row` 20 → 24; speed: the near-star phase step per sector 15 → 18; 1 B per SectorDef (the core page has room); home: the window (the `BROADSIDE` pins are M3's) 50 → 60; **layers: the far layer was retired for its rotate-frame cost** (codes 2–6 are allocated, `farLayer` disabled) | resident + data | 0 | density/speed: +10 on rotate frames; a far layer: **+100 … +300 on rotate frames**, the binding family | 0 | — | **do** density and speed; **drop** layers (and the nebula stays rejected) |
| 25 | **Screen shake and flashes when the player is destroyed** | **M5b S5**, as one mechanism with the boss death | the shake routine is resident (window, 40 → 48 — already in M5b's hooks); the player-death trigger 10 → 12 in `update_player_death`'s path (`BROADSIDE`, 3 B free → via the window) | resident | 0 | +15 per frame for 24 frames | 0 | the HUD moves with the playfield (the blank-line count is above the HUD line) — the owner may prefer the playfield alone, which needs the shake on the divider instead (+8 B) | **do** (M5b) |

**Placement before the freeze, by milestone:** M5a — 18 (hangar); M5b — 14's
boss theme, 25; M4 — 16, 15 (its own session after M4); M3/M3-H — 23
(already); M6 — 22, (17 if wanted); M7 — 14's tracks, 21, 24 (data; its
50 B of code lands in M6's last code session), 19, 20.

---

## 8. Sessions

Each on its own branch from `main`, one at a time, each leaving the game
shippable; ordered by risk inside each milestone. "Frames" are ATR menu
frames at the sizing rule. Every session: `npm test` on the default build,
`tests/runtime-evidence-binding.test.mjs` in the focused set, evidence
regenerated when the artifacts move (`build:candidate` → `runtime:wall-trace
--atari800-source=build/atari800-trace` → `build`), `docs/memory-map.md` and
STATUS updated, the free tails stated in the commit.

| # | Branch | Scope | Window | Other bytes | Records / sectors / frames | Cycles (worst rows) | DMA | Load | STOP conditions | Tests and clauses | Owner smoke |
| --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| **M5a-S1** | `feat/overlay-slot` | §4.1–4.2: `BROADSIDE` regrouped, slot A bounded, the 20-entry table in the window, the reader's run read + directory + boss-resident flag + table copy, the build's overlay runs from sector 512 and the capital restore run, the AI pool 8 → 4 (Q3) | −72 | reader −136 +152; `BROADSIDE` 0; initial block ±8 (G) | window record 9 → 10 (+1 sector, +2 frames); disk +16 | binding row ~−30 (vectored calls); capital ~+60 | 0 | 0 (no read is added until a boss exists) | initial block > 13,652; worst fence < 1,400; a `BROADSIDE` label the harness or a test pins moves without its pin being re-pointed in the same commit; the restore run ≠ the resident bytes | §4.7; the binding replay's cycles proven on both builds (page crossings); boot smoke 8/8 | play level 1 through its capital sector: nothing visible changes; the loader screen with four lines |
| **M5a-S2** | `feat/fast-sio` | §4.3: `$3F` negotiation, divisor, fallback; `hardware-testing.md` §11 extended | 0 | reader −100 | 0 / 0 / 0 | 0 | 0 | ÷3 on SIO2SD (est.); unchanged elsewhere | the standard path's command-frame count or bytes on the wire change; boot smoke < 8/8; the fallback test fails in the 6502 harness | §4.7's harness tests; the emulator path per `sio.c` (§2.9) | **the session's point**: SIO2SD fast / disabled / off mid-read; the real drive (Q10); a marginal cable |
| **M5a-S3** (optional, item 18) | `feat/hangar-loader` | the hangar band and the AI texts as an overlay read before the level; the loader list gains the band | 0 | reader +152 −96 (net +56 → the reader ends ~+131 free) | disk +10; +0 transport | 0 | 0 | +38 frames per level start | the band's DMA makes the wire retry (0 retries required); the reader's free tail negative | boot smoke: the hangar read's command frames and a byte compare of the band; the screen's checksum pinned like the menu's | the hangar on a PAL CRT: colours, no tearing while the dotted row steps |
| **M5b-S4** | `feat/boss-band` | §5.1–5.3, §5.6 without lasers: `BOSS_DUE`, the transition and its read, slot B, the band builder, HSCROL motion, the third DLI, region 1's data, module draw/damage, shot-versus-module, the controller's phases (guns → core), the chain explosion, bonus, `SECTOR CLEARED` → menu, the restore at the next START GAME; `light[3]` 0 → 1; harness: third DLI, boss milestone, `director-complete-*` through the boss | −48 | slot A ~1,250 B of code; slot B 610; `ENTITY_STATE` −10 | disk +16 +10; transport 0 (the hooks ride S1's sector) | boss frames per §5.4 less lasers: worst with one Light **~1,640** (scroll stopped) | boss frames ~30,000 | boss entry 98 frames; post-boss START GAME +60 | a boss frame under 500 in the audit; DMA-on over 32,568; the restore byte compare fails; the band map crosses a 4 KB boundary | §5.10 less the laser items | a full level 1 to the boss and the clear on hardware; the banner and tone; the band's motion and the palette seam; **a second game after the clear: the capital sector renders** (the restore) |
| **M5b-S5** | `feat/boss-lasers` | §5.5, §5.8: lasers 1 / 2 / 4, the laser damage source, the shake shared with the player's death (item 25), the boss theme copy (item 14), the laser contact session replacing the recorded one (Q4), the missile-plane clause exception | −48 | slot A +~500 B | disk 0 (inside the 16 + 10) | §5.4 in full: worst **1,238** (scroll stopped) | ~30,270 | 0 | fence < 500 on any boss frame; the laser session not passing on the default ATR; `missile_plane_rows` residue outside the boss sector | §5.8's clauses; `boss-escort`; cycle pins | the warning readable at ~0.5 s; the beam's hit and its sound; the chain explosion and shake on a CRT; the player's death shake |
| **M5b-S6** | `feat/boss-regions` | regions 2–4's art and data from the concepts, the M8 tuning layout, level 2's boss through the debug route, release prep for `v0.3.0` (hardware checklist, README EN + PL) | 0 | 0 | disk +30 | 0 | 0 | 0 | a region run > 10 sectors | build pins; the four regions through `--level=N` review builds | each region's boss on hardware through a review ATR; level 1's through the default |

**After M5b-S6: `v0.3.0`** — the owner's release checklist
(`hardware-testing.md` §1–§11 plus the S2 and S4 items) on the default ATR.

**Projected figures at the end of M5** (budgeted): window **1,312** free;
initial block 23 … 31 B to STOP; transport 107 / 103 / 210, ATR menu ~549;
worst fighter-row fence margin ~1,410; worst boss-row margin 1,238 (scroll
stopped) with DMA-on ~30,270; DLIs 2 (3 in a boss sector); recorded clause
failures 1 → 0 (the laser session replaces the shell one); free disk 319 −
82 = 237 sectors after twelve levels.

---

## 9. Owner questions

Each with the recommended answer and what it costs.

| # | Question | Recommended answer | Cost of the recommendation | The alternative and its cost |
| ---: | --- | --- | --- | --- |
| **Q1** | Does the world scroll stop in the boss sector? | **Yes** — the ring does not rotate; stars drift by their fine phase and hold | 0 B; every boss frame gains ~1,545; the worst one-Light frame ends 1,238 over GO and under the 31,200 target | scroll kept: the one-Light break-up frame ends −307 (4 lasers) … −7 (1 laser); needs the pool lever (574–729, visible) or no Light at all or a 6-row band and 1 laser only |
| **Q2** | Band height: 8 rows (64 scanlines) or 6? | **8**, falling to 6 if S4's audit shows a boss frame under 500 | 720 of margin per boss frame (M) | 6 rows: 540; the boss art loses a quarter of its height |
| **Q3** | Where do the reader's 173 B for S1 + S2 come from? | **The AI line pool 8 → 4 lines** (+152 B; the format stays decision O's); the hangar session later moves the texts to disk and returns the rest | the loader shows one of four placeholders until the hangar lands | (b) `LEVEL_BUFFER` 16 → 15 with the buffer moved to `$A680` and every level address re-linked (risk 3; +128 B); (c) the overlay logic in the window and the reader kept: window −200 → −240 |
| **Q4** | The recorded `lower-playfield-hostile-contact-atr-hard` once the laser session passes | **Retire it by name** into the recorded file's removed block, with F5/F6 kept as its epitaph | 0 | keep both: the recorded set carries a scenario the game cannot contain, forever |
| **Q5** | Item 21: do 4-level tiers replace AC's regions of three for the hull **style** too, or only for the allied steel and the lasers? | **Steel and lasers by 4-level tier; the enemy hull style stays per 3-level region** (all four styles used, as AC wants); the enemy *colour* does not change (it is `COLPF3`) | 0 B, a build mapping | style by 4-level tier: the fourth style is never seen in twelve levels; enemy colour per tier: every hostile accent recolours |
| **Q6** | Restore variant (a) or (b)? | **(b)**: the capital group stays in record 1; only the slot is restored after a boss | +60 frames at START GAME after a boss | (a): +113 frames at every START GAME, −50 at boot |
| **Q7** | The frontend overlay (2,180 packed B of initial block returned, risk 4) — in M5a as an optional session, or deferred? | **Deferred**; revisit if the initial block binds before M6 | 0 | S4-optional: 2–3 sessions of layout work; the menu re-read at every return (1.7 s EMULATOR) |
| **Q8** | Speech (item 17) | **Drop** for 1.0; at most one word ≤ 12 sectors after the fast loader | 0 | 12 … 23 sectors per level start (+0.9 … 1.7 s), a 40-B player, and 4-bit speech |
| **Q9** | The hangar: M5a S3 or M4? | **M5a S3** (the loader is open on the bench; the reader's bytes come back before M4 needs them) | one more M5a session | M4: the reader stays at −21 B budgeted until then |
| **Q10** | Which real drive does the owner smoke the loader with? | the answer sets S2's scope: a **stock 1050** proves the fallback only; a **CA-2001** or a US-Doubler/Happy/Speedy 1050 proves the fast path on real electronics; an **XF551** needs the XF551 mode (+30 → 36 B) | — | — |
| **Q11** | The reserved reader vector `$A006` (`sector_reader_drain_ready`, "reserved for 4.9") becomes the run-read entry and the drain vector moves to `$A009` | **Yes** — nothing binds `$A006` today (grep: only the reader's own table) | 0 | a fourth vector at `$A009` for the run read and `$A006` kept idle: +3 B |
| **Q12** | `LEVEL_BUFFER` stays 16 (slot B needs the spare sectors); the window levers for M6 are the `STARFIELD` tail first, then 16 → 15, the splash RAM as reserve | **Yes** | 0 now | 16 → 14 now: slot B shrinks to the hull block (384 B): a 48-B-wide band (8 cells of travel) and no room for the tables |

---

## 10. What this document did not do

No source, cfg, build-script, harness, level or evidence change is
committed; three probe builds (§3) were made under `build/level-1-s0/` and
every edit reverted before each commit (`git diff -- src cfg scripts assets`
empty). No baseline worktree was needed. The boss's art, the band map's
format, the laser's exact glyph phases and the overlay directory's byte
order are the sessions' to settle; every **IC**, **AN** and **G** figure is
an estimate to be replaced by the session that builds it. The high-speed
protocol table (§2.9) is from secondary sources and is re-checked against
the HRM before S2 writes a byte. Nothing in `hardware-testing.md` was
changed: S2 and S4 add their items when they exist.
