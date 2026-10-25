# L2 audit fixes — OWNER-SMOKE CANDIDATE

Owner smoke of `b2b38ff`: PASS ("generally OK", 2026-10-25). The fixed
candidate awaits a new owner smoke. Report `668f692` merged unchanged in
`66f53b9`; SHA-256
`e5cf25b187ed68f67c04971f13491e8722217de8a238dd9359ec36e173ac6458`.
Code checkpoints: L2-01 `52ee66b`, L2-04 `c77ebba`, remaining fixes `cba50fd`.
Final measurements completed 2026-10-26. No main merge or release certification.

## Requirement and implementation

The owner corrected L2-04: losing a life in a capital is not an exit. DYING
and respawn keep the checked image valid. Disarm resets the brake operand to
resident `$3114`, rate to zero and valid to zero on boss install, GAME OVER,
pause-quit, level end/teardown, RESET/warm start and at the head of every L2
load. Only checked load + INIT validates; START GAME with invalid L2 goes
back through `$A000` before gameplay. The old 52-B death-reload sketch is
[superseded diagnostic history](superseded-checkpoint.md), not a minimum proof.

L2-02 arms the brake at capital entry, returns to the resident hook on capital
completion and gates contact by capital state 0–4 before any L2 jump. The
predictor rate selection now costs the same as main for every Light. Equal
byte timing pads use documented NMOS `BIT zp`, with flags overwritten before use.
L2-05 intentionally snaps to full speed on death and capital completion;
releasing the brake while alive retains its ramp. Capsules consume the same
braked numerator over ten and move at exactly half world speed at every even
and odd ramp step. EN/PL player instructions and game design describe this.

L2-06 generates C and ASM ABI addresses/format constants from linked labels and
the level compiler. A build assertion checks world/hull numerator equality.
Warning codegen may neither change X nor call unproven routines; JMP targets
must be local labels. The runtime X preservation assertion remains.
L2-07 corrects contact closure, STATUS/NEXT TASK, 960-row assertion/test text,
sequence-page description and the phase-exclusive `$0C00–$1FFF` memory row.
L2-08 explicitly labels variant aliases, trace reuse and lives top-up diagnostic
only. Reports distinguish zero guest code bytes from fixture state writes.
The generic debug-route trace reuse assertion still rejects reuse.

| Complete fix | New code/state B | Placement / recurring cost |
| --- | ---: | --- |
| L2-04 | 32 | cold paths, existing C padding and CODE slack; no frame guard |
| L2-02 | 31 | resident contact 12, L2 entry 14, L2 SPACE tail 2, C completion call 3; SPACE −2 cycles |
| L2-05 | 0 | operand/denominator replacements, same CPU at full speed |
| L2-06/07/08 | 0 | generated values/checks/docs/host observer |

No protected reservation is used. [Page-cross audit](page-cross.md): every
changed listing routine and all L2 indexed tables, **zero new per-frame
crossings**. The audit baseline is the saved `b2b38ff` link in
`build/l2-audit-before`; SPACE/stress control is freshly built main `19b1464`.

## Linked ledger and normal build

[Normal build](normal-build.log) passes computed timing/DMA, fence, block,
window, boss-entry and disk gates. Expected stale runtime evidence warning:
release build will fail. No evidence SHAs were hand-edited.

| Owner | Used / capacity B | Free B |
| --- | ---: | ---: |
| L2 `$1900–$1D39` | 1,082 /1,792 | 710; **256 reserve intact**, 454 otherwise free |
| C sector | 244 /248 | 4 tail +54 reclaimable pinned padding |
| Reader | 1,529 /1,536 | 7 |
| Summary | 1,792 /1,792 | 0 |
| MAIN Light | 1,196 /1,213 | 17 |
| Director high | 634 /645 | 11 |
| C arena | 818 /832 | 14 |
| ENTITY_CODE | — | 5 |
| HYBRID_C_EXT | — | 24 |
| A2 kernel | — | 19 |
| BASIC window | 1,656 /3,584 | 1,928 total; protected ranges unchanged |
| Initial content | 12,825 /13,652 planning gate | 827 |
| Boot/chunk transport | 101 +110 sectors | 211 occupied |

