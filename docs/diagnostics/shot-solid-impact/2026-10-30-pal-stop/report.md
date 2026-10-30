# BLOCKED_PAL_BASELINE — bounded B2 reproduction

2026-10-30. Branch `codex/shot-solid-impact`, HEAD `e14af63`, main `8c0c2ed`.
Owner commits. No production change, commit, merge, push or tag.

**STOP: unchanged main fails the hard PAL gate during the requested bounded
reproduction.** NORMAL (runtime name MEDIUM), Spread, campaign:
**32,792 > 32,568 cycles, excess 224 cycles**. Three frames exceed the hard
gate; all are capital state 2, player alive, four player shots, no Heavy,
debris or transient effects. No missed frames, extra VBI boundaries, shifted
phase rows or DLI ordering errors were recorded. The hard ceiling still fails.

| Trace frame | Hull row | Wall cycles | Excess over 32,568 | Ship X/Y |
| --- | ---: | ---: | ---: | --- |
| 1137 | 207 | 32,720 | 152 | 88/225 |
| 1139 | 208 | 32,707 | 139 | 88/225 |
| 1142 | 209 | 32,792 | 224 | 88/225 |

This is a baseline failure, not a regression from a solid-impact implementation:
none exists. The captured campaign ATR is SHA-256
`5f1a2ea11166abf6501161c6a8500b5118a89a8d8a3da83b9588526727af9676`, exactly the
previously delivered main campaign disk. Main's normal build and direct-960
build pass their computed gates; that does not override the failing native gate.

The exact fatal assertion is:

```text
Focused PAL acceptance failed: {"measured_frames":1800,"maximum_wall_cycles":32792,"wall_ceiling":32568,"physical_headroom":2776,"missed_frames":0,"extra_vbi_boundaries":0,"physical_overruns":0,"deadline_overruns":3,"dli_ordering_errors":0,"passed":false}
```

`failing-run.txt` retains the original wrapper output; `focused-run.json` is
the original diagnostic report, and `failing-rows.csv` retains all columns of
the three original CSV rows. `evidence.json` binds the full CSV, raw RAM dump,
guest artifacts, host emulator and cancelled full-test log by SHA-256.

## B2 result and scope

The owner's new recording details were used: campaign; EASY and NORMAL;
ship at the bottom, ordinary joystick aiming for X=92, left of the island;
held FIRE. Hull contact moves X to 88 on the failing frames. The host diagnostic
pins one requested booster mode and its timer, and holds the life count at 4;
it does not inject HP, invulnerability, shot coordinates or shot state.
These are controlled diagnostic seeds, not a claim to replay the original
pickup collection or recording frame for frame.

The mint rescue cross is LIFE according to the current asset and player docs.
It increases lives without changing the weapon, consistent with the recorded
L4. Nevertheless the bounded matrix included plain, Rapid, Spread and Shield.
NORMAL in the owner request maps to difficulty index 1 / MEDIUM in the harness.

The requested single bounded batch was 16 cases: two revisions × two
difficulties × four modes, each capped at 1,800 gameplay frames. The seven
completed main cases are EASY all four modes, and NORMAL plain/Rapid/Spread.
The first six pass the diagnostic PAL wrapper; NORMAL Spread fails above.
NORMAL Shield was cancelled at the stop. The 5053697 half was not started;
therefore this batch does not establish whether this timing failure also
exists on 5053697. The earlier committed EASY baseline attribution remains
unchanged.

**B2 is not reproduced in the completed cases.** End-of-loop RAM shows zero
unexplained early shot retirements during alive capital frames, and no owned
shot cell whose final byte is missing its shot glyph. Death clears are
excluded from that statement. This does not exclude transient raster-only
visibility; a complete-frame pixel proof has not been made.
Plain/Shield maintain at least three live shots in the observed alive capital
frames; Rapid at least four. Spread can have one live shot under its existing
volley/cooldown policy. That alone does not reproduce or establish the cause
of the owner's island-correlated symptom. Per-case details are in `evidence.json`.

All three failing frames contain three live Spread shots with saved solid
backing 198 (`198 & 127 = 70`, inside the hull/island glyph range), and one
shot over empty space. They exercise the existing expensive composite path
identified in the first attribution report. This is evidence about the
failing workload, not a measured causal cycle breakdown.

## Compliant recovery choices, not implemented

