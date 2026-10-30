# M3-H session 2 — rebased implementation plan

**OWNER-ACCEPTED PLAN — amended 2026-10-30.** Owner-created branch
`codex/m3h-session2`, implementation baseline
`7fe90409bd09db58ff263806bec711db21a76457`; planning commit `a35c559`.
Implementation is authorized through checkpoints 1–6, with a mandatory pause
for owner smoke after checkpoint 2 and final owner smoke after checkpoint 6.
Checkpoint 2 owner smoke PASSED on 2026-10-30 at `f33fcdc`; checkpoints 3–6
are authorized, with the next pause after 6.
Commit each checkpoint; verify/build/save its ATR without intermediate smoke
waits except those two pauses.

**Owner placement decision:** H12 publisher and H13 hole tables live in the
checked content home `$1180–$18FF`. Only a validity/phase-guarded entry veneer
for that publisher stays resident in the window. Invalid-home requests are
dropped with no draw or stale read. Target total session window growth
**≤250 B**. Report final window/home use, content-record sectors and measured
added level-load time. If guard/entry cost or lifetime makes this unworkable,
STOP with measured numbers before any fallback to window placement.

**Owner gameplay decisions:** H14 uses **B**, nonrotate-only publication,
within three frames after the hit watch; no damage stamp is forced onto a
rotate frame. The Bomber ramp **4/6/8/8/8**, hue C, is authorized as an
owner-smoke candidate and will be judged at the final smoke.

