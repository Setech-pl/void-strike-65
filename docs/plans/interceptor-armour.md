# A tougher Interceptor: more hits to destroy, a visible hit it survives

**Branch:** `feat/interceptor-armour` from `main` `2f7e615` (the `fix/boss-polish`
merge: this plan's predecessor `docs/plans/boss-polish.md`, decision AM, the
module hit flash b3). ATR `ddf01a9f…`, boot `186739b2…`.
**Status:** **Phase B built — `OWNER-SMOKE CANDIDATE`** (2026-10-12): F1 + H3
in the default build, placement C (§10, §11). Phase A's review variants and
their tooling are removed; §1-§9 are Phase A's record and describe them.

**The owner's finding (2026-10-12, after playing the standoff Interceptor):**
one shot destroys it. Wanted: it takes several hits. A hit it survives must be
visible (the shot landed, the enemy lives), its death looks as today, and this
applies to every Interceptor - the swarm, the elite companion and the boss
escort. It comes before S5-3 because the escort's toughness changes the boss
fights S5-3/4/5 will tune.

Labels: **M** measured on this branch - the Atari800 trace harness on the
debug routes `build/[interceptor-armour-ID-]level-1-s0` (focused runs, all 58
replays per build; `main`'s route reproduces the committed evidence row for
row) or the 6502 harness on a variant build (`VS65_HARNESS_BUILD`); **EST**
an estimate, with its basis; **ANALOGY** a figure carried from identical code.

---

## 0. Recommendation

* **Feedback: the pod flash (F1)**, the boss's b3 language on the
  Interceptor. A hit it survives draws its two cells with bit 7 cleared for 3
  frames, so its four red rotor pods (colour 3, COLPF3 `$46`) show COLPF2
  (mint `$AE`) and come back. No colour register is written, nothing else on
  screen changes, and it costs **0 window bytes**. The death is today's.
* **Hit points: 3 everywhere (H3)**, from the archetype record (data, 0 B of
  code). Every boss fight stays inside the owner's rule without a lever
  (MEDIUM **108.3 s**, EASY 82.4, HARD 150.5), every replay that reached the
  boss still does, no Interceptor meets the fighter, and the worst fence
  margin is **1,259** (−28).
* **Per-wave or per-difficulty hit points are not needed** for the fight.
  They are priced (§3, §6) if the owner wants them anyway: per wave +19 B of
  window, per difficulty +33 B (over the 24-B approval), both −72 more of fence
  margin.
* **Two replays need the owner's answer** (§7): the left-edge guard's replay is
  ~400 frames too short now (a scenario budget), and the HARD laser-contact
  bot meets a Bomber shell on its longer road and reaches the boss at 9/10
  (class (a)). Both pass on `main` and fail on every HP ≥ 2 build.

## 1. Step 0 and the baseline

`main` `2f7e615`; `git worktree list`: the primary checkout only. ATR
`ddf01a9fdd53a0adb2060509c401d74d8c02981286bf7c59bbe1263254cc8049`, boot
`186739b23680f4a347dd30835685ba5128ebc1dba2be0f67206b01c4ba8a015d`.
`docs/plans/boss-polish.md`, decision AM and the b3 flash are on `main`.

| Figure | Value | Source |
| --- | --- | --- |
| worst fence margin | 1,287 (`2-sweep-fire6` f311) | STATUS (boss polish, gates); **M** on `main`'s route |
| DMA-on maximum | 31,443 (`weapon-pickup-2-hunt-fire4` f2,356) | STATUS; **M** on `main`'s route |
| boss frames | worst margin 8,359 (`director-complete-1`), DMA-on 29,987 (`director-complete-2`) | STATUS; **M**. How it is taken: `scripts/measure-boss-fight.mjs` over each director-complete replay's rows with `boss_state ≥ 1`, **the entry row (`boss_entry` = 1) excluded**, up to the defeat chain's first row; the worst of the three |
| boss stress, region 1 | 7,006 (limit 8,500) | STATUS; **M** (`tests/boss-stress.test.mjs`) |
| boss entry | 65 sectors, 249 host frames (limit 280) | STATUS; **M** 249 on every route |
| replays | 58, 0 clause failures, 0 missed frames | STATUS |
| window record / free tail | 1,322 of 1,387 B (65 left) / 946 B (floor 900) | manifest |
| Light kernel record | 865 of 875 B | manifest |
| C extension record | 742 of 747 B | manifest |
| slot A / slot E | 2,047 of 2,048 / 358 B, 3 sectors | STATUS |
| pickup tail / arena / `DIRECTOR_RAM` | 20 / 14 (floor 14) / 2 B | STATUS |
| initial block | 13,623 B, 107 sectors | manifest |
| level-1 swarm | 408 rows; HARD no-kill margin 2 frames | STATUS |
| boss fight (aim bot, the ratio) | 86.5 / 103.0 / 154.4 s | STATUS; **M** (2,084 / 2,492 / 3,447 frames) |
| `npm test` | 1,324, 1 recorded failure (`preview`) | STATUS (not rerun in Phase A) |

