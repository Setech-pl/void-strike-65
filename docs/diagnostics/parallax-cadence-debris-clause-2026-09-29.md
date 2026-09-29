# The introductory parallax cadence clause — one failure outside the recorded 108 (2026-09-29)

`OWNER_DECISION_REQUIRED`. The roadmap 4.6 step-2 closure session ran the owner's
item 3 — `npm test` on the **default** build, once, in full — and it reports
**109** failures where the owner's gate is **exactly the 108 recorded names**.
108 of the 109 are recorded. The 110th name in play is

```
✖ every difficulty preserves exact introductory parallax cadence before debris admission
  tests/runtime-wall-trace.test.mjs:899
```

which is **not** in the recorded set and **was green at `28bd1e7`**. The closure
stopped there with nothing committed, and resumed on the owner's decision below.

This is not a retired-symbol re-point, so owner item 1 does not cover it; it is
not one of the pickup/booster clauses, so owner decisions 12-13 do not cover it;
and it is not in the 108, so owner item 3 stops on it. Hence this document.

> **ANSWERED 2026-09-29 — alternative 1** (plan
> [../plans/director-4.6.md](../plans/director-4.6.md) §11 item 14). The owner has
> smoked this exact candidate, with debris in the opening seconds, and **accepts
> it**: the Director reading level 1 sector 1's authored `hazards.debris` is the
> behaviour step 2 exists to deliver, so the `[]` premise is gone for good. The
> conjunct is re-pointed as §3 alternative 1 describes — **trace/test code only,
> no runtime byte**; the cadence half of the clause is unchanged. §5 below records
> the implementation and the three mutations that show it discriminates.
> Alternatives 2 and 3 are REJECTED.

---

## 1. What the clause asserts, and what it now reads

`tests/runtime-wall-trace.test.mjs:899`:

```js
test("every difficulty preserves exact introductory parallax cadence before debris admission", () => {
  const cadence = report.coverage.parallax_cadence;
  assert.deepEqual(cadence.map(({ difficulty, full_debris_flight_frames }) =>
    [difficulty, full_debris_flight_frames]), [[0, []], [1, []], [2, []]]);
  ...
```

MEASURED from the regenerated `docs/runtime-wall-trace.json` in this worktree:

| difficulty | `full_debris_flight_frames` at `28bd1e7` | regenerated |
| --- | --- | --- |
| 0 (EASY) | `[]` | **`[116, 116]`** |
| 1 (MEDIUM) | `[]` | **`[104, 105]`** |
| 2 (HARD) | `[]` | **`[94, 94]`** |

Everything else in the same coverage record is **byte-for-byte unmoved** on all
three difficulties — `measured_frames` 400, `world_steps` 160/180/200,
`near_steps` 160/180/200, `far_steps` 400, and
`measured_rows_per_second` `{world, near, far, debris}` =
`{20, 20, 50, 12}` / `{22.5, 22.5, 50, 13.5}` / `{25, 25, 50, 15}`. The second
half of the clause — the three `parallax-cadence` sessions and their
`fire_delay` 4,000 — also passes unmoved.

So **the cadence this clause is named for did not change.** What changed is a
second conjunct in the same assertion: that the measurement window contains
**no** debris flight.

## 2. The cause — MEASURED, and it is what step 2 is for

The `parallax-cadence` sessions are `fireDelay: 4_000` over `frames: 400`
(`scripts/runtime-wall-trace.mjs:121-128`): the player **never fires**, so no
kill can produce debris. The debris in the regenerated run is therefore
**Director-admitted**, and the raw CSVs say so exactly.

MEASURED from `build/runtime-wall-trace/cadence-{0,1,2}-sweep-nofire.csv`, the
run's own output — debris spawn is `events` bit 7, a full traversal is bit 9
reached with neither bit 8 (contact) nor bit 12 (destruction):

| difficulty | first spawn (frame) | entry `entity_y` | `enemy_live_count` | flights completed in 400 frames |
| --- | ---: | ---: | ---: | ---: |
| 0 | **31** (`active_gameplay_frame` 32) | 16 | 2 | 2 of 3 spawns |
| 1 | **31** (`active_gameplay_frame` 32) | 16 | 2 | 2 of 3 spawns |
| 2 | **31** (`active_gameplay_frame` 32) | 16 | 2 | 2 of 3 spawns |

Frame 31 on **all three** difficulties, entering at the top of the gameplay band
with both Heavy members still alive and no shot fired: that is a sector-entry
hazard arm, not a kill remnant, and it is deterministic rather than a
coincidence of one replay.

