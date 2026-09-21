# M1 — native Light-population measurement (plan-light-multiplicity.md §4.3)

Branch `experiment/light-multiplicity`, forced-population build
(`node scripts/build.mjs --candidate --force-light-population --skip-runtime-measurement`),
tracer opt-in `--light-trace`, 2026-09-21. Every figure is MEASURED per frame
from the joined observer and Light CSVs and bucketed by the number of live
Light slots; `scripts/measure-light-population-native.mjs` is the join.

`standing` / `admission` / `kill-exit` are pre-fence cycles. `MARGIN` is the
fence margin, derived exactly as `pal-timing-audit.mjs` derives it, and is the
number the GO/NO-GO is stated against. `vectors` is the kernel vector-table
overhead: 3 cycles per entry, counted by PC in the tracer.

The `0 live` margin is not meaningful: that bucket contains capital-sector
rows, which have no fence. Every 1-4 bucket is a fighter row by construction,
because a Light exists only in a fighter sector.

## Ceiling 3 (shipped): eight sessions, 9,300 frames

```
== ALL SESSIONS ==
 0 live Light(s)
   standing  {"n":4109,"min":3619,"mean":11254,"max":22270}
   admission {"n":0}
   kill/exit {"n":0}
   vectors   {"n":4130,"min":3,"mean":16,"max":30}
   MARGIN    worst -12303, worst on a kill/exit frame -
 1 live Light(s)
   standing  {"n":1510,"min":6009,"mean":12605,"max":20036}
   admission {"n":13,"min":10544,"mean":14234,"max":23072}
   kill/exit {"n":20,"min":10274,"mean":15064,"max":19730}
   vectors   {"n":1545,"min":6,"mean":16,"max":27}
   MARGIN    worst 2205, worst on a kill/exit frame 5519
 2 live Light(s)
   standing  {"n":1135,"min":6750,"mean":13130,"max":18248}
   admission {"n":23,"min":10292,"mean":13644,"max":17151}
   kill/exit {"n":22,"min":10972,"mean":15837,"max":20334}
   vectors   {"n":1170,"min":6,"mean":17,"max":27}
   MARGIN    worst 4941, worst on a kill/exit frame 4915
 3 live Light(s)
   standing  {"n":328,"min":11591,"mean":14134,"max":18586}
   admission {"n":13,"min":13627,"mean":15069,"max":16668}
   kill/exit {"n":13,"min":14250,"mean":17108,"max":20308}
   vectors   {"n":342,"min":12,"mean":17,"max":24}
   MARGIN    worst 6663, worst on a kill/exit frame 4941
 4 live Light(s)
   standing  {"n":12,"min":13506,"mean":15122,"max":16948}
   admission {"n":1,"min":15040,"mean":15040,"max":15040}
   kill/exit {"n":1,"min":18492,"mean":18492,"max":18492}
   vectors   {"n":13,"min":15,"mean":17,"max":18}
   MARGIN    worst 8301, worst on a kill/exit frame 6757
```

## Ceiling 4 (`--light-ceiling=4`, diagnostic policy override): four sessions

```
== ALL SESSIONS ==
 0 live Light(s)
   standing  {"n":1909,"min":5011,"mean":10839,"max":22270}
   admission {"n":0}
   kill/exit {"n":0}
   vectors   {"n":1921,"min":6,"mean":16,"max":30}
   MARGIN    worst -12303, worst on a kill/exit frame -
 1 live Light(s)
   standing  {"n":949,"min":8754,"mean":12823,"max":20036}
   admission {"n":8,"min":10544,"mean":14667,"max":23072}
   kill/exit {"n":12,"min":10274,"mean":15093,"max":19730}
   vectors   {"n":972,"min":6,"mean":16,"max":27}
   MARGIN    worst 2205, worst on a kill/exit frame 5519
 2 live Light(s)
   standing  {"n":640,"min":9922,"mean":13421,"max":18248}
   admission {"n":15,"min":11340,"mean":14289,"max":17151}
   kill/exit {"n":14,"min":13867,"mean":16044,"max":20334}
   vectors   {"n":661,"min":12,"mean":17,"max":27}
   MARGIN    worst 4941, worst on a kill/exit frame 4915
 3 live Light(s)
   standing  {"n":105,"min":12018,"mean":14546,"max":17748}
   admission {"n":7,"min":13627,"mean":15313,"max":16668}
   kill/exit {"n":7,"min":15878,"mean":17813,"max":20308}
   vectors   {"n":113,"min":12,"mean":17,"max":24}
   MARGIN    worst 6757, worst on a kill/exit frame 4941
 4 live Light(s)
   standing  {"n":12,"min":13506,"mean":15122,"max":16948}
   admission {"n":1,"min":15040,"mean":15040,"max":15040}
   kill/exit {"n":1,"min":18492,"mean":18492,"max":18492}
   vectors   {"n":13,"min":15,"mean":17,"max":18}
   MARGIN    worst 8301, worst on a kill/exit frame 6757
```

