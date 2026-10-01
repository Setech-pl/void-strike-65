# Plan — the Spread volley is all-or-nothing (spread-volley-fix)

**Session 2026-09-30.** Branch `fix/spread-volley-livelock` from `main`
`1c3da14` (`docs(diagnostics): the owner's Spread, capsule and level 2 capital
findings`). Diagnosis: [diagnostics/spread-debug-route-2026-09-30.md](../diagnostics/spread-debug-route-2026-09-30.md).
Every figure is **MEASURED** on `main` `1c3da14` (default build, ATR
`43e0495e…`, byte-identical to the step 4 evidence) unless it says ESTIMATE.

**Status: IMPLEMENTED — `OWNER-SMOKE CANDIDATE`, awaiting the owner's hardware
smoke.** Phase A (§1-§7) is the plan as committed. §8 records what was built
and measured, including where it departs from §3-§4.

---

## 1. Owner decision (2026-09-30)

A Spread volley (left, centre, right) is admitted only when three slots are free
within the active limit. Then all three are allocated in the same frame, the
burst advances, and the normal shot sound starts, exactly as a volley from an
empty pool does today. If fewer than three are free, nothing is allocated that
frame and nothing is retained. The fire event stays as the one pending emission
(no catch-up, no accumulation) and is retried next frame. The centre follow-up
28 frames later, the side-shot start offset and drift, the 500-frame duration and
the sound itself are unchanged.

`docs/game-design.md` §"Spread Shot" already says "A blocked allocation remains
one pending PairShot without accumulating catch-up fire". That is the same rule,
so the design docs do not contradict it. The only text that does is the name and
assertions of `tests/weapon-pickup-spread-shot.test.mjs:316`, "admits centre
before an atomic side pair". That test predates the volley (`db64ca8`), and §5
rewrites it.

## 2. The fire path, verified against the repo

The diagnosis matches the source at `1c3da14`. Line numbers are `src/main.s`:

| Step | Routine | Segment → transport |
| --- | --- | --- |
| fire held, burst state machine | `update_player_fighter_weapon` `:4153` (`$2C75`) | `CODE` → initial block (LZ, resident suffix from `$21C1`) |
| emission; a rejected one is retried next frame, uncounted | `update_player_fighter_weapon_emit` `:4182-4184` | same |
| booster dispatch | `allocate_player_fighter_projectile` `:4218` | same |
| **volley: left, right, then centre; only the centre decides** | `allocate_player_fighter_spread_projectiles` `:4239-4252` (`$2D07`, 29 B with `…_rejected`) | same |
| one slot scan within `PLAYER_FIGHTER_PROJECTILE_ACTIVE_LIMIT` (5) | `allocate_player_fighter_projectile_one` `:4266` | same |
| shot sound, POKEY channel 4, `fire_timer = $32` | `play_player_fighter_projectile_sound` `:4315` | same |
| burst counts / intervals (Spread: 2 events, 28 frames) | `player_fighter_pairshot_burst_counts`, `player_fighter_fire_intervals` | same |

The native harness on `main` (§5, `executeSpreadShotFireHeldTrace`, fire held
for 200 frames) gives:

| volley starts with | centre | left | right | shot sounds | frames with pool full |
| --- | ---: | ---: | ---: | ---: | ---: |
| empty pool | 10 | 5 | 5 | 10 | 0 |
| 4 shots live (Y 190/150/110/70) | **0** | **29** | **0** | **0** | **200** |

The diagnosis measured 32 left with its own, uncommitted seeding. The mechanism
is the same, and so is every other figure.

## 3. The change

**One new routine, `player_fighter_spread_volley_sides`, in `PICKUP_CODE`.** It
counts free slots within the active limit, stopping at the third one. With
three free, it allocates the left and the right shot and returns C=1. The
unchanged centre path in `CODE` then allocates the centre. That cannot fail,
because the count guaranteed it, and it starts the sound. With fewer than
three free, it allocates nothing and returns C=0. `CODE` takes the existing
`…_rejected` exit, and the controller retries next frame as it does today.

`allocate_player_fighter_spread_projectiles` in `CODE` replaces its two inline
side allocations (10 B) with `jsr` + `bcc …_rejected` (5 B). The follow-up path,
the centre allocation and the sound are untouched. The slot order stays left,
right, centre, lowest free first, as today.