No material disagreement. One method note: this plan measures the swarm as
the sweep bot's director sector 2 → 3 entries and the road to the boss as
the boss entry's active frame. On `main` that gives 12.7 / 13.8 / 9.6 s and
68.8 / 65.5 / 56.1 s. STATUS's 13.2 / 14.3 / 10.1 s is the same interval from
another start. Every variant below is compared with `main` by the same method.

## 2. Audit (file:line on `main` `2f7e615`)

### 2.1 How a player shot kills an Interceptor today

1. The PairShot step asks the target hook
   `entity_player_fighter_projectile_target_with_light` (`src/main.s:4112`),
   which is the Light kernel's shot vector (`src/main.s:13109`).
2. `light_shot` (`src/hybrid/light-kernel.s:462`) walks the occupied slots.
   The first slot whose 8×8 box holds the shot owns it, and the shot is freed.
3. `jsr SECTOR_READER_STATS_LIGHT_HIT` (`:504`): the reader counts one hit
   (`stats_light_hit`, `src/hybrid/sector-reader.s:1010`) and jumps to the C
   hit.
4. `enemy_c_light_hit` (`src/c/lifecycle.c:1331`) takes a hit point:
   `light_hp[slot] − 1`. A non-zero result returns **0, not lethal**, and
   nothing else happens. Zero is lethal: the state goes to 0, or to
   `BREAKUP_PENDING` (3) when the frame's token is spent, and it returns 1 or 2.
