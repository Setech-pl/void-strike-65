# S5-1 — the boss stress composition with a spawn on the kill frame: region 1 over 8,500 (`BLOCKED_BOSS_STRESS_SPAWN`, resolved by the owner's decision of 2026-10-09)

**Date:** 2026-10-09. **Branch:** `chore/s5-platform` from `main` `e52fcfe`
(ATR `977108bf…`, boot `a25c3e3a…`). **Plan:** [s5-boss-regions.md](../plans/s5-boss-regions.md)
§6 S5-1, the owner's answer Q4 (§7.1): the stress composition adds a weapon's
spawn on the kill frame; region 1 is measured with it first, before any other
change; over 8,500 the session STOPs and reports with the frames.

**Result: STOP** (commit `00b89df`). Region 1 measured **8,751** native on a
reachable frame (two kills) and **9,457** at worst (five meetings, unproven),
against 8,500.

## The owner's decision (2026-10-09, journal §AG) and the result

(A) and (B) together, the limit kept at 8,500:

1. **(B)** a gun never fires on a frame on which a module falls; its firing -
   or a salvo's next shot - moves to the next frame.
2. **(A)** the next-gun search made cheap (about 20 native a module), the
   firing order and every gun's behaviour unchanged.
3. Slot C: at most +25 B net for both, and not across its sector boundary.
4. **The 8,500 limit gates the reachable cases** (at most two boss hits a
   frame, AUD-04); the three-to-five-meeting figures below are information,
   not a gate.

**As built:** (B) in `boss_c_tick` (`src/c/boss.c`): a kill sets
`boss_expose_pending` to 2 and the tick counts it down first, so 1 after that
step is this frame's kill; the countdown that runs out then is put back to 1
and the burst's next step waits - **0 B of RAM**, +19 B of code. (A) the walk
moved to `_boss_next_armed` in slot C's ASM (`src/hybrid/boss.s`, segment
`BOSS_C_ASM`, 39 B), called by `boss_fire_next`, which keeps the policy:
**24 native a module (0-7), 25 (8-15)**, measured 24.4 / 24.5 a module on
region 1 / the fixture (was 100.8). **Slot C 1,659 → 1,663 B** (+4 net,
13 sectors, 1 B under the boundary; (B) alone was 1,678 and 14 sectors).