This supplements [M3-H §3 and session 2](m3-waves-heavy.md#3-m3-h--the-heavy-behaviour-package)
and supersedes its obsolete session-2 placement/cost predictions under the owner amendments above. The [session-1 audit](../audits/2026-10-27-m3h-step1.md#eighth-continuation--native-main-audio-proof-and-amendment-5)
provides the implementation boundary; its measurements describe its named
checkpoint, not current main. Current code already has H1–H9/H15, armour in
WaveDef **bit 5**, assault HP 1/1/1, armour 2/2/3, Bomber 4/4/5, holds,
dodge and damage requests. Bits 6–7 retain escort loops. Preserve those data
profiles and the shared Raider archetype, fire policy, score and PMG renderer.

## 1. Fresh main baseline

MEASURED byte figures below come from this checkout's fresh normal build and
linker output at the exact main commit above. [Resource evidence](../diagnostics/m3h-session2-plan/resources.json)
records their artifact hashes. No temporary main worktree is needed: task and
main started at the same commit with a clean worktree. No other checkout is
modified. `dist/` build output is restored after retaining baseline ATRs in
`build/`; no release artifact is part of this planning commit.

| Resource | Current use / capacity | Available to this plan |
| --- | ---: | --- |
| Window `$AE00–$BBFF` | 2,068 /3,584 B | 1,516 gross; **743 usable**, after 768-B lance claim and 5 protected B |
| Feature window `$AE00–$B8FA` | 2,068 /2,811 B | **743 B**, append after existing Heavy ASM at `$B614` |
| C arena `$7BD0–$7F0F` | 827 /832 B | **5 B**; not the old plan's 95-B reserve |
| Director high `$9D75–$9FF9` | 324 /645 B | **321 B**; high-level content moved out since session 1 |
| Checked content home `$1180–$18FF` | 612 /1,920 B | **1,308 B**, fighter/capital lifetime only; disarmed before boss |
| L2 `$1900–$1FFF` | 1,290 /1,792 B | 502 physical; **246 usable**, 256-B reserve remains protected |
| Initial packed content | 12,865 B; 101 sectors | 787 B to historical 13,652 planning ceiling; 819 to 13,684 physical ceiling; request **0 added initial-content B** |
| MAIN Light composite | 1,196 /1,213 B | **17 B**; not an H12/H13 home |
| BROADSIDE sequence /codebook pins | 79 /120; 0 /16 B | **41 +16 B** of zero pins; no new sector promised from compression |
| Pickup code tail | 1,002 /1,009 B | **7 B** of linked space |
| H15 state | 13 /14 B | Only `$85EE` free; no implicit body indices or damage-stage array exists |
| H16 body buffer `$549E–$54BD` | 32 B reserved already | Reuse all 32 B; **0 new RAM**, no file bytes |
| PROJECTILES tail `$54BE–$54E3` | 38 B unconsumed | Propose **8 B** of render state at `$54BE–$54C5`; 30 B remain |
| Level buffer /payload | 2,048 B /256 B | `hullParams` has **22 B** at `$ABA2–$ABB7`; 17-B look leaves **5 B**, not 15 |
| DFMC records | **11/11** | Extend an existing record; no twelfth record |
| Transport | **211 sectors**, last 211 | **28 sectors** before menu at 240; not the session-1 total of 214 |

The checked content home is the owner-selected H12/H13 home; its free bytes are not
resident capacity during a boss fight. H10's shared renderer must never read
a discarded payload or content image after Heavy teardown. H12/H13 run only during valid fighter/capital lifetime. The resident entry
checks content validity and boss/phase ownership before any home read.
L2 reserve stays untouched. No loader, phase lifetime or Director redesign.

| DFMC record | Raw B | Packed B /capacity | Sectors | Packed slack B |
| --- | ---: | ---: | ---: | ---: |
| 1 BROADSIDE | 6,653 | 5,591 /5,611 | 44 | 20 |
| 2 pickup +sector stream | 1,182 | 1,182 /1,259 | 10 | 77 |
| 3 ABI | 106 | 105 /107 | 1 | 2 |
| 4 low C +glue | 498 | 441 /491 | 4 | 50 |
| 5 C extension composite | 746 | 746 /747 | 6 | 1 |
| 6 Director pre | 21 | 23 /107 | 1 | 84 |
| 7 arena | 827 | 727 /747 | 6 | 20 |
| 8 Director window | 2,068 | 1,684 /1,771 | 14 | 87 |
| 9 MAIN Light | 1,196 | 1,032 /1,131 | 9 | 99 |
| 10 reader | 1,512 | 1,512 /1,515 | 12 | 3 |
| 11 Director high | 324 | 289 /363 | 3 | 74 |

Packed slack is transport space, not linked code or RAM. Record-2 stream
staging separately has 95 B; its record envelope has only 77. Preserve records
1/7 sector counts as placement objectives; inspect actual compressed output.

### Timing baseline and limits

Fresh quick measurements and their exact route/frame identities are recorded
in [the planning audit](../diagnostics/m3h-session2-plan/audit.md).
Only **capital Spread NORMAL** (`campaign-1-spread-capital`) and
**capital-960 NORMAL** (`l2-960-1-flight`) are run. These are the current
per-task routes; no full native/home/boss-stress/release pass is commissioned.

The current main checkpoint previously reported 30,465 /31,153 cycles for
these routes. Session 1's wider historical sample peaked at 31,432 with a
3,441-cycle minimum Heavy fence; the later shot-impact wider sample peaked
at 31,444. Neither wider sample is a fresh all-route maximum for `7fe9040`.
Do not add a pre-fence instruction estimate directly to wall time or subtract
it directly from fence slack: publication waits and ANTIC DMA alignment matter.

Apply the 2026-10-30 AGENTS gate policy: target **31,500**, hard gate
**32,568**, physical PAL frame **35,568**. Frames above target but at/below
hard gate, Director/component budgets, old +150 combined reset allowance and
the old 1,100-cycle stamp allowance are **report-only**. A byte overflow,
behaviour regression, unresolved task-only test failure or quick frame above
32,568 is a hard stop. Old RED-first, full evidence regeneration, full native
matrix and boss-stress requirements in the original plan are superseded.

## 2. Items, ownership, costs and dependencies

All incremental implementation costs below are **ESTIMATE**, not measured
feature code. Byte ranges are expected through budgeted; instruction-cycle
figures exclude ANTIC DMA and publication waits. A Director/world **row tick**
gets **0 new cycles for every item**: these changes run at admission, Heavy
member ticks, body publication or a pending visual event. If events coincide
with a row tick, charge their event costs in that frame; they are not free.

| Item | Behaviour and home | Incremental bytes | Per-frame /event CPU estimate | Dependencies |
| --- | --- | --- | --- | --- |
| **H16 +render state** | Use existing `$549E` buffer for two independent 16-B bodies. New named BSS in PROJECTILES tail: indices[2], applied stages[2], retry mask, profile/copy flags, scratch[2]. Initialize metadata after boot and every admission; copy body bytes lazily before first read. | H16 **0 new /32 existing RAM**; metadata **8 new RAM**; reset/install instructions included in H11. No file bytes for BSS. | 0 ordinary frames; metadata reset included in admission; first body copy included in H12. | Link assertions against `$54E4`; update memory map when implemented. |
| **H10** | ASM `draw_enemy_member`, BROADSIDE in place: formation body-base operand, per-member indices, cached immediate height set at admission. Keep clipping, HPOS publication, departing-row erase and stationary skip. | Proposed replacement **−3 code B**, fill the reclaimed bytes to preserve later labels; **0 segment-size delta**. Height patch is charged to H11. | About **−8 per actual body copy**; 0 delta on stationary skip. Measure the full body path, including page crossings. | H11 default install and H16 metadata must be enabled atomically. |
| **H11** | Window ASM installs base, indices and cached height; C spawn selects existing profile and payload colour. A window wrapper around the existing spawn call installs before forced draws, then returns to existing colour publication. Reinstall/reset on every formation. | **64–96 B window**, including wrapper/C colour selection; retarget existing ABI call operand, **0 ABI size growth**. | Approximately **+70–140 per admission**, minus H10 savings on the two initial copies. Repoint after damage included in H12. 0 ordinary frames. | H10/H16; existing `heavy_armoured`; compiler/default look. No base-body copy at spawn. |
| **Armoured second look** | Compiler validates/emits `payload.heavyLook`: 14 authored rows padded to 16 plus hull colour. Level 2 uses a wider/plated Raider silhouette within the existing frame/visible bounds and hostile family. Assault retains original art. Default armoured look provided by compiler for a level without an override. | **17 B inside existing payload reserve per level**, 0 level-image/sectors growth; host compiler/preview source has no guest cost. Runtime selection in H11. | 0 additional beyond H11/H10. | Existing kind bit 5; no new archetype, renderer, HP/weapon policy or PMG allocation. Reject malformed rows, unsafe colours and out-of-bounds pixels. |
| **H13 /generated variant C** | Editable `(row, clear-mask)` triples, 2 stages ×2 shapes, in `enemy-roster.json`. Generator emits hole tables into content-home ASM and preview images from those same tables. Runtime applies `body[row] &= ~mask`; no alternate packed PMG artwork. | **24 B content-home data**. Host generation/preview only otherwise. | 0 idle cost; approximately **75–120 per member/stage** included in H12. | Second Raider look and Bomber art; validate each cleared bit exists, stages are cumulative, silhouettes/tails stay readable. |
| **H12** | ASM consumer copies both source bodies once, stamps only requested live members, repoints base/indices, forces publication at current Y despite stationary skip. Coalesce both pending members into one bounded event. | **144–224 B content-home ASM**, including dual-member handling; no new source-body RAM beyond H16. | One member: approximately **920–1,180 first event**, **620–816 later stage**; both members: budget **1,600–2,400** including two publishes, claim/dispatch and stamp overhead. 0 idle cost. These are revised budgets; old 1,100 is not claimed met. | H10/H11/H13/H16; H14 stage/claim decisions. Must never draw a dead member or overwrite a peer's intact body. |
| **H14** | C decides requested stage and claim/retry; ASM publishes. Fold existing damage request bits 0/1 into the byte already tested by `heavy_breakup_retry`; move breakup pending to bit 7. Mask every breakup reader/clear, preserve death priority and surviving requests. Retain the existing no-pending LDY/BNE/RTS path. | **80–128 B window C/dispatch**, including migration of the current **33-B** breakup claim; keep a 3-B JMP +30-B padding at its arena entry (**0 arena delta**). Budget **6 of 7 pickup-tail B** for nonzero trampoline and masked clear. Existing H15 damage byte becomes reserved, not extra free capacity. | **0 new with no pending** by construction, to be measured. Allow **+80–240** control cycles on a pending/claim frame within H12's event ceiling; breakup-only mask overhead roughly **+6–20**. HP-request producers retain their existing member-bit operations. | Existing event token, `world_rotate_due`, spawn/recycle/reset paths; accepted nonrotate policy below. No additional every-frame poll. |
| **Bomber readable HP ramp** | C `bomber_colour`, full-colour HP lookup in appended window rodata. Proposed HP1..5 base luminances **4, 6, 8, 8, 8**, hue C; flash/charge remain +4 with current priority. | **6 B window table** (including HP0 sentinel); **3–5 B arena** estimated lookup expansion. Max arena 832/832; if compiler needs more, move helper through a fixed-entry veneer to window rather than spend protected RAM. | Approximately **+4–8 per Bomber tick**, **+8–16 per pair frame**; no Raider or row-tick cost. Replaces the historical unsupported 0-cycle estimate. | Accepted [gameplay-variety Q4](gameplay-variety.md#71-the-owners-answers-2026-10-08) plus [M3-H §8.2a](m3-waves-heavy.md#82a-note--the-bomber-at-1-hp-owner-2026-10-06). Owner authorized this exact ramp for final smoke. |

H10's old `−1 B /−4 cycles` estimate omitted reloading the member slot after
the archetype height lookup. The proposed cached-height form replaces a
14-B sequence with 11 B (23 instruction cycles with 15), avoiding that error.
It needs no separate height-state byte. Verify exact NMOS assembled code;
never trust a host model's opcode assumption. Source bases `$ABA2` and
`$549E` plus their bounded indices do not cross a page. Preserve every
subsequent BROADSIDE label by padding; preserve original draw bounds.

The original lifted formula `(hp << 1) + 2` is unsafe for HARD's 5 HP:
12 +4 reaches luminance 16 and changes hue. The accepted clamped table keeps
base ≤8, 1-HP visibility 4 and flash/charge ≤12. It intentionally flattens the
healthy end of the ramp; holes distinguish the last two HP stages. The owner authorized this exact table for final smoke on 2026-10-30.

### Accepted event contract — choice B

Owner decision, 2026-10-30: **B — nonrotate-only damage publication**.
The first attempt predicts rotate and respects token exhaustion. A retry
ignores token exhaustion but still waits for a nonrotate frame. Rotations
cannot be consecutive, so publication is bounded at three frames after the
hit watch. Breakup forcing remains unchanged.

Choice A is rejected: a dual stamp estimated up to 2,400 cycles on a rotate
frame risks exceeding 32,568; the frame-overrun spike showed that a missed
frame corrupts publication. Budget approximately 5–12 B and 35–50 cycles for
the additional retry rotate check within the session's 250-B window target.

Coalesce two pending members; otherwise a denied first member
followed by two separately serialized publications can violate the publication
bound. A later stage supersedes an earlier pending stage without restoring
holes. A member killed before publication loses its request; breakup retains
priority and must not erase a surviving peer's request. Admission invalidates
all old body/stage/retry state before any forced draw. No new claims are made
during a boss phase or after payload invalidation.

### Aggregate fit and fallback

The old 478-B all-window estimate is superseded. H12/H13 budget **248 B in
content home** (224 +24), leaving approximately **1,060 B** of its measured
1,308-B slack. H11/control/ramp plus the guarded entry target **≤250 new window
B total**, leaving at least493 usable B. This is a target, not a compiled-size
claim. H10 keeps linked size fixed; arena allowance5 B; pickup allowance6 B;
new render metadata8 B; H16's32 B are already reserved. No L2 reserve is spent.

The checked content record is currently a fixed15-sector run. Measure its
final used size, sector count, guarded entry cost and level-load time; never
infer load timing from code bytes alone. Invalid-home stamp requests must
clear/drop safely without reading any content instruction or table byte.

Record8 compressed use and all existing records still require measurement;
record3 has2 packed B free and record5 only1. Append new window code/data after
existing Heavy ASM so hot addresses stay fixed. No new record slot or initial
boot sector is budgeted. If the content entry's measured cost or lifetime is
unworkable, STOP with numbers. **Do not fall back to H12/H13 in the window.**

## 3. Implementation order and separate smoke checkpoints

Each checkpoint builds a play ATR under `build/play/m3h-session2/<checkpoint>/`
and can be retained or rolled back independently. Only the owner records smoke
acceptance. H10/H11's default installation is one inseparable safety unit.

1. **H16 +H10 +H11 default source.** Wire body indices/base/height and reset
   state with existing assault/Bomber art only. Smoke campaign, both Heavy
   planes, stationary holds, dodge, offscreen clipping, death/respawn, pause,
   recycle and a fresh game; compare original body bytes and stationary write
   counts. No new art or damage publication yet. This independently smokes
   H16 lifecycle and the shared renderer before visual changes hide defects.
2. **H11 profile look +compiler/level 2 art.** Add heavyLook format/default,
   hostile colour, editable plated Raider source and preview. Smoke assault
   versus armour in level 2 and its Heavy-sector shortcut; level 1 Raiders stay
   original. Check both E/M/H profiles, authored holds and escort-loop flags.
3. **Readable Bomber ramp.** Add lookup and full HP/flash/charge hue assertions.
   Smoke Bomber at 1 HP, during flash, charge and authored hold. Report its
   measured tick cost and arena size separately from the hole renderer.
4. **H13 generated holes.** Commit source triples/generator and preview all
   intact/stage 1/stage 2 shapes, independently reviewable before enabling a
   runtime stamp. Native fixture applies the same generated masks to H16 and
   checks byte-exact output; ordinary play still uses whole bodies.
5. **H12 controlled stamp.** Integrate bounded publisher behind a diagnostic
   fixture using the real renderer and current-Y forced draw. Smoke a review
   ATR with preselected damage stages through flight/hold/dodge; verify peer
   independence and both members together. Keep the normal campaign's event
   wiring disabled until H14. Fixture settings belong to build variants, not
   production gameplay inputs.
6. **H14 live damage and reset.** Enable reviewed claim/retry policy, reuse
   session-1 hit requests, and smoke natural hits on armour and Bombers in
   campaign/level 2/Heavy shortcut. EASY/MEDIUM armour jumps directly to stage 2;
   HARD armour shows both stages; Bomber gets stages at 2/1 HP. Exercise
   simultaneous hits, skipped thresholds, token denial, rotate retry, kill
   while pending and fresh formation after damage. H12's controlled fixture
   remains a regression test. Update EN/PL enemy/player docs together and
   affected engineering/ABI/memory documents.

At each checkpoint run focused meaningful checks on changed behaviour and a
normal gated build. Before delivery run one full `npm test`, compare with main
by test name **and first assertion/message**, and audit A/B/C with B empty.
Run the two registered quick native routes for the rendering/scheduler work;
also use short focused Heavy fixtures to expose the new stamp paths (the
capital routes alone cannot establish their cost). No repeated full suite
unless a new unresolved concern requires it. No milestone native/home matrix,
boss-stress command, release trace, strict release or boot frontend gauntlet.
Loader/startup changes would require the appropriate boot smoke and separate
scope review; none is planned.

Focused proof includes: assembled body-copy timing and page crossings; zero
extra idle pending cost; C stage policy versus ASM publication; exact clipped
P1/P2 bytes at current Y across all states; two independent members and a
dual request; cumulative stage masks; pending lifetime and aborts; actual
combined reset cost versus session-1 Phase 0 per difficulty (report-only);
startup/init assertions and build byte gates; row-tick/frame event coincidence
costs; native DMA-on worst frame. Preserve raw logs and first assertions.

## 4. Explicit scope disposition

**PLAN TO IMPLEMENT:** H10, H11, H12, H13, H14, H16,
data-profile Raider split completion, second armoured look, generated variant C
and Bomber visibility ramp. **No requested feature is silently dropped or
DEFERRED for space:** the primary conservative estimate fits, subject to
compiler/native proof. 8 B of additional state and dual-publication CPU are
explicit additions to the old estimate.

**DEFER — obsolete placements:** H12/H13 in MAIN Light (needs 248 budgeted B,
17 free: 231-B shortfall); H16 in pickup RAM tail (32 needed, 7 free: 25-B
shortfall); all new C in arena (5 B free). Their functionality has the concrete
replacement homes above. These homes are rejected for this plan, not silently
treated as additional capacity.

**DEFER — outside this task:** M3 Light paths, weapon/cadence profile additions,
new enemy archetypes, extra PMG planes, capital Heavy cutoff/departure changes,
new renderer/scheduler architecture, broader phase-resync work and release
evidence refresh. None is required to smoke these looks; no implementation
starts without the next owner instruction.

Plan deliverable CPU/RAM/residency delta: **0 /0 B /0 B**. Baseline play ATRs
are for reproduction only, not a session-2 gameplay candidate. Validation,
current quick peaks and the exact full-suite debt comparison are in
[the audit](../diagnostics/m3h-session2-plan/audit.md). **NEXT TASK: finish checkpoint6 verification, then pause for owner smoke of the whole Heavy package.**

## Implementation refinement after checkpoint2 acceptance

Checkpoint2 (`f33fcdc`) owner smoke PASS, 2026-10-30. Checkpoint3 `0e4160d`,
checkpoint4 `d9dce3f`, checkpoint5 `2064aa8` are committed candidates.
The new H14 C stage/claim helper also uses the checked content home, behind the
same resident validity/phase guard as H12. This keeps the measured total window
growth at **190 B**, within 250 B. It is a placement refinement of the plan,
not a window fallback or a new owner decision. Home use is **1,029/1,920 B**: H12
187, H13 24, H14 C 206 additional bytes versus the 612-B baseline. Invalid-home
requests drop before any new C policy or publisher instruction/table is read.

H14 spends six pickup bytes (one left), moving the cold boss-head and LIFE
continuation pins by six bytes with explicit build checks. The 33-B arena
death-claim entry becomes JMP +30 pad; masked death policy lives in appended
window code. Arena 830/832 B; no protected reservation grows. The no-pending
LDY/BNE/RTS bytes and 12-cycle cost remain identical.

Record8 is 15 sectors (+1); the checked content run stays 15 sectors and the
linked load fixture remains 313,556 cycles (added 0 cycles/reads). No release
evidence is inferred from these checks. Final native quick peaks remain
30,465/31,153; individual dual-event/component estimates are report-only.

### Checkpoint6 hard stop — uncovered departure case

H14 is **INCOMPLETE / BLOCKED_EXTENSION_BYTES**, not silently dropped. Normal
hit-watch paths pass the linked/native checks, but the pre-existing departure
cutoff bypasses both motion HP watches. New damage after that cutoff does not
queue a stamp. The attempted C HP-boundary notification adds27 B to a composite
with24 B free: **3 B short**, hard STOP. The failed attempt is reverted; no
final-smoke candidate or completed final full-suite/A/B/C claim is made.
[Exact bytes, source, measurements and two bounded recovery options](../diagnostics/m3h-session2/checkpoint-6-blocked.md).

DEFER pending resumed authorization after the hard stop: completion of this
post-cutoff notification and checkpoint6 validation/owner smoke. No requested
Heavy feature is being declared complete through this deferral. H12/H13 home
and the nonrotate-only rule remain fixed.
