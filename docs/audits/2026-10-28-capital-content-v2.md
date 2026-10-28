# Capital content v2

Status: **Increments 1+0 are merge candidates at 434871e; STOP: full tests and reconciliation FAILED.** Increment1 remains OWNER-ACCEPTED at f0b0dd1. Increment2 is **PARKED at bfda36b** after owner smoke FAILED. See the merge-preparation section below; earlier delivery notes are historical.

| Play ATR (absolute path) | SHA-256 at increment1 delivery | Description |
| --- | --- | --- |
| `/Users/marcinkrzetowski/Projects/dark-fighter-capital-v2/build/play/capital-content-v2/1/campaign.atr` | `0fcd68d39b829fcdc3743c736824395c0bba3c8a509abf38932e2b2db450c492` | Campaign level1, capital480; checked content platform only |
| `/Users/marcinkrzetowski/Projects/dark-fighter-capital-v2/build/play/capital-content-v2/1/capital-480.atr` | `94e155fc20a5db9bdbab3315e81c21a3f858b64b66c8428c9761577b6785557e` | Direct capital480; difficulty selectable in OPTIONS |
| `/Users/marcinkrzetowski/Projects/dark-fighter-capital-v2/build/play/capital-content-v2/1/capital-960.atr` | `bb96059f69bdfaafdd09c5ffae8deecc56ab40142064b9d0dde6ba90995f4ee9` | Direct capital960; difficulty selectable in OPTIONS |

```sh
atari800 -xl -pal -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-capital-v2/build/play/capital-content-v2/1/campaign.atr
atari800 -xl -pal -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-capital-v2/build/play/capital-content-v2/1/capital-480.atr
atari800 -xl -pal -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-capital-v2/build/play/capital-content-v2/1/capital-960.atr
```

The capital480 play copy currently hashes `02cd17ec12bd24d6d665f81585c7ba9d97f2e57c548c7c7eab3083d26c2a93ee` after owner smoke (only save-record sector599 differs); the table retains delivery hashes. This attempt did not rewrite the play copies.

Branch `codex/capital-content-v2`, owner HEAD `f0b0dd1`; increment0 changes uncommitted by instruction. Baseline `5053697`. Difficulty remains selectable in OPTIONS. No merge, push, release or Git write.

## Phase 0 timing reconciliation

Fresh normal build passed computed gates, expected stale release evidence
warning retained. Registered fifteen-route native process exited0: all routes
passed. It includes the twelve L2 combinations; none is omitted or counted as
an independent extra route. Overall peak31,432, capital30,025; all boss entries
325 host frames. No gate was relaxed.

Capital distribution, 31,477 frames: p50 15,479; p95 24,491; p99 26,711;
max30,025 wall cycles. Top20 with event flags and measured profile intervals:
[baseline.json](../diagnostics/capital-content-v2/baseline.json).
The 17,660 historical figure predates islands/slalom, as the frame-split audit
explicitly records. Current measurements use the same standard start/end wall
timer on the current image, including islands/slalom. Do not budget from17,660.

| Frame type | Worst wall | Budget after300 safety |
| --- | ---: | ---: |
| Ordinary: steady phase2, no live hull explosion or music row | 28,936 | 2,264 |
| Event: other phase, live hull explosion or music row | 30,025 | 1,175 |
| Conservative accepted composed capital bound | 30,315 | 885 |

The existing pre-tick signal MUSIC_ACTIVE && MUSIC_ROW_TIMER==1 predicts a
music row. End-of-loop snapshots (timer6) identify those frames in the
summary. Phase state and explosion timer supply other event signals.
The conservative accepted composed bound remains29,128+1,187. New measured
profile interval subtraction gives30,283, but does not replace that bound:
interval and exclusive-PC accounting boundaries differ.

[Exclusive retained-peak attribution](../diagnostics/capital-content-v2/reclaim-attribution.json)
records CPU/wall costs for hull/scroll, broadside, turret and explosion-labelled
code on each route. These are measured executed-PC costs; their reclaimable
fraction is ESTIMATE because shared helpers, DMA and beam alignment remain.
A native hazard-without-content baseline is required in increment2.

## Module home proof progress

Static owners overlap $1180–$18FF in boot/boss phases. No allocation is made.
A host-only observer covers CPU byte/word data reads, opcode/operand fetches
and byte stores. It does not claim DMA or host-patched SIO write coverage.
The direct480 EASY flight route passed with zero observed accesses during
SPACE/capital. Boot and boss accesses were recorded as expected.
Four terminal-state-seeded boss fixtures passed real boss entry/fight/death,
summary, menu and level reload. Death peaks: R1 29,535; R2 29,360; R3 29,532.
Region4 and detailed bindings are in
[home-progress.json](../diagnostics/capital-content-v2/home-progress.json).
All four report zero misses, DLI/image errors, SIO failures and restore errors.
Exit/pause/brake/game-over/RESET observer matrix passed8/8, with no observed
CPU access to the home outside boot/boss ownership. This supports the lifecycle
in the plan; hardware smoke remains required.

## Plan, resources and fallbacks

[Working plan](../plans/capital-content-v2.md). F1 screen-cell fallback selected:
no exclusive GTIA bank is proved across existing art, DLI palettes and latch
clears. No per-tick full-mask scan is permitted. Other fallbacks are planned,
not yet exercised by production code. D2 amber$28 requires no colour edit.
No linked arena/reserve/M3-H/record5/boss/summary/menu/lance allocation changed.
The WIP declares CC2_POLICY in the existing window; its linked size is unknown
because the ABI gate rejected compilation output before assembly/link. Added load time not measured yet.
No component cost, passage proof or mine/bonus runtime is claimed.

## Validation and delivery status

No full npm test, release build or release-evidence refresh. Diagnostic helper
syntax checks passed. Raw data lives in build/evidence/capital-content-v2;
the existing native runner also retains its input-local traces. Compact
committed-intent summaries currently total less than70KB.
No native process is left unaccounted for: baseline and all four boss jobs
and all eight exit fixtures exited successfully. No native job remains active.

One exit launch initially lacked generated ownership images and terminated
before gameplay. Images were generated with the existing helper and the
fixture restarted. This setup failure was not a measured hardware gate failure.

No owner questions or new owner decisions. No merge/push/tag/rebase/branch
switch/worktree operation. STATUS records this branch blocker; the memory map records the unlinked WIP
without modifying generated baseline ranges.

## Pending owner smoke checklist

