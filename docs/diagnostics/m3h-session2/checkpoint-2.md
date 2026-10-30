# M3-H session 2 — checkpoint 2 owner-smoke candidate

**OWNER-SMOKE CANDIDATE.** Checkpoint 1 is `5041ccb`; checkpoint 2 adds the
armoured look and stops for the owner's first smoke. The owner accepted the
plan/amendments on 2026-10-30 (`c95874e`). Checkpoints3–6 have not begun:
no damage holes, stamp publisher/guard, retry consumer or Bomber ramp change
is enabled yet. Only the owner records gameplay acceptance.

## Change and resource result

Raider remains one archetype with assault/armoured data profiles. C chooses
payload colour; ASM installs a per-formation body source and cached height/
member indices. The default plated look is editable in
`assets/graphics/enemy-roster.json`, and level 2 explicitly authors
`payload.heavyLook`. Its 14 binary rows, 2 cleared storage rows and colour occupy
17 of 22 reserved payload bytes at `$ABA2`; 5 remain. Original assault and
Bomber source bodies, collision bounds, movement, weapons, score and PMG
ownership are unchanged. [Source-derived comparison](checkpoint-2-looks.png)
shows assault on the left and armour on the right; it is not a native raster.

The eight-byte render state includes appearance/copy flags at `$54C3`:
bit 5 latches the visual profile through the existing runway movement cutoff;
bit 0 is the future damage-copy-valid bit. The native observer uses this stable
appearance and the payload to predict rows independently of the draw operand.
This avoids mistaking a correct departing armoured body for a stale sprite
after the Director clears its movement armour flag.

MEASURED versus owner-cut main `7fe9040`:

| Resource | Before →checkpoint 2 | Delta |
| --- | --- | ---: |
| Resident window | 2,068→**2,153 B**;658 usable B free | **+85 B**, session target ≤250;165 B target allowance remains |
| Arena /Director /L2 | 827 /324 /1,290 B | 0 |
| Render state | `$54BE–$54C5` | +8 B; 30 B tail remains |
| Checked content home | **612 /1,920 B** | 0;1,308 B free |
| Content record | sectors265–279, **15 sectors**,1,920 B transported | 0 |
| Initial content /transport | 12,865 B /211 sectors | 0; all 11 record sector counts unchanged |

Total extra used RAM is 93 B: 85 resident code and 8 state, within existing
reservations. Record 8 packs 1,762/1,771 B, 9 B slack; the next increment may
need another sector even when the 250-B window target fits. No H12/H13 bytes
were placed in the window. Their home and validity/phase-guarded entry remain
mandatory later; an unworkable entry/lifetime must STOP with numbers before
any window fallback.

The checked content-load fixture measures **313,556 CPU cycles and 15 identical
sector reads on main and task: added 0 cycles/0 reads**. L2, reader and content
images are byte-identical. This is a linked NMOS serial-drive fixture, not a
measurement of physical disk/SIO2SD wall time. Both registered native routes
also reach the same first gameplay host frame 863 and initial master-clock
position as their branch baseline. The content-home growth/load-time report
must be refreshed when H12/H13 are actually installed.

Body publication saves **8 cycles per copy** and adds 0 on stationary frames.
No new per-row or per-frame poll runs. Admission cost versus session 1 main:
**+159 cycles** assault/Bomber, **+187** armoured; measured resets E/M/H are
1,834 /1,864 /2,479. The combined Phase 0+150 component target is exceeded by
72/102/84 respectively; these are report-only under current AGENTS policy.
There is no new VBI/DLI work. [Exact resources, hashes and measurements](checkpoint-2.json).

## Validation and comparison

Normal build and computed byte/startup gates PASS; full level 2, direct Heavy
and960-capital variants build. Release evidence remains stale/pending and
strict release will fail. No release evidence, full native/home matrix or
standalone boss-stress run was commissioned.

Final registered native quick routes: **Spread NORMAL 30,465** and
**capital-960 NORMAL 31,153**. Worst 31,153, target margin 347, hard margin**1,415**;
zero misses, extra VBI boundaries, DLI errors, shifted rows or stale L2 reads.
Capital-960 boss entry 325 host frames. Captures bind the final guest bytes.

Final focused set: **127 PASS /11 exact shared FAIL of 138**, all matching main
by file/name/first assertion/message. Dedicated linked look tests pass 5/5
on each of the actual level 2 and Heavy-sector build variants. These cover
both PMG planes, full flight, clipping, authored holds, surviving-hit dodge,
retirement, repeated admission, profile/colour reset, all difficulties and
escort-loop bits; they compare the real old/new NMOS renderer, not a model.
The repaired SIO/audio fixture passes 7/7, including real-SIO boot through
START GAME and async-receive cleanup. [Focused audit](checkpoint-2-focused.json).

