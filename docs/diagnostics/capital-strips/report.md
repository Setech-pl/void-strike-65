# Session-finish smoke repair — OWNER-SMOKE CANDIDATE

Owner rejected `77cbfd1` after level-2 capital entry. Checkpoint-6 visuals
`3468204` remain owner-accepted. This repair awaits a new owner smoke.

## Attribution first

All three requested revisions ran the authored level-2 route from its beginning
on native Atari800 PAL, MEDIUM, the same `l2-matrix` ordinary joystick policy,
with lives held at 3 solely for repeatable survival. No enemy, phase, departure,
position or admission fixture writes. Initial probes ran 10,000 iterations;
the detailed screen-write/oracle replays run 4,200. Main is `71a38a8` (includes
shot-solid-impact and phase-resync). These are synthetic input replays, not a
claim to have recovered the owner's recording's exact joystick stream.

| Build | Strips | First wrong corridor hull write |
| --- | --- | --- |
| main `71a38a8` | absent | none |
| `3468204` | absent | none |
| `77cbfd1` | reproduced | trace frame **2357**, active-gameplay **2333**, host **3228** |
| repaired | absent | none |

Trace frame is the observer's zero-based simulation iteration. The first
corruption is earlier: trace **2088**, host **2959**, active-gameplay **2064**.
`light_publish`'s `@cell` store at **$37AF**, `STA (dst_ptr),Y`, publishes
Wingman glyphs **$F8/$F9 into $8586/$8587**, inside `PLAYFIELD_ROW_LO`.
The left-departing Bomber takes its escort below HPOS48. The C escort policy
clamps only its upper X edge; the renderer subtracts48 unsigned, producing
column **54** for Light X8: unsigned (8−48)/4 is54. Its two-cell write
runs beyond its last physical ring row into the pointer table.
The corrupted low byte $F9 then propagates through normal row rotation.
At trace2117 the divider copier first uses a misaligned ring destination.
At trace2357 that copier's **$5700 `STA (dst_ptr),Y`** copies authored hull
bytes into corridor columns: e.g. **$851A=$CA**, where the independent authored
terrain is space. The strip then persists in ring RAM and scrolls with it.

This is a departure/escort interaction introduced by allowing the leader outside
its old X envelope. It is **not** a scratch/ZP clobber by the terminal erase,
not a turret-shot backing change, and not main's defect. The pre-existing
missing lower clamp was unreachable on this route before sideways departure.
No main-only defect is repaired here.

## Repair and speed

`src/c/lifecycle.c` clamps the escort's derived X to **48..200**, matching the
existing upper clamp and two-cell character renderer's addressable span.
No renderer, shot, backing, PMG allocation or scheduler code changes.
The exhausted left escort remains at the edge and follows the existing
leader-loss descent/retirement policy.

Bomber departure averages **3 native raster pixels/frame**. Atari HPOS is
quantized to two raster pixels, so the deterministic steps alternate **1/2
HPOS (2/4 raster pixels)** on the existing frame parity. No new state.
Exhaustive linked checks cover2,322 exits across every legal spawn X, both
members, three Y positions and all difficulties: **maximum75 frames**.
Full erase, held Y, no firing, damage/hole publication and scoring remain intact.
The linked admission invariant remains **two fully Heavy-free frames**, including
counter wrap. The full MEDIUM level-2 replay has **229 fully Heavy-free frames**:
last Heavy trace2107/active2083, capital admission trace2337/active2313.
229 is the observed route window; two is the general enforced minimum.

## Native proof

`check-writes.py` reconstructs terrain from authored row publishers, blank
publication, the authored turret/muzzle/flash cells, and an **independent
canonical ring-row order**. Actor restores cannot author terrain. This matters:
using the corrupted guest row table as the oracle would bless the strips.
It checks every corridor column8..31 on every completed observed frame during
and after capital entry, including the post-capital return. Islands are included
in the authored row bytes. Higher layers may cover terrain, but a visible hull
code must equal the authored cell, including the correct inverse/colour byte.
It also catches writes of misaligned low bytes to the row table.

Each detailed replay checks **1,864 frames** of capital and subsequent gameplay.
Main/checkpoint6/repaired: **zero invalid frames, zero bad row-pointer writes**.
The failed revision is a positive control and fails the same oracle.
`--assert` refuses missing capital coverage or any corruption.

`compare-erases.py` compares every capital-shell restore tuple (frame, writer
PC, destination, byte, X, Y). **All1,208 repaired stores are byte-exact versus
checkpoint6**, and main matches too. Failed77cbfd1 differs first at trace2454:
the first restored address is$8505 instead of$8444. No turret erase workaround
was needed. The tuple hashes and full results are in the JSON evidence.

## Gates and resources

Normal gated campaign/level2/Heavy-shortcut builds pass. Normal runtime evidence
is pending as designed; release build will fail until that separate evidence is
refreshed. This is not a milestone or release claim.