- EASY no-fire clear; islands constrain dodging; weave/shoot is a real choice.
- One shot starts a staged chain, one mine per step; side mines within reach.
- Contact2 without own-blast double count; blast1 only inside radius.
- Shield/respawn, brake, pause and field persistence after death.
- Bonus+100 with no capsule/P3 death conflict; capital bonuses without mines.
- 480/960 and all authored lengths scale; no Heavy/fighters in hazard.
- No turret shots/hull scroll in hazard; 65XE/SIO2SD flicker and load time.

## Increment 0 STOP

Normal build failed at scripts/build.mjs's existing Director ABI validator:

```
C Director unexpectedly requires cc65 software-stack/zero-page state:
stx tmp1 | rol tmp1 | sta ptr1 | ora ptr1
```

The gate permits zero executable helper-state references; four offending
instructions were reported. No gate was weakened. This is a confirmed build
failure, not a measured timing or RAM exhaustion claim. The compound
row-coordinate expression is the likely source (inference); generated assembly
was not dumped by this run. The smallest next experiment is explicit scalar
byte operations, then the unchanged ABI and placement gates. F7's specified
L2 indexed-write fallback was not applied to this Director expression.

The retained WIP derives a120-row departure runway from sector length, refuses
Heavy admissions there, cancels pending Heavy count, chooses normal one-line
Raider descent, and gives Bomber a no-fire one-line exit through the existing
PMG publication/retirement path. A two-frame clear guard precedes Director
capital admission, including early wave exhaustion. The helper bomber_may_fire
is relocated to fund the Bomber branch without planned arena growth. None of
these behaviours has passed focused execution/native verification. Window64,
per-row60, boss stress, drain reduction and all other increment0 gates remain
UNMEASURED, not passed. The WIP must not be merged or used for owner smoke.

| Increment | L2 | Window | Module | Reader | Level image | Initial content | Sectors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Phase0 baseline (source/status) | 1,250 B | 2,065 B | 0 | 1,529 B | 2,048 B | 12,825 B | 16 level /214 transport |
| 0 attempt | No linked result | CC2_POLICY unlinked | 0 | No source change | No source change | No linked result | No linked result |
| 1–3 | Not started | Not started | Not started | Not started | Not started | Not started | Not started |

CPU deltas/component timings/load delta: unavailable for the rejected WIP.
No new main-loop CPU result is claimed. Baseline native evidence remains bound
to5053697 and does not validate these source changes. No increment play images
were produced; no launch command is supplied for a nonexistent candidate.

Git staging failed once with index.lock / Operation not permitted in the
external worktree git-dir. Per owner instructions no retry or workaround was
made, including for the STOP checkpoint. Everything is uncommitted. Suggested
owner checkpoint message: `WIP STOP: [codex] capital-content-v2 Director ABI gate`.
No rejected production edit was rolled back, as requested.

## Amendments 2–3 historical continuation

A2 option1 replaced the indexed compound expression with scalar C. The
unchanged ABI validator passed and code shrank99→96 B. The resident attempt
then stopped at the byte gate; A4 below corrects its197-B subtotal to205 B.
A3 requires measured in-frame time checks for deferrable future content,
with at most2 deferrals; non-deferrable capital bonuses must fit885 cycles.
No such mine/bonus scheduler exists yet. Prior evidence is retained in
`amendment2-stop.json`; its rejected placement is not the current baseline.

## Amendment 4 — Step 1, before source changes (2026-10-28)

Current HEAD e88e8b9. Recompared the retained baseline and rejected assembled
listings before changing source. The197-B subtotal is runway96 + clear guard62
+ state3 + bomber_may_fire relocation36. It omitted enter_sector's8-byte reset
in HYBRID_C_WINDOW: corrected total task window growth205 B. Bomber no-fire
exit grows HYBRID_C_ARENA code10 B (12-byte prefix replaces a2-byte load),
not window code. Moving bomber_may_fire frees36 arena bytes: net arena−26 B.

DIRECTOR_C_CODE grows26 B: world_row_tick275→278 (+3), advance_sector41→55
(+14), heavy_request72→81 (+9). DIRECTOR_C_RODATA stays20 B. Baseline combined
use634/645 B leaves11 B; new combined660 B overflows by15 B. No function
contributes15 alone. This corrects the earlier incomplete window ledger.

Amendment4 changes order: platform increment1 first, then Heavy increment0
in the checked home. Window veneers remain <=64 B; net Director growth<=0 B.
All home entries require a loaded/phase guard. Owner performs Git commits.


## Amendment 4 platform result and STOP

Built the home before Heavy policy, as instructed. Checked directory run 12
loads 15 sectors at $1180. L2 INIT issues the checked $A006 read; only success
sets shared L2_VALID. Existing real-exit, boss-install, load-head and RESET
paths disarm it. No-op capital entry checks both validity and game_state=6.
Final full lifecycle coverage is pending; this is implementation, not proof.
Heavy source additions were removed from resident Director/lifecycle segments;
owner commit e88e8b9 preserves them for later migration into the home.

| Linked item | Baseline | Platform | Task delta / gate |
| --- | ---: | ---: | --- |
| L2 code/data | 1,250 B | 1,290 B | +40 / <=64 B |
| L2 free before reserve | 286 B | 246 B | >=222 B; reserve256 untouched |
| Window | 2,065 B | 2,065 B | 0 / <=64 B;746 B free |
| Director | 634 B | 634 B | 0 / <=0 B |
| Arena | unchanged | unchanged | 0 B |
| Content home | absent | 1 B code /1,920 B image | $1180–$18FF |
| Reader | 1,529 B | 1,535 B | +6 B;1 B free |
| Level image | 2,048 B | 2,048 B |16 sectors |
| Initial content | — |12,825 B |<=13,652 B |
| Boot transport | — |214 sectors |101 boot +113 extension |

Normal build passes computed gates and the unchanged C ABI validator; stale
release-evidence warnings remain expected. 720 CPU-only SPACE fixtures across
E/M/H, six lateral positions and40 scroll accumulators have exactly0 CPU delta
in complete active bodies and row prediction. Whole-mask hashes differ and are
not claimed as a state-equivalence proof. The focused budget-option test passes;
the default capital ceiling stays30,025, while explicit content runs enforce
31,200 (31,500 minus300 safety), as Amendment4 requires.

Native added checked load:57 PAL host frames,2,009,611 wall cycles, about1.14 s
(target1.2 s, gate1.5 s). This is the validity-only preliminary image; the final
explicit game-state guard was built afterward. Its native results must not be
presented as final-image certification.