The hazard is authored, and **the authoring did not change**. `assets/levels/level-01.json`
sector 1 carries `"hazards": {"debris": 1, "pickups": true}` at `28bd1e7` and at
`035cedb` alike (`git show 28bd1e7:assets/levels/level-01.json`). What changed is
commit `48ba6cc`, *"4.6 step 2 — the Director reads the level image"*: at
`28bd1e7` the level compiler existed and **the runtime read none of it**, so the
provisional Director admitted no debris inside the first 400 frames of a no-fire
opening; the step-2 Director reads sector 1's own `debris` count and admits it at
active gameplay frame 32.

**This is not a runtime defect.** A debris hazard the level authored, admitted on
sector entry, completing a clean full traversal — three times per 400 frames, at
the authored count of 1 concurrent — is the behaviour step 2 exists to deliver.
The clause's `[]` encoded the *provisional* Director's opening, and that opening
no longer exists.

It is the owner's **class (a)** in the 2026-09-28 taxonomy — the scenario no
longer contains the behaviour the clause was scripted around — with one
difference from §2-§5 of
[pickup-booster-clauses-2026-09-28.md](pickup-booster-clauses-2026-09-28.md):
here the stale conjunct is a **negative coverage** assertion (*there is no
debris*), not a scenario that drifted off a capsule. The standing authorisation
in plan §11 item 12 is for the pickup/booster family and does not reach it.

## 3. Three compliant alternatives

### Alternative 1 — re-point the conjunct at what the clause is about (RECOMMENDED)

Keep the cadence half exactly as it is, and replace *"no debris flight"* with the
property that still holds and is worth pinning: **every debris the Director
admits in the window completes a full traversal without contact or destruction**,
at the authored concurrency of 1. Concretely, assert that each difficulty's
`full_debris_flight_frames` is non-empty, that every entry is a whole traversal,
and that the flight length **falls with the world rate** — 116 / 104-105 / 94
frames against world 20 / 22.5 / 25 rows per second, which is the parallax
cadence reaching the debris layer and is the same subject the clause is named
for.

* Player-visible effect: none. **Trace/test code only, no runtime byte.**
* Cost: ~10 lines in `tests/runtime-wall-trace.test.mjs`. No observer change —
  `full_debris_flight_frames` already carries everything needed.
* Limitation: the clause stops proving the window is debris-free. That property
  is not recoverable and is not a property of the shipped game.
* Risk: low. It is the same shape as owner decisions 9 and 12 — the clause's
  subject is preserved and stated in the terms that now exist, the stale premise
  is dropped, and the figures stay measured rather than relaxed.

### Alternative 2 — move the scenario, keep the clause byte-for-byte

Make `[]` literally true again, either by ending the cadence measurement before
frame 31 or by pointing the three sessions at a sector authored with
`hazards.debris = 0`.

* Player-visible effect: none.
* Cost: the window shortening **does not work**, and this is arithmetic from the
  observer's own formula (`scripts/runtime-wall-trace.mjs:6583-6595`), not a
  measurement: the rates are `steps / (frames / 50)` and the invariant demands
  them **exact**. A 31-frame window on HARD gives 15 world steps over 0.62 s =
  24.19 rows/s, not 25, and the session's own
  `invariant(... parallax cadence diverged ...)` aborts the whole run. The
  debris-free-sector route therefore means **new level data authored only for the
  harness** — which is content that ships, or a review-variant flag, for a test.
* Limitation: a harness-only sector is level data no player ever sees, and it
  would have to be maintained against every future level change.
* Risk: medium. It adds shipped or flag-gated content to preserve a premise the
  game no longer has.

### Alternative 3 — record it as an accepted failure

Add the name to the recorded set: Appendix A 109 → 110, the default-build
baseline 108 → 109, documented as *the step-2 level image admits sector 1's
authored debris in the opening*.

* Player-visible effect: none. Zero bytes, zero cycles, zero code.
* Cost: one line in `docs/plans/hull-set-v1.md` Appendix A and the baseline
  figures in `docs/STATUS.md`.
* Limitation: this is the **only** clause that pins the introductory parallax
  cadence, and the whole assertion is one `deepEqual` — recording it as failing
  retires the cadence rates as a gate too, including the exact 20 / 22.5 / 25
  world rates. The observer's own `invariant` still checks those rates inside the
  run, so they are not unguarded, but the committed evidence stops being checked
  against them.
