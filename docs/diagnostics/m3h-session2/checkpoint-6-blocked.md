# M3-H checkpoint6 — historical byte blocker

**Resolved by owner-approved recovery A.** This report preserves the rejected
trial and the original stop. Current delivery and final measurements are in
[checkpoint-6-final.md](checkpoint-6-final.md).

**Not an owner-smoke candidate.** Owner passed checkpoint2 at `f33fcdc`.
Checkpoints3 `0e4160d`, 4 `d9dce3f`, 5 `2064aa8` are committed candidates.
Checkpoint6 is incomplete. Implementation stops at the explicit AGENTS rule:
“a byte gate overflow”. No merge, push, release or final smoke acceptance.

## Confirmed gap and exact blocker

The existing runway cutoff sets `heavy_departure=1` and clears movement's
`heavy_armoured`. The Raider gate consequently bypasses its HP watch, and
`cc2_heavy_tick` bypasses the Bomber watch while departing. Reproducing a
surviving hit after this cutoff leaves the new visual pending mask at0 on both
profiles. Existing holes persist; a **new** low-HP stage can be missed. This is
an uncovered requirement in the new feature, not a claim of regression on main.

A departure-only C notification was attempted at the surviving-damage boundary.
It preserved departure movement, fire, HP, score and normal watch timing. The
compiler added27 B to the shared C/ASM extension, which has24 free. Main's
dynamically placed `LIGHTFILE` then needs131 B but has128: **3 B short**.

| Measured bound | Restored build | Rejected notification trial |
| --- | ---: | ---: |
| Composite `$8C7D–$8FFF` | 875 /899 B | 902 /899 B |
| Effective `LIGHTFILE` start | `$8F65` | `$8F80` |
| Effective `LIGHTFILE` capacity /ASM bytes | 155 /131 B | 128 /131 B |
| Link result | PASS;24 B free | **overflow3 B** |

The source config's default LIGHTFILE size is replaced from the linked C size;
it is not the effective available capacity. [Rejected function, reproduction
and exact accounting](checkpoint-6-departure-blocker.json). Failed link log:
`.cache/m3h-session2/logs/checkpoint-6-departure-overflow.log`. No runnable
notification-trial artifact existed, so no CPU number is claimed for that trial.

The failed notification is reverted. The restored build is byte-identical to
the ordinary integration captured below (campaign SHA
`838cacb6f8b9b62221ed99dfa7444e5cf1c05782f90c9af70bebc31663628f5e`).
This useful integration remains experimental and retains the gap.

## Bounded recovery choices — estimates, not implemented

| Choice | Player-visible result | Byte placement estimate | Event CPU estimate, excluding DMA | Limits/risk |
| --- | --- | --- | --- | --- |
| **A, recommended: resident C notification helper** | New holes also appear after the cutoff; departure motion stays the same | Replace the two nonlethal returns with calls/tail calls; extension roughly−2..+6 B. Helper20–30 B in appended window: session about210–220 B, within250. No H12/H13 move | About20–45 extra per surviving hit;0 idle/row tick | Verify actual cc65 tail calls/size and all hit paths. No new home-lifetime dependency |
| B: checked-home C notification helper | Same | Extension roughly−2..+6 B; guarded resident entry10–18 B; helper20–30 B in home (891 B currently free) | About50–80 per surviving hit including guard;0 idle/row tick | Must retain A=0/X=0 on invalid entry and prove no home reads after disarm |

These move only a small new C notification decision. H12/H13 stay in the
checked home; neither choice is a stamp-publisher fallback into the window.
Both require measured compilation and rerun validation before candidate status.
Deferring the visible departure gap is **not** assumed accepted.

## Restored integration and measurements

H14 ordinary watches share the already-polled byte: damage bits0/1, death bit7.
C derives stages from current HP, prunes requests, claims/retries; ASM executes
copy/masks/publication. Death clears only bit7 and retains priority; surviving
pending damage is marked deferred. Retries ignore exhausted tokens but never
rotate prediction. Both members coalesce; admission resets copy/stage/retry.
The old H15 damage byte remains reserved. H14's new C stage/claim body uses
the checked home too, keeping resident growth within the accepted target.

| Resource versus owner-cut main `7fe9040` | Restored integration |
| --- | --- |
| Window | **2,258 B, +190**;60 B below250-B growth target;553 usable B free |
| Arena /Director /L2 | **830 /324 /1,290 B**;arena+3,2 free;others unchanged |
| Checked home | **1,029/1,920 B**, +417 =H12 ASM187 +H13 tables24 +H14 C206 |
| Render metadata /H16 | **+8 B**;32-B existing buffer reused;no reservation growth |
| Pickup | **+6 B**,1 free;cached cold boss-head/LIFE pins move6 B and remain checked |
| Total additional used RAM | **624 B**, including code/home/state;no new reserved RAM |
| Records /transport | Record8 **15 sectors (+1)**;others unchanged;total212 (+1) |
| Checked content load | Fixed15 sectors;**313,556 linked CPU cycles**,added0 cycles/0 reads |