The first boot invocation had a harness path mismatch and is excluded. Added
explicit diagnostic boot-artifact selection so the emulator and JavaScript
both use the same manifest-bound ATR under build/. Correctly bound real-SIO
atr-a5 reaches menu at1,362 and frontend polling at1,405. The existing gate is
baseline1,351 +50 +1 =1,402 for frontend polling: **3 frames over**. Menu delta
is11 and individually passes. No gate was waived or baseline refreshed.
The smoke aborts at this first failed assertion; remaining boot cases are not
claimed. This real-SIO deadline differs from the task's patched-SIO650-frame
menu gate. Raw JSON and log retain that distinction.

At this historical STOP, final-image lifecycle verification was incomplete;
Amendment5 below supersedes that status. No gate was waived.

## Amendment 5 — attribution before code changes

Owner HEAD db843f7. Baseline5053697 and current both have101 initial sectors,
113 extension sectors,11 DFMC records and a190-B record table. Both additionally
read the11-sector menu run before frontend polling:225 sectors total before
frontend input in baseline and A4,224 after the fix. Reader raw
1,529→1,535 B occupies13 sectors in both because each record includes a21-B
footer. Menu overlay240–250 precedes content265–279; content is not a boot
record and is read only at level start. Thus option(a) is already satisfied.
Fresh baseline real-SIO boot reproduces current milestones exactly: start1048,
loader1106, menu1362, frontend_poll1405. The +3 against1402 is inherited,
not a task regression or one-extra-sector effect. Step1 rejects all three
proposed extra-sector causes. Details: amendment5-attribution.json.

Attempt(b): share status-return tails and relocate cold guard dispatch into
existing pinned LIFE padding, with no behavior change. Need at least20 B off
the current reader, not6, to reduce13 sectors to12. This goes one sector below
5053697 because its count already matches current; the deadline stays1402.


## Amendment 5 — recovery and verification

Used(b), not(c). Shared status returns save8 B; moving the cold checksum
dispatcher into18 B of existing pinned LIFE padding saves15 reader bytes.
Reader1,535→1,512 B (−23); its21-B footer now fits12 sectors. LIFE's transported
extent is unchanged. Window/Director/arena growth0 B, L2 growth40 B unchanged.
The shifted reader flag pin and three cold dispatch destinations are build
checked. Initial content12,825 B; level image16 sectors; reservations untouched.
The boot path now reads101+112=213 sectors, one below5053697 rather than equal:
Step1 showed the baseline itself had the same1405 deadline failure.

Full real-SIO boot smoke passes:4 cold starts (BASIC on/off, two RAM fills),
RESET,130XE compatibility, and forced capital restore. Worst cold frontend
poll1401 <=1402; menu1358. The boot smoke's expected command count now includes
the manifest's15 content sectors; no reads/retries are exempted. The previous
63-vs78 command assertion was a stale content-unaware expectation, now78.

Focused tests: good content only arms after the final checked sector; altered
content with a valid wire checksum refuses to arm. All256 phase values ×2
validity states call content only for valid+GAMEPLAY. Five disk-integrity tests
pass.720 SPACE fixtures retain0 active-body and row-predictor CPU delta.
Boss lost-target stress (NMOS6502 CPU, off/lost): CitadelL4 7697/8112,
CitadelL5 8032/8447, SpineL7 7771/8186, SpineL9 8025/8440, BastionL10 8058/8473.
Every value equals5053697 (delta0, gate<=8500 and<=+2).

All four native boss lifecycle fixtures pass with the home observer enabled:
entry325 host frames, fight/death, summary, menu and checked next load; no
misses, HUD/ship/DLI errors, read-image errors or retries. They are seeded
terminal-boss diagnostics, not whole-campaign playthroughs. The observer
separates installed boss/death ownership in the reused RAM from content code.


### Final guarded-image evidence

Native15/15 PASS,59,538 frames, overall peak31,432 <=31,500; capital peak30,090.
Minimum fighter fence3,407 >=500. Every missed-frame, extra-VBI, DLI-order,
shifted-row and stale-L2 counter is0; existing world/hull checks pass.
Boss entry325 on all routes. Composed capital29,141 without audio +1,187 worst
audio =30,328 <=31,200, leaving872 cycles after the300 safety allowance.
Guard plus no-op tick measures28 NMOS6502 CPU cycles. No deferrable content
step exists yet, so A3 threshold/deferral counts are N/A for this platform;
mines/bonuses still require that scheduler. Component mine/bonus gates are N/A.

Host-only home observer passes27 captures:15 native routes,8 real-exit
fixtures (480/960 × pause/quit, game-over, level-end, RESET), and R1–R4
boss-death/summary/menu/reload fixtures. Zero content executions outside loaded
GAMEPLAY, including boot and boss phases. Legitimate installed boss/death code
executes in the same RAM and is counted separately, not mislabeled content.
The quit fixtures exercise pause; native brake routes exercise brake and
capital death/respawn. No guest instrumentation bytes. All native jobs exited0.

Checked content read:57 PAL frames,2,009,608 wall cycles (~1.14 s), below1.5 s
and the1.2 s target. Patched-SIO initial menu entry is observed at host560,
below650; this differs from real-SIO frontend1401. All39 reader tests,5 disk
integrity tests,3 focused module tests and720 SPACE CPU comparisons pass.
No full npm test, release build or release-evidence refresh. No new owner
question. Deviation: boot count is one sector BELOW5053697, because both the
baseline and A4 had the same inherited1405 failure. No gate was relaxed.

Final evidence: `amendment5-attribution.json`, `amendment5-platform.json`,
`amendment5-sha256.txt` under `docs/diagnostics/capital-content-v2/`.
Raw logs/traces stay under `build/evidence/capital-content-v2/amendment5/`.
Owner smoke for this checkpoint: campaign START GAME, direct480/960, OPTIONS
difficulty, brake, pause/resume/quit, death/respawn, boss entry and return;
65XE/SIO2SD: no flicker and acceptable added load time. Earlier mine/bonus
checklist remains pending for increments2–3. Next implementation is Heavy
policy in the checked home, with window<=64 B and Director net growth<=0 B.


## Increment0 home implementation — CPU STOP

Started from clean owner commit f0b0dd1. C owns the new decisions in the
checked content home: cached120-row departure runway, Heavy admission block,
sector advance and two-frame Heavy-clear guard. Bomber exit returns no shot
and uses the existing one-line departure movement. Existing resident behavior
remains the fallback when the home is invalid. Every new external home entry
passes a loaded/gameplay guard. No minefield sector implementation is included;
its planned capital-kind variant will share this entry rule.

The Director link now emits content as a separate padded disk image, so C
references remain scalar and link checked. The unchanged C ABI validator
passes without further A2 repair. Five guarded resident veneers occupy freed
Director code; the window adds only a3-B call to sector-entry setup. An initial
host replay exposed a wrong phase-address constant; it was corrected to the
linked game_state $009A and pinned in the build before the successful build.