5. On a lethal return, `light_destroyed` (`:534`) spawns the breakup now or
   defers it a frame (`light_spawn_breakup`, `:547`). It scores through
   `light_add_score` (`src/main.s:10596`, the record's `0x15`), counts the
   kill and plays the hit sound.
6. **Slot release:** the slot's state is 0 (or 3). The late window's erase
   (`light_publish`, `:131`) restores its two cells, and the render skips it.

A contact (`light_update` `@touch`, `:369`) damages the player and calls the
same C hit (`:374`).

### 2.2 Where Light state lives

* `HYBRID_LIGHT_SLOTS` `$7FC4-$7FF3` (`src/c/lifecycle.c:360-400`), a
  structure of arrays per slot: state, **hp**, x, y, fire timer, age,
  archetype offset, code, the published screen address and the backing.
* `HYBRID_LIGHT_LOOK` `$812E-$8136`: the wave's look, `light_loops[4]` and the
  pair keys. Above it, `$8137-$813F` (9 B) is unowned at run time.

### 2.3 How an Interceptor is drawn: not a PMG sprite

* An Interceptor is the **character renderer** (decision: Light class = no
  PMG; P1/P2 are the Heavy class's). It is two ANTIC mode-4 cells, codes
  `$F8-$FD` (glyphs 120-125 with bit 7), one appearance pair per look. Slots
  wearing the same look **share** the pair's glyphs.
* The art is `light_interceptor_glyph` (`src/main.s:13063`): steel arms
  (COLPF1), a white hub (COLPF0) and four red rotor pods, colour 3. Bit 7 set
  makes colour 3 **COLPF3 = `INTERCEPTOR_PROJECTILE_COLOR` `$46`**
  (`src/main.s:574`). That register is shared by the Interceptor's laser and
  every hostile colour-3 accent.
* So "the sprite's colour only" has no register of its own. The per-object
  levers are the cell's bit 7 (which register colour 3 reads), the glyph
  (shared per pair), and whether the slot is drawn this frame.

### 2.4 Where an HP check lives

**It already exists.** `light_hp` is set at admission from the record's
`hit_points` (`src/c/lifecycle.c:951-952`, in `light_admit`, `HYBRID_C_EXT`).
It is decremented in `enemy_c_light_hit` (`:1331-1337`, the window), and the
kernel already ignores a 0 return. The Interceptor's record says
`hit_points = 1` (`src/c/lifecycle.c:275`). **More hit points are a data
change of one byte.** What is missing is the feedback.

### 2.5 What assumes a one-shot kill

* `tests/light-interceptor.test.mjs:267`: an admitted Interceptor has `hp: 1`
  (the record's value; a re-pin with H3).
* Replays whose bots reach the boss or a contact on a measured road
  (`scripts/runtime-wall-trace.mjs`). Their pinned outcomes in
  `tests/runtime-wall-trace.test.mjs` are which hunting replays reach the
  boss, the integrity sum, the guard's 7,399 frames and the laser contact's
  9,499. §7 lists what moved.
* `tests/boss-r1-tuning.test.mjs`: the fight's rule from the evidence
  (MEDIUM ≤ 120 s; it holds on every variant, §6).
* The Lights' clause (`scripts/trace-clause-observers.mjs:214`, L1-L5) and the
  no-kill swarm test (`tests/level-one-waves.test.mjs:200`) do not depend on
  hit points (§6.3).
* The trace tests that poke `light_hp = 1` before a hit
  (`tests/light-multiplicity.test.mjs:120,228`) set it themselves.

## 3. The candidates as built (review variants)

`node scripts/build.mjs --interceptor-armour=ID [--level=1[:sector=M]]` →
`build/interceptor-armour-ID[-level-1-sM]/`. Tooling `e59c6fb`:
`scripts/interceptor-armour-variants.mjs` applies `scripts/interceptor-armour-
{flash,blink,wave,general}.patch` and the data in memory, as the retired loop
variant did.

| ID | Feedback | Hit points | HP code |
| --- | --- | --- | --- |
| `h1` | flash | 1 (as `main`) | none: the feedback's own cost, and the HP-1 control |
| `h2` | flash | 2 everywhere | none (the record) |
| `h3` | flash | 3 everywhere | none (the record) |
| `hd` | flash | EASY 2 / MEDIUM 3 / HARD 3 | record 2 + a per-difficulty bonus `{0,1,1}` on an armoured wave; all three Interceptor waves armoured |
| `he` | flash | swarm and elite 3, escort 2 | record 2 + 1 on an armoured wave; swarm and elite armoured |
| `h3b` | blink | 3 everywhere | none |

### 3.1 The flash (F1)

* **On a survived hit:** the kernel's hit path gets the C hit's 0 and starts
  the slot's flash (`light_flash_start`, a 3-frame bit pattern into
  `light_flash[slot]`). It is the decision's consumer; C decided "not lethal".
* **Each frame:** the update loop shifts the pattern left (one `asl`). The
  render clears bit 7 of the slot's two codes while the pattern's bit 7 is
  set (`$F8,$F9` → `$78,$79`). **M** (6502 harness, `h3`): three frames of
  `$78,$79` after each survived hit, then `$F8,$F9`; the third hit kills and
  scores 15, as on `main`.
* **Correctness on a shared screen:** the erase recognises the slot's cell
  with bit 7 either way, and the backing resolver treats `$78-$7D` as Light
  cells. So an explosion or debris drawn over a flashing Interceptor cannot
  leave a ghost of it. Below `$78` (the common case) the resolver costs what
  it did.
* **Per slot only:** the codes are the slot's own cells. The other
  Interceptors, the glyphs and every colour register are untouched.
* `light_flash[4]` is cleared at admission, so a slot never inherits a flash.

### 3.2 The blink (F2, `h3b`)

The slot is **not drawn** on 2 frames, drawn on 2, not drawn on 2 (pattern
`%01100110`). A hidden slot publishes nothing, as a slot above the top does.
**M**: the harness sees the cells unpublished, published, unpublished. No
erase or resolver change is needed.

### 3.3 Where the bytes went (no window byte for the feedback)

The kernel needed ~19 B more and had 10. The two cold boss-entry routines in
the kernel link's last segment, `boss_enter_title` (14 B) and
`boss_enter_hud_backup` (14 B), moved to the `BROADSIDE` zero pin
`hull_sequence_reserve` in the main link (`$69E8-$6A4E`, 103 B of zeros,
resident, outside slot A). Their pins are updated (`pin_boss_enter_hud_backup`
now `; main`). The `world_rotate_due` precedent already lives in that pin.
`light_flash_start` (8 B) is there too.

## 4. Bytes and RAM (M, manifests)

| | `main` | F1 (`h1` `h2` `h3`) | F2 (`h3b`) | `he` | `hd` |
| --- | ---: | ---: | ---: | ---: | ---: |
| **window record** (of 1,387) | 1,322 | **1,322** | 1,322 | 1,341 (**+19**) | 1,355 (**+33**) |
| window free tail (floor 900) | 946 | 955 | 964 | 930 | 917 |
| **Light kernel record** (of 875) | 865 | **861** | 852 | 861 | 861 |
| C extension record (of 747) | 742 | 746 | 746 | 743 | 743 |
| `BROADSIDE` record (of 5,611) | 5,525 | 5,559 | 5,559 | 5,559 | 5,559 |
| initial block | 13,623 | 13,623 | 13,623 | 13,623 | 13,623 |
| transport sectors | 213 | 213 | 213 | 213 | 213 |
| RAM | — | +4: `light_flash[4]` `$8137-$813A` (`HYBRID_LIGHT_LOOK_RAM` 9 → 13 B; 5 B left unowned) | same | same | same |

* Unchanged on every build (**M**): slots A/C/D/E/F, the region charset, the
  arena (14 B), the pickup tail (20 B), `DIRECTOR_RAM`.
* `hull_sequence_reserve`: 36 of 103 B used (67 left).
* `he`/`hd` grow the window's Director half, so the kernel moves (`$B478` →
  `$B491` / `$B49E`).
* F1 and F2 use no window byte. The per-wave lever is inside the 24-B
  approval. The per-difficulty one (+33) is over it.

## 5. Cycles (M)

**6502 harness, MEDIUM, one live Interceptor, production frames:**

| | `main` | F1 | F2 |
| --- | ---: | ---: | ---: |
| standing frame, whole | 7,605 | 7,619 (**+14**: +8 in `light_update` before the fence, +6 in the late publish) | 7,615 (+10) |
| three Interceptors, standing | 9,701 | 9,743 (+42) | 9,731 (+30) |
| a survived hit's frame, `light_shot` | — (every hit kills: 977) | **236** (the flash start included) | 236 |
| a kill frame's effect captures (`light_cell_resolve`) | 227 | 253 (+26) | 227 |
| the admission frame | — | +~5 (the flash's zero store) | same |

`he`/`hd` add the armour function on the admission frame: **EST** ~36 cycles
(the fence delta below, ÷ ~2).

**The trace (all 58 replays per build, focused runs, PAL audit):**

| | `main` | `h1` | `h2` | `h3` | `hd` | `he` | `h3b` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| worst fence margin (`2-sweep-fire6` f311, an admission frame) | 1,287 | 1,259 | 1,259 | **1,259** | 1,187 | 1,187 | 1,259 |
| DMA-on maximum (`weapon-pickup-2-hunt-fire4`) | 31,443 (f2,356) | 31,477 | 31,477 | **31,477** (f2,361) | 31,493 | 31,481 | 31,449 |
| distinct miss events | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| boss frames: worst margin / DMA-on | 8,359 / 29,987 | 8,359 / 29,989 | 8,539 / 30,272 | 8,569 / 29,881 | 8,577 / 29,885 | 8,605 / 29,729 | 8,569 / 29,874 |
| boss stress, region 1 (limit 8,500) | 7,006 | — | — | 7,006 | 7,006 | 7,006 | 7,006 |
| boss entry (host frames) | 249 | 249 | 249 | 249 | 249 | 249 | 249 |

Every margin is over the owner's 1,000 STOP line (AK L4) and the brief's 500.
DMA-on stays under the 32,568 gate (over the 31,200 target, as on `main`).

## 6. Play (M; the sweep bot = `director-complete-N`, lives held; boss sector with the aim bot)

### 6.1 Level 1 and the fight

| | `main` | `h2` | `h3` | `hd` | `he` |
| --- | --- | --- | --- | --- | --- |
| road to the boss, E / M / H (s) | 68.8 / 65.5 / 56.1 | 83.3 / 72.4 / 62.8 | 75.7 / 75.7 / 65.5 | 83.3 / 75.7 / 65.5 | 75.7 / 75.7 / 65.5 |
| swarm, E / M / H (s) | 12.7 / 13.8 / 9.6 | 16.9 / 16.5 / 12.4 | 17.9 / 17.9 / 13.5 | 16.9 / 17.9 / 13.5 | 17.9 / 17.9 / 13.5 |
| **fight by the ratio**, E / M / H (s) | 86.5 / **103.0** / 154.4 | 81.2 / **107.5** / 148.2 | 82.4 / **108.3** / 150.5 | 81.2 / **108.3** / 150.5 | 87.1 / **107.4** / 148.2 |
| escorts per fight, E / M / H | 11 / 13 / 17 | 11 / 12 / 17 | 9 / 12 / 17 | 11 / 12 / 17 | 10 / 12 / 17 |
| … shot down | 7 / 8 / 10 | 5 / 5 / 7 | 5 / 3 / 8 | 5 / 3 / 8 | 7 / 5 / 7 |
| level Interceptors shot down by the sweep bot (of 4), E / M / H | 4 / 4 / 4 | 2 / 2 / 3 | 1 / 2 / 3 | 2 / 2 / 3 | 1 / 2 / 3 |
| first hit → kill, mean frames, E / M / H | — | 46 / 71 / 44 | 63 / 119 / 56 | 46 / 119 / 56 | 48 / 85 / 55 |
| survived hits (flashes), E / M / H | 0 | 10 / 14 / 16 | 17 / 21 / 27 | 10 / 21 / 27 | 14 / 16 / 20 |
| Interceptor laser hits before the boss, E / M / H | 0 / 0 / 0 | 1 / 3 / 2 | 1 / 2 / 0 | 1 / 2 / 0 | 1 / 2 / 0 |

* **Every fight keeps the rule** (MEDIUM 90-120 s, EASY shorter, HARD not
  shorter) with no lever. MEDIUM moves 103.0 → 107-108 s. The bot spends shots
  on escorts it now cannot kill in one, but more escorts leave on their own
  (the 121-frame pass). `h3b` plays exactly as `h3`.
* **The road gets 7-15 s longer.** The swarm is ~4 s of it: the sweep bot no
  longer clears an Interceptor with one shot, so most of them fly their two
  loops and leave.
* **Hits per kill = the hit points**, in every replay (**M**, the light
  traces' HP drops).
* The fights are noisy (±3 s between neighbouring layouts, plan
  `interceptor-standoff` §6). `hd` equals `h2` on EASY and `h3` on MEDIUM and
  HARD, frame for frame, as it should.

### 6.2 The hunting bots and contacts

* **The HARD hunting bots** (`memory-integrity-atr-2-hunt-fire5/6/7`, with the
  AK dodge) **reach the boss on every build** (`h3`: f3,735 / 3,811 / 3,622;
  `main` 3,667 / 3,669 / 3,628). They take 0 Interceptor laser hits on every
  build. EASY `hunt-fire5` reaches it at f4,448 on every build.
* **No Interceptor met the fighter in any replay of any build** (contacts 0).
* `weapon-pickup-2-hunt-fire4`: 3 laser hits, 1 death to a laser on every
  build, as on `main`.

### 6.3 The no-kill swarm

All 9 Lights arm with no kills on every difficulty and every build. The last
arms at +814 / +813 / +814, the swarm ends at +1,020 / +1,013 / +1,014
(**M**, `captureTimeline` as `tests/level-one-waves.test.mjs`), identical to
`main`: nothing is hit, so hit points cannot matter. HARD keeps its 2 frames.

### 6.4 The HP-1 control (`h1`)

`h1` (the flash's code, hit points 1) plays like `main`:
* every boss fight's frames, hits, kills and score are equal;
* 7 of the 8 hit-traced replays are equal row for row;
* `director-complete-1` differs in 9 boss-sector rows. The first is
  `boss_shown_pos` at f3,832, which the aim bot reads to lead its shots; it
  then steps 2 px differently for a few frames.

**EST**: the 14 extra cycles move the frame on which the bot reads the band's
drift. A survived hit never happens at hit points 1, so the flash itself
never runs. Phase B's A/B test proves the property directly in the harness.

## 7. Replays that fail on every HP ≥ 2 build (all pass on `main` and `h1`)

**1. `boss-edge-left-1` (the left-edge guard): the replay is too short.**
"The replay ends 3,832 frames into the fight, before the 4,000-frame window."
The bot reaches the boss at f3,542-3,602 (`main` f3,167), so 7,400 frames no
longer hold the window.
* The guard itself works harder: the parked bot shoots down 0-1 of 17 escorts
  (`main` 14 of 19), and escort lasers hit it 14-15 times (`main` 5).
* Proposed: the replay **7,400 → 7,800 frames** (fight start ≤ f3,603 +
  4,000, with a margin). It is a scenario budget, as AK Q5 moved it
  7,100 → 7,400, so it is the owner's call.

**2. `lower-playfield-laser-contact-atr-hard`: no 16 consecutive contact
rasters.**
* The bot seeks the beam only with a whole hull. On `main` it enters the
  boss at 10/10 (f2,834, after a respawn).
* On `h3`/`hd`/`he` the longer road walks it into the Bomber pair's salvo
  (ACTIVE `$1A`, sector 4, f3,169), and it enters at 9/10.
* On `h2`, two Interceptor lasers at f2,723 / f2,863 put it at 8/10.

This is class (a): a stale scenario, not a defect a player sees. Options, the
clause untouched:
* (a) the replay's policy dodges a falling hostile shot (the AK dodge for
  Interceptor lasers, widened to shells, this replay only);
* (b) a new reachable session (another fire delay), with the original
  recorded and given a follow-up ("add, don't retarget");
* (c) the policy waits in the boss sector for a respawn at full hull.

Recommended: **(a)**, measured in Phase B, with a STOP if it does not
restore the contact.

`summary-record-readback-1` fails on every build, `main` included, when run
alone: it reads the record `director-complete-1` writes earlier in a full run
(plan `interceptor-standoff` §12.4). It is not counted.

## 8. Owner questions

| # | Question | Options | Recommended |
| ---: | --- | --- | --- |
| A1 | The survived-hit feedback | **F1 the pod flash** (3 frames, red → mint pods) / F2 the blink (hidden 2, shown 2, hidden 2) / another frame count | **F1** |
| A2 | Hit points | **H3** 3 everywhere / H2 / HD (E2 / M3 / H3) / HE (swarm and elite 3, escort 2) | **H3** (0 B, every rule holds) |
| A3 | If HD or HE: the `armour` wave field takes `wave_flags` bit 5 (the trigger mode's unused upper bit); HD's +33 B of window are over the 24-B approval | accept / HE only (+19) / the HP rule in the `BROADSIDE` pin as ASM (0 window, but HP policy in ASM against the C default) | not needed with H3 |
| A4 | `boss-edge-left-1` | 7,400 → 7,800 frames / another length | **7,800** |
| A5 | the laser-contact replay | (a) the dodge widened to shells for this replay / (b) a new session / (c) wait for full hull | **(a)** |
| A6 | Moving `boss_enter_title` and `boss_enter_hud_backup` to the `BROADSIDE` zero pin (36 of its 103 B with the flash start) | accept / ask for another home | **accept** |

What H3 asks of Phase B:
* tests first;
* the flash patch and `h3`'s record byte made default, the variants removed;
* A4/A5 as answered;
* the evidence regenerated, two full `npm test` runs with reconciliation;
* the documents.

Expected re-pins:
* the record's hit points in `tests/light-interceptor.test.mjs`;
* the kernel / window / C-extension / `BROADSIDE` figures;
* the boss-entry pins;
* the replays' measured frame counts and boss-entry frames in
  `tests/runtime-wall-trace.test.mjs`;
* the swarm's sweep-bot timings where they are pinned;
* the showcase and media hashes.

## 9. How to play (Atari800, the 64 KB machine)

```
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-interceptor-armour-h3-81d32a27.atr"              # H3 + flash (recommended)
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-interceptor-armour-h3-boss-route-05176219.atr"   # the same, straight to the boss
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-interceptor-armour-h3b-81d4822f.atr"             # H3 + blink
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-interceptor-armour-h3b-boss-route-af72f93a.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-interceptor-armour-h2-36fc260e.atr"              # H2 + flash
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-interceptor-armour-h2-boss-route-2a5643fb.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-interceptor-armour-hd-77c28f86.atr"              # E2 / M3 / H3 + flash
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-interceptor-armour-hd-boss-route-d3251052.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-interceptor-armour-he-fca3f913.atr"              # swarm/elite 3, escort 2 + flash
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-interceptor-armour-he-boss-route-67c4c852.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-main-full-ddf01a9f.atr"                          # main, for comparison
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-main-boss-route-36a7de22.atr"
```

| Build | ATR SHA-256 |
| --- | --- |
| `h3` full / boss route | `81d32a2743010f2153d268c19be2ec96c9e5b054a53877e666fbfcbd9097b3a2` / `051762192aa7dee8a42e068debefb0ee4b4b840dcbd39932b0405e58371d6de9` |
| `h3b` full / boss route | `81d4822f561d5af544ced7be6e4f393981f283df86e2103f48caae49565cff6d` / `af72f93a225d1e0acbb415c470ab1389e16f9806a7612843a52bf286fbb17329` |
| `h2` full / boss route | `36fc260e988c66fe33d912765e76f057aab247214da282cab4b9928f1cd8848c` / `2a5643fbf6fc17283226d9aacc11ae4cd45a6c3bbd931e75f36dbb86c79cea4c` |
| `hd` full / boss route | `77c28f86cd1a28caefd3c192b6d2de9743b32cc5eb32615d27c0eab610e8b1e9` / `d32510528b1218bd82ac4dcfd43df9a523fad47e36ce6f3c0e57ed6cdee89a8a` |
| `he` full / boss route | `fca3f913c435bef4f63bfadd47612dc98b5c7c493abe92c0205be814eca4d309` / `67c4c852b4c913d5f6d8c6825fd95494a5e0b9ce971ae75e5fb29bfbdd4ea9e5` |
| `main` full / boss route | `ddf01a9f…` / `36a7de2205a2…` |

To rebuild: `node scripts/build.mjs --interceptor-armour=ID [--level=1:sector=6]`.

**What to look for:**
* In the swarm after the capital, shoot an Interceptor once. Its four red
  corner pods turn mint for three frames (F1), or the whole ship blinks off
  twice (F2), and it carries on.
* It dies on the 2nd / 3rd hit with today's break-up, sound and score.
* No other Interceptor, Wingman or shot changes colour or blinks with it.
* The elite companion (sector 4) and the boss escorts take the same hits.
* On the boss route, the MEDIUM fight should feel about as long as `main`'s.

## 10. Owner answers (2026-10-12) and the placement STOP

Answers: **F1** (pod flash); **H3** everywhere from the record, no wave flag
(bit 5 stays unused); `boss-edge-left-1` 7,400 → 7,800 frames, its pass
condition unchanged; `lower-playfield-laser-contact-atr-hard` gets the hunting
bots' dodge widened to Bomber shells, that replay only; item 5 (the BROADSIDE
pin) conditional on who reserved it.

**Who reserved `hull_sequence_reserve` (`src/main.s:7903`, `$69D7-$6A4E`).**
Roadmap 4.6 step 4 left it as a 120-B zero pin when the hull sequences moved to
the level page (`src/main.s:7894-7898`; director-4.6 §2.4, §8.2). It has a
planned owner: **M3-H**, [m3-waves-heavy.md](m3-waves-heavy.md) §0.3 item 5
(line 146: "the plan uses the pin") and §5 (line 854): `world_rotate_due` 17 B
(built, §9) and then the Heavy rotate gate 58 B, the base veneer 26 B and the
pending test 14 B — **98 of the 103 free bytes, 5 left**; budgeted again in
[gameplay-variety.md](gameplay-variety.md) line 142 ("M3 is priced on 98 + 6 of
them"); M3-H is the third item of order B (decision AE). Phase A's F1 put 36 B
there (`light_flash_start`, `boss_enter_title`, `boss_enter_hud_backup`):
67 B would remain against M3-H's 98, **31 B short**. Per the owner's
instruction: STOP.

**Alternatives measured (M, `--level=1:sector=0` builds of F1 + H3's code,
`scripts/build.mjs` manifests):**

| Option | Where the overflow goes | Light kernel record (cap 875, 7 sectors) | Other records | Takes planned bytes from |
| --- | --- | ---: | --- | --- |
| everything in the kernel | — | **889** (8 sectors: a boot-loaded record grows, ruled out) | — | — |
| P — Phase A | 36 B to the BROADSIDE pin | 861 | BROADSIDE 5,559 of 5,611 | M3-H's pin: 31 B short |
| **K** — recommended | `boss_enter_title` (14 B) to the `PICKUP_CODE` free tail beside its caller's head (`boss_enter_head`), `$8B53-$8B60`; the flash's own code stays in the kernel, made smaller (the update's guard dropped: a lone `asl LIGHT_FLASH,x`, 7 cycles as the guard's untaken case; the resolver's flash test as one masked subtract) | **875** (0 spare) | pickup record 1,180 → 1,194 of 1,259; window 1,322 (0 B); BROADSIDE unchanged | the `PICKUP_CODE` tail, 20 → 6 B: M3-H's H16 (32 B of RAM there, line 731) had already lost that home to feat/interceptor-standoff's 45 B; the 5-B spawn rotate gate (reserve lever A, line 1240) still fits |
| W | `boss_enter_title` into the window's `HYBRID_ASM_WINDOW` pad (pre-approved ≤ 24 B) | not built | window ≈ +14 packed | the window; the kernel moves `$B478` → `$B484`, whose taken branches were laid out against page crossings (`src/hybrid/c-asm-abi.s:620-625`) — re-measure |

RAM, in every option: `light_flash[4]` at `$8137-$813A` (`HYBRID_LIGHT_LOOK_RAM`
9 → 13 B). M3's plan earmarked `$8133-$813A` for P8 (path state, line 576);
feat/interceptor-standoff already took `$8133-$8136`. After this, `$813B-$813F`
and `$85E6-$85EE` (14 B) still cover H15's 13 B; P8's 8 B need a new home in
M3's session either way.

## 11. Phase B as built (2026-10-12) — `OWNER-SMOKE CANDIDATE`

Owner answers §10 and placement C (journal §AN). Branch commits after Phase A:
`08ea108` (the placement STOP), `4990829` (the feature), `ae67e8d` (tests,
re-pins, the two replays), `d0dc72c` (the cold tail's layout fix and four
tests), the evidence and the docs (see `git log`).

### 11.1 What the game does

* **Every Interceptor takes 3 hits** — the swarm, elite (a)'s companion, the
  boss escort — from its archetype record (`src/c/lifecycle.c`, byte 0 of the
  third record 1 → 3). No wave flag: the level compiler's `armour` field and
  `wave_flags` bit 5 are gone again.
* **A hit it lives through flashes its pods** (F1): `enemy_c_light_hit`
  returns 0, the Light kernel's `light_hit_landed` writes `%01110000` into
  `light_flash[slot]`; `light_update` shifts it left once a frame (`asl
  LIGHT_FLASH,x`, no test: 0 stays 0); the render clears bit 7 of the slot's
  two codes while the pattern's bit 7 is set — the hit frame and the next two
  (M: tests/interceptor-armour.test.mjs). The erase compares a cell ignoring
  bit 7 (`eor`/`asl`); the resolver takes `$78-$7D` as Light codes (one
  masked subtract after the unchanged below-range exit). No colour register.
* **The kill is unchanged**: 0x15 BCD, the slot released on the kill frame,
  the debris, the kill count — equal frame for frame to a one-hit-point kill on
  the same frame (the A/B test).

### 11.2 Placement C, as built

| Code | Home | Why there |
| --- | --- | --- |
| the flash (start, shift, render, erase, resolver) | Light kernel, +18 B (`LIGHT_KERNEL` 775 → 793) | hot, per frame |
| `light_flash[4]` | `$8137-$813A`, `HYBRID_LIGHT_LOOK_RAM` 9 → 13 B | §10 RAM answer |
| `light_admit`'s clear | `HYBRID_C_EXT`, +6 B (869 → 875; record 746 of 747) | the admission |
| the boss entry after the region read: theme start, title, the boss code's read, the jump to slot A | **`BOSS_ENTRY_COLD`** (boss link, 32 B at `$7A48`), copied by `scripts/build.mjs` into every region's theme run at `$B8` | once per entry; the region read lands it before it runs (`src/hybrid/light-kernel.s` `boss_enter_read`: `jsr BOSS_READ_RUN` → copy → `jmp BOSS_ENTRY_COLD`); the boss code's read lands in slot A, below it |
| the HUD booster backup | inlined into `boss_enter_head` (`PICKUP_CODE`), +11 B | it runs before any read, so it cannot be cold; with it in the kernel the record kept 13 B, one short of the owner's 14 |

The title's records move `$C0 → $D8` in each theme run (40 B: a boss name of at
most 25 characters, checked; the laser fixture's is 22, the four regions' at
most 16); the theme's limit `$C0 → $B8` (177 B used). Rejected on the way, all
measured on `--level=1:sector=0` builds: everything in the kernel (889 of 875,
an eighth boot-loaded sector); the cold tail at `$C0` with the records at `$E0`
(32 B: the laser fixture's title did not fit — found by the first full
`npm test`).

### 11.3 Bytes (M, manifests)

| | `main` | Phase B |
| --- | ---: | ---: |
| Light kernel record (7 sectors, cap 875) | 865 | **847** (28 spare) |
| kernel link (window's kernel half) | 982 | 957 |
| window record (11 sectors) / free tail | 1,322 / 946 | 1,322 / **971** |
| C extension record (cap 747) | 742 | 746 |
| pickup record (cap 1,259) / `PICKUP_CODE` fill | 1,180 / 20 | 1,191 / **9** |
| BROADSIDE record / `hull_sequence_reserve` | 5,525 / 103 free | unchanged (M3-H keeps its 98 B) |
| initial block / boot / total sectors | 13,623 / 107 / 213 | unchanged |
| boss entry | 65 sectors, 249 frames | 65 sectors, 249 frames (limit 280) |
| boss-entry pins | 12 | 11 (`boss_enter_read` `$B810 → $B814`, `boss_warning_records` `$B835 → $B82A`; `pin_boss_enter_hud_backup` gone) |

### 11.4 Cycles (M)

* Per live Interceptor per frame: the shift 7 (the same as Phase A's guard
  when idle), the render +6, the erase +2 a cell, one `ldy` fewer: about
  **+14**, as Phase A measured. A survived hit: `light_shot` 236 cycles (Phase A, with the flash start behind a call; inline now).
* Worst fence margin **1,287 → 1,260** (`2-sweep-fire6` f311, a Light
  admission frame; decision L4: accepted at 1,285, STOP only below 1,000 —
  1,260 is 25 under the accepted figure, the cause the flash's admission
  clear and per-Light work). DMA-on **31,443 → 31,483**
  (`weapon-pickup-2-hunt-fire4` f2,361; gate 32,568). The effects-stagger
  peak 992 → 1,009 (ceiling 1,122).
* Boss frames (director-complete): worst margin 8,359 → **8,569**, DMA-on
  29,987 → 29,884. Boss stress unchanged (the slots are untouched).

### 11.5 Play (M; sweep bot, lives held; the fight by the aim proxy)

| | EASY | MEDIUM | HARD |
| --- | ---: | ---: | ---: |
| road to the boss, s (main) | 68.8 → **75.7** | 65.5 → **75.7** | 56.1 → **65.5** |
| swarm sector, s | 12.7 → 17.9 | 13.8 → 17.9 | 9.6 → 13.5 |
| boss fight, s (main) | 86.5 → **82.4** | 103.0 → **108.3** | 154.4 → **150.5** |
| boss escorts | 9 | 12 | 17 |

MEDIUM stays inside 90-120 s, EASY is shorter, HARD is not shorter than
MEDIUM: no boss retune. Every HARD hunt reaches the boss (hunt-5 f3,735,
hunt-6 f3,811, hunt-7 f3,622; EASY hunt-5 f4,448); 0 Light contacts; the
no-kill swarm arms 9 of 9 on every difficulty.

### 11.6 The replays

* **`boss-edge-left-1`** 7,400 → 7,800 frames (answer 3): engaged at 3,543,
  18 escorts and 17 hits in the window; the clause unchanged.
* **`lower-playfield-laser-contact-atr-hard`** (answer 4): its policy alone
  steps out from under an Interceptor bolt (`$16`) or a Bomber shell (class 3,
  `$18-$1F`) on the road to the boss — never towards one within 24 HPOS above,
  away from one within 12 (`scripts/atari800-wall-trace.h`). The beam meets a
  whole hull again: contact f3,294, 10 → 0, 0 misses.
* **Lost boss reach, reported (not a STOP under the brief's rule):**
  `debris-effects-2-sweep-fire4` and `capital-muzzle-ring-2-sweep-fire4`
  (HARD, lives not held, the sweep and broadside-proof bots, not hunting
  bots) lose their last life before the boss (game over f4,141) where on
  `main` they reached it. Their clauses pass; the boss-entry clauses hold
  over 14 entries (16 on `main`); HARD keeps six replays through the boss
  sector. If the owner wants their reach back, decision L5's first option
  (the same scoped dodge for those two replays) is the remedy.

### 11.7 Tests

`tests/interceptor-armour.test.mjs` (4): RED on `main` (4 of 4), GREEN here.
Re-pointed (behaviour): light-interceptor admission and kill, light-wingman's
record, hostile-projectile-emitter-independence's kill, runtime-wall-trace's
debris-effects frames. Re-pinned (exact layout values; no floor, ceiling or
gate moved): the window tail 946 → 971 (three files) and used 2,638 → 2,613,
the kernel link 982 → 957, the kernel segment 775 → 793, the C extension 869
→ 875 and its tail 30 → 24, the `PICKUP_CODE` fill 20 → 9, the
effects-stagger peak 992 → 1,009, the build's boss-entry pin count 12 → 11.
