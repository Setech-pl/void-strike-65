# M3 regional-skin planning audit — 2026-10-31

Planning only, branch `codex/m3-plan`, task-start HEAD `b161f92`, task-start
main `6046c0b6beb25f15c53ca15cda8f39a431983cd3`.
[Deliverable §7](../../plans/m3-waves.md#7-enemy-variants-regional-skins),
[accepted Q1–Q6A decisions](../../decisions/2026-10-31-m3-waves.md).
No implementation, new art, new dependency, branch switch, merge, rebase,
push, tag or release. No subagents. All execution stayed in this worktree;
no primary-checkout build, execution or file edit.

## Storage and execution measurements

`npm test` performs a fresh normal gated build before the suite. Computed
gates PASS. Fresh ATR SHA-256 is
`e777080b16f95c29d0da9fff16f0f444c3790a91ef87e4fac178c3908a24ef3a`,
boot SHA-256
`197d0abb4d0eddbcf36740ef1d31dacaaa569a875fe470fe5ab29568989a6d3f`.
Both equal the preceding planning baseline exactly. Runtime release evidence
remains pending; the normal build warns that release build will fail.

[Measurements](storage-measurements.json) include fresh resource fields,
resident byte addresses/hashes, decoded roster HP, both compiled level
payloads and output glyph bytes/hashes. Method:

1. Read current linked labels from main, Director, integration and Light
   kernel outputs; install linked segments with `installRuntimeSegments`.
2. Compile current level 1/2 through `compileLevelFile` and put their core,
   payload and geometry in the same runtime image addresses as the loader.
3. Run existing Light kernel `@install` →`@alive` for each pair 0–2 and keys
  12/24/`$90`/`$A0`/`$B0`. Check all 16 output bytes against the selected
   resident/payload source. Result:375/376/391 CPU cycles, respectively.
4. Run existing `build_hostile_weapon_glyphs` to RTS with current level 1/2
   payloads. Result:957/1529 cycles, no caller JSR; capture all eight used
   glyphs. Invalid-core defaults-only control costs 911 cycles.
5. Decode the current 48-B archetype table: Raider 1, Wingman 1, Interceptor 3,
   Bomber 4. Heavy admission additionally owns its existing difficulty/profile
   HP policy; the plan does not confuse this table with armoured Raider HP.

This is NMOS instruction execution without DMA, interrupts, waits or a new
M3 prototype. Only existing code ran; no runtime memory patch implements a
proposed feature. The plan separates these MEASURED costs from estimates.

Current four-region hull mapping is over 16 directory slots, while the boss
and accepted campaign recipes use 12 levels. The plan prices host-side region
alignment in M4 and keeps directory capacity separate. Light/shot palettes
are shared playfield registers, unlike Raider PMG colour. The five spare
payload bytes are explicitly allocated as alternatives, never overlapped.

No native routes were rerun: storage/CPU inspection does not modify gameplay,
rendering or scheduler inputs, and fresh ATR/boot hashes are identical to
the prior two-route captures. The referenced quick baselines remain Spread
30,465 /capital-96031,153 (worst hard margin 1,415), **not fresh measurements
from this extension**. [Prior native evidence](../m3-plan/quick-summary.json).
No full native/home matrix, separate boss stress, boot gauntlet, release
trace or strict release. Existing boss stress tests inside `npm test` were
not an additional stress workflow.

## Tests, pinned baseline and main advancing

One fresh full `npm test`: **1,512 PASS /137 FAIL /4 SKIP of 1,653**,
duration 913,140 ms. **A137/B0/C0 against task-start main `6046c0b`**, by
file/test/first assertion/first message; all 137 match the prior inventory
exactly, no new/moved/cleared tuples. [Exact comparison](tests-ab.json).
This is a source-identity comparison, not two independently executed suites:

```sh
git diff --quiet 6046c0b -- src scripts tests cfg assets levels package.json package-lock.json
```

The 543-file input inventory digest and artifact equality are recorded in
[source-and-focused.json](source-and-focused.json). No stale expectation,
fixture, harness or runtime source was changed by this planning task.

**Main advanced during this task**, after the test run: `4e84bc4` merges
test-debt part 1. It changes nine test files and debt documentation, with
**zero game/build/asset/package input change** versus 6046c0b. The branch
remains on its authorized base; those test edits were not imported, and no
merge/rebase was performed. The A/B/C above is explicitly **not a fresh
comparison with advanced main's revised test suite**. Its report records
17 repaired predicates and audited 120 remaining failures. This task does
not reverse those fixes or certify that suite; the owner retains them when
integrating this documentation branch. Only this task's document edits are
committed.

Focused current-mechanism checks:

```sh
node --test tests/level-payload.test.mjs tests/fighter-weapons.test.mjs tests/interceptor-armour.test.mjs tests/heavy-package.test.mjs tests/hull-set-v1.test.mjs
```

**45 PASS /2 shared FAIL of 47**. Exact tuples in the source/focused evidence:
`H3 from data: the record's hit points, no armour bit in any wave of any level`
and T13 `only the Director's sector entry writes the star operand`. Both
match the immutable baseline inventory by first assertion/message.

Canonical reconciliation was run on this branch's saved full log and its
historical `docs/runtime-wall-trace.json`. It remains FAIL on the old registry:
1 unit tuple matched, 136 NEW,0 MOVED; trace 0 NEW/MOVED and 32 disappeared.
These are already recorded task-start-main failures, not new regressions.
The newer main registry was not overwritten or presented as the one used.
The task debt pointer names its pinned baseline. No green full-suite or
release claim. Logs remain in `.cache/m3-regional-skins/`.

## Scope, recommendation and validation

Core Q1–Q6A is accepted design; §7 remains OWNER REVIEW CANDIDATE. It prices
regional packs, existing per-wave Light choice, independent shot tagging,
shared-hue and BOMBER extensions, per-skin HP and packed per-wave HP.
Recommendation: current regional payload formats plus a four-byte per-skin
HP table, separately smokeable at M3 checkpoint 4 if approved; M4 unifies the
region resolver and M7 authors packs. Worst estimated extra 48 content/16
window B leaves 17/269 B, with 89 window B after provisional M4 core.

Documentation links, JSON, resource/cost arithmetic and baseline identity
are checked. Actual CPU/RAM/residency delta **0/0/0**. There is no new play
ATR; the hash above identifies the unchanged baseline used for measurement.

## Cleanup

`du -sh` immediately before/after cleanup:

| Directory | Before | After |
| --- | ---: | ---: |
| Own `.cache/m3-regional-skins/` | 3.0M | **568K** |
| Entire worktree `.cache/` | 3.6M | **1.1M** |
| Own generated `build/` | 47M | removed, **0** |

`df -h /System/Volumes/Data`: **416Gi available before and after cleanup**
(926Gi size, 487Gi used, 54% capacity). [Captured result](cleanup.json).
The retained task cache is below200 MB and contains only final full/focused
test and reconciliation logs, validation JSON and a short report. Source
measurements, comparison tuples and this audit are committed MD/JSON evidence.
Generated builds/ATRs/maps, intermediate previews, npm download cache and
task-local temporary fixture directories are removed. The previous
`.cache/m3-plan/` was retained unchanged; worktree `node_modules` stays13M.
No other task cache, asset archive or checkout was cleaned.

Generated `dist/` writes are restored to their original tracked bytes.
All own full/focused test and measurement commands finished; no persistent
server, browser, emulator, Vite, Worker, Chrome or workerd process and no
port listener was started. No new play ATR is delivered for planning only.

NEXT TASK: owner reviews §7 and its recommendation; STOP before implementation.