| Resource | Current | Delta versus5053697 / gate |
| --- | ---: | --- |
| Window |2068 B |+3 B / <=64;743 B free |
| Director high |318 B |−316 B / <=0 growth |
| Arena |unchanged |0 B growth |
| Home |612 B |1 header +606 C +5 state;1920-B image |
| L2 |1290 B |+40 B / <=64;246 B before reserve |
| Reader |1512 B |unchanged from accepted platform |
| Initial content |12825 B |<=13652 |
| Boot transport |211 sectors |101 initial +110 extension; platform213 |
| Level image |16 sectors |unchanged |

Normal build and computed gates pass; release evidence remains pending as
expected. Paired NMOS6502 fixtures compare the full Director row tick against
5053697 with matching initialized state, a live Heavy and an unspent wave.
A32-module pre-capital sector arms departure at row136 (120 rows before256).
Ordinary fixture rows cost214 versus170 CPU (+44); the trigger costs238
versus170 (+68). **68 is13.33% above60, exceeding the5% tolerance (63).**
This is instruction CPU, not wall cycles; no timing allowance is waived.
The STOP is the component gate, not a window, Director or C ABI failure.

No native job was started for this attempt. Required native15, home observer,
boot frontend<=1402, boss stress, EASY drain and Heavy-free>=2-frame window
remain pending. The accepted platform's evidence does not validate these
changes. No build/play/capital-content-v2/0/ images were created. The generated
map describes linked WIP; the former standalone cfg/content-module.cfg is now
unused, and content-module.map currently aliases the shared Director map.
The map reporter recognizes the new segments and suppresses the duplicate
shared map. Removing the unused standalone config remains pending.

Recovery options (ESTIMATE only; not implemented after STOP):
1. Inline the existing loaded/phase check in the row veneer: +6 Director B,
   no window/arena growth,−12 CPU, predicted56-cycle trigger. Same gameplay;
   duplicates a small guard and requires all lifecycle/native checks.
2. Keep the shared guard and implement the row equality comparison in a small
   ASM helper, leaving the departure decision/stores in C: roughly30–50 home B,
   target>=8 CPU saved. Same gameplay, but a new ABI seam and no measured
   saving yet; higher codegen/proof risk than option1.

Evidence: `increment0-home-stop.json`, `increment0-home-sha256.txt` in the
compact diagnostics directory; raw build log and paired CPU JSON under
`build/evidence/capital-content-v2/increment0/`. Reproduce each side with
`scripts/capital-content-v2-heavy-cpu.mjs <build-folder-name> <output.json>`.
No full tests, release work, merge, push or Git writes. Owner commits.

## Amendment 6 — recovery and all increment0 gates

Branch `codex/capital-content-v2`, HEAD `a4e1197`. Owner commits; no Git
write, merge, push, release or tag. Increment0 is uncommitted and awaits
owner smoke; it is not OWNER-ACCEPTED. The earlier STOP evidence above is
historical and is superseded by this measured recovery.

Owner Amendment6 (2026-10-28) keeps the60-cycle gate and5% maximum63,
authorizes option1's6 Director bytes while keeping net growth<=0, and forbids
extra window/arena growth or A3 deferral. Option2 is only necessary if option1
still exceeds63. Option1 passes the stricter60 target, so option2 is unused.
The duplicated check is the existing loaded/GAMEPLAY guard; gameplay
decisions and stores stay in C. All512 validity/phase combinations exercise
the actual inline veneer. No home instruction executes for an invalid call.

| MEASURED NMOS6502 full row |5053697 CPU |Stopped CPU |Current CPU |Current delta |
| --- | ---: | ---: | ---: | ---: |
| Ordinary (8 fixture rows) |170 |214 |198 |+28 |
| Departure trigger (row136) |170 |238 |222 |+52 |

Saving16 CPU on both paths:12 JSR/RTS plus4 for the shared carry-result
path. This is instruction CPU, not DMA/wall estimation. Existing paired
fixtures were rerun on both snapshots with matching initialized live Heavy
and unspent wave state. No gate or tolerance was relaxed.

| Resource |Current |Delta |
| --- | ---: | --- |
| Director high |324 B |+6 recovery;−310 versus634 at5053697 |
| Window |2068 B |0 recovery; +3 versus5053697 |
| Arena |827 B |0 |
| Content home |612/1920 B |0 recovery;5 state B; no reservation growth |
| L2 / reader |1290 /1512 B |unchanged by recovery |
| Initial content / boot transport |12825 B /211 sectors |unchanged by recovery |

The unused standalone `cfg/content-module.cfg` had no active references
and is removed. The content remains separately emitted by the Director link.
The generated memory map records the6-B high-code increase/free-tail decrease;
no window, arena or reservation expands.

All pending increment0 gates PASS:

- Normal build and computed CPU/frame, DMA, fence, block, window, boss-entry
  and disk gates;5 focused module/budget tests (including the new inline guard).
- Native15/15,58,688 iterations. Overall peak31,444<=31,500 (+12 vs5053697),
  capital30,152 (+127), minimum fence3298>=500. Zero missed frames, extra VBI,
  DLI-order errors, shifted rows or stale L2 accesses. World/hull checks pass;
  every boss entry325<=350. Composed capital29,590 non-audio+1187=30,777,
  below31,200 (300-cycle safety retained).
- Host-only home observer27/27:15 routes+8 real exits+R1–R4 death/summary/
  menu/reload. 2,963,608 content opcode fetches; zero outside loaded GAMEPLAY.
  4,239,102 legitimate installed boss/death fetches counted separately.
  Eight exits cover480/960 × quit/pause, game-over, level-end and RESET;
  death/respawn validity remains checked. No guest instrumentation bytes.
- Full real-SIO boot smoke7/7:4 cold, RESET,130XE, forced restore.
  Worst frontend1390<=1402. Campaign ATR/boot binding is recorded in the report.
- All five lost-target boss-stress compositions unchanged against5053697:
  CitadelL4 7697/8112, L5 8032/8447, SpineL7 7771/8186, L9 8025/8440,
  BastionL10 8058/8473 (off/lost). Maximum8473<=8500, delta0.
- Natural campaign E/M/H Heavy-free active-frame windows before Director
  admission76/58/36 (minimum36>=2); full formation state and live count both0.
  Each then waits2 active frames before hull admission. EASY post-Director
  drain242→2 frames. The total tail from the first capture of authored row271
  to hull admission falls244→7, including the new pre-admission wait; it is
  not merely a relocation of the old drain.

