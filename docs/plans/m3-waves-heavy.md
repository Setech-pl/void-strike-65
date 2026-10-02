# Plan — M3 (wave paths) and M3-H (the Heavy behaviour package)

**PLANNING session, 2026-10-02. `OWNER REVIEW CANDIDATE`.** Branch
`docs/plan-m3-heavy` from `main` `4da20fd`. **Nothing here is implemented; this
document is the deliverable.** No source, cfg, build script, harness, evidence,
`dist/` or `docs/media/` byte changed, and no build was run. Measurements were
taken on the default build already in `build/`, which is bound to the committed
evidence. Prototype code exists only in `build/m3-probe/` (git-ignored) and is
diagnostic: it is not evidence and must not be cited as release evidence.

**Amended 2026-10-02 with the owner's decisions on it** (§8.1): every
recommendation was taken; the rotate-gate fix for Heavy break-ups became a
standalone task that runs before M4 and M5 (§9); and **M4 (campaign loop) and
M5 (boss) now come before this plan's three sessions**, so §6 restates the
window in that order.

**§9 built 2026-10-02** on `fix/heavy-breakup-rotate-gate`,
`OWNER-SMOKE CANDIDATE`; its as-built record is §9.5. The other sections are
still the plan.

**Re-based 2026-10-02 on `main` `c92f908`, after §9 was merged** (`c5470a8`,
evidence `2777e8f`). Planning only, no artifact byte changed. Section numbers,
the session order, every step's scope and every §8.1 decision are unchanged.
What the re-base did: §0.5 is today's baseline; §1.4 has today's rows and says
which earlier measurement was re-run and which holds; §6.1 is re-derived from
them; §3.5, §5, §6.2 and §6.3 carry one set of byte figures with the arena at
35 B; §9.5 compares §9's prediction with what was measured; §8.2 prices the
spawn rotate gate and lists what the owner still has to settle. **Two errors of
the first version are corrected in §1.4 and §6.1:** it added native cycles to
the fence margin one for one, and it let work before the fence move the DMA-on
maximum. Neither holds. **The owner's answers to the re-base's questions are
recorded in §8.2 (2026-10-02).**

It covers Director plan step 6 ([director-4.6.md](director-4.6.md) §8) and the
budget lines M3 and M3-H ([budget-1.0.md](budget-1.0.md) §2), plus the two
requirements the owner added after the budget: two Raider kinds, and a damaged
look for the Bomber and the armoured Raider.

**The short answer.**

* **The body-copy saving is real and larger than the budget assumed.** A Raider
  member that holds its Y costs **485 cycles less** than one that moves
  (MEASURED; the budget took ~350 from an analogy). With the decided descent
  rule built as a prototype gate, `update_enemy` for two live Raiders falls
  from 1,572 to 1,105 cycles per frame: **−467 net of the gate** (MEASURED).
  The gate itself costs the pair +11 cycles per frame, not the budget's 52–62.
* **The binding frame is a Heavy spawn on a ring-rotate frame** (re-based
  2026-10-02, §1.4): worst fence margin **1,439**, and nine of the ten worst
  rows are of that kind. Before §9 it was a Raider kill frame (788); the
  budget had it as a standing two-Raider frame. The descent rule's saving does
  not reach a spawn frame, and the plan's spawn-time code adds to it: the worst
  fence margin after the three sessions is about **1,235 expected, 1,175
  budgeted (675 over GO)**. Kill and standing rows gain about 930. **The
  DMA-on maximum stays 31,133**: it is set by the work after the fence, which
  nothing in this plan touches (§6.1). The replays move with slower Raiders,
  so each session's own PAL audit decides.
* **A wave path costs about +100 cycles per Light that flies one** (MEASURED:
  the whole tick is 333–426 against 236–325 today). A Light with no path pays
  +18, an escort +3. Level 1 authors no path, and no Light is live on a Heavy
  spawn frame, so M3 costs level 1's binding row nothing (re-based; the first
  version had 17 on the kill row, the budget 115).
* **The two Raider kinds and the damaged look fit with no byte in the initial
  block**, no new DFMC record and no new boot sector. They cost about 300 B of
  code and one extension sector. With M3 the whole plan adds 5–6 sectors
  (about +10 to +12 ATR menu frames; with M4 and M5 built first, 22–24 frames
  of room remain after it).
* **The resource that gets worse is the `$AE00` window.** The plan needs
  928 → 990 B of it, where the budget had 472. With M4 and M5 built first
  (owner, 2026-10-02) the boss plan has 1,330 → 1,300 B to work with and the
  cheapest boss fits; **this plan's sessions then find 190 → −68 B and are
  short by 738 → 1,058 B**, so a lever session comes before them (§6.3).
* **A finding outside the brief (§1.2):** the rotate gate cannot defer a Heavy
  break-up, because the kill is resolved before the frame knows whether it
  rotates. 389 of the 902 Heavy kills in the evidence run put their break-up
  on a rotate frame, and every one of the six worst kill rows is of that kind.
  A ~30-B fix should lift that whole class by an estimated 2,000 cycles or
  more. **Decided: it is a standalone task, before M4 and M5** (§9). **Built
  and measured (§9.5): 24 B, 389 → 0 such kills, the old binding row
  788 → 4,333, worst margin 1,439.**
* **A reserve lever, not taken (§8.2 A, owner 2026-10-02):** the same gate
  for Heavy *spawns* — 5 B and one extension sector — would move the binding
  class from 1,439 to about 2,944, at the price of re-scripted replays. It is
  not needed for GO and no session builds it.

---

## 0. Step 0, sources and conventions

### 0.1 Step 0 record

| | |
| --- | --- |
| `main` | `4da20fd docs: director step 5 - STATUS, plan as-built, level 2 timing after the payload`; tree clean |
| preconditions | step 5 is marked IMPLEMENTED in `director-4.6.md` §8 and §8.3; `budget-1.0.md` is on `main` |
| worktrees | one: `/Users/marcinkrzetowski/Projects/dark-fighter` |
| ATR SHA-256 | `04943660e05a380678c4bf6197810588f81772b8be3b9eca049c2da7f86386e8` (92,176 B) |
| boot SHA-256 | `c303c33f347280520f4c466e2889f6d849aa3b126c439de3cefe0d62165d8427` (26,752 B) |
| evidence binding | `build/manifest.json` `runtimeEvidence.status: final-bound`, the same two hashes |

No baseline worktree was created and no build was run: the branch changes
documents and one measurement script, so `build/` is `main`'s default build.

### 0.2 Baseline

| Figure | Value | Source |
| --- | ---: | --- |
| Worst line-238 fence margin | **788** (`director-complete-2` f5815) | STATUS step-5 table; reproduced here from the evidence CSV |
| DMA-on maximum | **31,133** (same session, f5797); target 31,200, hard gate 32,568 | `docs/runtime-wall-trace.json` |
| DLIs per frame | 2, 0 sequence violations | same |
| Initial block | 13,621 B (STOP 13,652), 107 boot sectors | `build/manifest.json` |
| DFMC records | 11 of 11 | manifest |
| Extension / total sectors | 102 / 209 | manifest |
| ATR menu frame | 547 against the 596 baseline (limit 603) | STATUS step-5 table |
| `$AE00` window | 2,104 used, **1,480 free** | manifest `residentCapacity` |
| `HYBRID_C_ARENA` | 790 of 832, **42 free** | manifest |
| `DIRECTOR_RAM` | 602 of 645 | STATUS |
| Extension record 5 | 735 of 747 | manifest |
| `npm test`, default build | **897 tests, 894 pass, 3 fail** — exactly the three recorded failures (`github-showcase`, `preview`, `runtime-wall-trace` "ten heaviest frames") | the owner's full run after the step-5 fixes (owner, 2026-10-02) |
| Recorded clause failures | 3 | `docs/recorded-gate-failures.json` |

Spare packed bytes per extension record today (`sectors × 128 − 21`):
record 1 `BROADSIDE` 109; 2 pickup + `HYBRID_C_SECTOR` 3; 5 `HYBRID_C_EXT` 12;
7 arena 35; 8 window C half 64; 9 Light kernel 94; 11 `DIRECTOR_RAM` 123.

### 0.3 Where the brief, the plans and the repo differ

The repo wins in each case.

1. **The binding frame.** The brief and the budget describe it as an ELITE
   frame with two Raiders live under Spread fire. The frame with the worst
   fence margin (f5815) is a Raider kill frame; the standing two-Raider frame
   (f5797) is the DMA-on maximum and has 7,616 cycles of fence margin. §1.2.
2. **"Assault Raider: today's Raider (fast)."** Decision 3b, in force, puts
   every Raider on alternate-frame descent, and the brief itself expects level
   1's Raiders to get slower. This plan reads "fast" as *relative to the
   armoured kind* and builds on 3b. **Decided so (§8.1 item 1)**; the assault
   Raider at today's full speed is priced in §6.1 and kept as an M8 option.
3. **`wave_flags` as built is not design-4.6 §1.3.** Built: bits 0–1
   appearance, 2 mirror, 3 Heavy class, 4–5 trigger mode
   (`scripts/level-compiler.mjs`). Bits 6 and 7 are free. The runtime reads
   only bits 0–1 and 3 today; mirror and the trigger mode are compiled and not
   consumed.
4. **design-4.6 §1.4 gives a path a signed dx in HPOS per frame.** A Light is
   two character cells and its X moves in 4-HPOS cells (`LIGHT_X_STEP`), so
   that value cannot be drawn. §2.1 proposes a record that can.
5. **The budget put the Raider's new ASM in the `PICKUP_CODE` tail** (65 B,
   whose record has 3 B spare, so +1 sector). Step 5 did not build the nebula,
   so the 120-B zero pin in `BROADSIDE` (`hull_sequence_reserve`) is free, and
   its record has 109 B spare. The plan uses the pin.
6. **The budget priced a wave with no path at "about 10 cycles".** Measured:
   17–18 per free Light, 3 per escort.
7. **The budget deferred the Raider dodge and a 2-HP Raider to M8 (option
   14a).** New requirement 1 builds both now, as the armoured kind. Option 14a
   is absorbed by this plan.
8. **`scripts/measure-heavy-body-copy-skip.mjs` no longer runs.** It pokes
   `_encounter_heavy_index`, which Director step 2 retired. It is not edited
   here; `scripts/measure-heavy-member-costs.mjs` (committed with this plan)
   supersedes it.
9. **The rotate gate does not reach Heavy break-ups** (§1.2). STATUS describes
   the Heavy break-up as taking the gate "with no new gate code"; it claims
   through the gated function, but at a point in the frame where the gate
   cannot know the answer.

### 0.4 Conventions

