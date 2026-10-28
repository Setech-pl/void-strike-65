# Capital content v2

Status: **Amendment6 increment0 gates PASS; uncommitted, owner commit/smoke pending.** Increment1 remains OWNER-ACCEPTED at f0b0dd1. Current increment0 delivery and hashes appear in the Amendment6 section; the table below preserves accepted increment1 images.

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
