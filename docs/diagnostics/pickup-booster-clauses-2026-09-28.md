# The pickup/booster clause family — three blockers behind owner decision 9, and one repair (2026-09-28)

Owner decision 9 re-pointed the boss-handoff clause
([boss-handoff-clause-2026-09-28.md](boss-handoff-clause-2026-09-28.md),
alternative 1), and the full `npm run runtime:wall-trace` now runs **past** it.
It stops **three clauses later**, in the post-loop **pickup/booster** family, at

```
Error: Long XEX/ATR traces completed only 8/10 weapon-booster cycles
       scripts/runtime-wall-trace.mjs:6108
```

and two more clauses stand behind that one. A **fourth** failure in the same
family — the `weapon-pickup-overlap` session's raster clause, the one the step-2
report listed as "not among the recorded 40" — is **repaired in this session**
by re-scripting its fire delay; it is §5 below.

All four have **one cause**: roadmap 4.6 step 2 moved the Heavy cadence, which
moved the kills, which moved the **weapon capsules**, and every one of these
clauses is scripted around a capsule arriving at a particular moment. None of
them is a runtime defect — §2-§5 measure the capsule itself in each case and
find it correct. Three are **class (a)** in the owner's taxonomy (the scenario
no longer contains the behaviour); one, §4, is **class (b)** (the clause reads
the wrong coverage).

`docs/runtime-wall-trace.json` is therefore **still not regenerated**, and this
document is the `OWNER_DECISION_REQUIRED` that stands between step 2 and its
evidence.

> **ANSWERED 2026-09-28 — the recommendation in each case, alternative 1, three
> times** (plan [../plans/director-4.6.md](../plans/director-4.6.md) §11 item
> 12). Read under one rule: **a class (a) clause is never touched, only its
> scenario moves; a class (b) clause's condition is never touched either, the
> observer behind it is corrected to count what the clause is about.** For §4
> that places alternative 1's intent one level lower than this document
> proposed it — in `dftrace_measure_pickup_missiles`, not in the clause. The
> repairs and their evidence are §7-§10 below. A standing authorisation for the
> closing session only, with the five conditions that STOP it, is in §11 item
> 12 of the plan.

---

## 1. The baseline these three moved away from

MEASURED from the **committed** `docs/runtime-wall-trace.json` at `28bd1e7`,
the branch point, which binds to the `dist/` in this tree:

| What the committed evidence records | Value |
| --- | ---: |
| `gate.memory_integrity.pickup_rf_cycles` (the clause of §2) | **10** — exactly its threshold |
| `gate.memory_integrity.pause_sessions` (the clause of §3) | the **two `evasive`** integrity sessions, 27 paused host frames each |
| `gate.behavioural_clause_failures` | **40**, and they are exactly the 40 of `docs/recorded-gate-failures.json` — the `weapon-pickup-overlap` session is **not** among them |

So all four failures below are **new since `28bd1e7`**, and `tests/runtime-evidence-binding.test.mjs`
is green on the committed pair (verified in this session), which is what makes
the difference measurable rather than asserted.

## 2. Blocker 3 — `8/10 weapon-booster cycles`, `scripts/runtime-wall-trace.mjs:6108`

```js
const integrityCollections = memoryIntegrityRows.filter((row) => (row.events & (1 << 19)) !== 0);
invariant(integrityCollections.length >= 10,
  `Long XEX/ATR traces completed only ${integrityCollections.length}/10 weapon-booster cycles`);
```

Bit 19 is `DFTRACE_EVENT_PICKUP_COLLECT`. The set is the four
`memory-integrity-160s` sessions — `{XEX, ATR} x {evasive, hunt}`, 4,000 frames
each — so the clause asks for **five collections per medium**.

**MEASURED** on the reproduced candidate (XEX `3c0aaea1…`), each session run
with `--only-session`:

| session | qualified kills (bit 18) | collections (bit 19) | booster states seen |
| --- | ---: | ---: | --- |
| `memory-integrity-xex-2-hunt-fire4` | 16 | **4** — frames 311, 2,184, 2,377, 2,537 | 0, 3, 4, 5 |
| `memory-integrity-xex-2-evasive-fire4` | 10 | **0** — a capsule reaches ACTIVE and is never taken | 0 only |

The ATR twins are held byte-identical to the XEX ones by the parity clause at
`:6104`, so the run's total is **8**.

**The fifth collection is not missing — it is late.** In the `hunt` session the
third qualifying kill of the fifth capsule lands on frame **3,943** and the
capsule goes ACTIVE, 16 missile rows published, on frame **3,974** — **25
frames before the session's 4,000-frame window closes**. The replay ends with
the capsule on screen and the player on its way to it.

Class **(a)**: the scenario is 25 frames too short for what it is asked to
contain. The runtime collected every capsule it was given.

| # | Alternative | Cost | Risk |
| --- | --- | --- | --- |
| **1** | **Re-script the `hunt` pair's fire delay** so the fifth collection falls inside the window (the sweep this session ran for §5 is the same method). | one number, `fireDelay` on the `hunt` half of the session factory; **no runtime byte** | it moves **8,000 measured frames**, so the DMA-on maximum and the worst fence margin must be re-measured against 31,670 / 727, and §3's pause clause and the XEX/ATR parity clause read the same sessions |
| 2 | **Extend the two `hunt` sessions** 4,000 → ~4,100 frames. | the arithmetic is certain — the capsule is already on screen | it breaks the `16_000`-frame pin at `:5847`, the per-session "80 seconds" pin at `:5854`, `gate.memory_integrity.xex_frames`/`atr_frames` 8,000, `duration_seconds_pal_per_artifact` 160 and the four values `tests/runtime-wall-trace.test.mjs:303-311` pins. The published "160-second" claim changes, and the sessions stop being 160-second sessions |
| 3 | **Record it** as an accepted open failure. | one entry in `docs/recorded-gate-failures.json` | the clause is an `invariant` and aborts the run, so it must first become a `recordClauseFailure` — a **clause change**, which is the owner's alone, and it leaves the booster-cycle coverage unmeasured |

**Recommended: 1**, with 2 as the fallback if no delay works.

## 3. Blocker 4 — the OPTION pause test never arms, `:6116`

```js
const integrityPauseRows = memoryIntegrityRows.filter((row) => row.pause_test_completed !== 0);
invariant(["XEX", "ATR"].every((medium) => integrityPauseRows.some((row) => …
  row.pause_host_frames >= 25)),
"XEX/ATR integrity replay did not freeze Spread Shot and engine cadence across OPTION pause");
```

The **observer** arms that test, and only under one condition
(`build/atari800-trace/src/voidstrike65_trace.h:3280-3283`): game state 6,
**booster state byte `== 4`** — the Spread booster — and the pickup timer
between 100 and 450. The session factory puts the arming flag on the
`evasive` half (`pauseTest: policy === "evasive"`).

**MEASURED** on the candidate: rows with `pause_test_completed != 0` — **0 in
the `evasive` session and 0 in the `hunt` session**. The `evasive` pair never
collects a capsule at all (§2), so its booster state never leaves 0 and the
arming condition cannot be met. The `hunt` pair **does** reach booster state 4,
on frame 2,537.

Class **(a)**, and the same shape as a repair already recorded **in that
session factory's own comment** (2026-09-22): *"the scenario moves to the
replay that still contains the behaviour; the assertion, the arming condition
and the coverage it names are all untouched."* That comment moved the flag to
`evasive` when the `hunt` pair lost its Spread booster. The capsule cadence has
moved again, in the other direction.