**Why `PICKUP_CODE` and not `CODE`.** `MAIN` (`CODE` + `RODATA`, `$2000-$3FFF`)
is exactly full. Its only slack, `LOADER_SPLASH_CODE_SLACK` (57 B), sits before
the fire path, and taking bytes from it slides about 1.3 KB of CODE, including
`update_fighter_projectiles`. Page-crossing cost from such a slide has been
measured before (+17 cycles). And `CODE` from `$21C1` travels LZ-packed in the
**initial block**, which the owner capped at 13,626 B. New code bytes there
would grow it. `PICKUP_CODE` ships in extension record 2 and has a 75 B RAM
tail (`$8B1C-$8B66`) before the collision module.

**Why not C.** AGENTS.md puts fire policy in C by default. The player weapon
controller is existing ASM, and the brief limits this task to the fire path.
Moving the controller to C is a separate task, and it is not proposed here.

## 4. Expected cost (ESTIMATE, verified in Phase B)

| | Expected |
| --- | --- |
| `CODE` | 29 → 24 B of routine + **5 B zero pad** after the `rts`. `CODE` size unchanged (`$117E`); no label outside the routine moves; `RODATA` stays at `$317E` |
| `PICKUP_CODE` | **+27 B** (`$8B1C-$8B36`); RAM tail 75 → 48 B |
| **net** | **+22 B** of code (27 − 5) |
| initial block | 5 B of code become zeros: packed content **≤ 13,626 B** (expected −0…5 B). **No initial-block byte is added** |
| extension record 2 | 1,120 → **1,147 B** of its 9 sectors' 1,152 B. No new sector; total 208 unchanged |
| boot → menu | about +27 B through `stage_boot_streams` and the pickup copy: ESTIMATE +0.5-1 k cycles before `show_loader`, with NMI and DMA off. The ATR menu frame must stay 602; the boot smoke measures it |
| cycles, volley admitted | count loop + `jsr`/`bcc`, `jmp` tail for the right side: **+50 cycles** (three free at the top) **to +74** (third free found last), on that frame only, at most once per ~40 frames |
| cycles, volley rejected | count (≤ 5 slots) instead of three failing scans: **−100 to −150 cycles** on every blocked frame |
| cycles, follow-up and non-Spread | 0 |

The worst frame is `director-complete-2` f5815, with a fence margin of 788. The
change adds at most one volley's count to any frame. A GO needs ≥ 500.

## 5. Tests

RED on `main`'s build, GREEN after. The native harness lives in
`scripts/weapon-pickup-runtime.mjs`.

**New: `tests/spread-volley-admission.test.mjs`**
1. Fire held for 200 frames, volley started with 4 shots live. Every volley is
   complete: left, centre and right in equal numbers, and no side shot without
   its centre in the same frame. The shot sound starts. On `main`: 0 / 29 / 0,
   0 sounds.
2. Empty pool, fire held for 200 frames: 10 centre / 5 left / 5 right, 10
   sounds, the same as `main`.
3. No catch-up, with a full pool (5 live) and fire held. Every emission is a
   complete volley or a single centre follow-up. The first emission after the
   blocked frames is one volley. The next is its follow-up, at least 28 frames
   later, never a second volley.

**The three recorded failures in `tests/weapon-pickup-spread-shot.test.mjs`.**
Each is re-pinned to the build, with sources. Every behavioural assertion is
kept or, where an owner decision replaced it, rewritten and named.
* `:188` "one Spread emission is an unambiguous three-projectile fan": its
  volley rode on `executeSpreadShotTrace`'s drop cycle. That cycle no longer
  reaches Spread, because Interceptor kills do not count (recorded failures
  `:82`, `:149`). This is a **stale scenario, not a stale pin**. It moves to a
  focused volley trace. The slot order is re-pinned to the build's left, right,
  centre (`db64ca8`).
* `:316` "…admits centre before an atomic side pair". The harness called the
  allocator with `BURST_REMAINING = 0`, so it only ever exercised the centre
  follow-up (stale since `db64ca8`). The pins `[10, 6, 3, 6]` become the
  build's pool slots and active limit, 5 and 5
  (`assets/graphics/fighter-weapons.json`). The partial-fan assertions are
  rewritten to the all-or-nothing rule.
* `:352` "the configured 28-frame Spread cooldown avoids catch-up at the active
  limit". The harness modelled one fan every 28 frames, the contract before
  `db64ca8`. It now drives the real controller: a volley, then the follow-up.

## 6. Documentation

* `docs/game-design.md` §"Implemented boosters": the capsule counter counts
  every Heavy (Raider or Bomber) and every debris destroyed by a player shot,
  one shared counter, capsule on the third (`src/main.s:5289`,
  `:11965-11976`). This is the code as it is; the code is not changed.
