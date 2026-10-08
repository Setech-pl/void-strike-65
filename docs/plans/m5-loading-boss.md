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

**Boss redesign planned 2026-10-04** on `docs/plan-m5-boss-combat`
(`OWNER REVIEW CANDIDATE`, planning only, no artifact byte changed): after the
owner's smoke of S3 found the fight weak, the layered fight of
[../boss-concepts.md](../boss-concepts.md) and the core boss as a second style,
both from one engine as data — owner decisions A–G (§1.6), the design, the data
format and art route, the probe measurements, the price against every
resource, the sessions **S4a-i / S4a-ii / S4b / S5** replacing S4/S5, and
owner questions Q-B1–Q-B8: **§5.13**. The binding finding: slot A cannot grow
and cannot hold the layered engine with the lasers, so the C controller moves
to a **slot C in low RAM** (`$0C00-$18FF`, with a region charset of its own).

**M5b-S4a-i implemented 2026-10-04** on `feat/boss-engine`,
`OWNER-SMOKE CANDIDATE` pending the owner's smoke: the owner's answers Q-B1–Q-B8
(§1.6), the `$0C00-$18FF` claim (the region charset, slot C, the scratch page),
the v2 art pipeline from PNG drafts with `npm run boss:preview`, the layered
engine (16 modules, cover masks, exposure, four stages, tier slots, the defeat
on the last weapon, the HP scale, the fire countdown), region 1 rebuilt as
style 2 with agent-drawn placeholder art. As built, with every figure MEASURED
and the deviations: §5.14.

**The fortress session implemented 2026-10-05** on `feat/boss-fortress-r1`,
`OWNER-SMOKE CANDIDATE`: owner decisions H–K (§1.6) after the S4a-i smoke —
region 1 becomes the layered fortress Blockade Breaker (the core boss kept as
a fixture), every hit reads (spark, flash, tick, holes, high-contrast stages),
the boss fires (pulse and salvo through the hostile pool), nozzles at both
ends, S4a-ii's scope included. Design and owner answers §5.15.1–5.15.6; as
built §5.15.7.

**M5b-S4b implemented 2026-10-06/07** on `feat/boss-lasers`,
`OWNER-SMOKE CANDIDATE` pending the owner's smoke (S4b.5, ATR `bd5c5c2d…`):

* **The lasers:** emitters only (D1), 1 / 2 / 4 by tier; per-difficulty
  warning and reload in each level's `bossDef`, so per-level cadence is data
  (M8). At most two lasers at once (D3).
* **The first shot:** an emitter warns on the frame after its shield falls,
  at the front of the queue.
* **The beam:** missiles M1 / M2 in COLPM1 / COLPM2 `$46` (B2, which reverses
  Q1's option A), slot D at `$1900`.
* **The emitter:** the projector tower (`emitter.png`), 3 × 3 at columns
  31–33, rows 1–3; only its lens has damage stages. Its durability is ×2.
* **The fight:** decision I's MEDIUM target is 90–120 s since 2026-10-07
  (it was 45–60 s), reached in data (every plate and cannon ×2); MEASURED
  81.3 / 101.8 / 130.5 s on EASY / MEDIUM / HARD.
* **The boss's shots:** born at the muzzle and riding the band (QA1).
* **AUD-03 / AUD-04:** `CLD` in the boss DLI; at most two player shots meeting
  the boss a frame.
* **Level 1 (W1):** one Raider + Wingman wave and one Bomber wave between the
  capital and the boss.
* **E4:** region 1's look table is linked first in slot D, out of the charset
  area.
* **S4b.5 (owner decisions of 2026-10-07):**
  * the warning line flickers in its own colour and widens 1 → 2 → 4 clocks
    (variant (a); the ramp removed);
  * no band flash at all;
  * every third destroyed module drops a capsule, never the defeating kill;
  * **slot E** `$4C00–$4E3F` (576 B) is read at the boss entry over the
    expanded hull maps, for the boss sector only. It holds 102 B (474 free,
    1 sector).
  * Slot D: 1,773 B (19 B left).
  * Slot E's contract is held by the trace in every replay: no reader of the
    maps between a boss entry and the next rebuild. The pause, the last death
    and RESET in the boss sector are among the replays.

**S5 requirements (owner decisions of 2026-10-07):**

* **A home per region for the look table.** Slot D is shared by every region,
  so only one region's table fits there; the build refuses a second region
  until each table has its own home. `$1900–$1FFF` has 9 B left since
  fix/smoke-2026-10-07 (19 since S4b.5); slot E (310 B free since that fix,
  474 before) is the candidate home.
* **The boss entry's load (owner decision 5 of 2026-10-07, S4b.5).**
  * The evidence test bounds the entry at under 250 host frames
    (`tests/runtime-wall-trace.test.mjs`, `boss_entry_host_frames < 250`).
  * The load was 248 of the 250 on the S4b.5 variant builds (65 sectors). The
    chosen build reads 64 sectors in 245 host frames (`main`: 49 sectors,
    188 frames).
  * S5 must keep the boss entry within the bound, or bring the bound to the
    owner with the measured basis.
  * No bytes move from slot E to slot D to save a sector.
* **A second phase.** A 90–120 s fight needs one: the finale volleys of
  decision B.
* **P1 / P2 stay free** for the force field (§15.3 of the lasers plan).
* **The boss-sector work budget (owner decision of 2026-10-08, after
  fix/smoke-2026-10-07).** The native boss stress reads **8,434 of the 8,500**
  in its unproven three-to-five-meeting cases (the laser fixture; reachable
  worst 7,732): **about 66 cycles left**. fix/smoke-2026-10-07's P1 moved the
  in-band shot drawing to SECTOR_COMPLETION and draws the shots the AUD-04 cap
  holds (§5.16.9). S5 must keep its additions out of the boss frame's worst
  case, or bring the owner a limit change with the measured fence margin.

The plan, the decisions and as built: [boss-lasers.md](boss-lasers.md)
§12–§18. The S4b row of §8 stays the plan's.

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

### 1.6 Taken on 2026-10-04 — the boss redesign (planned in §5.13)

The owner's decisions after smoking M5b-S3; recorded here, designed and priced
in §5.13. Decision 7 (§1.2) is superseded as the only form: it lives on as
style 2 under F.

| # | Decision | Applied in |
| ---: | --- | --- |
| **A** | **The layered fight** follows [../boss-concepts.md](../boss-concepts.md): destructible modules in 2–4 layers; outer modules shield inner ones; a gun in a deeper layer cannot fire until the module in front of it is destroyed; destroying a cover exposes both a new target and a new threat; placement is irregular. The boss is defeated when its **last weapon module** is destroyed; clearing the remaining armour is not required | §5.13.2 items 1–3, 8 |
| **B** | **Weapons**: beam emitters are the lasers and their count follows the laser tiers (1 / 2 / 4 on levels 1–4 / 5–8 / 9–12, decision 8 stays; a layout carries emitter *slots* the tier enables or turns into armour); pulse cannons fire ordinary shots from the existing hostile pool; salvo launchers (the final boss) fire a burst of ordinary shots | §5.13.2 items 6–7 |
| **C** | **Hits must read on screen**: a spark drawn in the struck module's cell inside the band (shots do not enter the band; the spark does); damage stages per module shown by glyph changes (intact, cracked, broken, gone); a one-frame band flash and a short hit sound distinct from the destruction sound. **No boss health bar**: the falling modules are the progress | §5.13.2 items 4–5 |
| **D** | **Engine nozzles at both ends** of the boss, animated like the capital ships' engine banks, instead of the identical vertical caps | §5.13.2 item 9 |
| **E** | **Four regional bosses.** Confirmed starting mapping: R1 Blockade Breaker (2 layers, pulse cannons plus the tier's emitters), R2 Siege Spine (3), R3 a Siege Spine variant with its own art and layout (3), R4 Void Citadel (4, the final boss, with salvo launchers) — compared with the alternative in **Q-B1** | §5.13.8 |
| **F** | **Two boss styles from one fight engine, as data.** Style 1 the layered fortress of A; style 2 the core boss as built in S3: a core module that is the last weapon module, hidden behind a **cover group** of guns and exposed only when every module of the group is destroyed. The cover rule is generalised so a module can be covered by a group, not only by the one in front; both styles share the hit feedback, damage stages, nozzles, lasers and win sequence | §5.13.2 items 2, 12; §5.13.3 |
| **G** | **The agent draws the placeholder art; the owner changes it afterwards** (answer given during the planning session, 2026-10-04) | §5.13.4, Q-B2 |

**The owner's answers to the redesign's questions (2026-10-04, before M5b-S4a-i).**
Every question of §5.13.8 is answered; decision G stands. Q-B1 is the
recommendation (the alternative mapping), so decision E's confirmed mapping is
superseded by it; the others are the recommendations as written.

| # | Answer | Applied in |
| ---: | --- | --- |
| **Q-B1** | **R1 is the S3 core boss rebuilt as style 2** (the teaching boss); **R2 Blockade Breaker, R3 Siege Spine, R4 Void Citadel** (style 1). The Siege Spine variant of decision E is no longer needed | S4a-i (region 1), S5 (regions 2–4) |
| **Q-B2** | **The art is authored as PNG drafts** (2:1 pixels, five fixed colours) **with `modules.json`**, as §5.13.4 describes | S4a-i converter v2; S5 |
| **Q-B3** | **Hit points: armour 6, pulse 8, emitter 10, salvo 10, core 24**, with a **per-difficulty scale in `boss_def`**; tuned in M8 | S4a-i |
| **Q-B4** | **The hit sound is a 2-frame tick on channel 3** (built in S4a-ii) | S4a-ii |
| **Q-B5** | **Yes — the boss claims `$0C00-$18FF`** (charset, slot C, scratch); about 1.8 KB of `$1900-$1FFF` stays unclaimed | S4a-i |
| **Q-B6** | **The boss's per-frame work limit becomes 7,000 native cycles** (was 3,500, correction 9) | S4a-i on; §5.10 |
| **Q-B7** | **Hits absorbed by a covered module, or by armour that takes no damage, do not count as hits for accuracy** | S4a-i (the absorb path), S4a-ii (the spark and tick) |
| **Q-B8** | **Accept the longer boss entry, with every run sized to its contents**; the owner measures it on the CA drive, and if it clearly exceeds about 8 s the optional fast loader (S6) is reconsidered | S4a-i |

**The owner's decisions after smoking M5b-S4a-i (2026-10-04, before
`feat/boss-fortress-r1`).** The smoke (emulator recording, MEDIUM): the fight
took 26 s with 6 kills, 0 lives lost and grade A — the boss never fires; the
long hull (about 90 % of the band, one repeated panel motif) reacts to nothing,
so "the boss is not destructible"; a destroyed module leaves a dithered red and
grey pattern that reads as noise, not as a hole; shots vanish at the band's edge
and the cracked and broken stages are small and low in contrast; only one end
shows nozzles. Designed and built in §5.15; S4a-ii's scope (§5.13.7: the ring,
the flash, the tick, the spawn, the nozzles) is taken into the same session.

| # | Decision | Applied in |
| ---: | --- | --- |
| **H** | **Region 1's boss becomes the layered fortress Blockade Breaker** (style 1, [../boss-concepts.md](../boss-concepts.md)): two layers; **armour plates make up the hull itself**, so the hull the player sees is destructible in pieces; **pulse cannons sit recessed behind the plates** and open fire once their cover falls; the tier's emitter slot (1 on levels 1–4) is placed now and **becomes capped armour until the lasers (S4b) exist**; the boss is defeated when its last weapon module falls; leftover armour is not required. Placement is irregular, with varied gaps and depths, no repeating pattern. **Supersedes Q-B1's region-1 entry.** The core boss (style 2) stays in the engine and moves to a later region, decided at S5; its fixture and tests stay | §5.15 |
| **I** | **The fight must threaten**: the boss fires from its first exposed weapons, and on MEDIUM the fight lasts **about 45–60 s with the bot** (decision 11), tuned through module HP and fire data, not code | §5.15 |
| **J** | **Every hit reads on screen**: a spark in the struck cell; a damage stage clearly visible at a glance (high contrast); a one-frame band flash on damaging hits; a short hit tick; a destroyed module leaves a **readable dark hole or scorched opening with a lit edge**, never a dithered pattern | §5.15 |
| **K** | **The hull art has no repeated panel motif; engine nozzles at both ends, animated** | §5.15 |

**The owner's decision after smoking the fortress (2026-10-05, before merge).**
The smoke: the fight is good; but a destroyed module left a black interior
outlined by a glowing orange rim, and since the plates reach 3–4 rows below the
hull line every destroyed plate left a tall empty frame hanging under the hull,
whose rims crossed and hid the cannons they had just exposed.

| # | Decision | Applied in |
| ---: | --- | --- |
| **L** | **A destroyed module disappears** (supersedes the "lit edge" part of decision J): its cells **below the hull's silhouette become empty band background**; its cells **inside the hull become a plain dark cavity**, no rim or outline. No outline is drawn around any destroyed module, and nothing a destroyed module leaves may overlap or frame a neighbouring module. **A cannon exposed by a fallen plate must be fully visible** | §5.15.8 |

**The owner's decision after smoking the merged fortress (2026-10-05, before
`fix/boss-readability`).** The smoke (emulator recording): the player's shots
vanish well below the boss (the 8-row band is never drawn into, and with the
plates gone the hull is about 3 rows tall, so a shot disappears about 5 rows
under it, in empty space); artifacts appear when a player shot hits in the boss
fight (and were seen earlier in the capital sector when an allied shot meets an
enemy shot); after the plates fall, hull art stays below the hull line - grey
X-braced girders hanging to the band's bottom, the open bay's thin red dotted
wall strips, small hull pieces - and the girders stop shots (hull art counts as
armour in the column map), so a shot fired at a visible cannon dies in empty
space; one cannon looked not fully uncovered after its plate fell.

| # | Decision | Applied in |
| ---: | --- | --- |
| **M** | **The stripped skeleton stays but does not block.** Hull art below the hull line (the X-braced girders) is **shortened to the hull line plus one or two rows** and is **transparent to the player's shots**; the open bay's **red dotted wall strips are removed**; small hull pieces inside the hull rows may stay. **In the column map, hull art below the hull line is OPEN; only modules and the hull's own rows stop a shot.** Whatever stops a shot must be visible as solid at that cell | §5.16 |

**The owner's answers to §5.16's Phase A (2026-10-05).** Two of them refine
decision M and are recorded here as decisions:

| # | Decision | Applied in |
| ---: | --- | --- |
| **M1** | **WITHDRAWN by decision O (2026-10-05).** ~~**A thin hull strip directly under a cannon is see-through for the player's shots** (an exception to decision M, kept to those strips): a shot passes behind it and hits the cannon above while the cannon stands. Nothing else in the hull's own rows is see-through~~ | §5.16.5, §5.16.8 |
| **M2** | **The opaque player-shot cell over a broadside shell in the capital sector is known and accepted**: for one or two frames the shot's cell replaces half the shell; no resident byte is spent on it | §5.16.1, §5.16.5 |

**The owner's decision after smoking `fix/boss-readability` (2026-10-05, before
merge).** Shots up to the boss, the girders and the artifact fix are good. Two
findings, both on the boss's left: the first cannon from the left takes damage
and dies while the plates beside it stand (the open-bay cannon over a gap too
narrow to read as an opening - the player reads the neighbouring plates as its
cover); the two plates at the far left by the nozzles survived the whole fight
although the owner's shots reached them (to be checked, not assumed).

| # | Decision | Applied in |
| ---: | --- | --- |
| **N** | **Readability rule for cover.** A weapon takes damage only when the player can see that nothing stands in front of it: if any module is drawn in front of any of the weapon's columns, the weapon is covered and shots into it are absorbed (grey deflection, no damage, no accuracy hit), in whichever column they arrive. A weapon meant to be open from the start must look open: no module in front of any of its columns, the opening at least as wide as the weapon, with clear space between it and the neighbouring plates so they do not read as its cover. Every armour module the player can see must be destructible by the player's shots | §5.16.7 |

**The owner's decision after the decision-N smoke (2026-10-05, before
merge).** The open bay reads better, but gun-2 still dies through something the
player sees as solid: it sits above the hull's flat lower strip, a long grey
connector under it that cannot be destroyed, and shots pass through that strip
because of M1. The same strip runs under gun-1, the emitter and gun-3, so the
problem returns for each of them once its plate falls.

| # | Decision | Applied in |
| ---: | --- | --- |
| **O** | **No hull art is drawn below any weapon** (supersedes M1, which is withdrawn). Every weapon hangs in its own recess in the hull's underside: the hull's lower strip is routed above the weapon (behind it), never under it, so from the player's side nothing but a module, or nothing at all, stands in front of a weapon's columns. The see-through rule for hull strips leaves the code and the data; **the only see-through hull art left is the girders of decision M** | §5.16.8 |

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

### 4.11 The AI line and the empty panel (fix/smoke-2026-10-07 P3, 2026-10-08)

