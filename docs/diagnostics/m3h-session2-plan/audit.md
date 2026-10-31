# M3-H session 2 planning audit — 2026-10-30

**OWNER REVIEW CANDIDATE, planning only.** Branch `codex/m3h-session2`,
baseline/current main `7fe90409bd09db58ff263806bec711db21a76457`. The owner
created the clean task branch. No branch switch, merge, push, tag, release,
subagent work or gameplay implementation. [Deliverable plan](../../plans/m3h-session2.md).

## Fresh resources and native baseline

The normal build, including computed byte/startup gates, passed as the
prerequisite of `npm test`; a separate NORMAL capital-960 variant also built.
The expected warning says runtime wall-trace evidence is stale for the boot
image/ATR and **release build will fail**. It remains pending. No evidence SHA
or release predicate was repaired. [Resources and artifact hashes](resources.json)
are captured from the fresh normal build, not the checked-in dist manifest.

[Native quick results](quick-summary.json), Atari800 7.1.2 PAL, DMA on:

| Registered route | Iterations | Worst wall cycles | Peak frame /host frame | Capital peak | Minimum fence |
| --- | ---: | ---: | --- | ---: | ---: |
| Spread NORMAL `campaign-1-spread-capital` | 1,800 | **30,465** | SPACE 246 /1109 | 29,547 | 2,489 |
| Capital-960 NORMAL `l2-960-1-flight` | 3,967 | **31,153** | SPACE 2448 /3311 | 29,171 | 6,714 |

Worst is **31,153**, target margin 347 and hard margin **1,415**. Both routes
pass their focused acceptance checks with 0 misses, extra VBI boundaries,
DLI errors, shifted presentation rows, stale L2 accesses or world/hull clock
mismatches. Capital-960 boss entry 325 host frames. These two routes reproduce
the phase-resync checkpoint exactly; this is a new measurement, not borrowed
binding. No all-route maximum or release readiness is inferred.

Reproduction, after `npm ci` and the normal build, in this checkout:

```sh
node scripts/build.mjs --level=1:sector=1 --l2-long-capital --quiet
```

Copy normal build +dist files into `build/frame-peak-baseline-campaign/`
and the variant into `build/frame-peak-baseline-960/`, preserving artifact
basenames. Use a private source copy of Atari800 7.1.2 under
`build/atari800-trace/`; do not share a mutable emulator with another session.

```sh
node scripts/frame-peak-native.mjs baseline --emulator=build/atari800-trace --only=campaign-1-spread-capital --output=build/m3h-session2-plan/quick-spread
node scripts/frame-peak-native.mjs baseline --emulator=build/atari800-trace --no-prepare --only=l2-960-1-flight --output=build/m3h-session2-plan/quick-960
node scripts/frame-peak-results.mjs build/m3h-session2-plan/quick-spread --baseline
node scripts/frame-peak-results.mjs build/m3h-session2-plan/quick-960 --baseline
```

The first command prepares the private emulator; the second starts only after
that capture finishes. Both run records have exit 0 and report `passed:true`;
the `--baseline` summarizer flag does not substitute for those actual checks.
Raw CSVs, snapshots and profile logs remain under the named build directories.
No full native matrix, home matrix, separate boss-stress command, boot smoke,
release trace or strict release was run.

## Tests and A/B/C comparison

Full suite: **1,484 PASS /139 FAIL of 1,623; A139/B0/C0**. All 139 failure tuples
match the already recorded phase-resync main debt exactly; none was added,
moved or cleared. [Exact tuples and comparison](tests-ab.json),
[source identity and focused run](source-and-focused.json). The single full
run doubles as current-main baseline because
the task starts at main and changes only documentation. This is an identity
comparison, **not two independently executed full suites**. Before and after
validation, `git diff --quiet main -- src scripts tests cfg assets package.json
package-lock.json` establishes identical runtime, harness and build inputs.
All failures in that run therefore also occur on these same current-main
inputs. No unrelated stale assertion is repaired in a planning task.

Focused command:

```sh
node --test tests/level-payload.test.mjs tests/memory-map-generated.test.mjs tests/heavy-package.test.mjs tests/frame-peak-routes.test.mjs tests/nmos6502-rol.test.mjs
```

**27 PASS /1 shared FAIL**. The exact shared tuple is
`tests/level-payload.test.mjs` → `T13: only the Director's sector entry writes
the star operand` → first assertion **:417** → `declared once, called once -
from enter_sector`. It matches the existing phase-resync debt by name,
assertion and message; this task has not modified the source. All Heavy
package, generated memory map, registered quick-route and NMOS ROL checks in
that focused set pass. Log: `build/m3h-session2-plan/focused.log`.

The full run was reconciled with the canonical test and trace registries.
Reconciliation remains **FAIL**, as on main: the canonical unit registry
matches 1 and calls 138 other shared tuples NEW, whereas all 139 match the task
debt inventory already in `docs/recorded-gate-failures.json`. The legacy
canonical trace has 32 disappeared predicates and no new/moved predicates;
it was read for reconciliation, not regenerated or claimed fresh. See
`build/m3h-session2-plan/reconcile.log`. A new planning-debt pointer references
the exact 139-tuple inventory without duplicating it or changing release
failure predicates. No gate is weakened.
Plan links, H10–H14/H16 coverage and Git whitespace checks are also checked.

## Planning findings and disposition

No requested feature is silently dropped. Budget 478 window B leaves 265;
arena allowance 5 B, pickup 6 B, new metadata 8 RAM B, H16 consumes its existing
32-B reservation. These are **ESTIMATES**, not implementation gate results.
Old Light/pickup/arena placements are explicitly deferred with shortfalls;
current replacements are priced. Initial-content and packed-record effects
still need measurement during implementation.

One unresolved design contract is explicitly returned to the owner:
**OWNER_DECISION_REQUIRED** for H14's second-attempt force versus nonrotate
publication. The plan prices both choices. There is no new measured hardware
blocker and no experimental production code to revert.

Planning delta: **CPU 0 cycles, RAM 0 B, residency 0 B**. Only plan/status/audit
and debt documentation change. Generated dist writes belong to validation
and are restored from Git before commit; build variants and baseline play
ATRs stay in build/. A final fresh normal build reproduces the measured main
boot image and ATR byte-for-byte. No session-2 `OWNER-SMOKE CANDIDATE` is claimed.

| Baseline reproduction ATR | SHA-256 |
| --- | --- |
| `build/play/m3h-session2-plan/campaign-baseline.atr` | `a125ec10f134ba9e9b8525a56b7c56f0d178095826b92235af989243b2676ac1` |
| `build/play/m3h-session2-plan/capital-960-baseline.atr` | `05b3be00a584e92f2e0e20f3cc38c92dc8ca4a954c0a0047d01b44668e25ecbd` |

NEXT TASK: owner reviews the committed plan and H14 A/B choice. STOP before
any implementation, gameplay smoke promotion, merge or push.