* `docs/game-design.md` §"Spread Shot": the all-or-nothing admission.
* `docs/memory-map.md`: the `PICKUP_CODE` tail and the `CODE` pad.
* `docs/STATUS.md`: the candidate section.

## 7. Follow-ups (not in this task)

* The wall trace records POKEY channel 1 only (`audf1`/`audc1`), so no clause
  can see the shot sound's POKEY writes on channel 4. It does record the
  shot's software phase (`fire_sfx` = `fire_timer` ≠ 0, `fire_timer_value`),
  the burst state (`player_burst_state/remaining/timer`) and entries into
  `play_player_fighter_projectile_sound` (`fire_accept_calls`). A clause such
  as "Spread active + fire held ⇒ shot sounds occur" could be built on those
  without extending the header; a clause on the POKEY register itself would
  need the header extended. This task does neither.
* Per-side shot counts exist only in the per-slot PairShot journal
  (`DFTRACE_PLAYER_PAIRSHOT_OUTPUT`), which the harness enables for the
  PairShot sessions alone; §8.5 used it in diagnostic runs.
* Fire policy is ASM in `CODE` (AGENTS.md puts it in C by default); moving the
  player weapon controller to C is a separate task.

## 8. As implemented and measured (Phase B)

### 8.1 Where it departs from §3-§4

**Record 2 had 11 B of room, not 32.** A record holds `sectors × 128 − 21` B
(the chunk footer, `scripts/build.mjs` `sectorsFor`), so 9 sectors carry 1,131 B
and the pickup record was at 1,120. The §3 design (+27 B in `PICKUP_CODE`) built
to 1,145 B in **10** sectors (extension 101 → 102, total 209) and was dropped
without a commit. As built:

* **`PICKUP_CODE` keeps only the two side allocations**,
  `player_fighter_spread_volley_sides`, 10 B at `$8B1C-$8B25` (left, then a
  `jmp` tail for the right).
* **The count and the admission are in `CODE`**, paid for by reordering the
  fire path so that it costs no `CODE` byte. `allocate_player_fighter_projectile_one`
  moves first. The booster dispatch becomes a `beq` into the Spread routine, and
  a normal shot's `bcs` reaches the sound directly. The Spread routine falls
  through into `play_player_fighter_projectile_sound` instead of `jmp`-ing to
  it, and the post-burst `bne`/`jmp` becomes a `beq` to the burst start (same
  behaviour). The 3 B this frees are `spread_volley_code_slack` (zeros after an
  `rts`), so the sound routine stays at `$2D65` and `RODATA` at `$317E`.
* A first CODE layout with a 1 B pad packed the initial block to **13,627 B**,
  one over the cap. The post-burst `beq` (−2 B, pad 1 → 3) brought it back to
  **13,626 B**.

### 8.2 Bytes (MEASURED, `build/void-strike-65.map`, `build/manifest.json`)

| | `main` `1c3da14` | this branch |
| --- | ---: | ---: |
| `CODE` / `RODATA` start | 4,478 B / `$317E` | **4,478 B / `$317E`** |
| `PICKUP_CODE` / free tail before `$8B67` | 934 / 75 B | **944 / 65 B** |
| initial block content (owner cap 13,626) | 13,626 B | **13,626 B** |
| extension record 2 | 1,120 B, 9 sectors | **1,128 B, 9 sectors** (3 B before a tenth) |
| boot / extension / total sectors | 107 / 101 / 208 | **107 / 101 / 208** |
| BROADSIDE, ENTITY_CODE, sector reader, Director link | — | byte-identical |

Only labels inside `$2CD0-$2D64` moved. The two burst tables moved −2 B and
stay inside page `$2C`.

### 8.3 Cycles (MEASURED, native, `executeSpreadShotAdmissionCycleSweep`)

`update_player_fighter_weapon` on the frame a fire event is due, for every one
of the 32 occupancy patterns of the five active slots, `main` → branch:

| event | patterns | delta |
| --- | ---: | --- |
| volley admitted (≥ 3 free) | 16 | **+46 … +70** |
| volley blocked (< 3 free; on `main` a partial fan) | 16 | **−208 … −298** |
| centre follow-up | 32 | −4 |
| controller maximum on a volley-due frame | — | 516 → **562** (+46) |

### 8.4 Timing (MEASURED, regenerated evidence)