| # | Alternative | Cost | Risk |
| --- | --- | --- | --- |
| **1** | **Move `pauseTest` back to the `hunt` pair** (`policy === "hunt"`). | one predicate; **no runtime byte**; the precedent is in the file | the pause is then injected into a busier replay: the clause's own terms — timer, engine timer and engine phase equal across the pause, ≥ 25 paused host frames — have to be re-measured there, not assumed |
| 2 | **Arm it on both pairs.** | one predicate; the clause is a `some`, so evidence only grows | the same verification, twice; and a pair that cannot arm contributes nothing, which is how this blocker stayed invisible |
| 3 | **Record it.** | one entry | same objection as §2 alternative 3, and it would leave the pause freeze — an accepted player-visible guarantee — unmeasured on both media |

**Recommended: 1.**

## 4. Blocker 5 — `Pending weapon pickup became visible or interactive`, `:6308`

```js
invariant(pickupPendingRows.every((row) =>
  (row.entity_active_mask & 2) === 0 && row.pickup_missile_rows === 0),
"Pending weapon pickup became visible or interactive");
```

`pickupPendingRows` is every `weapon-pickup-coverage` row with
`pickup_state === 1`, the pending span between the third qualifying kill and the
capsule's admission.

**MEASURED** on `weapon-pickup-2-hunt-fire4`: **514** pending rows, **181** of
them violating — every one on the **second** conjunct only. What those rows
read is `pickup_missile_rows` 2-10 with `pickup_missile_union` **`$30`** or
**`$3C`**.

`pickup_missile_rows` does not measure the capsule. The observer
(`voidstrike65_trace.h`, `dftrace_measure_pickup_missiles`) counts **every
non-zero byte of the whole 256-row missile plane page at `$3B00`** — all four
missiles, two bits each. The capsule is drawn as the **GTIA fifth player**
across all four (`PRIOR = $10`), which is why an intact capsule reads 16 rows
with union **`$FF`** in one block. Union `$30`/`$3C` is bits 4-7: **missiles 2
and 3 — the fighter's own shots**, on a plane the capsule is not on. The
pickup's own slot bit is clear on all 514 rows, which is the conjunct that
actually describes the pending pickup, and it holds.

Class **(b)**: the clause reads the wrong coverage. It is the **third** instance
of one measurement confusion — `entity_active_mask === 2` in the traversal
clause ([pickup-traversal-clause-2026-09-28.md](pickup-traversal-clause-2026-09-28.md)
§4), the raster window in §5 below, and this one — where a counter named for the
pickup measures a **shared** plane, and step 2's cadence change put something
else of the player's on it.

| # | Alternative | Cost | Risk |
| --- | --- | --- | --- |
| **1** | **Re-point the conjunct at the capsule**: `pickup_missile_blocks === 0` (the observer already publishes it) or "no 16-row `$FF` block", keeping `(mask & 2) === 0` as it is. | ~1 line; no runtime byte; it makes the clause say what its message says | a **clause change**, so the owner's alone. Falsifiability must be shown the way §5 shows it: the corrected clause must still fail when a pending capsule really is on the plane |
| 2 | **Re-script the session's fire delay** so no shot is in flight during any pending span. | one number | the pending spans are **514 of 4,000 frames** and the `hunt` policy fires continuously, so a delay with complete separation may not exist — ESTIMATE, not measured |
| 3 | **Record it.** | one entry | `invariant` → `recordClauseFailure` first, i.e. a clause change anyway, and the message reads as a player-visible defect that measurement says is not there |

**Recommended: 1**, which also settles the same conjunct in the traversal clause
that this session's backlog item already names (plan §11 item 11).

## 5. REPAIRED here — the `weapon-pickup-overlap` raster clause, fire delay 4 → 5

This is the failure the step-2 report listed as *"not among the recorded 40"*.
It is repaired, not recorded, and **the clause is untouched**.

The clause (`:3873`) counts COLPF3 pixels inside the capsule's own 16-pixel
column across the whole captured image, and requires the **last three** captures
— the three the observer takes after collection — to read **under 40**.
MEASURED at fire delay 4: `216 ×9, 234, 202, 178, 46, 46, 0`.

