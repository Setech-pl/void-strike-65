# The weapon-pickup traversal clause — diagnosis and re-script (2026-09-28)

Roadmap 4.6 step 2's one unfinished item. `docs/runtime-wall-trace.json` could
not be regenerated because the full run threw at
`scripts/runtime-wall-trace.mjs:5298`:

```
Native pickup did not remain one logical slot and one whole 16-row missile capsule
```

The step-2 session recorded the blocker in
[level-data-pal-audit-2026-09-23.json](level-data-pal-audit-2026-09-23.json)
with the note that *"the same session with `--only-session` passes on this
build and on `28bd1e7` alike"*, and reasoned from that to a full-run-only
effect. **That premise is wrong, and this document replaces it.**

---

## 1. "It passes when run alone" is an artefact of the harness

`--only-session` does not reach the clause. `runtime-wall-trace.mjs` has a
focused-run branch that writes `<session>-focused-run.json`, asserts the
focused PAL acceptance and **returns**:

```js
if (onlySession !== undefined) {
  const focusedReportPath = path.join(buildDirectory, `${onlySession}-focused-run.json`);
  …
  console.log(`Focused report: …`);
  invariant(acceptance.passed, …);
  return;                       // <- scripts/runtime-wall-trace.mjs ~5148
}
```

The traversal clause is a **post-loop aggregate** at `:5248`-`:5302`, a hundred
lines after that `return`. A `--only-session` run therefore prints
`Behavioural clauses: 1 session(s) ran to completion` **without ever
evaluating it**.

MEASURED on the step-2 build (`68b5968` + the level re-authoring of owner
decision 8): the session's own CSV, written by that same "passing" alone run,
already violates the clause on **26 of its 108 ACTIVE frames**. The alone run
and the full run produce the *identical* replay — same 1,800 frames, same
30,282 maximum wall cycles, same CSV — and differ only in whether the clause is
executed.

**Consequence for the bisect the task asked for: there is no session order to
bisect.** The smallest set of preceding sessions that makes the clause fail is
the **empty set**. It fails on the traversal session's own data.

## 2. What actually fails — class (a), a stale SCENARIO

The clause is a conjunction over the 108 ACTIVE frames:

```js
row.entity_active_mask === 2 && row.pickup_missile_rows === 16 &&
row.pickup_missile_union === 255 && row.pickup_draw_calls === 1
```

MEASURED, per conjunct, `weapon-pickup-traversal-2-observe-fire4` on the
step-2 build:

| Conjunct | Frames holding | Frames failing |
| --- | ---: | ---: |
| `pickup_missile_rows === 16` | 108 / 108 | 0 |
| `pickup_missile_union === 255` | 108 / 108 | 0 |
| `pickup_draw_calls === 1` | 108 / 108 | 0 |
| `entity_active_mask === 2` | 82 / 108 | **26** |

Every conjunct that describes the **capsule** holds on every frame. The one
that fails describes **the rest of the playfield**: bit 0 of
`entity_active_mask` is the debris slot, so `=== 2` additionally requires that
no debris is live anywhere in the capsule's 108-frame traversal. On the 26
failing frames the mask reads **3** — the capsule, intact, plus one debris.

That is class **(a)**: the step moved the *scenario*, not the runtime. Step 2
retired the per-phase hazard reaction and budget tables and gave the decision
to the sector's own hazard mask, which moved the debris cadence; the capsule
goes ACTIVE on frame 171 and the debris-clear window it needs ends on frame
252, so its last 26 frames no longer fall inside one.

It is **not (b)**: nothing is carried between sessions — the replay is
byte-identical run alone and run last of 65.

It is **not (c)**: no pickup was split and no logical slot was duplicated.
`pickup_missile_rows`, `pickup_missile_union` and `pickup_draw_calls` — the
three measurements that would see either — are exact on all 108 frames.

## 3. The repair — re-script the session, clause untouched

The session's only lever on capsule arrival is its fire delay: the player earns
the drop through normal play, so delaying the first shot delays the third kill
and with it the capsule.

MEASURED, `fireDelay` swept over 0, 6, 7, 8, 9, 10, 12, 14, 16, 32, 64, 150,
250, 300, 350 — ACTIVE window and violating frames:

| fireDelay | ACTIVE frames | violations |
| ---: | --- | ---: |
| 0 | 120-227 | 44 |
| 6 | 163-270 | 18 |
| 7 | 142-249 | 61 |
| **8** | **143-250** | **0** |
| 9 | 120-227 | 44 |
| 10 | 140-247 | 59 |
| 12 | 177-284 | 32 |
| 14 | 169-276 | 24 |
| 16 | 163-270 | 18 |
| 32 | 169-276 | 24 |
| 64 | 163-270 | 18 |
| 150 / 250 / 300 / 350 | 278-385 / 402-509 / 428-535 / 440-547 | 44 each |
| *4 (as authored)* | *171-278* | *26* |

`fireDelay: 8` is the only value with none. It puts the traversal inside the
debris-clear window **125-252**: 18 frames of lead, 2 of trail. That window is
128 frames and the capsule needs 108, so **20 frames is the whole slack the
sector's debris cadence leaves anywhere in this replay**, and 8 spends it as
well as it can be spent. The session is renamed
`weapon-pickup-traversal-2-observe-fire8` so its id keeps stating its delay.

**The clause is not touched.** No conjunct is weakened, deleted, re-ordered or
skipped.

## 4. What this leaves open, stated plainly

`entity_active_mask === 2` is the surviving character-era conjunct that
§12.2 of
[runtime-wall-trace-report-regeneration-blocked.md](runtime-wall-trace-report-regeneration-blocked.md)
already noted "does **not** catch" the fixture the repointed clauses were
written for. It measures the whole entity plane, not the pickup, and it is the
reason a debris admitted beside an intact capsule reads as a broken capsule.
Repointing it at the pickup's own slot bit — `(mask & 2) !== 0`, which the
smooth-sequence gate at `:5197` already uses — would make the clause say what
its message says, and would cost nothing it currently catches.

**That is not done here.** Under the owner's class rule a clause is only ever
changed by the owner, and this session's authority was to re-script the
scenario. It is recorded as a candidate the owner may or may not want, with
the observation that until it is taken, this replay's fire delay is pinned to
within a 20-frame window by the debris cadence of level 1 sector 1 — and any
future change to that cadence will move it again.
