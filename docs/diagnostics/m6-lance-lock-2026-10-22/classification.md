# Citadel L5 lost-target arrival — classification (2026-10-22)

**Regression in `b2261c907bcf4b1d88aa4f43cf3306819c597689`.**
The same reachable case measures **8,444 -> 8,563 cycles (+119)**.
Stage 1b did cover it; this is not a missing stage 1b scenario.

| Checkpoint | Cycles | Evidence |
| --- | ---: | --- |
| `35499ba`, stage 1b | 8,444 | `citadel-l5-lost-35499ba.json` |
| `b2261c9`, stage 2 implementation | 8,563 | `citadel-l5-lost-b2261c9.json` |
| `fea4cc8`, merged main | 8,563 | `main-stress.log`, `result.json` |
| `d165927`, §BO implementation | 8,563 | `result.json` |

Both new measurements used a temporary detached worktree, each revision's
candidate build and its own unchanged harness. Invocation:
`regionFourStress({level:bossLevel(4,1), maxMeetings:2, lance:"lost"})`.
The returned cases were matched by warn, p=32, dead=[5,1], hit=[0,4],
mode=kill, k=2, finale=false, wellOn=true; the resulting worst frame is 1,
gun 9, countdown, spawned/stepped true, clashes 0, reachable. The JSON files
retain the matched case and the worst case. No game code or harness changed.

Only `b2261c9` changes runtime code between stage 1b and `fea4cc8`:
`83f6ec2` is plans/design; `ffad1e0` diagnostic files; `acb2609` documentation;
`fea4cc8` merges that series. Thus two historical builds/measurements suffice;
rebuilding those documentation-only revisions would repeat identical inputs.

**Likely cause:** stage 2 routes `weapon_pickup_spawn_capsule_at` through
`LIFE_CAPSULE_PICK` / `life_c_pick`. `boss_capsule_kill` calls that shared
spawn path, so boss kill frames can pay the new selection cost even though
boss code is unchanged. The exact instruction-level attribution was not
measured; the commit and the +119-cycle regression are measured.

## Other already available lost-target measurements

| Scenario | Stage 1b recorded | Fresh main `fea4cc8` | §BO if measured |
| --- | ---: | ---: | ---: |
| R1 | 7,565 | 7,684 | 7,684 |
| Citadel L4 | 8,109 | 8,228 | — |
| Spine L7 | 8,186 | 8,186 | — |
| Spine L9 | 8,440 | 8,440 | — |
| Bastion L10 | 8,473 | 8,473 | — |

Stage 1b's `m6-gauges.md` table explicitly includes each lost-target state.
There is no evidence here of another uncovered lost-target scenario. R1 and
Citadel show the same +119 increase; Spine and Bastion match their recorded
figures. No new full four-region certification was run.

## Owner disposition

On 2026-10-22 the owner decided this pre-existing overrun does not block the
§BO owner-smoke candidate and must not be fixed on this branch. Pending smoke
acceptance, it becomes known debt: Citadel L5 lost-target arrival 8,563 > 8,500
(+63), present on main since `b2261c9` (merged in `fea4cc8`), not caused by §BO;
fix separately before the window levers; release blocked until fixed.
Historical `result.json` retains the earlier blocked checkpoint accurately;
this classification supersedes its disposition, not its measurements.