**What those 46 pixels are.** Decoding the fifteen captures
(`weapon-pickup-contact-edge-NN.png`, 256×192):

| capture | COLPF3 pixels in x 60-76 | where they are |
| --- | ---: | --- |
| 08 | 216 | y 176-191 — the capsule, 16 rows |
| 09 / 10 / 11 | 234 / 202 / 188 | y 176-191 **and y 0-6** |
| 12 / 13 | 46 / 46 | **y 0-6 only** |
| 14 | 0 | nothing |

The y 0-6 run is a **fighter missile at the top of the screen**, in the column
the capsule happens to occupy, and it is already there on capture 09 while the
capsule is intact. On 12 and 13 the capsule is gone from the raster, and the
trace agrees: from the collection frame on, `pickup_missile_rows` 0,
`pickup_missile_union` 0, the pickup slot bit clear, `pickup_booster_state` 3.
**Nothing is cut and nothing is stale.** The capsule and the fighter's shots
share COLPF3 and the missile plane, so a shot fired up the capsule's column
reads as capsule pixels — the same confusion as §4.

**The re-script.** MEASURED over fire delay 0, 2, 3, 4, 5, 6, 8, 10, 12, 16,
20, 24, 32, 48 and 64, one focused native run each:

| fireDelay | result |
| --- | --- |
| 0, 2, 3, 10, 12, 16, 20, 24, 32, 64 | **two** collections inside the 1,300 frames — fails *"did not collect and activate exactly once"* |
| 4 (as authored) | last three captures 46, 46, 0 — fails the raster clause |
| 6 | 56, 56, 56 — fails |
| 8 | 46, 46, 46 — fails |
| **5** | **216 ×9, 188, 184, 160, 28, 28, 28 — PASSES every clause of the session** |
| 48 | 216 ×9, 188, 156, 132, 28, 28, 28 — also passes |

**5 is taken**: it is the smallest change from the authored 4, it keeps the
`hunt` policy firing at the same rate, and 48 would have the player firing once
a second — a different replay. The session is renamed
`weapon-pickup-overlap-2-hunt-fire5` so its id keeps stating its delay, exactly
as the traversal session does. Its PAL row is unchanged in kind: 1,300 frames,
0 misses, fence margin 3,845, maximum wall 30,369 — far from the 727 / 31,670
the gates are recorded at.

## 6. What is blocked, precisely

* `docs/runtime-wall-trace.json` stays at its `28bd1e7` content;
* `npm run build` on the **default** target therefore still refuses to link,
  and `npm test` cannot run its suite;
* `tests/runtime-evidence-binding.test.mjs` stays red against a candidate
  build, correctly, and green against the committed pair;
* everything else in step 2 is measured: boot smoke **8/8**, the PAL audit over
  the whole replay set, and the transport rule (§7 of `docs/STATUS.md`'s step-2
  section).

**The grouped question for the owner.** §2, §3 and §4 are three scenario
repairs and one clause repoint; §2 alternative 1 and §3 alternative 1 are
inside the standing class-(a) rule, and §4 alternative 1 is a clause change that
only the owner may take. Taking §2/1, §3/1 and §4/1 together is what makes the
run complete; each one alone leaves the next clause in the way.

---

# The repairs, under owner decision 12 (2026-09-28)

Trace and observer code only. No runtime byte. No clause condition altered.
Sections 7-9 take §2, §3 and §4's recommendation in turn; §10 is the
falsifiability and the full-run reconciliation; §11 corrects one attribution
§4 and §5 got wrong.

## 7. §2's repair — the `hunt` pair's fire delay, 4 -> 5 (class (a))

The clause at `:6108`, its threshold of ten and the XEX/ATR parity clause at
`:6104` are untouched. The session factory's `hunt` half takes a named
constant, `MEMORY_INTEGRITY_HUNT_FIRE_DELAY`, and the id keeps stating the
delay — `memory-integrity-{xex,atr}-2-hunt-fire5` — exactly as the traversal
and overlap sessions do.

