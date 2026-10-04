# Plan — M5: the loading platform (M5a) and the boss (M5b)

**PLANNING session, 2026-10-03. `OWNER REVIEW CANDIDATE`.** Branch
`docs/plan-m5` from `main` `7ccd57e` (tag `v0.2.1`). **Nothing here is
implemented; this document is the deliverable.** No source, cfg, build-script,
harness, level or evidence byte changed; three probe builds were made under
`build/level-1-s0/` and reverted (§3). The ATR and the boot image are the ones
`main` ships.

**Amended 2026-10-03, twice:** first with the owner's decisions on the
level-summary screen, the per-level stats and the letter grade (§1.3, §4.8);
then with the owner's answers to every question (§1.4 — Q1–Q17, the wish
list accepted as recommended, the shots counter as a window scan, the
end-of-road window re-derived in §6.1 with the levers that remain): the transition
becomes a summary screen the loading runs behind, the fast loader becomes an
optional later session, and the sessions are re-ranked (§8).

**M5a-S1 implemented 2026-10-03** on `feat/overlay-slot`,
`OWNER-SMOKE CANDIDATE` pending the owner's smoke: slot A, the capital
vector table, the run read at `$A006`, restore variant (b), the AI pool
8 → 4. As built, with the owner's fence-floor decision, the measured reserve
lever (Probe B) and two repo deviations (12 entry points; the capital table
image in the reader): §4.9.

**M5b spike 2026-10-04** on `spike/boss-controller` (`OWNER REVIEW CANDIDATE`, a throw-away prototype, no code committed): the boss measured in slot A, the window and the emulator — §5.11. It fits slot A only with its once-only install moved to a staging run (1,826 of 2,048 B); the entry costs the window 125 B; the worst boss frame clears the fence by **10,103** (plan ~1,200), DMA-on 29,219; the entry reads 28 sectors in 107 frames (EMULATOR). Six owner questions, Q-S1–Q-S6 — **all answered 2026-10-04 (§1.5)**, with the 3,500-native tick limit and a new decision for S3: the entry is presented as a `WARNING - BOSS APPROACHING` screen with the boss theme starting (decision 32, priced in §5.11.7).

**M5b-S3 implemented 2026-10-04** on `feat/boss-band`,
`OWNER-SMOKE CANDIDATE` pending the owner's smoke: the boss sector, its
`WARNING - BOSS APPROACHING` entry with the theme, the 8-row HSCROL band and
its third DLI, guns → core, the chain and the hand-off to the summary, the
START GAME restore (Q-S4). As built, with every figure MEASURED and the
deviations: §5.12.

**M5a-S2 implemented 2026-10-03** on `feat/level-summary`,
`OWNER-SMOKE CANDIDATE` pending the owner's smoke: the level-summary screen,
the stat counters, the grade, the save record. The `$0500` module MEASURED
**1,359 B** in its first build (+~110 B write path) against §4.8.1's **480-B**
estimate; the owner gave it **`$0500-$0BFF`** (decision 2026-10-03), RAM no
link claims and the emulator measured never written. As built, with every
deviation and the measured figures: §4.10. The rest of this plan is still the
plan.

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
  **~170 B of resident hooks** (214 with the stat counters) and lives on disk otherwise. Re-priced in the
  new order the window ends M6 at **−82 B budgeted (+82 on expected
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
* **The transition is a level-summary screen that the loading hides behind**
  (owner, 2026-10-03, §4.8): stats of the finished level over the region's
  look with the region's music, at standard SIO speed; the full post-boss
  transition is 37 sectors ≈ **2.8 s in the emulator (MEASURED rate), ~5.6 s
  on a 1050-class drive (ESTIMATE)**, against a recommended 3-s minimum
  display. Its code lives in the splash RAM at `$0500` (read once per
  session, 0 window bytes); its art is read first (0.5 s) while the stats
  text is already up. **The fast loader is now an optional later session**,
  recommended only if the owner's real-drive measurement exceeds the
  summary's minimum by more than ~2 s; Atari800 cannot vouch for it either
  way (its SIO models the wire only).
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

### 1.3 Taken on 2026-10-03 (recorded here; priced in §4.8)

| # | Decision | Status |
| ---: | --- | --- |
| 26 | **Level-summary screen.** The transition between levels shows the finished level's stats — score, kills, accuracy (hits / shots), time, lives lost, bonuses — over a background in the current region's look, with the region's music; loading runs behind it at standard SIO speed; it stays up for a minimum time; once loading is complete, FIRE continues. Look and music change per region, every three levels (AC), not per laser tier | **owner decision** |
| 27 | **Stats collected during play**, each rewarding a different way of playing (accuracy → aiming, time → aggression, lives lost → care), not duplicating the score; the design target is **zero bytes in the initial block** (`CODE`, `RODATA`, `STARFIELD`, `ENTITY_CODE`), any such byte is an owner question | **owner decision**; the hooks are §4.8.2, the two initial-block candidates are Q13 and Q14 |
| 28 | **A letter grade per level (S / A / B / C)** from the same stats, shown on the summary; thresholds are level data, tuned in M8 | **owner decision**; §4.8.3 |
| 29 | A comparison with the player's best for the level (best grade and score), saved to disk with the high-score table (item 16): one mechanism, one record | priced in §4.8.4; recommendation: with the summary session |
| 30 | Until M4, the boss fight ends on the summary screen, then the menu; M4 adds "load the next level" behind the same screen | priced in §4.8.5; **fits M5**: the summary is session M5a-S2 |
| 31 | Overlays at standard speed first; the fast loader optional and later | §4.8.6, §8 |

### 1.4 The owner's answers (2026-10-03) — every question of §9 is closed

| Q | Answer | Applied in |
| ---: | --- | --- |
| Q1 | **The world scroll stops in the boss sector** | §5.2, §5.4 |
| Q2 | **An 8-row band**, falling back to 6 if S3's audit shows a boss frame under 500 | §5.3 |
| Q3 | **The reader's bytes come from the AI pool, 8 → 4 lines** (S1); S2 moves every text to disk | §4.2 |
| Q4 | **Retire `lower-playfield-hostile-contact-atr-hard` by name** once the laser contact session passes | §5.8 |
| Q5 | **Steel and lasers on 4-level tiers; the hull style stays per 3-level region** | §7 item 21 |
| Q6 | **Restore variant (b)** | §4.1 |
| Q7 | **The frontend overlay is deferred** | §4.5 |
| Q8 | **Speech is dropped for 1.0**; a single sample at campaign start may be reconsidered in M9 if time allows; nothing is budgeted | §7 item 17 |
| Q9 | answered by decision 26 | — |
| Q10 | The owner smokes with an **SIO2SD and a California Access (CA) drive**, exact model named at the smoke; it decides only how the optional S6 is smoked | §4.3 |
| Q11 | **`$A006` becomes the run-read vector** | §4.2 |
| Q12 | **`LEVEL_BUFFER` stays 16 for now** | §6.1 |
| Q13 | **Not the recommendation: the shots counter is the per-frame slot scan in the window** (~60 cycles every frame), not 9 B in `CODE` — the initial block keeps its room for M6's booster hooks (10–12 B) | §4.8.2, §5.4, §6.1, §6.5 |
| Q14 | **A destroyed debris counts as three hits, in `PICKUP_CODE`** | §4.8.2 |
| Q15 | **A 3-second minimum display** | §4.8.1 |
| Q16 | **The personal best lands with the summary session**, under the safety rules of §4.8.4 for the first code that writes to the player's disk | §4.8.4 |
| Q17 | **At START GAME the summary shows the level's best and an empty stats panel** | §4.8.1 |
| wish list | **accepted as recommended**: do 14, 15, 16, 18 (inside the summary), 21, 22, 24 (density and speed); later 19, 20; drop 17 and 24's layers; 23 confirmed as M3-H session 2 | §7 |

### 1.5 The owner's answers to the M5b spike (2026-10-04)

Every question of §5.11.6 is answered as recommended; correction 9 is
confirmed; one new decision for S3.

| # | Answer | Applied in |
| ---: | --- | --- |
| Q-S1 | **Yes** — the boss splits into per-frame code in slot A and a once-only install run (linked at the staging RAM `$7810`, run in place once per boss entry) | §5.11.1, §8 S3 |
| Q-S2 | **Yes** — the window pays the measured **125 B** of boss-entry hooks (before decision 32's change, §5.11.7) | §6.1, §6.2 |
| Q-S3 | **Yes** — the overlay links against the sector reader's addresses in the same build, and the build **fails if any of them moves** (the same check covers the addresses the window's gate uses, which links before the reader) | §5.11.4 item 2, §8 S3 |
| Q-S4 | **Yes** — the slot-A restore at START GAME also restores **every setting the boss patches**: the world and hull scroll rates, `PRIOR`, `SIZEM`, `HPOSM0-3`, `HSCROL`, the DLI vector and display list, the band's state, so a game that ends in the boss sector (GAME OVER, pause-quit) leaves nothing behind. Placement and price: §5.11.7 | §5.11.4 item 7, §8 S3 |
| Q-S5 | **Yes** — **no shake on the player's death**; the existing death flash stays, and §7 item 25 is **covered by the flash only**. The boss win keeps its shake: the band's HSCROL jitter (built in the spike, 0 resident bytes) | §5.1, §7 item 25, §8 S4 |
| Q-S6 | **Yes** — **a shared install run on disk**: boss code 16 + install 3 + four regions × 9 = **55 of the 56** sectors reserved at 528–583 | §6.3, §8 S5 |
| correction 9 | **The boss's per-frame work is limited to ≤ 3,500 native cycles** (was ≤ 300). Reason: the spike MEASURED 3,259 native at worst (four lasers, the core destroyed on the frame) and the worst boss frame still cleared the line-238 fence by **10,103** in the emulator (~6,500 composed worst, ESTIMATE), against GO 500 | §5.10 |
| **32** | **New owner decision for M5b-S3: the boss-entry transition is presented as a `WARNING - BOSS APPROACHING` screen with the start of the boss theme, not as a plain load.** Priced in §5.11.7 | §4.4, §5.11.7, §8 S3 |

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
difference from today; the real drive (Q10: the owner's California Access drive, model named at the
smoke; it proves the fast path if its high-speed mode is Ultra-speed
compatible, the fallback otherwise); the SIO2SD powered off mid-read — the failure screen within a
few seconds on both paths; a marginal cable — a fast-path error falls back
rather than failing.

### 4.4 The boss-entry transition (platform half; the boss half is §5.2)

**Owner decision 32 (2026-10-04, §1.5): the transition is a `WARNING - BOSS
APPROACHING` screen with the boss theme starting, not a plain load. The
re-ordered reads and the price are §5.11.7; the banner described below is
replaced by it.**

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

### 4.8 The level-summary screen (owner decisions 26–28, 2026-10-03)

#### 4.8.1 What it is, and where it runs

The reader's loading screen becomes the summary screen. At every transition
(START GAME from the menu, the end of a level) the reader shows: the title
row, the level's stats panel (six lines of label + value, the grade, the
best), a region background, and a `LOADING` / `PRESS FIRE` line. Loading
runs behind it at standard speed, in this order (the reason is the music,
§4.8.6): the summary art for the region first, then slot A's capital restore
(after a boss), then the next level image **tail-first** (sectors 6–13: hull
block, LevelDef pages, geometry), then the save record, then the level's
sectors 1–5 (the music block) last. A minimum display time (Q15: 3 s) runs
from the first frame; when both the minimum and the loading are done, the
last line reads `PRESS FIRE`, and FIRE calls `start_gameplay` (until M4:
after a boss the summary returns to the menu instead — decision 30).

| Part | Home | Bytes | When it arrives | Basis |
| --- | --- | ---: | --- | --- |
| **code**: display list (ANTIC 4 picture rows, a CHBASE DLI, ANTIC 2 text rows), stats formatting (BCD → glyphs for six values), accuracy ratio and grade, time conversion (frames → seconds), the minimum-time / loading / FIRE interlock, the read order, the best-record compare | **the splash RAM `$0500-$06FF`** (512 B, free after the boot splash; lever 10 of the budget, risk 4 then — risk 2 now because the reader reads four sectors there at the first START GAME of a session, no boot-time copy) | 400 → 480 | read **once per session**, 4 sectors (15 frames) before the first level; resident thereafter — RESET is a cold start, so the splash never collides | IC; AN `render_frontend_state` 66 + `draw_top_score_bcd_byte` 21 + `select_frontend_display` 128 |
| **labels** (`SCORE`, `KILLS`, `ACCURACY`, `TIME`, `LIVES LOST`, `BONUS`, `GRADE`, `BEST`, `LOADING`, `PRESS FIRE`) as frontend text records | the region art run (shared bytes, repeated per region) | 150 | with the art | fixed by the text |
| **art per region**: a 10-row × 40-B ANTIC 4 background map, the region's 31 hull glyphs for codes 59–89 (the gameplay charset is copied from `RODATA` once at boot and is not rebuilt per level — only codes 59–89 are republished, so the picture may use only those plus the stars and helpers), a 4-colour palette | the frontend screen RAM `$4050-$43FF` (map, 400 of 944 B; the text rows take 200) and the charset codes 59–89 (248 B, staged through the pause backup) | 652 + 150 labels → **7 sectors** | **read first** at every transition: 26 frames (0.5 s); the stats text is drawn with the frontend charset on frame 1 by the resident code, so the panel never waits — the picture fills in after 0.5 s | M (the hull block's glyph count) |
| the reader's changes: two-run tail-first level read, the `$0500` run read, the music tick inside the wait loop, the summary entry and the minimum-time latch, the save-record read and write (§4.8.4) | reader | 60 → 72 (+ the write primitive 70 → 84) | — | IC |
| state: minimum-time counter 1, loading-done flag 1, per-level stats (§4.8.2) | zero page `$AC+` (84 B free) | ~10 | | |

