# L2 Phase B recovery — OWNER-SMOKE CANDIDATE

The old `BLOCKED_FOCUSED_PAL_ACCEPTANCE` is resolved. Guest bytes measured here
are the `2af5b6d` implementation; subsequent C comment and author-validation
changes produce byte-identical game artifacts. This is a normal-build candidate,
not owner acceptance or release evidence. Final build HEAD, six ATR paths and
SHA-256 values are recorded by `build/l2-owner-smoke/candidate.json`.
The committed [expected hashes](candidate-hashes.json) bind the final rebuilds
to the exact measured images; `scripts/l2-owner-candidate.mjs` requires equality.

## Diagnosis and repair

The boss re-enters the **shared main loop**. The original L2 integration left
its unconditional `JSR $1909` at `$5EEF` armed and read the cached scroll rate
from overwritten `$1918`. Both 480 and 960 failed, so this was a guest lifetime
defect, not a longer-axis fault or an observer-only failure.

| HARD handoff capture | Before peak / misses / DLI errors | Repaired peak / misses / DLI errors |
| --- | --- | --- |
| clean main `19b1464`, 480 | 31,417 / 0 / 0 | 31,417 / 0 / 0 |
| L2, 480 | 39,884 / 2,976 / 8,924 | 31,567 / 0 / 0 |
| L2, 960 | 39,437 / 1,285 / 3,852 | 31,586 / 0 / 0 |

The final comparison uses the same 5,500-frame window and row-normalised
joystick policy in all three builds, through capital, drain and the first
boss-fight seconds. `isolation.json` and `*-after-5500.json` hold that table.
The earlier `*-after.json` captures additionally stop at exactly300 boss-loop
entries; the parser requires that exact endpoint. Native
install/disk time is separately marked and excluded from gameplay timing.
See `*-before.json`, `*-after.json` and `l2-*-lifetime.jsonl`.

**Direct address answer:** yes, all three builds fetch instructions from
`$1900-$1FFF` after boss reads begin. These are legitimate installed boss slot-D
instructions (first captured entry `$1E71`, from install `$7889`). The L2 builds
also previously entered `$1909` from resident `$5EEF`; those are stale L2 calls.
The repaired captures have **zero stale entries and zero old-rate reads**.
The L2 diagnostic lives fixture now preserves earned lives instead of lowering
them to its floor; the strict HUD equality assertion is retained. This removes
a control-only fixture failure, independently of the guest repair.
A literal ban on every fetch in that range would reject the accepted boss/death
architecture. The permanent check is explicitly image/phase-aware; it does not
hide valid boss execution by pretending the address range is unused.

Repair: **19 B cold code + 1 B cached rate** reuse the pinned C-phase padding.
`l2_disarm=$8656` first calls the existing blanker, then rewrites the shared
brake JSR to resident `integration_update_enemy=$3114` and zeros the resident
rate `$86B4`. It runs before the first boss read. Capital state is already
FIGHTER and BOSS_DUE has been consumed; install replaces the capital vectors
before returning to gameplay. INIT after the next successful checked L2 read
alone re-arms the JSR. It adds **16 B cold L2 code**, with all existing hot L2
addresses retained. Cost: **+30 CPU once at disarm, +15 CPU to INIT**; **zero
new gameplay-frame cycles and zero new page crossings** for this repair.

| Potential route into L2 | Lifetime closure |
| --- | --- |
| Brake, main `$5EEF` | Atomically redirected to resident code after blanking |
| Cached rate reads, `$564E` / `$69D7` | Always resident `$86B4`; zero through boss/death/menu |
| Draw `$1903`, commit `$1915`, contact `$1906`, warning `$190C` | Capital-only call paths; state drained to FIGHTER, no frame work during reads, then boss vectors replace publication/contact/update paths |
| Phase `$190F`, enter `$1912` | Resident sector policy only; capital admission consumed; boss UPDATE/SCROLL/PREPARE vectors replace capital work |
| VBI/DLI/audio | No L2 callback or L2 data dependency; installed boss handlers legitimately use slot D |
| Light/shared Director spawn | No L2 callback; shared debris-mask change has no module dependency |
| Checked INIT `$1900` | Summary calls only after full run validation, including resident level hits |

DRAIN is universal row **968**, prow **928-959**. Both clock bytes participate;
phase/index checks cover byte boundaries and reject indices outside **0-119**.
The boss predictor uses the resident rate.
`director-clock.json` checks every admitted Director tick against its 16-bit
counter. The unchanged `integration_director_world_row` deliberately freezes
Director progression while DYING/GAME OVER even as the world scrolls; all
observed offsets are those existing freezes, with zero unexplained row loss. The 960 axis does not change the
admission/drained-playfield predicate. All native routes reach 968 without a
premature drain, and all world/hull residues agree.

## Current measurements

`matrix-results.json` and `matrix-results.md`: **12 full routes, 47,326 gameplay
frames**, both lengths, all difficulties, flight/contact and brake/contact.
Peak **31,598**, minimum fence **4,892**, zero misses/extra VBI/DLI anomalies,
zero shifted frames or distinct fence misses. Ten frames exceed the **31,500
target**, by at most **98**; none exceed the **32,568 hard** gate. Physical PAL
remains **35,568**. Every route records central island displacement; all 82 native capital damage
frames publish the 25-frame cooldown.
All routes retain SPACE debris and have zero stale player/enemy projectile
cells. Full raw captures remain under `build/l2-native-matrix/` and each
variant's `runtime-wall-trace/`; `scripts/l2-native-matrix.mjs` reproduces them.