**The sweep, MEASURED**, one focused 4,000-frame XEX run each, with §3's
`pauseTest` move already in place (it must be, because the two repairs share
these sessions):

| fireDelay | qualified kills | collections | at frames |
| ---: | ---: | ---: | --- |
| 0 | 17 | 5 | 239, 513, 2,153, 2,381, 2,529 |
| 2 | 19 | 6 | 240, 411, 2,104, 2,270, 2,431, 2,622 |
| 3 | 8 | **2** | 241, 413 |
| 4 (as authored) | 16 | **4** | 311, 2,184, 2,377, 2,537 |
| **5** | 17 | **5** | **311, 812, 2,225, 2,409, 2,568** |
| 6 | 17 | 6 | 312, 812, 2,196, 2,353, 2,517, **3,983** |
| 8 | 16 | 5 | 312, 520, 2,160, 2,341, 2,552 |

**5 is taken.** It is the smallest change from the authored 4 that works — 3,
the other neighbour, collapses to two collections — and it is the most robust
of the five that do: its last collection lands on frame 2,568, leaving **1,432
frames of slack** before the window closes, where the authored 4 missed by 25
and 6 buys its sixth collection at frame 3,983, 17 frames from the edge. The
`hunt` policy keeps firing at essentially the same rate.

The clause counts across all four sessions and the ATR twin is held
byte-identical by `:6104`, so 5 per medium is the **10** the clause asks for.

**The PAL row, MEASURED**, and the re-measurement §2's alternative 1 warned
was owed because the repair moves 8,000 measured frames:

| session | frames | misses | fence margin | maximum wall |
| --- | ---: | ---: | ---: | ---: |
| `…-hunt-fire4` (before) | 4,000 | 0 | 3,337 | 30,331 |
| `…-hunt-fire0` | 4,000 | 0 | 2,281 | 30,339 |
| **`…-hunt-fire5` (after)** | 4,000 | 0 | **3,833** | **30,371** |

Far from the 727 / 31,670 the gates are recorded at, and the margin improves.

## 8. §3's repair — `pauseTest` moves back to the `hunt` pair (class (a))

One predicate, `policy === "evasive"` -> `policy === "hunt"`. The clause at
`:6116`, the emulator's arming condition (game state 6, booster state 4, pickup
timer 100-450) and the coverage the clause names are untouched. The factory's
own 2026-09-22 comment recorded the same move in the other direction; both
entries now stand side by side in it, because the pair that contains the
behaviour has changed twice and the next session should see why.

**MEASURED** on `memory-integrity-xex-2-hunt-fire5`: **3,137** rows with
`pause_test_completed != 0`, and on **every one of them** the pickup timer, the
engine timer and the engine phase are equal across the pause and
`pause_host_frames` is **27**, against the clause's 25. Before the move the
count was **0 on both halves of the pair**: `evasive` never collects a capsule,
so its booster state never leaves 0 and the arming condition cannot be met.

`gate.memory_integrity.pause_sessions` therefore names the two `hunt` sessions
where it named the two `evasive` ones. `tests/runtime-wall-trace.test.mjs` pins
the length of that array at 2 and the properties of its entries, not the names,
so it is unmoved.

## 9. §4's repair — the OBSERVER, not the clause (class (b))

Owner decision 12 places alternative 1's intent one level lower than §4
proposed it: `pickup_missile_rows === 0` in the clause at `:6308` stays
**byte-for-byte as written**, and `dftrace_measure_pickup_missiles` in
`scripts/atari800-wall-trace.h` is corrected to count what the clause is about.

**A row is the capsule's when either of two exact facts holds.**