The owner's smoke: on the loading screen the AI chatter line ran into the
statistics (at START GAME directly under BEST, scanline 195), and START GAME
showed the statistics' labels with no values. **Owner decision of 2026-10-08:**
the AI line leaves the summary screens - both display lists keep every
scanline, its row a blank line - and moves to the WARNING / BOSS APPROACHING
screen only if it fits the free bytes of the module that draws that screen
plus what the removal frees, with no boot or initial-block bytes. It does not:
the warning is drawn by `_asm_boss_enter` in the `$AE00` window, loaded at boot
by the extension, and the four lines' 168 B need a home in RAM there (the
window: +1 extension sector; the region's staging run: +1 sector at the boss
entry, 245 → ~249 of 250; the level image: a format change; the summary
module: 32 B). So it is removed, and the backlog has **"AI chatter line: find
a home"**; the four lines left the summary art runs (labels at 596, was 764)
and stay in `assets/text/loader-ai-lines.json`. At START GAME only BEST of the
panel is shown. The WARNING screen is unchanged. Summary module 1,788 → 1,760
B. The record and the captures: [smoke-2026-10-07.md](smoke-2026-10-07.md) §3.

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

### 5.13 The layered fight and the two styles (planning, 2026-10-04, `docs/plan-m5-boss-combat`, `OWNER REVIEW CANDIDATE`)

**Why.** The owner smoked S3's boss (§5.12) and found the fight weak: the
boss is not made of destructible segments; its guns do not fire; the core is
exposed after three guns with no sense of progress; the player's shots vanish
at the band's edge with no sign of a hit, so 48 hits pass with no visible
effect; both ends of the boss are the same vertical cap. The owner's concept
([../boss-concepts.md](../boss-concepts.md)) describes a layered fight, which
decision 7 of §1.2 had shortened to "2–3 destructible guns, then the core". The
owner's decisions of 2026-10-04 (§1.6, A–F) ask for the layered fight, with the
core boss kept as a second style, both from one fight engine as data. **This
section is the plan for it**: the fight, the data, the measurements, the price,
the sessions and the owner questions. Nothing here is implemented. No source,
cfg, build-script, harness, level or evidence byte changed; one probe build was
made under `build/level-1-s0/` (§5.13.5) and every edit reverted. The ATR and
the boot image are the ones `main` `d586228` ships (§5.13.9).

**Step 0 record.** `main` `d586228 docs: M5b-S3 implemented, OWNER-SMOKE
CANDIDATE - STATUS, plan §5.12 and ledgers, smoke §13`, tree clean, one
worktree (`~/Projects/dark-fighter`), §5.12 present; ATR
`8300ba01f4000b7172759783fb86241134900f2eadd17111bc9e58a41657d2a9` (92,176 B),
boot `4ba68124ed2336fa7dd7d3d1be491357d45ea41f8994a8c21cc0a3503e263b53`
(27,008 B). Branch `docs/plan-m5-boss-combat` from that commit.

**Where the brief and the repo differ** (the repo wins):