The load fixture is synthetic serial-drive NMOS execution, not physical
disk/SIO2SD wall time. Registered routes start at host frame871 versus
checkpoint2's documented863: observed startup+8 host frames; do not attribute
all of that to a single sector or call it added level-load time.

Idle pending entry is **byte-exact LDY/BNE/RTS,12 cycles (+0)**. Body copy
retains−8 cycles. Bomber ramp ticks add3–4 instruction cycles (6–8 per pair).
No new every-frame/row/VBI/DLI poll is added. Valid publisher guard32 cycles;
invalid calls54/61 with0 home reads, including poisoned-home traps on both
publication and live-retry entry. Full live first dual event peaks **2,528
instruction cycles** (including claim/copy/stamp/publication; no DMA), above
the2,400 estimate by128, report-only. Reset E/M/H assault1,844 /armour1,874 /
Bomber2,491, report-only. Death retry521/530 and rotate kill827/859 are reported
against the old520/850 component targets; behavior assertions remain.

## Completed checks and unfinished final validation

* Restored normal gated build PASS; campaign hash matches the captured bytes.
* Focused ordinary Bomber/package/look/breakup/damage set: **60 PASS/0 FAIL**,
  one review-only skip. Actual level2 and Heavy variants **17 PASS/0 FAIL each**.
* [Required quick native routes](checkpoint-6-quick.json): Spread NORMAL
  **30,465**,capital-960 **31,153**;worst hard margin**1,415**,target margin347.
  Zero misses, extra VBI, DLI errors, shifted rows or stale L2 reads;boss entry325.
* [Heavy native proof](checkpoint-6-native-heavy.json): natural2400 frames,
  three lazy copies and six member stamps;peak**30,841**,zero PMG mismatches.
  Seeded dual900 frames sets only HP at560/568;both dual stages publish at562/570,
  ≤2 frames after watches;12 generated-mask writes,zero PMG mismatches,peak30,841.
  Host lives are topped to3;guest instrumentation0. These are Bomber subjects;
  armour has linked E/M/H fixtures, **no native armoured admission claim**.
* The first native setup attempt failed before guest execution because the
  profiler was inserted before initial trace preparation. Repairing that hookup
  and rebuilding the same private emulator cleared it;only passing captures count.
* Updated stale expectations: record8 ceiling14→15 (guard exhausts packed tail),
  breakup byte interpretation1→bit7 (preserves all death assertions), and
  breakup520/850 component assertions→measurements per current AGENTS policy.
  The new hold fixture explicitly paints planes before holding at a seeded Y.
* The continuation full `npm test` was **interrupted**, not completed, when the
  uncovered departure case required a guest fix. Only18 failure names had been
  emitted,all known from main;there is no complete first-assertion inventory.
  **No final A/B/C claim.** No second full run after the hard stop. Previous
  checkpoint2 A137/B0/C0 is historical,not certification of checkpoint6.

Main remains71a38a8;task stays on owner-cut7fe9040 without merge/rebase. The
canonical release ledger/evidence is unchanged. No full native/home matrix,
standalone boss stress, release trace or strict release was requested.

Diagnostic ATRs under `build/play/m3h-session2/checkpoint-6-diagnostic/` retain
the uncovered departure gap. **Do not use them as the final owner-smoke delivery.**
[Exact resources, test scope, guard costs and hashes](checkpoint-6.json).

NEXT TASK: resume with a bounded notification placement, finish checkpoint6,
run final full-suite A/B/C and quick checks, then pause for owner smoke.

## Cleanup and handoff

[Cleanup measurements](cleanup-3-6.json): task cache and worktree `.cache` each
**170M →1.4M** (`du -sh`). Only JSON results, final PNG comparisons and logs
remain there, below200 MB. The clarified owner instruction is followed:
worktree `node_modules` **13M remains**; disposable cache/build/emulator copies
are removed. Fourteen requested checkpoint/diagnostic ATRs remain under
`build/play/m3h-session2/`, **1,863,904 B total**. `dist/` is restored/clean.
Final `df -h /System/Volumes/Data`: **383Gi available**. Own interrupted test
process tree was stopped; no task-created emulator/server process or port is
left running. Other tasks/worktrees/caches were not modified.
