# Plan — the Spread volley is all-or-nothing (spread-volley-fix)

**Session 2026-09-30.** Branch `fix/spread-volley-livelock` from `main`
`1c3da14` (`docs(diagnostics): the owner's Spread, capsule and level 2 capital
findings`). Diagnosis: [diagnostics/spread-debug-route-2026-09-30.md](../diagnostics/spread-debug-route-2026-09-30.md).
Every figure is **MEASURED** on `main` `1c3da14` (default build, ATR
`43e0495e…`, byte-identical to the step 4 evidence) unless it says ESTIMATE.

**Status: PLAN — Phase A.** Implementation follows in Phase B on this branch.

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

* The wall trace records POKEY channel 1 only, so no clause can see the shot
  sound on channel 4. A clause of the kind "Spread active + fire held ⇒ shot
  sounds occur" needs the trace header extended. This task does not extend it.