| Resource versus failed77cbfd1 | Before → repaired |
| --- | --- |
| Resident window | 2290 →2302 B; session growth234/250 B |
| Checked content home | 1097 →1123/1920 B |
| Arena / L2 / Director | 830 /1290 /324 B, unchanged |
| New persistent state / reserved ranges | 0 / unchanged |
| Transport | 213 sectors, unchanged |

Linked NMOS instruction measurements: escort tick **+9 cycles** at in-range X,
**+14** when the new lower clamp applies. Representative single-member Bomber
updates versus77cbfd1: moving left/right **+19/+23**, terminal **+18/+19**.
These exclude ANTIC DMA; native whole-frame peaks below include it.

Quick registered routes: Spread NORMAL **30,465**; capital-960 NORMAL
**31,153** (3967 frames, boss entry325). Worst is **1,415 cycles below32,568**,
unchanged versus77cbfd1. The separate full level2 replay peaks at31,170
(also identical on all three attribution builds). Zero missed frames, extra VBI, DLI errors, shifted
phases or stale L2 events on those registered checks.

Validation audit: the full test suite deletes/rebuilds debug-route directories.
An overlapping level2 native wrapper lost its output directory at completion;
its journal remained intact, but the final accepted capture was rerun in an
isolated export. An initial direct960 harness invocation omitted ownership/
loader observation setup and counted the325-frame disk handoff as one frame.
It is discarded; the registered `frame-peak-native.mjs` route, with ownership
images and lifetime observer, passes. Neither discarded harness run is claimed
as a gameplay timing pass. No production workaround was made for these setups.

One fresh full `npm test` per side: main **1483 PASS/137 FAIL/3 SKIP**;
raw candidate **1510 PASS/139 FAIL/4 SKIP**. Two self-resolved checks:

- Generated map: refreshed after the final linked layout; focused3/3 PASS.
- Light source contract: its whole-file ALTERNATE regex matched only the Heavy
  speed comment. Reworded that comment; no emitted bytes changed; focused1/1 PASS.

Audited candidate **1512 PASS/137 FAIL/4 SKIP**, **A137/B0/C0**, matched by
file/name/first assertion/message. Full focused Heavy/map group25 PASS/0 FAIL/
1 review-only SKIP; exhaustive escort regression1/1 PASS. Three other optional
emulator-source skips match main; no skip is claimed as PASS. Shared137-tuple
debt is recorded in `recorded-gate-failures.json`; canonical legacy reconciliation
still exits nonzero (the raw log also retains the two corrected failures).
No second full suite was run. Exact tuples and correction proofs: `tests-ab.json`.

The generated memory map is refreshed; reserved addresses did not change.

## Delivery and reproduction

Rebuilt play ATRs are under `build/play/m3h-session2/session-finish/`:
campaign, level-2 and heavy-sector. Exact SHA-256s are in `delivery.json`.

For the native terrain proof, build the selected revision with `--level=2` in
an isolated export, use its matching trace header with the read-only
`DFSTRIPS_OUTPUT` journal, and run4200 MEDIUM frames with `VS65_L2_POLICY=l2-matrix`
and `DFTRACE_HOLD_PLAYER_LIVES=3`. Pass the linked directory and journal to
`check-writes.py ... --assert`; compare the checkpoint6/current journals with
`compare-erases.py ... --assert`. These tools require no guest patches.

Raw native write journals are retained as `.log` files in the task cache.
Owner smoke is the next task. No owner acceptance, merge, push, release or tag.


## Cleanup and handoff

Branch: `codex/m3h-session2`, continuing failed77cbfd1. The local repair commit
contains this audit; only the owner may record smoke acceptance.

Task cache **716M →49M**; complete worktree `.cache` **720M →53M** (`du -sh`).
`df -h /System/Volumes/Data`: **372Gi free**, after cleanup. Only MD/JSON/native
and test logs remain in `.cache/capital-strips/evidence/`; all exports, generated
builds, emulator copies and intermediate captures are removed. Other task caches
were untouched. Worktree node_modules, existing play ATRs and the three rebuilt
session-finish ATRs remain. Tracked dist is restored clean. No owned emulator,
test, server or listener remains. Exact measurements: `cleanup.json`.

The saved proof can be rerun without rebuilding:

```sh
python3 docs/diagnostics/capital-strips/check-writes.py .cache/capital-strips/evidence/fixed-labels.json .cache/capital-strips/evidence/fixed-writes.log --assert
python3 docs/diagnostics/capital-strips/compare-erases.py .cache/capital-strips/evidence/checkpoint6-labels.json .cache/capital-strips/evidence/checkpoint6-writes.log .cache/capital-strips/evidence/fixed-labels.json .cache/capital-strips/evidence/fixed-writes.log --assert
node docs/diagnostics/capital-strips/audit-tests.mjs
```

**NEXT TASK: owner smoke; STOP.**
