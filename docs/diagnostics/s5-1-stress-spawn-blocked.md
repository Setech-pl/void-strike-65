# S5-1 — the boss stress composition with a spawn on the kill frame: region 1 over 8,500 (`BLOCKED_BOSS_STRESS_SPAWN`)

**Date:** 2026-10-09. **Branch:** `chore/s5-platform` from `main` `e52fcfe`
(ATR `977108bf…`, boot `a25c3e3a…`). **Plan:** [s5-boss-regions.md](../plans/s5-boss-regions.md)
§6 S5-1, the owner's answer Q4 (§7.1): the stress composition adds a weapon's
spawn on the kill frame; region 1 is measured with it first, before any other
change; over 8,500 the session STOPs and reports with the frames.

**Result: STOP.** Region 1 measures **8,751** native on a reachable frame
(two kills) and **9,457** at worst (five meetings, unproven), against 8,500.
Nothing else in S5-1 was started; no source, cfg, script, asset or evidence
byte changed. The only change is the stress test's composition
(`tests/boss-stress.test.mjs`), which now fails on the shipped game by design
until the owner decides (below).

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

## The figures (M-N, the 6502 harness on `main` `e52fcfe`'s default build)

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

## Alternatives for the owner (none implemented)

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

**Smallest recovery to unblock S5-1:** an owner decision among (A), (B), (C)
or a combination, and the limit that S5-1 then pins for region 1 and the
fixture. S5-1's other scope (`-xl`, PORTB, the HUD backup, slot F, regions 2–4
on disk) does not depend on it, but the brief orders the measurement first and
the STOP before any other change.