**Which must be resident or loaded first (decision 5d).** The code is
resident after the first START GAME; the labels and the art are loaded
first (7 sectors). The screen therefore waits on nothing it covers: the
text panel is visible from the first frame, the background 0.5 s later, the
music from the first frame (the finished level's block is still in the
buffer, §4.8.6). The one thing it cannot show on the first frame of a session
is itself: the 4-sector `$0500` read precedes the first summary of a
session (0.3 s of the plain title row) — acceptable, or the `$0500` run is
read at the boot's end by stage 2 for 0 B (it would be a twelfth DFMC record:
−16 B of initial block; not recommended).

**Item 18 (the hangar) is absorbed**: the region background *is* the
hangar picture the owner asked for, drawn in the region's hull style.

#### 4.8.2 The stat counters (decision 27)

| Stat | Source | Hook | Home | Bytes | Initial block? | Cycles |
| --- | --- | --- | --- | ---: | --- | ---: |
| **score** | exists (`SCORE_LO/HI`, BCD) | none | — | 0 | no | 0 |
| **time** | exists: `ACTIVE_GAMEPLAY_FRAME_LO/HI` (`$4FF8`, 16-bit, counts active gameplay frames only) | none; converted to m:ss at the summary (÷ 50 by repeated subtraction, 30 → 36 B in `$0500`) | — | 0 | no | 0 |
| **lives lost** | lives at level start (3, or M4's carried value) − lives at level end | none: the start value is 1 B saved at `start_gameplay`'s C init (`director_c_init`, window) | window | 6 → 8 | no | 0 |
| **kills** | Heavy: the kill branch of `enemy_c_apply_pending_damage` (C, `HYBRID_C_EXT`, record 5 — 0 B spare: **+1 sector**); Light: the Light kill in `LIGHT_RESIDENT` (`PICKUP_CODE`, 65-B tail; record 2 +1 sector); debris: `debris_shot_reward` (`PICKUP_CODE`); boss modules: the overlay | one `stats_count(kind)` C routine in the window (`inc` a BCD byte pair) called from the four sites | window 24 → 30; sites: ext +6, `PICKUP_CODE` +12, overlay +6 | **no** | +15 per kill event (not per frame) |
| **hits** | Heavy: the non-lethal and lethal branches of the same C function (one call covers both); Light: same as its kill (1 HP); boss modules: the overlay; **debris**: `entity_debris_hit` is in `ENTITY_CODE` → **Q14**: count a destroyed debris as three hits in `debris_shot_reward` (`PICKUP_CODE`, 0 initial-block B; a debris that scrolls off wounded loses its hits) **or** 6 → 9 B in `ENTITY_CODE` | the same routine | window (shared); sites +6 ext, +6 overlay, +4 `PICKUP_CODE` | **debris: Q14** | +15 per hit event |
| **shots fired** | every player PairShot allocation is `allocate_player_fighter_projectile_at_slot` (`CODE` `$2D01`, 48 B) — the one event site in the initial block. **Decided (Q13): the per-frame slot scan**, not a `CODE` byte: a window C routine compares the five player slots' state bytes with a 5-B previous-state copy and counts each FREE → ACTIVE edge (a Spread volley is three edges on one frame). **Placement:** called once per frame from the Light class's per-frame entry, which already runs in the window on every gameplay frame (6 B for the call there; no byte in any full segment) | window | 40 → 48 + 5 B RAM | **no** | **+60 on every frame (IC: 5 × ~12), the binding row included: fence margin 1,439 → ~1,379, and with S1's vectors ~1,349; DMA-on maximum 31,133 → ~31,193 (+60), ~31,223 with S1 — over the 31,200 target by ~23, under the 32,568 hard gate; boss worst row 1,238 → 1,178** |
| **bonuses** | the boss bonus (overlay, `boss_def` reward) and the summary's own stats bonuses (accuracy / no-death / time, computed at the summary from the thresholds; M8 sets the values) | none in play | `$0500` | 30 → 36 | no | 0 |
| **RAM** | shots 2, hits 2, kills 2 (BCD), lives-at-start 1, bonus 2 | zero page `$AC+` | 9 | | | |

Totals: window **+76 → 92** (the counters 36 → 44 and the scan 40 → 48);
`PICKUP_CODE` +16 (record 2: +1 sector, the sector M3-H and M4 also ride
in); `HYBRID_C_EXT` +12 (record 5: +1 sector); overlay +12; initial block
**0** (Q13). Cycles on the binding row: **+60 every frame** (the scan); a
kill frame +15 more. The 31,200 target is exceeded on the binding family
by ~23 after S1 and S2 (IC); the GO fence (≥ 500) and the hard gate are not
in question, and the target is the budget's third figure, not a gate
(AGENTS.md); the owner chose this over 9 B of initial block.

#### 4.8.3 The letter grade (decision 28)

Grade = the sum of three tiers (accuracy, time, lives lost), each 0–2 from
two thresholds, mapped S / A / B / C — so a perfect aim with slow play and a
death can still reach A, and no single stat duplicates the score. Code
60 → 72 B in `$0500`. Thresholds: 6 B per level (two accuracy percentages
as hits×4 ≥ shots×3-style compares to avoid a division, two time limits in
seconds, two lives-lost bounds) in the payload page's 26 spare bytes (230
of 256 used); M8 tunes them. Accuracy itself needs a ratio: shown as a
percentage from an 8-bit scaled compare loop (40 → 48 B, `$0500`), computed
once at the summary. The `$0500` total with the grade: 400 + 36 + 72 + 48 =
**556 → 480 after sharing the BCD and text helpers the frontend already
has** — within 512 on expected figures, 56 B over on budgeted ones; if it
runs over, the grade and ratio (120 B) move to the window (Q13's ledger
line shows both).

#### 4.8.4 Personal best and the save record (item 29 / wish 16)

One record, one sector, one mechanism:

| Field | Bytes |
| --- | ---: |
| magic + version + checksum | 4 |
| ten high scores: 3 B BCD score + 3 initials | 60 |
| twelve levels: best grade 1 + best score 3 | 48 |
| **total** | **112 of 128** |

The record lives on disk at a fixed sector (599) and is read at every
summary (1 sector, 4 frames) into the pause backup area `$7810` (free during
a transition), compared, updated and **written back** after the summary's
stats are final — the direct-SIO write (`'P'`, the data frame from the tx
primitive generalised to pointer + count, ACK after data, COMPLETE):
**70 → 84 B in the reader**. A write-protected disk or image answers
`ERROR`/NAK or nothing: any non-COMPLETE skips silently; the record in RAM
still shows the comparison for the session. No persistent RAM beyond the
20 B of top scores the game already keeps (`$4EEA`).

**Decided (Q16): the save mechanism and the per-level best land with the
summary session (M5a-S2)**, under these rules for the first code that
writes to the player's disk: **one fixed sector, a named constant
(`SAVE_RECORD_SECTOR`) checked against the directory before every write;
a read-back verify after the write (the sector read again and compared
byte for byte; a mismatch leaves the RAM copy and reports nothing); a
checksum on the record; a missing or corrupt record reads as empty — never
an error screen, never a hang; a write-protected disk is skipped silently;
the harness and the owner's smoke use a copy of the ATR or the floppy
only.** The write is reader work the session is already inside, and the
`BEST` line then shows from day one; the initials
entry screen (item 16's other half, 150 → 180 B in the window) lands in M4
with the frontend. Until a record exists on a disk, `BEST` reads `--`.
Prerequisite: **the harness mounts a copy of the ATR** (or `-readonly`)
before any session can write, or a trace that reaches a summary would
rewrite `dist/` and break the evidence binding — a harness change the S2
session makes first.

#### 4.8.5 Placement (decision 30) — it fits M5

The summary replaces the loading screen at START GAME and the "SECTOR
CLEARED" hand-off after the boss. It is a loader session, so it is
**M5a-S2**, before the boss: at the end of M5a a level that ends by its
existing LEVEL COMPLETE route already goes to the summary (stats, grade,
best, music, art), and M5b's boss simply hands off to it. M4 later puts
"load the next level" behind the same screen (the tail-first read is built
for that). Cost to M5: window 44 (counters) + 0 (code in `$0500`); reader
+156 (which the AI-pool texts moving to disk, +304, more than cover: the
reader ends **+63 +304 −136 −156 = +75 B**); records 2 and 5 +1 sector each;
disk 4 + 4 × 7 + 1 = 33 sectors; initial block 0 or 9 (Q13).

#### 4.8.6 Consequences (decision 5)

**(a) Music during standard-speed SIO.** The reader owns POKEY channels 3
and 4 as the serial clock (`AUDCTL $28`, `AUDF3 $28`, `AUDC3/4 $A0`: pure
tone at **volume 0**), so the clock is silent by construction — the OS's
loading buzz comes from the OS SIO routine's "noisy I/O" volume, which the
direct reader never sets (STATUS 4.3: "anything audible means `AUDC3/4` are
wrong"; by-ear confirmation is owner smoke, the emulator's audio is not
capturable). **Channels 1 and 2 are free and are exactly the gameplay
player's two voices** (`gameplay-music.s` owns 1 and 2 and never touches
`AUDCTL`); `AUDCTL $28` leaves bits 0, 4 and 6 clear, so channels 1 and 2
keep the 64-kHz base clock the gameplay profile (`audctlProfile 0`) assumes
— pitch is unchanged. The tick is called at each VCOUNT frame edge inside
`sector_reader_wait_serial` (+20 → 24 B): its worst row costs 336 cycles
against the 930-cycle gap between bytes at standard speed, so a byte waits
in `SERIN` at most 336 cycles and never overruns. **Arranging the four
region themes:** two voices (bass + lead), no engine bed, no SFX — the
gameplay format as it is; a theme must keep its worst tick under the
inter-byte gap (the GRA-2 figures 118 / 336 do). At 52 kbaud the gap is
~340 cycles, so a fast loader would have to pause the music during data
frames — one more reason it comes later (c).

**Which track plays:** the finished level's — its block is in the buffer
and keeps playing while the next image's sectors 6–13 land; the music
block (1–5) is read last. Inside a region the next level's block is
byte-identical, so it is written over the running player without a glitch;
at a region boundary the music stops for the 19 frames of that read and the
new region's theme starts as the last sector lands — the region change
announces itself.

**(b) The full transition load** (after a boss, from the summary's first
frame; the 3.77 frames/sector rate is MEASURED in the emulator, the rest is
arithmetic; the 1050-class figure is debt item 5's ×2 ESTIMATE):

| Read | Sectors | Emulator (frames / s) | 1050-class (s, est.) | SIO2SD standard (s, est.) |
| --- | ---: | ---: | ---: | ---: |
| summary art + labels (first) | 7 | 26 / 0.5 | 1.1 | 0.6 |
| slot A capital restore | 16 | 60 / 1.2 (**MEASURED 60**, S1 forced-restore boot smoke) | 2.4 | 1.4 |
| level image, sectors 6–13 | 8 | 30 / 0.6 | 1.2 | 0.7 |
| save record read (+ write after the stats) | 1 (+1) | 8 / 0.15 | 0.3 | 0.2 |
| level image, sectors 1–5 (music, last) | 5 | 19 / 0.4 | 0.8 | 0.4 |
| **transition total** | **37 (+1)** | **143 / 2.9 s** | **5.8 s** | **3.3 s** |
| + once per session: the `$0500` code | 4 | 15 / 0.3 | 0.6 | 0.3 |
| (not covered by the summary) boss entry, mid-level | 26 | 98 / 2.0 | 3.9 | 2.3 |

A **3-s minimum display** (Q15) covers the emulator and SIO2SD transitions
entirely; a 1050-class drive exceeds it by ~2.8 s, during which the last
line keeps reading `LOADING` — the stats stay readable, nothing is lost.

**(c) The fast loader re-ranked.** Overlays and the summary at standard
speed come first (S1, S2). The fast loader becomes **optional session
S6**, recommended only if the owner's real-drive measurement of the S2
transition exceeds the minimum display by more than ~2 s; on SIO2SD the
estimate is already inside it. Its bytes (84 → 100, reader) still fit after
S2 (+75 → −25 budgeted: the 4-line AI stub, 152 B, goes if it lands).

**(d) Resident or loaded first:** §4.8.1 — code resident in `$0500` after
one 4-sector read per session; labels and art loaded first (7 sectors);
the stats panel drawn from resident code on frame 1; the music from the
buffer on frame 1.

### 4.9 M5a-S1 as built (2026-10-03, `feat/overlay-slot`, `OWNER-SMOKE CANDIDATE`)

Implemented as §4.1–4.2 describe, with the owner decision and the two repo
deviations below. Every figure is MEASURED from the linked images, the
regenerated evidence (`docs/runtime-wall-trace.json`) or a named run; load
times are EMULATOR.

**Owner decision, 2026-10-03 (this session).** The plain 3-byte table cost
the binding row more than §4.1 priced: `2-evasive-fire3` f287 fence margin
**1,439 → 1,391 (−48)**, A/B on the same emulator, against the brief's STOP
at 1,400. About nine of the vectored calls run on every fighter frame, and a
native cycle before the fence costs ~2.2 of margin; §4.1's "~30" counted
them 1:1. The owner kept the plain table as planned, accepted the measured
cost, and set this session's fence floor at **1,350** (the end-of-M5
projection, 1,349, already assumed a cost here).