The smallest measured recovery needed for the hard gate is **224 wall cycles**.
Meeting the original task's stricter capital bound of **31,200** would require
**1,592 cycles** at this sampled peak. Neither alternative below has been
implemented or certified to recover those amounts.

1. **Proceed with the requested B1 rule before compositing solid art.**
   Player-visible effect: the shot ends on the island/hull, as the owner
   requested. ESTIMATE: about 24 instruction bytes can use existing inert
   padding/alignment; no new state, arena or Director bytes. Removing the
   existing two eight-row composite loops on each of three solid shots should
   save several hundred instruction cycles per shot, but the net DMA-on
   saving needs measurement. Risk: preserve existing target priority and
   backing ownership; all original gates remain required.
2. **Fix baseline Spread compositor timing first as a separate bounded task.**
   Player-visible effect: preserve existing rendering while making it cheaper.
   ESTIMATE: no state growth, code placement within the existing 64-B allowance
   would need proof; zero arena/Director growth remains mandatory. If all
   saving came from the three composites, the required average saving is at
   least 75 wall cycles each. This is a target, not a feasibility measurement.
   Risk: glyph phases, hostile colour normalisation and raster timing make it
   broader than the requested solid-impact check.

The first choice directly addresses the requested behavior and the observed
workload. Continuing after this baseline hard-gate failure requires an owner
instruction resolving the explicit **“STOP on any failing gate”** requirement.
No gate was relaxed and no production recovery was tried after the stop.

## Reproduction and cleanup

`observer.patch` is a host-only diagnostic patch to the unchanged trace
observer; it was applied only while preparing the worktree-local emulator.
`bounded-reproduction.mjs` records the bounded job setup and stop behavior.
It expects matching campaign snapshots at `build/frame-peak-main-campaign`
and `build/frame-peak-baseline-campaign`, each containing the build files and
the three default dist files (ATR, boot BIN, dist manifest). The saved baseline
snapshot is 5053697. Prepare those snapshots before running the diagnostic.

The exact failing case can be launched with the patched private emulator:

```sh
VS65_B2_MODE=4 \
VS65_B2_DUMP=build/shot-solid-impact/continuation/b2/l2-b2-main-1-4.bin \
VS65_L2_SESSION=l2-b2-main-1-4 VS65_L2_POLICY=l2-b2-owner \
DFTRACE_HOLD_PLAYER_LIVES=4 \
node scripts/runtime-wall-trace.mjs --prepare \
  --atari800-source=build/atari800-trace \
  --artifacts=build/frame-peak-main-campaign \
  --only-session=l2-b2-main-1-4 --smoke-frames=1800 --smoke-difficulty=1
```

Snapshot setup initially lacked the default dist manifest and was rejected
before any guest execution. The supported snapshot was then populated with
all default dist files; no validator or threshold changed. That setup error
is distinct from the subsequent genuine PAL failure.

All remaining task emulators and tests were cancelled at the hard stop.
A main-only detached measurement worktree was removed. The partial main
full-test output is retained under `build/shot-solid-impact/main-npm-test.log`
but is not a full-suite result. An accidentally launched parent-checkout
baseline run was also cancelled and its partial output is not used.
Tracked observer and all three tracked dist files are restored exactly to
task-entry bytes. Draft focused tests were moved to ignored build storage;
no unfinished implementation or test enters this diagnostic commit.

Every production segment delta, RAM/residency delta and feature CPU delta is
**0**: production sources are unchanged. The intended solid check has no
measured per-shot cost because it has not been implemented. No optional impact
effect or turret/enemy-shot change was made. No play candidate ATRs delivered.
This is **not OWNER-SMOKE CANDIDATE**.

Original remaining gates — complete full A/B/C, native15, home27, boot
frontend, boss stress comparison, complete release diagnostic, focused solid
impact tests and candidate play delivery — are not passed and were not
continued after the stop. STATUS is unchanged because this is an unaccepted
diagnostic finding, not a new official project baseline.

NEXT TASK: owner decision on continuing the requested B1 implementation after
this pre-existing main hard-gate failure. No further B2 recording details are
needed to resume under that decision.

## Exact owner commit paths and message

All paths below are under
`docs/diagnostics/shot-solid-impact/2026-10-30-pal-stop/`:

- `report.md`
- `evidence.json`
- `observer.patch`
- `bounded-reproduction.mjs`
- `failing-run.txt`
- `batch-run.txt`
- `focused-run.json`
- `failing-rows.csv`

Suggested message: `docs: record baseline Spread PAL hard-gate stop`
