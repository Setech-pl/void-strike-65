# Loop-phase resync — partial recovery

Branch `codex/phase-resync`, main baseline `a066098`, spike reference
`codex/spike-frame-overrun` / `a378dc2`. Owner smoke is pending.

The fighter tail drains `PHYSICAL_PAL_FRAME_ID` into
`GAMEPLAY_PAL_FRAME_CONSUMED` before returning to the master wait. A nonzero
`FIGHTER_PROJECTILE_PUBLICATION_FRAME` bypasses the drain: capital normally
crosses the next physical token while working. There is no other frame-loop
change, new state, gameplay decision or renderer transaction.

**Persistent phase slip is removed in every forced-miss case. The goal of at
most one mixed raster per miss is NOT met universally.** This is the requested
cheap partial recovery, not a coherent-publication fix. Capital retains its
original transient behaviour. Boss can still produce three mixed rasters for
one miss, and SPACE has one two-raster incident among twenty repeated misses.

## Placement and cost

The inline estimate cannot fit: BROADSIDE has 3 free bytes, 8 short of an
11-byte insertion. A 14-byte trampoline in existing LIFE padding fits, but
its 17/10-cycle overhead changes the normal polling phase and produces small
control-raster differences. A 22/22-cycle variant fixes SPACE until capital
admission, but capital's VCOUNT poll uses seven cycles rather than eleven.
These intermediate builds are rejected and retained only under build/.

The final tail uses **23 code bytes of existing unused boot-publication
padding at `$9B18–$9B2E`**, leaving all segment starts/sizes and every old main
label unchanged. `main_loop` redirects its existing final JMP to that tail.
Measured instruction overhead is **22 cycles for fighter/boss**, two master
poll periods, and **14 for capital**, two VCOUNT poll periods. The capital
path reads its existing latch and returns without touching either token.
BIT/NOP delays preserve these polling phases. Both paths stay on one page.
The linked CPU test covers fighter drain, fresh-token equality, byte wrap and
capital token preservation.

**Runtime residency/RAM delta: 0 B.** Packed ENTITY_CODE and initial boot
content grow **22 B**: initial content 12,843 →12,865 B, still 101 sectors;
transport remains 211 occupied sectors. The generated memory map reflects
packed-source changes. Normal build and computed byte/startup gates pass;
release evidence is stale/pending as on main, and strict release is not claimed.
[Placement proof](placement.json).

## Native results

Recovery means the first admitted loop after the injected iteration starts at
its control raster phase (within the existing eight-scanline phase threshold).
Every individual injection has **zero intervening late-phase iterations**.
That next loop starts at physical frame `miss-start +2`: one frame is skipped,
and the following admission is synchronized. This applies to all 84 injections
(4 scenes ×(1 single +20 repeated)).

Each recording retains 575 consecutive physical frames. Repeated injections
are exactly 25 physical frames apart. Fault padding first consumes the slack,
then executes 500 real JMPs (1,500 additional instruction cycles); the *total*
injection is larger. Artificial fault peaks are not normal frame-gate failures.

| Forced case | Injections | Spike →task mixed rasters | Spike →task shifted loop starts | Recovery after each miss |
| --- | ---: | ---: | ---: | --- |
| SPACE single | 1 | 359 →1 | 543 →0 | next admitted loop |
| SPACE repeated | 20 | 370 →21 | 530 →0 | next admitted loop, all 20 |
| Capital single | 1 | 2 →2 | 0 →0 | next admitted loop |
| Capital repeated | 20 | 41 →41 | 0 →0 | next admitted loop, all 20 |
| Boss single | 1 | 504 →3 | 549 →0 | next admitted loop |
| Boss repeated | 20 | 507 →31 | 530 →0 | next admitted loop, all 20 |
| HUD/music single | 1 | 0 →0 | 1 →0 | next admitted loop |
| HUD/music repeated | 20 | 8 →17 | 20 →0 | next admitted loop, all 20 |

