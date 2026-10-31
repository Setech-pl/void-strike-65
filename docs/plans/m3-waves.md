# M3 — wave paths, envelopes and chains

**OWNER REVIEW CANDIDATE — planning only, 2026-10-31.** Branch
`codex/m3-plan`, based on current main
`6046c0b6beb25f15c53ca15cda8f39a431983cd3` (includes M3-H session 2).
This document authorizes no implementation. Actual task delta: **0 code B,
0 state B, 0 resident B, 0 guest cycles**. Owner review is the next task.

This rebases the **M3/P1–P8** portion of
[the original plan](m3-waves-heavy.md#2-m3--wave-paths-v1-lights-only).
Its accepted dy/frames/flags format, compiler library and eight paths per
level remain fixed. Historical placements, CPU estimates, session ordering
and validation instructions do not override current code or AGENTS.md.
[M3-H session 2](m3h-session2.md) remains the Heavy package, not another M3
implementation session. Checkpoint 6 visuals were owner-accepted at `3468204`;
the subsequent departure repair is on main, but this plan records no new
owner smoke acceptance.

## 1. Fresh main baseline

**MEASURED**, fresh normal `npm run build` in this worktree, before any plan
edit. Task HEAD and main were identical and clean; no other checkout or
comparison export was needed. Build computed gates pass; release runtime
evidence is stale/pending and **release build will fail**. Neither old release
trace maxima nor old prose in the memory map are current measurements.
[Resources and artifact hashes](../diagnostics/m3-plan/resources.json)
retain relevant build-manifest fields; [validation audit](../diagnostics/m3-plan/audit.md)
records commands, tests and cleanup.

| Resource | MEASURED used / ceiling | Usable free and restriction |
| --- | ---: | --- |
| Physical Director window `$AE00–$BBFF` | 2,302 /3,584 B | 1,282 gross, including the boss lance's 768 B and 5 protected B |
| Feature window `$AE00–$B8FA` | 2,302 /2,811 B | **509 B**, contiguous `$B6FE–$B8FA`; `$B8FB–$B8FF` stays reserved |
| C arena `$7BD0–$7F0F` | 830 /832 B | **2 B**; no path evaluator/state here |
| Director high `$9D75–$9FF9` | 324 /645 B | **321 B**; shared resident policy, not an extra content home |
| Checked content home `$1180–$18FF` | 1,123 /1,920 B | **797 B**; 1 B header +1,093 B code +29 B data; fighter/capital lifetime only |
| L2 `$1900–$1FFF` | 1,290 /1,792 B | 502 physical; **246 usable** below its 1,536-B ceiling; 256-B post-1.0 reserve untouched |
| Initial boot content | 12,865 B | 787 B to historical 13,652 planning ceiling; 819 B to 13,684 physical ceiling; M3 requests **0** |
| Complete boot block | 12,928 B /101 sectors | Includes 63 B envelope; do not confuse with content bytes |
| MAIN Light composite | 1,196 /1,213 B | **17 B**, not an evaluator or batch-shot implementation home |
| C extension | 875 decoded B; 24-B segment tail | Existing record packs 750 B; no movement of admission/hot entry addresses assumed |
| Reader | 1,512 /1,536 B | **24 B**; old M4 estimates using 63 B slack are obsolete |
| Level image /payload | 2,048 /256 B | Existing path block **96 B** at `$AB30–$AB8F`; eight 12-B paths, currently unused |
| Remaining hull-parameter reserve | 5 B | 22-B block less 17-B Heavy look; not the old plan's 15 B |
| DFMC records /initial transport | **11/11**, **213 sectors** | 101 initial +112 extension; last sector 213, **26** sectors 214–239 before menu at 240 |

The build's nominal 507 remaining ATR sectors are not 507 freely allocatable
boot sectors: fixed menu/L2/content/level/boss/music runs already claim disk
space. Content is a separate checked **15-sector run at 265–279**; L2 is 14
sectors 251–264; menu is 11 sectors 240–250. These are not twelfth DFMC records.

| DFMC record | Raw B | Packed B /current sector capacity | Sectors | Packed slack B |
| --- | ---: | ---: | ---: | ---: |
| 1 BROADSIDE | 6,653 | 5,592 /5,611 | 44 | 19 |
| 2 pickup +sector stream | 1,185 | 1,185 /1,259 | 10 | 74 |
| 3 ABI | 106 | 105 /107 | 1 | 2 |
| 4 low C +glue | 498 | 441 /491 | 4 | 50 |
| 5 C extension composite | 750 | 750 /875 | 7 | 125 |
| 6 Director pre | 21 | 23 /107 | 1 | 84 |
| 7 arena | 830 | 702 /747 | 6 | 45 |
| 8 Director window | 2,302 | 1,888 /1,899 | 15 | 11 |
| 9 MAIN Light | 1,196 | 1,032 /1,131 | 9 | 99 |
| 10 reader | 1,512 | 1,512 /1,515 | 12 | 3 |
| 11 Director high | 324 | 289 /363 | 3 | 74 |

Capacity is `128 × sectors −21`; packed slack is not executable RAM slack.
In particular, record 8 has only 11 packed B despite 509 usable linked B.

### Quick native frames

Fresh Atari800 7.1.2 PAL, 64-KB XL/65XE class, DMA on. Only the two registered
quick routes run; no full native/home matrix, boot gauntlet, separate boss
stress, release trace or strict release is part of this task.

| Registered route | Frames | Worst wall cycles /frame | Capital peak | Minimum fence |
| --- | ---: | --- | ---: | ---: |
| Spread NORMAL `campaign-1-spread-capital` | 1,800 | **30,465**, SPACE frame 246 | 29,547 | 2,157 |
| Capital-960 NORMAL `l2-960-1-flight` | 3,967 | **31,153**, SPACE frame 2448 | 29,166 | 6,394 |

Worst of these routes: **31,153**; target margin 347, hard margin **1,415**,
physical margin 4,415. Both pass with 0 missed frames, extra VBI boundaries,
DLI ordering errors, shifted presentation rows, stale L2 accesses or
world/hull clock mismatches. Capital-960 boss entry 325 host frames ≤ 350.
[Fresh route summaries](../diagnostics/m3-plan/quick-summary.json) include
trace/state/artifact hashes. The capital-960 capital-only maximum differs
from older checkpoints; the current whole-route maximum reproduces 31,153.

These are route maxima, not a global gameplay maximum. Later M3 validation
also needs a short authored three-Light path/volley case: the unchanged
capital routes cannot exercise new paths which are absent from their data.
Instruction estimates below exclude DMA and waits. Do not add them directly
to these wall maxima or subtract them from publication-fence slack.

## 2. What M3 delivers

### Paths and envelopes

Only a **free Light wave in a SPACE sector** selects a path. Wingman and
Interceptor retain their renderer, HP, score, appearance and weapon class.
Heavy profiles, PMG ownership, boss escorts and Heavy escorts use their
current policy. `$FF` means the exact existing archetype movement; a path
replaces that movement, including Interceptor standoff/age loops. An escort
that loses its leader retains archetype movement, not an inherited path.

A path remains four 3-B segments, twelve bytes, per the accepted original
§8.1 decision 6:

| Field | Contract |
| --- | --- |
| `dy` | Signed −2…+2 raster lines per gameplay frame |
| `frames` | 1…255 frames; 0 only for a terminal segment proven to leave the field |
| `flags[1:0]` | Lateral period: 0 every frame, 1 every second, 3 every fourth; reject 2 in V1 rather than invent another cadence |
| `flags[3:2]` | None /right /left /toward player column, one 4-HPOS character-cell step |
| `flags[4]` | Segment permits fire; existing reload/weapon/pool rules still apply |
| `flags[6:5]` | Next segment, or back 1…3 segments relative to the current segment |
| `flags[7]` | Retire without kill credit at segment end |

“Sine” and “arc” mean readable piecewise-linear envelopes, not trigonometry.
Mirror swaps left/right on alternating **successful admissions**, not slot
parity: recycling a slot must not break the pattern. Tracking still targets
the player's quantized column; no pixel renderer or sub-cell X is introduced.
Clamp X to 48…200 before publication. V1 side exit ends at the legal edge and
retires through existing cleanup; it must never publish an offscreen X.
Retire before unsigned Y underflow/overflow can turn a departing path into a
new visible ship. No score, capsule, kill or breakup for a scripted retirement;
a player kill before retirement counts normally.

Recommended first library: shallow wave, snake, arc, dive-and-return,
tracking-dive, downward-drifting loop. Host library only; a level gets at most eight
distinct encoded records, deduplicated after parameter resolution. Mirror
reuses a record. Level 2's proposed pilot uses snake, shallow wave, upward
return and tracking-dive (four records); the arc/finite loop have review
fixtures before campaign authoring. A loop's vertical progress must prove a
bounded bottom exit; no extra repeat-counter array is assumed. Every path
has a deterministic exit.
Unbounded reachable loops, zero-duration holds and tracking-only terminals
which can stall at the player's column are rejected by the compiler.

### Chains through the existing Director

A chain is a named **authoring sequence expanded into ordinary WaveDefs**.
It is not a runtime queue, extra Director, dynamic allocator or new enemy
capacity. Names/macros are host conveniences; the emitted core keeps the
current eight-sector/twenty-wave limits and its fixed-size image. Explicit
WaveDefs remain valid. Expansion reports wave count, earliest rows, path
slots, requested population and terminal lifetime; exceeding a limit fails
compilation, without truncation.

Rows remain minimum start rows. The Light wave's lock holds until its last
member retires/dies; no next wave overlaps that lock. `afterCleared` retains
its current meaning for transitions involving Heavy/escorts. Existing spacing
floors, appearance-pair capacity, token denial/retry, ceilings, C1 drain and
early clear-sector completion still decide admission. Chains cannot force
success, create a fourth SWARM Light (current ceiling 3), or bypass a Heavy
departure cutoff. Avoid chains which rely on a kill at a prescribed frame.

A useful first chain is **teach → mirror → pressure → release**: an easy
single shape, its mirrored variant, a tracking or fire-window variant, then
a terminal departure. Repeating a path with changed authored spacing/entry
does not need a new runtime path record. Longer lives may hold the cursor
past a later row, or get cut by sector length; compiler timeline diagnostics
and a no-fire smoke must expose this rather than silently lose waves.

### Fire modes and the bit collision

The old plan assigns WaveDef bits 6/7 to volley/column fire. **They are now
Interceptor loop count**, for both standalone Interceptors and Heavy escorts.
Bit 5 is the armoured Raider profile. None is globally free.

Recommendation for owner decision Q4: bits 6/7 are fire-mode bits **only on
Light waves with a path**; those waves reject a nonzero `loops`. All `$FF`
waves, Heavy waves and escorts keep the exact current loop interpretation.
The compiler checks that discriminant; there is no motion companion table.
Use the existing per-slot copied flags, not a new four-byte mode array.
Boss sectors reject paths/new fire modes. This is a proposed contextual
encoding, not a decision already accepted by the owner.

Segment fire permission is always required. Column fire adds an authored
fixed V1 distance of ±one character column (4 HPOS); the actual tolerance is
an owner choice in Q5. It remains a straight existing projectile, not aim.
For a path Interceptor this explicitly replaces the old standoff-only column
test; ordinary Interceptors keep it unchanged.

A volley is one bounded C decision for the active Light wave. Snapshot the
eligible live/reloaded/fire-enabled members, claim one existing event token,
and let their ordinary slot ticks return existing fire actions in that frame.
A frame-stamped membership mask prevents multiple claims, double fire and
late admissions joining the pulse. Denial leaves reloads ready for retry;
there is no backlog burst or token bypass on a later frame. Existing ASM
shot publication/pool overflow semantics remain; no batch renderer or new
return action. A full pool may drop a shot as today, so an unconditional
all-members simultaneous visual guarantee is not promised. Budget all
emissions, not just the single token. Owner Q5 settles pulse cadence and
whether combined volley +column mode is included in V1.

### Items, homes, costs and dependencies

All new figures in this table are **ESTIMATES, expected /budgeted raw B**,
not compiled M3 measurements. CPU entries are **added NMOS CPU cycles**
against current main unless explicitly called historical. A row tick is a
world-row event, not every frame; it can coincide with the frame work shown.
Host-only work costs 0 guest cycles. Costs include their stated responsibilities;
do not add a historical whole-tick number again as a delta.

| Item | Behaviour /proposed home | Added B expected /budget | Per gameplay frame | Per row tick /event | Dependencies |
| --- | --- | ---: | --- | --- | --- |
| P1–P3 | Evaluator, tracking helper, 4-B end-step table; `CONTENT_CODE/DATA` | 357 /384 | Path member +100…200; segment end up to +220, before guarded-entry cost. Up to 3 members: +660 estimate | 0 intrinsic row cost | Existing quantized C movement and unchanged ASM publication; P8/W1 |
| P4 | Init path offset/timer after successful free-wave admission; escort reset and alternating mirror phase; content C | 38 /48 | 0 on ordinary frames; +40…80 per successful admission | 0; admission is a token event, not a row scan | Unchanged `light_admit`; failed attempt does not advance mirror |
| P5 | Publish armed path and reset mirror/volley epoch; content C through W2 | 14 /24 | 0 ordinary frames | +20…48 on wave-arm row, plus W2 entry; no scan of path library | Existing cursor/composition publication; boss-safe guard |
| P6 | Segment fire permission, terminal/side/upward retirement; content C | 27 /32 | Fire gate ≤ +16/member; terminal/clamp ≤ +40/member on transition frame | 0 intrinsic row cost | P1, existing retirement/erase; validate before publication |
| P7 | Volley/column C decisions, eligibility and existing reload helper reuse; content C | 60 /96 | Column ≤ +40/firing candidate; volley ≤ +180/group decision plus ≤ +40/member and **80…160 estimated existing emission cycles/shot**; ongoing projectile updates remain chargeable too | 0 intrinsic row cost | Owner Q4/Q5, token and pool contract, P6; no new ASM batch |
| P8 | Per-slot segment +mirror byte and timer 8 B; armed path, mirror ordinal, pulse frame/mask 4 B; content state | 12 /16 | State access included above; reset ≤ +100 at level init | 0 | New named `CONTENT_DATA` state; verify with link map |
| P9 | Content lifecycle reset/cancel and bounded shared fire-tail integration allowance; content C | 16 /32 | Valid paths ≤ +20/member; no boss execution | Reset/cancel ≤ +80/event, never an extra scan each row | Existing content valid bit and phase teardown |
| P10 | Explicit content codegen/integration contingency, not additional feature scope; content home | 0 /100 | No assumed new execution; actual use must be attributed to P1–P9 and measured | No new row poll | Covers uncertainty in reusing current C helpers/joins rather than treating the old prototype size as a current linked result |
| W1 | Resident tick dispatch, validity/phase guard and archetype fallback; append window | 40 /80 | Free Light guard/hook ≤ +40…64/member; escort ≤ +5 target; no-Light ≤ +12 target | 0 | Must not read even path state in invalid home; existing boss/no-path movement retained |
| W2 | Shared wave-arm/admission/reset veneers survive boss use; window | 24 /64 | Successful admission entry ≤ +40; otherwise ≤ +12 if reached | Wave-arm entry ≤ +40; boss path fails closed to old policy | Shared `director_c_try_event` is also called by boss install |
| W3 | Link/codegen/branch-range allowance for preserving existing entries and fallback/fire joins; window | 32 /80 | Budget ≤ +20/member on affected join; measure actual branches | No new row poll; ≤ +20 on changed join | Fixed hot addresses, compiler no-stack/ABI audit |
| C1 | Named chains, parameter resolution, path library, validation and authoring docs; host compiler | 0 /0 guest B | 0 new runtime chain work | 0 new runtime chain work; expanded waves use P5 | Existing 8 sectors/20 waves, fixed image/payload blocks |
| D1 | Pilot level 2 paths/chains and review fixtures; existing core/path payload | 0 /0 allocation B | Uses costs above; no new global per-frame work | Existing Director schedule plus P5 | Owner Q1–Q3/Q6; Heavy data and level 1 unchanged |

P1's 357 B and whole-tick 333–437 cycles are **historical prototype
measurements at `c92f908`**, not a fresh current-Interceptor measurement.
That prototype reported no-path +17…18 and escort +3, before the new home guard
and subsequent standoff changes. New no-path overhead can be higher. Measure
current baseline, path straight/step/segment-end/mirror/tracking, failed
admission, escort and boss fallback from identical state before accepting
the estimates. The old 440/+125/+20/+5 component limits are report-only under
current gate policy, not automatic STOPs or a claim that this placement meets
them. Do not reimplement C path/fire policy in ASM to chase an old estimate.

## 3. Placement, lifecycle and the M4 remainder

Content subtotal **524 /732 B** including state and an explicit 100-B
contingency (item budgets 632 B +100 B); home after M3
**1,647 /1,855 of 1,920 B**, leaving **273 /65 B**. State's 8 slot bytes no
longer claim `$8133–$813A`: those addresses belong to Interceptor loop/flash
state. H15 already occupies 13 of its 14 B; arena's 2 B is not a solution.
CONTENT_DATA is checked-image RAM, so its initialization bytes count in the
home total; it must be reset explicitly on level start and slot reuse.

Window subtotal **96 /224 B**, remaining **413 /285 usable B**. The growth
target is **≤ 300 B**, with **209 usable B** left at that limit. Every window
addition is safe dispatch/fallback/ABI code that must remain callable while
boss/menu/death own the content addresses. Path decisions, tables, wave
state and chains do not become resident merely because they run every frame.
Existing boss-capable archetype code stays resident; do not wholesale move
the shared Light tick into content. Shared call-site growth, if compilation
needs it, must be reported in its actual segment and within W1–W3's total
budget; Director high is not unpriced overflow space.

No planned arena, L2, MAIN Light, reader, initial-content or new state-range
growth. Existing source entry addresses should remain fixed where practical;
any unavoidable relocation needs same-state cycle comparison. Adding content
before CONTENT_DATA can move existing content labels: build all references
together and retain the existing Heavy publisher/dispatch contract.

The content record is already a full 1,920-B checked image: fitting M3 within
it adds **0 content sectors /0 reads /0 transfer cycles** by construction.
Initialization CPU still has to be measured. Window packing has 11 B spare;
allow **+1…3 record 8 sectors (ESTIMATE)**, not a guaranteed compressed ratio.
At +3, transport 216 and 23 pre-menu sectors remain. Preserve records 1/7 counts
and 11-record format; measure packed output and startup gates after each build.
No boot-time or menu-frame increase is asserted from raw C byte counts.

Lifetime rules are part of the feature:

1. Enter content only after existing validity and gameplay-phase checks,
   before reading state/table/code there. Invalid dispatch takes resident
   archetype fallback; no cached pointer may outlive the checked image.
2. Reset armed/path/pulse state on checked level initialization; initialize a
   slot on successful admission; clear it on retirement/reuse and sector cuts.
   Pause freezes timers with gameplay. Death/respawn retain the checked image;
   do not independently unload it, and follow existing enemy reset policy.
3. Before boss install, GAME OVER, pause-quit, level teardown and RESET,
   existing disarm wins. Boss escorts use their current movement/fire loops
   with no home read; post-boss/restart requires the checked reload.
4. Preserve current Heavy runway computation and **two full Heavy-free frames
   before Director capital entry**, plus no Heavy admission once departure
   begins. Bomber leaves toward the nearer horizontal edge, averages 3 raster
   pixels/frame after the repair, stops firing and uses complete PMG erase;
   Raider departure stays unchanged. Do not reintroduce the failed 8-pixel
   departure from the historical session-finish note. Scripted retirement
   earns no kill rewards; hits/kills before departure completion remain real.
5. No path in capital or boss; current capital ceilings remain 0 Light/0 Heavy.
   A surviving pre-capital Light follows the existing drain, not the Heavy
   departure helper. Finite exits prevent a new path from blocking that drain
   indefinitely. Chain advancement cannot skip the departure/admission gates.

**M4 still owns** current-level progression, checked next-level loading,
carry/reset rules for score/lives/boosters/stats, summary grade/bonus flow,
campaign completion, extra-life rule and the owner's loader/level-select
choices. M3 supplies reusable recipes and path capacity, not that loop or
twelve complete shipped levels (M7 authors those unless Q6 changes scope).
Keep the old M4 core 180-B window estimate visible: budgeted M3 leaves 285 B,
so a provisional 180-B M4 core would leave 105 B; at M3's 300-B limit it leaves
only 29 B. Those are arithmetic allowances, **not a compiled M4 fit**.
Reader has 24 B against the old 34-B M4 addition (10-B shortfall), summary is
already 1,792/1,792 B, and M4 state was estimated 6 B. Its planning task must
re-price placement and any window levers before optional level select/art.
M3's content slack is unavailable to code that must run after boss overwrite
or across a checked level load. No M4 reserve is silently spent on path art.

If M3 compilation exceeds a home/byte boundary, first report actual bytes and
offer bounded alternatives: simplify/de-duplicate C within the same home;
move fighter-only decisions to the 246 usable L2 bytes through its existing
lifetime guard (new scope/measurement); or split optional fire modes into a
separate owner-reviewed checkpoint. Do not silently relocate the evaluator
into the window or defer an accepted item. Window +300 is the planning target;
an actual byte overflow, regression, unresolved new test failure or native
frame >32,568 is a hard stop. Component/target excess alone is report-only.

## 4. Separately smokeable implementation checkpoints

Each future checkpoint is one focused commit/build and a standalone play ATR
under `build/play/m3/<checkpoint>/`, with rollback to its preceding checkpoint.
These are proposed sessions, not authorization to start. Only the owner
records smoke PASS/acceptance. Level 1's data stays unchanged throughout M3.

| Checkpoint | Deliverable /focused proof | Owner should look for |
| --- | --- | --- |
| 1. Safe dispatch and a straight path | Content state/guard, compiler record format, one terminal path in a level 2 review route; same-state no-path/boss/escort comparisons and invalid-home fixture | Ordinary campaign and Heavy escorts behave as before; review Light descends cleanly; pause, death, restart and boss entry leave no stuck/doubled ship |
| 2. Shape vocabulary | Snake/shallow wave/arc, mirror, tracking, upward/edge/segment-end exits; deny out-of-range/unbounded paths;3-Light synchronized transition fixture | Clear repeated shapes; alternate successful members mirror despite kills/recycled slots; tracking is readable; all exits erase cleanly, with no wraparound or corridor strips |
| 3. Fire envelopes | Segment hold-fire and owner-selected column/volley modes, linked token/pool/retry proof and three-Light emission cost | Approach is quiet where authored, firing starts in the intended segment; column attacks reward moving; volley is readable without delayed backlog or unexplained extra shots |
| 4. Wave chains and level 2 pilot | Host chain expansion, timelines, clear/timeout/denied-admission cases; snake sector 1, shallow/mirrored/return variants sector 4, tracking/fire window in sector 6; preserve Heavy holds/armour | Teach→mirror→pressure→release is recognizable; fast kills and no-fire both progress; no long empty waits or unnoticed skipped final wave; level 2 Heavy look/HP/damage and departure remain intact |
| 5. Combined M3 handoff | Final resource table, E/M/H short representative authored routes, capital approach/drain and boss/restart lifecycle checks; future regional recipe sheet | Smooth difficulty escalation with no unavoidable crossfire; Heavy clears at least 2 frames before capital, Bomber exits at repaired speed without firing; boss escorts/restart and level 1 remain familiar |

At each checkpoint run a normal gated build and meaningful focused compiler,
linked movement/admission/fire/lifecycle checks. Include same-frame collision,
appearance install, pool-full and slot-reuse cases; preserve exclusive return
priority (appearance install, breakup, fire) and Heavy damage nonrotate retry.
Measure worst per-member tick, three-member coincidence, row-arm/admission
and pending Heavy-publication coincidences as applicable. These are short
feature checks, not a milestone matrix. No RED-first requirement.

Per task branch run one full `npm test`, audit A/B/C by file/name/first
assertion/message against main, and resolve B to empty. Run the two registered
quick routes for these gameplay/scheduler changes and the short new path case.
Report target 31,500, hard 32,568 and physical 35,568 separately; include DMA in
native wall timing. No full native/home/boss-stress/release pass per checkpoint.
Loader/startup changes, if needed unexpectedly, require their focused boot
smoke and a scope review. Owner plays on emulator and, for final acceptance,
retains the ATR/SIO2SD path; emulator success alone is not hardware acceptance.

## 5. Owner design questions

These are review choices; recommendations are not recorded decisions. The
accepted record format, eight-path limit and Heavy ownership are not reopened.

| Question | Concrete options | Recommendation and consequence |
| --- | --- | --- |
| Q1. Shape language | **A:** shallow wave/snake/arc with a clear escape; **B:** mostly tracking dives with one decorative curve; **C:** frequent loops and upward returns | **A**, with one return/loop as a later accent. Six shared named templates, level 2 pilot uses four; same 12-B record per distinct encoded path. A is easier to read beside Heavy holds and limits long drain waits |
| Q2. Paths per region | **A:** 3–4 signature templates/region, 2–4 distinct records used per level; **B:** 6–8 different records in every level; **C:** 2 shared records throughout campaign | **A**. Reuse shared templates with authored durations/entry/spacing; later levels may use up to 6 records, hard maximum 8. All options retain 96 payload B; B costs authoring/testing time and recognition |
| Q3. Chain escalation over 12 levels | **A:** three-step regional ladder, below; **B:** increase counts/speed every level with little new composition; **C:** long fixed set pieces at region ends, otherwise single waves | **A**, combining familiar paths before adding density. Keep existing caps/spacing floors; no difficulty-specific runtime multiplier or automatic capacity increase |
| Q4. Fire bits vs Interceptor loops | **A:** contextual bits 6/7 for path-wave fire modes, reject `path`+nonzero `loops`; **B:** one extra per-path metadata byte in a newly found payload home; **C:** only segment fire permission in first implementation, defer volley/column to a separately approved format task | **A**. Zero payload growth, uses existing copied flags, explicitly preserves all no-path/escort loops. B needs at least 8 payload B (only 5 hull-reserve B free); C is a scope reduction and requires explicit approval |
| Q5. Fire pressure | **A:** segment fire +column ±1 cell; volley on shared 64-frame opportunities, ready members only; allow combined mode; **B:** exact-column only, 96-frame opportunities, no combined mode; **C:** ±2 cells, 48-frame opportunities, combined mode | **A** as a smoke starting point, not final balance. Fire/reload permission gates still apply; denied token retries once per following frame without queued pulses. B is gentler; C increases pressure and emission coincidence risk. No new projectile type in any option |
| Q6. M3 content extent | **A:** playable level 2 pilot +review fixtures and a 12-level recipe sheet; later campaign files in M7 after M4; **B:** author all 12 level files as a separate M3 content session before M4 | **A**, matching current two authored levels and one-level campaign. B is valid but adds a large explicit authoring/smoke task; no claim that current main can advance through 12 levels |

Proposed Q3 ladder (SPACE waves only; Heavy armour/hold schedules remain
their own authored content). Counts below are waves per recipe, **not extra
live slots**. Existing per-level 20-wave limit includes every other wave.

| Levels /region | Teach | Combine | Regional exam |
| --- | --- | --- | --- |
| 1–3 /R1 | L1 unchanged; L2 pilot introduces single shape then mirror | L2 two-wave chain, independent fire window | L3 three waves: familiar shape →mirror →quiet exit; one volley cue |
| 4–6 /R2 | L4 reuses two R1 shapes with new entry columns | L5 three waves, alternate snake and arc, column-fire accent | L6 three/four-wave recipe; one dive-return with recovery gap |
| 7–9 /R3 | L7 introduce tracking-dive without volley | L8 mix tracking and static envelope, mirrored arrival | L9 four waves; one combined fire-mode accent if Q5 accepted |
| 10–12 /R4 | L10 recall each earlier signature, preserve exit gaps | L11 four-wave recipe, pressure through composition rather than higher cap | L12 four-wave recap with a quiet terminal departure before capital/boss drain |

Do not turn this sheet into an automatic schedule: owner smoke decides exact
rows, durations and pressure. EASY/NORMAL/HARD first share readable shapes;
existing difficulty ceilings/cadence supply variation. Further parameter
changes and final balance belong to M8, with measurements if paths get faster.

## 6. Explicit DEFER and retained obligations

| Item | Disposition /reason |
| --- | --- |
| Original P1–P8, mirror, fire permission, volley/column and compiler validation | **Retained**, with new homes and owner Q4/Q5 format choices; not silently cut for bytes. Arc/loop need fixtures even if level 2 does not use them |
| Resident 96-B library and 16-B motion companion | **DEFER obsolete representation**: accepted compiler library +existing 96-B per-level block replace it, functionality retained |
| Old P8 `$8133–$813A` state and old 524-B all-window placement | **DEFER obsolete homes**: occupied state and insufficient 509-B usable window; content placement replaces both |
| Paths for Heavy, Heavy escorts, boss escorts or capital combat | **DEFER scope**: shared renderer/phase/Heavy-departure contracts differ; M3 remains free Light SPACE waves. No P1/P2 reassignment or new boss home reads |
| Exact sine curves, sub-cell X, new sprites/projectiles/AI or renderer architecture | **DEFER**: unnecessary for readable four-segment envelopes; fixed renderer/archetype ownership remains |
| Runtime chain interpreter, overlapping waves, dynamic random branching, extra path slots or extra population | **DEFER**: existing Director lock/capacity and expanded WaveDefs cover V1 without new per-frame work or state |
| Unbounded path loops and indefinitely held fire/flight recipes | **Excluded V1**, compiler rejects: could block wave/capital/boss drain. Finite loops with proven terminal exits retained |
| All 12 authored levels and campaign advancement | **DEFER to M7/M4 under Q6A**; twelve-level escalation is explicitly planned above, not implemented or forgotten |
| M4 grade/progression/loader options, attract, additional boosters and final balance | **DEFER their roadmap tasks**; preserve the measured remainder and known reader/summary constraints in§3 |
| Faster assault Raider, alternate Heavy descent/holds, different hole/ramp policy, new Heavy cutoff | **DEFER**: existing owner decisions remain; M3 must preserve the shipped package and repaired departure |
| Heavy spawn rotate lever and broader phase-resync/publication redesign | **DEFER separate work**: no measured need created by planning; report any future collision/overrun with exact numbers before a redesign |
| Parked capital-content increment 2, new capital art and reserve repurposing | **DEFER outside scope**; do not import parked work or consume protected L2/lance/window reservations |
| Full release evidence refresh and pre-existing test/trace debt repair | **DEFER milestone task**; record shared debt, keep normal-build evidence pending, and do not imply release readiness |

**NEXT TASK: owner reviews this plan and Q1–Q6; STOP.** No implementation,
merge, push, tag, release or gameplay acceptance is implied by this commit.