1. "Decision 3 of the pre-M5 list" is **decision 7** of §1.2 here ("Phases:
   2–3 destructible guns, then the core"); decision 3 is the window levers.
2. "The free hostile-weapon codes 93–98" (§7 item 19) are not free: **93/103
   are the Bomber shot's second phase** (`scripts/fighter-weapons.mjs`), and
   94–99 / 104–109 are "never published", not a proven free pool
   ([../architecture.md](../architecture.md) §charset). §5.13.4 does not use
   them.
3. `docs/level-authoring.md` has no boss section; the level's `boss` id is
   written (`core[7]`) and **never read**: the region comes from the level id
   (`src/hybrid/c-asm-abi.s` `_asm_boss_enter`, `src/hybrid/boss.s`
   `boss_head`). S4a-i writes the section and keeps the id as the style/variant
   selector (§5.13.4).
4. The capital engine animation (the nozzle model, decision D) lives **inside
   slot A** (`update_engine_animation` at `$71B8`), so it does not exist in a
   boss sector; the boss carries its own copy of the mechanism (§5.13.2 item 9).
5. [../game-design.md](../game-design.md) decision I gives the laser warning
   "about two seconds"; decision 8 (§1.2) and the spike built ~0.5 s. Not
   reopened here; S4b keeps decision 8.
6. **Owner answer during this session (2026-10-04): the agent draws the
   placeholder art and the owner changes it afterwards** ("agent robi grafikę
   zastępczą, ja ją potem będę zmieniał"). Recorded as decision G in §1.6; the
   art *format* is still Q-B2.

#### 5.13.1 Facts the design rests on (MEASURED from the build or the source)

| Fact | Value | Source |
| --- | --- | --- |
| slot A | `$6DE8-$75E7`, 2,048 B; **cannot grow**: `capital_slot_a_end` must stay ≤ `white_starfield_broadside_abi_pad` `$7667` (127 B away) and resident per-frame code follows (`wait_for_master_pal_frame` at `$768A`) | `src/main.s:9681-9685`, `build/void-strike-65.lbl` |
| slot A used by S3 | 1,297 B: ASM 806 + C 443 + BSS 48 | `build/boss.map` |
| low RAM | `$0C00-$1FFF` 5,120 B unclaimed, measured-free (EMULATOR, patterns `$5A`/`$A5`, BASIC on and off); `$0500-$0BFF` is the summary module's claim, pinned by tests | memory map; `diagnostics/low-ram-0700-1fff-2026-10-03.md` |
| the band's charset | codes 59–89 (31), the capital hull's; the band's DLI already sets `CHBASE` in phase 0 and could set another page; the divider row is a starfield row (codes 0–6) rendered under the band's `CHBASE` | `src/hybrid/boss.s:194-212`, install step 5 |
| hostile shots | one pool of 10 slots, 5 hostile (`$5400`); straight down, 2 scanlines a step, lifetime 96, class PULSE codes 90/100; **no (x, y) spawn routine, no C veneer** (the Light kernel fills a slot inline, `light-kernel.s:315-338`) | `src/main.s:1008-1017, 4441-4486` |
| hostile pool cost, resident | 548 cycles a frame with 5 PULSE in flight + 1,186 to render 5 slots (+26 a slot) | STATUS "4.4c" tables; budget §1.1 |
| engine banks | two glyphs' bytes rewritten every 8 frames, 2 phases, 29 + 38 B, ~21 cycles idle / ~240 on a flip (IC) | `src/main.s:8793-8831` |
| sound | ch 1–2 music (ch 2 pre-empted by `hit_timer`), ch 3 the engine bed (`AUDF3 $68 / AUDC3 $22`, set by the boss install), ch 4 the player shot and the capital explosion (the boss already uses the explosion through `CAPITAL_EXPLOSION_SOUND_TIMER`); `play_hit_sound` is the only hit/kill sound; `CODE` has 31 B to STOP | `src/main.s:7088-7196`, `src/hybrid/gameplay-music.s:126-128` |
| the band palette | reloaded from `$AD00-$AD03` by the boss DLI every frame; nothing writes it after the install | `src/hybrid/boss.s:202-209` |
| `COLBK` flash | 4 frames from the enemy explosion slot's timer, as the chain uses | `src/main.s:7157-7193` |
| column collision under scroll | built and MEASURED: column = (x − 32 + p) / 4, p = LMS·4 − HSCROL | `tests/boss-runtime.test.mjs:241, :331, :351` |
| harness | `tests/boss-harness.mjs` `call()` / `nmi()` native cycles on linked bytes; the trace's `boss_state` = 1 + `_boss_phase`; kills counted at `boss_module_scored`; the native pin 3,500 (S3 2,760) | `tests/boss-runtime.test.mjs:544`; STATUS |
| disk | 528–583 reserved (55 used); 509 ATR sectors remaining; summary 584–597, save 599, art 600–627; entry 28 sectors / 108 frames | manifest |
| PNG | `scripts/preview.mjs:1942-1966` decodes non-interlaced 8-bit RGBA PNG with node's zlib: the art route needs no dependency | — |
| stats | `STATS_HITS` on damaging hits, `STATS_KILLS` through `$A012` per module, `STATS_BONUS` from `boss_def` (62 B, 60 free), the time grade = the fight only (built); level 1's time tiers 90 / 60 s | `src/hybrid/level-summary-abi.inc`, `boss.s:390-412`, `boss.c:150` |

#### 5.13.2 The fight

1. **The grid.** The 8-row × 64-column band as built. **Layers are rows
   counted from the player's side**: row 7 is layer 1, row 0 the deepest. A
   module is a rectangle (x, row, width 1–4, height 1–2) of band cells. Up to
   **16 modules** a boss (S3: 8). Kinds: `armour`, `pulse`, `emitter`, `salvo`,
   `core`; every kind but armour is a **weapon**. Placement is the layout's
   business and may be irregular (decision A); layers are a way of reading the
   rows, not a rule the engine enforces.
2. **Cover groups (decisions A, F).** Every module carries a 16-bit `cover`
   mask; it is **exposed** when `cover & alive == 0`. The converter computes the
   mask from geometry — every module in a nearer row whose columns overlap —
   unless the layout names `cover` explicitly. Style 1 = geometric masks; style
   2 = the core's mask is the group of guns, the rest 0. Exposure is
   re-evaluated on every kill (≤ 16 masks, one `and` each); a module that
   becomes exposed draws its `open` look if it has one (the S3 core's shutters)
   and arms its weapon. **A gun cannot fire until exposed** — that is the
   "module directly in front" rule, generalised.
3. **Collision.** The column map (64 B) holds, per column, the **front intact
   module** — the one nearest the player — else ARMOUR or OPEN. It is rebuilt
   on every kill (§5.13.5 P2: column-local, not the whole map). A player shot
   that reaches the band's bottom edge meets its column: a module that is
   **exposed takes the hit**; a module that is intact but **covered absorbs it**
   (spark, tick, no damage, no hit for the accuracy stat — Q-B7); ARMOUR absorbs
   likewise; OPEN lets the shot fly on hidden (as built). One rule for both
   styles: in style 1 the front module is exposed unless a partial overlap
   leaves part of its cover alive; in style 2 the core absorbs behind its
   shutters until the last gun dies.
4. **Damage stages (decision C).** `intact → cracked → broken → gone`. The
   converter writes two thresholds a module (⅔ and ⅓ of its HP). Every staged
   glyph sits in one contiguous block of the boss charset so that **cracked =
   code + K and broken = code + 2K** (K = the number of staged glyphs): a stage
   change is one add per cell, no look table; `gone` is one bay glyph per kind
   over the module's cells. Module cells must use staged glyphs (the converter
   refuses a module drawn with an unstaged glyph); hull outside modules is
   free-form.
5. **Hit feedback (decision C).** A **cell-flash ring** of 8 records (cell
   address, saved code, timer): the **spark** glyph for 2 frames in the struck
   cell (the module's bottom row at the shot's column; an armour hit sparks on
   the hull's bottom edge); the same ring draws the **muzzle flash** of a firing
   cannon and the laser's **heat** phases (S4b). A stage change expires the
   module's records first, then redraws. **Band flash**: the four palette bytes
   at `$AD00` raised by `flashLuma` (data) for one frame on a damaging hit,
   restored by the next tick; the DLI needs no change. **Hit tick**: 2 frames on
   channel 3 (a high tone over the engine bed, the bed put back after;
   `AUDF3/AUDC3`, 0 resident bytes), distinct from the **kill** (`play_hit_sound`,
   14 frames, ch 2) and the **destruction** (the capital explosion on ch 4 + the
   `COLBK` flash, as the chain already does). No health bar.
6. **Firing rules (decision B).** A weapon fires only while alive and exposed.
   **Pulse cannon**: a reload (data, per module; difficulty by shift: EASY
   +½, HARD −¼) → one PULSE shot from the module's centre column at the band's
   bottom edge, straight down (the pool has no dx; the band's drift sweeps the
   columns), with a muzzle flash. **Salvo launcher**: three shots on three
   frames from columns x − 1, x, x + 1, then a long reload. **Beam emitter**:
   §5.5's laser (S4b), its heat through the ring. **Core**: fires pulses if its
   reload is non-zero, else inert. The controller keeps **one countdown** to the
   next firing module (O(1) a frame; §5.13.5's cadence measurement rules out a
   per-module timer scan in C) and serialises to ≤ 1 spawn a frame with a
   global cooldown (data); the five hostile slots are shared with the escort
   Light, which fires through the token as today.
7. **Emitter slots and tiers (decision B, decision 8).** A layout authors up
   to four `emitter` modules with `slot` 1–4. At the install, the tier
   (level − 1) / 4 enables 1 / 2 / 4 slots; the others become `armour` with
   their `capped` look (a plated housing). Region × level: R1 (L1–3) 1; R2 L4 1,
   L5–6 2; R3 L7–8 2, L9 4; R4 (L10–12) 4.
8. **Defeat (decision A).** `weapons_left` is counted at the install after the
   tier conversion; it reaches 0 → the chain. Armour kills score and count as
   kills (they are the visible progress) and are never required.
9. **Nozzles (decision D).** Nozzle cells at both ends of the band reference
   two flame glyph codes; every 8 frames the overlay copies the next phase's
   16 B (3 phases × 2 ends, from the charset run's tail) into those codes — the
   capital engine-bank mechanism, 0 cell writes; the chain writes the dark
   phase and stops the copy. The ends are on screen when the drift brings them
   in (the band is 64 cells, the window 40): the hull reads as a structure the
   screen slides over.
10. **The win.** As built (§5.6, §5.12): blasts along the modules — every
    module, surviving armour included, becomes a wreck as the chain passes —
    the `COLBK` flash, the band shake, the bonus, the hold, the hand-off. The
    nozzles go dark on the first blast.
11. **Stats.** Kills = modules destroyed (armour included); hits = damaging
    hits; time = the fight only (built); bonus = `boss_def`'s. `boss_def`'s 60
    free bytes carry the per-difficulty HP scale (Q-B3).
12. **Two styles, one engine (decision F).** Style 1 (geometric cover, 2–4
    layers) and style 2 (the S3 core behind a cover group of guns) are **region
    data**: the same controller, collision, stages, feedback, nozzles, lasers
    and win. The core boss as built becomes a layout with explicit cover and an
    `open` look.

#### 5.13.3 The cover-group rule, priced

| Item | Bytes | Where | Basis |
| --- | ---: | --- | --- |
| `cover` 2 B × 16 modules + `alive` 2 B | 34 | region tables / state | fixed |
| the exposure pass on a kill (16 masks, the `open` look, the arm) | 60 → 72 | C | IC |
| the covered-module absorb branch in the hit path | 10 → 12 | C | IC |
| the converter's geometric cover (overlap in nearer rows) and the explicit form | 0 runtime | `scripts/boss-assets.mjs` | — |
| **cycles**: the exposure pass | ~16 × 40 = 640 native on a kill frame (cc65) | | AN §5.13.5 cadence loop (85–92 a module) |

Against S3's "the core opens when `guns_left` reaches 0" this is +~90 B of C
and the mask bytes; it buys both styles and irregular cover for free. The
alternative — a module covered only by the one directly in front — needs a
"front" index per module (16 B) and a special case for the core; it does not
express style 2 or a gun shielded by two plates, and is not recommended.

#### 5.13.4 Data, conversion, homes, the art route

**The draft (what the owner edits), per region** in
`assets/graphics/boss-regions/region-N/`:

| File | Content |
| --- | --- |
| `band.png` | 256 × 64 px (64 cells × 4 px, 8 rows × 8 lines; drawn at 2:1 pixel aspect), five fixed colours: background, pf0, pf1, "3 in the pf2 bank", "3 in the pf3 bank" (a cell may not mix the two) |
| `cracked.png`, `broken.png` | the same size; read inside module rectangles only |
| `open.png` | the exposed look of a covered module (its own art under the shutters); cells identical to `band.png` are allowed and mean "no open look" |
| `extras.png` | a strip: the spark, one bay glyph per kind, the nozzle phases (3 × 2), the capped emitter plates |
| `modules.json` | `formatVersion` 2, `name`, `style` (1 or 2, documentation), `palette` {colpf0–3, `flashLuma`}, `motion`, `chain`, `nozzles` {left, right cells; `framesPerPhase`}, `modules[]` {`name`, `kind`, `x`, `row`, `width`, `height`, `hp`, `score`, `slot` (emitters), `reload`, `cover`: "auto" or names} |
| the theme | `assets/music/boss-theme-N.json` as today |

**The converter** (`scripts/boss-assets.mjs` v2): decodes the PNGs with the
`preview.mjs` reader; cuts cells; mirrors the star codes 0–6 (the divider);
dedupes each module cell as a triple (intact, cracked, broken) into the
**staged block** and every other cell into the plain block; validates: ≤ 128
codes, one colour bank per cell, module cells staged, covers acyclic (a module
may not cover itself through a chain), `salvo` only where the layout says, the
band rows on 64-B boundaries, ≤ 16 modules, the look tail fits; emits **four
runs**:

| Run | Sectors | Lands | Content |
| --- | ---: | --- | --- |
| charset | ≤ 8 (sized to the glyphs used) | **`$0C00`** | the glyphs (1 KB max), then the look tail: `open` and `capped` looks, nozzle phase images |
| band A | 3 | `$A880` | rows 0–5 |
| band B | 3 (S3: 2) | `$AC80` | rows 6–7, then **256 B of tables**: header 24 (palette 4, flashLuma, motion 5, chain 2, nozzle cells 4 + phase frames, K, bay glyph per kind 5, spark glyph, module count, cooldown), 16 × 12-B module records (x, row, w, h, hp, hp_cracked, hp_broken, kind, score, cover lo/hi, slot/reload), open-look offsets |
| theme | 2 | `$7990` | as today, without the glyphs |

**Homes.** The boss claims **`$0C00-$18FF`** (3,328 B of the measured-free low
RAM), the way the summary claims `$0500-$0BFF`; tests pin the claim and the
memory map gets the rows:

| Range | Use | Read at |
| --- | --- | --- |
| `$0C00-$0FFF` | the region's charset (`CHBASE` `$0C` in the band's DLI phase 0; phase 1 restores `>CHARSET` for the ring: +5 B, ~8 cycles) | every boss entry, by the slot-A head |
| `$1000-$17FF` | **slot C**: the C controller and the laser C (its own `MEMORY` area in `cfg/boss.cfg`, one more run in `boss-runs.inc`, read as many sectors as linked) | every boss entry |
| `$1800-$18FF` | scratch: the column map (64), the cell-flash ring (32), the controller's state | written at the install |

Nothing of it survives a boss sector: `start_gameplay` and the HUD DLI set
`CHBASE`, the Q-S4 restore is unchanged, and no resident code reads `$0C00+`.
The risk is the one the owner already carries for `$0500`: **EMULATOR-only
evidence until the 65XE smoke** (hardware-testing §12/§13), risk 2.

**Disk.** 528–583 keeps the boss code 16 + the install 3 + slot C ≤ 16 (35 of
56); the regions move to a new area of **16 sectors each from 632** (charset ≤
8, band 6, theme 2; the directory's region entries point there). The entry
reads 28 → **42 expected / 51 budgeted sectors** (code 16, install 3, slot C
~10 / 16, theme 2, band 6, charset ~5 / 8): ~160 / ~195 host frames (3.2 /
3.9 s EMULATOR at 3.86 frames a sector; ×2 on a 1050-class drive, ESTIMATE)
behind the `WARNING - BOSS APPROACHING` screen with the theme — Q-B8.

**The art route (decision G, Q-B2).** The agent draws the placeholder art in
this format for region 1 (S4a-i) and for regions 2–4 (S5); the owner edits
the PNGs afterwards in any pixel editor and the build picks them up. The
concept PNGs are references, not inputs: their resolution and colour count
are far above ANTIC 4, so a conversion would have to be a redraw anyway.

#### 5.13.5 Measurements (probe build `build/level-1-s0`, 6502 harness on its linked bytes; every edit reverted)

**The probe.** S3's overlay plus: a 4-record cell-flash ring and the spark on
every column hit; the band flash; the nozzle glyph copy; a PULSE spawn into
the hostile pool from a C per-module reload scan (a mailbox); the column map
rebuilt on a kill with an alive test; and, for P3, a **laser stand-in** with
the spike's memory traffic (4 missiles: 8 fill + 8 erase read-modify-writes
each, one `HPOSM` write each, the column compare against the player and five
shots; `PRIOR $10`, `SIZEM $FF`; no game logic) and a probe copy of level 1
with one Wingman escort in the boss sector (one Bomber wave fewer in sector
3). Slot A: 1,297 → **1,964 B** (the probe's own +667: ASM ~520 with ~150 of
stand-in and ~40 of data, C +144, BSS +24).

**MEASURED, native (no DMA; the emulator ratio ~2.2 applies):**

| Item | Cycles | Note |
| --- | ---: | --- |
| **P1** the spark into the band under HSCROL | set **86**; the hit dispatch (module row + set) **150**; the ring's tick **55** idle / **91** with 4 live / **239** with 4 expiring; a stolen record **162** | at band positions p = 0, 5, 17, 31, 48 the spark landed in the struck module's bottom-row cell at the shot's column (`$ACC0 + c`), inside the shown window (p/4 … p/4 + 40), and was back to the hull code two frames later — 5 of 5; p = 63 put the module off screen |
| **P2** the column map, front-intact rule | S3's builder **2,342**; with the alive test **2,378** (4 alive), **2,260** (3), **1,893** (0): the 64-column base pass 1,893 + **~120 a live module** → a full rebuild with 16 modules **~3,800** (extrapolated) | after gun-centre's death its columns 27–29 read the core (3) and a shot there reached module 3 at the same p; column 17 read ARMOUR once every module was dead. **Recommended instead**: rebuild only the dead module's columns (width × ≤ 16 modules × ~20) **~1,000** (IC) |
| the band flash | set **103**; tick **13** idle / **21** hold / **77** restore | 4-byte palette write; the DLI unchanged |
| the nozzle copy | **245** on a flip frame (16 B) / **14** idle | the capital mechanism's cost class (IC ~240) |
| the PULSE spawn | **62** (free slot) / **80** (pool full, no spawn) | the slot carried class PULSE, x 100, y 88, lifetime 96 |
| the laser stand-in | **1,749** a frame | the spike's lasers MEASURED 1,692 / 2,089 / 2,430 for 1 / 2 / 4: the stand-in is in range |
| the C reload scan | S3's tick **30** → **365–399** with 4 modules: **~85–92 a module a frame** (cc65) | 16 modules would cost ~1,450 every frame: hence the single countdown of §5.13.2 item 6 |
| C growth | the cadence + mailbox alone: **443 → 587 B** (+144); `boss_c_init` 326 → 657 | the spike's lesson in one number: a small C feature is ~150 B |
| UPDATE, one hit | S3 **320** → probe **3,058** (= 320 + spark 150 + flash 103 + scan ~340 + the per-frame probe work 1,868 of which the stand-in 1,749) | S3: idle 113, 5 hits 1,148, a kill 958 (the wreck draw 281) |
| **the worst boss frame's own work** (correction 9's loop: UPDATE + PREPARE_ROW + the vectors + 3 DLIs, 5 shots a frame) | S3 **2,760** → probe **8,060** on gun 3's kill frame: 5 sparks, the flash, the wreck draw, the **full** rebuild 2,378, the stand-in 1,749, the scan ~400, the DLIs 581 | with the column-local rebuild (−~1,400) and the countdown (−~350) the engine's worst is **~6,300 with lasers, ~4,500 without** (ESTIMATE from MEASURED parts) |
| **P3** the worst boss frame in the emulator: 4-laser stand-in + pulse fire + one Light | fence margin **7,339**, DMA-on **29,305** over 8,381 boss frames, 3 replays | EASY 7,339 / MEDIUM 7,633 / HARD 7,507 (f10696 / f10243 / f9085), 0 overruns; enemy shots in flight on 97 % of boss frames (max 5); the entry 108 host frames in each. **Without the escort**: the boss sector's wave count reached the install (1) but no Light was live on any boss frame (`live_interceptor` 0) — whether a Light is admitted in a boss sector at all is an S4a-i test item (§5.12 deviation 7 stops the row tick there). The Light is **composed** from the spike's MEASURED delta (14,949 → 10,103 = 4,846 on a kill frame): 7,339 − 4,846 − a player hit ~900 ≈ **1,600** over GO as probed. S3 MEASURED 16,089 / 28,008 (no lasers, no escort, no fire); the spike 10,103 / 29,219 (lasers, a Light). The variant run's emulator wrote no boss columns, so boss frames are the rows after the entry row |

**What the probe showed beyond the numbers.**

* **The install order**: S3 builds the column map (step 7) before the C init
  sets the hit points (step 8). With an alive test every module read "dead"
  and every column became armour; the layered engine must run the C init
  first. Found and fixed in the probe.
* **cc65 scans are the cost**: ~90 native a module for a timer loop, +144 B
  for one feature. The controller's per-frame path must be O(1) and its
  per-event paths (hit, kill, exposure) O(modules).

#### 5.13.6 Price against every resource

Expected → budgeted (+20 %); the spike's lesson is applied as a second,
×1.5 line where the fit is decided. MEASURED where the probe measured.

| Resource | S3 (MEASURED) | S4a-i engine | S4a-ii feedback | S4b lasers | End of M5b, budgeted (×1.5 risk) | Limit | Fit |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| **slot A** (ASM) | 1,297 (806 ASM + 443 C + 48 BSS) | **−491** (the C and its BSS leave for slot C) **+130** (stage draw 48, column-local rebuild 40, the C mailbox 30, the slot-C and charset reads 12) | **+350** (ring 110, flash 60, tick 20, nozzles 70 incl. 32 B of phase data, spawn 50, fire dispatch 40) — probe MEASURED ~370 unoptimised | **+366** (the spike's 306 + the owed 60) | **1,652 → 1,980 (2,480 at ×1.5)** | 2,048 | fits budgeted; **at ×1.5 it does not**: the next movable piece is the once-per-entry ASM (the region reads 136 + the base column map 65 + the install's helpers ~60 → slot C), −260 B → **2,220**; after that the laser ASM's collide (127) is the C's to decide |
| **slot C** `$1000-$17FF` (C) | — | **~1,100 → 1,320**: S3's 443 + cover 90 + stages 60 + defeat/tiers 80 + the countdown and fire policy 150 + exposure 70 + stage/spark mailboxes 60 + growth as measured (×1.3 of IC) | +0 | **+250 → 300** (the spike's ~170 + heat through the ring) | **1,620 (2,430 at ×1.5)** | 2,048 | fits budgeted; at ×1.5 slot C grows into `$1800+` and the scratch moves to `$1F00` (the claim has 1,792 B more) |
| charset `$0C00-$0FFF` | 248 B at codes 59–89 | ≤ 1,024 (region data) | | | 1,024 | 1,024 | fits by construction (the converter refuses > 128) |
| scratch `$1800-$18FF` | 64 (column map in slot B) | 64 + 32 + ~40 | | | ~140 | 256 | fits |
| install run `$7810` | 343 | +~20 (the capped looks, `CHBASE`, the tier) **−16** (no glyph copy) | 0 | 0 | ~350 → 384 | 384 | fits; if not, the capped-look draw moves to slot C's init |
| slot B | 704 | band 512 + tables 256 = **768** | | | 768 | 768 | fits exactly (the column map left) |
| window | 1,316 free | **0** (the entry reads the same two directory entries; the head reads the rest) | 0 | 0 | 1,316 | — | unchanged |
| `HYBRID_C_SECTOR` / `DIRECTOR_C_*` | 18 / 35 free | 0 | 0 | 0 | | | unchanged |
| `$0500` module | 115 free | 0 (nothing new to restore) | 0 | 0 | 115 | | unchanged |
| reader | 29 free | 0 | 0 | 0 | | | unchanged |
| zero page / `ENTITY_STATE` / initial block | 74 / ~21 / 31 to STOP | 0 / 0 / 0 | | | | | unchanged |
| **disk**, per boss | 9 | **16** (charset ≤ 8, band 6, theme 2) | | | 16 × 4 = 64 at 632–695; 528–583 holds code 16 + install 3 + slot C ≤ 16 | 509 free | after M5b: 509 − 64 + (the 27 reserved and unused at 556–582 stay reserved) = **445**; after eleven more 16-sector levels **269** (§6.3 had 319 → 210 with every item: the boss adds −50) |
| **the entry** | 28 sectors / 108 frames | **42 → 51** sectors, ~160 → ~195 frames (3.2 → 3.9 s EMULATOR; ×2 on a 1050) | | | | the owner's patience (Q-B8) | the charset and slot C runs sized to use are the lever (−9 sectors) |
| **hostile pool** | 0 used by the boss | the escort's | ≤ 5 shared; ≤ 1 spawn a frame, a global cooldown | the beam retires shots | MEASURED resident cost at 5 in flight 548 + 1,186 render | 5 slots | the escort can starve during a salvo: the salvo fires what is free |
| **cycles, native** (correction 9: 3,500) | 2,760 | ~3,400 (rebuild 1,000 + exposure 640 on a kill frame) | ~4,500 (5 sparks 750, flash 103, nozzle 245) | **~6,300** (+1,750) | **~6,300 → 7,600** | 3,500 | **does not fit the pin**: Q-B6 proposes 7,000 on P3's margin |
| **fence margin, boss frames** | 16,089 | ≈ 14,500 (−1,600: the kill-frame work ×2.2 less the escort) — ESTIMATE | ≈ 12,000 (−2,500: pulses in flight 1,700 + feedback) — ESTIMATE | **P3 MEASURED 7,339** (stand-in lasers + pulses + the Light) | composed worst with a player hit on top (~900) **~1,600 as probed, ~5,400 with the design's savings (−1,750 native: the column-local rebuild and the countdown), ~3,900 at the proposed pin** | GO ≥ 500 | fits by a wide margin |
| **DMA-on, boss frames** | 28,008 | 0 (the charset page costs nothing) | 0 | missiles are on already | **P3 29,305** | 31,200 / 32,568 | fits |
| the binding fighter row | 1,370 | 0 | 0 | 0 | 1,370 | ≥ 500 | unchanged: nothing resident changes |

**What does not fit and the cheapest change.** (1) **Slot A alone** cannot
hold the layered engine with the lasers (2,480 at the spike's ratio): the
cheapest change is **slot C in low RAM** for the C — a second `MEMORY` area,
one more run, one claim test, the `CHBASE` line — about 60 B of build and
harness work and 0 resident bytes; the alternative, cutting stages and
nozzles, contradicts decisions C and D. (2) **The 31 glyph codes** cannot
carry four stages, nozzles and a spark for a 16-module boss: the cheapest
change is the **region charset at `$0C00`** (+5 B of DLI, ≤ 8 sectors a
region); the alternative, reclaiming 92–99 / 102–109 (16 codes, 47 in all),
depends on the hostile bank's "never published" gap and is not a proven pool.
(3) **The native pin** (3,500) cannot hold sparks, a rebuild and four lasers:
Q-B6 (7,000). (4) The **full column-map rebuild** (3,800 at 16 modules) and a **C
timer scan** (1,450 a frame) are avoidable costs: the column-local rebuild and
the single countdown are design rules, not levers.

#### 5.13.7 Sessions

The brief's S4a is **two sessions**: the measurements make a new memory home,
a converter with a PNG route and a 16-module engine one S3-sized session on
their own, and the feedback kit (five mechanisms, each with an owner-visible
look and sound) another. Each on its own branch from `main`, shippable, under
§8's rules (default-build `npm test`, evidence regenerated, memory map and
STATUS updated).

| # | Branch | Scope | STOP conditions | Tests and clauses | Evidence | Owner smoke |
| --- | --- | --- | --- | --- | --- | --- |
| **S4a-i** — **implemented 2026-10-04, `OWNER-SMOKE CANDIDATE`; as built §5.14** | `feat/boss-engine` | the `$0C00-$18FF` claim (charset, slot C, scratch) with its tests and memory-map rows; `cfg/boss.cfg` + `boss-runs.inc` + the head's reads; the band DLI's `CHBASE`; `scripts/boss-assets.mjs` v2 (PNG draft, staged block, four runs, the geometric and explicit cover); the C controller rebuilt in slot C: 16 modules, cover masks, exposure, stages (+K), the defeat rule, tier slots → capped armour, the single countdown (fire policy only — no shot yet), the C init before the column map; the ASM: stage draw, column-local rebuild, mailboxes; `docs/level-authoring.md`'s boss section; **region 1 rebuilt in its chosen style (Q-B1) with placeholder art in the new format (decision G)**; the harness: `boss_state` re-pointed (1 fight, 3 chain, 4 hold, 5 done), kills at the new label | slot A > 2,048 or slot C > 2,048 B; a boss frame < 500 in the audit; any other link reaching `$0C00-$18FF`; the entry > 55 sectors; the native pin exceeded before Q-B6 is answered | build: the claim, the four runs, the staged block, ≤ 16 modules, covers acyclic, the band rows on 64-B boundaries; 6502: cover and exposure on fixtures (style 1 and style 2 layouts), stages at ⅔ / ⅓, the defeat rule with armour left, the tier conversion at levels 1 / 5 / 9, the column-local rebuild = the full rebuild on every kill of a fixture, the install order; native: `director-complete-*` through the new fight, PAL audit, the 3 DLIs | regenerated (the fight's length and clauses move) | the layers fall in order; a covered module absorbs with no damage; the last weapon ends it while armour stands; the charset seam at the divider is clean; GAME OVER inside the boss then START GAME leaves nothing (Q-S4 unchanged) |
| **S4a-ii** — **built 2026-10-05 in the fortress session (`feat/boss-fortress-r1`), §5.15.7** | `feat/boss-feedback` | the cell-flash ring (sparks, muzzle flashes), the band flash (`flashLuma`), the ch-3 hit tick (Q-B4), the PULSE spawn and the salvo burst through the hostile pool with the global cooldown, the nozzle copy with the dark phase on the chain, the hit/absorb stats rule (Q-B7) | the native pin (Q-B6's value) exceeded; fence < 500 on any boss frame; the escort starved for > 2 s in a replay; a spark left in the band after its module changed stage | 6502: the ring under every band position, the steal, the stage change expiring records, the flash restore, the tick restoring the bed, the spawn's slot fields, the salvo with 0–3 free slots; native: the pulses hit the player in a replay, the audit | regenerated | every hit reads on screen (spark, flash, tick); the cannons fire and their shots are dodgeable; the nozzles at both ends; the kill and the destruction sound different from a hit |
| **S4b** | `feat/boss-lasers` | §5.5's lasers as emitters by tier, the heat through the ring, the laser damage source id, the laser contact session (§5.8) and the retirement of `lower-playfield-hostile-contact-atr-hard` by name (Q4), the missile-plane clause exception, `PRIOR $10` / `SIZEM $FF` with the Q-S4 restore already in place | as §8's S4 row; slot A > 2,048 after the laser ASM (the once-per-entry ASM to slot C first) | §5.8's clauses; `boss-escort`; cycle pins | regenerated | the warning readable; the beam's hit and its sound; a level-9 review ATR with four emitters |
| **S5** | `feat/boss-regions` | regions 2–4 as PNG drafts (placeholders, decision G), their layouts in the mapping of Q-B1, the region runs from 632, level 2's boss through the debug route, the M8 tuning layout (`boss_def`'s HP scale), README EN + PL, `hardware-testing.md` items, release prep for `v0.3.0` | a region run > 16 sectors; a review build failing the audit | build pins; the four regions through `--level=N` review builds | — | each region's boss on hardware through a review ATR; level 1's through the default |