* Risk: medium-low, and it grows: each recorded failure is a gate that no longer
  discriminates.

## 4. What was true in the tree when the blocker was raised

Recorded as measured at that moment; §5 carries the post-repair figures.

* HEAD `035cedb` on `feat/director-level-data`; **nothing committed** by this
  session. The step-2 work is uncommitted, as the previous session left it, and
  `~/step2-wip.patch` is untouched.
* `npm run build` on the **default** target links and binds. `dist/void-strike-65.xex`
  `3c0aaea19026abbf699fdbef5cc8d25ce8beb63b16d4596b5b28a933b71e614e`,
  `dist/void-strike-65.atr`
  `0d0d9ba9e2333fb2f4edc7370cbc3dc19411a97eec0df7aca9f97fcb56b3138c` — the two
  the owner's item 2 requires, unmoved.
* `tests/runtime-evidence-binding.test.mjs` 2/2 green.
* `npm test`, default build, one full run: **852 tests, 740 pass, 109 fail,
  3 todo**. 108 of the 109 are recorded Appendix A names; the 109th recorded name
  (`showcase and asset sheets regenerate without ignored capture files`) **passes**,
  because `docs/media/manifest.json` in this tree is already regenerated against
  the current `dist/`. The one failure outside the set is this document's.
* The owner's item 1 is **complete**: nine of the ten re-pointed test files run
  92 tests directly, 91 pass, and the single failure
  (`PMG ownership preserves one P1/P2 enemy while fighter bursts use playfield glyphs`)
  is a recorded Appendix A name whose assertion (`/sta HPOSP1\s+sta HPOSP2/` in
  `src/main.s`) has nothing to do with the re-points. The tenth,
  `tests/build-variants.test.mjs`, builds a review variant and so was run inside
  the full suite, where its T8 passes — the variant writes `build/level-1-s2/`
  only, and not one byte of the default build's `build/`.

---

## 5. The repair, and the proof that it discriminates (2026-09-29)

`tests/runtime-wall-trace.test.mjs`, the clause renamed to
*"every difficulty preserves exact introductory parallax cadence **through the
debris layer**"* — the old name asserted the premise in its own words. The
cadence half is byte-for-byte unchanged. The retired `deepEqual` against
`[[0, []], [1, []], [2, []]]` is replaced by three conjuncts on the same field:

1. every difficulty measured at least one complete flight, and
   `full_debris_flight_seconds` agrees with `full_debris_flight_frames / 50`;
2. every flight's `seconds x measured_rows_per_second.debris` is the **28-row
   gameplay band** to within one row, and all three difficulties agree on that
   distance to within one row;
3. the lengths fall strictly as the rate rises — every EASY flight outlasts every
   MEDIUM one, every MEDIUM one outlasts every HARD one.

The 28 rows are MEASURED, not assumed: `build/runtime-wall-trace/cadence-0-sweep-nofire.csv`
frames 31-147 put the debris on exactly **28 distinct `entity_y` values**, 16 to
232 in 8-scanline steps — 224 scanlines / 8, the gameplay band. The one-row
tolerance is derived from frame-granularity sampling at both ends
(2/50 s x 15 rows/s = 0.6 rows on HARD), not fitted to the observed numbers.

**It discriminates.** The real test file, byte-identical, was run against three
mutated copies of the report (a mirror tree whose `docs/runtime-wall-trace.json`
is the only real file):

| Mutation | Result |
| --- | --- |
| A — a debris that does not complete its traversal: EASY flight 116 → **60** frames | **FAILS**: *"difficulty 0: a 60-frame flight at 12 rows/s crosses 14.399999999999999 rows, not the 28-row gameplay band"* |
| B — a length that does not match its own world rate: HARD given the EASY length, 94 → **116** | **FAILS**: *"difficulty 2: a 116-frame flight at 15 rows/s crosses 34.8 rows, not the 28-row gameplay band"* |
| C — a length **inside** the band but not matching its difficulty's cadence: EASY given the HARD rate and length (94 frames at 15 rows/s = 28.2 rows) | **FAILS** on conjunct 3 alone: *"every EASY flight must outlast every MEDIUM one: [94,94] vs [104,105]"* |
| CONTROL — the real report, unmutated | **PASSES**, all three difficulties |

Mutation C is why conjunct 3 is not decoration: a distance inside the band is not
by itself proof that the flight was paced by its own difficulty's cadence.
