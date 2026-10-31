# M3 — wave paths, envelopes and chains

**Core plan (§1–§6): OWNER-ACCEPTED PLAN, 2026-10-31.**
**§7 policy accepted with owner amendments, 2026-10-31.** Branch
`codex/m3-plan`, based on task-start main
`6046c0b6beb25f15c53ca15cda8f39a431983cd3` (includes M3-H session 2).
Owner authorizes checkpoints1–2, each verified and committed separately,
then a mandatory pause for owner smoke after2. Planning commits had zero
runtime delta; actual implementation sizes are recorded in §8.
[Owner decisions](../decisions/2026-10-31-m3-waves.md) include Q1–Q6A and the
§7 amendments. No C-skin implementation before checkpoint4.

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

Accepted owner decision Q4A: bits 6/7 are fire-mode bits **only on
Light waves with a path**; those waves reject a nonzero `loops`. All `$FF`
waves, Heavy waves and escorts keep the exact current loop interpretation.
The compiler checks that discriminant; there is no motion companion table.
Use the existing per-slot copied flags, not a new four-byte mode array.
Boss sectors reject paths/new fire modes. The contextual encoding is an
accepted design decision; it has not yet been implemented.

Segment fire permission is always required. Column fire adds an authored
fixed V1 distance of ±one character column (4 HPOS), accepted in Q5A.
It remains a straight existing projectile, not aim.
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
emissions, not just the single token. Accepted Q5A uses 64-frame opportunities
and includes combined volley +column mode in V1, subject to the same gates.

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
twelve complete shipped levels (M7 authors those under accepted Q6A).
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
| 2. Shape vocabulary | Snake/shallow wave/arc, mirror, tracking, upward/edge/segment-end exits; deny out-of-range/unbounded paths; 3-Light synchronized transition fixture | Clear repeated shapes; alternate successful members mirror despite kills/recycled slots; tracking is readable; all exits erase cleanly, with no wraparound or corridor strips |
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

## 5. Owner design decisions — Q1–Q6 accepted

**Owner decision, 2026-10-31: all six recommendations A are accepted.**
The table preserves reviewed alternatives as rationale, not pending questions.
This accepts the design, not gameplay smoke or the new §7 extension, and
does not authorize implementation in this planning task. The accepted record
format, eight-path limit and Heavy ownership are not reopened.

| Accepted decision | Reviewed alternatives | Owner selection and consequence |
| --- | --- | --- |
| Q1. Shape language | **A:** shallow wave/snake/arc with a clear escape; **B:** mostly tracking dives with one decorative curve; **C:** frequent loops and upward returns | **A**, with one return/loop as a later accent. Six shared named templates, level 2 pilot uses four; same 12-B record per distinct encoded path. A is easier to read beside Heavy holds and limits long drain waits |
| Q2. Paths per region | **A:** 3–4 signature templates/region, 2–4 distinct records used per level; **B:** 6–8 different records in every level; **C:** 2 shared records throughout campaign | **A**. Reuse shared templates with authored durations/entry/spacing; later levels may use up to 6 records, hard maximum 8. All options retain 96 payload B; B costs authoring/testing time and recognition |
| Q3. Chain escalation over 12 levels | **A:** three-step regional ladder, below; **B:** increase counts/speed every level with little new composition; **C:** long fixed set pieces at region ends, otherwise single waves | **A**, combining familiar paths before adding density. Keep existing caps/spacing floors; no difficulty-specific runtime multiplier or automatic capacity increase |
| Q4. Fire bits vs Interceptor loops | **A:** contextual bits 6/7 for path-wave fire modes, reject `path`+nonzero `loops`; **B:** one extra per-path metadata byte in a newly found payload home; **C:** only segment fire permission in first implementation, defer volley/column to a separately approved format task | **A**. Zero payload growth, uses existing copied flags, explicitly preserves all no-path/escort loops. B needs at least 8 payload B (only 5 hull-reserve B free); C is a scope reduction and requires explicit approval |
| Q5. Fire pressure | **A:** segment fire +column ±1 cell; volley on shared 64-frame opportunities, ready members only; allow combined mode; **B:** exact-column only, 96-frame opportunities, no combined mode; **C:** ±2 cells, 48-frame opportunities, combined mode | **A** as a smoke starting point, not final balance. Fire/reload permission gates still apply; denied token retries once per following frame without queued pulses. B is gentler; C increases pressure and emission coincidence risk. No new projectile type in any option |
| Q6. M3 content extent | **A:** playable level 2 pilot +review fixtures and a 12-level recipe sheet; later campaign files in M7 after M4; **B:** author all 12 level files as a separate M3 content session before M4 | **A**, matching current two authored levels and one-level campaign. B is valid but adds a large explicit authoring/smoke task; no claim that current main can advance through 12 levels |

