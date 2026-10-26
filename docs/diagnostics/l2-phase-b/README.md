# L2 Phase B — historical BLOCKED_FOCUSED_PAL_ACCEPTANCE

Resolved by the [recovery and owner-smoke candidate](recovery/). The evidence
below records the failed checkpoint and is retained unchanged.

Implementation through `104a94d`; measurements use those gameplay bytes.
The later worktree correction changes only the long diagnostic's manifest name;
new policies/clock logging live in the host emulator, with zero guest bytes.
No owner-smoke candidate or runtime lifetime certificate is issued.

The option-A reader wiring and normal computed gates pass. The mandatory native
acceptance fails after a completed long capital, at the boss handoff. The
standing byte-placement recovery rule does not cover timing/correctness.
Implementation and additional measurements stop at that failure.

## Native evidence

- [Exact summary and first failing-frame excerpt](native-stop.json).
- [Failed focused acceptance](960-hard-observer-smoke-focused-run.json),
  [log](l2-960-hard-route.log), [writer report](960-hard-observer-smoke-watch.json).
- [Full raw CSV, gzip](960-hard-brake.csv.gz) and
  [16-bit clock CSV, gzip](960-hard-clock.csv.gz).
- [Earlier short campaign sample](480-hard-neutral-focused-run.json) passes:
  HARD neutral, 2,300 frames, peak 31,424, zero missed frames or DLI anomalies.

The raw marked boss-install record at frame 4640 spans 11,557,827 cycles
(approximately 325 physical frames of disk loading); it is excluded from the
focused gameplay acceptance. Subsequent normal-loop records still fail:
39,437 peak, 1,285 missed frames, 3,852 DLI ordering errors, 857 hard overruns,
428 physical overruns. The first DLI failure is frame 4644. The observer's
region-1 row-switch clause also fails. A guest lifetime/handoff defect versus
observer PC aliases in reused boss memory remains **unresolved**. These are
confirmed report failures, not a confirmed regression diagnosis.

Capital-only: 3,064 frames, mean 10,139.62 / max 17,128 wall cycles, zero misses
or DLI violations. The clock observer reaches universal row 968; all 3,064
world/hull residue pairs match; HARD rate reaches every integer 10-20, warning
reaches 35. The generic CSV's corridor_phase field is the low byte; use the
separate full-width clock CSV for coordinates beyond 255.

Reproduce the failing capture (ordinary joystick input, no coordinate/speed
pokes; keep the freshly prepared emulator):

```sh
npm run build -- --level=1:sector=1 --l2-long-capital
VS65_L2_POLICY=l2-brake DFTRACE_L2_OUTPUT=build/l2-960-hard-clock.csv \
DFTRACE_L2_WORLD_ACC=0x87 DFTRACE_L2_HULL_ACC=0x4E71 \
DFTRACE_HOLD_PLAYER_LIVES=3 \
node scripts/runtime-wall-trace.mjs --prepare \
  --atari800-source=build/atari800-trace --artifacts=build/l2-capital-960 \
  --only-session=observer-smoke --smoke-frames=5500 --smoke-difficulty=2
```

Diagnostic ATR SHA-256:
`58512321eb84823306434ba9e83fdfca120e0771ee511bec245a96878a40e007`.
Campaign checkpoint SHA-256:
`99bfacfcba0f36f1dcf3976874263b2cddf2080f15bd7196597d501a5180eb6f`.
These are diagnostic/incomplete artifacts, not candidates for owner acceptance.

## Partial measurements

[Linked ranges and computed CPU snapshot](linked-checkpoint.json);
[complete changed-routine/page table](l2-page-cross.md) and
[machine-readable audit](l2-page-cross.json). Zero new per-frame branch crossings
or indexed-table page penalties. Normal computed gates pass with an explicit
stale release-evidence warning. The additive CPU+DMA diagnostic is an estimate,
not native wall timing. No assertion or hard limit is relaxed.

Cold [current](l2-start-timing.json) / [main](l2-baseline-start-timing.json)
SIO timings use identical scripts and the exact accepted baseline ATR hash.
[Read timing](read-timing.json): both patched/unpatched OS modes add 64 frames
to the raw level+L2 read span (49 to 113), with 17 extra sectors; both visible
START GAME times remain 909/1695 (summary minimum absorbs the read). Input-ready
menu remains 598/1384. BASIC variants also pass cold START GAME. No post-boss
or INIT-inclusive load-time certification is claimed.

[Focused tests](l2-focused-tests.log): 14 pass. [Real loader subset](l2-loader-final-tests.log):
10 pass. [Backing](backing.json): 1,640 pass, ring reuse/fallback and 20 faction
underlay codes; carried-in debris leaves after 47 rows, before the first island
at 96. Every edited test file: `boss-claim`, `level-compiler`, `sector-reader`,
new `l2-coordinate`, `l2-islands`, `l2-brake` (all `.test.mjs`). The sector-reader
fixture's PokeyStub moved unchanged into `scripts/sio-fixture.mjs`; its real
checked load path is shared with computed/runtime fixtures. No assertion is
weakened; old exact format/size expectations now name the new format.

Boss stress off/fire matches main: Citadel L4 7697/8060, L5 8032/8423; Spine L7
7771/8180, L9 8025/8435; Bastion L10 8058/8467. Deltas 0; clashes 0. Lost lance
mode also passes. The previously worst all-state modes retain R1 7596, Citadel
8112/8447, Spine 8191/8446, Bastion 8478. R1 runs all 18 modes; other regions
run off/fire/lost plus prior worst swap mode where different. This is not an
all-18-mode resweep of every region. Main's L4 off/lost rerun agrees exactly;
remaining references are the accepted hash-bound L1 table.

## Pending at STOP / recovery choices

No further capital matrix, post-boss ownership/read/execute proof, four-region
entry proof, RESET boot smoke, protected writer matrix, post-boss load/pause/menu
or full candidate set is claimed. No full npm test, release wall-trace refresh,
stage-2, reconciliation, release build, package or showcase ran.

1. Diagnose observer aliases first, using a short identical main boss-handoff
   control plus instruction/phase logging. Guest RAM/code/cycles: 0. Limitation:
   does not itself prove or repair a game lifetime defect. Risk: attribution
   remains inconclusive until compared; no acceptance assertion is relaxed.
2. If guest execution is confirmed to return through invalidated L2, repair the
   non-returning boss handoff, with resident/L2 lifetime and timing proof before
   integration. Player-visible goal: correct boss entry. Byte/cycle cost remains
   unmeasured and must be repriced before implementation; protected reservations
   stay untouched. Risk: loader/stack ownership crosses several phase modules.

Both require owner direction after this explicit STOP; neither promotes the
partial gameplay to accepted status or skips a required gate.