1. **It is inside the window the runtime says it is publishing.**
   `render_fighter_pickup_pmg` writes `WEAPON_PICKUP_HEIGHT_SCANLINES` (16)
   rows from `ENTITY_SCREEN_LO + WEAPON_PICKUP_SLOT` and sets
   `ENTITY_SCREEN_HI + WEAPON_PICKUP_SLOT`; `clear_fighter_pickup_pmg` is
   guarded by that same byte, clears exactly those rows and zeroes it. The flag
   is non-zero for precisely as long as the capsule is on the plane. Its `iny`
   wraps at 256, so the window wraps here too — which is also what keeps a
   wrapped capsule one block and retires the row-0/row-255 special case the old
   whole-page scan needed.
2. **It carries missile 0 outside that window.** `missile_masks` is
   `$0C, $30, $C0`, so BROADSIDE — the plane's only other writer — never touches
   missile 0. A row carrying `$03` that the capsule does not currently own is
   therefore capsule **residue**: an image it drew and failed to erase. Keeping
   it is what preserves the trail detection the whole-page scan gave the
   traversal and release clauses, whose own comments record being falsified by
   a suppressed erase (`missile_rows` 16, 18, 20 … 152) and a stale erase
   address. A 16-row silhouette left behind carries missile 0 on 14 of its 16
   rows in the worst case (SHIELD's `$3C` and `$24` tail rows do not), so those
   fixtures still fail both `missile_rows === 16` and `missile_rows === 0`.

Bit patterns alone could not have done this, which is why §4's alternative 1
reached for the clause instead: the SHIELD silhouette itself contains a `$3C`
row and a `$24` row, indistinguishable by value from broadside slots 0+1 and 1.

**MEASURED on `weapon-pickup-2-hunt-fire4`**, the session §4 measured:

| | before | after |
| --- | ---: | ---: |
| PENDING rows (`pickup_state === 1`) | 514 | 514 |
| violating the clause | **181** | **0** |
| …via `(entity_active_mask & 2) !== 0` | 0 | 0 |
| …via `pickup_missile_rows !== 0` | 181 | 0 |
| unions on the violating rows | `$0C`, `$30`, `$3C` | — |
| ACTIVE rows (`pickup_state === 2`) | 261 | 261 |
| their `pickup_missile_rows` | {16} | **{16}** |
| their `pickup_missile_union` | {`$FF`} | **{`$FF`}** |
| their `pickup_missile_blocks` | {1} | **{1}** |

The last three rows are the point: the six other clauses that pin 16 / `$FF` /
1 for an intact capsule are unaffected **by construction**, because every row of
all three 16-row silhouettes is non-zero and each silhouette's union is `$FF`.
`weapon-pickup-traversal-2-observe-fire8`,
`weapon-pickup-overlap-2-hunt-fire5` and `weapon-pickup-spread-0-hunt-fire4`
each pass a focused run against the corrected observer, unchanged.

## 11. One attribution corrected — they are BROADSIDE marks, not the fighter's shots

§4 and §5 above both say the contaminating missile-plane content is "the
fighter's own shots" / "a fighter missile at the top of the screen". **It is
not.** `src/main.s` has exactly four `sta MISSILES,y` sites: two in
`erase_broadside_slot` / `draw_broadside_span_at_hpos` and two in
`clear_fighter_pickup_pmg` / `render_fighter_pickup_pmg`. The player's
projectiles are PairShot **character** cells and write no missile byte at all.

The evidence agrees precisely: the unions §4 measured on the violating rows are
`$0C`, `$30` and `$3C`, which are `missile_masks[0]`, `missile_masks[1]` and
their union — broadside slots 0 and 1 — and never `$C0` alone or anything
carrying `$03`. §5's y 0-6 COLPF3 run in the capsule's column is a broadside
warning mark descending from the capital, which is also why it appears at the
top of the screen.

Nothing in §4's or §5's *conclusions* changes: the capsule was correct in both,
the raster pixels and the trace rows belonged to something else that shares
COLPF3 and the missile plane, and both repairs stand. Only the name of that
something else was wrong. It matters because it is what made missile 0 usable
as the residue discriminator in §9.