Fixture setup corrections: the initial exit attempt used a protected emulator
copy, then stale ownership images; both were corrected before the successful
8-route run. Initial campaign snapshot assembly paired the new ATR with stale
boot/manifest files, so all3 were rejected before guest execution. Corrected
campaign captures are saved separately. The collector preserves the initial
runs and builds `native-verified` from12 successful direct routes and3 fresh
campaign routes; it reruns the unchanged registered fifteen-route assertions.
No production bug was inferred from those host setup failures, and no gate
was weakened. No native job remains running.

Reproduction after producing the raw captures:

```sh
node scripts/capital-content-v2-increment0-summary.mjs --collect --deliver
```

Compact bound evidence: `docs/diagnostics/capital-content-v2/amendment6-increment0.json`.
Raw captures: `build/evidence/capital-content-v2/amendment6/`;
CPU, build, focused-test and control logs:
`build/evidence/capital-content-v2/increment0/amendment6-*.{json,log}`.
All gates passed before the three play files were copied. Accepted increment1
files were untouched. Normal build has the expected stale release-evidence
warning; no full npm test, release build or release-evidence refresh was run.
Remaining: owner commit and campaign/direct480/direct960 play smoke, including
65XE/SIO2SD. NEXT TASK: owner commit/smoke; no automatic increment2.

| Play ATR (absolute path) |SHA-256 |
| --- | --- |
| `/Users/marcinkrzetowski/Projects/dark-fighter-capital-v2/build/play/capital-content-v2/0/campaign.atr` | `a6957d406a4e339863503fd36ab05eb284a8e0ba30e9e1247a724279839bb60d` |
| `/Users/marcinkrzetowski/Projects/dark-fighter-capital-v2/build/play/capital-content-v2/0/capital-480.atr` | `743db8948dbe0364991f8e90d051587a426cfa43d8aa7cd1b240ab65ed585fee` |
| `/Users/marcinkrzetowski/Projects/dark-fighter-capital-v2/build/play/capital-content-v2/0/capital-960.atr` | `6ad475ce1059cf0d1dbd9db993726ddd1f5409feebb077c5b081241f62002388` |

## Owner checkpoint commands

Run in `/Users/marcinkrzetowski/Projects/dark-fighter-capital-v2`.
The paths below are exactly this task's tracked changes, including the removed
standalone config and generated normal-build dist artifacts. Play ATRs remain
in the ignored build directory and are not staged. No command below was run
by the agent.

```sh
git add -- \
  cfg/content-module.cfg \
  src/hybrid/content-module.s \
  tests/capital-content-v2-loader.test.mjs \
  scripts/capital-content-v2-increment0-summary.mjs \
  docs/STATUS.md \
  docs/audits/2026-10-28-capital-content-v2.md \
  docs/memory-map.md \
  docs/plans/capital-content-v2.md \
  docs/diagnostics/capital-content-v2/amendment6-increment0.json \
  dist/void-strike-65-boot.bin \
  dist/void-strike-65-manifest.json \
  dist/void-strike-65.atr
git commit -m "fix: [codex] recover increment 0 Heavy row CPU and verify native gates"
```


## Merge preparation — increments 1+0 (2026-10-28)

Owner-created worktree `/Users/marcinkrzetowski/Projects/dark-fighter-capital-v2-merge`,
branch `codex/capital-content-v2-merge`, clean starting HEAD `434871e`;
main/base `5053697`. The owner commits and merges. No commit, stage, merge,
push or tag is authorized to the agent. Only increments 1+0 are candidates;
no increment 2 code, data or tests are imported from `bfda36b`.

### Parked increment 2: owner decision and failed smoke

**PARKED at `bfda36b` on `codex/capital-content-v2`.** Owner smoke FAILED:
a single horizontal band of six evenly spaced mines instead of a scattered
field of approximately twenty mines. Shot artifacts on islands were reported;
the comparison below did not reproduce the symptom, so attribution remains
pending. The parked checkout/branch was not modified.

Owner-provided future direction, not implemented on this branch: approximately
twenty mines scattered by a build-time generator; minimum spacing so every
mine is not in another's blast radius; mines scroll with terrain; guaranteed
passage; mine data outside the content home.

### Island artifact attribution

Source archives of all three exact commits were built under
`build/merge-attribution/{5053697,434871e,bfda36b}/`; no checkout or branch
switch was needed. Same route: level 1, zero-based sector 1, capital 480, EASY,
`l2-matrix` joystick input and normal FIRE, diagnostic lives held at 3.
No guest code was changed. The host-only capture patch and bound summary are
in [merge diagnostics](../diagnostics/capital-content-v2/merge-2026-10-28/).

| Build | Leftover island RAM cells at sampled frame ends |
| --- | --- |
| `5053697` main | None observed |
| `434871e` increments 1+0 | None observed |
| `bfda36b` parked increment 2 | None observed |

All 1,800 captured frames have identical physical ring/row pointers
(`$8140–$85AD`) and display memory/charset (`$4000–$47FF`) across the three
builds. Against the main no-fire control, all 1,200 matched frames have zero
ring-screen differences outside currently rendered projectile-owned cells.
The sample includes 188 projectile/island overlaps. This is an end-of-loop
RAM/ownership comparison, not a complete-frame raster comparison; transient
visible artifacts are not excluded. Thus no `434871e`-only
regression is reproduced, but neither an existing main bug nor an increment 2
artifact defect has been established. Keep the owner's report open for
`visual-bugs-diag`; do not label it an attributed defect.

Capture limitation: the three firing wrappers emitted 10000 frames but rejected
endpoint validation (`emitted 10000/3070 frames`): the invocation requested
120 boss frames without enabling the lifetime endpoint observer. The raw
1,800-frame captures and full CSVs are preserved and hash-bound; they are not
reported as native merge-gate PASS. The1,200-frame no-fire control completed
with its PAL audit PASS. End-of-loop PNGs can differ through partial raster
capture; the comparison uses RAM/ownership rather than those images.

Reproduction of the captured route used:

```sh
VS65_L2_SESSION=l2-480-0-flight VS65_L2_POLICY=l2-matrix \
DFTRACE_L2_BOSS_FRAMES=120 DFTRACE_HOLD_PLAYER_LIVES=3 \
VS65_ATTR_DUMP=build/island-frames.bin \
node scripts/runtime-wall-trace.mjs --prepare \
  --atari800-source=build/atari800-trace --artifacts=build/level-1-s1 \
  --only-session=l2-480-0-flight --smoke-frames=10000 --smoke-difficulty=0
```

For a bounded attribution-only rerun, omit `DFTRACE_L2_BOSS_FRAMES` and use
`--smoke-frames=1800`. Apply the saved host patch to each source archive;
`VS65_ATTR_NOFIRE=1` selects the no-fire control (1200 frames). The latter
alters only host trigger input while gameplay is active.

