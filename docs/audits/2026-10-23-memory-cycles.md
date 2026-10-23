```markdown
| Check | What | How measured | Result | Status |
| --- | --- | --- | --- | --- |
| M1 | Correct clone | pwd; git remote -v | /Users/marcinkrzetowski/Projects/void-strike-audit; origin https://github.com/Setech-pl/void-strike-65 | PASS |
| M2 | Clean origin/main baseline | git fetch origin; git switch --detach origin/main; git status --short; git rev-parse HEAD | Clean; 6dae5a6f0af31869f8d9255716544bfe98b9bc75 | PASS |
| M3 | Report branch | git show-ref; git switch | audit/memory-cycles-2026-10-23 already existed at the same baseline; selected without resetting | INFO |
| M4 | Normal build | npm --cache=build/audit/npm-cache run build | Exit 0; computed gates pass | PASS |
| M5 | Runtime evidence binding | Build warning; build/manifest.json runtimeEvidence | normal-awaiting-trace; boot BIN and ATR stale against b3b8e466 | INFO |
| M6 | Focused native trace prerequisite | Inspect build/atari800-trace and scripts/runtime-wall-trace.mjs:2142–2193 | Emulator tree absent; --prepare requires source and writes cpu.c and atari.c | FAIL |
| M7 | Trace time cap | No native trace launched | 0 minutes of 90 minutes used | PASS |
| M8 | Requested complete memory/cycle/capital audit | Scope completion review | Incomplete: stopped at M6 under the explicit code-change STOP condition | FAIL |
| M9 | Restricted actions | Commands executed; final Git diff | No game, script, test, asset, configuration or evidence edits; no full tests, release build, full trace, reconciliation or push | PASS |
```

# Memory and cycle audit — BLOCKED_MEASUREMENT_PREREQUISITE

Audited baseline: `6dae5a6f0af31869f8d9255716544bfe98b9bc75` (`origin/main`, fetched 2026-10-23).
This is a stop report, **not a completed audit or a feasibility certification**.

## Stop and recovery

The requested clone has no `build/atari800-trace` source tree or instrumented executable. The existing trace harness requires `src/atari800` and checks its instrumentation freshness (`scripts/runtime-wall-trace.mjs:4179–4182`). Its preparation function copies the observer header and rewrites emulator `src/cpu.c` and `src/atari.c` before building (`scripts/runtime-wall-trace.mjs:2142–2193`).

The task explicitly says: **“STOP conditions: … a measurement would need code changes.”** This report applies that condition to emulator code as well as game code. Preparation was not attempted. This is a tooling prerequisite, not evidence of a game defect or a byte/cycle shortfall. The protected `~/Projects/dark-fighter` checkout was not accessed.

Smallest recovery: provide a compatible, already instrumented Atari800 tree within this clone, or explicitly permit the existing `--prepare` routine to instrument emulator sources under `build/atari800-trace`. No game-source or trace-validator fix has been established as necessary. Whether further prerequisites exist remains untested.

## A — Memory: completed observations only

Source for the following current figures: the successful normal build's `build/manifest.json`, `transportCapacity` and `runtimeEvidence`. These are build results, not native frame measurements.

```markdown
| Resource | Current result | Source / calculation |
| --- | ---: | --- |
| Initial boot content | 13,569 B | transportCapacity.initialBootContentBytes |
| Planning STOP headroom | 83 B | Task STOP 13,652 minus 13,569 |
| Initial boot envelope | 127 B | transportCapacity.initialBootEnvelopeBytes |
| Initial transport | 13,696 B / 107 sectors | transportCapacity.initialBootBytes / initialBootSectors |
| Extension transport | 13,952 B / 109 sectors | transportCapacity.extensionBytes / extensionSectors |
| Total boot transport | 27,648 B / 216 sectors | transportCapacity.totalTransportBytes / totalTransportSectors |
| DFMC records | 11 / maximum 11 | transportCapacity.manifest.parsed.records / maximumChunkCount |
| Safe residency margin reported by build | 1,852 B | transportCapacity.remainingSafeResidencyBytes; not fungible free RAM |
| ATR artifact | 133,136 B | runtimeEvidence.artifacts; includes more than boot transport |
```

ATR SHA-256: `b282f1a86ec2b103f5ba5d0b2c07f3c927a3514be6f3bfbd721bd1ca61042034`.
Boot BIN SHA-256: `5e95ec81f916d65012bde3d17b93fff9430a175509ceef3c9574fa23041ac323`.

A verified complete region inventory, STATUS mismatch list, reclaim analysis and cumulative 1.0 forecast were not completed before the stop. The 83-byte boot margin alone does not identify the first resource to fail. No exact future shortfall is asserted.

## B — Cycles and DMA

Normal computed gates passed. The build explicitly warned:

> WARNING: Runtime wall-trace evidence pending: stale binding for void-strike-65-boot.bin, void-strike-65.atr (evidence commit b3b8e466); release build will fail.

No focused native trace ran: **0 minutes used**. No current capital/space frame maxima, attribution, fence margins, missed-frame results or native DMA-on headroom are certified here. Historical values were not promoted to current measurements. A release build was not run.

## C — Capital sector

Not completed. The required source-level verification of data/code ownership, capital admission, publication timing and level-specific headroom remains outstanding. No conclusion about admitting additional Lights or a Heavy is supported by this stop report.

## D — Attraction cost ranking

```markdown
| Requested idea | Ranking / byte and cycle costs |
| --- | --- |
| Lights, then Heavies | Not assessed |
| Second turret station per side | Not assessed |
| Destructible reactor/bridge and lance lock | Not assessed |
| Chained explosions and VSCROL shake | Not assessed |
| Hull hit marks (17a) | Not assessed |
| Per-row hull palette and level colour changes (17c) | Not assessed |
| Nacelles (17b), owner chosen | Not assessed; choice preserved |
| Sector starfield variation (17f) | Not assessed |
| Other supported but unauthored features | Not assessed |
```

### D7 — Nacelles: HW versus SW

Neither variant was verified. In particular, this report does not establish exclusive hull ownership of any COLPF collision bit, P0PF/HITCLR timing, bit-7 character interactions, or nacelle support in the existing hull format. It provides no recommendation between hardware collision and software edge collision, and no unsupported cost range. The owner's selection of nacelles remains unchanged.

## Artifacts and scope

Only this report is committed. Generated normal-build products remain in this clone's ignored `build/` and `dist/` directories. Audit scratch (normal-build log and local npm cache) is moved at session end to `~/Projects/void-strike-audit-leftovers/`. No tracked evidence is regenerated. No source changes, owner acceptance, merge, push or release are implied.

**NEXT TASK:** resolve the local emulator prerequisite, then resume the uncompleted audit. Stopped pending owner direction.