Accepted Q3A ladder (SPACE waves only; Heavy armour/hold schedules remain
their own authored content). Counts below are waves per recipe, **not extra
live slots**. Existing per-level 20-wave limit includes every other wave.

| Levels /region | Teach | Combine | Regional exam |
| --- | --- | --- | --- |
| 1–3 /R1 | L1 unchanged; L2 pilot introduces single shape then mirror | L2 two-wave chain, independent fire window | L3 three waves: familiar shape →mirror →quiet exit; one volley cue |
| 4–6 /R2 | L4 reuses two R1 shapes with new entry columns | L5 three waves, alternate snake and arc, column-fire accent | L6 three/four-wave recipe; one dive-return with recovery gap |
| 7–9 /R3 | L7 introduce tracking-dive without volley | L8 mix tracking and static envelope, mirrored arrival | L9 four waves; one combined fire-mode accent under Q5A |
| 10–12 /R4 | L10 recall each earlier signature, preserve exit gaps | L11 four-wave recipe, pressure through composition rather than higher cap | L12 four-wave recap with a quiet terminal departure before capital/boss drain |

Do not turn this sheet into an automatic schedule: owner smoke decides exact
rows, durations and pressure. EASY/NORMAL/HARD first share readable shapes;
existing difficulty ceilings/cadence supply variation. Further parameter
changes and final balance belong to M8, with measurements if paths get faster.

## 6. Explicit DEFER and retained obligations

| Item | Disposition /reason |
| --- | --- |
| Original P1–P8, mirror, fire permission, volley/column and compiler validation | **Retained**, with new homes and accepted Q4A/Q5A; not silently cut for bytes. Arc/loop need fixtures even if level 2 does not use them |
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

## 7. Enemy variants (regional skins)

**OWNER-ACCEPTED POLICY, 2026-10-31.** Option A is per LEVEL: each level
may author its own mix within3 Light looks plus default, PULSE/LASER shot
overrides and one `heavyLook`. Regional packs are optional M7 authoring
helpers, never a forced per-region policy. C-skin is accepted in principle
as a separate smokeable checkpoint4 commit. Measure compiled M3 first:
use content only if adding admission code keeps **at least64 B free**;
otherwise use L2, fighter-only, through its existing guard. Report the actual
choice/bytes then. B-shot, independent hues, Bomber body skins and Bomber
shot re-skin stay DEFER. Historical prices below are estimates, not scope
authorization.
### 7.1 Measured storage and publication today

Fresh normal build at unchanged main runtime `6046c0b`, task HEAD `b161f92`.
[Linked-byte measurements](../diagnostics/m3-regional-skins/storage-measurements.json)
record source addresses/hashes, decoded HP, current payloads and execution
costs. CPU measurements run the existing linked bytes in `Nmos6502`, excluding
DMA, interrupts, waits and caller JSR. No new guest routine, format or art
was prototyped. Normal computed gates pass; §1's resource baseline is
reproduced unchanged and release evidence remains pending.

| Data | MEASURED storage /size | Publication and selection |
| --- | --- | --- |
| Default Wingman /Interceptor art | Resident `ENTITY_CODE`, `$9D27–$9D46`, **32 B**, 16 each | Existing appearance installer copies the selected body into a character pair; no per-region bank |
| Additional Light looks | Per-level payload `$AB00–$AB2F`, **3 ×16 =48 B** | `wave_flags[1:0]` already selects default 0 /payload 1–3 per wave, including the Light escort of a Heavy wave |
| Published Light bitmaps | Runtime charset `$47C0–$47EF`, **48 B**, codes 120–125, three pairs | Pairs share a look key; a still-visible pair cannot be overwritten. A fourth distinct simultaneous look can delay admission |
| Default hostile projectile art | Resident C arena `$7C52–$7C71`, **32 B**: PULSE, LASER, BOMBER and its second animation phase, 8 B each | Builder `$7BF7` publishes both horizontal phases at gameplay initialization |
| Projectile overrides | Per-level `$AB90–$ABA1`, **2 ×9 =18 B** | Eight rows +target class 1/2. Installed once, applies to every shot of that class for the whole level. BOMBER override is unsupported |
| Published projectile bitmaps | Codes 90–93 and 100–103: **64 B used** within reserved codes 90–109 (**160 B**) | Renderer selects weapon class/phase. No per-region/per-wave shot skin ID exists today |
| Light /shot colour roles | Light `. /W /S /R` pixels use shared COLPF0/1/3; shot pixels only W/S, never `%11`. Resident defaults: COLPF0=`$0E`, COLPF2=`$AE`, COLPF3=`$46` | Light hue is not a per-slot RGB byte; shots do not inherit their emitter's PMG colour |
| Shared steel | **1 B already in level hull block, `$A882`** | Patches the resident DLI immediate for COLPF1 at load; current build assigns `$88` to levels 1–8, `$84` to 9–16. Also colours allied hull/other steel users |
| Raider alternative | Per-level **`heavyLook` 17 B**, `$ABA2–$ABB2`: 16 body B +1 independent PMG colour B | Existing armoured profile selects it. Assault retains resident art/colour. One alternate Raider body per level; Heavy `appearance` selects its Light escort, not PMG art |
| Light HP | Resident 48-B archetype table at `$8C7D`: **Wingman 1, Interceptor 3**; existing **4-B `light_hp[]`** at `$7FCF–$7FD2` holds remaining HP | Copied on admission and decremented by existing damage policy. No per-level/per-wave override. Raider assault 1 /armoured 2,2,3 are existing Heavy profiles |