### Resources as of `434871e`

Content 612/1,920 B, **1,308 B free**, includes 5 state B; range `$1180–$13E3`.
Director high 324 B (−310 against `5053697`), window 2,068 B (+3), arena 827/832 B
(unchanged). L2 1,290 B, reserve 256 B untouched; reader 1,512 B; initial content
12,825 B; boot/chunk 211 sectors. No runtime production source changes in this
preparation. Existing increment 0 evidence reports +28 ordinary /+52 trigger
instruction cycles, against the unchanged 60 gate. These are prior measurements,
not freshly rerun merge evidence.

### Merge gates and STOP

**STOP: full tests and reconciliation FAILED.** No production fixes or
subsequent gate runs were attempted after this result.

| Gate | Result |
| --- | --- |
| Normal computed-gate build inside `npm test` | PASS; stale release-evidence warning remains |
| Full `npm test` (one run, 951.453 seconds) | FAIL, exit1; 1609 tests:1429 PASS,177 FAIL,3 SKIP,0 cancelled |
| Failure reconciliation, by name and first assertion | FAIL, exit1;176 NEW to ledger,0 MOVED,1 matched,0 disappeared |
| Existing committed trace reconciliation | No new/moved clauses; historical evidence only, not a refresh |
| Standalone normal/release builds and release-evidence refresh | NOT RUN after STOP |
| Fresh native15/15 and home27/27 | NOT RUN after STOP |
| Boot frontend<=1402 and ATR menu | NOT RUN after STOP |
| Boss stress A/B against5053697 | NOT RUN after STOP |
| Final L2/reserve, arena and initial-content gate review | NOT COMPLETED after STOP; current build figures above |
| Final campaign/capital480/capital960 owner play delivery | NOT DELIVERED after STOP |

First unrecorded failure: `tests/basic-window-capacity.test.mjs:39`,
“the window's free tail agrees with the linker map's Light kernel tail”:
**1516 actual vs1928 expected**. Its second capacity assertion fails at131.
The content-home claim tests fail at `tests/boss-claim.test.mjs:99` and123:
`CONTENT_HEADER $001180–$001180` and `CONTENT_RAM` reach the boss phase's
`$0C00–$1FFF` claim. All177 observed failures, including their first assertions,
are in [merge-gates.json](../diagnostics/capital-content-v2/merge-2026-10-28/merge-gates.json);
the complete [reconciliation output](../diagnostics/capital-content-v2/merge-2026-10-28/failures-reconcile.txt)
is retained. “NEW” means unrecorded in the current ledger; these failures were
not compared with a new full main run after STOP and are not automatically
classified as gameplay regressions. No failure record or gate was relaxed.

Raw logs: `build/npm-test.log`, `build/failures-reconcile.log`. Commands:

```sh
set -o pipefail
npm test 2>&1 | tee build/npm-test.log
npm run failures:reconcile -- --tests build/npm-test.log --trace docs/runtime-wall-trace.json
```

Normal test-build campaign ATR SHA-256:
`a6957d406a4e339863503fd36ab05eb284a8e0ba30e9e1247a724279839bb60d`.
The ATR, boot BIN and manifest are preserved under
`build/evidence/capital-content-v2/merge-2026-10-28/test-build/`, hash-bound in
the JSON. They are evidence of the failed gate run, not final play delivery.
No release build was run. Temporary generated changes were exactly:

- `dist/void-strike-65-boot.bin`
- `dist/void-strike-65-manifest.json`
- `dist/void-strike-65.atr`

All three were restored to starting HEAD after preserving the test artifacts;
**no `dist/` change remains**. No production source changed: session CPU and
RAM/residency deltas are0; the branch-versus-main figures remain those above.
No native process remains active. Branch/HEAD remain
`codex/capital-content-v2-merge` /`434871e158a46d1c4dffbd6b03b16d727f382887`.

**NEXT TASK:** investigate/reconcile the failed validators against main, then
resume merge preparation only when its gates pass. Owner final smoke is still
pending. The island symptom remains open for `visual-bugs-diag`. STOP; no
merge, push, tag or commit.

### Exact owner commit paths and message

These are the only intended changes from this preparation. No staging or
commit was performed. `build/` evidence remains untracked/ignored.

```text
docs/STATUS.md
docs/audits/2026-10-28-capital-content-v2.md
docs/memory-map.md
docs/diagnostics/capital-content-v2/merge-2026-10-28/attribution-observer.patch
docs/diagnostics/capital-content-v2/merge-2026-10-28/island-attribution.json
docs/diagnostics/capital-content-v2/merge-2026-10-28/merge-gates.json
docs/diagnostics/capital-content-v2/merge-2026-10-28/failures-reconcile.txt
```

Suggested message:
`docs: record capital content 1+0 merge gate stop and parked minefield`


## Owner merge-gate decision — baseline comparison (2026-10-28)

**STOP: B2 is nonempty (38).** At docs checkpoint `392a042`, ran the same full
`npm test` on the owner-created detached baseline `5053697`. Main: 1604 tests,
1467 PASS /134 FAIL /3 SKIP, exit 1. Merge's original `434871e` run:
1609 tests, 1429 PASS /177 FAIL /3 SKIP. Counts by file + full test name:
**A 134, B 43, C 0; B1 5, B2 38**.

[Complete A/B/C lists and every B justification and actual/expected value](../diagnostics/capital-content-v2/merge-2026-10-28/baseline-comparison.md).
[Machine-readable evidence](../diagnostics/capital-content-v2/merge-2026-10-28/baseline-comparison.json).
[Baseline reconciliation](../diagnostics/capital-content-v2/merge-2026-10-28/baseline-failures-reconcile.txt).

B1 justification lines, one per test (no edits made because B2 requires STOP):

- `boss-claim.test.mjs:99`: accepted content home `$1180–$18FF` makes the
  CONTENT_HEADER/code/data overlap with the boss claim phase-exclusive.
- `boss-claim.test.mjs:123`: the same accepted reservation adds CONTENT_RAM
  to the cfg areas intentionally sharing the boss claim in a different phase.
- `cfg-overlaps.test.mjs:22`: the same reservation intentionally shares the
  banner, boss slot C, boss scratch and boss-death CODE ranges.
- `heavy-bomber.test.mjs:560`: accepted Heavy departure adds a guarded public
  tick entry at `$9DC6`; the original Bomber body stays in the arena at `$7DCB`
  under `_enemy_c_heavy_tick_original`, so the old public-entry pin is stale.