Basis of every figure: **M** measured (method named); **IC** instruction count
from the source; **AN** analogy to a named routine with its measured size or
cost; **G** guess. Estimates are written `expected → budgeted` (+20 %);
measured figures carry no margin. Packed size is taken at 0.78 of raw for C
(the window's C half today) and 0.89 for ASM (the Light kernel today). One
extension sector is counted as 2 ATR menu frames; step 5 measured 1.

### 0.5 Re-base baseline (2026-10-02, `main` `c92f908`)

§0.1 and §0.2 are the record of the first version. Today:

| Figure | Value | Source |
| --- | ---: | --- |
| `main` | `c92f908 docs: Heavy break-up rotate gate - STATUS, plan §9 as built, level 2 timing`; tree clean; one worktree | `git` |
| ATR SHA-256 | `f127d7a48674c7b2cdf103d3808b4145938a8d687586b82e83b3bcb651f33cd1` | `dist/`; `build/manifest.json` `final-bound` |
| boot SHA-256 | `1daed1be86e54b1e3195228aa3b05f20d2501a87efc5403ca0638b60e943bd33` | same |
| Worst line-238 fence margin | **1,439** (`2-evasive-fire3` f287, a Raider spawn on a rotate frame) | STATUS; reproduced with `scripts/measure-breakup-rotate-frames.mjs --worst=10` |
| DMA-on maximum | **31,133** (`director-complete-2` f5797) | `docs/runtime-wall-trace.json` |
| DLIs per frame | 2, 0 sequence violations | same |
| Initial block / boot / total sectors | 13,621 B / 107 / 209 | manifest |
| ATR menu frame | 547 against 596 | STATUS |
| `$AE00` window | 2,104 used, **1,480 free** | manifest |
| `HYBRID_C_ARENA` | 797 of 832, **35 free** | manifest |
| `BROADSIDE` zero pins | **119 B**: 103 in `hull_sequence_reserve` after `world_rotate_due`, 16 in the codebook reserve | `build/void-strike-65.lbl` |
| `DIRECTOR_RAM` | 602 of 645 | manifest |
| Unowned state RAM | 22 B: `$8133-$813F`, `$85E6-$85EE` — §9 added none | `docs/memory-map.md`, `.lbl` |
| `npm test`, default build | 906 tests, 904 pass, 2 fail (`github-showcase`, `preview`); "ten heaviest frames" recorded with a note | STATUS |
| Recorded clause failures | 3 | `docs/recorded-gate-failures.json` |

Spare packed bytes per extension record today: record 1 `BROADSIDE` **94**
(was 109); 2 pickup + `HYBRID_C_SECTOR` 3; 5 `HYBRID_C_EXT` 12; 7 arena **28**
(was 35); 8 window C half 64; 9 Light kernel 94; 11 `DIRECTOR_RAM` 123.

**Where the re-base brief and the repo differ** (the repo wins; the owner
confirmed §8.1 on the order and on the armoured Raider's hit points,
§8.2 F): the brief asks for this plan to be
written, and it exists with its decisions; it calls M3 + M3-H the next
milestone, where §8.1 puts M4 and M5 first; it gives the armoured Raider 2 HP,
where §8.1 item 3 says 2 / 2 / 3; it quotes the window gap at M5 as about
535 B (the budget's figure), where §6.3 has 738 → 1,058 B met by this plan's
sessions; it names release v0.3.0, which the repo does not tie to a milestone.

---

## 1. Measurements

All native: the JS NMOS-6502 core (`scripts/nmos6502.mjs`) running the linked
bytes of the default build through `scripts/measure-population-harness.mjs`,
the same route the Heavy tests use (`tests/heavy-standing-cost.test.mjs`,
`tests/heavy-bomber.test.mjs`). Cycles are JSR-to-RTS inclusive.

| | How | Where |
| --- | --- | --- |
| (a) | `node scripts/measure-heavy-member-costs.mjs` — committed, re-runnable | output kept in `build/m3-probe/a-heavy-member-costs.txt` |
| (b) | the per-frame CSVs the committed evidence run left in `build/runtime-wall-trace/` (2026-10-01 22:37–22:46; f5797 = 31,133 and f5815 = 788 match the committed report), read with `auditSamples` from `scripts/pal-timing-audit.mjs` | `build/m3-probe/b-binding-row.mjs`, `b2-kill-frames.mjs`, `b3-wall-max.mjs` and their `.txt` outputs |
| (c) | prototypes compiled with the repo's toolchain and flags (`cc65 --cpu 6502 -Oirs`, the build's own no-C-stack audit applied), linked standalone at `$B700` against the real build's label values, loaded over the real runtime image | `build/m3-probe/probe.mjs`, `proto-path.c`, `proto-gate.s`; output `c-probe.txt` |

### 1.1 (a) What a Heavy member costs

| Per member, per frame | Raider | Bomber |
| --- | ---: | ---: |
| `heavy_member_update`, Y moved | 159 mean (139–247) | 479 (464–552) |
| `heavy_member_update`, Y held | 160 (144–213) | 440 (391–694) |
| `draw_enemy_member`, Y moved, fully on screen | **512** | **570** |
| `draw_enemy_member`, Y held (Option D skip) | **49** | **49** |
| `erase_enemy_departing_row`, moved / held | 44–58 / 23 | 44–45 / 23 |
| **Saved when the member holds its Y** | **485** (463 body copy + 22 row erase) | **543** |

| `update_enemy`, two members live | Raider | Bomber |
| --- | ---: | ---: |
| both moved | 1,546 mean, 1,650 max | 2,190 mean, 2,299 max |
| one held | 1,078 mean (the 48 frames slot 0 waits at its anchor) | 1,732 mean |
| both held | never happens today | 1,145 mean |

| Event frame (`resolve_enemy_damage`) | Raider | Bomber |
| --- | ---: | ---: |
| A hit that leaves the member alive | 98 | 98 |
| A kill | 1,272: member erase 289, break-up claim and spawn 688 (the claim is 92 of it), score 101, sound 34, the damage call 70 | 1,307 (erase 321) |

**Re-run on `c92f908` (re-base):** the script's output is identical line for
line except these two kill rows, which §9 changed — a non-rotate kill is now
**1,309 / 1,344** (the claim 129, with the rotate test), a rotate-frame kill
763 / 795 (§9.5). Every other figure of §1.1, the 485 / 543 saving and the
gate prototype's 467 included, holds as written.

**Against the budget's analogy.** The budget took the saving as ~440 expected
and ~350 budgeted per held Raider, scaled from Option D's Bomber measurement.
The measured figure is **485**. The Bomber's own skip is 543.

**The descent gate, as a prototype.** `heavy_member_update` ends its Raider
path with `jmp update_enemy_slot_motion`; the probe re-points that operand to
`build/m3-probe/proto-gate.s` and runs a whole formation from spawn to
retirement. On every frame it also checks Option D's licence — each `P1`/`P2`
plane holds exactly the body its member's Y implies — and that held in every
run. All rows are from one harness state (player column fixed at 124, which is
why "today" reads 1,572 here and 1,546 above).

| Raider formation | `update_enemy`, two live | Per member | Life |
| --- | ---: | --- | ---: |
| today | 1,572 mean (both moved) | 172 | 334 frames |
| **gate, each member descends on alternate frames** | **1,105 mean** (one held on every frame); 642 on the 48 frames both hold | 192 on its move frame, 164 on its hold frame | 668 frames |
| gate present, today's full speed | 1,616 (both moved) | 194 | 334 frames |
| armoured: alternate frames, 64-frame hold, one hit | 1,161 one held; 692 both held; a dodge frame 120 for that member | 221 / 196 | 825 frames |
| armoured: one frame in four, 64-frame hold | 1,159 one held; 664 both held (870 frames) | 220 / 192 | 1,585 frames |

So the decided rule returns **467 cycles on every frame with two Raiders
live**, net of the gate (the figure moves by a cycle or two with where the gate
is linked). The gate costs +20 on a member's move frame and −8 on
its hold frame (the skipped Y half of the motion outweighs the test): **+11
for the pair**, against the budget's 52–62. With one Raider left it returns
493 on that member's hold frames and costs 20 on its move frames, so a
single-Raider frame is helped only every other frame.

### 1.2 (b) The binding rows

*This section is `main` before §9 and is kept as the basis §9 was decided on.
Today's rows are §1.4.*

**The worst fence row, f5815 (margin 788, pre-fence 24,461, wall 29,743)**, and
the heaviest frame, **f5797 (wall 31,133, margin 7,616)**, both
`director-complete-2-natural-sweep-fire0`, in cycles per main-loop segment:

| Segment | f5815 | f5797 |
| --- | ---: | ---: |
| enemy update (two Raiders, both moving) | 3,331 | 3,306 |
| player projectile update and collision | 4,340 | 4,578 |
| **enemy damage resolution** | **2,638** | 63 |
| world ring (both are rotate frames) | 5,288 | 5,244 |
| **entity update with the Light** | **3,454** | 1,591 |
| **entity render** | **1,882** | 24 |
| frame visuals | 848 | 308 |
| player-enemy collision, broadside, weapons, hull contact, erase, capsule, sector | 2,680 | 2,535 |
| **before the fence** | **24,461** | 17,649 |
| after the fence (projectile publication, audio) | 5,282 | 13,484 |

f5815 is the frame a Raider dies: slot 0 is killed, the kill is the third
qualifying kill (the capsule state changes on it), the break-up is spawned on
the same frame and its five cells are updated and rendered for the first time.
Both Raiders had already been moved by the enemy update, at Y 46, during their
entry. f5797 is eighteen frames earlier in the same entry: two Raiders, an
escort Wingman, four player shots, five hostile shots.

**What kind of frame binds.** The ten worst fence rows of the whole evidence
run are all one of two kinds, and all are ring-rotate frames:

| Kind | Rows in the worst ten | Margins |
| --- | ---: | --- |
| a Raider kill with its break-up on the same frame | 6 | 788, 1,831, 1,861, 2,170, 2,411, 2,441 |
| a Heavy formation spawn | 4 | 1,423, 2,091, 2,274, 2,376 |

No standing frame is among them. The next-worst row of the binding session is
2,170.

**Kill and spawn frames over the whole run, by rotation:**

| Frame | Count | Worst margin | Mean margin |
| --- | ---: | ---: | ---: |
| Raider kill, break-up on the kill frame, rotate | 282 | **788** | 5,356 |
| Raider kill, break-up on the kill frame, no rotate | 334 | 3,072 | 8,300 |
| Bomber kill, break-up on the kill frame, rotate | 107 | 2,473 | 6,538 |
| Bomber kill, break-up on the kill frame, no rotate | 120 | 3,807 | 8,926 |
| break-up spawned on a later frame (deferred) | 60 | 4,753 | — |
| Heavy spawn, rotate | 218 | **1,423** | 5,903 |
| Heavy spawn, no rotate | 208 | 4,448 | 9,181 |

Almost half of all Heavy kills put their break-up on a rotate frame. The
break-up is a deferrable consumer and the rotate gate exists to prevent exactly
that, so this is a defect in where the gate is asked, not a property of the
load: `resolve_enemy_damage` runs inside `handle_collisions`, before
`update_starfield` has decided whether this frame rotates, so the marker the
gate reads still names an earlier frame (`src/c/lifecycle.c`, the
`light_rotate_frame` comment, says so: "it can miss a saving"). At HARD the
ring rotates on every second frame, so it misses half the time. The fix is §9.

**Frames of the `director-complete` family, and what the decided rule does to
them.** Raiders in these replays die during their entry: of the frames with two
Raiders live, about 90 % are entry frames with both members descending, and in
a whole session only 24–48 are frames where slot 0 waits at its anchor; the
crossing and the egress are never reached.

| Session | Two Raiders live | One Raider live | Raider kills | Under the rule: frames with one member skipped | Frames where the lone Raider moves / skips | Hold frames |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| `…-0` (EASY) | 654 | 720 | 46 | all 654 | ~360 / ~360 | 0 |
| `…-1` (MEDIUM) | 659 | 631 | 43 | all 659 | ~316 / ~315 | 0 |
| `…-2` (HARD) | 561 | 594 | 42 | all 561 | ~297 / ~297 | 0 |

Hold frames are zero because level 1 keeps the assault kind (§4). These counts
describe today's replays; with slower Raiders the replays themselves change
(§4.1).

**Heaviest frames by Heavy state** (wall cycles, DMA on):

| State | Heaviest | Where |
| --- | ---: | --- |
| two Raiders live | 31,133 | `director-complete-2` f5797 |
| one Raider live | 30,863 | `1-evasive-fire3` f297 |
| no Heavy | 30,929 | `raider-remnant-rapid-atr-hard` f2058 (mode-gated run) |
| two Bombers live | 30,889 | `2-evasive-fire7` f564 |

The no-Heavy frame is in a mode-gated run, which the DMA-on gate of
`docs/runtime-wall-trace.json` does not read; nothing in this plan changes it.

### 1.3 (c) The Light path evaluator

The prototype is a copy of the Light tick (`light_tick_body` and
`enemy_c_light_tick`, without the fire tail) with the evaluator hooked in.
Two record forms were built: design-4.6 §1.4 as written (signed dx/dy nibbles,
loop to segment 0), and the form §2.1 proposes (dy / frames / flags). Whole
tick, one live Light, cycles:

| Frame | Today | Form A (as designed) | **Form B (proposed)** |
| --- | ---: | ---: | ---: |
| escort Wingman | 269 | 272 | **272** |
| free Wingman, no path | 236 | 253 | **253** |
| Interceptor, no path, non-tracking / tracking frame | 245 / 305–325 | 263 / 337 | **263 / 337** |
| on a path, straight segment | — | 422 | **333** |
| on a path, lateral step frame | — | 496–507 | **415–424** |
| on a path, lateral segment, off frame | — | — | **344** |
| on a path, track-the-player segment, step / off frame | — | 480 / 406 | **426 / 344** |
| segment ends, next / loop back | — | 501 / 626 | **426 / 437** |

| | Form A | **Form B** |
| --- | ---: | ---: |
| evaluator in the tick, with the hook | 400 B | **288 B** |
| shared column-tracking helper | 65 B | 65 B |
| tables | 8 B | 4 B |
| **total** | 473 B | **357 B** |

Per live member, form B: **+97 to +108 over a free Wingman on a frame with no
lateral step, +180 on a step frame; +88 to +121 over an Interceptor.** Averaged
over a tracking segment it is 385 against the Interceptor's ~280: **about
+105.** The budget expected +55…+95 and budgeted +115; design-4.6 said the
evaluator alone would be 80–120 cycles and ~150 B. The cycles are in line; the
bytes are double the design's figure and a quarter over the budget's.

A Light that flies its archetype's own movement pays **+17 to +18** for the
hook; an escort pays **+3** (the escort is tested first).

**The evaluator's budget, set from this measurement** (Director plan §4): the
whole tick of a Light on a path is at most **440 cycles**, and at most **+125
over the archetype's own movement averaged over a segment**; the hook is at
most +20 on a free Light and +5 on an escort. The integration session measures
the same cases from the same harness state and STOPs above those figures.

**Not re-run for the re-base, and why it holds:** §9 changed 7 B of the arena
and 17 B of the `BROADSIDE` pin. The Light tick and the window (2,104 used,
1,480 free) did not move, and the prototypes are linked standalone at `$B700`.

### 1.4 Re-base: the rows after §9 (2026-10-02, `c92f908`)

Method: the per-frame CSVs of the committed evidence run for §9
(`build/runtime-wall-trace/`, 2026-10-02 10:48–11:04), read with
`scripts/measure-breakup-rotate-frames.mjs --worst=10` (committed) and with
`build/m3-probe/e-rebase-rows.mjs` (diagnostic, not tracked; output
`e-rebase-rows.txt`), which also runs `reset_enemy` and `world_rotate_due`
natively on the linked build. `build/m3-probe/b3-wall-max.mjs` was re-run for
the heaviest frames.

**The ten worst fence rows** (MEASURED):

| # | Margin | Row | Kind |
| ---: | ---: | --- | --- |
| 1 | **1,439** | `2-evasive-fire3` f287 | Raider spawn, rotate |
| 2 | 2,091 | `raider-remnant-rapid-atr-hard` f117 | Raider spawn, rotate |
| 3 | 2,274 | `raider-remnant-normal-atr-hard` f2055 | Raider spawn, rotate |
| 4 | 2,376 | `2-sweep-fire6` f311 | Raider spawn, rotate |
| 5 | 2,591 | `early-enemy-atr-1-cold-hunt-fire4` f135 | Raider spawn, rotate |
| 6 | 2,838 | `raider-sector-atr-hard` f2051 | Raider spawn, rotate |
| 7–9 | 2,859 | `capital-muzzle-ring-2-sweep-fire4` f1887 and two replays that share its prefix | Raider spawn, rotate |
| 10 | 2,944 | `raider-remnant-spread-atr-hard` f2052 | Raider kill with its break-up, no rotate |

**The worst row of each kind** (MEASURED; fence rows of the whole run):

| Kind | Rows | Worst margin | Where |
| --- | ---: | ---: | --- |
| **Raider spawn, rotate** | 155 | **1,439** | `2-evasive-fire3` f287 |
| Raider kill with its break-up, no rotate | 334 | 2,944 | `raider-remnant-spread-atr-hard` f2052 |
| Raider kill, rotate (break-up parked by §9) | 288 | 3,459 | `raider-remnant-rapid-atr-hard` f123 |
| Bomber kill with its break-up, no rotate | 120 | 3,748 | `2-sweep-fire4` f396 |
| Bomber spawn, rotate | 63 | 4,057 | `2-sweep-fire4` f367 |
| two Bombers live, rotate | 5,898 | 4,196 | `2-neutral-fire0` f315 |
| Raider spawn, no rotate | 134 | 4,435 | `2-sweep-fire5` f310 |
| Bomber spawn, no rotate | 74 | 4,656 | `capital-muzzle-ring-2-sweep-fire4` f2238 |
| a parked break-up lands, no rotate | 533 | 4,753 | `weapon-pickup-traversal-2-observe-fire8` f560 |
| two Raiders live, rotate | 11,004 | 5,055 | `raider-remnant-rapid-atr-hard` f119 |
| no Heavy, rotate | 6,932 | 7,379 | `two-pmg-raiders-atr-hard` f793 |

218 of the 426 Heavy spawns of the run land on a rotate frame. No Light is live
on any of the 426.

**What a spawn frame is** (source reading, `src/main.s`): with no Heavy live,
`integration_update_enemy` goes to `interceptor_admission_update`
(`PICKUP_CODE`), which asks the Director and, when admitted, jumps to
`reset_enemy` (`STARFIELD`): member state, `enemy_c_spawn_raiders`, then
`draw_enemy`, the forced draw of both bodies. **`update_enemy` does not run on
that frame**, so the Raider gate (H1) neither costs nor saves there, and a
spawn claims no token. MEASURED natively: `reset_enemy` is **1,613** cycles
for a Raider formation (C spawn 683, forced draw 755) and **2,245** for a
Bomber formation (1,247 and 823), the same on EASY and HARD. In the trace the
`enemy_update` segment of a rotate spawn frame is 5,022–5,927 cycles (mean
5,666) against 342 on the frame before it and 3,098 on the frame after.

f287 against the heaviest frame, f5797 (cycles per segment, MEASURED):

| Segment | f287 (margin 1,439) | f5797 (margin 7,616) |
| --- | ---: | ---: |
| enemy update | **5,844** (the admission and the spawn) | 3,306 (two Raiders, both moving) |
| player projectile update and collision | 3,761 | 4,578 |
| world ring (both rotate) | 5,818 | 5,244 |
| entity update | 1,876 | 1,591 |
| entity render | 1,871 (a break-up cluster from an earlier kill) | 24 |
| frame visuals, player | 1,952 | 688 |
| **before the fence** | **23,826** | 17,649 |
| whole loop (wall) | 28,778 | 31,133 |

**Two corrections to the first version's model.**

1. **Work before the fence does not move the wall figure.** The main loop
   waits for line 238 before `publish_fighter_projectile_overlays`; the
   publication begins 25,302–25,334 cycles after the loop's start on all
   91,798 fence rows, whatever came before. The wall figure is that wait plus the
   publication and the audio. MEASURED on the row §9 moved: f5815 went from
   margin 788 to **4,333** and its wall figure is **29,743 on both builds**.
   So the DMA-on maximum (31,133) is a property of the shots being published,
   and the Heavy update, the Light tick, the spawn and the damage resolution —
   all before the fence — cannot raise or lower it.
2. **A native cycle before the fence costs about two cycles of margin.** The
   loop runs through the displayed lines, where display DMA takes cycles from
   the CPU. MEASURED twice: §9 removed 509 native cycles from
   `resolve_enemy_damage` and the segment fell by 1,111 on f5815 (**× 2.18**);
   `update_enemy` for two Raiders is 1,572 native and its segment is 3,306
   with about 45 cycles of dispatch (**× 2.04**). §6.1 takes **× 2.2 for a
   cost and × 2.0 for a saving**.

**The heaviest frames by Heavy state** (wall cycles, re-run): unchanged from
§1.2 — 31,133 two Raiders, 30,863 one Raider, 30,889 two Bombers — except the
mode-gated no-Heavy frame, 30,929 → 30,918 (`raider-remnant-rapid-atr-hard`
f2059).

---

## 2. M3 — wave paths, V1 (Lights only)

### 2.1 The record

A path is four segments of 3 B, 12 B in all, as the design says. The three
bytes change meaning:

| Byte | Holds |
| --- | --- |
| `dy` | signed lines per frame, −2…+2 |
| `frames` | the segment's length, 1–255; 0 = until the member leaves the playfield |
| `flags` | bits 0–1 lateral period (0 every frame, 1 every second, 3 every fourth); bits 2–3 lateral mode (0 none, 1 a cell right, 2 a cell left, 3 a cell toward the player's column); bit 4 fire allowed on this segment; bits 5–6 at the segment's end, 0 = next segment, 1–3 = back that many segments; bit 7 retire at the segment's end |

**Departure from design-4.6 §1.4**, for three measured reasons: a Light's X is
a 4-HPOS cell, so "dx in HPOS per frame" cannot be drawn and a period can; the
nibble unpack costs ~85 cycles per member per frame; "loop to segment 0" needs
the path's base and so a base table and the path id per slot, where a relative
step needs neither. A sine, an arc, a snake and a loop are still four-segment
envelopes. The lateral period is taken from the frame counter.

A member leaves through the bottom as today, through the top when a negative
`dy` wraps its Y (the existing retire test catches it, 0 B), and through a side
when a segment says so (~15 B, design-4.6 §1.4).

### 2.2 The library — none resident (decided)

The design and the budget put eight paths in the runtime (96 B) and eight more
in each level's payload. **Decided (§8.1 item 6): every path a level uses is
in that level's payload block (`path[8]`, 96 B, already in every image), and
the standard library is a table of named paths in the compiler.** A level may
use eight distinct paths. That returns the 96 resident bytes.

The motion companion table of design-4.6 §1.5 (16 B) is not needed for V1: the
fire window stays a constant, and "no path" is `wave_path = $FF`, which means
the archetype's own movement as it does today.

### 2.3 Data flow

* **Compiler.** A wave names `"path": "<name>"`. The compiler places the path
  in the payload block and writes its byte offset (0, 12, … 84) into
  `wave_path`; `$FF` stays "none". `"mirror": true` (`wave_flags` bit 2,
  already compiled) flips left and right for every second member.
* **Director**, `director_c_try_event` (window C): publishes the armed wave's
  path offset and mirror bit with the rest of the composition.
* **Admission.** `light_admit` is in `HYBRID_C_EXT`, whose record has 12 B
  spare, so it is not touched. `light_wave_step` (window) sets the admitted
  slot's path state after a successful `light_admit`; `encounter_light_admit`
  (window) sets "none" for an escort.
* **Tick**, `light_tick_body` (window C): escort first, then the path, then
  the archetype's own movement — the order the prototype measured.
* **State**, per slot: `light_path_seg` (bit 7 mirror, bits 0–6 the offset of
  the current segment record; `$FF` none) and `light_path_timer`. 8 B.
* **Fire.** A segment with bit 4 clear holds fire; the test is on the fire path
  only, after the reload timer has reached zero, so a standing frame does not
  pay for it. Volley (`wave_flags` bit 6 on a Light wave: the members fire on
  one shared pulse, one token) and column-conditional fire (bit 7: only within
  ±N columns of the player) are the two branches Director step 6 lists.

### 2.4 Items

| # | Item | Code | Segment → record | Frame placement | Bytes | Cycles | Basis |
| ---: | --- | --- | --- | --- | ---: | --- | --- |
| P1 | evaluator and hook | `light_tick_body` | window C → 8 | every Light tick | 288 | on a path 333–344, 415–426 on a step frame, 426–437 at a segment's end; no path +17…18; escort +3 | **M** prototype |
| P2 | column tracking helper | new, beside the tick | window C → 8 | a tracking segment's step frame | 65 | in the row above | **M** |
| P3 | end-step table | — | window RODATA → 8 | — | 4 | — | **M** |
| P4 | path state at admission | `light_wave_step`, `encounter_light_admit` | window C → 8 | admission (a token event) | 38 → 46 | ~+40 per admission | **IC** |
| P5 | publish path and mirror | `director_c_try_event` | window C → 8 | wave arm | 14 → 17 | ~+20 per wave | **IC**; **AN** step 5's look publish, +28 B |
| P6 | fire allowed per segment, side retire | `light_tick_body` | window C → 8 | fire frames; a flagged segment | 27 → 32 | ≤ +12 on a fire frame | **IC** |
| P7 | volley and column-conditional fire | `light_tick_body`, the wave stepper | window C → 8 | fire frames | 60 → 72 | ≤ 40 per firing member | design-4.6 §5 and §7.3, **G** |
| P8 | path state | — | unowned `$8133-$813A` | — | 8 B RAM | — | **IC** |
| — | resident library, motion companion | — | — | — | **0** (budget: 96 + 16) | — | §2.2 |

**M3 total: window C 496 → 524 B.** The budget's line was 472 B including the
96-B library. Initial block 0. `DIRECTOR_RAM` 0 (the budget took 12).

**Compiler and validator** (`scripts/level-compiler.mjs`,
`docs/level-authoring.md`): the path vocabulary and the named library; refuse a
path on a Heavy wave (V1: Lights only), more than eight distinct paths in a
level, `dy` outside −2…+2, a segment that steps back past the path's first
segment, a path with no way to end (no retire, no `frames = 0` segment that
leaves the playfield), volley or conditional fire on a Heavy wave; warn on a
path in an ELITE sector with its cost.

**Tests** (T14, `tests/wave-paths.test.mjs`, RED on `main`): the compiler
encodes a named path into the payload and its offset into `wave_path`, and
refuses each case above; natively — a four-segment path moves a member through
its segments, a mirrored member moves the other way, a tracking segment steps
toward the player, a member retires upward and at a flagged segment's end, a
wave with no path moves exactly as on `main` (X and Y frame by frame for a
Wingman and an Interceptor), an escort is unaffected; cycle pins at the
figures of §1.3; size pins on the window, record 8 and the initial block.

---

## 3. M3-H — the Heavy behaviour package

### 3.1 What is built

| | Assault Raider | Armoured Raider | Bomber |
| --- | --- | --- | --- |
| Descent | one line on alternate frames, the two members on opposite parity (decision 3b) | the same | already so; unchanged |
| Lateral pursuit | every frame, as today | every frame, as today | lane sweep, as today |
| Stop and shoot | none | holds at an authored row for an authored time; both members hold, so both body copies are skipped; its burst controller keeps firing | brakes at an authored row for an authored time and fires; with no authored hold, today's reload-timed attack run |
| Hit points E / M / H | 1 / 1 / 1 | **2 / 2 / 3** (decided, §8.1 item 3) | 4 / 4 / 5 (decision 3a) |
| A hit that leaves it alive | cannot happen | dodges 12 HPOS away from the player over six frames, holding its Y; gets the damaged look | dodges sideways on its row for the six flash frames, keeps its hold (decision 3c); gets the damaged look |
| Look | the Raider's | a second 16-B silhouette from the level payload, and its colour | the Bomber's |
| Life if never hit | 668 frames (today 334) | 825 frames with a 64-frame hold | as today |

Rule shared by both Heavies: **a Heavy whose record has more than one hit point
gets one more on HARD.** That is the Bomber's 4 / 4 / 5 and the armoured
Raider's 2 / 2 / 3 from one test.

### 3.2 How a wave names the kind (the profile)

No new archetype record and no new archetype code: the Raider record, its fire
policy, its score and its renderer class are shared by both kinds (decision
AD). The profile is carried in three places, all of them bytes a Heavy wave
does not use today:

| What | Where | Encoding |
| --- | --- | --- |
| the kind | `wave_flags` bit 6 of a Heavy wave (free) | 0 assault, 1 armoured; Raider waves only |
| the hold | `wave_path` of a Heavy wave (unused: `$FF` in every authored wave) — "the motion byte" | bits 0–3 hold time in 16-frame units (0 = no hold); bits 4–6 hold row, `24 + 16 × n`; bit 7 zero. The compiler writes `$00` for a Heavy wave with no hold, so the runtime needs no `$FF` case |
| the look | the payload page: `heavy_look`, 17 B — sixteen PMG rows and the hull colour | read in place; see §3.4 |

JSON: `"kind": "armoured"`, `"hold": { "row": 40, "frames": 64 }` on a wave;
`"payload": { "heavyLook": { "rows": [ … 14 rows of 8 … ], "colour": "$46" } }`.
What armoured *means* — one more hit point, the dodge, the hold being allowed,
the second look — is fixed in the runtime; a level chooses the kind, the hold
and the picture. A Raider's hold row must be 24 or 40 so that both members pass
it during their entry; the validator enforces it.

`director_c_try_event` publishes the motion byte with the wave's other bytes;
`enemy_c_spawn_raiders` turns the kind into hit points, the hold counters and
the look, once per formation.

### 3.3 The Raider gate

The Raider's motion is `update_enemy_slot_motion` in `CODE`, which is the
initial block and cannot grow. The gate wraps it from outside:
`heavy_member_update` (`HEAVY_CODE`) ends its Raider path with
`jmp update_enemy_slot_motion`, and that operand is re-pointed to the gate —
the same three bytes.

On a member's descent frame the gate jumps on to the motion routine. On its
other frames, on hold frames and on dodge frames it does not, so Y, the
crossing timer and the manoeuvre state stay as they are and Option D skips the
body copy. On a skipped descent frame the gate runs the pursuit half itself (a
39-B copy of the first half of the motion routine), so the Raider hunts the
player's column at today's rate and its eight-frame target sample is never
missed. Skipping the whole routine instead would halve the pursuit and, worse,
slot 1 would never sample its target (its sample frames are even and it would
move on odd frames); fixing that needs an operand in `reset_enemy`, which is in
`STARFIELD` — an initial-block byte. The copy avoids it.

The descent rate is a byte C sets at spawn (a frame mask: 1 = alternate
frames, 0 = every frame), not a constant in the gate, so the M8 option of an
assault Raider at today's full speed (§8.2) is a value, not a code change.

The gate is ASM (decided, §8.1 item 7) because the Raider's movement owner is ASM today and a C tick
costs 280 cycles more per member per frame (a Bomber's member update is 440–480
against the Raider's 160, MEASURED). The decisions are still C's: C sets the
kind, the hit points and the hold at spawn; the gate executes them. The armoured
half watches the member's hit points (a change is a hit that left it alive),
which keeps `resolve_enemy_damage` (`STARFIELD`, initial block) untouched.

### 3.4 The look and the damaged look — one mechanism

`draw_enemy_member` copies the body with `lda enemy_body_data,x`, X = shape ×
16. **Proposed: the operand becomes the formation's body base, set at
admission, and X comes from a per-member index byte.**

| Formation | Base | Member index |
| --- | --- | --- |
| assault Raider, Bomber | `enemy_body_data` (as today) | shape × 16 (as today) |
| armoured Raider | the payload's `heavy_look`, read in place in the level buffer | 0 |
| any formation after its first damage | a 32-B RAM copy | 0 and 16 |

So "installed at admission" is two bytes of operand and two index bytes, not a
copy: no body copy is added to the spawn frame, which since §9 is the worst
kind of frame in the game (§1.4); what H11 does add there is its ~40 native
cycles, counted in §6.1. In `draw_enemy_member` the change replaces
`txa / asl ×4 / tax` by `lda heavy_body_index,x / tax`: **one byte shorter and
4 cycles cheaper per body copy** (**IC**), in place, in `BROADSIDE`.

**The punch.** When a hit leaves a member alive, a consumer copies the
formation's two bodies into the RAM copy (first damage only), clears a few
authored bits in the hit member's rows, points the base and the indices at the
copy, and re-publishes that member's plane once. It is visual only: a shot is
tested against the member's box (`enemy_frame_heights`,
`enemy_visible_widths`), never against the PMG image, so holes change no
collision. It is a deferrable consumer of the one-expensive-event token —
visual only, nothing to capture, forced on its second attempt — and the pending
bit rides in the byte `heavy_breakup_retry` already tests on every Heavy frame,
so a frame with nothing pending pays nothing new.

**Stages: two, by hit points left — stage 1 at 2 HP, stage 2 at 1 HP**
(decided, §8.1 item 5). A member that skips a threshold gets the later stage directly: an
armoured Raider on EASY or MEDIUM (2 HP) goes straight to stage 2 on its one
surviving hit; on HARD (3 HP) it shows both. A Bomber shows nothing on its
first hit (its hull colour already steps down with every hit point) and both
stages on the way to its last. Holes are authored per shape in
`assets/graphics/enemy-roster.json` as (row, mask) pairs, three per stage, and
are previewed with the roster so the silhouette stays readable.

### 3.5 Items

| # | Item | Code | Segment → record | Frame placement | Bytes | Cycles | Basis |
| ---: | --- | --- | --- | --- | ---: | --- | --- |
| H1 | Raider gate: descent rate, pursuit half | new `raider_gate`; operand in `heavy_member_update` | `BROADSIDE` pin → 1; `HEAVY_CODE` byte-neutral → 5 | every Raider member update | 58 | **−467 per frame with two live** (move frame +20, hold frame −8, body copy −485); one live: −493 / +20 on alternate frames | **M** prototype |
| H2 | armoured half: hit watch, dodge, hold | new, called by the gate for an armoured formation | window ASM → 9 | armoured member updates only | 96 | +29 per member per frame; hold frame for the pair 692 (today 1,572); dodge frame 120 for that member | **M** prototype (the prototype holds at the anchors; the authored-row test is the same two compares) |
| H3 | kind, hit points, hold counters, look select at spawn | `enemy_c_spawn_raiders` | window C → 8 (moved from the arena, H9) | admission | 70 → 84 | ~+60 on a spawn frame | **IC**; **AN** the function itself, 135 B |
| H4 | publish the motion byte | `director_c_try_event` | window C → 8 | wave arm | 10 → 12 | ~+10 per wave | **AN** budget |
| H5 | Bomber: hold row and time from the wave | `enemy_c_heavy_tick` | arena → 7 | every Bomber tick | 20 → 25 | +30 → 36 for two members; both held 1,145 against 1,732–2,190 | **IC** budget; the hold frame **M** |
| H6 | hit points: +1 on HARD above 1 HP; `BOMBER_FLASH_LUMA` 6 → 4 | `enemy_c_spawn_raiders` | window C → 8 | admission | 14 → 17 | 0 | **IC** budget |
| H7 | Bomber dodge, with its direction during a hold | `enemy_c_heavy_tick` | arena → 7 | the six flash frames | 38 → 46 | +35 → 42 per dodging member | **IC** budget |
| H8 | Bomber asks for the punch | `bomber_colour` | arena → 7 | the tick that sees the hit | 10 → 12 | ~+10 on that tick | **IC** |
| H9 | `enemy_c_spawn_raiders` and its two 4-B tables move to the window | — | arena −143 → window C +143 | — | 0 net | 0 (it is already a cross-segment call) | **M** sizes from the listing |
| H10 | body base and member index | `draw_enemy_member` | `BROADSIDE`, in place → 1 | every body copy | **−1** | −4 per body copy | **IC** |
| H11 | set the base and the indices | new veneer | `BROADSIDE` pin → 1 | admission; the punch | 22 → 26 | ~+40 on a spawn frame | **IC** |
| H12 | the punch consumer | new | window ASM → 9 | a deferrable token event | 75 → 90 | first damage of a formation ~920–980 (copy 304, holes 75, re-point 30, re-publish 512–570); later stages ~620–680 | **IC**; the re-publish **M** |
| H13 | hole tables, 2 shapes × 2 stages × 3 holes | — | window ASM → 9 | — | 24 | — | **IC** |
| H14 | pending test and claim | `heavy_breakup_retry` site | `BROADSIDE` pin → 1 | Heavy frames, only when a bit is set | 12 → 14 (**+5 → 6 for the rotate test, re-base note below**) | 0 with nothing pending | **IC** |
| H15 | state | — | unowned `$813B-$813F`, `$85E6-$85EE` | — | 13 B RAM | — | **IC** |
| H16 | damaged-body copy | — | the `PICKUP_CODE` RAM tail `$8B26-$8B45`, by address, no file byte, with a link-time assert against `__PICKUP_CODE_RAM_LAST__` | — | 32 B RAM | — | **IC** |

**Totals** (budgeted): `BROADSIDE` pin 98 of 120 B, in place −1; window ASM
210 B; window C 256 B (113 new + 143 moved); arena +83 −143 → **95 B free**
(§9 took 7 as built, so 35 are free today);
`HEAVY_CODE` 0; `PICKUP_CODE` code 0, its RAM tail 65 → 33 B;
`DIRECTOR_RAM` 0; 45 B of state. The pin has 103 B of zero after §9, so the
98 leave **5**.

**Re-base note on H12 and H14 (a consequence of §9, not a change of scope).**
The punch is a deferrable consumer claimed where the Heavy break-up is: before
`update_starfield`. §9 showed that `light_take_deferrable_token` cannot see
this frame's rotate from there. So the punch's claim asks `world_rotate_due`
first, as the break-up's now does: **+5 → 6 B** (IC: a `jsr` and a branch)
and ~35 native cycles on a claim frame only. With it the punch lands on a
non-rotate frame; without it about half would land on a rotate frame, and a
first-damage punch on the worst two-Bomber rotate row (4,196) would leave
about 1,450 (§6.1). The pin's 5 spare bytes do not cover the budgeted 6; the
16-B codebook reserve beside it does, which leaves **15 B of zero pins** after
this plan instead of 21. §5's rule applies as written: if record 1 would gain
a sector, the base veneer (26 B) moves to the window.

**What the two new requirements cost** of that: the armoured half 96, the
spawn code's kind and look ~50, the body base 25, the punch and its tables 114,
the pending test 14 — about **300 B of code, 17 B per level in the payload,
45 B of state**, and one extension sector (record 9). In cycles: nothing on an assault frame,
+29 per armoured member, −4 per body copy, and one ~950-cycle deferrable event
per damaged formation.

**Bytes in the initial block: none.** Nothing is added to `CODE`, `RODATA`,
`STARFIELD` or `ENTITY_CODE`. Three places where a simpler design would have
needed one, and how each is avoided: a pursuit-phase operand in `reset_enemy`
(`STARFIELD`) — the gate keeps the pursuit on every frame; a hook in
`resolve_enemy_damage` (`STARFIELD`) — the hit is seen as a change of hit
points; a split of `update_enemy_slot_motion` (`CODE`) — its first half is
copied into the gate. If an implementation session finds it needs any such
byte, that is a STOP with the segment and the count.

**Tests** (RED on `main`): `tests/heavy-package.test.mjs` — a Raider member
descends on alternate frames and the two on opposite parity; its pursuit steps
and samples exactly as on `main`; each plane holds the body its Y implies on
every frame of a 668-frame life and no body byte is written on a hold frame;
`update_enemy` with two live Raiders is ≤ 1,200 cycles on every frame after
the spawn frame; an armoured wave spawns 2 / 2 / 3 HP, holds at its row for its
frames with zero body writes, dodges 12 HPOS away on a surviving hit and keeps
its Y; an assault wave never holds or dodges; Bomber 4 / 4 / 5, hold from the
wave, a hit during the hold keeps the hold and moves X only, the flash stays
inside hue C; compiler encoding and refusals (armoured on a Bomber wave, a
Raider hold row other than 24 or 40, a hold on an assault wave, a hold time
over 240). `tests/heavy-looks.test.mjs` — an assault formation's body bytes
are `main`'s; an armoured formation draws the payload rows; a surviving hit
clears exactly the authored bits in the hit member's plane and leaves the
other member's plane untouched; the punch waits one frame on a spent token and
never longer than two; a new formation starts undamaged. Size pins: initial
block 13,621, the pin's free bytes, the arena, records 1, 7, 8, 9.
`tests/heavy-standing-cost.test.mjs` and `tests/heavy-bomber.test.mjs` are
re-pointed where they assume a line per frame or 4 HP on HARD, each with its
reason in the test.

---

## 4. Data

### 4.1 Level 1 as shipped

Level 1 keeps its waves, rows, counts and looks. It names no kind, so every
Raider wave is the assault kind, and no hold, so its Bombers keep today's
attack run. What the player sees change:

* **Raiders descend at half speed** and keep hunting sideways at today's speed.
  A Raider formation that is never hit lives 668 frames instead of 334.
* A Bomber dodges sideways when hit, has 5 HP on HARD, and shows damage holes
  at 2 and 1 HP.

What that moves, and what the session must re-measure with
`scripts/level-timeline.mjs` before it regenerates the evidence:

* **The kill cadence, and with it the capsule cadence.** Every default replay
  moves. Four native clauses arm on the Spread booster and have gone stale on a
  cadence change before; the session greps the trace script for the arming
  conditions (`pickup_booster_state === 4`, `entity_state + 2u] == 4u`) and
  re-scripts in one pass.
* **The formation counts the level file pins** (EASY 100, MEDIUM 109, HARD 116
  formations; longest run 6; capital at MEDIUM frame 606; level complete at
  8,249 / 7,424). Sector 3 is sized so that its fifth wave always arms; a
  Raider formation that survives now holds the wave twice as long, so that
  sizing is re-verified on all three difficulties. If it no longer holds, the
  session proposes the smallest count change (the Raider waves' 6 → 5) and the
  owner approves it at the smoke.
* **The evidence** is regenerated at the end of every implementation session,
  because every one changes the artifacts.

### 4.2 Level 2 — what the owner's smoke should show

| Sector | Today | Proposed |
| --- | --- | --- |
| 1 SWARM | Interceptors, Wingmen, `hunter` Interceptors | waves 1–2 unchanged (each archetype is met plain first); wave 3 on a **snake** path |
| 2 ELITE | three Bomber + Wingman waves | waves 2–3 with an authored **hold** (row 72, 96 frames) |
| 4 SWARM | three Interceptor waves | wave 1 a **sine** envelope, wave 2 the same **mirrored** per member, wave 3 a **dive and retire upward** with a **volley** |
| 5 ELITE | Raider, Bomber, Raider, Bomber | wave 3 **armoured** Raiders (hold row 40, 64 frames) in their second look |
| 6 ELITE, last | Raider, Bomber, Interceptors, Raider, Bomber, Raider | waves 4 and 6 **armoured**; wave 3's Interceptors on a tracking path with fire held until the second segment |

The payload gains `heavyLook` (one armoured silhouette and its colour) and four
or five paths. Level 2 is measured through the debug route after each session,
as in `docs/diagnostics/level-2-timing-2026-09-30.md`.

### 4.3 The level format

Unchanged in size and layout. Newly read: `wave_path` (a path offset on a Light
wave, the motion byte on a Heavy wave), `wave_flags` bits 2, 6 and 7, the
payload's `path[8]`. One block is re-cut (decided, §8.1 item 4):
`hull_params` (32 B, reserved for capital geometry 4.8a, read by nothing) gives
its first 17 B to `heavy_look`. **That leaves 15 of the 32 B for 4.8a**, which
the owner expects to move after 1.0; a 4.8a plan that needs more than 15 B has
to find them elsewhere in the level image (the hull block's 104-B pad is the
nearest).

---

## 5. Where the code lives

| Home | Record | Today | This plan | After |
| --- | ---: | --- | --- | --- |
| `BROADSIDE` zero pin `hull_sequence_reserve` | 1 | 120 B, all zero; **17 B of it code since §9 was built** | the break-up task's rotate test **17 as built** (§9.5); then gate 58, base veneer 26, pending test 14; the punch's rotate test 5 → 6 in the codebook reserve (§3.5 note) | 5 B left in the pin, 10 of 16 in the codebook reserve; record 1 ~5,604 → 5,610 of 5,611 packed (estimate from §9's measured 15 packed B for 17 raw; 5,517 measured today, 94 spare — re-measure at session 1) |
| `BROADSIDE`, `draw_enemy_member` | 1 | — | −1 B in place (the pad after it grows by one) | no label moves |
| `HEAVY_CODE` | 5 | — | one operand | unchanged, 12 B spare |
| arena | 7 | 42 B free; **35 since §9 was built** | the break-up task **+7 as built** (§9.5); then spawn out −143, Bomber package +83 | **95 B free**; record 7 ~677 of 747 |
| window C half | 8 | 1,369 B | M3 524, M3-H 113, spawn moved in 143 | 2,149 B; packed ~1,675 → **13–14 sectors** (9 today) |
| window ASM (Light kernel) | 9 | 735 B | armoured half 96, punch 90, hole tables 24 | 945 B; packed ~840 → **7 sectors** (6 today) |
| `DIRECTOR_RAM` | 11 | 602 of 645 | 0 | 602 of 645 |
| initial block | — | 13,621 B | **0** | 13,621 B |

H2, H12 and H13 are main-loop ASM placed in the Light kernel's link, which is
linked after `main` and already imports `main`'s addresses through
`build/light-kernel-abi.inc`; the session adds the symbols they need to that
list and reaches them from `main` the way `light_update` is reached today. That
route is the first thing session 1 confirms; if it does not hold, the armoured
half goes to the `PICKUP_CODE` tail (65 B, +1 sector) and the pin.

Two placement rules for the sessions. **New window C goes after the tick
functions** and the standing Light paths are compared against `main` from the
same harness state after every size change: step 5 found two one-cycle page
crossings that way. **The pin's 98 B are checked against record 1's packed
size** after the first build: with the break-up task's 17 B already there
(15 packed, MEASURED) the record has 94 packed bytes today and an estimated
1 → 7 after this plan, so if it would gain a sector the base veneer (26 B)
moves to the window.

The arena's 95 free bytes are a reserve this plan does not spend. They can
take the volley code (72 B) if record 7's packed size allows, which would give
the window 72 B back.

---

## 6. Updated budget lines

### 6.1 Cycles

**Re-derived 2026-10-02 from the rows of §1.4.** It replaces the first
version's table, which is summarised at the end of this section. Method: each
item's native cost or saving (§1, §2.4, §3.5) is placed on the kind of row it
executes on and converted to fence margin at **× 2.2 for a cost and × 2.0 for
a saving** (§1.4, MEASURED 2.04–2.18). Figures are `expected → budgeted`:
budgeted adds 20 % to every cost that is not measured and counts no unmeasured
saving. The replays move with slower Raiders, so this is the plan's
expectation; each session's PAL audit is the result.

**What lands where** (native cycles):

| Kind of row | Session 1 (`feat/heavy-package`) | Session 2 (`feat/heavy-looks`) | Session 3 (`feat/wave-paths`) |
| --- | --- | --- | --- |
| Heavy spawn | H3 +60 → 72 (**IC**). H1 nothing: `update_enemy` does not run (§1.4). H4 nothing: the wave arms from the world-row tick, on an earlier frame | H11 +40 → 48 (**IC**); H10 −8, two forced body copies (**IC**) | nothing: no Light is live on a spawn frame (**M**), and an escort is admitted later |
| Raider frames with both members updated (standing, kill) | H1 **−467** (**M**) | H10 −4 per body copy (**IC**) | P1 hook +18 per free Light, +3 per escort (**M**) |
| Bomber frames | H5 +30 → 36 (**IC**); a dodge frame H7 +35 → 42 per dodging member (**IC**); the hit tick H8 +10 → 12 (**IC**) | H10 −4 per body copy | P1 hook as above |
| the frame a punch lands on (never a rotate frame, §3.5 note) | — | H12 980 → 1,176 first damage, 680 → 816 later stages (**IC**; the re-publish inside it **M**) | — |
| a Light on a path | — | — | +100 per Light, +180 on a step frame (**M**); level 1 authors none |

**The fence margin, row by row** (GO ≥ 500):

| Row today (§1.4) | Today (**M**) | After session 1 | After session 2 | After session 3 |
| --- | ---: | ---: | ---: | ---: |
| **Raider spawn, rotate — the worst row** | **1,439** | **1,307 → 1,281** | **1,235 → 1,175** | **1,235 → 1,175** |
| — over GO | 939 | 807 → 781 | 735 → 675 | **735 → 675** |
| Raider kill with its break-up, no rotate | 2,944 | ~3,880 | ~3,880 | ~3,840 |
| Raider kill, rotate | 3,459 | ~4,390 | ~4,390 | ~4,350 |
| Bomber kill with its break-up, no rotate | 3,748 | 3,682 → 3,669 | 3,682 → 3,669 | 3,642 → 3,629 |
| Bomber spawn, rotate | 4,057 | 3,925 → 3,899 | 3,853 → 3,793 | 3,853 → 3,793 |
| two Bombers live, rotate; one member dodging | 4,196 | 4,053 → 4,025 | 4,053 → 4,025 | 4,046 → 4,018 |
| two Bombers live, no rotate, a first-damage punch on it | 6,471 | 6,405 → 6,392 (no punch yet) | 4,249 → 3,805 | 4,242 → 3,798 |
| two Raiders live, rotate | 5,055 | ~5,990 | ~5,990 | ~5,950 |

The worst row is the Raider spawn row after every session. The first version
expected M3-H to *raise* the worst margin (788 → 1,255); on today's rows it
lowers it by about 200 → 260, because the binding frame is now one the descent
rule does not touch and the spawn-time code does. It stays 675 over GO on
budgeted figures. Every other kind of row has at least 3,600.

**The DMA-on maximum** (target 31,200, hard gate 32,568): **31,133 today and
after every session.** Everything this plan adds or removes runs before the
fence, and the wall figure is the wait for line 238 plus the shot publication
and the audio (§1.4, MEASURED on f5815: margin 788 → 4,333, wall 29,743 on
both builds). The first version's "~30,890 after M3-H" is withdrawn: the
descent rule cannot lower this figure. What can move it is the number of shots
in flight when the replays change; both shot pools are already full on the
heaviest rows (4 player shots, 5 hostile), so no rise is expected (**G**), and
the session's audit reports it.

**If the assault Raider kept today's full speed** (not taken; an M8 balance
option, §8.2 C): the gate is still needed for the armoured kind and costs 44
native cycles per frame for an assault pair with no saving, about 97 of
margin. It does not run on a spawn frame, so the worst margin is the same
**1,235 → 1,175**; the Raider kill and standing rows keep today's margins less
97 (2,944 → ~2,850) instead of gaining ~930; the DMA-on maximum is 31,133
either way. The first version's "227 over GO, 20 under the target" was
computed on the kill row §9 has since moved, and with the two errors of §1.4.

**Level 2** (diagnostic): its worst margin, 1,615, is also a Heavy spawn on a
rotate frame, so it follows the first row: about 1,410 → 1,350. An armoured
wave is cheaper than an assault wave on its hold frames and +58 native (~130
of margin) per frame otherwise; an Interceptor on a path in ELITE is +105
native (~230). SWARM sectors have ≥ 5,931 of margin; three Lights on paths
cost +315 to +540 native (~690 to ~1,190).

**The budget's row for M6** (the booster's +48 native, ≤ 106 of margin if it
lands on the spawn row): **~630 → 570 over GO** at the end of the road, before
content coincidences (the budget's −264 example). The spawn rotate gate is a
reserve lever, not taken (§8.2 A); it would move the binding class to about
2,944 today and about 3,600 after the sessions.

**The first version's table, for the record** (`main` before §9, native cycles
added one for one): worst fence margin 788 → 1,255 after M3-H → 1,238 after
M3; the Heavy spawn row 1,423 → ~1,320; DMA-on maximum 31,133 → ~30,890 →
~30,910. §9 then moved the worst row to **1,439** (MEASURED, §9.5).

### 6.2 Bytes and transport

What this plan and the break-up task spend. The "Today" column is `main` before
§9, as first written; §0.5 has today's figures, and where §9 moved one it is
given in brackets. M4 and M5 are built in between (§6.3 has the window in that
order); they are not in this table.

| Resource | Today | After the break-up task and this plan (expected → budgeted) | Budget-1.0 expected after M3-H |
| --- | ---: | ---: | ---: |
| `$AE00` window free | 1,480 | **552 → 490** | 1,013 |
| arena free | 42 (35 since §9) | **95** (35 + 143 moved out − 83 added) | 26 |
| `DIRECTOR_RAM` free | 43 | **43** | 1 |
| `BROADSIDE` zero pins | 136 (119 since §9) | **21 → 15** (5 in the pin; 16 → 10 in the codebook reserve, which takes the punch's rotate test, §3.5 note) | 56 |
| `PICKUP_CODE` tail | 65 code or RAM | 33 (H16: 32 B of RAM at `$8B26-$8B45`, no code) | 15 |
| initial block | 13,621 | **13,621** | 13,621 |
| DFMC records | 11 of 11 | 11 of 11 | — |
| extension sectors | 102 | **107 → 108** (record 8 +4 → +5, record 9 +1) | +4 |
| ATR menu frame (limit 603) | 547 | **557 → 559** at 2 per sector; step 5 measured 1 per sector | 556 |
| menu frames left under the STOP rule | 56 | **46 → 44** | 47 |
| unowned state RAM | 22 B (unchanged by §9) | 1 B (P8 8 B at `$8133-$813A`; H15 13 B in `$813B-$813F` and `$85E6-$85EE`) | — |
| level image | 13 sectors | 13 sectors | 13 |

### 6.3 The window, in the decided order

Order (owner, 2026-10-02): the break-up task, M4, M5, then this plan's three
sessions, then M6. Figures are `expected → budgeted`; M4, M5 and M6 are the
budget's lines (150 → 180, the B-A boss 1,140 → 1,368, 150 → 180), this plan is
928 → 990 (§5).

| Point on the road | Window free | Note |
| --- | ---: | --- |
| today | 1,480 | actual, after step 5 |
| after the break-up task | 1,480 | it uses the pin and the arena, not the window |
| after M4 | 1,330 → 1,300 | **what the boss plan has to work with** |
| after M5, boss B-A | **190 → −68** | B-B (1,210 → 1,452): 120 → −152; B-C (1,290 → 1,548): 40 → −248 |
| after this plan's session 1 (333 → 352) | −143 → −420 | |
| after session 2 (99 → 114) | −242 → −534 | |
| **after session 3** (496 → 524) | **−738 → −1,058** | |
| after M6 | −888 → −1,238 | |

The totals are the ones the first version of this section gave; the order
changes who meets the shortfall. **The boss no longer does.** At M5 the window
has 1,330 → 1,300 B, the cheapest boss fits on expected figures with 190 B to
spare and is 68 B short on budgeted ones, and any single lever covers that.
**This plan's sessions do**: they need 928 → 990 B and find 190 → −68, so they
are short by **738 → 1,058 B**, and even session 1 does not fit without a
lever.

**Against the listed levers** (budget §4.1), with what is left of each when
this plan's sessions start:

| Lever | Buys | Condition |
| --- | ---: | --- |
| `LEVEL_BUFFER` 16 → 14 sectors (lever 2) | 256 | only if the boss needs neither a row map nor a second WaveDef page; known once the boss is planned |
| the `STARFIELD` run tail (lever 4) | 309 | a cfg and build change; risk 3 |
| the arena's free bytes | 95 | after this plan's own moves (35 today) |
| the `BROADSIDE` pins (lever 3) | 15 | 5 in the pin, 10 in the codebook reserve (§3.5 note) |
| **subtotal** | **675** | covers sessions 1 and 2, which end 242 → 534 B short; 63 short of the whole plan on expected figures, 383 short on budgeted ones |
| the splash blob's RAM after the hold (lever 10) | 512 | risk 4: needs a copy after the splash |
| **total** | **1,187** | covers the whole plan on budgeted figures with 129 B over; M6's 180 is then 51 short |

So in this order a **lever session comes between M5 and this plan's session
1**. One of `LEVEL_BUFFER` and the `STARFIELD` tail carries sessions 1 and 2 on
expected figures, both together on budgeted ones; session 3 (wave paths) needs
both and, on budgeted figures, the splash RAM as well, or some of the cuts
below. Which levers, and when, is
still budget item 6; it is now a decision for after the boss plan, when the
boss's real size and its need for the level buffer are known.

**What M4 and M5 should leave alone, because this plan is priced on it:** 98 B
of the `BROADSIDE` pin (§9 left 103) and 6 B of the codebook reserve; the
arena's 35 free bytes; 21 B of the unowned state RAM at `$8133-$813F` and
`$85E6-$85EE` (M4's campaign variables and the boss's state should come from
`ENTITY_STATE` or the free zero page — if they take the gaps, this plan's state
goes to the zero page instead); 32 B of the `PICKUP_CODE` RAM tail; record 9's
94 spare packed bytes; and 10–12 ATR menu frames. Menu frames in this order:
56 left today, 52 after M4, 34 after M5, **24 → 22 after this plan**, 20 → 18
after M6.

Where the plan's 928 → 990 B against the budget's 472 comes from: the two new
requirements take ~260 B of window (and ~40 B of the pin); M3 is 52 B over its
line even with the library and the companion no longer resident, because the
evaluator measured 357 B against an estimate of 264; the spawn function's
143 B move into the window so that the Bomber's package fits the arena; and
~65 B of package C that the budget had placed in the arena.

**What could be cut from this plan instead**, each an owner's choice and none
recommended here:

| Cut | Window B back | Price |
| --- | ---: | --- |
| the column-tracking helper shared with the Interceptor's own branch | 65 | +12 cycles on every Interceptor tracking frame — a standing cost on a path that step 5 held at `main`'s cycles |
| one damage stage instead of two | 12 | less to see |
| the armoured dodge | ~46 | requirement 1 loses its dodge |
| the volley code into the arena's free bytes | 72 | record 7 comes within ~10 packed bytes of a sector |
| the evaluator in ASM in the Light kernel | ~200 (**G**) | movement policy in ASM, against the C/ASM ownership rule; not proposed |

---

## 7. Implementation sessions

Three (decided, §8.1 item 9), in this order. **They wait until after M5**
(owner, 2026-10-02): the road is the break-up task (§9), M4, M5, a window lever
session (§6.3), then these three. M3-H goes first because it returns cycles
before M3 spends any and because it is the one that changes level 1's replays;
M3 then leaves level 1's data alone.

**Re-base note (2026-10-02).** The order stands. Its first reason now reads
differently: M3-H returns about 930 of margin on Raider kill and standing
rows, but the worst row is a spawn frame, where sessions 1 and 2 cost about
200 → 260 and session 3 nothing (§6.1). No session is at risk of the GO line
on these figures. The spawn row has its own STOP lines in sessions 1 and 2
(owner, 2026-10-02, §8.2 E).

**Re-base before session 1.** M4, M5 and the lever session will have moved the
layout and the replays. Session 1 starts by running
`scripts/measure-heavy-member-costs.mjs` and the fence analysis of §1.2 on the
`main` of that day, and restates §5 and §6 from those figures: the measured
component costs (485, 467, the evaluator's 333–426) are properties of the code
paths and should hold; the free bytes, the record spares and the binding rows
will not be today's. Each session: its own branch from `main`, focused
tests RED first, `npm test` on the **default** build before gates are
reported, `tests/runtime-evidence-binding.test.mjs` in every focused set,
evidence regenerated at the end (`build:candidate` → `runtime:wall-trace
--atari800-source=build/atari800-trace` → `build`), the dist manifest and
`docs/media` binding hashes committed with it, `OWNER-SMOKE CANDIDATE` on exit.

**Common STOP conditions:** a new boot sector; the initial block over 13,621 B
without the owner's approval of the named bytes (the transport STOP line stays
13,652); the ATR menu delta over +7 against 596; a worst fence margin under
500; a DMA-on frame over 32,568 (over 31,200 is reported, not a STOP); any
byte in `CODE`, `RODATA`, `STARFIELD` or `ENTITY_CODE`; a recorded-failure set
that changes other than by a re-scripted clause; a standing Light or Bomber
path that costs more than `main` beyond the figures this plan names.

### Session 1 — `feat/heavy-package`: descent, kinds, hold, hit points, dodge

* **Scope:** H1–H9 and H15; the compiler's `kind` and `hold`; level 1
  recompiled (motion byte `$00`); level 2 authors its armoured waves and holds
  (armoured Raiders wear the Raider art until session 2); `how-to-play` EN and
  PL (slower Raiders, the armoured kind, the Bomber's dodge);
  `docs/level-authoring.md`, `docs/game-design.md`, `docs/memory-map.md`.
  The rotate prediction is not in this session: it is the standalone task of
  §9 and is on `main` long before.
* **First step:** `node scripts/measure-heavy-member-costs.mjs` on `main`, kept
  for the comparison.
* **Extra STOP conditions:** `update_enemy` with two live assault Raiders over
  1,200 cycles on any frame after the spawn frame, or the net saving under 400;
  record 1 or record 7 gaining a sector; the Raider's pursuit differing from
  `main`'s frame by frame. **The spawn row (owner, 2026-10-02):** `reset_enemy`
  measured natively (`scripts/measure-population-harness.mjs`) more than
  **+75** cycles over `main`'s 1,613 for a Raider formation or 2,245 for a
  Bomber formation is a STOP; a worst fence margin under **1,100** is reported
  with its row before the session continues.
* **Tests RED on `main`:** `tests/heavy-package.test.mjs` (§3.5), the compiler
  cases in `tests/level-compiler.test.mjs`.
* **Evidence:** regenerated; replays re-scripted where the capsule cadence
  moved; level 1's formation counts and the sector-3 sizing re-measured (§4.1);
  full PAL audit; level 2 through the debug route.
* **Smoke:** level 1 — Raiders descend at half speed and still chase sideways;
  no flicker or tearing of a Raider body; Bombers dodge when hit and take five
  hits on HARD; the capsule still comes on every third kill. Level 2 sector 5 —
  armoured Raiders stop at their row, fire, take two hits, jump sideways on the
  first. Real hardware: the Raider bodies during descent and hold.

### Session 2 — `feat/heavy-looks`: the armoured look and the damaged look

* **Scope:** H10–H14 and H16; `heavyLook` in the compiler and the payload
  (decision 4); the hole pairs in `assets/graphics/enemy-roster.json` and their
  preview; level 2's armoured silhouette. This session is hardware-critical
  (PMG plane writes and a self-modified operand in the body copy), so it
  starts with the native plane-integrity test and ends with a hardware smoke.
* **Extra STOP conditions:** `draw_enemy_member` larger than today or any later
  `BROADSIDE` label moving; a body copy costing more than `main`'s; the punch
  over 1,100 cycles; a plane byte differing from the body its member's Y and
  damage stage imply on any frame; any cost on a frame with nothing pending.
  **The spawn row (owner, 2026-10-02):** `reset_enemy` measured natively more
  than **+125** cycles over the same `main` figures (1,613 Raider, 2,245
  Bomber; sessions 1 and 2 together) is a STOP; a worst fence margin under
  **1,100** is reported with its row before the session continues.
* **Tests RED on `main`:** `tests/heavy-looks.test.mjs` (§3.5).
* **Evidence:** regenerated (the body copy changes on every frame).
* **Smoke:** level 2 — the armoured Raider is told from the assault Raider at a
  glance and is still plainly a hostile; a damaged Bomber and a damaged
  armoured Raider show holes that stay through movement, hold and dodge; the
  two members of a formation are damaged independently; a new formation is
  whole. Level 1 — Bombers show damage; Raiders look as before.

### Session 3 — `feat/wave-paths`: M3

* **Scope:** P1–P8; the compiler's path vocabulary and library (decision 6);
  level 2's paths, mirror, volley and held fire; level 1's data untouched.
* **First step:** the Light tick cases of the helper on `main`; the evaluator
  integrated and measured against §1.3's budget before anything else is built
  on it.
* **Extra STOP conditions:** a Light on a path over 440 cycles for the whole
  tick, or over +125 averaged over a segment; a free Light with no path over
  +20, an escort over +5; record 8 over 14 sectors; a wave with no path moving
  differently from `main`.
* **Tests RED on `main`:** `tests/wave-paths.test.mjs` (T14, §2.4).
* **Evidence:** regenerated (the tick changes); PAL audit with the swarm
  replays; level 2's swarm sectors through the debug route.
* **Smoke:** level 2 — a snake, a mirrored sine, a dive that leaves through the
  top, a volley, a wave that holds its fire; level 1 unchanged.

---

## 8. Owner decisions

### 8.1 Decisions taken on this document (owner, 2026-10-02)

| # | Decision | Recorded as | Where it is priced or applied |
| ---: | --- | --- | --- |
| 1 | **The assault Raider uses the alternate-frame descent** (decision 3b as written) | it is what returns 467 cycles on every frame with two Raiders live. Assault at today's full speed is kept as an **M8 balance option**, to be re-measured after the break-up task (§8.2) | §3.3 (the rate is a byte set at spawn), §6.1 |
| 2 | **The armoured Raider descends at the same rate and is slower through its hold** | one frame in four is not built (an unharmed formation would stay 1,585 frames) | §3.1 |
| 3 | **Armoured Raider hit points 2 / 2 / 3** | one rule with the Bomber's 4 / 4 / 5: +1 on HARD above 1 HP | §3.1, item H6 |
| 4 | **The armoured look takes 17 B of the reserved `hull_params`** | 15 of the 32 B stay for capital geometry 4.8a, which the owner expects to move after 1.0 | §4.3 |
| 5 | **Two damage stages, at 2 HP and 1 HP left** | a member that skips a threshold gets the later stage | §3.4 |
| 6 | **The path record is dy / frames / flags; every path is in the level's payload and the library is in the compiler** | a departure from design-4.6 §1.4; a level may use eight distinct paths; no resident library, no motion companion | §2.1, §2.2 |
| 7 | **The Raider gate is ASM** | kind, hit points, rate and hold are decided in C at spawn; the gate executes them | §3.3 |
| 8 | **The rotate-gate fix for Heavy break-ups is taken, as its own small task, run before M4 and M5** — not inside this plan's sessions | §9 is that task, written to be implemented from that section alone. **The spawn half stays open** (§8.2) | §9 |
| 9 | **Three implementation sessions** | the PMG work (session 2) is reviewed on its own | §7 |
| 10 | **Level 1's Raider wave count may change only at the smoke** | the session re-measures sector 3's sizing first and proposes the smallest change | §4.1 |
| — | **Order: M4 (campaign loop) and M5 (boss) come before this plan's three sessions** | the sessions wait until after M5; the window is restated in that order | §6.3, §7 |

No approval for initial-block bytes was needed: the plan uses none.

### 8.2 Still open

Restated at the re-base of 2026-10-02 and **answered by the owner the same
day**. Only B is still open. None of the answers changes the session order, a
session's scope or a §8.1 row.

| # | Item | Owner's answer (2026-10-02) | Numbers |
| ---: | --- | --- | --- |
| A | **The spawn rotate gate: defer a Heavy spawn off a ring-rotate frame by one frame** | **Not now. A reserve lever.** No change to the sessions | priced in §8.3: 5 B in `PICKUP_CODE`, +1 extension sector, 1–2 ATR menu frames, no token; the replays diverge and need re-scripting; the binding row would be ~2,944 today and ~3,600 after the sessions (1,439 and ~1,175 without it) |
| B | **Which levers pay the window, and when** (budget item 6) | **Unchanged — still open:** decided after the boss plan (M5), before this plan's session 1 | §6.3: 738 → 1,058 B short when the sessions start; `LEVEL_BUFFER` + the `STARFIELD` tail + the arena and pins give 675, the splash RAM 512 more |
| C | **Assault Raider at today's full speed** | **No. Keep the decided descent** | §6.1: the worst margin is the same either way (1,235 → 1,175, the spawn row); full speed would give up ~930 of margin on Raider kill and standing rows and cost ~97 there; DMA-on maximum 31,133 either way. §8.1 item 1 is left as worded |
| D | **A dated note in `budget-1.0.md`** saying that its M3 / M3-H cycle lines are superseded by §1.4 and §6.1 here | **Yes — done** with this revision; the only change outside this file | three lines under the budget's "Amended" paragraph; nothing else in the budget is rewritten |
| E | **STOP lines for the spawn row in sessions 1 and 2** | **Yes — done** (§7) | `reset_enemy` natively no more than +75 over `main`'s 1,613 (Raider) and 2,245 (Bomber) after session 1 and no more than +125 after session 2; a worst fence margin under 1,100 is reported with its row before the session continues. The common STOP at 500 stays |
| F | **Two readings in the re-base brief that differ from §8.1** | **§8.1 wins on both:** M4 and M5 come before this plan's sessions; the armoured Raider's hit points are 2 / 2 / 3 | no figure changes: §6.3 is already in that order and §3.1 already has 2 / 2 / 3 |

### 8.3 The spawn rotate gate, priced (reserve lever A — not taken, owner 2026-10-02)

Not built, not measured as a build. Asked for by the owner on 2026-10-02 after
the re-base showed nine of the ten worst fence rows are Heavy spawns on a
rotate frame. **The owner's answer: not now; it is kept here as a reserve
lever with this pricing, and no session builds it.**

**What it is.** In `interceptor_admission_update` (`src/main.s`,
`PICKUP_CODE`), at `@request`, before the Director is asked:
`jsr world_rotate_due` / `bne @blocked`. On a frame that will rotate the ring
the request is not made; the retry timer is still zero, so the next frame asks,
and that frame never rotates (two rotates are never consecutive — asserted in
`src/main.s`). The sum is exact at this point for the reason §9.2 gives:
`scroll_accumulator` is written only by `update_starfield`, which runs later in
the frame (**IC**, source reading). The decision "admit a Heavy" stays the
Director's, in C; this is when the kernel asks, beside the capital and
player-lifecycle tests already there.

| | Figure | Basis |
| --- | --- | --- |
| Bytes | **5 B in `PICKUP_CODE`** (65-B tail → 60). Nothing in the initial block, the window, the arena, the pins or RAM | **IC** |
| Transport | record 2 is stored raw at 1,128 of 1,131 B, so **+1 extension sector** (102 → 103, total 209 → 210); ATR menu frame 547 → 548–549 of 603. M4's 12 B then ride in that sector, as the budget assumed | **M** record size; menu frames **AN** (step 5 measured 1 per sector, the rule counts 2) |
| The token | **not needed.** A spawn claims no token today (the five claim sites are the Light's admission, fire, look install and break-up, and the Heavy break-up), and the wait is bounded at one frame by the scroll cadence, with no pending byte and no forcing rule | **IC** |
| Cycles, a request frame that goes ahead | +35 native (`world_rotate_due` 27 **M**, the `jsr` and the branch 8 **IC**), about 77 of margin | **M** + **IC** |
| Cycles, the deferring frame | +36 native, about 79 of margin, and the whole admission leaves it: the `enemy_update` segment of a rotate spawn frame is 5,666 mean (5,022–5,927) against 342 on the frame before | **M** trace |
| The deferring frames (rotate, no spawn) | worst margin about **7,100** over the 218 rows | **AN**, modelled on today's rows |
| The frames the spawn lands on (no rotate) | worst about **4,360**: today's no-rotate spawn class is 4,435 (**M**, 208 rows) less the test; the model over the 218 moved rows gives 4,930 | **M** class, **AN** model |
| **The row that binds after it, today** | **~2,944** — a Raider kill with its break-up on a non-rotate frame (`raider-remnant-spread-atr-hard` f2052), 2,444 over GO | **M** today's row; **AN** as a projection, because the replays move |
| The row that binds after it and this plan's sessions | **~3,600** — a Bomber kill with its break-up, no rotate (§6.1: 3,642 → 3,629); the punch frame is next at ~3,800 | **M** rows, **IC** items |
| DMA-on maximum | unchanged, 31,133 (the gate is before the fence) | **M** mechanism, §1.4 |
| Level 2 (diagnostic) | its worst row, 1,615, is the same class and moves with it | **AN** |

**What the player sees.** A Heavy formation appears one frame (20 ms) later on
the admissions that fall on a rotate frame — 218 of the 426 in the evidence
run; on ACE the ring rotates on every second frame, on PILOT on 9 of 20, on
ROOKIE on 2 of 5. Nothing visible. **Collisions:** none change. On the
deferring frame the formation does not exist yet, so nothing can hit it and it
can hit nothing. A request the Director would have refused is also asked one
frame later, so the retry cadence after a refusal shifts by a frame too (**IC**).

**Replays diverge, unlike §9.** §9 moved a collisionless effect; this moves a
formation. From its first deferred spawn a replay runs up to one frame late per
admission: kill frames, scores over time, the capsule cadence and the Light
escorts' timing all move. So the evidence is regenerated **and re-scripted**:
the four native clauses that arm on the Spread booster, the three recorded
contact sessions, and level 1's pinned counts (100 / 109 / 116 formations,
capital at frame 606, level complete at 8,249 / 7,424) are re-measured with
`scripts/level-timeline.mjs`; a sector whose last formation arms with a frame
or two to spare could lose it (**G**; the session measures it). Session 1
re-scripts the same replays for the slower Raiders, so if the lever is ever
pulled, the cheapest moment is directly before that session.

**Tests, RED on `main`:** natively, in the production frame order — with a
Heavy wave armed, the retry timer at zero and the accumulator set so the frame
rotates, one frame leaves no Heavy live and the Director's wave count
untouched, and the next frame spawns the formation; a request on a non-rotate
frame spawns on that frame; a refused request sets the retry timer as on
`main`. Size pins: initial block 13,621 B, record 2 at 10 sectors, no other
record moved. **STOP conditions:** any byte in the initial block or a boot
sector; a spawn later than the frame after its request; more than one new
sector; a worst fence margin below 1,439.

**The alternative that needs no sector, not recommended:** re-point the `jmp`
at `integration_interceptor_retry` (`CODE`, byte-neutral) to an 8-B veneer in
the `BROADSIDE` zero pins. It runs the test on every frame with no Heavy live
(about +38 native, ~84 of margin, on every SWARM and capital frame), takes pin
bytes this plan's sessions are priced on, and changes an operand in the
initial block, whose packed size is not predictable byte for byte (**IC**).

---

## 9. Standalone task — the rotate gate for Heavy break-ups

**IMPLEMENTED 2026-10-02, `OWNER-SMOKE CANDIDATE`** — branch
`fix/heavy-breakup-rotate-gate`, on `main` since `c5470a8` (evidence
`2777e8f`, documents `c92f908`). Measured: worst fence margin **1,439**, arena
**35 B** free. §9.5 is the as-built record and sets §9.3's prediction against
the measurement. §9.1–§9.4 are the brief as it was given.

**Taken by the owner on 2026-10-02 as its own small task, run before M4 and
M5.** It is not part of M3 or M3-H and does not depend on them. This section is
its whole brief.

### 9.1 The defect

A Heavy break-up is a deferrable consumer of the one-expensive-event token: it
is visual only, its position is captured on the kill frame, and it is forced on
its second attempt. `enemy_c_heavy_breakup_claim` (`src/c/lifecycle.c`) claims
through `light_take_deferrable_token`, which refuses on a ring-rotate frame by
testing `light_rotate_frame == FRAME_COUNTER`. That marker is written by
`advance_starfield_layers`, inside `update_starfield`. The claim is made from
`resolve_enemy_damage`, inside `handle_collisions`, which the main loop runs
**before** `update_starfield` (`src/main.s`, `main_loop`). So when the claim
asks, the marker still names an earlier rotate frame and the test can never be
true: the break-up is spawned on the kill frame whether or not that frame
rotates.

MEASURED on the committed evidence run (`build/m3-probe/b2-kill-frames.mjs`
over `build/runtime-wall-trace/*.csv`): of 902 Heavy kills, 389 spawned their
break-up on a rotate frame (282 Raider, 107 Bomber) and 454 on a non-rotate
frame; the 60 break-ups that were deferred were deferred by a spent token, never
by rotation. The six worst kill rows of the run — 788, 1,831, 1,861, 2,170,
2,411, 2,441 — are all rotate-frame kills with the break-up on them, and 788 is
the worst fence margin of the game.

`tests/heavy-breakup.test.mjs` has a test named "a rotate-frame kill defers, and
the deferred break-up lands on the very next frame". It passes because it pokes
the marker by hand before calling `resolve_enemy_damage` — a state the
production frame order cannot reach.

### 9.2 The fix

Ask the question the frame can answer at that point: **will this frame
rotate?** `update_starfield` rotates when `rate + scroll_accumulator ≥
HULL_SCROLL_RATE_DENOMINATOR`, where the rate is `world_scroll_rates[difficulty]
× 2` in fighter space and `hull_scroll_rates[difficulty]` during a capital
traversal — and `src/main.s` asserts those two are equal on every difficulty.
Nothing between `handle_collisions` and `update_starfield` writes the
accumulator. So the same sum, made at claim time, is exact.

| Piece | Code | Segment → record | Bytes | Basis |
| --- | --- | --- | ---: | --- |
| `world_rotate_due`: `ldx DIFFICULTY_SETTING / lda world_scroll_rates,x / asl / clc / adc scroll_accumulator / cmp #HULL_SCROLL_RATE_DENOMINATOR / lda #0 / rol / rts` — returns 1 when this frame will rotate | new, at the head of the `BROADSIDE` zero pin `hull_sequence_reserve` (the pin's label and length stay; its first 16 bytes become code) | `BROADSIDE` → record 1 (109 packed B spare) | 16 → 17 | **IC** |
| its address for C | a constant in `src/hybrid/c-asm-abi.s` exported as `_asm_world_rotate_due`, with a link-time `.assert` in `src/main.s` that the routine is exactly there — the pattern `NEAR_STAR_PIXEL_OPERAND` uses | — | 0 | **AN** step 5 |
| the claim: after the `heavy_breakup_pending` test, `if (asm_world_rotate_due() != 0) { heavy_breakup_pending = 1; return 0; }`, then the existing token claim unchanged | `enemy_c_heavy_breakup_claim` | arena → record 7 (35 packed B spare) | 10 → 12 | **IC** |

**Total 26 → 29 B, no window byte, no sector, nothing in the initial block**
(`src/main.s` gains code only inside the `BROADSIDE` pin and one `.assert`).
After it: pin 104 B of zeros left, arena 30 B free, record 7 about 723 of 747.

The denied claim does not burn the token, exactly as a rotate denial inside
`light_take_deferrable_token` does not. The forced second attempt is the
existing one — `heavy_breakup_retry` at the head of `integration_update_enemy`
on the next frame — and needs no change: two rotates are never consecutive
(`src/main.s` proves and asserts it), so the frame after a rotate frame is
never one. The kill, its score, its sound and the `COLBK` flash stay on the
kill frame, as they do for a token deferral today.

Not in this task: the Light's break-up has the same stale marker when its kill
comes from a player shot, but `enemy_c_light_hit` is also called from inside
`light_update`, after `update_starfield`, where the marker is exact and this
sum would describe the *next* frame. None of the ten worst rows is a Light
kill. Keeping Heavy spawns off rotate frames is §8.2 item A.

### 9.3 Expected effect

| | Today | Expected | Basis |
| --- | ---: | ---: | --- |
| `resolve_enemy_damage` on a rotate-frame Heavy kill | 1,272 (Raider), 1,307 (Bomber) | ~810 / ~840: the spawn's 494–497 leave (a token-deferred kill measures 773 / 805 today), the rotate test adds ~36 | **M** native (`build/m3-probe/d-deferred-kill.txt`); **IC** for the test |
| the same on a non-rotate kill | 1,272 / 1,307 | +36 | **IC** |
| first update and first render of the five break-up cells, which also leave the rotate kill frame | in the trace, kill frames with the break-up on them run `entity_render` 1,126–1,516 mean (1,882 on f5815, against 24 on a frame with no effect) and `entity_update` ~450 over a frame without one | ~1,500–1,900 | **AN** trace class means |
| **cycles leaving each rotate-frame kill** | — | **roughly 2,000–2,400** | ~460 measured plus the row above |
| the six binding kill rows (788 … 2,441) | 788 worst | **≥ ~2,700**; today's rotate-frame kill rows without a break-up on them have a worst margin of 4,913 | **AN** |
| the frame the break-up lands on (the next, never a rotate frame) | — | today's deferred break-ups land with a worst margin of 4,753 | **M** trace |
| **worst fence margin of the evidence set** | **788** | **~1,423 — the Heavy spawn row (`2-evasive-fire3` f287), 923 over GO** | **AN** |
| DMA-on maximum | 31,133 | unchanged: f5797 is a standing frame | **M** |
| any frame without a Heavy kill | — | 0 | **IC** |

Nothing the player can measure changes: a break-up appears one frame later on
about 43 % of Heavy kills. The break-up is collisionless, so no gameplay state
moves; scores, kills and the capsule cadence of every replay should be
identical to `main`'s.

### 9.4 The session

* **Branch** `fix/heavy-breakup-rotate-gate` from `main`; one session. It is
  reversible gameplay-timing work with a native proof first.
* **First step:** record `main`'s counts before changing anything. The
  classification used here — Heavy kill frames from the per-frame CSVs, split
  by whether the `world_ring` segment is over 4,500 cycles (a rotate frame) and
  by whether the effect count rises to 5 on the kill frame — was a one-off
  script in `build/m3-probe/`, which is not tracked, so the session writes it
  again (about forty lines over `auditSamples`).
* **Tests, RED on `main`**, in `tests/heavy-breakup.test.mjs`:
  1. "a Heavy killed on a frame that rotates the ring parks its break-up, in the
     production frame order" — with the scroll accumulator set so that this
     frame rotates and the marker left as production leaves it, arm a kill and
     run one whole production frame (`frame()` from
     `scripts/measure-population-harness.mjs`): the effect pool is empty and
     `heavy_breakup_pending` is 1 after it; after the next frame the pool holds
     the break-up and the byte is 0. On `main` the pool is full after the first
     frame.
  2. "`world_rotate_due` agrees with `update_starfield` on every frame" — over
     400 production frames on each difficulty, the routine's answer at the top
     of the frame equals whether `light_rotate_frame` names that frame at its
     end. On `main` the label does not exist.
  3. "a non-rotate kill still spawns on the kill frame" and "a denied claim
     leaves the token unspent" — controls.
  4. Cycle pin: `resolve_enemy_damage` on a rotate-frame kill ≤ 850, and the
     retry on the next frame ≤ 520 (today 495–498).
  5. Size pins: initial block 13,621 B; `BROADSIDE` size unchanged and
     `hull_sequence_reserve` at its address; arena free ≥ 28 B; record 1 and
     record 7 sector counts unchanged.
  The existing "a rotate-frame kill defers…" test stays, with a comment that it
  exercises the token gate with a hand-set marker.
* **Gates:** `npm test` on the default build; the standing transport rule (no
  boot sector, initial block ≤ 13,652 and unchanged at 13,621, ATR menu frame
  unchanged at 547); the PAL audit.
* **Evidence:** regenerated (`build:candidate` → `runtime:wall-trace
  --atari800-source=build/atari800-trace` → `build`), with the dist manifest
  and `docs/media` binding hashes. Report from it: Heavy kills with the
  break-up on a rotate frame (**expected 0**), the worst fence margin and its
  row, the DMA-on maximum, and the final score of each replay against `main`'s.
* **STOP conditions:**
  * any byte added to `CODE`, `RODATA`, `STARFIELD` or `ENTITY_CODE`, or the
    initial block not exactly 13,621 B;
  * record 1 or record 7 gaining a sector, or any `BROADSIDE` label after
    `hull_sequence_reserve` moving;
  * a break-up spawning later than the frame after its kill, or a kill losing
    its score, sound or flash on the kill frame;
  * the worst fence margin below `main`'s 788, or below 1,300 without the row
    being explained;
  * a replay whose score, kill count or capsule sequence differs from `main`'s
    — the change is meant to be visual timing only, so a difference is a
    finding to report, not something to re-script;
  * a recorded test or clause failure appearing or disappearing other than a
    clause that asserted a break-up on the kill frame, which is re-pointed with
    its reason in the test.
* **Smoke:** Heavy kills look as before — flash, sound and score on the hit,
  fragments immediately after; no visible delay; Bombers and Raiders both.
* **Documents:** STATUS (the new worst margin and row, the arena and pin
  figures), `docs/memory-map.md` (the pin's first 16 bytes are code), this
  section marked as built with its measured figures.

### 9.5 As built (2026-10-02, MEASURED)

**Code.** As §9.2, with two differences. `world_rotate_due` ends `lda #$00 /
adc #$00`, not `lda #0 / rol`: the JS NMOS core that every build-time cycle
measurement runs on has no `rol` (no shipped path uses it), so the build stopped
on `$2A`; the routine is 17 B, the top of §9.2's range. The claim is **+7 B**,
not 10–12: cc65 shares the parking tail (`lda #1 / sta pending / … / rts`) with
the token denial.

| | `main` `e3bd098` | built | source |
| --- | ---: | ---: | --- |
| `world_rotate_due` | — | 17 B at `$69D7`, head of `hull_sequence_reserve`; 103 B of zero left; no later label moved | `build/void-strike-65.lbl` |
| `BROADSIDE` raw / packed (record 1) | 6,653 / 5,502 of 5,611 | **6,653 / 5,517 of 5,611**, 44 sectors | `build/manifest.json` |
| arena used / free (record 7 packed) | 790 / 42 (712) | **797 / 35 (719)**, 6 sectors | same |
| initial block / boot / total sectors | 13,621 / 107 / 209 | **13,621 / 107 / 209** | same |
| ATR menu frame (baseline 596) | 547 | **547** | boot smoke |

**Cycles, native harness** (`scripts/measure-heavy-member-costs.mjs` state, a
contact-sourced kill as §9's figures were): `resolve_enemy_damage` on a
rotate-frame kill **763 / 795** (Raider / Bomber; §9.3 expected ~810 / ~840);
on a non-rotate kill **1,309 / 1,344** (+37, §9.3 expected +36); the claim is
66 cycles when it parks, 129 when it spawns. **A §9 basis error:** that script
labels its kill source 1 as `DAMAGE_PLAYER_PROJECTILE`, but 1 is
`DAMAGE_PLAYER_CONTACT` (`src/main.s`); a player-shot kill also runs
`weapon_pickup_record_qualified_kill` and costs **32 cycles more** (836 / 868
in the production-frame test state). The test's ≤ 850 pin is held on §9's
basis (a contact kill: 804 / 836 there); the shot kill is pinned structurally
(`heavy_spawn_breakup` does not run on its frame). The forced retry on the
next frame is ≤ 520 (pinned).

**Evidence** (default run, 48 replays, + 8 mode-gated; standalone audit over
the 56 CSVs; classification by `scripts/measure-breakup-rotate-frames.mjs`):

| | `main` | built |
| --- | ---: | ---: |
| Heavy kills with the break-up on a rotate kill frame | 389 of 902 | **0** of 902 |
| break-ups landing on the frame after the kill | 2 | **400**; none later than kill + 1 |
| worst fence margin | 788 (`director-complete-2` f5815, Raider kill, rotate) | **1,439** (`2-evasive-fire3` f287, Heavy spawn, rotate) |
| worst rotate-frame kill row | 788 | **3,459** (`raider-remnant-rapid-atr-hard` f123; §9.3 expected ≥ ~2,700) |
| worst frame a parked break-up lands on | 4,753 | **4,753** (the same no-rotate row as before) |
| DMA-on maximum / physical headroom | 31,133 / 4,435 | **31,133 / 4,435** |
| miss events / DLI per host frame / sequence violations | 0 / 2 / 0 | **0 / 2 / 0** |

Level 2 (debug route, diagnostic): worst margin 1,615 and maximum 31,140, the
same frames as before (a Heavy spawn on a rotate frame and a no-kill frame);
0 of its 170 Heavy kills breaks up on a rotate frame; the elite sectors' minima
rise by up to 2,352 (`docs/diagnostics/level-2-timing-2026-09-30.md`).

The binding row moved +16 (1,423 → 1,439): the frame has no kill, and its
break-up cluster from an earlier kill is one frame younger. Over the 89,940
fence rows whose effect pool matches `main`'s, 95 % have an identical margin
and the median difference is 0: there is no standing cost.

**§9.3's prediction against the measurement** (added at the re-base):

| | Predicted (§9.2, §9.3) | Measured | |
| --- | ---: | ---: | --- |
| worst fence margin of the evidence set | ~1,423, the Heavy spawn row | **1,439**, that row | as predicted; +16 from a break-up cluster one frame younger |
| Heavy kills with the break-up on a rotate frame | 0 | **0** of 902 | as predicted |
| `resolve_enemy_damage`, rotate-frame kill (Raider / Bomber) | ~810 / ~840 | **763 / 795** | 47 / 45 better |
| the same on a non-rotate kill | +36 | **+37** | as predicted |
| worst rotate-frame kill row | ≥ ~2,700 | **3,459** | ~760 better |
| the old binding row, `director-complete-2` f5815 | ≥ ~2,700 | **4,333** (from 788), wall 29,743 on both builds | ~1,600 better: the prediction counted native cycles one for one (§1.4) |
| worst frame a parked break-up lands on | 4,753 | **4,753** | as predicted |
| DMA-on maximum | unchanged | **31,133**, unchanged | as predicted |
| code | 26 → 29 B | **24 B** (17 + 7) | under |
| arena free after it | 30 B | **35 B** | 5 better |
| zero left in the pin | 104 B | **103 B** | 1 worse (`adc` for `rol`) |
| gameplay state | none moves | **`player_health` differs in 4 of 56 replays** | not predicted; below. Owner decision 2026-10-02: keep the token unspent |

**A finding against §9.3 ("no gameplay state moves").** Scores, Heavy kill
frames, capsule sequences and lives are frame-exact against `main` in all 56
replays, but **`player_health` differs in 4** (`2-evasive-fire3`,
`2-sweep-fire5`, `debris-gate-0-neutral-fire0`,
`director-complete-1-natural-sweep-fire0`). Cause: `LIGHT_TOKEN_BUDGET` is 1
and the break-up claim shares the token with the Light's admission and fire
cadence. On `main` a rotate-frame kill spent the frame's token on the break-up,
so a Light claim later in the frame was refused; now the rotate denial leaves
the token unspent (as §9.2 specifies and the control test pins), the Light
fires one frame earlier, and the hostile-shot timeline shifts — first visible
as one extra hostile shot on the kill frame (`2-sweep-fire5` f129), then as a
hit that lands on `main` and not here (f218). None of the STOP conditions
covers health; it is reported, not re-scripted. If the owner wants `main`'s
Light cadence exactly, the parked claim could take the frame's token as
`main`'s claim did (a few bytes of C, not built or measured here), at the price
of the "a denied claim leaves the token unspent" property §9.4 asked for.

---

## 10. What this document did not do

No source, cfg, build-script, harness, evidence, `dist/` or `docs/media/`
change; no build; no emulator run; no baseline worktree.

**The re-base of 2026-10-02** changed this file only. It ran no build, no
trace and no emulator, and created no worktree: `build/` held `main`'s default
build, bound to the committed evidence (ATR `f127d7a4…`, boot `1daed1be…`,
both unchanged at the end). Re-run: `scripts/measure-heavy-member-costs.mjs`
(§1.1), the fence classification and the heaviest frames over §9's evidence
CSVs, and two native calls (`reset_enemy`, `world_rotate_due`). Not re-run,
with the reason given in place: the Light path prototypes (§1.3) and the
Raider gate prototype (§1.1). The spawn rotate gate (§8.3) is priced from
source reading and today's rows; no line of it was built. §6.1's projections
are a model: the item costs marked **IC** have never run, and the × 2.0 / × 2.2
conversion is measured on two code paths, not on each item.

**The owner's answers (2026-10-02)** were applied to §7 and §8.2, and one
dated note was added to `budget-1.0.md`; no other file changed, and no build
or trace was run. The Bomber's items
(H5–H8) and the punch (H12–H14) are instruction counts, not measurements, and
are marked so; the session that builds each replaces the figure. The cycle
lines of §6.1 are a model on today's replays. The prototypes in
`build/m3-probe/` are not production code: the gate holds at the Raider's
anchors rather than at an authored row, and the tick prototype stops at the
fire tail.