[Full matrix](matrix-results.md). Native clock ranges are 16, 18, 20 unbraked
and every integer 8-16 / 9-18 / 10-20 braked. Warning reaches 35 on every route.
The exact unit checks cover the 8/9/10-frame ramps and Y=200/201 boundary.

| CPU-only routine bound | MEASURED cycles | Artifact |
| --- | ---: | --- |
| Shared hull + island row | 1,939 | focused tests |
| Contact including canonical damage | 1,267 | focused tests |
| C brake policy | 101 | focused tests |
| C warning policy | 30 | focused tests |
| C phase policy | 105 | focused tests |
| Cold coordinate/lookup entry | 3,464 | focused tests |
| Cold INIT/re-arm | 30 | lifetime tests |

Backing: **1,640 cases**, both faction underlays, normal/Spread/hostile shots,
shells, cache hit/miss, ring reuse and full-width fallback. Worst carried-in
debris clears after **47 rows**, before first island **96**, at every normal
and half rate. Protected snapshots also cover L2's reserved `$1F00-$1FFF`.

Boss entry **325/340/340/344** frames, each ≤350. Required off/fire stress:
Citadel L4 **7697/8060**, L5 **8032/8423**; Spine L7 **7771/8180**, L9
**8025/8435**; Bastion L10 **8058/8467**. Deltas **0**, no clashes. Current
worst-state checks retain **7596 / 8112 / 8447 / 8191 / 8446 / 8478**. R1 runs
all 18 modes; the other regions run off/fire/lost plus prior-worst swap where
needed. No claim of an all-18-mode resweep for every region.

Native death → summary → menu → checked reload passes all four regions.
`r*-l2-lifetime.jsonl.lifetime.jsonl` records the real reader body as well as
its ABI vector, and verifies the complete L2 image checksum before INIT.
There are no stale resident L2 entries/reads between first boss read and reload.
Death peaks **29535/29360/29532/29537**, zero timing/image/HUD/ship/SIO errors.
Native boss pause/resume: **499 measured frames**, peak **27,703**, no anomalies.
Focused frontend/pause checks: **29/29**. Cold/RESET boot smoke: four cold
starts, RESET, 130XE compatibility and forced capital restore PASS.

| Read + completed INIT work, against main | Patched SIO | Standard SIO |
| --- | ---: | ---: |
| Cold | 49 → 113, **+64 frames** | 49 → 113, **+64** |
| Post-boss | 49 → 114, **+65 frames** | 49 → 114, **+65** |
| Visible level-start interval, cold | **+0** | **+0** |
| Visible level-start interval, post-boss | **+54** | **+54** |

`load-timing.json` records entry, completion and visible-start host frames.
Cold boot itself adds **1 patched / 5 standard frames** for one extra boot
transport sector; this is separate from level-start work. Input-ready menu is
**599 patched / 1389 standard**; entry-to-input delay **42 ≤50**. Menu run bytes
are unchanged. Raw read counters require all 14 L2 sectors, without retries;
boot smoke now also verifies the full L2 checksum rather than only counting it.
The cold timing observer rejects the transient stage-2/start-gameplay PC alias.

## Protected ranges and resources

[Resources](resources.json), [page table](l2-final-page-cross.md), and four
native `*.writers.json` files retain every observed writer with phase/frame.
No writer-inventory overflow. No L2 publisher/contact writes protected bytes.

| Range | Observed permitted owners; no new allocation |
| --- | --- |
| Menu `$0C00-$117F` | ROM/boot; checked reader; boss/death low-RAM owners in their phases |
| Summary `$0500-$0BFF` | ROM/boot splash and loader; checked summary load; existing summary state/self-modification |
| MAIN `$3615-$3AEE` | ROM/boot unpack; existing guard state, vector install/restore, LIFE state/colour; layout unchanged |
| M3-H `$549E-$54BD` | Boot initialisation only; zero runtime use |
| `$B8FB-$B8FF` | OS RAM initialisation only; zero game-runtime use |
| L2 reserve `$1F00-$1FFF` | Zero allocation; untouched by focused L2 row/contact work; boss/death own it in their phases |

L2 **1,063/1,792 B**, **729 B** free, with **256 B** reserve intact and **473 B**
otherwise available. First contents are **3.81%** above the 1,024 planning
budget, below its 1,228-B integer gate. The future **ESTIMATE 352-B dock +
128-B bonus** now needs **7 B** more than 473; shrink/reprice or move cold work
at that later task. No reserve is borrowed. Resident C sector remains 241/248;
**75 B** of pinned padding are reclaimable after the 20-B lifetime repair.
Summary remains **1792/1792**, an explicit M4 next-loop/grade-screen risk.

Every edited test: `boss-claim`, `boss-runtime`, `sector-reader`, `level-compiler`,
`l2-coordinate`, `l2-islands`, `l2-brake`, `l2-lifetime` (all `.test.mjs`). Exact
16-sector/full-image assertions replace stale 13-sector fixture bounds;
post-boss checks additionally require the complete L2 image and re-armed hook.
Corrupt reads require **zero partial-L2 instruction fetches**. No assertion is
weakened. Recipe endpoints reject fractional/nonnumeric values before packing.

No full npm test, release wall-trace refresh, stage-2, reconciliation, release
build, package or showcase was run. The normal stale-evidence warning remains;
release readiness is not claimed. Owner hardware smoke is the next gate.