- `heavy-package.test.mjs:111`: accepted Director −310 B reduces record 11
  from five sectors to three, part of boot 213→211; the later L2 1250-B pin in
  this test also follows accepted L2 +40 B, giving 1290 B.

All 38 B2 results remain unchanged. They include ordinary sector progression
and Heavy admission stopping, plus L2 INIT reaching its four-million-step
limit. The checked-content phase/image fixture boundary warrants investigation;
these are not established production regressions, and no failed behavioural
assertion is reclassified as an accepted zero/no-op result. A tests remain
untouched as pre-existing main debt. Of shared IDs, 130 have the same first
assertion/message, four moved; 108 serialized value pairs match, 26 differ.
The complete per-side evidence is retained; shared membership is not a claim
that every observed symptom stayed identical.

Baseline normal computed gates passed with the stale-evidence warning.
Reconciliation exits 1: 1 matched, 133 NEW to ledger, 0 MOVED. The original
merge reconciliation is unchanged. Baseline's pre-existing three modified
generated dist files were copied to
`build/evidence/capital-content-v2/baseline-comparison-2026-10-28/preexisting-baseline-dist/`;
after the test they were restored to `5053697`, leaving the tracked baseline
worktree clean. No source edit or commit there. Raw run copied beside those
preserved files; its hash is in the report.

No test/production/ledger/gate edits; no fresh native or release runs and no
final play delivery after STOP. CPU and RAM/residency delta: 0. Branch/HEAD:
`codex/capital-content-v2-merge` / `392a042`. Prior candidate ATR SHA-256 remains
`a6957d406a4e339863503fd36ab05eb284a8e0ba30e9e1247a724279839bb60d` (historical
test-build evidence, not fresh play qualification). Island artifacts remain
unattributed transient raster artifacts for `visual-bugs-diag`, not a merge
blocker. NEXT TASK: resolve B2, then resume the remaining merge gates.

### Exact owner commit paths and message — baseline comparison

No staging or commit performed. Only these paths belong to this task:

```text
docs/STATUS.md
docs/audits/2026-10-28-capital-content-v2.md
docs/diagnostics/capital-content-v2/merge-2026-10-28/baseline-comparison.md
docs/diagnostics/capital-content-v2/merge-2026-10-28/baseline-comparison.json
docs/diagnostics/capital-content-v2/merge-2026-10-28/baseline-failures-reconcile.txt
```

Suggested message: `docs: baseline merge test failures and stop on 38 B2 results`


## Owner B2 diagnosis — production error-path STOP (2026-10-28)

Starting checkpoint `9ea08d2`, clean branch `codex/capital-content-v2-merge`.
Compared production `434871e` with byte-bound `5053697` artifacts in isolated
source archives. **STOP: content-load failure bypasses the failure screen.**
No primary-checkout production, fixture, test assertion or ledger changes.

[Full grouping of all 38 tests, first divergences and mechanisms, fault matrix,
limitations and recovery alternatives](../diagnostics/capital-content-v2/merge-2026-10-28/b2-root-cause.md).
[Machine-readable per-test and fault evidence](../diagnostics/capital-content-v2/merge-2026-10-28/b2-root-cause.json).

The proposed missing-15-sectors root cause is disproved as a shared explanation:
existing installRuntimeSegments/loadCheckedL2 already serves sectors 265–279,
sets L2_VALID=1 and installs all 1,920 bytes exactly. Its phase remains 0; the
new guarded policy entries require 6. All 38 original failures reproduce.
Phase-only fixes 24; phase + legal host ROL A support + disk-aware bare INIT
fixes 29, without assertion changes. Groups are 24 phase-only, five opcode cases,
four missing synthetic frame advances, four old Heavy cadence expectations,
and one unhooked repeat INIT. The latter returns with a real Drive but fails
313,589 versus 45 CPU; serving sectors alone does not make that test pass.

Production fault injection executes real checked reads and summary continuation:
L2 device error, timeout, wire checksum and image checksum reach the failure
screen on both builds. Merge content faults reach normal summary wait with
VALID=0 because summary_load_l2 does not check INIT carry. The guarded START
boundary re-enters loading; normal gameplay does not begin. Thus no real-read
failure was shown stranding a running sector. The confirmed defect is loss of
the required error screen and its FIRE-to-menu exit, plus collapsed status 4.
Content did not exist on main, so no same-content-record fault comparison is
claimed. A separately forced invalid GAMEPLAY state advances rows/admission
on main and suppresses them on merge; it is not a demonstrated reachable
checked-read failure state. Disarm is unchanged in that probe.

No fixes followed the production STOP. Options remain estimates: replace the
three-byte L2 failure JMP with the existing failure-screen JMP, 0 code/state B
and no steady-state CPU delta; or propagate carry in the summary caller,
+5 code B and +3/+5 cold success/failure cycles, requiring five bytes recovered
inside its full 1,792-B reservation. Exact limitations are in the full report.
No production budget or timing delta was incurred by this diagnostic task.

A134 tests and all five B1 expectations are untouched; original A/B/C is still
134/43/0. No full npm test repeat, release evidence/build, native15/home27,
boot, boss stress or final play delivery. Prior ATR SHA-256
`a6957d406a4e339863503fd36ab05eb284a8e0ba30e9e1247a724279839bb60d` remains
historical test-build evidence. Baseline tracked checkout stays clean. No
stage, commit, merge, push or tag. Island artifacts remain unattributed transient
raster artifacts for visual-bugs-diag, not a merge blocker.

NEXT TASK: owner selection of the content-load failure recovery; only afterward
resume fixture work and the remaining merge gates.

### Exact owner commit paths and message — B2 diagnosis

```text
docs/STATUS.md
docs/audits/2026-10-28-capital-content-v2.md
docs/diagnostics/capital-content-v2/merge-2026-10-28/b2-root-cause.md
docs/diagnostics/capital-content-v2/merge-2026-10-28/b2-root-cause.json
docs/diagnostics/capital-content-v2/merge-2026-10-28/b2-diagnostic.patch
docs/diagnostics/capital-content-v2/merge-2026-10-28/b2-failure-probe.mjs
docs/diagnostics/capital-content-v2/merge-2026-10-28/b2-invalid-probe.mjs
docs/diagnostics/capital-content-v2/merge-2026-10-28/b2-focused-runner.mjs
```

Suggested message: `docs: diagnose B2 fixtures and stop on content-load error path`


## Option 1 recovery — zero growth, focused test-authoring STOP (2026-10-28)

