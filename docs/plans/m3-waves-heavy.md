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
* **The binding frame is not what the budget said it was.** The worst fence
  margin (788) is a Raider *kill* frame that also rotates the ring and spawns
  the Heavy break-up; the standing two-Raider frame is the DMA-on maximum
  (31,133). Both get the saving. Modelled on today's evidence, the worst fence
  margin after M3-H and M3 is about **1,240 (740 over GO)** and the DMA-on
  maximum about **30,900**. The replays move with slower Raiders, so the
  session's own PAL audit decides; the model says the margin is not at risk.
* **A wave path costs about +100 cycles per Light that flies one** (MEASURED:
  the whole tick is 333–426 against 236–325 today). A Light with no path pays
  +18, an escort +3. Level 1 authors no path, so M3 costs level 1's binding
  row about 17 cycles, not the budget's 115.
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
  more. **Decided: it is a standalone task, before M4 and M5** (§9).

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
copy: nothing is added to the spawn frame, which is the second-worst kind of
frame in the game (§1.2). In `draw_enemy_member` the change replaces
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
| H14 | pending test and claim | `heavy_breakup_retry` site | `BROADSIDE` pin → 1 | Heavy frames, only when a bit is set | 12 → 14 | 0 with nothing pending | **IC** |
| H15 | state | — | unowned `$813B-$813F`, `$85E6-$85EE` | — | 13 B RAM | — | **IC** |
| H16 | damaged-body copy | — | the `PICKUP_CODE` RAM tail `$8B26-$8B45`, by address, no file byte, with a link-time assert against `__PICKUP_CODE_RAM_LAST__` | — | 32 B RAM | — | **IC** |

**Totals** (budgeted): `BROADSIDE` pin 98 of 120 B, in place −1; window ASM
210 B; window C 256 B (113 new + 143 moved); arena +83 −143 → **90 B free**
(the break-up task of §9 has taken 12 by then);
`HEAVY_CODE` 0; `PICKUP_CODE` code 0, its RAM tail 65 → 33 B;
`DIRECTOR_RAM` 0; 45 B of state.

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
| `BROADSIDE` zero pin `hull_sequence_reserve` | 1 | 120 B, all zero | the break-up task's rotate test 16 (§9); then gate 58, base veneer 26, pending test 14 | 6 B left; record 1 ~5,605 of 5,611 packed |
| `BROADSIDE`, `draw_enemy_member` | 1 | — | −1 B in place (the pad after it grows by one) | no label moves |
| `HEAVY_CODE` | 5 | — | one operand | unchanged, 12 B spare |
| arena | 7 | 42 B free | the break-up task +12 (§9); then spawn out −143, Bomber package +83 | **90 B free**; record 7 ~670 of 747 |
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
size** after the first build: with the break-up task's 16 B already there the
record has about 6 packed bytes to spare, so if it would gain a sector the base
veneer (26 B) moves to the window.

The arena's 90 free bytes are a reserve this plan does not spend. They can
take the volley code (72 B) if record 7's packed size allows, which would give
the window 72 B back.

---

## 6. Updated budget lines

### 6.1 Cycles

Modelled by applying the measured component costs to today's evidence rows.
The replays move with slower Raiders, so these are the plan's expectation, not
a result; each session's PAL audit is the result. The table is this plan's own
effect on today's rows. In the decided order the break-up task (§9), M4 and M5
come first: the break-up task is expected to take the kill rows out of the
worst ten, which leaves the Heavy spawn row (1,423) as the worst fence row
until this plan's sessions run, and the kill rows then gain this plan's 467 on
top of what the task gave them.

| Gate | Today | After M3-H | After M3 | Basis |
| --- | ---: | ---: | ---: | --- |
| Worst fence margin (GO ≥ 500) | 788 (f5815) | **1,255** — both Raiders are updated on that frame, so −467 | **1,238** — the escort becomes a free Wingman on that frame, +17 | **M** components |
| — margin over GO | 288 | 755 | **738** | budget: 422, then 374 at M6; 24 if the saving were zero |
| The next kind of row, a Heavy spawn on a rotate frame | 1,423 | ~1,320 (spawn code +100) | ~1,320 | **IC** |
| DMA-on maximum (target 31,200, hard gate 32,568) | 31,133 | ~30,890 — f5797 falls to ~30,670; the one-Raider and two-Bomber frames (30,863, 30,889) are not helped on their worst frame | ~30,910 | **M** components |
| — to the target | 67 | ~310 | ~290 | |

**If the assault Raider kept today's full speed** (not taken; an M8 balance
option, §8.2): the gate is still needed for the armoured kind and costs 44
cycles per frame for an assault pair with no saving. On today's rows: fence
margin 788 − 44 − 17 = **727 (227 over GO)**; DMA-on maximum ~31,180, 20 under
the target. The fence figure is to be re-measured after the break-up task,
which should remove the kill rows it is computed on; the DMA-on figure does not
depend on that task.