## What it says

* **GO for a shipped ceiling of 3.** Plan §4.3 asks for a derived token-frame
  margin >= 500 cycles with three live Lights. MEASURED un-serialised — no
  token in the build, which is the negative control — the worst fence margin
  at three live Lights is **6,227 on a standing frame and 4,941 on a frame
  where a slot emptied**. Both are about ten times the threshold.
* **Light count is not what binds.** The worst margin in the whole set is
  **2,205**, and it is a **one-Light admission frame** (`2-evasive-fire3`,
  pre-fence 23,072). Margins get *larger* as the Light count rises, because
  the many-Light frames happen to sit in a favourable phase.
* **The admission frame is the expensive one**, exactly as plan §2.5 [C3]
  anticipated: +1,629 cycles over a standing frame at one live Light, +919 at
  three. That is what the one-expensive-event token is for, and it is why the
  token is the right step-4 work rather than a lower ceiling.
* **The vector overhead does not scale with Light count** ([C2]): 16-17 cycles
  per frame mean at every live count, 24-30 max. It is dominated by
  `light_backing` and `light_cell_resolve_sanitized`, which are entered once
  per captured cell by effects and debris, so it follows effect activity and
  not the Lights. Inlining the per-cell hot path would recover at most ~30
  cycles on a worst frame — it is NOT a useful mitigation, and the token is.
* **Coverage** (plan §5.1): 342 standing rows with three live Lights against
  the >= 200 clause, and 13 rows where a slot emptied while two others were
  live against the >= 5 clause. Both met without a new session.

---

# M2 — the token, 2026-09-21

## The proof: a FORCED coincidence, not a replay that happened to produce one

Plan §4.3 [C5]. M1's comfortable margins at three and four Lights were a
property of those 9,300 frames' raster phase; nothing makes a replay put three
Lights, a kill, an admission and a volley on one frame. `tests/light-multiplicity.test.mjs`
constructs that frame on production frames driven through the real main loop:
every live slot has a spent reload, so each wants to fire, and a player
PairShot sits on slot 0's cells, so that slot also dies.

MEASURED pre-fence cycles of that constructed frame (harness units, comparable
to each other and NOT to the native figures below):

| live Lights | with the token | budget poked to 4 | the token saves |
| ---: | ---: | ---: | ---: |
| 1 | 6,519 | 6,519 | **0** |
| 3 | 8,617 | 9,130 | **513** |
| 4 | 9,516 | 10,458 | **942** |

The zero at one Light is the right answer, not a failure: with one Light there
is only one expensive event on the frame, so there is nothing to serialise.
The token earns its keep exactly where the coincidence exists, and the saving
grows with the population - 513 at three, 942 at four.

The negative control is what makes this evidence: the same constructed frame
with `light_token_budget` poked to 4 runs every deferred event at once and
costs materially more. The test asserts that gap is at least 300 cycles, so if
the control ever stops firing the test fails rather than quietly proving
nothing.

## Native confirmation (not the proof): four sessions, forced population

```
== ALL SESSIONS ==
 0 live Light(s)
   standing  {"n":1909,"min":5020,"mean":10858,"max":22256}
   admission {"n":0}
   kill/exit {"n":0}
   vectors   {"n":1921,"min":6,"mean":16,"max":30}
   MARGIN    worst -12310, worst on a kill/exit frame -
 1 live Light(s)
   standing  {"n":944,"min":8822,"mean":12900,"max":20130}
   admission {"n":8,"min":10677,"mean":14832,"max":23191}
   kill/exit {"n":12,"min":10314,"mean":15237,"max":19996}
   vectors   {"n":968,"min":6,"mean":16,"max":27}
   MARGIN    worst 2058, worst on a kill/exit frame 5253
 2 live Light(s)
   standing  {"n":642,"min":10000,"mean":13551,"max":18398}
   admission {"n":16,"min":11570,"mean":14442,"max":17364}
   kill/exit {"n":16,"min":14224,"mean":16202,"max":20572}
   vectors   {"n":666,"min":12,"mean":17,"max":27}
   MARGIN    worst 4655, worst on a kill/exit frame 4677
 3 live Light(s)
   standing  {"n":117,"min":12177,"mean":14719,"max":17924}
   admission {"n":8,"min":13794,"mean":15498,"max":16888}
   kill/exit {"n":8,"min":16102,"mean":17991,"max":20622}
   vectors   {"n":125,"min":12,"mean":17,"max":24}
   MARGIN    worst 7325, worst on a kill/exit frame 4655
```