Level 1 authors one Light look and no shot override; level 2 uses all three
Light looks and both shot overrides. These are per-level data, not four
regional enemy files. Payload slack is exactly **5 B at `$ABB3–$ABB7`**;
paths still own their full 96 B.

Measured Light-copy costs on all three destination pairs are **375 cycles
Wingman /376 Interceptor /391 payload**. Thus payload art adds 15/16 cycles
at a real install, not every live frame. Token/pending rules still own that
publication. The hostile-glyph builder costs **957 cycles on level 1 /1,529
on level 2**, including RTS; the two overrides add 572 cycles versus no
overrides. These are event/load CPU costs, not PAL wall-frame predictions.

**Align the region resolver explicitly.** Current hull generation uses
`LEVEL_MAX_ID=16`: 1–4 /5–8 /9–12 /13–16. Boss regions already use
1–3 /4–6 /7–9 /10–12, as accepted Q3A does. Reuse the four-region structure,
but have M4 establish one 12-level campaign-region resolver for hulls, enemy
packs and other regional content. Directory capacity can stay 16. Do not
silently reuse the 16-slot hull formula and omit R4 in a 12-level campaign.
This is host authoring/build policy, **0 guest cycles**; no mapper changes
in this planning commit.

### 7.2 Options and incremental prices

Proposed figures are **ESTIMATES/budgets added to budgeted core M3 (§3)**.
After core M3: content 65 B free, usable window 285 B free, payload 5 B free;
76 B remain below the +300-B window growth target. The provisional M4
180-B window core would leave 105 B. Its reader 10-B shortfall and full summary
remain separate placement work. M3's 100-B contingency is not spent twice.