**Level 2** (diagnostic): its worst margin is 1,615 in an ELITE sector. An
armoured wave there is cheaper than an assault wave on its hold frames and +58
per frame otherwise; an Interceptor on a path in ELITE is +105. SWARM sectors
have ≥ 5,931 of margin; three Lights on paths cost +315 to +540.

**The budget's row for M6** (the booster's +48) lands on 738 instead of 422:
**~690 over GO** at the end of the road on these figures, before content
coincidences (the budget's −264 example) and before the break-up task (§9).

### 6.2 Bytes and transport

What this plan and the break-up task spend, applied to today's figures. M4 and
M5 are built in between (§6.3 has the window in that order); they are not in
this table.

| Resource | Today | After the break-up task and this plan (expected → budgeted) | Budget-1.0 expected after M3-H |
| --- | ---: | ---: | ---: |
| `$AE00` window free | 1,480 | **552 → 490** | 1,013 |
| arena free | 42 | **90** (30 after the break-up task alone) | 26 |
| `DIRECTOR_RAM` free | 43 | **43** | 1 |
| `BROADSIDE` zero pins | 136 | **22** (6 + the 16-B codebook reserve; 120 after the break-up task alone) | 56 |
| `PICKUP_CODE` tail | 65 code or RAM | 33 (32 B of RAM used, no code) | 15 |
| initial block | 13,621 | **13,621** | 13,621 |
| DFMC records | 11 of 11 | 11 of 11 | — |
| extension sectors | 102 | **107 → 108** (record 8 +4 → +5, record 9 +1) | +4 |
| ATR menu frame (limit 603) | 547 | **557 → 559** at 2 per sector; step 5 measured 1 per sector | 556 |
| menu frames left under the STOP rule | 56 | **46 → 44** | 47 |
| unowned state RAM | 22 B | 1 B | — |
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
| the arena's free bytes | 90 | after this plan's own moves |
| the `BROADSIDE` pins (lever 3) | 22 | 6 in the pin, 16 in the codebook reserve |
| **subtotal** | **677** | covers sessions 1 and 2, which end 242 → 534 B short; 61 short of the whole plan on expected figures, 381 short on budgeted ones |
| the splash blob's RAM after the hold (lever 10) | 512 | risk 4: needs a copy after the splash |
| **total** | **1,189** | covers the whole plan on budgeted figures with 131 B over; M6's 180 is then 49 short |

So in this order a **lever session comes between M5 and this plan's session
1**. One of `LEVEL_BUFFER` and the `STARFIELD` tail carries sessions 1 and 2 on
expected figures, both together on budgeted ones; session 3 (wave paths) needs
both and, on budgeted figures, the splash RAM as well, or some of the cuts
below. Which levers, and when, is
still budget item 6; it is now a decision for after the boss plan, when the
boss's real size and its need for the level buffer are known.

**What M4 and M5 should leave alone, because this plan is priced on it:** 98 B
of the `BROADSIDE` pin (the break-up task leaves 104); the arena beyond the
break-up task's 12 B; 21 B of the unowned state RAM at `$8133-$813F` and
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
  `main`'s frame by frame.
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

| # | Decision | Latest | Numbers |
| ---: | --- | --- | --- |
| A | **Keep Heavy spawns off ring-rotate frames** (the spawn half of the rotate finding) | any time after §9, whose rotate test it calls; it does not depend on this plan's sessions | +5 B in `interceptor_admission_update` (`PICKUP_CODE`): one call to §9's rotate test and a branch, so it needs §9 first. Record 2 has 3 B spare, so **+1 extension sector, +2 ATR menu frames** (M4's 12 B then ride in that sector, as the budget assumed). Effect: the 218 spawn frames that land on a rotate frame in the evidence run (worst margin **1,423**, mean 5,903) move to the non-rotate class (worst **4,448**, mean 9,181) — about +3,000 on the worst spawn row (**AN**, trace classes). Price: a formation arrives one frame later on about half of its admissions, which moves every replay's kill and capsule cadence, so the evidence is re-scripted as well as regenerated. After §9 the spawn row is the worst fence row of the evidence set, at 923 over GO, so nothing forces this |
| B | **Which levers pay the window, and when** (budget item 6) | after the boss plan, before this plan's session 1 | §6.3: 738 → 1,058 B short when the sessions start; `LEVEL_BUFFER` + the `STARFIELD` tail + the arena and pins give 677, the splash RAM 512 more |
| C | **Assault Raider at today's full speed** | M8 | the rate is a spawn-time byte, so it is a value change. On today's rows: 227 over GO and 20 under the 31,200 target; re-measure the fence figure after §9 |

---

## 9. Standalone task — the rotate gate for Heavy break-ups

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

---

## 10. What this document did not do

No source, cfg, build-script, harness, evidence, `dist/` or `docs/media/`
change; no build; no emulator run; no baseline worktree. The Bomber's items
(H5–H8) and the punch (H12–H14) are instruction counts, not measurements, and
are marked so; the session that builds each replaces the figure. The cycle
lines of §6.1 are a model on today's replays. The prototypes in
`build/m3-probe/` are not production code: the gate holds at the Raider's
anchors rather than at an authored row, and the tick prototype stops at the
fire tail.