**Probe B — a measured reserve lever, not taken.** Zero-timer fast paths in
the four table entries for the launch-flash and capital-explosion ticks and
renders (each returns before entering its slot loop when every timer is
zero; the loops do nothing then): binding row **1,391 → 1,598 (+207; +159
over main)**, DMA-on unchanged, for **+42 B of window** (the table 36 → 78 B).
Not taken because window bytes, not cycles, are the binding resource on the
road to 1.0 (§6.1). Probe A (vectoring only the nine entries that reach slot
A) measured 1,397 and is not a lever. The probe's patch is described here;
no probe byte is in the tree.

**Deviation 1 — 12 entry points, not 20.** §4.1 listed "~20 distinct
entries". The call graph has **12** calls into the capital group from code
outside it: `init_broadside`, `update_broadside`, `tick_capital_explosions`,
`tick_launch_flashes`, `update_engine_animation`,
`handle_player_hull_contact`, `render_launch_flashes`,
`render_capital_explosions`, `update_sector_completion`,
`restore_active_muzzles` (from the world scroll), `prepare_next_hull_row`,
`scroll_hull_columns`. The plan's other names (shell scheduling, the warning
render, the scene scroll, the three muzzle routines, the three shell
collisions, the slot free) are calls inside the group, and
`restore_capital_explosions` has no caller. **Byte effect: the table is 36 B,
not 60 → 72 (window −36 instead of −72).** The boss's hooks (tick, render,
contact, completion) are all among the 12; a boss that needs another entry
appends one.

**Deviation 2 — the capital table image lives in the sector reader, not at
slot A's head.** §4.1 had each overlay carry its table image at its head,
and the slot's first byte be the image. For the capital overlay that image
would be resident bytes in `BROADSIDE`, which has **3 B free**. The reader
therefore carries the capital image (`capital_vector_image`, 36 B, generated
from the same list as the window table and byte-compared with it by a test)
and copies it back after a capital restore; a boss overlay's own image can
still come with its run. **Byte effect: reader +36 B** (inside its
+152 −177 below), `BROADSIDE` 0.

| | Plan (§4.1–4.2, §8) | MEASURED |
| --- | --- | --- |
| `BROADSIDE` | regrouped, 0 B | 6,653 B, free tail 3 B (unchanged). One move: the damage gate and HUD (248 B) ahead of `update_broadside`. Record 1: 5,517 → 5,494 B packed, 44 sectors |
| slot A | ≥ 2,048 B | **`$6DE8-$75E7`, 2,048 B**, `update_broadside` to inside `handle_player_hull_contact`; code only |
| vector table | 20 entries, 60 → 72 B, window | **12 entries, 36 B**, `$B368-$B38B`, appended to the Light kernel's five vectors |
| window free | 1,480 → 1,420 … 1,408 | **1,444** |
| window record | 9 → 10 sectors (+2 frames) | record 8 unchanged; the table is in record 9 (Light kernel), 653 → 689 of 747 B, 6 sectors: **0 sectors** |
| sector reader | −136 +152 | **+152 −177** (run read and shared loop, restore, directory 40, table image 36, flag 1, `$A009` vector): 1,473 → 1,498 B, **38 B free**, record 10 12 sectors |
| initial block | 13,621 ± 8 | **13,621** (0) |
| boot / extension / total sectors | 107 / 102 → 103 / 210 | **107 / 102 / 209** |
| ATR menu frame | +2 (549) | **547** (unchanged; baseline 596) |
| disk | +16 | **+16**: sectors 512–527, the capital restore run |
| binding row | ~−30 | **−48**: 1,439 → 1,391 (owner floor 1,350) |
| capital rows | ~+60 | every capital replay **loses** 27–108 of margin on its worst row; none comes within 1,000 of the binding row (`capital-muzzle-ring-2-sweep-fire4` 2,859 → 2,832, `director-complete-2` 2,969 → 2,925) |
| DMA-on maximum | — | 31,133 → **31,117** |
| START GAME load | 49 frames | **49** frames (13 sectors), unchanged |
| capital restore load | 16 sectors ≈ 60 frames | **60 frames** (16 sectors, 0 retries), forced-restore boot smoke |

The AI pool is 4 × 38 B from `assets/text/loader-ai-lines.json` (Q3); the
four kept lines are the v1 placeholders 01–04. The eight-line pool's index
arithmetic overflowed a byte for line 8 (7 × 38 = 266), so that line was
never shown correctly; four lines cannot overflow.

Tests: `tests/overlay-slot.test.mjs` (the table, slot A's bounds, the run on
the disk equal to the resident bytes, the directory and the table image, the
AI pool from its asset) and five 6502-harness tests in
`tests/sector-reader.test.mjs` (the run read, an empty entry, START GAME
with and without an overlay, a failed restore). Harness: every boot-smoke
session byte-compares slot A and the table after START GAME; a sixth session
forces the restore (slot and table zeroed at the reader's entry, as a boss
would leave them); `--force-overlay-restore` runs any replay after a forced
restore (`2-evasive-fire3`: margin and DMA-on unchanged, every gameplay
column identical).

### 4.10 M5a-S2 as built (2026-10-03, `feat/level-summary`, `OWNER-SMOKE CANDIDATE`)

Implemented as §4.8 describes, with the owner decision and the repo
deviations below. Figures are MEASURED from the linked images, the
regenerated evidence (`docs/runtime-wall-trace.json`) or a named run; frame
and load figures are EMULATOR.

**Owner decision, 2026-10-03 (this session): the module's home is
`$0500-$0BFF`.** §4.8.1 priced the summary code at 400 → 480 B for the
512-B splash RAM. Its first build MEASURED **1,359 B**, and the save-record
write path (~110 B) could not stay in the sector reader, which overflowed its
1,536 B by 96 B. While looking for room, `$0700-$1FFF` turned out to be
claimed by no link, equate or document; a scratch probe MEASURED it never
written after `start` (patterns `$5A`/`$A5`, BASIC on and off, the menu,
three games and GAME OVER; [../diagnostics/low-ram-0700-1fff-2026-10-03.md](../diagnostics/low-ram-0700-1fff-2026-10-03.md)).
The owner chose `$0500-$0BFF` over the plan's fallback (the arithmetic and
the record logic in the window, ~850 B) and required: the range claimed
(`cfg/level-summary.cfg`, the memory map, `tests/level-summary-build.test.mjs`
failing on any link, cfg area or boot-path range in `$0700-$0BFF`); the rest,
**`$0C00-$1FFF` (5,120 B), recorded as an unclaimed, emulator-measured lever
for M3/M6, not used now** (§6.1); the measurement stated exactly; and the
real-hardware check in the smoke list (`hardware-testing.md` §12: the
summary after several games and a GAME OVER on the 65XE).

**Repo deviations and choices, each reported:**

