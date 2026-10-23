# Citadel gravity colour — OWNER-SMOKE CANDIDATE

2026-10-23; branch `codex/citadel-gravity-color`; baseline game `6dae5a6`.
[As-built plan](../../plans/citadel-gravity-color.md#as-built--owner-smoke-candidate).
[Five ATRs, complete hashes and commands](candidate.json).

M3 replaces M0 for the column. A one-shot Citadel F trampoline normalizes the
remembered capsule type and patches the shared HPOS operand in RAM, then
replaces its own hook with the ordinary gravity-frame jump. Gold follows the
unchanged capsule publisher; green lance readiness still writes COLPM0 only.
The existing shared `boss_m0_*` labels are retained as ABI names; their
publisher's RAM operand is HPOSM3 after Citadel's first hook.

```markdown
| Measurement | Baseline | Candidate |
| --- | ---: | ---: |
| Citadel L4 max / lost-target | 8112 / 8112 | 8112 / 8112 |
| Citadel L5 max / lost-target | 8447 / 8447 | 8447 / 8447 |
| Margin to 8500 at L5 | 53 | 53 |
| Citadel F content | 406 B | 429 B |
| Citadel F free | 106 B | 83 B |
| Citadel F transport | 4 sectors | 4 sectors |
| Shared install | 383/384 B | 383/384 B |
| Window end / reserved tail | $B8FB / 5 B | $B8FB / 5 B |
| DIRECTOR_RAM | 643/645 B | 643/645 B |
| Added recurring CPU | — | 0 cycles |
| First hook overhead | — | 27 cycles once |
| Native Citadel entry | — | 340 host frames, limit 350 |
```

Normal build PASS with the expected stale runtime evidence warning
([log](normal-build.log)). The stress sweep covers 19 modes each at L4 and L5,
including lost-target; zero kill/spawn clashes. [Results](stress.json),
[log](stress.log). Reproduce with:

```
node docs/diagnostics/m6-capsule-stress-fix-2026-10-22/measure.mjs build/citadel-stress.json Citadel
```

[Overlay comparison](overlay-comparison.json): all R1/Spine/Bastion regional
payloads and shared install/C/D/E/lance/page-4 files are byte-identical. No
stress measurements of those bosses. The common slot-A header changes just
the Citadel checksum entry (two bytes); all executable instructions and the
three other entries are identical. [All binary differences](binary-diff.json)
also include generated transport checksums; sizes do not grow outside F.

Focused checks: six existing in-fight gravity tests and the new register/reset
regression test PASS. Five slot-F observer tests PASS. The existing combined
pull test fails at the post-defeat chain, `routine $b49f did not return`, line
236, identically on the baseline: [candidate failure](preexisting-pull-failure.log),
[baseline failure](baseline-pull-failure.log). No production death code changed.
[Passing gravity checks](focused-tests.log), [register/observer checks](register-tests.log).

Short native entry command (one Citadel run, not a full wall trace):

```
node scripts/runtime-wall-trace.mjs --atari800-source=build/atari800-trace --artifacts=build/boss-region-2-level-1-s6 --only-session=observer-smoke --smoke-frames=1000 --active-frames=120 --smoke-difficulty=1
```

119 post-entry frames: maximum wall 28118; no misses, extra VBI, overruns or
DLI errors. The original observer reported two expected one-shot code writes
([unaltered log](entry.log)). The observer descriptors now admit the two exact
STA PCs and their individual hook operand bytes, excluding the initializer
from the normal state range. [Re-evaluation](entry.json) of the same raw watch
passes and verifies each write happened exactly once; [reproducer](check-entry.mjs).
The diagnostic CLI rejects `--reuse-existing-traces` for debug variants, so
the recorded watch was passed directly to its existing clause function.
No second emulator run or release evidence regeneration was performed.

Owner checks:

- In campaign, collect LIFE in the last SPACE sector before Citadel: the well
  is gold from its first visible frame and stays gold when the ship is green
  with lance ready.
- Well shape, position, movement, pull and collision behave as before.
- Booster capsules remain gold; LIFE remains green in SPACE. Capsule behaviour
  is unchanged. Brief death/flash tinting remains owner-accepted.

No merge/push or §BT acceptance before owner OK. Distinct capsule colours are
backlogged after window levers. Earlier STOP probes in this directory are
historical baseline evidence and intentionally retain their original results.