#### 5.13.8 Owner questions

| # | Question | Recommendation | Alternative and its cost |
| --- | --- | --- | --- |
| **Q-B1** | Region → style. The confirmed mapping E: R1 Blockade Breaker (2 layers, pulses + the tier's emitter), R2 Siege Spine (3), R3 a Siege Spine variant with its own art (3), R4 Void Citadel (4) — or R1 the core boss (teaching), R2 Blockade Breaker, R3 Siege Spine, R4 Void Citadel? | **The alternative**: R1 = the S3 core boss as style 2 (its layout and placeholder art already exist, upgraded with stages and nozzles), then the three concepts at 2 → 3 → 4 layers. One art set fewer, style 2 stays in the campaign, the depth escalates, and S4a-i's region 1 is a rebuild of what the owner has smoked rather than a fourth design. | Mapping E: a fourth layout and art set (the R3 variant) in S5, and style 2 built but unused in twelve levels |
| **Q-B2** | The art format the owner edits (decision G: the agent draws the placeholders, the owner changes them). | **PNG drafts + `modules.json`** (§5.13.4): any pixel editor, the converter does the glyph bookkeeping and refuses what ANTIC 4 cannot show | the S3 JSON (pixel strings and a 64-character band with a legend): no new reader code, but editing art as text |
| **Q-B3** | Hit points per kind, MEDIUM start values. | **armour 6, pulse 8, emitter 10, salvo 10, core 24**; a per-difficulty scale in `boss_def` (¾ / 1 / 1¼, by shift); M8 tunes. S3's bot landed ~1 HP a second (48 HP ≈ 55 s); a 12-module boss at these values is ~110 HP, so the player's aim, not the bot's sweep, must decide the 45–60 s target — M8's job | flat HP (S3): one number to tune, no difficulty curve |
| **Q-B4** | The hit sound. | **A 2-frame tick on channel 3** (over the engine bed, the bed restored): distinct from the kill (ch 2) and the destruction (ch 4), 0 resident bytes, no music pre-emption | (b) a short `hit_timer` tick on channel 2: pre-empts the lead on every hit; (c) a new resident SFX: `CODE` has 31 B to STOP — not affordable |
| **Q-B5** | The boss claims `$0C00-$18FF` (charset, slot C, scratch). | **Yes** — the only measured way to fit (§5.13.6), the same evidence class as the owner's `$0500` decision; the 65XE smoke of §12 covers both | no second home: the fight cannot carry stages, nozzles and lasers in 2,048 B; or the window's free tail — the road ends −610 B without it (§6.1) |
| **Q-B6** | The native per-frame pin 3,500 → **7,000**. | **Yes**: the engine's expected worst is ~6,300 native with lasers (§5.13.5; budgeted 7,600, which would still compose to ~2,600 over GO); at 7,000 P3's frame composes to **~3,900 over GO** with the escort's break-up and a player hit on it (7,339 + (8,060 − 7,000) × 2.2 − 4,846 − 900); the token already defers a Light's break-up off a heavy frame if that margin ever binds | keep 3,500: no sparks on kill frames and no full rebuild — the feedback the owner asked for would have to be rationed |
| **Q-B7** | Absorbed hits (a covered module, armour): spark + tick, **not** a hit for the accuracy stat? | **Yes**: accuracy then measures aiming at what can be damaged, and the spark already says the shot connected | count them: accuracy reads high on armour-heavy bosses |
| **Q-B8** | The entry grows 28 → 42–51 sectors (3.2–3.9 s EMULATOR, ~6.5–8 s on a 1050). | **Accept**, with the charset and slot C runs sized to use (the converter and the build already know the sizes); the theme plays under the screen | a fixed 51; or the charset shared by two regions (−8 a region, one look per two regions) |

#### 5.13.9 What this session did not do

No source, cfg, build-script, harness, level or evidence change is committed;
the probe (§5.13.5) was built under `build/level-1-s0/` and every edit
reverted (`git diff -- src cfg scripts assets tests` empty at the commit). No
worktree was made. The ATR and the boot image are byte-identical to `main`
`d586228`. The art of regions 1–4, the exact glyph budget per region, the
reload values and the cooldown are the sessions' to settle; every IC, AN and
G figure is an estimate the session that builds it replaces.

### 5.14 M5b-S4a-i as built (2026-10-04, `feat/boss-engine`, `OWNER-SMOKE CANDIDATE`)

Implemented as §5.13 describes for S4a-i, under the owner's answers Q-B1–Q-B8
(§1.6) and decisions A–G, with the deviations below. Figures are MEASURED from
the linked images, the regenerated evidence or a named 6502-harness test; load
figures are EMULATOR. Region 1's art is an agent-drawn placeholder (decision
G); hit points and the bonus are placeholders (M8). Sparks, the band flash, the
hit tick, pulse and salvo fire and the nozzle animation are S4a-ii's; the lasers
S4b's; regions 2–4 S5's.

**What was built.** The `$0C00-$18FF` claim (charset, slot C, scratch) with its
tests and memory-map rows; `cfg/boss.cfg`'s slot C and scratch areas; the head
reading the install, slot C, band A, band B and the charset; the band DLI's
`CHBASE` (`$0C` under the HUD's last line, the gameplay charset back first thing
on the band's last line); `scripts/boss-assets.mjs` v2 (PNG drafts through the
repository's own reader, five fixed colours, the staged block, open looks,
bays, the capped plate, nozzle cells, geometric and explicit covers, four runs
sized to their contents) and `scripts/boss-preview.mjs` (`npm run boss:preview`);
the controller rebuilt in slot C (16 modules, cover masks, exposure on every
kill, the four stages, tier slots → capped armour, the defeat on the last
weapon, the HP scale per difficulty, the single fire countdown — policy only);
the ASM's three draw modes, the front-intact column map and its column-local
rebuild; the install order fixed (the controller's init before the map);
`docs/level-authoring.md` "The boss"; region 1 rebuilt as style 2 (Q-B1) with
placeholder drafts; the harness's `boss_state` read as fight 1 / chain 3 / hold
4 / done 5.

**Deviations and choices, each reported:**

1. **Every run sized to its contents (Q-B8) includes slot A's.** The boss code
   run is 9 sectors, not 16 (its state moved to the scratch page), so the reader
   is relinked once more with the directory's boss-code count (16 → 9): one data
   byte, no label moves (checked), **0 B** of reader size. Slot C's run (11
   sectors) is sized to its code; its BSS (119 B) follows the code in slot C and
   is never read from disk — the plan put the controller's state in the scratch
   page; the scratch page keeps the column map, the ring and slot A's state.
2. **The divider's codes 0-6 are copied at the install** from the gameplay
   charset (11 B of install) instead of mirrored by the converter: exactly what
   the divider row shows, whatever the starfield's glyphs are.
