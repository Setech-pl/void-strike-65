# `BLOCKED_STALE_CLAUSE_BOSS_HANDOFF` — the second blocker, newly exposed (2026-09-28)

With the weapon-pickup traversal clause repaired
([pickup-traversal-clause-2026-09-28.md](pickup-traversal-clause-2026-09-28.md)),
the full `npm run runtime:wall-trace` runs **65/65 sessions**, completes its PAL
timing audit and then throws at
`scripts/runtime-wall-trace.mjs:5723`-`:5729`:

```
Error: director-complete-0-natural-sweep-fire0 did not execute BOSS_HANDOFF -> DRAIN -> COMPLETE
```

`docs/runtime-wall-trace.json` is therefore **still not regenerated**, for a
second and different reason. This one is **not repairable by data or by
re-scripting**, and it is **not** introduced by owner decision 8.

---

## 1. The clause, and the premise it rests on

```js
const finalDirectorEvent = rows.findLast((row) => (row.events & (1 << 22)) !== 0);
const finalDrain = rows.find((row) =>
  row.frame > finalDirectorEvent.frame && row.sector_state === 5);
const finalComplete = rows.find((row) =>
  row.frame > finalDrain.frame && row.sector_state === 6);
invariant(finalDirectorEvent !== undefined && finalDrain !== undefined &&
  finalComplete !== undefined && finalDrain.frame === finalDirectorEvent.frame + 1 &&
  finalComplete.frame > finalDrain.frame,
`${session.id} did not execute BOSS_HANDOFF -> DRAIN -> COMPLETE`);
```

Bit 22 is `DFTRACE_EVENT_DIRECTOR_EVENT`
(`build/atari800-trace/src/voidstrike65_trace.h:426`), raised on a
**`director_try_event` PC hit** — the Director arming a wave.

`finalDrain.frame === finalDirectorEvent.frame + 1` therefore asserts that the
**last `director_try_event` call of the whole replay is the BOSS_HANDOFF**, and
that DRAIN follows it on the very next frame. That was true while the retired
phase machine dispatched an explicit `BOSS_HANDOFF` event at the end of the
level. **Roadmap 4.6 step 2 retired it**: `LEVEL1_DATA`, the phase arrays and
`_asm_director_dispatch_event`'s phase dispatch are gone, and the level now
ends inside `director_c_world_row_tick`, which calls `advance_sector()` and
returns **without calling `director_try_event`**. Nothing raises bit 22 on the
completion frame any more.

## 2. MEASURED — and it is INHERITED, not introduced

Both builds carry the same Director code and differ only in
`assets/levels/level-01.json`. Each replay was run with `--only-session` and
the three frames read out of its own CSV.

| Replay | level 1 as `68b5968` authors it | level 1 under owner decision 8 |
| --- | --- | --- |
| `director-complete-0` (EASY) | last event 9,382, drain 9,538 — **delta 156** | last event 8,619, drain 9,518 — **delta 899** |
| `director-complete-1` (MEDIUM) | last event 8,104, drain 8,469 — **delta 365** | last event 8,142, drain 8,494 — **delta 352** |
| `director-complete-2` (HARD) | last event 7,363, drain 7,684 — **delta 321** | last event 7,351, drain 7,732 — **delta 381** |

The clause requires **delta 1**. It fails on **all three difficulties, on both
level authorings**. Step 2 never saw it because its run aborted ~400 lines
earlier, at the traversal clause.

**Everything the clause's message actually names is true.** On all three
replays the level reaches DRAIN, then COMPLETE on the next frame, and COMPLETE
is terminal; a natural BROADSIDE projectile is observed. Under owner decision 8,
EASY: drain 9,518 → complete 9,519; MEDIUM 8,494 → 8,495; HARD 7,732 → 7,733.
There is no player-visible defect here: the level ends exactly as it should.

## 3. Why no re-script can repair it

The traversal blocker was class (a) — the session's inputs no longer produced
the situation, and a different fire delay produced it again. This one is not:
the **mechanism** the clause measures no longer exists. No joystick script, fire
delay, frame count or difficulty can make a `director_try_event` call happen on
the frame before DRAIN, because the level's end does not call
`director_try_event` at all. Authoring a wave to arm near the last row does not
help either: the row tick tests the sector end **before** the wave row, so the
frame that ends the level never arms a wave, and at 0.4-0.5 rows a frame one
authored row is two to three frames away from the boundary — never exactly one,
and never the same one on three difficulties.

## 4. `OWNER_DECISION_REQUIRED` — three compliant alternatives

The clause is a gate. `AGENTS.md` and the owner's class rule reserve changing
one to the owner, so this session stops here and does not touch it.

| # | What it is | Player-visible effect | Cost | Risk |
| --- | --- | --- | --- | --- |
| **1** | **Re-point the clause at the transition it names.** Drop the `finalDirectorEvent` term and assert what "BOSS_HANDOFF -> DRAIN -> COMPLETE" means after step 2: the last sector's row clock ends the level, `sector_state` 5 appears exactly once after it, `sector_state` 6 follows on the next frame, and 6 is terminal. | none | ~6 lines in `runtime-wall-trace.mjs`, no runtime byte | lowest. It keeps everything the clause protects — the level ends, ends once, and stays ended — and drops only the retired event. All three replays pass it today (§2) |
| **2** | **Give the runtime the event back.** Have `advance_sector()` raise the Director event on the completing frame, so bit 22 is set where the clause expects it. | none | a few bytes in `DIRECTOR_C_LOW`; the Director's event counter gains one event per level, which every "director event" aggregate in the trace then counts | medium. It adds a runtime byte and a trace semantic purely to satisfy a measurement; 4.7's boss handoff may want a different event anyway |
| **3** | **Record it.** Add the three `director-complete-*` sessions to `docs/recorded-gate-failures.json` as an accepted open failure. | none | one data file | highest. The clause aborts the run rather than recording a failure, so this needs the clause converted to `recordClauseFailure` first — which is alternative 1's edit without alternative 1's benefit, and it leaves the level-end sequence unmeasured |

**Recommended: 1.** It is the smallest change that restores the measurement the
clause was written to make, and it needs no runtime byte.

## 5. What is blocked behind it

* `docs/runtime-wall-trace.json` stays at its `28bd1e7` content;
* `npm run build` on the **default** target refuses to link
  (`Runtime wall trace binding mismatch for void-strike-65-boot.bin`), so
  `npm test` cannot run its suite at all;
* `tests/runtime-evidence-binding.test.mjs` is red, correctly.

Everything else in this session's work is measured and complete: the PAL timing
audit ran to completion over all 65 replays (0 distinct miss events, 0 frames
over the hard gate), boot smoke is 8/8, and the transport rule holds. Those
figures are in
[level-order-pal-audit-2026-09-28.json](level-order-pal-audit-2026-09-28.json).