| Option | Window /content /other RAM added | Payload /disk /sectors | CPU during play /at load | What remains for M4 |
| --- | --- | --- | --- | --- |
| **A. Per-level skins in current formats** | **0 /0 /0 B**; host compiler resolves the pack | Reuse 48 Light +18 shot +17 Raider =**83 existing payload B/level**. Four optional presets would carry332 art B; each level may instead author its own mix. **0 extra sectors/reads for skins** | Ordinary frame/row **+0**. Existing 391-cycle payload install when needed; load uses existing 957…1,529-cycle shot builder, at most +572 vs no overrides; no extra transfer | Window 285 /content 65 /payload 5 B; provisional M4 core leaves 105 window B |
| **A-colour: new shared hostile hue**, optional | Window **8–16 B** guarded load hook; content **16–32 B** cold publisher; 0 new resident state if patching immediates | **1 B** `$ABB7` for shared COLPF3. 0 fixed-image sectors; allow 0–1 extra window-record sector | Ordinary frame/DLI **+0** with immediate patching; load **+40…80 CPU cycles** estimated. Patch relevant gameplay restores, not a single GTIA write | Worst window 269 /content 33 /payload 4 B; M4 core leaves 89 window B. Recolours every COLPF3 user, including hull accents/laser palette: visual approval required |
| **B-Light. Skin selection per wave** | **0 /0 /0 B**, already implemented | Existing `wave_flags[1:0]` and 48-B bank; 0 extra field/sectors; Heavy appearance remains escort-only | Ordinary frame/row **+0 new CPU**; existing 391-cycle install when a pair changes look; token/pair rules remain. **0 extra load CPU** over A | Same as A; no independent RGB hues or unlimited simultaneous looks |
| **B-shot. Independent per-wave PULSE/LASER look, old shots retain theirs** | Window **96–128 B** ASM/guards, content **24–48 B** C selection; **6 B resident state** (five shot tags +published choice), plus **12–24 B resident call-site code** outside window | Existing 18-B payload can hold alternate sources; 32 extra published bytes fit existing 160-B charset bank. Independent binary choice for 20 waves needs **3 B** `$ABB3–$ABB5`. Budget **0–4 transport sectors**, including call-site packing; no new DFMC record | Estimate **+6…16 cycles/live enemy shot/frame**, ≤80 for 5; +10…30/emission, +30…60/wave arm. Load +500…800 CPU cycles for alternate phases. Weapon class/rate unchanged | Worst window 157 /content 17 /payload 2 B; M4 core is **23 B short**. M3 window growth 352 exceeds target by 52. Resident state/call sites need placement proof; not selected |
| **C-skin. Light HP by selected appearance** | Window **0–16 B**, estimated **32–48 B** admission C in content only if≥64 B remain, otherwise L2; **0 new per-slot RAM**, reuse `light_hp[]` | **4 B** `$ABB3–$ABB6`, indices 0–3: 0 means archetype default, explicit 1…4 HP. Entry 0 stays 0, preserving base archetypes. 0 fixed-image sectors; allow 0–1 window sector | Ordinary frame/row **+0**; **+20…60 CPU/admission**, plus guard if not shared with P4. Load validation/reset ≤40 CPU cycles, no extra SIO | With old core budget this selects L2: window269 /content65 /L2 usable198 /payload1 B. Actual placement waits for compiled M3; M4 core leaves89 window B |
| **C-wave. Light HP independently per wave** | Window **0–16 B**, content **48–80 B**, including 1 armed-HP state B; 0 new per-slot RAM | **5 B** `$ABB3–$ABB7`: 20 two-bit codes, 0=default, 1=1 HP, 2=2 HP, 3=4 HP. No flags 5–7 use. 0 fixed-image sectors; allow 0–1 window sector | Ordinary frame **+0**; +40…90/wave-arm row for unpack/publish, +10…25/admission plus guard. Load ≤80 CPU cycles, no SIO | Worst content **15 B short** (needs 80, has 65); window 269, M4 core leaves 89. Estimated shortfall, not measured impossibility; re-price after compiled M3 |

A loads the regional source glyphs with the level; Light bitmap installation
still happens lazily on admission, as measured above. Map the regional
Wingman/Interceptor/third accent to the existing three appearance slots;
appearance 0 continues to mean resident default art.

A includes colour variety through W/S/R pixel patterns, existing level steel
and the independent `heavyLook` colour. It **does not promise independent
Light/shot RGB palettes**. New shared register hues are A-colour, with global
effects. Independent per-object hue while preserving terrain colours would
need another palette/renderer design, not a free skin field.
In particular, COLPF3 changes do not recolour the W/S-only PULSE/LASER
glyphs. Changing their steel hue can reuse `$A882` (**0 extra bytes/code**)
but also recolours every other steel user; the recommended pack keeps the
current palette roles and varies the pixel mix. This limitation is explicit.

**Optional all-class regional projectile pack, including BOMBER:** retain
the existing 18 B for PULSE/LASER and add a 17-B record (two 8-B phases +class
tag). Estimate **0–8 window /32–64 content B**, no new charset/state RAM,
**0 ordinary-frame/row CPU /+500…650 initialization CPU cycles**. Payload
needs 17 B, only 5 free: **12-B shortfall**, or16 B with C-skin installed.
At the code budget, content would leave 1 B, window 277 B and 97 B after the
provisional M4 core. Disk adds 0 sectors only if those 17 B are found inside
the existing fixed image; a separate checked regional run would cost at
least 1 sector/region and new reader/directory work. Do not expand the
2,048-B level buffer implicitly. This extension is priced and deferred;
current BOMBER art/animation remains in the recommended pack.

For B-shot, rewriting the global bank at a wave boundary is not equivalent:
old emitter-independent shots can still fly and would change appearance.
Waiting for all shots to drain creates a gameplay gap and requires a bounded
policy; neither is silently substituted. The priced alternative separates
visual ID from weapon class/rate. Five shot tags survive boss ownership;
content policy remains guarded. Existing 20-glyph space is not additional
code/state RAM, and bigger residency/timing needs its own focused proof.
The measured `PROJECTILES` span ends at `$54C5` in its `$5400–$54E3`
reservation, leaving 30 B. A concrete proposed B-shot home for its 6 state
bytes is `$54C6–$54CB`, leaving 24 B; this is not an allocation in this task.