3. **CHBASE and Q-S4: no restore-table entry.** Every screen after a boss
   sector sets its own `CHBASE` before it shows (the summary's, the reader's,
   the frontend's, `start_gameplay`'s HUD, the gameplay DLI's), so the START
   GAME restore needs no entry for it and the `$0500` module stays **0 B** (the
   brief's STOP on any byte there). Proven on the 6502 harness: the START GAME
   path never writes `$0C`, leaves the summary's own page up, and the next game
   writes the HUD's and its DLI the gameplay charset
   (`tests/boss-runtime.test.mjs`, "Q-S4 ... CHBASE too").
4. **The column map is per-column "first live module of the front-first
   table"**, the converter sorting modules nearest-the-player first; hull
   columns are ARMOUR wherever the band has any hull cell (S3 authored an
   armour span), open sky elsewhere.
5. **Damage stages are absolute**: the controller computes the stage from the
   hit points (≤ broken → 2, ≤ cracked → 1) and hands the ASM `K × Δstage` to
   add, so the per-difficulty scaling (which can make two thresholds equal)
   never skips a stage.
6. **The capped plate is one staged glyph** filled over a capped emitter's
   cells (extras.png's three capped cells), so a capped emitter cracks and
   breaks like any module.
7. **The fire countdown** serves the alive, exposed weapons with a reload
   (region 1's two pulse guns; the emitter's reload is S4b's), round-robin, the
   reload scaled EASY +½ / HARD −¼, never under the region's cooldown; S4a-i
   only names the module (`boss_fire_module`).
8. **Harness CPU limits**: `scripts/nmos6502.mjs` has no ROR absolute; the open
   looks' mask walk shifts through A instead (no harness change).
9. **The trace clause** (class (a)): S3's core phase (state 2) is gone; the
   director-complete clause asserts fight → chain → hold and that no boss row
   shows a state outside 1/3/4/5 (`boss_defeated_frame` replaces
   `boss_core_exposed_frame` / `boss_core_destroyed_frame`).

**Bytes, part by part, against §5.13.6's price:**

| Part | Price (§5.13.6) | MEASURED | Home |
| --- | ---: | ---: | --- |
| head + vector image | (S3 39) | **39** | slot A |
| head reads: install, slot C, three region runs + the 70-B run table | (S3 136) +12 | **171** | slot A |
| boss DLI (CHBASE both ways) + HSCROL/LMS publish | (S3 154) +5 | **159** | slot A |
| motion and the win's shake | (S3 103) | **79** + tables 32 | slot A |
| shot vs column map, the tick, the chain's blast | (S3 112) | **115** | slot A |
| after a hit: stage +K, score/kill, gone, rebuild, open looks | (S3 176) +48 | **146** | slot A |
| record offset, draw (look / fill / add), look-tail read | — | **110** | slot A |
| column map: per-column front, local rebuild, prepare (spans, capped plates) | (S3 65) +40 | **165** | slot A |
| hand-off | (S3 21) | **21** | slot A |
| **slot A** | 1,297 − 491 + 130 = **936** expected | **1,033 of 2,048** (1,015 free) | 9 sectors |
| **slot C** (C code 1,321, rodata 8, BSS 119) | ~1,100 → 1,320 budgeted | **1,448 of 2,048** (600 free); code + rodata **1,329** | 11 sectors |
| scratch (column map 64, ring 32, slot A state 56) | ~140 / 256 | **152 of 256** | `$1800` |
| install run | ~350 → 384 | **346 of 384** | `$7810`, 3 sectors |
| slot B | 768 | **768**: band A 384, band B 384 (rows 128, tables 256) | `$A880`, `$AC80` |
| region 1 charset run | ≤ 1,024 | **840 B** (98 of 128 codes: K = 21 staged × 3, 26 plain, 2 nozzles, 7 divider; tail 56), **7 sectors** | `$0C00` |
| window / `HYBRID_C_*` / `DIRECTOR_C_*` / `$0500` / reader / initial block / zero page | 0 each | **0 each** (window 1,316 free; `$0500` 1,677 B; reader 1,507 B, its directory's boss-code count 16 → 9; initial block 13,621 B) | |

**Ledger against the plan and S3:**

| | S3 (MEASURED) | §5.13 price | S4a-i MEASURED |
| --- | --- | --- | --- |
| disk, 528–583 | code 16 + install 3 + regions 4 × 9 | code 16 + install 3 + slot C ≤ 16 | **code 9 (528–536) + install 3 (544–546) + slot C 11 (547–557)**, 23 of 56 |
| disk, regions | in 528–583 | 16 a region from 632 | **region 1: theme 2 + band 3 + 3 + charset 7 = 15 of 16 (632–646)**; 648–695 reserved, empty |
| boss entry | 28 sectors, 108 host frames (2.2 s) | 42 → 51 sectors, ~160 → ~195 frames | **38 sectors, 146 host frames (2.9 s) EMULATOR**, every replay |
| boot / extension / total sectors | 107 / 104 / 211 | 0 | **107 / 104 / 211** |
| ATR menu frame (baseline 596) | 550 (BASIC 541) | 0 | **550** (BASIC 541) |
| boss per-frame work, native (Q-B6: 7,000) | 2,760 | ~3,400 | **5,021** worst, DLIs included (`tests/boss-runtime.test.mjs`, five shots a frame through every weapon and the chain) |
| worst boss frame (fence) | 16,089 over 11,171 boss frames | ≈ 14,500 (ESTIMATE) | **13,493** over 13,076 boss frames (`director-complete-0` f10930) |
| DMA-on on boss frames | 28,008 | 0 change | **28,079** |
| binding row `2-evasive-fire3` f287 | 1,370 | 0 | **1,370**; the ten worst fence rows are `main`'s, value for value |
| DMA-on maximum | 31,237 | 0 | **31,237** (`director-complete-2` f5797) |
| the fights (bot, held lives) EASY / MEDIUM / HARD | 2,626 / 2,871 / 2,629 frames | 45–60 s on MEDIUM (M8) | **2,353 / 2,871 / 3,682 frames** (×¾ / ×1 / ×5⁄4 HP; MEDIUM's equal length is a coincidence of the bot's sweep: 50 weapon HP against S3's 48) |
| the end | 6 blasts, hold 54 frames after the core | the chain passes every module | **8 blasts** (6 modules, the plates included), hold 72 frames after the defeat |
| gameplay before the boss | 51 of 51 identical on 42 columns | identical | **51 of 51 replay files identical to `main` on 369 gameplay columns**, frame by frame up to the boss entry (entry frames 9,734 / 8,787 / 7,877 as on `main`) |

### 5.15 Region 1 as the layered fortress — Blockade Breaker (2026-10-04/05, `feat/boss-fortress-r1`: Phase A the design; Phase B built, `OWNER-SMOKE CANDIDATE`, §5.15.7; decision L §5.15.8)

Under decisions H–K (§1.6). **Phase A (5.15.1–5.15.5): the design, the
drafts, the price** — as written at the Phase A stop, before anything was
implemented; **Phase B is §5.15.7**. No source, cfg, script, test, level or evidence byte changed;
the ATR and the boot image are `main`'s. The drafts are committed under
`assets/graphics/boss-regions/blockade-breaker/` (not yet `region-1/`, so the
default build still converts S4a-i's region 1: the v2 converter refuses plates
larger than 4 × 2); Phase B moves them into `region-1/` with the converter
change the owner approves. The preview was rendered through a scratch copy of
the converter carrying the proposed limits and the extras layout below (not
committed): `build/boss-preview/region-1.png` and
`build/boss-preview/region-1-composite.png` (not committed; running
`npm run boss:preview` on this commit renders S4a-i's region 1 over the first).

**Step 0.** `main` `f88b7cb` (the S4a-i merge, §5.14), tree clean, one worktree;
ATR `821134954c4608a8…`, boot `640249a7a75234f1…`. Branch `feat/boss-fortress-r1`.

#### 5.15.1 The layout

64 × 8 band, the hull on columns 7–56, the nozzle cells on columns 6 and 57
(rows 2–4). The window shows band columns 4 + p/4 … 43 + p/4, so over the
travel (p 0…63) columns 4–59: each engine end comes into view in turn.

* **Layer 1, the front armour (rows 3–7): the plates are the hull's lower face.**
  Ten plates of nine sizes, 3 × 3 to 6 × 4, at two depths (bottom edge on row 7,
  or recessed to row 6 with open sky under it), separated by three X-braced
  girders and one open bay; 47 of the hull's 50 columns are a module's.
* **Layer 2, the deep layer (rows 1–3):** four pulse cannons (3 × 2) at two
  depths and the emitter slot (4 × 2), between machinery and bay walls.
  `gun-2` sits at the back of the **open bay** and fires from the first frame
  (decision I; the concept's "open structural bays"); `gun-1`, `gun-4` are behind
  one plate each, `gun-3` behind two (`plate-e` + `plate-f`, staggered), the
  emitter behind `plate-d`. Covers are the converter's geometric ones.
* **The emitter slot is capped armour on every level until S4b** (decision H):
  the S4a-i controller enables slot 1 on levels 1–4, which would make it a
  weapon that never fires; Phase B caps every slot (one constant in the
  controller; S4b restores the tier rule).
* Row 0 is an irregular superstructure (masts, domes, the bridge, stacks); the
  engine housings fill rows 1–4 at both ends with cowling plates under them.
* Every weapon sits in columns 23–46: the director-complete bot sweeps player x
  94–154, so its shots reach band columns (x + 8 − 32 + p) / 4 = 17…48 only, and
  a weapon outside that range would never fall in the replays.

| Module | Kind | Cells (x, rows) | Size | HP MEDIUM (EASY / HARD) | Cracked / broken at | Reload | Covered by |
| --- | --- | --- | ---: | ---: | --- | ---: | --- |
| `cowl-left` | armour | 7–10, 5–7 | 4 × 3 | 6 (5 / 7) | 4 / 2 | — | — |
| `plate-a` | armour | 11–15, 4–6 | 5 × 3 | 8 (6 / 10) | 5 / 2 | — | — |
| `plate-b` | armour | 17–21, 3–6 | 5 × 4 | 10 (8 / 12) | 6 / 3 | — | — |
| `plate-c` | armour | 22–25, 4–7 | 4 × 4 | 8 (6 / 10) | 5 / 2 | — | — |
| `plate-d` | armour | 29–34, 4–7 | 6 × 4 | 10 (8 / 12) | 6 / 3 | — | — |
| `plate-e` | armour | 36–39, 3–6 | 4 × 4 | 8 (6 / 10) | 5 / 2 | — | — |
| `plate-f` | armour | 40–42, 4–7 | 3 × 4 | 6 (5 / 7) | 4 / 2 | — | — |
| `plate-g` | armour | 43–48, 5–7 | 6 × 3 | 8 (6 / 10) | 5 / 2 | — | — |
| `plate-h` | armour | 50–53, 4–7 | 4 × 4 | 8 (6 / 10) | 5 / 2 | — | — |
| `cowl-right` | armour | 54–56, 5–7 | 3 × 3 | 6 (5 / 7) | 4 / 2 | — | — |
| `gun-1` | pulse | 23–25, 1–2 | 3 × 2 | 12 (9 / 15) | 8 / 4 | 55 | `plate-c` |
| `gun-2` | pulse | 26–28, 2–3 | 3 × 2 | 12 (9 / 15) | 8 / 4 | 90 | — (the open bay) |
| `emitter` (slot 1) | capped armour | 30–33, 1–2 | 4 × 2 | 8 (6 / 10) `capped.hp` | 5 / 2 | — | `plate-d` |
| `gun-3` | pulse | 38–40, 1–2 | 3 × 2 | 12 (9 / 15) | 8 / 4 | 60 | `plate-e` + `plate-f` |
| `gun-4` | pulse | 44–46, 2–3 | 3 × 2 | 12 (9 / 15) | 8 / 4 | 65 | `plate-g` |

Hit points start from Q-B3 (armour 6, pulse 8): **plates by size** (≤ 12 cells 6,
≤ 18 cells 8, larger 10 — a big plate takes longer, as it looks) and **pulse 8 → 12**,
so the bot's MEDIUM fight lands in 45–60 s (below). The defeat needs the four
cannons (48 HP) and the four plates over them (30): 78 of the boss's 134 HP; the
cowlings, `plate-a`, `plate-b`, `plate-h` and the capped emitter may stand.
Fire: one countdown (§5.13.2 item 6), cooldown 24 frames; `gun-2`'s slow 90
opens the fight (1 shot per 1.8 s on MEDIUM), the faster cannons behind the
plates raise the rate as they are exposed (all four armed: one per 1.4 s on
average); EASY +½, HARD −¼. Tuned as data (decision I); Phase B measures lives
lost per difficulty against the bot.

#### 5.15.2 Expected fight lengths, and how they were estimated

A **model** (a scratch script, not committed): the bot's recorded x trajectory
per difficulty from the S4a-i trace CSVs (`build/runtime-wall-trace/director-complete-N-*.csv`,
boss rows), the production burst controller (4 shots 9 frames apart, a
12-frame pause, 5 slots), shots from y 223 at 6 lines a frame, the band's
drift (start 32, ±1 every 2 frames over 0–63, published a frame late), and the
engine's rules (the front-first column map, ARMOUR/OPEN, covers, absorb,
HP ×¾ / ×1 / ×5⁄4, the defeat on the last weapon). Each fight runs nine times
with the shot's x offset 7/8/9 and the phase ±2 frames; the median and the
range are reported. **Calibration**: the same model on S4a-i's region 1 gives
EASY 2,352 / MEDIUM 3,281 / HARD 4,063 frames against the MEASURED 2,353 /
2,871 / 3,682; every measured value lies inside the model's nine-run range
(1,970–2,472 / 2,903–4,152 / 2,801–4,072), its MEDIUM median 14 % long. That
fight hung on one late module (the core); the fortress spreads its kills over
eleven modules, so the spread is narrower.

| Difficulty | Model median | Nine-run range | Kills at the defeat |
| --- | ---: | ---: | --- |
| EASY | 1,641 frames, **32.8 s** | 1,561–1,961 (31–39 s) | 11 of 15 |
| MEDIUM | 2,361 frames, **47.2 s** | 2,090–2,832 (42–57 s) | 11 of 15 |
| HARD | 2,850 frames, **57.0 s** | 2,570–3,561 (51–71 s) | 11 of 15 |

ESTIMATE; Phase B MEASURES the three director-complete fights with boss fire
and tunes the data if MEDIUM leaves 45–60 s (the model at pulse 10, the next
step down: MEDIUM 42.1 s).

#### 5.15.3 The module limit — **16 is enough; the plates must grow**

The layout needs **15 modules** (10 plates, 4 cannons, 1 emitter slot). With the
v2 converter's module size (width ≤ 4, height ≤ 2, 8 cells) the same hull face —
about 190 cells of plates at rows 3–7 over 47 columns — would need ~24 plates
plus the 5 deep modules, **~29–32 modules**: that is the size question, not the
count. Three ways, priced:

| | **A. 16 modules, plates ≤ 6 × 4 (≤ 24 cells)** (recommended) | B. 24 modules, plates ≤ 4 × 2 | C. 32 modules, plates ≤ 4 × 2 |
| --- | --- | --- | --- |
| cover mask | 16 bits, unchanged | 24 bits: records +1 B, `alive`/`exposed`/`armed`/`newly` 3 B each, `MASK_HAS` three ANDs: C **+~150 B**, ASM +~8 | 32 bits: C **+~250 B**, ASM +~12 |
| module record table | 16 × 12 = 192 B in the 256-B table page, unchanged | 24 × 13 = 312 + header 56 + open looks 24 = **392 B**: slot B is full (768 / 768); the only home is the claim growing by a page (`$1900-$19FF`, an owner decision: `$1900-$1FFF` is unclaimed and nothing may link there), and the record offset (× 13) overflows a byte past 19 modules → structure-of-arrays tables (converter, C `FIELD`, ASM `boss_record_of`) | 32 × 14 = 448 + 88 = **536 B**: +2 pages of claim; structure-of-arrays |
| column map | full build ~120 native a live module (P2, install only); a kill's local rebuild: the dead module's ≤ 6 columns, scanned from the dead module on (+~6 B, −~30 %) | +8 modules: +960 native at the install, +160 a rebuilt column | +16: +1,920 at the install, +320 a column |
| slot A / slot C / scratch / slot B | +~6 B / 0 / 0 / 0 | ASM +~20 / C +~150, BSS +40 / mx-mxe +16 (152 → 168) / tables out of slot B | ASM +~30 / C +~250, BSS +80 / +32 / out |
| per-frame work, the kill frame's exposure pass (cc65, ~90 a module) | 16 × 90 = 1,440 | 24 × 90 = **2,160** | 32 × 90 = **2,880** |
| charset | 113 of 128 codes MEASURED (K 19 staged × 3, 47 plain), 970 B, 8 sectors | about the same glyphs (the plates are tiles) | the same |
| price in one line | converter limits only (0 B runtime) + the draw queue below | +1 claim page (owner) + a table-format rewrite + ~170 B | +2 pages + rewrite + ~280 B |

**The per-frame work** decides A's shape, not the count. Q-B6's test drives five
player shots a frame into one module. With 24-cell plates and S4a-ii's feedback,
a kill frame that also crosses a stage would cost ~9,000 native (ESTIMATE from
MEASURED parts: the stage add 24 × 36 + rows ≈ 1,100, the hole draw ≈ 950, the
rebuild ≈ 1,500, the exposure 1,440, the newly exposed cannon's open look ≈ 450,
five hits in C ≈ 900, sparks, flash, nozzles, fire ≈ 1,200, the DLIs 581, the
rest ≈ 900) — **over 7,000**. Two design rules bring it to **~6,200 (ESTIMATE)**:
(1) a **draw queue** in slot A (4 entries in the scratch page, ~40 B): a stage
change, a hole and an open look are drawn one module a frame, at most 3 frames
late (60 ms); (2) the **exposure pass runs on the C tick of the frame after the
kill** (the cannon arms a frame later; the column map is rebuilt on the kill
frame as now). Smaller plates do not avoid this: at ≤ 16 cells the same frame
is ~7,900, because S4a-ii's ~1,200 lands on S4a-i's 5,021.

#### 5.15.4 The art (drafts; agent-drawn, decision G)

`band.png`, `cracked.png`, `broken.png`, `open.png` (256 × 64) and `extras.png`
(72 × 8); five fixed colours as v2. Palette `COLPF0` $0A light steel (the plate
face), `COLPF1` $06 grey, `COLPF2` $28 amber, `COLPF3` $32 dark burgundy (the
hull's bulk); `flashLuma` 4 keeps every colour inside its hue ($0A → $0E).

* **Plates**: 9-slice tiles (rivets, a bevel and a black seam on the right and
  bottom) and five detail tiles (vent, bolt, hazard stripe, front light) placed
  by hand per plate, so no two plates read alike; the plates' sizes, depths
  and gaps carry the irregularity. 12 staged tiles cover every plate.
* **Stages, by luminance at a glance (decision J)**: intact light steel →
  **cracked** mid grey with a few bold black fractures → **broken** black voids,
  large grey fragments on the torn edges, an amber glow along them →
  **gone** the hole below.
* **The hole** (replaces the five bay glyphs): a black opening with a glowing
  amber torn rim on the top and the sides, the interior the blank code — drawn
  by a frame rule (top-left, top, top-right, left, right) over any module's
  rectangle, so every module leaves a hole of its own shape. 5 plain codes.
* **Cannons**: a closed burgundy housing while covered (plain), the lit amber
  turret and barrel once exposed (the open look, staged); `gun-2` shows the lit
  look from the start.
* **The spark** (a white core in an amber burst with a dark surround, readable
  on light plates and dark hull), **the muzzle flash** (white over amber, drawn
  in the cannon's bottom-centre cell), **three nozzle phases** per end (left
  blows left, right blows right), two blasts, the capped emitter's slatted
  shutter (it tiles into one shutter).

**The extras strip's new layout** (18 cells): spark, muzzle, hole ×5, capped ×3,
nozzle left ×3, nozzle right ×3, blast ×2; the tables gain one byte (the muzzle
code, offset 249 of the 7 free).

#### 5.15.5 For Phase B (found while designing)

1. **The escort Light**: level 1's core page has no free wave (its boss sector
   says so: the 20 waves are sectors 1–4's), and P3's probe freed one by taking
   a Bomber wave from sector 3 — which would change gameplay before the boss
   (a STOP). Phase B needs an escort that costs no wave of the page (e.g. an
   escort record in `boss_def`, 60 B free, admitted by the install through the
   Director's own entry); if that needs a byte in the window, the initial block
   or `$0500`, it is an owner question then.
2. Every emitter slot capped until S4b (above).
3. The armour hit's spark lands in the lowest non-blank cell of the column (a
   per-column lookup over the 8 rows), the module hit's in the module's bottom
   row at the shot's column (§5.13.2 item 5).
4. The region run is 16 of its 16 sectors (theme 2, band 3 + 3, charset 8);
   the boss entry 38 → 39 sectors.

**Owner questions (Phase A STOP):** (1) the look — the drafts and the four
composite frames; (2) the limit: option A (16 modules, plates ≤ 6 × 4 with the
draw queue and the deferred exposure) or B / C; (3) `gun-2` in an open bay,
firing from the first frame — or every cannon behind a plate (the fight then
opens silent for ~6–15 s with the bot).

#### 5.15.6 The owner's answers to Phase A (2026-10-04)

| # | Answer | Applied in |
| ---: | --- | --- |
| 1 | **The look is approved as drafted**; build on it. The owner retouches the art later through the preview pipeline | Phase B: the drafts move into `region-1/` |
| 2 | **Option A**: 16 modules, plates up to 6 × 4 (≤ 24 cells), with the **one-module-per-frame draw queue** and the **exposure check one frame after the kill**; both recorded with their measured cost (§5.15.7); the per-frame work limit stays **7,000 native** | converter, slot A, slot C |
| 3 | **The open-bay cannon (`gun-2`) fires from the first frame of the fight** | region 1's layout |
| 4 | **No escort Light in region 1's boss sector.** No wave is freed and no byte is spent on it; the decision "at most one Light" in the boss sector (§1.1) is satisfied by **zero** here; the escort item leaves this session's tests | — |
| 5 | **The central weapon placement (columns 23–46) is accepted for region 1.** Later regions are designed **for the player**: when a layout needs it, the sweep bot's reach is widened (a stale-scenario fix, class (a)) rather than the layout bending to the bot | S5 |
| 6 | **Every emitter slot is capped until S4b** | slot C |

#### 5.15.7 As built (Phase B, 2026-10-05, `OWNER-SMOKE CANDIDATE`)

Implemented as §5.15.1–5.15.6 describe, under decisions H–K and the owner's
answers; S4a-ii's scope (§5.13.7) is in this session. Figures MEASURED from the
linked images, the regenerated evidence or a named 6502-harness test; load
figures EMULATOR. Region 1's art is the approved agent-drawn placeholder
(decision G); hit points, reloads and the bonus are placeholders (M8).

**What was built.** Region 1 is the fortress (the drafts moved into
`region-1/`; the S4a-i core boss into `boss-regions/bastion/`, the engine's
style-2 fixture and a later region's boss). The converter takes modules up to
6 × 4 (24 cells), the 19-cell extras strip (spark, deflection, muzzle flash,
the hole frame's five cells, capped ×3, nozzles 3 + 3, blasts 2), and refuses
a palette the flash would push out of its hue. Slot A gained the cell-flash
ring (8 records; a spark on a damaging hit, a deflection on a hull or covered
hit, the muzzle flash; a redraw lifts and relays a module's records, so a
spark outlives a stage change), the one-frame band flash (the DLI reads a
4-byte shown palette), three channel-3 ticks with the engine bed back after
two frames, the PULSE spawn into the shared hostile pool (centre column, band
bottom edge, straight down, even HPOS, a full pool drops it; salvo offsets
−1 / 0 / +1), the nozzles' phase copy and their dark phase at the defeat, the
hole draw mode, the draw queue and a column rebuild from the modules behind
the dead one. Slot C gained the deferred exposure over a list of the modules
still hidden, the salvo burst, every emitter slot capped until S4b, and
`boss_prepare` (moved from slot A, `BOSS_C_ASM`, the plan's slot-A lever).

**Deviations and findings, each reported:**

1. **A real defect found by the trace, fixed in this session**
   (`0ba7b5d`): the player's post-hit damage cooldown is counted down only by
   the capital UPDATE (`update_broadside`, slot A), which the boss overlay
   replaces. In the boss sector it froze: MEDIUM entered the fight at
   cooldown 9 and took no damage for the whole fight; EASY and HARD took one
   hit and froze at 25. The boss's UPDATE counts it down now (test RED on the
   previous build). Invisible before this session: nothing could hurt the
   player in a boss sector.
2. **Cannons 12 → 14 HP** (data): the first trace measured MEDIUM at 42.8 s
   with 12, under decision I; 14 measured 47.1 s.
3. **The draw queue merges a module's entries** (a hole supersedes the
   module's queued draws, a second stage adds into the queued one) and **skips
   its draw on a kill frame and on the exposure frame**: without both, the
   stress drive filled the queue and forced draws onto the heaviest frames.
4. **The exposure check walks a list of the modules still hidden** (cc65:
   ~90 native a module a loop; the 16-module pass cost 1,939 on its frame).
5. **The hit's spark is relaid after a redraw**, not expired as §5.13.2
   item 5 said: expiring would erase the spark of the very hit whose stage
   change is drawn that frame.
6. **After the defeat a shot is spent without feedback** (the chain owns the
   band); during the fight every shot that meets the band gives one.
7. **The stress pin's margin is thin**: Q-B6's drive (five shots on one cell
   every frame, beyond any real fire: a burst is 9 frames apart) measures
   **6,707 native** on the fortress (limit 7,000); the core-boss drive 5,286.
8. **The bot loses no life**: a PULSE hit costs 1 of the player's 10 health
   units (`ENEMY_PULSE_DAMAGE_UNITS`, resident, not boss data). The bot took
   2 / 3 / 7 hits on EASY / MEDIUM / HARD. More threat for a non-dodging bot
   needs ~3× the fire rate or a damage rule — an owner question, not tuned
   here.
9. **Slot A's head room is 87 B** (1,961 of 2,048): S4b's lasers (+366, §5.13.6)
   need the next once-per-entry ASM out of slot A first (the head's region
   reads, 171 B, are the remaining candidate) or the queue's merge (193 B in
   all) simplified.
10. **The boss entry is 48 sectors** (S4a-i 38; §5.13.4 budgeted 51): slot A
    16 sectors (was 9), slot C 13 (was 11), the charset 8 (was 7).
11. **Harness**: `shootAt` aims inside a cell that shows only one colour clock
    at the window's edge (class (b): the fortress puts modules there; S4a-i
    never did).

**Bytes, part by part (slot A, MEASURED from `build/boss.lbl`):**

| Part | S4a-i | Now |
| --- | ---: | ---: |
| head + vector image | 39 | 39 |
| head reads + run table | 171 | 171 |
| boss DLI + HSCROL/LMS publish | 159 | 159 |
| motion and the win's shake | 79 + 32 tables | 79 + 32 tables |
| UPDATE: shots, hit dispatch, feedback dispatch, chain blast | 115 | 257 |
| after a hit: stats, score/kill, queue entries, open looks | 146 | 130 |
| record offset, draw (look / fill / add / hole), look read | 110 | 155 |
| column map: front, base, rebuild | 165 | 183 (`boss_prepare`: slot C) |
| fire: spawn + muzzle | — | 107 |
| feedback: timers, flash, tick, tones | — | 125 |
| cell-flash ring | — | 202 |
| draw queue | — | 193 |
| nozzles | — | 105 (+ 22 in slot C) |
| hand-off | 21 | 21 |
| **slot A** | **1,033** | **1,961 of 2,048** (87 free), 16 sectors |

| Home | §5.13.6 price (end of S4a-ii) | S4a-i | Now |
| --- | ---: | ---: | ---: |
| slot A | 1,652 → 1,980 budgeted | 1,033 | **1,961** |
| slot C | ~1,320 → 1,620 | 1,448 | **1,748** (code 1,391, rodata 10, `boss_prepare` 206, BSS 141), 13 sectors |
| install run | ~350 → 384 | 346 | **346** |
| scratch page | ~140 | 152 | **237 of 256** (map 64, ring 48, queue 24, candidates 16, slot A state 85) |
| slot B | 768 | 768 | **768** |
| region 1 charset | ≤ 1,024 | 840 B, 98 codes, 7 sectors | **978 B, 114 codes, 8 sectors**; the region run 16 of 16 (632–647) |
| window / reader / `$0500` / initial block | 0 | 0 | **0 each** (window 1,316 free; reader 29 free, its directory's boss-code count 9 → 16; `$0500` 115 free; initial block 13,621 B) |

**Timing and gameplay (regenerated evidence):**

| | `main` (S4a-i) | Now | Source |
| --- | --- | --- | --- |
| worst fence margin | 1,370 (`2-evasive-fire3` f287) | **1,370**, the ten worst rows `main`'s value for value | fence scan of the replay CSVs (`scripts/pal-timing-audit.mjs`), boss-entry and boss rows apart |
| boss frames: worst fence / DMA-on | 13,493 / 28,079 over 13,076 | **12,525 / 28,457** over 11,958 | same |
| — by case | — | boss shots in flight 12,525 (10,358 frames); none in flight 14,231 (952); 3+ player shots 13,295 (4,064); the chain 13,769 (448); the hold 19,609 (200); no escort (owner answer 4) | same |
| boss per-frame work, native (Q-B6 7,000) | 5,021 | **6,707** (fortress, five shots a frame); 5,286 (core-boss drive) | `tests/boss-fortress.test.mjs`, `tests/boss-runtime.test.mjs` |
| DMA-on maximum | 31,237 | **31,237** (same row) | `docs/runtime-wall-trace.json` |
| fence misses / DLI violations | 0 / 0 | **0 / 0** | same |
| gameplay before the boss | — | **63 of 63** replay CSVs identical to `main` on 326 gameplay columns, frame by frame up to the boss entry (entry frames 9,734 / 8,787 / 7,877 as on `main`) | trace CSVs of both builds |
| the fights, EASY / MEDIUM / HARD (bot, held lives) | 2,353 / 2,871 / 3,682 frames | **1,847 / 2,353 / 3,557 frames (36.9 / 47.1 / 71.1 s)**; hits taken 2 / 3 / 7, lives lost 0 / 0 / 0 | same |
| boss entry (EMULATOR) | 38 sectors, 146 host frames | **48 sectors, 184 host frames (3.7 s)** | same |

**Tests and artifacts.** RED → GREEN: `tests/boss-fortress.test.mjs`, 19 tests
RED on `main`'s build (`78beb36`) and the cooldown test RED on `699400b`'s,
all 20 GREEN; the re-pointed boss suites (each change says why in its file).
`npm test` on the default build: **1,054 tests, 1,053 pass, 1 fail —
`preview`, the recorded one**; the other recorded name ("ten heaviest frames
retain exact clock positions…") passes, as on `main`. Default ATR
`c9168624a023dc4f1a063c18e89e76dbd32c28dfd286c01aced268b8464ef093`, boot
`b84ab9dbd4355ae86644b8bd98cdfd3959e76e273a2a81d7554f4e12f64d7ce2`; the
debug-route ATR that starts in level 1's boss sector
`build/level-1-s4/void-strike-65.atr`
`1c79ad0db46c01d9a892d85997843c8de5015c6f40d3f8691f0cc4a410333c0c`.

#### 5.15.8 Decision L: a destroyed module disappears (2026-10-05, after the owner's smoke)

The owner's smoke found the fight good, with one change before merge: the hole
frame's glowing rims hung tall empty frames under the hull and hid the cannons
they had just exposed. **Decision L (§1.6)** supersedes decision J's lit edge.

**As built.** `modules.json` names per module **`cavityRows`**: how many of its
top rows lie inside the hull's silhouette (default 0 for armour, the full
height for a weapon). Region 1: every plate and both cowlings hang below the
hull (0); the four cannons and the emitter sit inside it (2). The core boss
(Bastion): its guns and emitter hang below the hull bar (0), its plates sit in
the bar's bottom row (1), its core inside it (2). The converter packs
`cavityRows` into the module record's height byte (bits 4-7; the 12-byte
record is full) and emits one **cavity** code (`extras.png` cell 3, drawn
blank: the band background, so a destroyed cannon reads as a plain dark
cavity in the hull); slot A's gone draw writes the cavity on those rows and
background below. No outline is drawn; a gone draw writes only the module's
own cells, so nothing frames a neighbour, and a cannon exposed by a fallen
plate shows whole (tests/boss-fortress.test.mjs, "decision L": committed RED
at `ff4d58a` against the branch's build before decision L, GREEN on `c2a574e`).

| | Before (decision J) | Decision L |
| --- | --- | --- |
| extras strip | 19 cells (the hole frame's 5) | **15 cells** (one cavity, blank) |
| region 1 codes / charset | 114 / 978 B, 8 sectors | **109 / 938 B, 8 sectors — 5 codes freed** (the five rim glyphs) |
| core boss codes / charset | 100 / 856 B | **95 / 816 B** |
| slot A | 1,961 B | **1,963 B** (85 free) |
| boss per-frame work (stress drive) | 6,707 | **6,676** native |
| boss frames: worst fence / DMA-on | 12,525 / 28,457 | **12,523 / 28,457** (the chain's worst 13,769 → 13,713: the gone draw writes a constant where the frame was) |
| the fights, the ten worst fence rows, gameplay before the boss | — | **unchanged**: the same frame counts (1,847 / 2,353 / 3,557), `main`'s ten worst rows, 63 of 63 replays identical to `main` up to the boss entry |
| ATR / boot SHA-256 | `c9168624…` / `b84ab9db…` | **`af0180b356ec33bf9ec425a74e3f294f7a9dc8f41c35624c28f4cbe4fe423601`** / **`b84ab9db…`** (unchanged: no sector count moved) |
| debug-route ATR (boss sector) | `1c79ad0d…` | **`045787b36d0c698791b8708629e7753905431109cb5ef446d42353916d8a9d05`** |
| `npm test` (default build) | 1,054 / 1,053 / 1 | **1,056 / 1,055 / 1**: `preview` (recorded) |

Art note for the owner's retouch: the X-braced girders and the open bay's wall
strips are hull art, not modules, so they now stand alone below the hull line
once their plates are gone.

### 5.16 Boss readability — shots up to the boss, the skeleton that does not block, covers that match the art (2026-10-05, `fix/boss-readability`: Phase A the diagnosis and the price; Phase B built §5.16.6; decision N §5.16.7; decision O §5.16.8, `OWNER-SMOKE CANDIDATE`)

Under owner decision M (§1.6). **Phase A only**: no source, cfg, script, test,
asset or evidence byte is changed on the branch; the probe below was built into
`build/level-1-s4/`, measured, saved as `build/probe-artifact/option-a-probe.patch`
(not committed) and reverted; the variant was rebuilt clean afterwards
(`045787b3…`, the recorded debug-route ATR).

**Step 0.** `main` `a55d2a5` (decision L, §5.15.8; the fortress commits are on
`main` linearly - the `feat/boss-fortress-r1` ref itself no longer exists), tree
clean, one worktree; ATR `af0180b356ec33bf…`, boot `b84ab9dbd4355ae8…`. Branch
`fix/boss-readability`. Baseline as STATUS records it, with one difference from
the brief: slot A is **1,963** B after decision L (STATUS, §5.15.8), not 1,961.

#### 5.16.1 The artifacts

**Boss sector — reproduced, root cause found (MEASURED, 6502 harness on `main`'s
linked bytes, `build/probe-artifact/stale-spark.probe.mjs`).** A kill rebuilds the
column map at once, but the dead plate's gone draw waits in the draw queue (the
kill frame and the exposure frame skip their draw, §5.15.7 item 3). A shot that
meets the dead plate's column in that window is a **hull** hit, and the hull's
deflection is placed on "the column's lowest drawn cell" - which is still the
dead plate's broken glyph. The ring record saves that glyph with tag `$FF` (no
module); the queued gone draw then writes background over the cell but lifts
only records tagged with its own module; two frames later the ring restores the
saved broken-plate glyph. A **torn plate fragment stays hanging below the hull
for the rest of the fight.** Frame by frame on plate-a's cell (12, 6): kill frame
spark 70 (saves 52) → +1 nothing drawn → +2 the spark restores 52, the next
shot's deflection 71 saves 52, the gone draw writes 0 → +4 the ring writes 52
back. Reproduced for plate-a, plate-b, plate-h and cowl-left (any plate with no
module behind it) whenever the next shot lands one frame after the kill; plate-c
(gun-1 behind it) is clean. Writer: `boss_ring_restore` (slot A), cause in
`boss_hit`'s hull branch (`src/hybrid/boss.s`, the 8-row scan) and
`boss_ring_rebase` (records lifted by tag only). **Nothing in the initial block,
the window, the reader or `$0500` is involved.**

**Fix (Phase B).** The hull's deflection goes on the column's **hull stop cell**
- the lowest non-blank cell of the hull's own rows that is no module's
(decision M's stop cell, from a per-column table the converter computes) - so it
can never land on a module's cell, which only that module's draws write; the
8-row scan goes (slot A −8 B net with option a below). Frame placement:
unchanged (the deflection on the hit frame, its restore 2 frames later).

**Boss sector — a second, smaller artifact (source reading, not hit by the
bot).** A player shot in an OPEN column (open sky beyond the hull ends, columns
4-5 / 58-59 at the travel's extremes) flies on hidden until `update_fighter_projectiles`
frees it at `GAMEPLAY_TOP + 6`; on its last one or two frames
`initialize_projectile_screen_pointer` (`src/main.s:4572`) draws it on the
**divider row**, which the boss sector renders in the **region's** charset
(install step 1, `src/hybrid/boss.s`, only codes 0-6 copied): the shot's code
11-46 shows as a piece of boss art above the band. Fix: the boss frees a shot
that leaves the band's top (part of option a, 6 B in slot C).

**Capital sector — not reproduced as stray bytes; same cause as the boss: NO.**
A focused trace of `main`'s debug-route build starting in level 1's capital
sector (`build/level-1-s1/`, 1,800 frames, the trace's per-write screen logger
`DFTRACE_FIRST_WRITER_OUTPUT` and a screenshot a frame) shows 14 frames where a
player shot shares a cell with a broadside shell (frames 113-114, 542-543,
716-717, …); every one unwinds last-in-first-out exactly (shot restore at
VCOUNT ≈ 228 gives the shell glyph 126/127 back, the shell's own erase at ≈ 248
its backing), and the trace's orphan counters (player shot, hostile shot,
broadside cells, effects) are 0 on every capital frame, here and in the three
committed `director-complete-*` replays. What the player **sees** there: the shot's
cell is opaque, so for one or two frames the shot replaces **half the shell**
(a black cell with the shot's two dashes where the shell's left or right half
was). That is the shot drawing over the shell, not a defect in the erase path,
and it does not exist in the boss's band (shots are not drawn there). If the
owner's recording shows something else in the capital sector, a frame of it is
needed to go further; level 1's capital sector has no Light, so its only
"enemy shot" is the broadside shell.

#### 5.16.2 Shots up to the boss — the options

| | **a. shots drawn in the band (recommended)** | b. band height follows the lowest intact row | c. PMG players P1/P2 over the band |
| --- | --- | --- | --- |
| what the player sees | every player shot visible up to the cell that stops it (the stop cell gets the spark); behind a non-blank cell (a girder stub, the hull strip under a recessed cannon) it is hidden for that frame | shots visible only below the band's lowest drawn row; region 1's plates reach row 7 until cowl-left, c, d, f, g, h and cowl-right are all gone, and the defeat needs only c, d, f, g - **the band stays 8 rows for most or all of the fight**; shots still vanish inside the band in every gap | every shot visible over the art, exact pixels, the gameplay yellow; **at most two different x in the band at once** (the spread volley's three: one hidden; a rapid stream while moving: two) |
| bytes, where | slot A +67 → **2,030 / 2,048 in the probe** (the column map's upkeep and the restore; Phase B moves the upkeep into slot C: slot A ≈ +10); slot C +227 → **1,975** (14 sectors, the boss entry +1 sector); scratch +12 → 249 / 256; region charset: **4 codes** (124-127, 109 → 113 of 128) and a 32-B hull-stop table in the run's unused tail (938 B → ≤ 1,024, 8 sectors, unchanged) | ~80 B slot A (DL rewrite at a frame edge, the DLI's row moves, ring rows revealed); 0 codes | ~110 B slot C, 0 codes, 0 RAM (PMG memory exists); `COLPM1/2` set at the install and restored by Q-S4 |
| per frame, five shots | **MEASURED**: the Q-B6 drive (five hits a frame on every reachable module) **6,873** native (`main` 6,676); with five in-band restores also charged to that frame (a case real fire cannot make) **7,023**; five shots flying in the band, no hit **4,902** | ~0 (only on a change) | ~200 (ESTIMATE) |
| DLI / DMA | none / none; the cells are written in UPDATE as the spark is | the band DLI's row moves; risk of DLI phase desync (the DL switch rule) | none / none (player DMA already on) |
| S4b lasers | missiles untouched; the laser's "retire the shots" is the same logical test; the ring and the queue are untouched (a shot is drawn only into a blank cell and restored only while it still shows a shot) | missiles untouched | missiles untouched; P1/P2 are free in the boss sector (no Heavy); `PRIOR $10` does not affect players |
| meets decision M | yes | no | yes, except spread |

**Recommendation: a.** It is the only option that shows every shot up to the
cell that stops it under every booster, and it is the shape decision M's
collision needs anyway (the stop cell per column). **Probe MEASURED** on the
debug-route build, the 6502 harness and the emulator:

* the collision moves to the stop cell: per column a stop line (the front
  module's bottom row; else the hull's lowest own-row cell that is no module's,
  from the converter; else none) kept beside the column map and rebuilt with it;
  a shot meets its column with one compare;
* `flight.probe.mjs`: plate-c gone, a shot in column 24 is drawn in rows 7, 6, 5,
  4, hidden behind the row-3 hull strip, and hits gun-1 at row 2 (HP 14 → 13);
* `stale-spark.probe.mjs`: the artifact case is clean on the probe;
* the emulator (`2-sweep-fire2` on the probe ATR, 1,800 frames): 0 fence misses,
  the fight proceeds (score events at frames 356-1,167, seven of them, against
  `main`'s eight at 356-1,283 over the same 1,800 frames; the fight's length is
  Phase B's to measure).

**The pin is tight**: 6,873 on the Q-B6 drive leaves 127 cycles, and 7,023 if a
frame restores five drawn shots and resolves five hits together (not producible
by real fire: a burst is 9 frames apart, a spread volley 3 shots). Phase B
reduces it (the restore folded into the shot loop, the in-band test before the
pointer work) and STOPs if the measured Q-B6 figure exceeds 7,000.

**For the owner** (questions, §5.16.4): the in-band shot shows in the band's
COLPF2 (amber `$28`) unless its glyph is remapped to COLPF0 (light steel `$0A`)
at the install (0 bytes more); and a recessed cannon (gun-1, the emitter, gun-3)
has a hull strip in row 3 under it - with the front-module rule its shots pass
behind that strip (hidden one frame) and hit the cannon; the stricter reading of
decision M (the hull's row 3 stops them) would make those cannons unhittable
unless a port is cut in the art under each.

#### 5.16.3 The cover audit (region 1, the converter's geometric masks)

| Cannon | Cells | Cover mask | Columns and what visibly stands in front | Finding |
| --- | --- | --- | --- | --- |
| gun-1 | 23-25, rows 1-2 | plate-c | 23-25: plate-c | consistent |
| gun-2 | 26-28, rows 2-3 | none (open bay) | - | consistent |
| emitter (capped) | 30-33, rows 1-2 | plate-d | 30-33: plate-d | consistent |
| **gun-3** | 38-40, rows 1-2 | **plate-e + plate-f** | **38-39: plate-e only; 40: plate-f only** | **inconsistent per column**: after plate-f falls, column 40 shows gun-3 but every hit there is absorbed (plate-e alive) and its housing stays closed; after plate-e falls first, columns 38-39 do the same |
| gun-4 | 44-46, rows 2-3 | plate-g | 44-46: plate-g | consistent |

No cannon cell stays drawn as covered once its whole mask has fallen (the open
look is queued at the exposure; decision L's test shows gun-1 whole). **The
cannon the owner most likely saw is gun-3**: one of its two plates fell, part of
it showed in its closed housing and did not react. Phase B options: (i) gun-3's
cover becomes per column (needs a per-column cover rule: the column map already
answers it - a module is exposed in a column when nothing in front of it is
alive there), or (ii) the layout moves plate-e/plate-f so one plate spans
38-40, or (iii) the closed housing gets a cracked-open look per fallen plate.
Recommended: (ii), data only.

#### 5.16.4 Owner questions (Phase A STOP)

1. **Shots up to the boss**: option a (recommended), b or c.
2. **The in-band shot's colour**: amber (the band's COLPF2) or light steel (COLPF0).
3. **Recessed cannons behind the row-3 hull strip** (gun-1, emitter, gun-3):
   the front module's bottom row is the stop (the shot passes behind the strip,
   recommended) - or the strip stops shots and the art gets a port under each.
4. **gun-3's cover**: (ii) one plate spans its columns (recommended), (i) or (iii).
5. **The girders' new length**: hull line + 1 row (row 4) or + 2 rows (rows 4-5).
6. **The capital sector**: the shot's opaque cell over a shell (what the trace
   shows) - leave it, or let the player shot draw composite over a shell (the
   spread shot's composite path for every shot over a shell cell: +~15 B in a
   resident segment, a resident-byte question).



#### 5.16.5 The owner's answers to Phase A (2026-10-05)

| # | Answer | Applied in |
| ---: | --- | --- |
| 1 | **Option a**: the player's shots are drawn inside the band up to the cell that stops them; a shot that leaves the band's top is removed (the divider-row artifact goes with it) | slot A, slot C, the converter |
| 2 | **The shot keeps the playfield's colour** in the band if it can; it cannot match exactly (the playfield shot is `$1E`, the band's colours are region-1 data), so **the closer of amber `$28` and light steel `$0A` - light steel** (RGB distance on `scripts/preview.mjs`'s palette 118 against amber's 187) | the install's glyph copy |
| 3 | **Option A**: shots pass behind the row-3 strip and hit the cannon above; recorded as **decision M1** | the collision rule (the front module first) |
| 4 | **gun-3: (ii)** - the plates move in the data so one plate covers all of gun-3's columns; no code change; the cover audit re-run after | region 1's drafts |
| 5 | **Girders: the hull line plus one row** | region 1's drafts |
| 6 | **The capital sector's opaque shot cell over a shell stays**; recorded as **decision M2** | — |
| — | **The pin**: the boss stays within 7,000 native as briefed, without trading code clarity for the last cycles; if trimming cannot keep the measured stress case there, the figures are reported. The pin is reviewed in S4b against the measured boss-frame margins | Phase B |

#### 5.16.6 As built (Phase B, 2026-10-05, `OWNER-SMOKE CANDIDATE`)

Implemented as §5.16.2's option a under decisions M, M1, M2 and the answers of
§5.16.5. Figures MEASURED from the linked images, the regenerated evidence or a
named 6502-harness test; load figures EMULATOR.

**What was built.**

* **The collision moves to the stop cell.** Per band column a **stop line** -
  the line under the cell that stops a player shot: the front intact module's
  bottom row, else the hull's own stop row, else 0 (open sky) - lives beside
  the column map in slot C's BSS (64 B, with a 16-B table of each module's
  bottom line) and is rebuilt wherever the map is. In UPDATE a shot inside the
  band (`boss_shot_meet`, slot C) meets its column with one compare; until
  then it is **drawn into its cell when the cell is blank** and passes behind
  anything drawn (decision M1's strip, the girder stubs, the row-4 pieces);
  past the band's top it is removed. Last frame's cells get the blank back
  only while they still show a shot (`boss_shots_restore`).
* **The shot's look**: four region codes after the nozzle codes (horizontal
  phase 0 / 2, vertical phase 0 / 2 - the pair repeats every four lines),
  the playfield PlayerFighter glyphs from `assets/graphics/fighter-weapons.json`
  with colour 3 moved to **COLPF0, light steel `$0A`** (answer 2).
* **The hull's own rows** (`hullRows` in `modules.json`, region 1: 4): the
  converter computes per column the lowest non-blank cell of those rows that
  is no module's, packed a nibble a column into the look tail (32 B); a column
  is ARMOUR only where such a cell exists. **The hull's deflection lands on
  that cell** - never on a module's, so no module's queued draw can take a
  cell the ring holds: **the stray plate glyph of §5.16.1 is gone**.
* **Region 1's drafts** (answers 4, 5): the girders end one row under the
  hull line; the bay's wall strips are removed; **plate-e spans 36-40** (5 × 4,
  10 HP: the size rule) and **plate-f 41-42** (2 × 4, 6 HP), so gun-3's cover
  is plate-e alone.

**The cover audit, re-run** (`tests/boss-readability.test.mjs`, "every
cannon's cover is exactly what stands in front of each of its columns", and
"every cannon is drawn whole and hittable in every column once its cover
falls", both on the built bytes):

| Cannon | Cells | Cover mask | In front of each column | Finding |
| --- | --- | --- | --- | --- |
| gun-1 | 23-25, rows 1-2 | plate-c | 23-25: plate-c | consistent |
| gun-2 | 26-28, rows 2-3 | none (open bay) | - | consistent |
| emitter (capped) | 30-33, rows 1-2 | plate-d | 30-33: plate-d | consistent |
| gun-3 | 38-40, rows 1-2 | **plate-e** | **38-40: plate-e** | **consistent** (was e + f, per column inconsistent) |
| gun-4 | 44-46, rows 2-3 | plate-g | 44-46: plate-g | consistent |

**Deviations and findings, each reported:**

1. **The shot glyphs come from the converter, not the install**: the first
   build copied them from the gameplay charset at the install (the probe's
   way); the 6502 harness's image has no gameplay charset there, and the
   converter route costs no slot-C code. The draft loader carries them, so the
   build, the preview and every test compile the same bytes.
2. **Vertical phases 0 and 2**, not 0 and 4 as the probe had: the PairShot
   glyph's dash pair repeats every four lines, so 0 and 4 are the same glyph.
3. **The trace's debug-route bot never fires in the boss sector when it holds
   FIRE from frame 0** (`gameplay_fire_gate` opens only on a released
   trigger; the boss entry runs before the bot's first released frame) - a
   scenario property of `director-complete-*` on a `build/level-1-s4/` run,
   not a production defect; Phase A's boss-sector trace used `2-sweep-fire2`.
   No clause depends on it.
4. **The uncharged stress case**: the Q-B6 drive (five hits a frame on every
   reachable module) measures **6,876** native; if a frame also restored five
   in-band shots drawn the frame before - which real fire cannot produce: at
   most three player shots are ever in the band at once (a spread volley),
   and a burst's shots are 9 frames apart - it would be **7,046**
   (`build/probe-artifact/stress.probe.mjs`, not committed). Reported, not
   gated (the owner's pin note, §5.16.5).

**Bytes, by home (MEASURED, `build/manifest.json`, the generated memory map):**

| Home | Decision L (`main`) | Now | Limit |
| --- | ---: | ---: | ---: |
| slot A | 1,963 | **1,995** (53 free) | 2,048 |
| slot C | 1,748 (13 sectors) | **2,003** (code + rodata + ASM 1,782, 14 sectors; BSS 221) | 2,048 |
| scratch page | 237 | **249** | 256 |
| install run | 346 | **346** | 384 |
| slot B | 768 | **768** | 768 |
| region 1 charset | 938 B, 109 codes, 8 sectors | **994 B, 112 codes**, 8 sectors (region run 16 of 16) | 1,024 B, 128 codes |
| initial block / window / reader / `$0500` | 13,621 / 1,316 free / 29 free / 115 free | **unchanged** | 13,652 / - / - / - |
| boss entry (EMULATOR) | 48 sectors, 184 host frames | **49 sectors, 188 host frames (3.8 s)** | - |

**Timing and gameplay (regenerated evidence):**

| | `main` (decision L) | Now | Source |
| --- | --- | --- | --- |
| worst fence margin | 1,370 (`2-evasive-fire3` f287) | **1,370**, the ten worst rows `main`'s value for value | fence scan of the replay CSVs (`scripts/pal-timing-audit.mjs`'s samples), boss and boss-entry rows apart |
| boss frames: worst fence / DMA-on | 12,523 / 28,457 over 11,958 | **11,281** (`director-complete-2` f9755) **/ 28,683** over 11,626 | same |
| boss per-frame work, native (Q-B6 7,000) | 6,676 (fortress), 5,289 (core-boss drive) | **6,876** (fortress), **5,516** (core-boss drive) | `tests/boss-fortress.test.mjs`, `tests/boss-runtime.test.mjs` |
| DMA-on maximum | 31,237 | **31,237** (the same pre-boss row) | `docs/runtime-wall-trace.json` |
| miss events / clause failures | 0 / 1 | **0 / 1, the same** (`lower-playfield-hostile-contact-atr-hard`) | same |
| gameplay before the boss | - | **63 of 63** replay CSVs identical to `main` on 331 gameplay columns, frame by frame up to the boss entry (entry frames 9,734 / 8,787 / 7,877 as on `main`) | trace CSVs of both builds |
| the fights, EASY / MEDIUM / HARD (bot, held lives) | 1,847 / 2,353 / 3,557 frames (36.9 / 47.1 / 71.1 s); hits 2 / 3 / 7; lives lost 0 / 0 / 0 | **2,010 / 2,358 / 3,307 frames (40.2 / 47.2 / 66.1 s)**; hits taken **1 / 4 / 3**; lives lost **0 / 0 / 0** | same (rows in the fight phase; the evidence's engaged→defeated count is one frame less) |

MEDIUM stays inside decision I's 45-60 s with no tuning. EASY is longer (the
shots fly to their stop cells instead of hitting at the band's edge); HARD is
shorter (gun-3 needs plate-e's 10 HP instead of plate-e's 8 and plate-f's 6).

**Tests and artifacts.** RED → GREEN: `tests/boss-readability.test.mjs`, 12
tests, 10 RED on `main`'s build (`566f243`; green there by nature: every cannon
hittable once its whole cover is down, the charset budget), all 12 GREEN on
`a0ac18e`. Re-pointed (`fefe576`, each with its reason in the file, every
behavioural assertion still executed): the harness's and `boss-runtime`'s
`shootAt` (a test shot starts in its stop cell), `boss-fortress`'s hull-hit
row (the hull stop), gun-3's cover and the absorb path on an explicit-cover
copy of region 1, `boss-assets-v2`'s ARMOUR rule, `boss-runtime`'s patched
operands. `npm test` on the default build: **1,068 tests, 1,067 pass, 1 fail -
`preview`, the recorded one** (the first run also failed the three hash-bound
media tests, regenerated by their own tools in `999f490`; the other recorded
name passes, as on `main`). Default ATR
`0ce833f6a6bef587691d01cfec4ccb7611ecd3d19690ad33e1edcb90afe31d6d`, boot
`b84ab9dbd4355ae86644b8bd98cdfd3959e76e273a2a81d7554f4e12f64d7ce2` (unchanged);
the debug-route ATRs `build/level-1-s4/void-strike-65.atr` (level 1's boss
sector) `fd0eb82be9720f03c2a8ecaf77980f05cf6f5e4b2a1cdded32c6a0e0aa2e1e05` and
`build/level-1-s1/void-strike-65.atr` (its capital sector)
`066af2ff227e74f319e4d8a59cc7289825197d60e9a62fd471249d8553ee55e5`.

#### 5.16.7 Decision N: the open bay reads open, every plate in reach (2026-10-05, after the owner's smoke)

The owner's smoke of §5.16.6 found shots up to the boss, the girders and the
artifact fix good, and two issues on the boss's left (decision N, §1.6).

**The probe** (`build/probe-artifact/decision-n.probe.mjs`, not committed: the
6502 harness on the branch's linked bytes, every module and column, band
positions 0 / 16 / 32 / 48 / 63, a shot flown up from the band's bottom row).

*(a) Weapons, every plate intact - before and after alike:* only **gun-2**
takes damage, in each of its columns 26-28, at every position (no cover; the
column map's front module; nothing see-through involved). gun-1, the capped
emitter, gun-3 and gun-4: every shot into their columns hits the plate in
front (plate-c, plate-d, plate-e, plate-g) - the cover masks hold in every
column. **The first cannon from the left that takes damage is gun-2, the
open-bay cannon** (gun-1 lies further left but shows its closed housing behind
plate-c). Before the fix its bay was its own three columns, plate-c (22-25) and
plate-d (29-34) touching it: the player read them as its cover.

*(b) Armour, every column, shots until it dies:* in the engine **every plate
dies to exactly its hit points of shots in every column, nothing absorbed,
nothing passing by** - the far-left plates included. **The cause of finding 2
is reach, not the engine**: a player shot leaves the fighter's centre, so its
HPOS is 56-207 while the window starts at 48; band column c is in reach only at
band positions 4c - 175 <= p <= 4c - 21. cowl-left's columns 7-10 were in reach
at 8 / 12 / 16 / 20 of the 64 positions (the band passes p 0-7 for about
16 frames of every 252), plate-a's 11-15 at 24-40, cowl-right's 54-56 at
23 / 19 / 15; the director-complete bot's sweep (x 94-154) never reaches either
end.

**The fix (region 1's data only; no code byte):**

| | Before | After |
| --- | --- | --- |
| the open bay | gun-2's own columns 26-28, plates touching | **columns 25-29**: gun-2 (26-28) with a clear column each side |
| gun-1 / plate-c | 23-25 / 22-25 | **22-24 / 21-24** (plate-c still in front of all of gun-1) |
| plate-b | 17-21 (10 HP) | **17-20 (8 HP, the size rule)** |
| plate-d | 29-34 | **30-34** (still in front of all of the emitter) |
| cowl-left, cowl-right | modules (6 HP each), under the engine housings | **removed** - in reach at 8-20 and 15-23 of 64 positions; the housings end one row under the hull line |
| modules / region codes / charset | 15 / 112 / 994 B | **13 / 112 / 994 B**, 8 sectors |
| least-reachable armour column | cowl-left 7: 8 of 64 positions | **plate-a 11: 24 of 64** (every armour column in reach for at least a third of the travel) |

gun-2 still fires from the first frame (decision I; armed at the install). The
hull's module coverage falls from 45 to 38 of its 52 columns (the wider bay and
the cowls).

**Tests** (`tests/boss-cover-rule.test.mjs`, committed RED at `46490ec` on
`fa730db`'s build: the bay's plates touch gun-2; cowl-left column 7 in reach
at 8 of 64 positions; GREEN on `e72de60`): a standing cover holds in every
column at nine band positions; every weapon takes damage in every column once
uncovered; the open-bay cannon has nothing in front and an opening wider than
it with a clear column each side, armed from the first frame; every armour
column in reach for a third of the travel and dying to exactly its hit points
there; the column map agrees. Re-pointed (`41f3fc6`): the cowls in two lists,
and the hull's module coverage 45 → 36 (the wider bay). Preview:
`build/boss-preview/region-1.png` (`npm run boss:preview`).

**Measured (regenerated evidence):** gameplay before the boss **63 of 63**
replays identical to `main`; the ten worst fence rows `main`'s; boss frames
worst fence **11,653** / DMA-on **28,691** over 11,979; DMA-on maximum 31,237;
0 miss events, the one recorded clause failure; Q-B6 drive **6,678** native
(the fewer, smaller plates). The fights (bot, held lives): **2,010 / 2,711 /
3,307 frames - 40.2 / 54.2 / 66.1 s** on EASY / MEDIUM / HARD; hits taken **1 /
6 / 3**; lives lost **0 / 0 / 0**; MEDIUM inside decision I's 45-60 s with no
tuning (it lengthens because the bot's sweep now meets the narrower plate-b and
the moved gun-1 later). Bytes unchanged from §5.16.6 (slot A 1,995, slot C
2,003, scratch 249). ATR
`de4bb4f09407e3a7c328a40c2b11026069b12d887c4c5bb22425dc28a5a8223b`, boot
`b84ab9db…` (unchanged); boss-sector debug ATR `build/level-1-s4/void-strike-65.atr`
`1f8718b179f8e2a161baf56fa4810a865279bf712baddf2d29b28a03f68e9a35`, capital-sector
`build/level-1-s1/void-strike-65.atr` `c96ec5a54822ca61…`. `npm test` on the
default build: **1,074 tests, 1,073 pass, 1 fail - `preview`, the recorded one**
(the first run also failed the three hash-bound media tests, rebound by their
own tools in `e782048`).

#### 5.16.8 Decision O: every weapon in its own recess; M1 withdrawn (2026-10-05, after the decision-N smoke)

The owner's smoke of §5.16.7: the open bay reads better, but gun-2 still died
through something the player sees as solid - the hull's grey-and-burgundy lower
strip (row 3) runs at its base on both sides, so it reads as passing under the
cannon; the same strip lay directly under gun-1 and the emitter (row 3 below
their rows 1-2), under gun-3 only through plate-e's top row. **Decision O**
(§1.6) withdraws M1.

**What M1 was in the build.** No runtime code of its own: a shot stops at its
column's front module's bottom row (the stop line, §5.16.6), so hull cells
between the module and the band's bottom were skipped; and `hullRows: 4`
made every hull cell below row 3 see-through - the girder stubs, but also the
engine housings' row-4 cells (columns 6-10, 54-57) and gun-4's row-4 pieces
(43-48). **Removed from the data and the converter; 0 bytes in slot A or slot
C** (slot A 1,995, slot C 2,003, unchanged; the overlay's comments only):

* the converter: `hullRows` is gone; `seeThrough` names the only see-through
  hull cells - region 1's three girder stubs `[16, 4]`, `[35, 4]`, `[49, 4]`;
  every other hull cell stops a shot (the housings' row 4 and gun-4's
  remaining pieces now do); **it refuses hull art between a weapon and the
  band's bottom** (decision O), so the front-module stop can never skip
  solid art under a weapon again;
* the core-boss fixture (`bastion/`, a later region's boss): the converter
  refused its hull bar's row 5 under the core (27-30, 5); those four cells
  are cleared in its `band.png` and `open.png` (the core hangs in a recess).
  Its plate-right still has hull art under it (35, 6) - armour, outside
  decision O; for S5 to decide when the region is designed.

**The redraw (region 1's four band drafts):** row 3 cleared under gun-1
(22-24) and the emitter (30-33) and beside gun-2's and gun-4's bases (25, 29,
43, 47); gun-4's two row-4 pieces under it (44, 46) cleared. Each weapon now
hangs in a notch of the underside with the hull above it; gun-2's opening is
clear to the band's bottom (25-29, rows 4-7). The plates' positions and hit
points are unchanged; the silhouette is otherwise the same. 110 codes (two
glyphs freed), 978 B, 8 sectors.

**Tests** (`tests/boss-recess.test.mjs`, committed RED at `bdc98fd` on
`fcf5fe6`'s build - hull art at (44, 4) under gun-4, the strip at (25, 3)
beside gun-2's base, the housing's (6, 4) see-through, no refusal; GREEN on
`0bd5925`): no hull art between a weapon and the band's bottom; no strip
beside a base on the strip row; no see-through hull art but the girders, and
`hullRows` gone from the data; the converter's refusal; gun-2 takes damage only
through visibly empty cells, at three band positions. Re-pointed (`430dce3`):
M1's own test becomes the empty recess's (the shot drawn in row 3 up to
gun-1); the girder test reads `seeThrough`; gun-4's recess is empty;
`boss-assets-v2`'s ARMOUR rule by `seeThrough`.

**The probes, re-run** (`build/probe-artifact/decision-n.probe.mjs`, band
positions 0 / 16 / 32 / 48 / 63): with every plate intact **only gun-2 takes
damage** (columns 26-28, every position); gun-1, the emitter, gun-3 and gun-4
- every shot hits the plate in front (plate-c, plate-d, plate-e, plate-g), in
every column; once its plate falls each takes damage in every column
(`tests/boss-cover-rule.test.mjs`). **Armour: every column dies to exactly
its hit points, 0 absorbed, 0 passing**; reach per column, of 64 band
positions: plate-a 24-40, plate-b 48-60, plate-c, plate-d, plate-e, plate-f 64,
plate-g 46-64, plate-h 26-38.

**Measured (regenerated evidence):** gameplay before the boss **63 of 63**
replays identical to `main`; the ten worst fence rows `main`'s; boss frames
worst fence **12,984** / DMA-on **28,689** over 12,499; DMA-on maximum 31,237;
0 miss events, the one recorded clause failure. The fights (bot, held lives):
**2,302 / 2,429 / 3,562 frames - 46.0 / 48.6 / 71.2 s** on EASY / MEDIUM / HARD;
hits taken **1 / 4 / 7**; lives lost **0 / 0 / 0**; MEDIUM inside decision I's
45-60 s with no tuning (the lengths move because the housings' row-4 cells and
gun-4's pieces now stop shots, and a dead cannon's columns are open sky through
its empty recess). Preview `build/boss-preview/region-1.png`; composite of four
fight moments `build/boss-preview/region-1-composite.png`
(`build/probe-artifact/composite.mjs`, not committed). ATR
`4926dc05ecc047d226c8939cb48ecdc39d28fb089d986365272ad9797a5d40ff`, boot
`b84ab9db…` (unchanged); boss-sector debug ATR `build/level-1-s4/void-strike-65.atr`
`255fbc1920010041a6433fa8ffc29745260423483740822ff87bb69ddcaf9bfe`, capital-sector
`build/level-1-s1/void-strike-65.atr` `a89b2c44f4b6032c…`. `npm test` on the
default build: **1,079 tests, 1,078 pass, 1 fail - `preview`, the recorded one**
(the first run also failed the three hash-bound media tests, rebound by their
own tools in `804ae09`).

#### 5.16.9 Decision M on the raster (fix/smoke-2026-10-07 P1, 2026-10-08)

The owner's smoke after S4b: the player's shots vanished in the band's empty
rows under the turrets. **Cause, MEASURED** (the trace's first-writer log over
the band, `main`'s level-1-s4, 3,999 boss frames): UPDATE runs while ANTIC is
still fetching the band (row r on line 24 + 8 r); the in-band restore landed on
lines 45-61 and the draw on 60-86, `laser_frame` between them since S4b, so
rows 4 and 5 were almost never shown (261 of 262 and 283 of 296 draws) and row
3 lost 125 of 354 - a shot was seen in rows 6-7, then the spark on its target.
**Fix:** the restore and the draw move to SECTOR_COMPLETION
(`boss_shots_late`, slot E), after the band's last line; UPDATE keeps the
meeting. Every draw in every row is now shown, a frame later, as in the ring
below; decision M holds on the screen as well as in the band's memory. Slot A
2,045 → 2,042, slot C 1,992 → 1,880 (13 sectors), slot D 1,773 → 1,783, slot
E 102 → 266 (2 sectors); the boss entry stays 64 sectors. Cycles: +67 native a
frame with no shot in the band, +152 with five; the boss stress 7,982 → 8,434
of 8,500 (the S5 requirement above). The record:
[smoke-2026-10-07.md](smoke-2026-10-07.md) §1.

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
| **`$0C00-$1FFF`, unclaimed low RAM** (owner, 2026-10-03; §4.10): not window bytes, but a home for code that runs from a fixed address outside the window - the way the summary module now does at `$0500-$0BFF` — **S4a-i MEASURED: `$0C00-$18FF` is the boss's claim (Q-B5: charset 840 B, slot C 1,448 B, scratch 152 B); `$1900-$1FFF` (1,792 B) stays the lever** | **5,120** of RAM (**1,792** after S4a-i) | a link or record of its own; whatever lands there must be read or landed before its first use | 2 until the owner's 65XE smoke confirms `$0500-$0BFF` (`hardware-testing.md` §12) | **M**, EMULATOR only: never written after `start`, patterns `$5A`/`$A5`, BASIC on and off (`diagnostics/low-ram-0700-1fff-2026-10-03.md`); not used now |

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

**The boss redesign (2026-10-04, §5.13.6)** changes two rows of this table and
one of §6.3 without touching the window: slot A ends M5b at **1,652 → 1,980 B**
of 2,048 (2,480 at the spike's ×1.5 — the once-per-entry ASM moves to slot C
then); a new **slot C** in the boss's low-RAM claim `$0C00-$18FF` holds the C
controller and the laser C (~1,620 → ~2,430 of 2,048, growing into the claim's
spare if needed); slot B is 768 of 768; the disk takes 16 sectors a region from
632 (free sectors 509 → **445**, **269** after twelve levels); the boss entry
reads 42 → 51 sectors instead of 28. **S4a-i MEASURED (§5.14):** slot A
**1,033** of 2,048 (the C left; the run read is 9 sectors), slot C **1,448** of
2,048 (code 1,329, 11 sectors), scratch 152 of 256, install 346 of 384, slot B
768 of 768, region 1's charset 840 B in 7 sectors; the disk holds code 9 +
install 3 + slot C 11 in 528–583 and region 1 in 632–646; the entry reads
**38** sectors. **Fortress session MEASURED (§5.15.7):** slot A **1,961** of
2,048 (87 free, 16 sectors), slot C **1,748** of 2,048 (code 1,391 + rodata 10
+ `boss_prepare` 206, 13 sectors), scratch 237 of 256, install 346 of 384,
slot B 768 of 768, region 1's charset 978 B in 8 sectors; the disk holds code
16 (528–543) + install 3 + slot C 13 (547–559) and region 1 in 632–647 (16 of
16); the entry reads **48** sectors. **`fix/boss-readability` MEASURED
(§5.16.6):** slot A **1,995** of 2,048 (53 free; decision L had left 1,963),
slot C **2,003** of 2,048 (code + rodata + ASM 1,782, 14 sectors; BSS 221 with
the 80-B stop-line tables), scratch **249** of 256, install 346 of 384, slot B
768 of 768, region 1's charset **994 B, 112 of 128 codes** (the four shot codes
and the 32-B hull-stop table), 8 sectors; slot C 547–560; the entry reads
**49** sectors.

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
| disk, overlay runs from 512 | — | capital restore 16, boss code 16, boss regions 40, summary code 4, summary art 4 × 7 = 28, save record 1, attract 4 = **109** — **MEASURED after S2: summary code 12 (584–595), save record 599, art 600–627; 528–583 reserved for M5b; 117 with the attract stream**. **Spike: four regions at 12 sectors need 64 of the 56 reserved; with the once-only install as one shared 3-sector run, 16 + 3 + 4 × 9 = 55 (§5.11.4 item 8, Q-S6)**. **S4a-i MEASURED: 528–583 holds code 9 + install 3 + slot C 11 = 23 (sized runs, Q-B8); regions 16 each from 632 — region 1 uses 15 (632–646), 648–695 reserved**. **Fortress session MEASURED: code 16 + install 3 + slot C 13 = 32 of 56; region 1 uses 16 of 16 (632–647)**. **`fix/boss-readability` MEASURED: slot C 14 (547–560): 33 of 56; region 1 16 of 16** | sectors 512–631; speech would add 12–61; the hangar (item 18) is absorbed by the summary art |
| free sectors after twelve levels and every recommended item | 319 | **210** | |

### 6.4 Load time, by transition (frames at 3.77 per sector; EMULATOR; 1050 ×2; SIO2SD fast ÷3 ESTIMATE)

| Transition | Today | After M5 (standard speed) | SIO2SD fast (est.) | 1050 (est.) |
| --- | ---: | ---: | ---: | ---: |
| START GAME, first level of a session (summary code 4 + art 7 + level 13 + record 1) | 49 (1.0 s) | 94 (1.9 s), behind the summary screen | 0.6 s (not built: the fast loader is optional) | 3.8 s |
| transition after a boss (art 7 + restore 16 + level 13 + record 1) | — | 139 (2.8 s) + the write, behind the summary; a 3-s minimum display covers it | 0.9 s | 5.6 s (exceeds the minimum by ~2.6 s: `LOADING` stays up) |
| boss entry (code 16 + region 10), mid-level — **spike MEASURED: 28 sectors (code 16 + region 12), 107 host frames (2.1 s), EMULATOR, every entry** | — | 98 (2.0 s) behind the `WARNING` banner (**107**; **S3 MEASURED: 28 sectors, 108 host frames, 2.2 s**, behind `WARNING - BOSS APPROACHING`; **S4a-i MEASURED: 38 sectors — theme 2, code 9, install 3, slot C 11, band 3 + 3, charset 7 — 146 host frames, 2.9 s**; **fortress session MEASURED: 48 sectors — theme 2, code 16, install 3, slot C 13, band 3 + 3, charset 8 — 184 host frames, 3.7 s**; **`fix/boss-readability` MEASURED: 49 sectors (slot C 14), 188 host frames, 3.8 s**) | 0.7 s | 3.9 s (**~4.3 s**) |
| return to the menu | 0 | 0 (the frontend stays resident) | 0 | 0 |

### 6.5 Cycles and DMA, by row family

| Row family | Today | After M5 | Basis |
| --- | ---: | ---: | --- |
| binding ELITE row (fence margin) | 1,439 | ~1,349 (the vectored calls ~30 and the shots scan 60 — IC); DMA-on ~31,223, over the 31,200 target by ~23, under the hard gate — **S3 MEASURED 1,370** (S2 1,378; the Light kernel 128 B higher); **DMA-on 31,237** | §4.1, §4.8.2 (Q13), §5.12 |
| capital frames (no fence; maximum 30,568) | 30,568 | ~30,630 (+3 per vectored call, ~20 per frame) | IC |
| boss frames, worst with one Light, scroll stopped (decided, Q1) | — | **1,178 over GO**; DMA-on ~30,330 — **spike MEASURED: worst fence margin 10,103 over 58,181 boss frames (0 misses), ~6,500 composed worst (ESTIMATE); DMA-on 29,219**; **S3 MEASURED (no lasers): 16,089 over 11,171 boss frames, DMA-on 28,008; native work 2,760 worst**; **S4a-i MEASURED (the layered engine, no fire yet): 13,493 over 13,076 boss frames, DMA-on 28,079; native work 5,021 worst (Q-B6: 7,000)**; **fortress session MEASURED (pulse fire, sparks, flash, nozzles, no escort): 12,525 over 11,958 boss frames, DMA-on 28,457; native work 6,707 worst (the stress drive)** | §5.4, §5.11.2, §5.12 |
| boss frames, worst with one Light, scroll kept (not taken) | — | −367 (under GO); DMA-on ~31,860 | §5.4 |
| DLIs per frame | 2 | 2; **3 in a boss sector** (**S3 MEASURED: 3, gated by the harness; 0 sequence violations**; **S4a-i: unchanged, the phase-0 and phase-1 DLIs now also switch `CHBASE`**; **fortress session: unchanged, phase 0 reads the shown palette for the band flash**) | decision 9 |

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
| **S4a-i** (2026-10-04, §5.13.7) | `feat/boss-engine` | the boss low-RAM claim `$0C00-$18FF` (region charset, slot C for the C controller, scratch), the band DLI's `CHBASE`, the v2 converter (PNG drafts, the staged glyph block, four runs), 16 modules, cover groups, exposure, damage stages, the defeat rule, emitter slots by tier, the single fire countdown, the column-local rebuild, the C init before the column map, region 1 rebuilt in its chosen style (Q-B1) with placeholder art (decision G), `level-authoring.md`'s boss section, the harness's `boss_state` re-pointed | 0 | slot A −491 +130 (~940); slot C ~1,100 → 1,320; install ~350; slot B 768 | disk: 528–583 keeps code + install + slot C; regions 16 sectors each from 632; the entry 42 → 51 sectors | native ~3,400 (a kill frame) | ≤ P3's 29,305 | entry ~160 → ~195 frames | slot A or slot C > 2,048; a boss frame < 500; another link reaching the claim; the entry > 55 sectors | §5.13.7 | the layers fall in order; a covered module absorbs; the last weapon ends it with armour standing; the charset seam; Q-S4 unchanged |
| **S4a-ii** (2026-10-04, §5.13.7) | `feat/boss-feedback` | the cell-flash ring (sparks, muzzle flashes), the band flash, the ch-3 hit tick, PULSE and salvo fire through the hostile pool with the global cooldown, the nozzle copy with the dark phase on the chain, the hit/absorb stats rule | 0 | slot A +350 (~1,290) | 0 | native ~4,500; MEASURED pieces §5.13.5 | — | 0 | the native pin (Q-B6) exceeded; fence < 500; the escort starved > 2 s; a spark left after a stage change | §5.13.7 | every hit reads (spark, flash, tick); the cannons fire; the nozzles at both ends; three distinct sounds |
| **M5b-S4** — **re-scoped as S4b by §5.13.7** | `feat/boss-lasers` | §5.5, §5.8: lasers 1 / 2 / 4, the laser damage source, the boss win's band shake (**the player's death keeps its flash only, Q-S5**), ~~the boss theme copy (item 14)~~ (**moved to S3 by decision 32**), the laser contact session replacing the recorded one (Q4), the missile-plane clause exception | −48 (**spike: 0** beyond S3's; **no player-death shake, Q-S5**) | slot A +~500 B (**spike: +~480 + ~100 owed: ~1,930 of 2,048**) | disk 0 (inside the 16 + 10) | §5.4 in full: worst **1,238** (scroll stopped) (**spike: 10,103 MEASURED, ~6,500 composed**) | ~30,270 (**29,219**) | 0 | fence < 500 on any boss frame; the laser session not passing on the default ATR; `missile_plane_rows` residue outside the boss sector | §5.8's clauses; `boss-escort`; cycle pins | the warning readable at ~0.5 s; the beam's hit and its sound; the chain explosion and the band shake on a CRT; the player's death flash unchanged (no shake, Q-S5) |
| **M5b-S5** — **re-scoped by §5.13.7 (regions as PNG drafts, 16 sectors each from 632)** | `feat/boss-regions` | regions 2–4's art and data from the concepts, the M8 tuning layout, level 2's boss through the debug route, release prep for `v0.3.0` (hardware checklist, README EN + PL) | 0 | 0 | disk +30 (**spike: +27**, 9 a region with the shared install run, **decided Q-S6**) | 0 | 0 | 0 | a region run > 10 sectors (**> 9**) | build pins; the four regions through `--level=N` review builds | each region's boss on hardware through a review ATR; level 1's through the default |

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

**2026-10-04, the boss redesign (§5.13):** one probe build under
`build/level-1-s0/`, every edit reverted, nothing of it committed; the ATR and
the boot image are `main` `d586228`'s. §5.13.9 lists what it left open.

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