**STOP / INCONCLUSIVE, partial WIP.** Starting `b644d5c`, normal build passes;
all linked segments have zero byte delta. Production error JMP now reaches
`$A0D6`; its target is build-pinned. Steady-state CPU and RAM delta 0.
Focused 10 tests: 9 PASS /1 FAIL. All four fault/FIRE cases pass; the added
cross-build byte-identity assertion fails because three absolute operands
follow accepted reader relocation. This was an agent test-authoring mistake;
it is not evidence of a production behavioural regression. The test remains
failing; no assertion was re-pinned after STOP.

[Exact first assertion, hashes, operand differences, partial edits and one
justification per changed expectation](../diagnostics/capital-content-v2/merge-2026-10-28/error-path-recovery-stop.md).
[Machine-readable evidence](../diagnostics/capital-content-v2/merge-2026-10-28/error-path-recovery-stop.json).
[Focused log](../diagnostics/capital-content-v2/merge-2026-10-28/error-path-recovery-focused.txt).

No further implementation or gates followed the owner's STOP rule. Synthetic
wait and Heavy cadence updates are not implemented; full-suite/A-B-C and all
remaining merge gates are not run. No qualified play ATR. Diagnostic ATR
`5f1a2ea11166abf6501161c6a8500b5118a89a8d8a3da83b9588526727af9676`
is preserved under build/evidence/capital-content-v2/error-path-recovery/test-build.
Tracked generated dist files restored. Group A assertion values untouched.
No Git staging/commit/publication. NEXT TASK: fix the invalid comparison,
finish the authorized test work and resume gates. Partial code is not an
accepted or smoke-qualified baseline.

## Exact owner commit paths and message

This is a **WIP checkpoint with a known failing new test**, not completed merge preparation. No staging or commit was performed.

```text
docs/STATUS.md
docs/audits/2026-10-28-capital-content-v2.md
docs/diagnostics/capital-content-v2/merge-2026-10-28/error-path-recovery-focused.txt
docs/diagnostics/capital-content-v2/merge-2026-10-28/error-path-recovery-stop.json
docs/diagnostics/capital-content-v2/merge-2026-10-28/error-path-recovery-stop.md
scripts/build.mjs
scripts/level-timeline.mjs
scripts/memory-map-report.mjs
scripts/nmos6502.mjs
src/hybrid/l2.s
tests/boss-claim.test.mjs
tests/capital-content-v2-failure.test.mjs
tests/capital-content-v2-loader.test.mjs
tests/encounter-director.test.mjs
tests/heavy-bomber.test.mjs
tests/heavy-package.test.mjs
tests/hybrid-lifecycle.test.mjs
tests/l2-lifetime.test.mjs
tests/level-payload.test.mjs
tests/nmos6502-rol.test.mjs
tests/sector-flow.test.mjs
```

Suggested message: `wip: zero-growth content error recovery and focused validation stop`


## c182af2 continuation — B0/native15 PASS; release/home STOP (2026-10-28)

No production change. Replaced the raw SHA with a symbol-resolved comparison
of the full 73-byte error/FIRE instruction sequence; all three relocated targets
have matching named symbols in baseline/current links. The checked-in baseline
fixture preserves the extracted 5053697 bytes, symbols, map range and reader
SHA. Other instruction bytes stay exact; four behavioural fault/FIRE cases are
unchanged. Four synthetic callers now supply active frames for the accepted
Heavy-clear wait; four cadence tests follow the accepted120-row departure cut.

[One justification per changed assertion and complete A/B/C lists](../diagnostics/capital-content-v2/merge-2026-10-28/merge-continuation.md).
[Per-side failure evidence](../diagnostics/capital-content-v2/merge-2026-10-28/merge-continuation-comparison.json).
[Bound gate results](../diagnostics/capital-content-v2/merge-2026-10-28/merge-continuation-gates.json).

Focused53/53 PASS; one full npm test1615:1478 PASS/134 FAIL/3 SKIP, exit1,
1541.028s. Main comparison **A134/B0/C0**; no A assertion edited. Ledger
reconciliation remains1 matched/133 NEW/0 MOVED, the same main-debt IDs; full
suite is not called green. Native15/15 PASS,58688 iterations, peak31444,
capital30152, fence3298, boss entries325/350, zero misses/VBI/DLI/shifted/stale
L2. Home15 captures:2533614 content/1007702 boss fetches, zero invalid; not27/27.
Boot7/7 PASS, frontend1390<=1402. Every full-suite boss stress mode equals saved
5053697, lost-target maximum8473. These are fresh, artifact-bound measurements.

**STOP:** first exit case rejected before gameplay, “L2 lifetime requires
ownership images”; native snapshots had images, original exit variants did not.
This is an agent setup mistake; no retry after STOP. The separate release trace
reports unrecorded core-down clause at runtime-wall-trace.mjs:2018 on
`director-complete-0-natural-sweep-fire0`: engaged row exists, no state>=3 row;
PAL5236-frame audit passes at30937. Cause remains unattributed. Trace terminated
under STOP after20 completed PAL audits. No canonical report refresh, strict
release build, four boss-home roundtrips or qualified play delivery. No active
task emulator remains. Exact logs are in merge-continuation-runtime-stop.txt.

CPU/RAM/residency delta0 this continuation; no production edits. Primary dist
clean. Initial normal-build transient outputs (boot BIN, manifest, ATR) restored;
subsequent work stayed under build/merge-validation-c182af2/. Evidence campaign
ATR SHA256 `5f1a2ea11166abf6501161c6a8500b5118a89a8d8a3da83b9588526727af9676`.
No stage/commit/merge/push/tag. NEXT TASK: correct exit image preparation and
investigate the first unrecorded clause before resuming affected gates; retain
passing evidence for identical guest bytes. Island artifacts stay unattributed
transient raster artifacts for visual-bugs-diag, not a merge blocker.

## Exact owner commit paths and message

No staging or commit performed. These are this continuation’s exact paths; no dist or production file belongs to the checkpoint.

```text
docs/STATUS.md
docs/audits/2026-10-28-capital-content-v2.md
docs/diagnostics/capital-content-v2/merge-2026-10-28/merge-continuation-comparison.json
docs/diagnostics/capital-content-v2/merge-2026-10-28/merge-continuation-gates.json
docs/diagnostics/capital-content-v2/merge-2026-10-28/merge-continuation-reconcile.txt
docs/diagnostics/capital-content-v2/merge-2026-10-28/merge-continuation-runtime-stop.txt
docs/diagnostics/capital-content-v2/merge-2026-10-28/merge-continuation.md
tests/capital-content-v2-failure.test.mjs
tests/encounter-director.test.mjs
tests/fixtures/sector-reader-error-5053697.json
tests/hybrid-lifecycle.test.mjs
tests/level-one-equivalence.test.mjs
```

Suggested message: `test: reconcile capital merge expectations and record verification stop`