HP is admission data, not a new archetype or AI. Damage, flash, score, fire,
paths and collision retain their mechanisms. In C-skin, one look used on
two archetypes gets the same explicit override; 0 retains defaults. A weak
Wingman cannot have fewer than 1 HP; an Interceptor may be weaker at 1/2 or
stronger at 4 than its current 3. Reject 0 as actual spawn HP and overrides on
boss escorts. A Heavy wave may override its Light escort, never P1/P2.
Existing Raider armour HP still uses bit 5; no new Heavy HP policy is proposed.

Zero ordinary-frame instruction overhead does not mean identical gameplay
frame peaks: HP changes survival, hit/kill timing, occupancy and chain/drain
duration. The future HP checkpoint must measure those coincidences and both
registered quick routes before owner smoke; none is certified by this plan.

**No HP bit is available in flags 5–7:** 5 belongs to the Raider profile and
6–7 retain loops or accepted Q4A path-fire semantics. Neither `wave_path`,
mirror nor appearance gains an HP meaning. C-skin and C-wave use alternative
tables in the same five spare payload bytes. Arbitrary 8-bit per-wave HP
needs 20 B (**15 B beyond** slack). Independent B-shot choice 3 B +C-skin 4 B
needs **2 B more** than the tail. C-skin+A-colour fits its 4+1 B exactly, but
their worst content 80 B exceeds 65 free by **15 B**. Do not overlap fields or
spend paths, Heavy look or boss definitions without an explicit new design.

### 7.3 Recommendation and roadmap

Accepted **A: per-level data policy**, retaining existing per-wave Light
selection. A level owns its look mix; M7 may provide optional regional
presets and per-level overrides. Keep current shared RGB roles. B-shot,
independent hues, Bomber body skins and Bomber shot re-skin are not now.

1. **M3 checkpoint4:** C-skin is a separate smokeable commit after compiled
   M3 bytes are known. Measure helper and guard. Content is allowed only
   when the resulting free tail is≥64 B; otherwise place admission policy
   in L2, fighter-only, through its existing guard. The four-byte payload
   table and existing `light_hp[]` need no new flags. Smoke weak/strong HP,
   unchanged movement/fire/score, reuse/flash and boss/escort safety. Report
   actual chosen home, code/veneer bytes and content/window/L2 totals.
2. **M4:** campaign loop and accepted12-level region resolver for content
   that uses regions. Per-level skins need no additional region selector,
   SIO skin read, DFMC record or runtime art cache.
3. **M7 data:** editable per-level mixes in existing48+18+17 B formats.
   Regional presets are optional. `heavyLook` remains one alternate armoured
   Raider look/colour per level, compatible with the damage masks. Assault
   keeps its current art/1 HP. Bomber skins remain deferred.

Illustration at the old full-core budget: content1,855/1,920 leaves65 B;
adding48 would leave17, so the owner rule selects L2. Estimated L2
1,290+48=1,338 B leaves198 usable below1,536, with256-B reserve intact;
content keeps65. With16 veneer B, window2,542/2,811 leaves269 B (89 after
provisional M4 core180). This is not a compiled C-skin fit or final placement
choice. Checkpoints1–2 report their measured totals; checkpoint4 decides
once the remaining M3 and the admission helper have compiled.

**DEFER with reasons:** Bomber body skins (not now); independent per-wave shot banks/tags (residency/M4
trade-off above); independent Light/projectile RGB hues (shared playfield
registers); BOMBER shot re-skin (second phase needs a larger format); multiple
Raider bodies or assault-only cosmetics (one current armoured `heavyLook`);
independent per-wave HP (C-wave content/packed-field trade-off). The requested
variety has the concrete recommended path above; wider variants are explicit.

**Implementation scope:** checkpoints1–2 only, verify and commit each,
then STOP for owner smoke after2. C-skin stays at4. No push, tag, release,
next checkpoint or gameplay acceptance is authorized by this handoff.

## 8. Implementation measurements

| Checkpoint | Content home | Window | L2 | Delta vs main (content/window/L2) |
| --- | ---: | ---: | ---: | --- |
| Main4e84bc4 | 1,123 B | 2,302 B | 1,290 B | — |
| 1 safe dispatch +straight | 1,491 B | 2,384 B | 1,290 B | +368 /+82 /0 B |
| Original full M3 budget | 1,855 B | 2,526 B | 1,290 B | +732 /+224 /0 B |

Checkpoint1 normal gates/focused checks and short native routes pass;
worst31,156. [Audit](../diagnostics/m3/checkpoint-1/report.md). It is a
candidate, not owner acceptance. C-skin placement waits for checkpoint4
and the measured64-B floor; no HP/skin feature is implemented here.