Physical linked delta vs `b2b38ff`: **resident +3 B, L2 +19 B**; the other
new meaningful bytes reclaim existing padding/slack. Disarm is +34 CPU once
vs reader blank; INIT is 45 CPU. Brake/warning maxima remain 101/30 CPU.
Future dock 352 +bonus 128 are ESTIMATES, 26 B beyond the 454 nonreserve bytes;
no future work or reserve borrowing is included.

## Measurements

[SPACE comparison](space-comparison.json): all **720 full main-loop bodies
are −2 CPU cycles vs main `19b1464`**, using identical route/input/state
(3 difficulties ×6 boundary X positions ×40 accumulator values). This counts
actual NMOS CPU work outside raster busy waits, not estimated DMA. Predictor
per-call delta is zero in every case, hence 0–4 Light calls add no delta.
Capital/SPACE trajectory divergence is not presented as a CPU A/B measurement.

**12 routes /47,326 frames**, 480/960 ×E/M/H ×flight/contact and
brake/contact: **10 frames exceed 31,500** (previously 10), peak **31,598**
(previously 31,598), maximum target excess 98. Hard gate 32,568: **970 cycles
margin**; physical 35,568: 3,970. Minimum publication fence **4,977**, capital
peak 17,660; zero missed frames, extra VBI boundaries, DLI errors, shifted
phase rows, world/hull clock mismatches or stale L2 accesses. Every route
reaches universal phase 968. Broadened lifetime checks PASS at both lengths,
through boss install and all real exits (8/8), including capital death and
respawn with validity retained.

| Rows | Difficulty | Mode | Peak | Mean | Fence | Target+ | Miss / VBI / DLI |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| 480 | E | flight/contact | 31189 | 20332.22 | 5829 | 0 | 0/0/0 |
| 480 | E | brake/contact | 31046 | 17030.08 | 7061 | 0 | 0/0/0 |
| 480 | M | flight/contact | 31166 | 21404.13 | 6388 | 0 | 0/0/0 |
| 480 | M | brake/contact | 31198 | 18079.66 | 5922 | 0 | 0/0/0 |
| 480 | H | flight/contact | 31445 | 22149.71 | 5253 | 0 | 0/0/0 |
| 480 | H | brake/contact | 31598 | 18882.92 | 5120 | 10 | 0/0/0 |
| 960 | E | flight/contact | 31164 | 17531.38 | 5855 | 0 | 0/0/0 |
| 960 | E | brake/contact | 31162 | 15289.91 | 5851 | 0 | 0/0/0 |
| 960 | M | flight/contact | 31257 | 18764.9 | 6885 | 0 | 0/0/0 |
| 960 | M | brake/contact | 31256 | 16359.43 | 6927 | 0 | 0/0/0 |
| 960 | H | flight/contact | 31432 | 19342.05 | 5694 | 0 | 0/0/0 |
| 960 | H | brake/contact | 31432 | 17120.46 | 4977 | 0 | 0/0/0 |


## Lifetime coverage

The observer instruments actual CPU instruction/operand fetches and every
byte/word data read in `$1900–$1FFF`, from every source address, including
indirect reads and all resident windows. Full checked L2 bytes are verified
at INIT; installed boss/death code is matched to image and phase. Exact linked
palette operand sites, four death wing-buffer copy sites and stack-proven
RTS/RTI returns model legitimate self-modification/returns without a broad
resident whitelist. Any stale access aborts the native process.
The core observer writes no guest code, register or RAM byte.

All nine resident L2 entry sites/hooks plus every resident window and 13
addressing families have fault fixtures; 20 actual boss main-loop bodies
exercise every shared hook, with real START GAME reload. Native 480/960
routes cover boss entry and capital death + respawn. Real exits are driven
through quit, GAME OVER, level end and RESET at both lengths, followed by
checked INIT/re-entry. The **diagnostic-only** GAME OVER/level-end fixtures
seed terminal state; quit and RESET use physical input. All PAL/image gates
remain fatal. Host lives top-up is disabled for GAME OVER.

[Native exit results](lifetime-exits.json): **8/8 PASS**, stale accesses **0**.

| Rows | Exit | Checked INITs | Disarmed boots | Capital death / respawn | Stale |
| --- | --- | ---: | ---: | --- | ---: |
| 480 | game-over | 2 | 1 | 2 /2 | 0 |
| 480 | level-end | 2 | 1 | 2 /2 | 0 |
| 480 | quit | 2 | 1 | 2 /2 | 0 |
| 480 | reset | 2 | 2 | 2 /2 | 0 |
| 960 | game-over | 2 | 1 | 2 /2 | 0 |
| 960 | level-end | 2 | 1 | 2 /2 | 0 |
| 960 | quit | 2 | 1 | 2 /2 | 0 |
| 960 | reset | 2 | 2 | 2 /2 | 0 |