| Layout | Worst reachable before → after | Worst (≤ 5 meetings, information) before → after |
| --- | ---: | ---: |
| region 1 | 8,751 → **6,895** (f1: 2 stage hits [plate-a, plate-e], p 0, plate-d destroyed, gun-2 spawning) | 9,457 → 7,634 |
| tier-4 fixture, lasers warn | 9,393 → **7,744** (f1: 2 kills [plate-g, plate-h], p 16, plate-c destroyed; gun-2's spawn held to f2) | 9,995 → 8,446 |
| tier-4 fixture, lasers beam | 8,563 → **6,954** (same case) | 9,165 → 7,656 |

The case now runs until the held spawn lands (up to four frames); every
layout's worst frame is f1. **0 frames with both a kill and a spawn** over
7,583 (region 1) and 50,640 (fixture, each mode) kill cases with a gun due.
A probe (not evidence) of the composition the sweep does not build - a kill
pair on f1 with a gun due, then on f2 the held spawn, the exposure and two
fresh hits - peaks at 6,649 (region 1), 7,401 / 6,998 (fixture warn / beam).

Tests: `tests/boss-fire-rule.test.mjs` (the rule on single frames, a salvo's
step held, the cadence without a kill unchanged, the order and countdowns
against a model of `main`'s policy over 1,251 firings and 36 bursts on three
layouts and three difficulties, the walk's cost) - 3 RED on `main`'s build
(the two rules, the cost), GREEN after; `tests/boss-stress.test.mjs` (no
kill-and-spawn frame - RED on `main`: 10,187 such frames in region 1).

## The composition (what changed in the test)

Each case of the sweep runs once per armed non-emitter weapon, with the
controller's countdown (`_boss_countdown`) expiring on the meeting frame and
the cursor (`_boss_cursor`) on the armed module before that weapon, so the tick
calls `boss_fire_next` and `boss_fire` spawns the weapon's shot into the
hostile pool on that frame. The case's figure is the worst of those runs. A new
test asserts that every layout's sweep reaches kill frames with a spawn
(subject: region 1 6,927 of 15,166 cases; the fixture 50,426 of 101,280 per
laser mode) and that each layout's worst case is one. It was RED with the
arming disabled (subject empty: "region 1: no kill frame with a spawn").

## The figures at the STOP (M-N, the 6502 harness on `main` `e52fcfe`'s default build)

| Layout | Worst reachable (≤ 2 meetings) | Worst (≤ 5 meetings) | Before (no spawn) |
| --- | ---: | ---: | ---: |
| region 1 | **8,751**: 2 kills [plate-a, plate-g], columns 11 / 43, p 0, plate-d destroyed, gun-2 spawning | **9,457**: 5 kills [plate-a, plate-b, gun-2, plate-g, plate-h], p 16, plate-d destroyed, gun-2 spawning | 6,849 / 7,555 |
| tier-4 fixture, lasers warn | 9,393 | 9,995 | 7,732 / 8,434 |
| tier-4 fixture, lasers beam | 8,563 | 9,165 | 6,942 / 7,644 |

### The frames, per part (region 1)

The frame is the stress test's: DLI phase 0 + UPDATE + SECTOR_COMPLETION
(`boss_shots_late`) + MOTION + DLI phases 1–2. The meeting frame is f1; f2 and
f3 are the next frames with the player's kept shots moved.

| Case | Run | f1 total | UPDATE | of it: `_boss_c_tick` | `boss_fire` + queue | f2 | f3 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 kills, p 0 (worst reachable) | no fire | 6,849 | 6,309 | 88 | 34 | — | — |
| | gun-2 fires | **8,751** | 8,211 | **1,521** | **503** | — | — |
| 5 kills, p 16 (worst) | no fire | 7,555 | 6,619 | 88 | 34 | 6,347 | 4,346 |
| | gun-2 fires | **9,457** | 8,521 | **1,521** | **503** | 6,516 | 4,484 |
| no meeting, p 0 | no fire | 2,284 | 1,744 | 80 | 56 | — | — |
| | gun-2 fires | 4,137 | 3,597 | 1,513 | 476 | — | — |

**The spawn frame costs +1,902 native**, of which **+1,433 is the
controller's tick** and +469 `boss_fire` (the plan's 420–495, confirmed). The
tick's cost is `boss_fire_next`'s walk (`src/c/boss.c:390–398`): from the
cursor it steps module by module (`boss_bit_of` + `MASK_HAS`, ≈ 110 native a
step in cc65 code) to the next armed module. In region 1 as shipped only gun-2
(module 8) is armed when the fight begins (the entry state: cursor 8,
`_boss_armed` = `$0100`), and the cursor rests on it after it fires, so every
firing walks the **whole 13-module circle**. This is the natural state, not the
test's arming: the arming puts the cursor exactly where the game leaves it.

**Where the plan's estimate differs.** Plan §2.3 measured `_boss_c_tick`
reaching `boss_fire_next` at 326 native and §3.3 projected the composition at
8,434 + 495 = 8,976 on the fixture. The 326 was a short walk (the probe's
cursor next to the salvo gun); the shipped region's walk is the full circle.

## What a player would see

Nothing today: the real boss frames' worst fence margin is 8,650 (12 boss
sessions, 35,560 frames, the 2026-10-09 regeneration), and +1,902 native costs
≈ 3,800–4,600 of margin at the measured 2.0–2.4 per native cycle — about
4,000 over the GO line on such a frame (ESTIMATE from M parts). The 8,500 is a
budget proxy (owner decision Q8), not a missed frame. The finding is that the
budget's worst case was never composed, and that S5-3 (the field) and S5-4
(salvo bursts) plan their headroom against a figure 317 native (fixture) to
1,900 native too low.

## Alternatives put to the owner (before the decision)

| | Player-visible effect | Bytes | Native on the stress frame | Limitations | Risk |
| --- | --- | --- | --- | --- | --- |
| **(A) a cheap walk** — `boss_fire_next` steps a rotating 16-bit mask (or an ASM veneer) instead of `boss_bit_of` per module | none | slot C ±20 B (ESTIMATE; slot C has 168 free, but S5-2's finale needs 65 B of trims to stay at 13 sectors) | the walk ≈ 20 a step instead of ≈ 110: region 1's spawn frame +1,902 → ≈ +810, so ≈ 7,660 reachable / ≈ 8,370 worst; the fixture's (+1,561, a ≈ 10-step walk) → ≈ +670, so ≈ 8,400 reachable / ≈ 9,100 worst (**still over** for 5 meetings) — ESTIMATE | the fixture's unproven 3–5-meeting cases stay over | low (C gameplay logic, focused native tests) |
| **(B) no firing on a kill frame** — when the countdown expires on a frame with a kill (`boss_frame_heavy`), the tick keeps it at 1 and the weapon fires next frame | the shot one frame (20 ms) late, now and then | slot C / slot A ≈ 10 B | the spawn moves to f2: region 1 ≈ 6,347 + 1,902 ≈ 8,250 worst (ESTIMATE); the stress then composes the spawn on f2 | a kill on two consecutive frames can defer it again (bounded by the player's two meetings a frame) | low |
| **(C) the limit re-pinned on the fence basis** — 8,500 → the measured worst plus a reserve (region 1 9,457; the fixture 9,995) | none | 0 | 0 | consumes the boss sector's documented headroom that S5-3 (8,750 pin) and S5-4 plan with; their pins would need restating | none technically; a budget decision |

Note on the worst cases: gun-2 is among the five meetings and spawns on f1
because the AUD-04 cap lets two meetings land a frame; gun-2's meeting is kept
for a later frame, and a kill disarms its module (`boss_c_hit`), so no dead gun
fires.

(A) and (B) combine; (A) alone also cheapens every ordinary firing frame
(+1,433 → ≈ +300) and the finale's bursts of S5-2.

The owner chose (A) and (B) together (above).