Mixed means a native RGB raster unequal to *every* control raster, including
arbitrarily delayed control frames. Same-index differences alone are not used
as a corruption count. HUD/music now deliberately waits for a new token after
each missed iteration, so timing and transient-image counts can differ from
the spike's late immediate re-entry. This is not an all-visuals improvement.

All four no-injection controls are **pixel-identical to main**,575/575 each;
logical snapshots are identical too. Physical admission frame numbers agree
for every corresponding tick. Capital has no cadence or token-consumption
change. Instruction-clock sampling can move by sub-scanline amounts due to
DMA/interrupt alignment; this is not a claim of zero CPU overhead.

Forced SPACE, capital and HUD/music logical snapshots match their controls.
Boss differs for 3 single/60 repeated logical ticks in shown position/LMS,
laser/hostile position, band-relative projectile X and display-list operands;
no traced score, HP/controller, lifecycle or progression divergence is found.
All cases have zero DLI-order errors, stale L2 events and world/hull mismatch.
[Every injection's recovery and control hashes](recovery.json),
[spike comparison](spike-comparison.json),
[boss changed snapshot addresses](boss-snapshot-differences.json).

Quick registered routes: Spread NORMAL **30,465** cycles (main 30,443,
+22); capital-960 NORMAL **31,153** (main 31,122, +31 including DMA alignment).
Worst 31,153 is 347 below the 31,500 target and1,415 below the 32,568 hard gate.
Both routes have zero misses, extra VBI boundaries and DLI-order errors.
No full native/home matrix, release trace or strict release was run.

## Validation and limitations

Full-suite comparison is **A139/B0/C0** after two justified packed-size pin
updates and a clean rerun of one capture-media isolation race. Main raw totals
are 1,483 PASS/139 FAIL; task raw totals1,481 PASS/142 FAIL, with all three raw
B cases passing focused reruns. No second complete task suite is claimed.
[Exact comparison and corrections](tests-ab.json), [task audit](audit.md).
The [five added baseline failures and their origins](failure-growth.md) are
report-only. They are not repaired by this task.

The remaining mixed rasters are caused by already-started publication and
DLI-relative state, not continuing loop-phase slip. Options beyond this task:

* Keep this tail: 0 additional RAM/residency,22/14 instruction cycles; removes
  persistent slip, retains the measured transient corruption.
* Separately prove coherent PMG/character publication with admission/deferral:
  spike ESTIMATE 80–160 code B, 0–4 state B, 60–160 normal-path cycles; can defer
  before a visible transaction, but cannot undo a stall inside one.
* Separately prototype backing/double publication: unmeasured, requires a new
  byte/cycle/placement proof and more visual state; no claim that it fits.

Only the first option is implemented. No rejected intermediate loop or broader
renderer redesign is included. Real-hardware owner smoke remains necessary.

## Reproduction and delivery

The five `frame-overrun-*` host files and diagnostic launch support are reused
from `a378dc2`; game builds contain no injector. Prepare a private emulator via
`node scripts/frame-overrun-prepare.mjs /path/to/atari800-7.1.2`. Build campaign,
`--level=1:sector=1 --l2-long-capital`, `--level=1:sector=4` and
`--level=1:sector=1`. For each scene (`space`, `capital`, `boss`, `hud-music`),
run `node scripts/frame-overrun-spike.mjs SCENE control`, then `single --forced`
and `repeat --forced`. Run `frame-overrun-analyze.mjs`, then
`phase-resync-verify.mjs` after retaining matching main controls under
`build/phase-resync/main/`. The verification script asserts exact main controls
and absence of persistent slip; it reports rather than asserts the unmet
single-mixed-raster goal. Raw RGB/PCM and playable videos remain under build/;
compressed traces, snapshots, events and hashes are retained alongside this
report. No canonical runtime evidence hash was edited.

Play disks are under `build/play/phase-resync/`; hashes are in `audit.md`.
NEXT TASK: owner smoke/review of this explicitly partial recovery. No merge,
push, release, or broader frame-loop work is authorized automatically.