1. **No LEVEL COMPLETE route existed.** §4.8.5 has the level end "by its
   existing LEVEL COMPLETE route"; in the repo the Director sets
   `FLAG_COMPLETE` and the game flew on in the terminal COMPLETE forever (the
   level-complete trigger is budget M4's). The summary is reached from the
   capital-frame stat hook: `FLAG_COMPLETE`, the terminal COMPLETE, and 50
   alive frames held (`LEVEL_END_HOLD_FRAMES`), then the reader's level-end
   exit. Until M4, FIRE returns to the menu and the score goes into TOP SCORES
   as a game over would put it (`insert_top_score`) — the game ends there.
2. **The stat hooks live in the sector reader, not as C in the window.**
   Every call site is in a full segment (`BROADSIDE`, `PICKUP_CODE`,
   `LIGHT_CODE`, the Light kernel), so each is an operand-only re-point to a
   fixed reader vector (`$A00C-$A01B`); code in the window's C half would have
   moved the hot Light kernel (§4.9's page-crossing risk). The counters are
   execution, not policy; the grade's thresholds are level data. Window
   **0 B** (planned −92), records 2 and 5 **0 sectors** (planned +1 each).
3. **The shot scan (Q13) counts active slots whose lifetime is `$FF`**, the
   value the allocation stores and the next frame's projectile update
   decrements, not FREE → ACTIVE edges: an edge misses a slot a hit frees and
   the next shot refills in one frame. A shot the player's death wipes on its
   own allocation frame is not counted (it never left the gun; the harness
   counts those apart and the cross-check is exact). It runs once per frame,
   **after the line-238 fence** on fighter frames (the kernel's publish vector)
   and in the capital path otherwise.
4. **Heavy hits are read from the damage mailboxes** in the same scan (this
   frame's `DAMAGE_PLAYER_PROJECTILE` units), not from the C damage routine in
   `HYBRID_C_EXT` (record 5 full). Light hits: the PairShot path of
   `light_shot`. Kills: the three score routines' HUD refresh (Heavy, Light
   with contact included, debris shot and contact) — a kill is a destruction
   credited with score. Debris: three hits on a shot kill (Q14).
5. **The labels travel with the art** (as §4.8.1 plans): on the level-end
   summary's first frame the values are on screen and their labels arrive
   with the art run, ~0.5 s later (7 sectors). The AI lines (Q3) travel in the
   same run; the loader screen and the reader's AI pool are gone — decision
   26 makes the loading screen the summary. **Owner review, 2026-10-03:**
   START GAME's summary keeps the old loader's identity — `ENGAGING ENEMY
   SECTOR` as its top line (the level number joins it in M4) and the AI line
   under the empty panel, after BEST — on a display list of its own; the
   level-end summary is unchanged. The line is one 25-B record in the reader,
   which the module draws too. While a session's first START GAME reads the
   module, the reader's interim screen shows that line alone at the same
   scanline (32), column (9) and luminance ($A on black), so the summary
   arrives as its picture and panel filling in; the dotted row waits for the
   module, the clear waits until ANTIC has fetched row 0, and every list
   change lands on a frame's edge. The failure screen shares the reader's
   publish, so its text luminance went $E → $A.
6. **Read order:** module (once per session), art, capital restore, **the
   save record, then the level** (tail first, head last) — the record moved
   ahead of the level's tail so `sector_reader_load` stays one call; the music
   block is still read last. Before the head is overwritten a playing gameplay
   player is stopped and restarted once it lands; the in-region seamless
   rewrite (§4.8.6) is left for M4, whose next-level read needs it (every level
   carries the same music block today).
7. **The grade** maps the tier sum as S 6, A 4–5, B 2–3, C 0–1 (grade code =
   sum / 2 + 1). Thresholds (10 B: accuracy %, two **16-bit** time limits — level
   2 runs past 255 s — lives bounds, bonus per tier point in BCD) sit at payload
   offset 184, **carved from the unread `hull_params` reserve** (32 → 22 B): the
   page had no "26 spare bytes". Level 1 and 2 carry placeholders for M8.
   BONUS shows `00000` until M8 sets values and M5b adds the boss bonus.
8. **The regions are three levels each** (decision AC, as the brief states):
   `min(3, (id − 1) / 3)`. The hull styles in the build are still four-level
   regions (`hullStyleIdForLevel` with `LEVEL_MAX_ID` 16) — an existing
   inconsistency with Q5, not touched here. The art: the capital corridor in
   the region's hull style (allied left, enemy mirrored right, turrets,
   stars), generated from `capital-hulls.json` by
   `scripts/level-summary-assets.mjs`; 24 glyphs in the frontend charset's
   unused codes 72–95, so the screen needs **no DLI**.
9. **The disk:** module 584–596 (13 sectors after the owner review; 12 in the first build; planned 4), the save record
   **599**, the art **600–627** (four regions × 7). 528–583 stay M5b's.
10. **The time stat is scroll-bound**: the level-end clock MEASURED 3:10 / 2:47 /
    2:33 on EASY / MEDIUM / HARD in the `director-complete` replays, so the time
    tier mostly reflects the difficulty. Owner decision 2026-10-03: once the
    boss exists, the time grade counts only the boss fight (§5.6).

| | Plan (§4.8, §8) | MEASURED |
| --- | --- | --- |
| summary code | `$0500`, 400 → 480 B, 4 sectors | **`$0500-$0B3D`, 1,598 B** of the claimed `$0500-$0BFF` (194 B free), 13 sectors — after the owner review (first build 1,489 B, 12 sectors; +109: START GAME's own display list 42, the frame-edge publish, the START screen's order, the dotted-row step moved from the reader 39) |
| `$AE00` window | −92 (1,344 → 1,316 free) | **0** (1,444 free) |
| sector reader | −156 +304 (+75 B free) | **1,507 B, 29 free** after the owner review (first build 1,514); record 10 1,507 of 1,515 B (12 sectors) — the reader's real limit is the record: 8 B |
| records 2 / 5 | +1 sector each | **0 / 0** |
| initial block | 0 | **13,621 B (0)** |
| boot / extension / total sectors | 107 / 104 / 211 | **107 / 102 / 209** |
| ATR menu frame | +4 (551) | **547** (BASIC 538), unchanged |
| zero page | −24 | **−10** (`$AC-$B5`) |
| disk | +33 | **+42** (module 13, record 1, art 28) |
| binding row fence margin | ~1,349 | **1,378** (`2-evasive-fire3` f287; S1 1,391) |
| DMA-on maximum | ~31,223 | **31,268** (`director-complete-2` f5797; S1 31,117): +151, over the 31,200 target by 68, under the 32,568 gate |
| a Heavy kill on a rotate frame | +15 | inside the 850-cycle pin (`heavy-breakup` 17/17) after inlining the kill counter |
| START GAME, first of a session | 94 frames behind the screen | START → summary **52** frames, the interim screen (`ENGAGING ENEMY SECTOR` alone) up for them while the module's 13 sectors land; summary → every read done **76** frames (art 7, record 1, level 13); `PRESS FIRE` drawn after **150** shown frames, FIRE read from **+151**; gameplay +157 (boot smoke `atr-a5`: FIRE 3051, summary 3103, last read 3179, FIRE polled 3254, gameplay 3260) |
| START GAME, later in a session | — | summary in **1–2** frames; art + record (8 sectors) in **30**; FIRE read from +151 |
| the level's end | — | summary **1** frame after the exit; art 7 + record 1 + write 1 + read-back 1 behind it; FIRE read from +151 |
| gameplay against `main` | identical | **61 of 61 replay files identical**: 58 frame by frame on 40 gameplay columns, the three debris-gate files on every gameplay column aligned by gameplay frame; the three `director-complete` replays identical up to their level-end summary |

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
| screen shake (vertical: the HUD header's blank-line count toggled 8 → 7 → 6 for N frames) + `COLBK` flash trigger, **shared with the player's death (§7 item 25)** — **superseded (Q-S5, 2026-10-04): no resident shake; the boss win shakes the band by HSCROL jitter inside the overlay, the player's death keeps its flash only** | 40 → 48 (**0**) | window (**overlay**) | IC (**spike MEASURED**) |
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
lever.** **Decided (Q1): the scroll stops** — a station-keeping fight in
front of a slowly oscillating hull; 0 B; every boss frame under the 31,200
target. With the shots scan (Q13, +60 on every frame) the boss rows above
read **1,178 / 1,378 / 1,478** for 4 / 2 / 1 lasers on the one-Light
break-up frame, DMA-on ~30,330.

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
scroll → **the level-summary screen (§4.8; owner decision 30 replaces the
plain `SECTOR CLEARED` text)**, which until M4 returns to the menu. The
boss-resident flag is set before the hand-off so the summary's loading
restores slot A.

**The time grade counts the boss fight only (owner decision 2026-10-03, the
review of M5a-S2).** The level clock follows the scroll speed — MEASURED
3:10 / 2:47 / 2:33 on EASY / MEDIUM / HARD (§4.10 item 10) — so over the whole
level the time stat measures the difficulty, not the player. Once the boss
exists, the summary's time and its time tier measure the boss fight alone:
M5b starts the clock when the boss engages and stops it at the chain
explosion, and the level's time thresholds become boss-fight thresholds. No
code change was made in M5a-S2; this is M5b's to build.

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
90 × rows, the third DLI ≤ 180. **Spike (§5.11): the 300-native pin is
unreachable — the prototype's tick MEASURED 845–1,737 native median and
3,259 worst. Decided (correction 9, §1.5): the boss's per-frame work is
limited to ≤ 3,500 native cycles**, because at that cost the worst boss
frame still cleared the fence by 10,103 (MEASURED).

### 5.11 Spike results (2026-10-04, `spike/boss-controller`, `OWNER REVIEW CANDIDATE`)

**What was built.** A throw-away prototype of all of M5b-S3 and S4's code,
in the shapes and counts this plan specifies, built into an ignored copy of
the tree (`build/spike-boss/tree`, debug route `--level=1`, artifacts in its
own `build/level-1-s0/`, never `dist/`), measured, and deleted after these
figures were written. Nothing under `src/`, `cfg/`, `scripts/`, `assets/` or
`tests/` of the repository changed; this section is the only output. The
prototype contained: a spike level 1 (a 16-row space sector, then a BOSS
sector with a one-Light Wingman escort wave); `BOSS_DUE` ($20) raised by
the Director on boss-sector entry, the boss ceiling `light[3] = 1`; the
gate in `sector_c_update_first_capital` (one combined mask with
`CAPITAL_DUE`), the drain wait and the resident half of the transition
(NMIEN off, engine bed off, a `WARNING` banner on a HUD-only display list,
the slot-A flag, the run read at `$A006`); the overlay — its head and
12-entry table image, the region reads, a three-phase boss DLI, the
8-row HSCROL/LMS band in slot B with one colour clock of motion every two
frames, module draw and damage looks, shot-versus-module through a 64-B
column map, four lasers as quad-width missiles under `PRIOR $10` with a
25-frame warning (8 scanlines of column fill per frame, two heating looks)
and a 50-frame tracking beam that damages the player and spends the
PairShots in its column, the C controller (guns → core, HP, exposure rule,
emitter cadence, the win), the chain (six blasts eight frames apart, the
shared enemy-explosion `COLBK` flash, a band shake), the bonus into the
score and `STATS_BONUS`, and the exit to `sector_reader_level_end` with
slot A marked for restore. Placeholder art and data. Escort, laser count
(1 / 2 / 4) and HP were data variants.

Method, all **MEASURED**: bytes from the overlay's `ld65` map and the
Director link's map against `main` `6c154c2`'s; cycles from focused,
diagnostic-only `runtime-wall-trace.mjs --artifacts=build/level-1-s0
--only-session=boss-*` runs (spike-only sessions: sweep / evasive / no-fire
bots, EASY–HARD, 2,500–3,000 frames) with the repo's own
`pal-timing-audit.mjs` fence model, plus a native probe (the JS NMOS core
on the linked bytes, controlled fixtures, forced coincidences); boss state
per frame from an instrumented twin build joined by frame number (its own
cycles never used). Not release evidence. The emulator does not count the
boss DLI (it is at a new address; harness work §5.9), and the transition
frame reads as one miss (no boss-entry exception yet).

#### 5.11.1 Bytes — slot A, the window, the rest

The first draft **did not fit**: 2,343 B against slot A's 2,048 (**295
over**), with the controller at 856 B and the transition at 382. Two
changes made it fit, and both are recommended (Q-S1):

1. **The once-only install leaves slot A.** Everything that runs once per
   boss entry — the copies, the table and band install, the display-list
   builder, the column map, the palette patch, the escort and theme starts —
   is linked at the staging RAM `$7810` (the pause backup, 960 B), rides in
   the region's staging run and runs in place before it is overwritten.
   Slot A keeps the per-frame code, the region reads and the exit.
2. **The controller written for size** (shared helpers, no re-zeroing of
   the freshly read image): 856 → **702 B**, same behaviour.

| Part | Plan (§5.1, exp → budg) | MEASURED | Where |
| --- | ---: | ---: | --- |
| controller (C): phases, HP, exposure, cadence, selection, win, bonus | 600 → 720 | **702** (+30 B of C state) | slot A |
| band draw and module damage looks | 290 → 348 | **125** (the band ships as map data; only module cells are rewritten) | slot A |
| shot-versus-module (5 shots, scroll offset, 64-B column map built at install) | 60 → 72 | **56** | slot A |
| lasers: fill, fire, track, collide (player / shots / Light), hide, erase | 200 → 240 | **306** (collide 127) | slot A |
| band display-list builder | 60 → 72 | **104** | staging |
| the boss DLI, three phases (+ the LMS copy on coarse frames) | 80 → 96 | **164** | slot A |
| HSCROL / coarse-LMS motion and shake (+ 16 B row tables) | 40 → 48 | **130** | slot A |
| chain, score per module, bonus, completion, frame entry | 120 → 144 | **88** | slot A |
| transition, boss half: region reads (3 runs) + exit | 80 → 96 | **122** | slot A |
| transition, boss half: the once-only install | (in the above) | **266** | staging |
| head + table image | 60 | **39** | slot A |
| ASM state | (10 B resident, §5.1 hooks) | **64** | slot A (zero in the image) |
| **slot A total** | **1,650 → 1,980** | **1,826 of 2,048 — 222 free** | |
| staging run (once-only code 370 + glyphs 248 + theme 241) | — | **859 B, 7 sectors** of the 960-B staging RAM | `$7810` |

**Not built, still owed by S3–S4, and their room:** the Light killed by a
beam through the existing kill path (counted only, ~20 B), the laser damage
source id (~5), the channel-2 warning tone (~20), the boss-fight clock for
the time grade (§5.6, ~25 in C), a player Y floor below the band in the
boss sector (~12), a full HUD redraw after the banner (~10; the prototype's
`update_hud_status` leaves `WA…NING` cells — cosmetic). **~90 → 110 B
against the 222 free**: slot A ends **~94 % full**. If it overflows, the
next movable piece is `boss_c_init` (53 B) to the staging run, which then
needs an eighth sector — `$7810` + 8 × 128 runs into the arena at `$7BD0`,
so not as one run.

**The resident hooks (plan: 40 → 48 + shake 40 → 48, 0 initial block):**

| Home | MEASURED | Note |
| --- | ---: | --- |
| window | **+125 B** (1,444 → 1,319 free): the gate's body in C 47, the transition's resident half 78 (code 65, `WARNING` 7, banner list 6) | the Light kernel shifts by 125 B; the binding replay `2-evasive-fire3` is **unchanged**: margin 1,378, max wall 30,532 (A/B on the same emulator, original level 1 with the hooks in) |
| `HYBRID_C_SECTOR` | **+14 B** (33 → 19 free): the combined `CAPITAL_DUE \| BOSS_DUE` mask and the branch | 0 cycles on frames without either flag (the mask replaces the test) |
| `DIRECTOR_C_LOW` | **+6 B** (the BOSS branch in `enter_sector` changed the generated layout) | |
| initial block | **0** | |
| `ENTITY_STATE` / zero page | **0** (the boss state lives in the overlay) | plan −10 |
| transport | **+2 extension sectors** (102 → 104; which records took them was not broken down — record 2 had 3 spare bytes before `HYBRID_C_SECTOR`'s +14) | ATR menu ~+4 frames (547 → ~551, baseline 596) |
| the shake hook | **0 so far**: the plan's mechanism does not exist (§5.11.4 item 3) | |

#### 5.11.2 Cycles on a boss frame

| Case (8-row band, third DLI, world scroll stopped) | worst fence margin | DMA-on max |
| --- | ---: | ---: |
| 1 laser, the Light | **12,257** | 29,219 |
| 1 laser, no Light | **17,207** | 28,311 |
| 2 lasers, the Light | **11,431** | 29,219 |
| 2 lasers, no Light | **16,406** | 28,314 |
| 4 lasers, the Light | **10,103** (`boss-2-evasive-fire3` f1519: a Light killed, 2 warnings + 2 erasing beams) | 29,216 |
| 4 lasers, no Light | **14,949** | 28,314 |
| 4 lasers, the Light, the win run (guns and core destroyed, the chain) | **10,253** | 28,968 |
| **all 20 replays, 58,181 boss frames** | **10,103 — 0 misses** (GO ≥ 500) | **29,219** (target 31,200, gate 32,568) |

MEASURED in the emulator, DMA-on. **The boss's own work** (the
`handle_collisions` segment the table's UPDATE entry runs in, DMA
included): 1,000–1,500 with no laser active, **5,402** at four lasers,
**6,616** on a core-kill frame that also starts the chain. Native (JS core,
no DMA) worst per frame: **1,692 / 2,089 / 2,430** cycles for 1 / 2 / 4
lasers; with a gun destroyed on that frame **1,712 / 2,109 / 3,220**; with
the coarse LMS step too 1,953 / 2,350 / 3,198; with the core destroyed
**2,291 / 2,613 / 3,259**. The emulator/native ratio (~2.2) is the one the
repo already uses.

**"A module destroyed on a ring-rotate-equivalent frame":** a boss sector
has no rotate frames (the scroll is stopped). The equivalent is the coarse
LMS step (one in 32 frames: 8 LMS computations before the fence, 8 stores
in the post-band DLI). MEASURED kill + coarse in one frame, native: 3,198
(four lasers). **Composed worst (ESTIMATE from MEASURED parts):** the
worst replay row (10,103, a Light killed with four lasers live) with its
boss segment (3,946) replaced by the heaviest measured one (6,616) is
**~7,400**; a player hit on top (apply + HUD, ~900 DMA-on) leaves
**~6,500 over the fence** — thirteen times GO.

**Why the plan was so far off, both ways.** §5.4 started from the binding
ELITE row (a Raider pair, rotate frames) and subtracted; a boss frame has
neither, and its MEASURED base is ~15,000 over the fence with nothing live.
Its boss items were priced 1:1 in native cycles: the boss work MEASURED
**~4–6 ×** §5.4's 1,000-odd budgeted (the C dispatch costs ~100–150 a laser
before the ASM runs; fill and erase are 8 read-modify-writes a laser; DMA
×2.2). Net: the boss frame clears GO by ~10,000, not ~1,200. **Q1's premise
no longer holds** — with the scroll kept the margin would still be ~8,000
(ESTIMATE: rotate 1,545 × ~1.5) — but stopping it is still the cheaper and simpler
build (0 B, no ring rotation under a band); no change recommended.

#### 5.11.3 The transition — EMULATOR

| | Plan (§4.4, §6.4) | MEASURED (EMULATOR) |
| --- | --- | --- |
| boss entry, sectors | 26 (code 16 + region 10) | **28**: code 16 + region 12 (band rows 0–5 in place 3, rows 6–7 + tables in place 2, staging run 7) |
| boss entry, frames | 98 (2.0 s) | **107 host frames (2.1 s)**, the same on every entry (six entries measured); ~4.3 s on a 1050-class drive, ~2.4 s SIO2SD standard (ESTIMATE ×2, debt item 5) |
| the frame it lands in | — | the install returns at line ~2 of a fresh frame; **the PAL-frame handshake must be re-armed** (`GAMEPLAY_PAL_FRAME_CONSUMED` = id + 1, 6 B) or the loop runs one phase late for the rest of the fight (found: start line 266, every frame a full 35,500-cycle iteration) |
| the win → the next level frame | — | **320 host frames** (the level-end summary, its 150-frame minimum and the bot's FIRE, the menu, a START GAME summary with the 16-sector slot-A restore behind it); the second boss entry then takes 107 again — **restore and re-overlay work** |

#### 5.11.4 What the prototype shows to be wrong or costlier in the plan

1. **Slot A cannot hold the boss with its install** (2,196 B even with the
   lean controller). Cheapest alternative: the once-only install in the
   staging run (built, measured above; +7 sectors per entry that the
   region's 10 already almost covered: 12 instead of 10).
2. **A region needs three destinations, the directory has one per run.**
   Band rows 0–5 land at `$A880`, rows 6–7 and the tables at `$AC80`, the
   rest is staged; the LevelDef pages sit between (`$AA00-$AC7F`) and the
   staging RAM ends at `$7BCF`. Cheapest: the overlay reads its own runs
   through `sector_reader_read_sectors` with sector numbers the build bakes
   into its image (0 reader bytes, 0 directory entries). It needs four
   reader-internal addresses (`sr_sector_lo/hi`, `sr_sectors_left`,
   `sr_dst`, the failure screen, `sector_reader_level_end`, the slot-A
   flag), so Q-S3.
3. **The shake has no mechanism.** The gameplay display list has no blank
   header lines (it starts `$C2`), so "the HUD header's blank-line count
   8 → 7 → 6" does not exist; adding one moves the whole ring 1–2 scanlines
   past the line-238 fence on the shaken frames. Built instead for the
   boss: an HSCROL jitter of the band (in the overlay, 0 resident B,
   ~15 cycles). The player-death shake (item 25) has no cheap form: Q-S5.
4. **"Six `render_shared_fighter_explosions` instances" do not exist.**
   The shared records are two (P0/P3 for the player, a playfield-only enemy
   slot whose timer drives `COLBK`). Built: blast glyphs written into the
   band cells along the modules, the enemy slot's `COLBK` flash and the band
   shake — 11 B a link.
5. **One-colour-clock missiles are too thin for a beam.** `SIZEM = $FF`
   (four colour clocks each) during the boss sector, restored at exit.
6. **The 300-native tick pin** (§5.10) — see §5.10's note.
7. **Patched resident state survives a game that ends inside the boss.**
   The rates (6 B), `PRIOR`, `SIZEM` are put back by the win's exit only;
   a GAME OVER or a pause-quit in the boss sector would start the next game
   with the world stopped. Q-S4.
8. **The disk reservation is 8 sectors short.** 528–583 is 56 sectors;
   code 16 + four regions × 12 = 64. Cheapest: the once-only install as
   one shared 3-sector run, each region 3 + 2 + 4 = 9 sectors: 16 + 3 +
   36 = **55 of 56**, one more read per entry (the entry stays 28 sectors).
9. **Things the band hides:** Lights enter under the band (hidden ring rows
   1–7) and appear below it; PairShots fly on hidden rows until the band
   bottom (y 80), where they hit; the player can still climb into the band
   (y ≥ 32): the Y floor of item "not built" above.
10. **The harness**: the boss DLI's address must join the DLI model, the
    transition frame needs a boss-entry exception, and a boss-state column is
    needed (the spike borrowed two capital-only bytes in an instrumented twin).

#### 5.11.5 The M5b sessions re-estimated

| Session | Plan | Re-estimate from the spike |
| --- | --- | --- |
| **S3** `feat/boss-band` | slot A ~1,250, slot B 610, window −48, `ENTITY_STATE` −10, disk +26, boss frames ~1,640 | slot A **~1,350** of 2,048 (all of the above but the laser ASM 306 and ~170 B of laser C), staging run 859 B; slot B **704 of 768** (band 512, tables 128, column map 64); window **−125**, `HYBRID_C_SECTOR` −14, `DIRECTOR_C_LOW` −6, 0 `ENTITY_STATE`/zero page; transport +2 extension sectors; disk +28 (code 16, region 1 12); boss frames **≥ 12,000** over the fence (MEASURED zero- and one-laser rows); the handshake re-arm and the restore of patched state (Q-S4) are in scope; harness: DLI model, boss-entry exception, state column |
| **S4** `feat/boss-lasers` | slot A +~500, worst boss row 1,238 | slot A **+~480** (306 ASM + ~170 C) **+ ~100** of the owed items: **~1,930 of 2,048**; worst boss row **10,103 MEASURED, ~6,500 composed** — far over GO; the 50-frame beam and the warning as built; shake for the boss built, the player-death shake per Q-S5 |
| **S5** `feat/boss-regions` | disk +30, 10 sectors per region | **9 sectors per region with the shared install run** (Q-S1, item 8): regions 2–4 +27, total 55 of the 56 reserved |

#### 5.11.6 Owner questions the spike raises

**All six answered as recommended on 2026-10-04 — §1.5.**

| # | Question | Recommendation | Alternative and its cost |
| --- | --- | --- | --- |
| **Q-S1** | The boss in two homes: per-frame code in slot A, the once-only install in a staging run at `$7810`? | **Yes**: it is the only measured way to fit (1,826 + 222 free); the install code is read once per entry, shared by the four regions as one 3-sector run | all in slot A: 148 B over with the lean controller — would need the controller's laser logic in ASM (against the C/ASM ownership rule) or a second slot |
| **Q-S2** | Window cost of the entry: 125 B (plan ~48) | **Accept**: the window still ends M5b at 1,319 free, 99 B better than §6.1 budgeted; the binding row is unmoved | drop the `WARNING` text and the banner list and show the HUD row alone during the read: −13 B data, −~30 code (~82 B) |
| **Q-S3** | The overlay calls reader internals (the sector loop, its four BSS bytes, the failure screen, the level end, the slot flag) | **Link the overlay against the reader's labels in the same build**, with a build check that fails if any moves (0 B) | frozen reader vectors: +12 B in the reader, whose record 10 has 8 B before a transport sector |
| **Q-S4** | A game that ends inside the boss sector leaves the world stopped, `PRIOR $10`, `SIZEM $FF` | **The reader's slot-A restore also restores them** (an 8-B image + copy, ~20 B in the reader: record 10 +1 sector, ATR menu +2 frames) | (b) a boss flag tested in `update_starfield` (~8 B, ~5 cycles on every frame, the binding row included); (c) re-init in `start_gameplay` — `CODE` is full |
| **Q-S5** | The player-death shake (item 25) has no cheap mechanism | **Keep the existing death `COLBK` flash and drop the shake from item 25**; the boss keeps its band jitter (built, 0 resident) | a leading blank-line toggle: 24 frames a death with the ring 1–2 scanlines late against the fence — needs its own measurement |
| **Q-S6** | Disk: four regions at 12 sectors overrun 528–583 by 8 | **The shared install run**: 55 of 56, one more read per entry | move the summary code (584+) — a disk-layout change the S2 tests pin |

#### 5.11.7 Priced for S3: the `WARNING - BOSS APPROACHING` screen (decision 32) and the full restore (Q-S4)

Estimates (**IC** from the spike's MEASURED pieces, **G** where marked);
S3 measures them.

**The screen.** The reader already has the screen it needs:
`sector_reader_show_records` publishes the frontend text display list
(ANTIC 2, the frontend charset, DLI-free, luminance $A on black) from a
record list, which is what START GAME's interim screen and the failure screen
use. The boss entry passes it a two-line record, `WARNING` and `BOSS
APPROACHING`, centred — inside the frontend glyph contract
(`A-Z 0-9 space - . / :`); the dash of the owner's wording is `-`.

**The theme starting with it.** The boss theme travels in the region's
staging run, which the spike read last. The order becomes: (1) the region's
staging run (glyphs + theme, 4 sectors with the shared install run of Q-S6,
through the region's own directory entry 2–5, to `$7990` so it does not
collide with the install run at `$7810`); (2) stop the level's track, copy
the 241-B theme over it and start the player — from then on the reader's
wait loop ticks it on channels 1 and 2, as it ticks the summary's music
(§4.8.6 a); (3) the boss code, 16 sectors into slot A; (4) the slot-A head
reads the shared install run (3) and the band rows (3 + 2) and runs the
install. **Same 28 sectors and 107 frames (EMULATOR) as measured; the theme
plays under the screen for the last 24 sectors, ~90 frames (~1.8 s;
~3.6 s on a 1050-class drive, ESTIMATE)**, then carries on into the fight.

| Item | Bytes | Home | Basis |
| --- | ---: | --- | --- |
| the two-line record | +30 | window (the Director link's RODATA) | the reader's record format: address 2 + text + 0 per line, $FF |
| the call to the text screen | +7 | window | IC |
| the region's staging read first, the region index from the level id | +18 | window | IC |
| the theme copy and the player start, before the code read | +20 | window | IC (the spike's install loop, moved) |
| the spike's banner (text 7, list 6, store / charset / colour / list code ~30) | −43 | window | MEASURED spike, removed |
| **net, window** | **+~32 → ~157 B with the spike's 125** | | ESTIMATE |
| slot A: the head no longer reads the staging run; the install no longer copies the theme | −~10 / −11 (staging run) | slot A, install run | IC |
| the full HUD redraw after the screen (`render_frontend_data` clears `$4000-$43FF`, the HUD row included) | already in §5.11.1's owed ~10 B | slot A | — |
| sector reader | **0** | — | the screen, the record format and the region entries already exist |

Q-S3's build check gains `sector_reader_show_records` (the window's gate
links before the reader, like the slot flag and the failure screen it
already names). The engine bed stays silent while the reader owns
channels 3 and 4; the boss theme must be a two-voice gameplay-format track
(§4.8.6 a), which item 14 already requires.

**The full restore (Q-S4).** What a game that ends inside the boss sector
leaves behind, and what puts each back at the next START GAME:

| Setting | Put back by | Bytes |
| --- | --- | ---: |
| slot A and the capital vector table | the reader's restore (S1) | 0 (exists) |
| the DLI vector, the display list, the missile plane | `start_gameplay` (`VDSLST`, the list builders, `clear_pmg`) | 0 (exists) |
| charset codes 59–89 | `publish_level_hull_style` at the level start | 0 (exists) |
| the theme over the level's track | the level read (the music block is re-read last) | 0 (exists) |
| the world and hull scroll rates (6 B) | **new**: copied back from a 6-B image | 17 |
| `PRIOR`, `SIZEM`, `HSCROL`, `HPOSM0-3` | **new**: zeroed | 23 |
| the band's map, tables and column map in slot B (`$A880-$A9FF`, `$AC80-$ADBF`) | the level read refills `$A880-$A9FF`; `$AC80-$ADFF` is past the image and stays, but nothing outside a boss sector reads it and the next boss entry rewrites it | 0 |

**~40 B new. They do not fit the reader**: it has 29 B of RAM free and its
record 10 is 8 B from another sector. **Placement: the `$0500` summary
module** (194 B free; 1,598 + ~40 = ~1,640 B, still 13 sectors), in
`SUMMARY_START_GAME` next to its call to the reader's restore and gated by
the same slot-A flag — the same START GAME step the owner named, 0 reader
bytes, 0 transport. Every path out of a boss sector except the win (GAME
OVER, pause-quit) reaches the menu and then START GAME; RESET is a cold
start.

### 5.12 M5b-S3 as built (2026-10-04, `feat/boss-band`, `OWNER-SMOKE CANDIDATE`)

Implemented as §4.4, §5.1–5.3, §5.6 and §5.11.7 describe, under Q-S1–Q-S6,
decision 32 and correction 9, with the deviations below. Figures are MEASURED
from the linked images, the regenerated evidence or a named 6502-harness test;
load figures are EMULATOR. Region 1's art and the boss theme are placeholders
(owner work, M8 tunes HP and the bonus).

**Deviations and choices, each reported:**

1. **The window's resident half is the last segment of the window**
   (`HYBRID_ASM_WINDOW` moved after the C half in `cfg/encounter-director.cfg`),
   so the Light C keeps its addresses and only the Light kernel moves:
   109 B (code 79, the two-line record 30) + 19 B of `enter_sector`'s BOSS
   branch in the C half = **128 B** (§5.11.7 priced ~157).
2. **Q-S3** as two mechanisms: the overlay links last against the same
   build's labels (`build/boss-imports.inc`, generated, cannot drift); the
   window, which links first, names eight addresses as pins
   (`src/hybrid/boss-entry-pins.inc`) that the build checks against the real
   links and fails on, naming the pin.
3. **The install blanks DMA before it switches the display list.** Switching
   under the live WARNING list let ANTIC run a partial boss list and the DLI
   phases ran one out of step: the loop started every frame on scanline 254
   (the spike's "one phase late" symptom). With DMA off first, the plain
   re-arm `GAMEPLAY_PAL_FRAME_CONSUMED = PHYSICAL_PAL_FRAME_ID` before NMIEN
   is enough (not "id + 1"): every boss frame starts on scanline 18.
4. **The column-map builder lives in slot A**, called by the install: the
   install run is 343 of 384 B without it (it was 15 B over with it).
5. **Q-S4's restore** is a 16-entry table the build generates from the linked
   images (the six scroll rates, two pause-resume DLI operands, the player's
   Y-floor operand; HSCROL, PRIOR, SIZEM, HPOSM0-3 zeroed), 70 B in the `$0500`
   module: 1,598 → **1,677 B, 14 sectors** (§5.11.7 expected "still 13"): one
   more sector, read once per session.
6. **Two patched settings the plan did not list**: `resume_gameplay` writes
   `VDSLST = gameplay_dli`, so a pause in the boss sector would lose the boss
   DLI — its two operands are patched and restored; and the player's Y floor
   (§5.11.1's owed ~12 B) is `read_input`'s compare operand, patched to the
   band's bottom (scanline 88) and restored. The Y-floor operand has no label
   (one would split `read_input`'s cheap locals): the build finds it by its
   bytes and fails unless it is found exactly once.
7. **The escort**: a row tick in a boss sector neither arms nor advances
   (+8 B `DIRECTOR_C_CODE`); the install arms a row-0 wave through
   `director_c_try_event` when the sector authors one. Level 1 authors none
   (its core page's 20 waves are all taken by sectors 1-4).
8. **The HSCROL geometry** is Atari800's `src/antic.c` HSCROL handler: byte k
   of a normal-width HSCROL row is shown at colour clock 32 + 4k + HSCROL, so a
   shot at x meets band column (x − 32 + p) / 4 with p = LMS·4 − HSCROL.
9. **The fight's clock** (owner decision 2026-10-03) is written into the
   active-gameplay clock at the hand-off, after the last gameplay frame: the
   summary reads it unchanged.
10. **No hit flash** on a non-lethal module hit: the feedback is the wreck
    look, the kill sound and the score on a kill — an owner-smoke item.
11. **The harness** (correction 10): the boss DLI counted at its address while
    the slot-A flag is set (three a host frame, gated); the entry's frame set
    aside as the session's boss-entry milestone; a `boss_state` column; boss
    module kills counted by the summary observer. Class (a) re-points: the
    `director-complete-*` ending (row clock → drained entry → guns → core →
    chain → hold, terminal), their budget 10,500 → 15,000, the summary's clock
    and first-frame score (bonus included).

**Bytes, part by part, against the spike (§5.11.1):**

| Part | Spike | MEASURED | Where |
| --- | ---: | ---: | --- |
| head + table image | 39 | **39** | slot A |
| region reads + exit (with the 49-B run tables) | 122 | **136** | slot A |
| boss DLI, three phases + the HSCROL/LMS publish | 164 | **154** | slot A |
| motion and the win's shake (+ 24 B of row tables) | 130 | **103** | slot A |
| shot-versus-module and the chain's dispatch | 56 + part of 88 | **112** | slot A |
| module hit, score, looks, drawing | 125 | **176** | slot A |
| hand-off (clock, level end) | in 88 | **21** | slot A |
| column-map builder | in the install | **65** | slot A |
| C controller (no lasers) | 702 with lasers | **443** | slot A |
| state (ASM 18, C 30) | 64 | **48** | slot A (zero in the image) |
| **slot A** | 1,826 with lasers; S3 ~1,350 | **1,297 of 2,048 — 751 free** | |
| once-only install | 266 + builder 104 | **343 of 384** (3 sectors) | `$7810` |
| region 1 staging run | 4 sectors | glyphs 248 + theme 177 (256 copied), **4 sectors** | `$7990` |
| slot B | 704 | **704**: band 512, tables 128, column map 64 | `$A880`, `$AC80` |

**Ledger against the plan:**

| | Plan / spike | MEASURED |
| --- | --- | --- |
| window | ~−157 / −125 | **−128**: 1,444 → **1,316** free |
| `HYBRID_C_SECTOR` | −14 | **−15** (33 → 18 free) |
| `DIRECTOR_C_LOW` / `DIRECTOR_C_CODE` | −6 / — | **0 / −8** (43 → 35 free) |
| `$0500` module | +~40, 13 sectors | **+79**: 1,677 B, 115 free, **14 sectors** |
| sector reader | 0 | **0** (1,507 B, 29 free; record 10: 8 B) |
| initial block | 0 | **13,621 B (0)** |
| boot / extension / total | 107 / 104 / 211 | **107 / 104 / 211** (window and pickup records +1 each) |
| ATR menu frame (baseline 596) | ~551 | **550** (BASIC 541) |
| disk | +28 | **+28**: code 528–543, install 544–546, region 1 547–555; 556–583 for regions 2–4 (55 of 56) |
| boss entry | 28 sectors, 107 frames | **28 sectors, 108 host frames** every replay (2.2 s) |
| worst boss frame (fence) | ≥ 12,000 | **16,089** (11,171 boss frames, four replays) |
| DMA-on on boss frames | ≤ 29,219 | **28,008** |
| boss per-frame work, native | ≤ 3,500 (correction 9) | **2,760** worst (`tests/boss-runtime.test.mjs`, DLIs included) |
| binding row `2-evasive-fire3` f287 | 1,378 | **1,370** |
| DMA-on maximum | 31,268 | **31,237** (`director-complete-2` f5797) |
| the fights (bot, held lives) | 45–60 s | **2,626 / 2,871 / 2,629 frames** EASY / MEDIUM / HARD |
| gameplay before the boss | identical | **51 of 51 replay files identical** to `main` on 42 columns up to the boss sector |

---
## 6. Ledgers


### 6.1 The `$AE00` window in the new order (M5 → M4 → M3 → M6), with and without overlays

Figures `expected → budgeted`; the M3 sessions are the m3-waves-heavy plan's
928 → 990, M4 and M6 the budget's 150 → 180 each.

| Point on the road | **With overlays** (this plan) | Without overlays, boss B-A | Without, boss B-B |
| --- | ---: | ---: | ---: |
| today | 1,480 | 1,480 | 1,480 |
| after M5a-S1 (the vector table, 60 → 72) — **MEASURED 1,444** (12 entries, 36 B; §4.9): every row below gains **+36 B budgeted / +24 expected** | 1,420 → 1,408 | 1,480 | 1,480 |
| after M5a-S2 (the stat counters 36 → 44 and the shots scan 40 → 48, Q13; the screen's code is in `$0500`) — **MEASURED 1,444** (the hooks live in the reader, §4.10): every row below gains **+92 B budgeted / +76 expected** | 1,344 → 1,316 | 1,480 | 1,480 |
| after M5b (`BOSS_DUE` + shake, 80 → 96) — **SPIKE MEASURED −125** (the entry gate 47 + the transition's resident half 78; the shake 0, §5.11.1): **1,319** from S2's measured 1,444, so every row below gains **+99 B budgeted**. **S3 MEASURED −128** (the resident half 109, `enter_sector`'s BOSS branch 19; §5.12): **1,316** free, every row below gains **+96 B budgeted** | 1,264 → **1,220** | 340 → **112** (−1,140 → −1,368) | 270 → 28 |
| after M4 (150 → 180) | 1,114 → 1,040 | 190 → −68 | 120 → −152 |
| after M4's initials entry (item 16, 150 → 180) | 964 → 860 | — | — |
| after M3 session 1 (333 → 352) | 631 → 508 | −143 → −420 | −213 → −504 |
| after session 2 (99 → 114) | 532 → 394 | −242 → −534 | −312 → −618 |
| after session 3 (496 → 524) | 36 → **−130** | −738 → **−1,058** | −808 → −1,142 |
| after M6 (150 → 180) | −114 → −310 | −888 → −1,238 | −958 → −1,322 |
| after the starfield density and speed (item 24, 50 → 60) | −164 → −370 | — | — |
| **after the attract mode** (item 15, 200 → 240; the last code item before the freeze) | **−364 → −610** | — | — |

The totals without overlays are §6.3's — the order moves who is short, not
by how much. **With overlays the shortfall of 1,058 B at the M3 sessions
becomes 130 B**, and the road with every accepted wish item ends **610 B
short on budgeted figures, 364 on expected ones** — before the levers.

**The levers still available at the end of the road**, each with its price
(the splash RAM is the summary code's home and is no longer a lever;
`LEVEL_BUFFER` 16 → 14 is ruled out by slot B):

| Lever | Buys | Price | Risk | Basis |
| --- | ---: | --- | ---: | --- |
| the `STARFIELD` run tail `$5CDB-$5E0F` as a landing zone (record 1 started lower) | **309** | a cfg and build change; staging windows measured to the byte | 3 | M size, G feasibility (budget §4.1 lever 4) |
| the arena's free bytes after the M3 sessions' own moves | **95** | none on addresses | 1 | m3-waves-heavy §6.3 |
| the `BROADSIDE` pins after M3 (5 in the pin, 10 in the codebook reserve) | **15** | none | 1 | same |
| `LEVEL_BUFFER` 16 → 15 (`$A680`), every level address and the music block re-linked; slot B keeps two spare sectors | **128** | the Q-1 manoeuvre again, plus the gameplay-music cfg; evidence regenerated | 3 | M (Q-1 precedent) |
| the M3 plan's own cuts (§6.3 there: the column helper 65 at +12 cycles per Interceptor tracking frame, one damage stage 12, the armoured dodge 46, the volley into the arena 72) | up to **195** | each a visible or cycle loss the M3 plan recommends against | 1–2 | m3-waves-heavy §6.3 |
| **sum, without the cuts** | **547** | | | |
| **`$0C00-$1FFF`, unclaimed low RAM** (owner, 2026-10-03; §4.10): not window bytes, but a home for code that runs from a fixed address outside the window - the way the summary module now does at `$0500-$0BFF` | **5,120** of RAM | a link or record of its own; whatever lands there must be read or landed before its first use | 2 until the owner's 65XE smoke confirms `$0500-$0BFF` (`hardware-testing.md` §12) | **M**, EMULATOR only: never written after `start`, patterns `$5A`/`$A5`, BASIC on and off (`diagnostics/low-ram-0700-1fff-2026-10-03.md`); not used now |

**A cycle lever, measured in M5a-S1 (§4.9) and not taken:** Probe B, the
zero-timer fast paths in four capital vector entries, buys **+207 of fence
margin** on the binding row (1,391 → 1,598) for **+42 B of window**. It is
the first lever to reach for if a later session needs cycles rather than
bytes; it costs the resource this ledger is short of, which is why it waits.

So the road ends **−63 B budgeted after the four levers (+183 on expected
figures)**. **The item that gives way first is the attract mode** (item 15,
240 B budgeted): it is the last code item in the order, it is the only
recommended item that cannot be built partially without changing what it
is, and dropping it turns −63 into **+177**. The M3 cuts (195, with their
cycle and visible costs) are the alternative that keeps it. The decision
is the owner's at the M6 boundary, with measured figures: this plan builds
in the order of the table and lands the attract mode last, so that whatever
is short by then is exactly what the attract mode would have cost. If the
grade and ratio code (120 B) overflow `$0500` (§4.8.3), add 120 to every
shortfall. `LEVEL_BUFFER` 16 → 14 is **not**
recommended: slot B needs the spare sectors (§4.1).

### 6.2 RAM, by home, after M5

| Home | Today free | M5a | M5b | After M5 | Note |
| --- | ---: | ---: | ---: | ---: | --- |
| window | 1,480 | −72 −92 (S1 **MEASURED −36**: 1,444) | −96 (**spike MEASURED −125**) | **1,220** (1,256 with S1 as measured; **1,319 with S1, S2 and the spike; ~1,287 with decision 32's screen; S3 MEASURED 1,316**) | §6.1, §5.11.1, §5.11.7, §5.12 |
| sector reader | 63 | +152 −136 (S1; **MEASURED +152 −177 = 38 B free**, the 177 including the 36-B capital table image §4.9 adds); +304 −156 (S2: the AI texts to disk, the summary and the write) = **+227** | 0 | 227 (−25 after the optional fast loader's 100 and the stub's 152 going) | Q3 |
| `BROADSIDE` | 3 (+119 pins) | 0 (regrouped, byte-neutral) | 0 (the boss lives in the slot) | 3 (+119) | the pins stay M3's |
| arena | 35 | 0 | 0 | 35 | |
| `DIRECTOR_RAM` | 43 | 0 | 0 | 43 | |
| `HYBRID_C_SECTOR` / record 2 (**spike: −14 B, 33 → 19**) | 33 / 3 | `PICKUP_CODE` +16 (record 2 +1 sector) | 0 | 33 / 115 (10 sectors) | the sector M3-H and M4 also ride in |
| `HYBRID_C_EXT` / record 5 | 39 / 0 | +12 (record 5 +1 sector) | 0 | 27 / ~110 (7 sectors) | |
| splash RAM `$0500-$06FF` | 512 (lever 10) | −480 (the summary code) | 0 | 32 | read once per session |
| zero page `$AC-$FF` | 84 | −24 (stats, the scan's previous-state copy, summary state) | −10 (boss state, if not `ENTITY_STATE`) — **spike MEASURED 0**: the state lives in the overlay | 50 … 60 (**74** with S2's −10 measured) | |
| `ENTITY_STATE` (~32) | ~32 | 0 | −10 (**spike MEASURED 0**) | ~22 (**~32**) | boss state in the overlay |
| unowned RAM | 22 | 0 | 0 | 22 | left for M3 |
| initial block to STOP | 31 | ±8 (G: operand re-points move the packed size; S1 **MEASURED 0**: 13,621 B); 0 from the stats (Q13) | 0 | **23 … 31** | STOP if negative |
| slot A (new) | — | ≥ 2,048 | −1,980 (**spike MEASURED −1,826**, ~−1,930 with S4's owed items) | ≥ 68 (**222**, ~110 after S4) | the boss's per-frame home; its once-only install (370 B) rides a staging run at `$7810` (§5.11, Q-S1) |
| slot B (new) | — | 768 | −610 (**spike MEASURED −704**) | 158 (**64**) | band map 512 + tables 128 + the column map 64 |

**The initial block to the end of the road** (31 B to STOP today; the
ceiling 13,684 is 32 B further and is not budgeted):

| Point | Bytes to STOP | Basis |
| --- | ---: | --- |
| today | 31 | manifest |
| after M5a-S1 (operand re-points of ~33 `jsr` sites) — **MEASURED 31** (12 sites re-pointed; 13,621 B, unchanged) | 23 … 31 (±8, G: the packed size is not predictable byte for byte) | §4.1 |
| after M5a-S2 (Q13: no stat byte in the initial block) | 23 … 31 | §4.8.2 |
| after M5b | 23 … 31 | the boss DLI and transition live in the overlay |
| after M4 (0 by the C route; 6 → 10 packed B if a main-loop hook proves unavoidable) | 13 … 31 | budget §2 M4 |
| after M3 + M3-H (0: `HEAVY_CODE` byte-neutral, `PICKUP_CODE` and the arena pay) | 13 … 31 | m3-waves-heavy §6.2 |
| after M6 (K1's hooks: damage operand, look select, 10 → 12 packed B) | **1 … 19** | budget §2 M6 — the room Q13 protects |
| a twelfth DFMC record, if ever | −16 | budget §4.1 lever 14 — not taken |

### 6.3 Transport, sectors and the disk

| | Today | After M5 | Note |
| --- | ---: | ---: | --- |
| boot sectors | 107 | 107 | no new boot sector |
| extension sectors | 102 | 105 (**spike MEASURED: 104** — S1 and S2 measured 0, the boss hooks +2; **S3 MEASURED 104**: the window record and the pickup record +1 each, total **211**, ATR menu **550**) | the window record 9 → 10 (1,067 + ~165 packed B of hooks, counters and table > 1,131); records 2 and 5 +1 each (the stat hooks). **S1 MEASURED +0**: the table went into the Light kernel's record 9 (653 → 689 of 747 B, 6 sectors), not record 8 |
| total transport | 209 | 212 (**211**) | |
| ATR menu frame (baseline 596, warn 606) | 547 | ~553 (**~551**: +2 sectors at the sizing rule; not boot-smoked in the spike) | 2 frames per sector, sizing rule |
| disk, level runs from 320 | 13 used | 192 reserved (12 × 16) | sectors 320–511 |
| disk, overlay runs from 512 | — | capital restore 16, boss code 16, boss regions 40, summary code 4, summary art 4 × 7 = 28, save record 1, attract 4 = **109** — **MEASURED after S2: summary code 12 (584–595), save record 599, art 600–627; 528–583 reserved for M5b; 117 with the attract stream**. **Spike: four regions at 12 sectors need 64 of the 56 reserved; with the once-only install as one shared 3-sector run, 16 + 3 + 4 × 9 = 55 (§5.11.4 item 8, Q-S6)** | sectors 512–631; speech would add 12–61; the hangar (item 18) is absorbed by the summary art |
| free sectors after twelve levels and every recommended item | 319 | **210** | |

### 6.4 Load time, by transition (frames at 3.77 per sector; EMULATOR; 1050 ×2; SIO2SD fast ÷3 ESTIMATE)

| Transition | Today | After M5 (standard speed) | SIO2SD fast (est.) | 1050 (est.) |
| --- | ---: | ---: | ---: | ---: |
| START GAME, first level of a session (summary code 4 + art 7 + level 13 + record 1) | 49 (1.0 s) | 94 (1.9 s), behind the summary screen | 0.6 s (not built: the fast loader is optional) | 3.8 s |
| transition after a boss (art 7 + restore 16 + level 13 + record 1) | — | 139 (2.8 s) + the write, behind the summary; a 3-s minimum display covers it | 0.9 s | 5.6 s (exceeds the minimum by ~2.6 s: `LOADING` stays up) |
| boss entry (code 16 + region 10), mid-level — **spike MEASURED: 28 sectors (code 16 + region 12), 107 host frames (2.1 s), EMULATOR, every entry** | — | 98 (2.0 s) behind the `WARNING` banner (**107**; **S3 MEASURED: 28 sectors, 108 host frames, 2.2 s**, behind `WARNING - BOSS APPROACHING`) | 0.7 s | 3.9 s (**~4.3 s**) |
| return to the menu | 0 | 0 (the frontend stays resident) | 0 | 0 |

### 6.5 Cycles and DMA, by row family

| Row family | Today | After M5 | Basis |
| --- | ---: | ---: | --- |
| binding ELITE row (fence margin) | 1,439 | ~1,349 (the vectored calls ~30 and the shots scan 60 — IC); DMA-on ~31,223, over the 31,200 target by ~23, under the hard gate — **S3 MEASURED 1,370** (S2 1,378; the Light kernel 128 B higher); **DMA-on 31,237** | §4.1, §4.8.2 (Q13), §5.12 |
| capital frames (no fence; maximum 30,568) | 30,568 | ~30,630 (+3 per vectored call, ~20 per frame) | IC |
| boss frames, worst with one Light, scroll stopped (decided, Q1) | — | **1,178 over GO**; DMA-on ~30,330 — **spike MEASURED: worst fence margin 10,103 over 58,181 boss frames (0 misses), ~6,500 composed worst (ESTIMATE); DMA-on 29,219**; **S3 MEASURED (no lasers): 16,089 over 11,171 boss frames, DMA-on 28,008; native work 2,760 worst** | §5.4, §5.11.2, §5.12 |
| boss frames, worst with one Light, scroll kept (not taken) | — | −367 (under GO); DMA-on ~31,860 | §5.4 |
| DLIs per frame | 2 | 2; **3 in a boss sector** (**S3 MEASURED: 3, gated by the harness; 0 sequence violations**) | decision 9 |

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
| 16 | **High-score table on disk with initials; silent skip when write-protected** | the save mechanism and the record: **M5a-S2 with the per-level best (§4.8.4)**; the initials entry: **M4** | SIO write primitive in the reader 70 → 84 (§2.7); the scores sector read at the first menu entry 20 → 24 (reader); initials entry (3 letters by stick) 150 → 180 — `CODE` is full, so the window; TOP SCORES rows with initials +40 → 48 (window, called through the frontend draw); RAM: 10 × 3 B initials 30 B (`$4FFA-$4FFF` holds 6; the rest in `ENTITY_STATE`) | resident; 1 disk sector | 1 | 0 in gameplay | +1 sector at the first menu entry (~4 frames); the write after a qualifying game over (~1 s on a real drive) | a write-protected ATR or disk answers `ERROR`/NAK: the skip is "any non-COMPLETE"; **the harness mounts `dist/` — a write during a trace session would change the shipped ATR's bytes and break the evidence binding**, so the harness must mount a copy (or `-readonly`) before this lands; a shared disk image carries its finder's scores (the owner's parked concern, now accepted) | **do** (must-have); the harness mount change is the prerequisite |
| 17 | **Digitised speech on the transition screen** | later, after the hangar; **M6** at the earliest | player 40 → 48 B (reader or the hangar overlay); the sample in transition-time scratch RAM: PMG pages `$3B00-$3FFF` 1,280 B + the gameplay charset `$4400-$47FF` 1,024 B + the hull maps `$4C00-$4E3F` 576 B (all rebuilt by `start_gameplay`) = **2,880 B in three pieces**; at 4-bit 7.8 kHz that is 0.74 s; 5.2 kHz gives 1.1 s | disk, read at every level start | **12 (0.6 s at 5.2 kHz) … 23 (2,880 B)**; a 2-s clip at 7.8 kHz is 61 sectors and does not fit RAM | 0 in gameplay; the CPU is the player's during playback | **+0.9 s (12) … +1.7 s (23) per level at standard speed, ×2 on a 1050**, to hear 0.6–1.1 s of 4-bit speech; the sample cannot play while the level reads (channels 3+4 are the clock) | intelligibility of 4-bit volume-only at ≤ 7.8 kHz is "recognisable 1980s"; the load it adds is longer than the clip | **dropped for 1.0 (owner, Q8)**; a single sample at campaign start may be reconsidered in M9 if time allows; nothing is budgeted |
| 18 | **Loading screen with a hangar** — **absorbed by the level-summary screen (§4.8): the region background is the hangar picture** | **M5a-S2** | reader: a bitmap band (ANTIC E, 40 × 48 lines = 1,920 B, or ANTIC 4 with 64 custom glyphs = 240 + 512 B) read into the PMG pages / charset scratch before the level, the loader display list gaining the band (40 → 48 B); the AI texts move into the same overlay (−304 B resident, +80 → 96 B of band-and-text install) | overlay (slot: transition scratch), disk | 10 (ANTIC 4 form) … 16 (ANTIC E) | 0 | +38 … +60 frames per level start (0.8 … 1.2 s), ×2 on a 1050 | the band is on screen while the wire runs: ANTIC E's DMA takes ~35 % of a line, inside the receive loop's margin at every speed (§2.9); drawing is owner art | **do** (must-have); ANTIC 4 form recommended (10 sectors, reuses the frontend charset path) |
| 19 | **Capital hulls take damage where hit — both hulls** | later: **M7** (after the capital overlay exists) or **M8** | in **slot A** (0 window): after `restore_capital_explosion` the cell gets a damage glyph instead of its backing when the backing is a hull cell, 40 → 48; player-shot-versus-enemy-hull (today shots do not collide with hull cells beyond the prow) 60 → 72; 2 damage glyphs (16 B) in the free hostile-weapon codes 93–98 | overlay | 0 | **+150 … +200 on capital frames** for the shot-versus-hull test (five shots × ~35, IC) — capital frames have no fence and 2,000 to the hard gate | 0 | the mark scrolls away with the row (free: the ring row is recycled); the allied hull's marks from enemy shells are the existing impact path | **do later** (M7/M8): cheap once slot A exists |
| 20 | **Variable protruding nacelles narrowing the corridor (4.8a)** | **M7**, with the hull sets | slot A: per-row corridor extent read by the player clamp and the hull contact (`player_inside_universal_hull_corridor` assumes a fixed width) 150 → 180; a 27 × 2 B extent table 54 B (`ENTITY_STATE` is short: the window's RAM or zero page); the `hull_params` block (32 B, reserved in the payload page) becomes data; +1 B per map row in the hull block (104 B of pad there) | overlay + data | 0 | +40 … +80 on capital frames | 0 | fairness: the scroll squeezing the player (River Raid kills; here hull contact damages, 10 → 8); the hull row generator and the collision read the same table or they disagree | **later** (M7); it is 4.8a itself; the open "geometry 4.8a" item in budget §5.2 (13) gets this price |
| 21 | **Capital colours change every 4 levels, aligned with the laser tiers** | **M7** (data) | **0 B**: the allied steel is level data since hull step 2, the enemy style since step 2; the build's mapping (`alliedColpf1ForLevel`, `hullStyleIdForLevel`, `scripts/build.mjs:331-339`) changes | data | 0 | 0 | 0 | the enemy hull's colour is `COLPF3`, shared with every hostile accent — a per-tier *enemy* colour recolours shots and Interceptor pods; the allied steel and the enemy *style* per tier are free of that; **it supersedes AC's "regions of three" and the 1–6 / 7–12 steel split**, and with 4-level tiers over twelve levels the fourth enemy style is never used | **do** — decided (Q5): steel and lasers on 4-level tiers, the hull style per 3-level region, the enemy colour unchanged |
| 22 | **A booster that lasts until the player loses a life** | **M6** | 15 → 30 B: the timed boosters' countdown skipped for the "life-long" kind (`weapon_pickup_rapid_tick`'s family in `PICKUP_CODE`, 65-B tail; or as a data value: a timer sentinel) ; the HUD label as today | resident (`PICKUP_CODE`; record 2 +1 sector) | 1 transport | 0 (a Spread held for a life makes the heaviest family the common case; the pool bounds it, no new worst row) | 0 | balance: feel, M8 | **do** (M6, with K1) |
| 23 | **Damaged Bombers** | **M3-H session 2** | — | — | — | — | — | — | **confirmed covered**: m3-waves-heavy §3.4 "the look and the damaged look — one mechanism" and §7 session 2 `feat/heavy-looks` (variant C); nothing to add |
| 24 | **A varied starfield per sector: density, speed, layers** | **M7** (data) with ~50 B of code before the freeze | density: a per-sector mask read by `generate_starfield_row` 20 → 24; speed: the near-star phase step per sector 15 → 18; 1 B per SectorDef (the core page has room); home: the window (the `BROADSIDE` pins are M3's) 50 → 60; **layers: the far layer was retired for its rotate-frame cost** (codes 2–6 are allocated, `farLayer` disabled) | resident + data | 0 | density/speed: +10 on rotate frames; a far layer: **+100 … +300 on rotate frames**, the binding family | 0 | — | **do** density and speed; **drop** layers (and the nebula stays rejected) |
| 25 | **Screen shake and flashes when the player is destroyed** | **M5b S5**, as one mechanism with the boss death | the shake routine is resident (window, 40 → 48 — already in M5b's hooks); the player-death trigger 10 → 12 in `update_player_death`'s path (`BROADSIDE`, 3 B free → via the window) | resident | 0 | +15 per frame for 24 frames | 0 | the HUD moves with the playfield (the blank-line count is above the HUD line) — the owner may prefer the playfield alone, which needs the shake on the divider instead (+8 B) | **do** (M5b) — **covered by the flash only (Q-S5, 2026-10-04)**: the spike found no blank-line header to toggle (§5.11.4 item 3), so the player's death keeps its existing `COLBK` flash and gets no shake; the boss win shakes its band (overlay, 0 resident B) |

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
| **M5a-S1** — **implemented 2026-10-03, `OWNER-SMOKE CANDIDATE`; as built §4.9** | `feat/overlay-slot` | §4.1–4.2: `BROADSIDE` regrouped, slot A bounded, the 20-entry table in the window, the reader's run read + directory + boss-resident flag + table copy, the build's overlay runs from sector 512 and the capital restore run, the AI pool 8 → 4 (Q3) | −72 | reader −136 +152; `BROADSIDE` 0; initial block ±8 (G) | window record 9 → 10 (+1 sector, +2 frames); disk +16 | binding row ~−30 (vectored calls); capital ~+60 | 0 | 0 (no read is added until a boss exists) | initial block > 13,652; worst fence < 1,400; a `BROADSIDE` label the harness or a test pins moves without its pin being re-pointed in the same commit; the restore run ≠ the resident bytes | §4.7; the binding replay's cycles proven on both builds (page crossings); boot smoke 8/8 | play level 1 through its capital sector: nothing visible changes; the loader screen with four lines |
| **M5a-S2** — **implemented 2026-10-03, `OWNER-SMOKE CANDIDATE`; as built §4.10** | `feat/level-summary` | §4.8: the summary screen replacing the loader screen (code in `$0500`, art per region read first, labels and the AI texts to disk), the stat counters and their hooks (the shots scan in the window, Q13; debris as three hits, Q14), the grade, the save record with the direct-SIO write under Q16's rules and the per-level best, the tail-first level read with the music tick in the wait loop, the 3-s minimum / FIRE interlock (Q15), the START GAME form (Q17); the harness mounts a copy of the ATR | −92 | reader −156 +304; `PICKUP_CODE` +16; `HYBRID_C_EXT` +12; `$0500` −480; zero page −24; initial block 0 | records 2 and 5 +1 sector each (+4 frames); disk +33 | **+60 on every frame** (the shots scan; binding row ~1,349 with S1, DMA-on ~31,223); kill / hit events +15 each | 0 | START GAME 49 → 94 frames behind the screen; the post-boss transition 139 (§4.8.6 b) | any stat byte in the initial block; a scan over 70 native cycles; the fence under 1,300 on the binding row; the music audibly stalls during a read (owner smoke); a write reaching `dist/` in any harness run; the `$0500` code over 512 B without the grade moved to the window | build: the record format and the art runs pinned; 6502: BCD counters, the ratio and grade on fixture stats, the write primitive's ACK/COMPLETE/NAK paths, the tail-first order; native: a replay through a level's end reaching the summary with the expected stats (the kill and shot counts cross-checked against the trace's own counters), the record written to the copy and read back next session; PAL audit unmoved on fighter rows | the screen on a PAL CRT: stats readable, the picture after ~0.5 s, the music through the load, `PRESS FIRE` after the minimum; a write-protected SIO2SD image: `BEST` still shows, no error; **the real drive: the wall-clock transition time (decides the optional fast loader)** |
| **M5b-S3** — **implemented 2026-10-04, `OWNER-SMOKE CANDIDATE`; as built §5.12** | `feat/boss-band` | §5.1–5.3, §5.6 without lasers: `BOSS_DUE`, the transition and its read, slot B, the band builder, HSCROL motion, the third DLI, region 1's data, module draw/damage, shot-versus-module, the controller's phases (guns → core), the chain explosion, bonus, the hand-off to the summary screen (→ menu until M4), the restore behind the summary; `light[3]` 0 → 1; harness: third DLI, boss milestone, `director-complete-*` through the boss | −48 (**spike: −125**, `HYBRID_C_SECTOR` −14; **~−157 with decision 32**, §5.11.7) | slot A ~1,250 B of code (**spike: ~1,350**, + a 859-B staging run); slot B 610 (**704**); `ENTITY_STATE` −10 (**0**) | disk +16 +10 (**+28**); transport 0 (**+2 extension sectors**) | boss frames per §5.4 less lasers: worst with one Light **~1,640** (scroll stopped) (**spike: ≥ 12,000 MEASURED**) | boss frames ~30,000 (**≤ 29,219**) | boss entry 98 frames (**107**, behind the `WARNING - BOSS APPROACHING` screen with the theme, decision 32); post-boss START GAME +60; **in scope (2026-10-04): the install run (Q-S1), the reader-address build check (Q-S3), the full restore in the summary module, ~40 B (Q-S4), the shared install run (Q-S6), the 3,500-native pin** | a boss frame under 500 in the audit; DMA-on over 32,568; the restore byte compare fails; the band map crosses a 4 KB boundary | §5.10 less the laser items | a full level 1 to the boss and the clear on hardware; the `WARNING - BOSS APPROACHING` screen and the theme starting under it (decision 32); a GAME OVER inside the boss sector, then START GAME: the world scrolls and nothing of the boss is left (Q-S4); the band's motion and the palette seam; **a second game after the clear: the capital sector renders** (the restore) |
| **M5b-S4** | `feat/boss-lasers` | §5.5, §5.8: lasers 1 / 2 / 4, the laser damage source, the boss win's band shake (**the player's death keeps its flash only, Q-S5**), ~~the boss theme copy (item 14)~~ (**moved to S3 by decision 32**), the laser contact session replacing the recorded one (Q4), the missile-plane clause exception | −48 (**spike: 0** beyond S3's; **no player-death shake, Q-S5**) | slot A +~500 B (**spike: +~480 + ~100 owed: ~1,930 of 2,048**) | disk 0 (inside the 16 + 10) | §5.4 in full: worst **1,238** (scroll stopped) (**spike: 10,103 MEASURED, ~6,500 composed**) | ~30,270 (**29,219**) | 0 | fence < 500 on any boss frame; the laser session not passing on the default ATR; `missile_plane_rows` residue outside the boss sector | §5.8's clauses; `boss-escort`; cycle pins | the warning readable at ~0.5 s; the beam's hit and its sound; the chain explosion and the band shake on a CRT; the player's death flash unchanged (no shake, Q-S5) |
| **M5b-S5** | `feat/boss-regions` | regions 2–4's art and data from the concepts, the M8 tuning layout, level 2's boss through the debug route, release prep for `v0.3.0` (hardware checklist, README EN + PL) | 0 | 0 | disk +30 (**spike: +27**, 9 a region with the shared install run, **decided Q-S6**) | 0 | 0 | 0 | a region run > 10 sectors (**> 9**) | build pins; the four regions through `--level=N` review builds | each region's boss on hardware through a review ATR; level 1's through the default |

| **S6** (optional, later) | `feat/fast-sio` | §4.3: `$3F` negotiation, divisor, fallback; `hardware-testing.md` §11 extended; the music tick paused during data frames | 0 | reader −100 (the 4-line AI stub, 152 B, goes) | 0 / 0 / 0 | 0 | 0 | ÷3 on SIO2SD (est.) | the standard path's bytes on the wire change; boot smoke < 8/8; the fallback test fails | §4.7's harness tests; the emulator path per `sio.c` | SIO2SD fast / disabled / off mid-read; the real drive (Q10); a marginal cable. **Built only if S2's real-drive transition exceeds the minimum display by more than ~2 s** |

**After M5b-S5: `v0.3.0`** — the owner's release checklist
(`hardware-testing.md` §1–§11 plus the S2 and S3 items) on the default ATR.

**Projected figures at the end of M5** (budgeted; **the spike's measured replacements in §5.11**: window 1,319, transport 107 / 104 / 211, worst boss row 10,103 with DMA-on 29,219): window **1,220** free;
initial block 23 … 31 B to STOP; transport 107 / 105 / 212, ATR menu ~553;
worst fighter-row fence margin ~1,349 with DMA-on ~31,223 (over the 31,200
target by ~23, under the hard gate); worst boss-row margin 1,178 (scroll
stopped) with DMA-on ~30,330; DLIs 2 (3 in a boss sector); recorded clause
failures 1 → 0 (the laser session replaces the shell one); free disk 319 −
105 = 214 sectors after twelve levels (210 with the attract stream).

---

## 9. Owner questions

**All answered on 2026-10-03 — §1.4 has the answers; the table below is kept
as the record of what was asked and recommended.** Q13 was answered against
the recommendation.

| # | Question | Recommended answer | Cost of the recommendation | The alternative and its cost |
| ---: | --- | --- | --- | --- |
| **Q1** | Does the world scroll stop in the boss sector? | **Yes** — the ring does not rotate; stars drift by their fine phase and hold | 0 B; every boss frame gains ~1,545; the worst one-Light frame ends 1,238 over GO and under the 31,200 target | scroll kept: the one-Light break-up frame ends −307 (4 lasers) … −7 (1 laser); needs the pool lever (574–729, visible) or no Light at all or a 6-row band and 1 laser only |
| **Q2** | Band height: 8 rows (64 scanlines) or 6? | **8**, falling to 6 if S4's audit shows a boss frame under 500 | 720 of margin per boss frame (M) | 6 rows: 540; the boss art loses a quarter of its height |
| **Q3** | Where do the reader's 136 B for S1 come from, before S2 moves the texts to disk? | **The AI line pool 8 → 4 lines** (+152 B; the format stays decision O's); S2 then moves every text to the summary art run and returns the rest | the loader shows one of four placeholders between S1 and S2 | (b) `LEVEL_BUFFER` 16 → 15 with the buffer moved to `$A680` and every level address re-linked (risk 3; +128 B); (c) the overlay logic in the window and the reader kept: window −200 → −240 |
| **Q4** | The recorded `lower-playfield-hostile-contact-atr-hard` once the laser session passes | **Retire it by name** into the recorded file's removed block, with F5/F6 kept as its epitaph | 0 | keep both: the recorded set carries a scenario the game cannot contain, forever |
| **Q5** | Item 21: do 4-level tiers replace AC's regions of three for the hull **style** too, or only for the allied steel and the lasers? | **Steel and lasers by 4-level tier; the enemy hull style stays per 3-level region** (all four styles used, as AC wants); the enemy *colour* does not change (it is `COLPF3`) | 0 B, a build mapping | style by 4-level tier: the fourth style is never seen in twelve levels; enemy colour per tier: every hostile accent recolours |
| **Q6** | Restore variant (a) or (b)? | **(b)**: the capital group stays in record 1; only the slot is restored after a boss | +60 frames at START GAME after a boss | (a): +113 frames at every START GAME, −50 at boot |
| **Q7** | The frontend overlay (2,180 packed B of initial block returned, risk 4) — in M5a as an optional session, or deferred? | **Deferred**; revisit if the initial block binds before M6 | 0 | S4-optional: 2–3 sessions of layout work; the menu re-read at every return (1.7 s EMULATOR) |
| **Q8** | Speech (item 17) | **Drop** for 1.0; at most one word ≤ 12 sectors after the fast loader | 0 | 12 … 23 sectors per level start (+0.9 … 1.7 s), a 40-B player, and 4-bit speech |
| **Q9** | ~~The hangar: M5a S3 or M4?~~ | **answered by decision 26**: the region background of the summary screen is the hangar; M5a-S2 | — | — |
| **Q10** | Which real drive does the owner smoke the loader with? | the answer sets S2's scope: a **stock 1050** proves the fallback only; a **CA-2001** or a US-Doubler/Happy/Speedy 1050 proves the fast path on real electronics; an **XF551** needs the XF551 mode (+30 → 36 B) | — | — |
| **Q11** | The reserved reader vector `$A006` (`sector_reader_drain_ready`, "reserved for 4.9") becomes the run-read entry and the drain vector moves to `$A009` | **Yes** — nothing binds `$A006` today (grep: only the reader's own table) | 0 | a fourth vector at `$A009` for the run read and `$A006` kept idle: +3 B |
| **Q12** | `LEVEL_BUFFER` stays 16 (slot B needs the spare sectors); the window levers for M6 are the `STARFIELD` tail first, then 16 → 15; the splash RAM is the summary code's home, not a lever | **Yes** | 0 now | 16 → 14 now: slot B shrinks to the hull block (384 B): a 48-B-wide band (8 cells of travel) and no room for the tables |
| **Q13** | The **shots-fired** counter: (a) 6 → 9 B in `CODE` at `allocate_player_fighter_projectile_at_slot` — the one stat whose only event site is in the initial block — or (b) a per-frame slot scan in the window | **(a)**: 9 of the 31 B to STOP, no cycle on any frame but a shot's; (b) spends 60 cycles on every frame of the game, the binding row included, to save 9 initial-block bytes | 9 B of initial block (14 … 22 left after S1's drift) | (b): window 48 B, −60 on every row (1,439 → ~1,380) |
| **Q14** | The **debris hits**: `entity_debris_hit` is in `ENTITY_CODE`; count a destroyed debris as three hits in `debris_shot_reward` (`PICKUP_CODE`) instead? | **Yes** — 0 initial-block bytes; a debris that scrolls off after one or two hits loses them (accuracy reads slightly low on debris-heavy levels) | 0 | 6 → 9 B of `ENTITY_CODE` for exact counting |
| **Q15** | The summary's minimum display time | **3 s (150 frames)**: covers the emulator and SIO2SD transitions (2.8 s), readable for six lines; a 1050-class drive keeps `LOADING` up ~2.6 s longer | 0 | 2 s: the picture and the stats flash by on fast media; 4 s: a wait on every medium |
| **Q16** | Personal best (item 29) with the summary session, or later? | **With it** (M5a-S2): the write primitive is reader work the session is inside; `BEST` shows from day one; the initials entry waits for M4 | reader 84 B, 1 sector, the harness mount change | later: the summary shows `BEST --` until M4, and M4 grows by the write primitive |
| **Q17** | At START GAME from the menu there is no finished level: the summary shows the region look, `ENGAGING SECTOR N`, the level's best grade and score, and an empty stats panel? | **Yes** — one screen, one code path | 0 | a separate plain loading screen: +60 B of reader for two screens |

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
