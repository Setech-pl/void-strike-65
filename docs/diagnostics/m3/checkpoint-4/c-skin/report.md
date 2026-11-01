# M3 final checkpoint4 + separate C-skin — OWNER-SMOKE CANDIDATE

Branch `codex/m3-plan`. Checkpoint2 remains OWNER-ACCEPTED. Checkpoint3
`b52d7ff` and4 `6cb44bc` are independent candidate commits; this following
commit adds C-skin and completes the task audit. **STOP for owner smoke.**
Git writes worked. No push/merge/release/tag or work in the primary checkout.

Approved B keeps all Q5A modes: segment hold-fire, column±one cell,64-frame
volley opportunities, combined. Its131-B preparation helper fits guarded
fighter-only L2; invalid pair/gameplay/fighter phase fails closed to ordinary
fire without touching either checked home. The C fallback was not needed.
Checkpoint4 uses host-only chain expansion into existing validated WaveDefs;
no guest interpreter or queue. Level2 teaches→mirrors→pressures→releases,
20 expanded waves/5 paths; all12 Heavy WaveDefs and level1 source unchanged.

| Home (B) | After3 | After4 | After C-skin | Usable free |
| --- | ---: | ---: | ---: | ---: |
| Content /1,920 | 1,863 | 1,863 | **1,863** | 57 |
| Window /2,811 usable (3,584 physical) | 2,421 | 2,421 | **2,437** | 374 |
| L2 /1,536 usable (+256 protected) | 1,421 | 1,421 | **1,457** | 79 |

C-skin **36 B policy in L2**, **16 B guarded entry in window**, **3 B call in
extension**. Content already has57 B free, below the owner's64-B floor. No
alternative placement was necessary. L2 alias167 B starts$1E0A, ends$1EB1;
79 B to protected$1F00 fence. Extension878 B leaves21, above16-B floor.
C-skin's old policy estimate48 B becomes36 measured. Total M3 window growth
135 B vs≤300 target. Content is8 B above the old1,855-B component estimate,
but57 below the physical ceiling. Arena830, Director high324, initial content
12,865 unchanged. Eleven records,214 total transport sectors,506 ATR sectors
free; no new record. [Full build fields](resources.json).

Four existing payload bytes$ABB3..$ABB6 select Light HP by authored look;
index0/zero inherits archetype. Level2 hunter2/lancer4; default and escort art
inherit. Same weapons/points/renderer and existing HP array; no added state or
spare flag. Boss/invalid phase retains base HP. The existing per-level17-B
heavyLook continues providing one alternate Raider look per level; per-level
shot glyph formats are unchanged. Regional packs remain optional M7 authoring.

Instruction measurement is entry-through-RTS, excluding outer JSR and DMA:
volley helper630, guarded699 = **69 guard overhead per snapshot decision**;
C-skin helper55, guarded95 =40 overhead (+6 for the new outer call). HP runs
only on admission; zero steady-frame/ordinary-row cost. Guard tests poison
both checked homes and require no invalid reads. [Volley](volley-guard.json),
[HP](cpu.json), [source hashes of the frozen full-suite runtime](full-suite-source-hashes.json).

| Native PAL/DMA-on case | Frames | Peak cycles |
| --- | ---: | ---: |
| Spread NORMAL | 1,800 | **30,465** |
| capital-960 NORMAL | 3,967 | **31,156** |
| Three-Light path/volley +combined | 1,800 | **30,207** |
| HP pilot, shooting sweep | 1,400 | **31,052** |

Quick-route delta vs accepted checkpoint2 is0 cycles. All≤32,568, boss entry325;
no missed frames, extra VBI, DLI errors or deadlines. Volley trace includes769
three-Light frames; simultaneous three-shot rises at128(30,019) and832(29,815).
Final HP pilot advances sector4→5 at trace815, score200. Pre-HP final no-fire
pilot proved all10 admissions/release completion at30,649 peak; see parent
[checkpoint4 report](../report.md). Host lives top-up/observer input are explicit
diagnostic allowances, not guest instrumentation or release evidence.
[Spread](quick-spread.json), [960](quick-960.json), [volley](volley-native.json),
[pilot](pilot-native.json). Atari8007.1.2 source tag57d24b1; private build removed.

Normal build/byte gates PASS. The build correctly warns stale release evidence;
no strict release, full native matrix, home matrix or release refresh was run.
One frozen full `npm test` on main8da7c66:1632 PASS/11 FAIL/4 SKIP; task raw:
1649/25/5. Exact file/name/first assertion/message classification rawA11/B14/C0;
all14 are stale expectations of approved memory/payload/compiler-call changes.
They were corrected and complete affected files rerun:128 PASS/0 FAIL/1 optional review SKIP.
**Audited A11/B0/C0**;
1663/11/5 is a projection after the repairs, not a second full-suite run.
[Per-case justifications and exact tuples](tests-ab.json), [main log](main-tests.log),
[task log](candidate-tests.log), [focused policy checks](focused.log),
[repaired complete files](repaired-focused.log). Earlier additional-file run
had2 further stale assertions in the same level-buffer cases; both corrected
and the complete file passes [here](buffer-focused.log). No behavioural failure
was waived. The accepted54 upstream test-debt part2 test/fixture/registry files
were aligned in checkpoint3 before comparison, without merging game sources.

Reconciliation matches11 recorded main unit failures. Its raw nonzero status
identifies14 subsequently repaired pins; zero moved failures. Canonical trace
has0 new/moved and32 old registry entries absent from that unchanged report;
that pre-existing release debt is not cleared by this task. [Log](reconcile.log).
The main11 failures remain recorded in `docs/recorded-test-failures.json`, with
this task's reference in `docs/recorded-gate-failures.json`.

M4 inherits374 usable window B,57 content,79 usable L2 (+256 protected),21
extension,24 reader and a full1,792-B summary reservation. A provisional180-B
window core would leave194, not a compiled promise. Reader's old34-B addition
is10 short; payload tail now1 B. Measure M4 fit before changing placements.
B-shot, independent hues, Bomber skins and Bomber shot re-skin remain DEFER;
M7 owns remaining campaign data/regional convenience packs. No next milestone
implementation is included.

Play pack: `build/play/m3/checkpoint-4/` with six133,136-B ATRs, bilingual
README/checklist and [SHA-256 manifest](play-artifacts.json). `swarm` is the
short pilot, `pilot-no-hp` the independent pre-HP comparison, `volley` the
three-Light diagnostic, `paths` all shapes/exits, `pilot` full level2 and
`campaign` normal level1. Requested ATRs are retained for owner review.
Look for complete no-fire and fast-kill chain passes, mirror/tracking/quiet
segments/column/volley beats, hunter2/lancer4 durability, clean exits and
unchanged Heavy/capital handoff; also pause, death and restart. No3/4 acceptance
is inferred from earlier owner smoke.

Cleanup (`du -sh`): task cache298M→4.0K; whole worktree `.cache`300M→2.3M;
`build`66M→1.7M. `df -h /System/Volumes/Data`:421Gi free (54% used).
Full measurements are in [cleanup.json](cleanup.json). Only task evidence
and requested play ATRs remain; private exports/emulator/cache/raw snapshots
and generated comparison builds are removed. Root node_modules and prior-task
cache/play artifacts remain. All invoked test/native sessions completed;
process enumeration is unavailable in this sandbox. No background server or
listening port was launched.