DMA-on maximum 31,626 → **31,121**. `main`'s five heaviest frames were all
inside the stuck Spread window of `director-complete-0` (f8619-f8654). There,
every frame ran three failing slot scans with the pool full. The new maximum,
`director-complete-2` f5797, is 31,121 on both builds. PAL audit, 56 replays:
0 distinct miss events. The worst fence margin is 788 → **785**, on the same
row (`director-complete-2` f5815, a Shield frame in the post-burst pause, where
no Spread code runs).

### 8.5 The four replay windows

Each row is one Spread activation in the default evidence, at the frames the
diagnosis named. The four activations begin on the same frame on both builds,
because the replays are identical until the first crowded volley. Per-side
counts come from the per-slot PairShot journal (`DFTRACE_PLAYER_PAIRSHOT_OUTPUT`),
in diagnostic `--only-session` runs. Each run's main CSV is byte-identical to
the evidence CSV it shadows, and none of them is evidence.

| replay | from | `main`: length, shot-sound frames, fire events, L / C / R | branch: length, shot-sound frames, fire events, L / C / R |
| --- | ---: | --- | --- |
| `capital-muzzle-ring-2-sweep-fire4` | 2280 | 405, **6**, 0, 59 / 0 / 2 | 500, **154**, 25, 13 / 25 / 13 |
| `director-complete-0-natural-sweep-fire0` | 8303 | 361, **7**, 1, 51 / 0 / 5 | 259, **79**, 13, 6 / 12 / 6 (+1 plain) |
| `director-complete-2-natural-sweep-fire0` | 6326 | 500, **11**, 1, 71 / 1 / 2 | 370, **113**, 19, 9 / 19 / 9 |
| `memory-integrity-atr-2-hunt-fire6` | 2517 | 500, **3**, 0, 113 / 0 / 29 | 500, **153**, 25, 13 / 25 / 13 |

On the branch every window has as many left as right shots, and centre =
volleys + follow-ups. `director-complete-0`'s one plain shot is a normal
PairShot fired on the activation's first frame. On `main` the pool sat at 5 for
403 / 360 / 493 / 498 frames of those windows.
On the branch the figures are 9 / 11 / 14 / 3. A healthy activation for
comparison (`capital-muzzle-ring` f466, the same on both builds) is 500 frames,
148 sound frames, 25 fire events, 12 / 25 / 12.

### 8.6 Debris visibility gate — the one new gate result (owner: pre-existing)

`--debris-gate-only` fails on the branch:
`debris-gate-capital-muzzle-ring-2-sweep-fire4`, capital phase, 1 blank of 990
frames in view, 1 disappearance. On `main` it is 0 of 1,133 (A/B in a detached
`main` worktree). The replay is identical up to game frame 2660 and then diverges:
the Spread volleys now fire, and the first game over moves from host frame 3911
to 4544. The blank is host frame 4519, game frame 3794, sector 2, the debris at
x 120, y 48. The two cells hold 7/14 and 8/27 of the debris glyph, and the rest
is foreign pixels. Host frame 4518 is the player's final death: the game frame
stops advancing and there is no erase/render that frame. This is the
documented **debris death-frame blink** (STATUS, known open defects, found
2026-09-17), which a different replay now reaches. No proof of which store
writes the cells was made. **Owner decision (2026-10-01): treat it as
pre-existing; the clause is unchanged.**

The other two mode-gated failures are identical on `main`:
`raider-sector-atr-hard` "did not return to post-sector OPEN", and the remnant
gate's 63 kills against 62 explosions.

### 8.7 Tests (MEASURED)

* New `tests/spread-volley-admission.test.mjs`: 3 tests. The crowded-pool test
  and the no-catch-up test are RED on `main` (the first emission is a lone left
  shot). The empty-pool guard is green on both. On the branch all 3 pass:
  9 centre / 5 left / 5 right, 9 sounds with 4 shots live (`main`
  0 / 29 / 0 / 0), and 10 / 5 / 5 / 10 from an empty pool on both.
* The three recorded failures pass and leave the recorded set: `:188`
  "one Spread emission is an unambiguous three-projectile fan", `:316` (renamed
  "Spread respects the five-projectile active budget and admits its volley
  whole or not at all") and `:352` "the configured 28-frame Spread cooldown
  avoids catch-up at the active limit".
* Full `npm test` on the default build, once: **883 tests, 774 pass, 106 fail,
  3 todo**. By name, that is the recorded 108 minus those three, plus one new:
  `tests/light-interceptor.test.mjs:468`, the `PICKUP_CODE` window-tail pin
  75 → 65, which this change spends. The owner approved re-recording it
  (2026-10-01). It was re-recorded, and that file was re-run (14/14). The
  suite was not re-run in full, so the recorded set is now **105**.