One full `npm test`: raw **1,488 PASS /140 FAIL of1,628**. Audited after the
allowed focused corrections: **1,491 PASS /137 shared FAIL**. No second full
suite is claimed. The full run preceded the final 3-B appearance latch and
host observer follow-up; all affected paths have final focused/native proof.
The payload art SHA was the sole task-specific stale pin and is re-pinned
with the explicit owner decision; the protected remainder stays checked.
Two old SIO failures were private emulator setup defects: the SIO header does
not implement optional L2/frame-profiler wrappers. Strip those hooks only in
the separate SIO fixture, compile once, then rerun the two test files
sequentially; both now pass. Game/native-emulator code was not changed by
that fixture repair. [Exact A/B/C tuples and corrections](checkpoint-2-tests-ab.json).

**Main moved concurrently to `71a38a8` (Spine B3).** This task stays based on
`7fe9040`; no merge/rebase/switch was performed. The merged-main full test
inventory is reusable because its tested `96cbf6d` runtime/test/build/asset
trees are identical to `71a38a8`. Against that advanced main: **A137/B0/C0**.
Against the original 139-failure branch baseline, the two cleared SIO cases
are setup repairs, not gameplay improvements. Spine code/art is not imported
into this task; owner integration is needed before a fast-forward merge.
The advanced-main evidence reports only a 30-B boss-F segment change, outside
these Heavy homes. Its source/evidence commit and path are in the A/B/C JSON.

Legacy canonical reconciliation remains nonzero; its old unit registry and
32 disappeared trace predicates are not repaired here. Current shared debt
is recorded without changing canonical release predicates or the unit registry.

Extra bounded level 2 joystick captures pass timing/plane-integrity checks
(2,400-frame hunt peak 30,766;1,800-frame held-Spread fixture peak 30,501).
They do **not** establish native armoured coverage: no 2-HP Raider admission
was observed before those replay limits. New-armour coverage is the explicit
linked variant fixtures and the pending owner smoke. No no-subject boss,
lance or slot-F clause is presented as a boss proof. Original source/profile
selection is independently checked; no renderer-operand reading can mask a
bad body-pointer install.

## Owner smoke and launch

Keep the ATR mounted through menu returns. Use the installed Atari800 and
mount the disk as D1 (never `-run`):

```sh
atari800 -xl -pal -nopatch -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-m3h-s2/build/play/m3h-session2/checkpoint-2/level-2.atr
atari800 -xl -pal -nopatch -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-m3h-s2/build/play/m3h-session2/checkpoint-2/heavy-sector.atr
```

The shortcut starts level 2 sector6 (zero-based sector5), with assault waves
first and armoured waves later. Clear the Bomber waves to reach the armoured
ones. Check that the two silhouettes are distinct at a glance, both remain
hostile, both planes stay whole through motion/hold/dodge, and later assault
formations recover their original art/colour. Campaign confirms unchanged
level 1 assault art. Holes and the new Bomber ramp are for the final smoke after 6.

| ATR under `build/play/m3h-session2/checkpoint-2/` | SHA-256 |
| --- | --- |
| campaign.atr | `8d2ba90a9e2447698aad03c65f1be3ce03cf1cfda4ebd966148c23be87897da5` |
| level-2.atr | `d2b06a8b2c0db948b272afbdc78a50f9aad0dd6cdc8b2c602c7c969a01cca9fb` |
| heavy-sector.atr | `0ca4466233ef9246398e2e912e62403e0fbfd35e0054694bd3963b40b77ce297` |
| capital-960.atr | `93a81cf5496bda9b5d3406b5708c7f59e6621a8c759c38da36ca6f278eef1f39` |

Each ATR is 133,136 B. Checkpoint 1 retains its separate requested play ATRs.
The final disks are uninstrumented. Native/SIO observers exist only in host
emulators. Build/fixture details and source preview rebuild are in
`docs/level-authoring.md`, the committed measurement helper and the cache
evidence logs. [Cleanup measurements](cleanup.json): task cache and worktree
`.cache` both **217M→704K** (`du -sh`); the shared task-cache directory was not
used. Final `df -h /System/Volumes/Data` reports **408Gi available**. Only JSON
results, comparison PNG and logs remain in `.cache/m3h-session2/evidence/`.
Disposable build/emulator/node_modules copies were removed; rebuilding starts
with `npm ci`. The six explicitly requested checkpoint1/2 ATRs remain under
`build/play/m3h-session2/` (798,816 B total;792K allocated), as owner-review
deliverables. No task-created process or listening port remains; other tasks'
worktrees, caches and user processes were not touched. No200-MB exception is
needed.

Confirmed regressions: none in task coverage. Remaining limitations: shared
unit/release debt, native armoured subject absent from bounded replays,
concurrent-main integration, and real hardware visual smoke pending.
Optional art polish is the owner's judgment after playing.

**NEXT TASK: owner checkpoint 2 smoke. STOP; do not start checkpoint 3 until the
owner resumes.**