## Boss stress and reload

[Stress](boss-stress.json): main/fixed maxima match in all 20 combinations.
Each level uses no lance, firing, lost target and target swap. Reachable
cases: 9,856 each Citadel level, 18,528 each Spine level, 856 Bastion.

| Region / level | No lance | Firing | Lost | Swap | Δ vs main |
| --- | ---: | ---: | ---: | ---: | ---: |
| Citadel L4 | 7,697 | 8,060 | 8,112 | 8,071 | 0 |
| Citadel L5 | 8,032 | 8,423 | 8,447 | 8,434 | 0 |
| Spine L7 | 7,771 | 8,180 | 8,186 | 8,191 | 0 |
| Spine L9 | 8,025 | 8,435 | 8,440 | 8,446 | 0 |
| Bastion L10 | 8,058 | 8,467 | 8,473 | 8,478 | 0 |

Maximum **8,478 ≤8,500** (22 cycles margin), all deltas **0 ≤+2**.
[All four native death/reload captures](postboss.json) pass boss defeat →
summary → menu → checked START GAME. Entry ceilings **325/340/340/344 ≤350**;
175 death frames per region, death peaks **29,535/29,360/29,532/29,537**;
zero misses, image/read/SIO/HUD/ship/DLI errors and stale accesses. Restarted
levels 1/4/7/10, each with two verified L2 INIT events. Native post-boss pause
passes (499 frames, peak27,703, no missed frames or VBI/DLI anomalies).
[Boot smoke](boot-smoke.json): four cold sessions, RESET, 130XE and forced
capital restore all pass.

## Focused tests (all results reported)

[Every test result](focused-tests.txt): edited gameplay/reader/lifetime/level
files **98 tests: 86 PASS /12 pre-existing FAIL**. Generated-map file **3/3**.
Observer freshness/SIO tools **4/4**; ordinary debug-route reuse rejection
focused check **1/1**. Regional Q-S4 restoration checks **3/3**.
No full npm test, release build, stage-2 pass, reconciliation or wall-trace
regeneration was run. Focused captures stay diagnostic and do not replace
release evidence.

All 13 boss-runtime tests: Director admission PASS; black/banner/theme/read
order PASS; install PASS; gameplay DLIs PASS; world-stop/restart PASS; band
scroll PASS; column map PASS; shots PASS; cover/core/chain PASS; **the win
FAIL (pre-existing)**; Q-S4 restore PASS; Q-B6 ≤7,000 PASS (5,211); cavity PASS.
Total **12 PASS /1 pre-existing FAIL**. Main `19b1464` is also 12/13.

[Failure comparison](pre-existing-failures.json) records every failing name,
first error and assertion location against fresh main: the same boss summary
hand-off assertion and 11 existing pickup/Rapid/HUD failures. No assertion is
weakened, skipped or changed to accept those failures. The capsule motion
regression test independently verifies every brake numerator.

## Reproduction and candidate

Use the existing Atari800 tree `build/atari800-trace`. Rebuild normal default
and the six named variants; generate ownership with
`node scripts/l2-observer-images.mjs build/<variant>`; then run
`scripts/l2-native-matrix.mjs`, `scripts/l2-results.mjs`, and
`scripts/l2-native-exits.mjs`. Matrix's first capture prepares the standard
observer. `measure-boss-death.mjs --prepare` installs its custom observer;
finish all four regional captures before restoring the standard observer.
Never run the destructive debug-route E2E fixture while a capture uses its
variant directory. The temporary detached main worktree was removed.

The six final-HEAD normal builds are copied to absolute paths recorded in
`build/l2-owner-smoke/candidate.json`. `candidate-hashes.json` binds these to
measured guest bytes; the candidate builder refuses any mismatch or dirty
starting tree. All build logs stay in `build/l2-owner-smoke/`.
Smoke: cold boot; level1 SPACE with debris; capital islands and brake including
dying while braking; boss → summary → menu → START GAME; capital pause-quit →
START GAME. Only the owner can accept this fixed candidate. STOP.