Worst fence margin at three live Lights **7,325 standing / 4,655 where a slot
emptied**, against 6,757 / 4,941 at M1 without the token - unchanged within
the noise of which frames the replays happen to produce, which is precisely
why the constructed frame above is the evidence and this is confirmation.
Four replays, 0 distinct miss events in each.

## Four Lights: evidence, not a decision

The forced coincidence clears at four Lights as well (9,516 pre-fence, 942
saved). Recorded for a later owner decision as instructed; the shipped ceiling
stays 3.

---

# Write-watch of the slot arrays, `$7FC4-$7FFF` (plan §5.6)

`node scripts/capacity-window-watch.mjs --window=0x7fc4 --window-bytes=60
--window-from=start`, four sessions, full lifecycle.

The tool reports FAIL, and that is the wrong question asked of a live state
range: `window_untouched_after_publish` is designed for an inert image, and
these 60 bytes are the Light slots, which the game writes every frame. What
matters is **who** writes them. Classifying the 256 sampled writes by PC:

| writer | writes |
| --- | ---: |
| MAIN boot / resident (`$2000-$3FFF`) — the A2 staging pass | 54 |
| `HYBRID_C_EXT` — Light C init and the cold admission path | 33 |
| code window C half — the Light C hot path | 110 |
| `LIGHT_KERNEL` — the Light ASM | 59 |
| **foreign** | **0** |

Every writer is the Light class or the boot-time A2 staging the range is
shared with by design, exactly as the `$8100` GLUE hold is. The list is capped
at `DFCAP_MAX_WRITES` = 256, so it is a sample and not a census — but it spans
boot, gameplay init and gameplay, which is where a stray writer would show.

The stronger guarantee is at link time and is not a sample: `HYBRID_LIGHT_SLOTS_RAM`
owns `$7FC4-$7FFF` exclusively, `src/hybrid/c-asm-abi.s` asserts it starts at
`PLAYFIELD_DLIST_END` and ends at or below `ENTITY_STATE` (`$8000`), and ld65
refuses any other segment there.

---

# Step 5 finding — a CPU regression the population delta could not see

## What was measured

Full PAL audit, 22 of ~69 replays before it was stopped to report this. **0
distinct miss events**, so every gate still passes — but two sessions came back
with margins far below anything `STATUS` records, and both A/B against a clean
`82c155b` worktree:

| session | `82c155b` margin | now | change |
| --- | ---: | ---: | ---: |
| `weapon-pickup-2-hunt-fire4` (4,000 frames) | 1,713 | **477** | **−1,236** |
| `director-complete-1-natural-sweep-fire0` (10,500 frames) | 1,831 | **357** | **−1,474** |

Both A/Bs are the same session id, the same emulator and the same flags, run
against a `git worktree` of `82c155b` — so the change is this branch's and not
the replay's.

## Why, and why the earlier headline was incomplete

`measure-population-cost-deltas.mjs` reports the **marginal** cost of a Light —
it A/Bs "a Light is alive" against "it is not". MEASURED now: **412 → 354
mean**, −14 %. (The −38 % reported after step 2 was true *at step 2*; steps 3
and 4 gave some of it back.)

That statistic is blind to the cost the multi-slot machinery pays on **every**
frame, alive or not, because that cost is present in both of its arms. The
routine census sees it (700 calls, mean / max):

| routine | `82c155b` | now | Δ mean | Δ **min** |
| --- | ---: | ---: | ---: | ---: |
| `light_publish` | 504 / 768 | 706 / 1,047 | +202 | 216 → 374 (**+158**) |
| `light_update` | 300 / 1,219 | 364 / 1,361 | +64 | 111 → 199 (**+88**) |
| `_enemy_c_light_tick` | 56 / 184 | 275 / 445 | +219 | — |
| `handle_collisions` | 838 / 2,251 | 838 / 2,251 | 0 | — |

The `min` column is the important one: **+246 cycles on a frame with no Light
alive at all**. Four empty-slot rejects in each of three loops, every frame,
forever. On a dense binding frame that is what eats the margin.

## The fix, and the trap in it

Gate the per-frame slot loops on how many slots are occupied, so an empty
sector pays nothing. This is the **maintained counter** already named as the
second mitigation after M1 — but the justification has changed: it is no
longer about the admission scan, it is about the three per-frame loops.

**The trap, found while designing it:** a state-derived limit is safe for
`light_update`'s loop and for `light_publish`'s RENDER loop, and **unsafe for
`light_publish`'s ERASE loop**. A slot that retired this frame has `state = 0`
but `screen_hi != 0` until the late window erases it; a limit derived from
state would skip it and leave its cells on screen. The erase loop must either
stay full-width or use a limit derived from `screen_hi`, which ASM owns.

That is a real design decision, not a tweak, and it is where this session
stopped rather than rushing it.

---

# Fix (a), and what the measurement says next

## Fix (a) landed

C derives `light_slot_limit` — the highest occupied slot plus one — once per
frame in `enemy_c_light_wave`, and `light_update` and `light_publish`'s
**render** loop walk only that many slots. The **erase** loop stays full-width,
for the reason that made this owner decision: a slot that retired this frame
has `state = 0` but `screen_hi` still set, and a state-derived limit there
would leave its cells on screen.

The scan is **unrolled on purpose**. The first attempt looped over the
volatile `light_slot` and MEASURED *worse* than the three ASM loops it existed
to skip; four constant-index loads cost a fraction of that.

MEASURED, routine census, cost on a frame with no Light alive:

| routine | `82c155b` | before (a) | after (a) |
| --- | ---: | ---: | ---: |
| `light_publish` min | 216 | 374 | **292** |
| `light_update` min | 111 | 199 | **147** |
| unconditional total | — | +246 | **+112** |

## But it recovered only ~80 cycles of ~1,300 on the audited sessions

| session | `82c155b` | before (a) | after (a) |
| --- | ---: | ---: | ---: |
| `weapon-pickup-2-hunt-fire4` | 1,713 | 477 | **551** |
| `director-complete-1-natural-sweep-fire0` | 1,831 | 357 | **438** |

Both remain under the ~1,000 the owner set as the threshold for coming back
with a measurement rather than reaching for fix (b). Here it is.

## The binding frame has NO Light alive, and the cost scales with PROJECTILES

The worst fighter row of `weapon-pickup-2-hunt-fire4` (margin 551, frame 1963)
has `live = 0`. So the cost is not per-Light. Bucketing every fighter row of
both runs by the number of player projectiles in flight — **the two histograms
are identical, `n` for `n`, so this session did not diverge and is a clean
A/B**:

| projectiles | n | mean pre-fence `82c155b` | now | delta |
| ---: | ---: | ---: | ---: | ---: |
| 0 | 33 | 13,028 | 13,185 | **+157** |
| 2 | 252 | 10,776 | 11,213 | +437 |
| 4 | 469 | 11,603 | 12,167 | +564 |
| 6 | 538 | 11,641 | 12,243 | +602 |
| 9 | 122 | 12,785 | 13,588 | **+803** |

A straight line: intercept **≈ +160** (the unconditional loop cost, matching
the census) and slope **≈ +70 cycles per projectile in flight**.

**+70 per projectile is `light_shot`.** It is called once per player PairShot
per frame and now walks four slots where it used to test one. Fix (a) never
touched it.

## The proposed fix is neither (a) nor (b)

Gate `light_shot` on the same `light_slot_limit`. At nine projectiles that
removes ~630 of the ~803; fix (b) — an ASM `screen_hi`-derived limit for the
erase loop — addresses only the remaining ~76 of intercept and is the riskier
change of the two.

**The ordering trap, stated before it is walked into.** `handle_collisions`
runs *before* `light_update`, so `light_shot` would read the limit derived on
the *previous* frame, while `enemy_c_spawn_raiders` admits *earlier in this
one*. A freshly admitted slot would be outside the limit and unhittable for a
frame. Today that is harmless only because admission sets `y = 0`, which
`light_shot`'s own gameplay-top test rejects anyway — an implicit chain, and
exactly the kind this project has been removing.

The fix that needs no such chain: make `light_admit` **raise**
`light_slot_limit` as it fills a slot. The limit is then always at least the
highest occupied slot, whoever reads it and whenever — derived once per frame
and monotonic within it. Stale-high stays safe by construction; stale-low
becomes impossible rather than merely unlikely.
