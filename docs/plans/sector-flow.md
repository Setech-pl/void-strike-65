# Plan — sector flow: early end, `afterCleared`, C1 (feat/sector-flow)

**IMPLEMENTATION session, Phase A, 2026-10-08.** Branch `feat/sector-flow`
from `main` `5e68875`. The first session of the adopted order B
([gameplay-variety.md](gameplay-variety.md) §5: sector flow → S5 → M3-H → M3 →
window levers → M4 → M6). It also delivers C1, the prerequisite of M4
([w2-lights.md](w2-lights.md) §3.4). The design source is
[gameplay-variety.md](gameplay-variety.md) §3.8 and §7.1 Q10: the sector-flow
rules are the default for every level. Where this document differs from §3.8,
it says so (§2.4).

**Phase A only.** No source, cfg, level, test or evidence byte has changed yet.
The owner's brief arrived cut off after Phase A item 2. Phase B starts once the
rest of it arrives (owner answer, 2026-10-08).

## 0. Step 0 and baseline

### 0.1 Step 0

| Item | Value |
| --- | --- |
| `main` | `5e68875` docs(evidence-integrity): owner decision on item 7 |
| worktrees | the primary checkout only |
| ATR | `77d4cbf6aa74ccb98d2f62bb4e687f8bbbeef64407e839d27e1afc77a7e2358d` |
| boot | `4154b5f451de55f50d7e321bd2754f2230d0073d33320e49aaed561bc4745b04` |
| plans present | `docs/plans/gameplay-variety.md`, `docs/plans/evidence-integrity.md` |

### 0.2 Baseline, each figure with its source

| Figure | `main` | Source |
| --- | ---: | --- |
| Replays / clause failures / miss events | 57 / 0 / 0 | STATUS "Evidence integrity", `docs/runtime-wall-trace.json` |
| Worst fence margin | 1,472 (`2-sweep-fire6` f311) | STATUS "Evidence integrity" |
| DMA-on maximum | 31,304 (`memory-integrity-atr-2-hunt-fire5` f2388) | `gate.measured_wall_cycles_dma_on` |
| Boss stress, native | 8,434 / 8,500 | w2-lights §10.6, `tests/boss-stress.test.mjs` |
| Boss entry | 245 host frames (bound 250; 260 only as the torpedo's measured limit) | `coverage.director_level_complete` |
| Initial block | 13,618 B (cap 13,652) | `dist/void-strike-65-manifest.json` `initialContentBytes` |
| Transport | boot 107, extension 105, total 212 sectors | manifest `transportCapacity` |
| `DIRECTOR_RAM` free | 35 B (`$9FD7-$9FF9`) | `docs/memory-map.md:203` |
| `$AE00` window free | 1,185 B (`$B75F-$BBFF`) | `docs/memory-map.md:223` |
| Window record (record 7, start 179) | 10 sectors, 1,183 B packed of 1,259 (10 × 128 − 21): **76 B of room** | manifest `records[7]` |
| Director record (record 10, `$9D75`) | 5 sectors, 503 B packed of 619: 116 B of room | manifest `records[10]` |
| ATR menu frame | 551 (BASIC 542) against the 596 baseline; limit 603 | gameplay-variety §0.2, `boot_smoke` |
| Time to the boss E / M / H (natural-sweep bot) | 88.2 / 77.2 / 71.5 s (4,412 / 3,859 / 3,573 frames) | `coverage.director_level_complete` |
| Fight E / M / H | 71.7 / 93.9 / 120.7 s | same |
| Bot deaths E / M / H | 2 / 4 / 5 | same |
| Dead time after the capital E / M / H | 1,759 / 1,359 / 1,265 frames (61 / 54 / 55 %); tails 30.3 / 24.1 / 22.7 s | gameplay-variety §2.1, `scripts/measure-dead-time.mjs` |
| `npm test` | 1,211 tests, 1 recorded failure (`preview` @ `tests/preview.test.mjs:164`) | STATUS "Evidence integrity" |
| Integrity coverage in the boss sector | 3 replays, 2,669 boss frames; 102 laser-active frames in 2 replays (hunt 5, hunt 6) | evidence-integrity §4 |

No figure in the brief disagrees with STATUS.

## 1. Inventory (file:line at `5e68875`)

**Frame code and where it lives.** `director_c_world_row_tick` runs once per
world row, about every 2.0 / 2.2 / 2.5 frames (HARD / MEDIUM / EASY). It is
called through `director_world_row_tick` (`src/hybrid/c-asm-abi.s:149-150`).
Its body is in `DIRECTOR_C_CODE` (`src/c/director.c:427`, `:443-530`). That is
`DIRECTOR_RAM` `$9D89-$9FD6`, resident, transported in extension record 10.
Its helpers in `HYBRID_C_WINDOW` (`$AE00`, record 7) are
`compute_ceiling_row` (`:226-245`), `director_c_light_ceiling` (`:249-258`),
`heavy_ceiling` (`:261-271`), `director_c_try_event` (`:293-345`),
`compute_wave_end` (`:351-356`) and `enter_sector` (`:357-390`).
`advance_sector` (`:431-441`) is in `DIRECTOR_C_CODE`.

| What | Where | Today |
| --- | --- | --- |
| Space sector end | `director.c:482-499` | on the row count (`sector_len` in 8-row modules), whatever is live; `advance_sector()` at `:489` and `:495` |
| Capital end | `:465-475` | when the hull traversal leaves the sector OPEN |
| Boss sector | `:479-481` | never on a row; it ends at the boss's death |
| Armed wave holds the cursor | `:503-511` | `STATE_WAVE_REMAINING` (Heavy formations still to admit) or `light_wave_lock` (a Light wave not spent, or its Lights still live: `src/c/lifecycle.c:922-949`) |
| Wave arming | `:512-529` | the cursor's wave arms when its row is reached → `director_c_try_event()` (`:293`). A row-0 wave arms at sector entry (`enter_sector`, `:383-389`) |
| Other `try_event` callers | `src/hybrid/boss.s:2969` (the boss install arms the row-0 escort); `director_try_event` alias `c-asm-abi.s:239` | must keep arming unconditionally (the world stops in the boss sector, so no later row could retry) |
| Caps | `subtype_ceiling_light/heavy` `:193-194` (swarm 3/0, elite 1/2, capital 0/0, boss 1/0); the effective ceiling is min(authored nibble, runtime) (`:249-271`) | `heavy_request` (`:572`) treats the Heavy ceiling as zero or non-zero only: any non-zero ceiling admits a pair |
| Live population | `ENEMY_ACTIVE` `$4ECD` (0 inactive, 1 active, exploding); `ENEMY_LIVE_COUNT` `$5489`; `light_state[4]` (`lifecycle.c:333`; 0 empty, 1 escort, 2 free, 3 break-up pending) | the Director reads none of them today |
| `afterCleared` compiled | `scripts/level-compiler.mjs:792-800`: `wave_flags` bit 4 | not read: `director.c:96-98` defines the look and Heavy bits only |
| Data in use | level 1: no wave sets it. Level 2 (not in the ATR): none | `assets/levels/level-0{1,2}.json` |

## 2. The change

### 2.1 Three rules

All three run on world-row ticks only and only in SPACE sectors. The capital
and boss branches return before them (`:465-481`).

1. **Early end.** When the cursor has passed the sector's last wave
   (`STATE_WAVE_CURSOR == wave_end`), no Heavy formation is still to be
   admitted (`STATE_WAVE_REMAINING == 0`), the Light lock is down, and the
   field is clear (`ENEMY_ACTIVE == 0` and every `light_state` empty), the
   sector ends at once. The authored row count becomes the **no-kill cut**,
   the latest point at which the sector may end. The first two conditions
   need no new code, because the tick already returns on them (`:503-511`)
   before it reaches the cursor test (`:514`).
2. **`afterCleared`.** A wave whose `wave_flags` bit 4 is set arms when its row
   is reached **and** the field is clear. "Clear" uses the same test as rule 1,
   so an escort Light counts (Q10). The row stays a minimum delay. The flag is
   read only on the row-tick and sector-entry paths. `director_c_try_event`
   itself is unchanged, so the boss install (`boss.s:2969`) still arms
   unconditionally.
3. **C1.** When the row count is reached:
   * cancel the members not yet admitted (`STATE_WAVE_REMAINING` and
     `light_wave_remaining` to 0), as `enter_sector` already does today a tick
     later, so the hold waits only for what is live;
   * hold the end (return, the world keeps scrolling) while the live
     population exceeds the **next** sector's ceilings: `ENEMY_ACTIVE ≠ 0`
     where the next Heavy ceiling is 0, or more live Lights (non-empty
     `light_state`) than the next Light ceiling;
   * the test runs on every row tick of the hold and lets go on the first one
     where the population fits.

### 2.2 Code shape (C owns the decision; no ASM changes)

| Function | Segment | Called from | Does |
| --- | --- | --- | --- |
| `field_clear()` (static) | window | the two below | `ENEMY_ACTIVE \| light_state[0..3]` is 0 (unrolled, constant indices: four absolute loads, no loop) |
| `director_c_sector_spent()` | window | the tick, in place of the bare `return` at `:514-516` | `if field_clear(): advance_sector()` |
| `director_c_arm_wave()` | window | the tick (`:529`) and `enter_sector` (`:388`), in place of `director_c_try_event()` | bit 4 set and the field not clear: return; else `director_c_try_event()` |
| `director_c_sector_cut()` | window | the tick (`:489`, `:495`), in place of `advance_sector()` | cancel pending members; if the next sector is SPACE, compute its ceilings by stepping `STATE_SECTOR` and calling the existing `director_c_light_ceiling()` / `heavy_ceiling()`, then step back; hold or `advance_sector()` |

`advance_sector` stays in `DIRECTOR_C_CODE`, and the capital branch still
calls it directly. In the tick, the two cut sites and the arm site change only
their `jsr` target. Only the early-end site adds a call.

### 2.3 Bytes, cycles, transport

| Item | Expected → budgeted | Basis |
| --- | ---: | --- |
| `DIRECTOR_RAM` | **+3 → 8 B** (35 free) | **IC**: one added `jsr`; the cut and arm sites change target only |
| `$AE00` window | **+110 → 140 B** (1,185 free) | **IC** at cc65's density (gameplay-variety §3.8: 110 → 140) |
| Window record 7 | 76 B of packing room; +110 raw ≈ +85–100 packed (window C packs at 0.78), so **probably +1 extension sector** (10 → 11, total 212 → 213) | manifest; m3-waves-heavy §0.4 packing ratio |
| Initial block / boot sectors | **0 B / 0** | the window and the Director are extension records |
| ATR menu | +1 sector ≈ +2 to +4 frames (551 → ~555, limit 603) | **AN**: the deadline is 190 + 2 × sectors |
| Native cycles, early-end test | ~35 → 45 on each tail row tick (cursor at the end, nothing pending) | **IC** |
| Native cycles, `afterCleared` test | ~20 → 25 on an arming tick; +~25 when the flag is set | **IC** |
| Native cycles, C1 | ~250 → 300 on the cut tick and on each held tick (two ceiling look-ups plus four state loads) | **IC** |
| Binding row (`2-sweep-fire6` f311, sector 0, a Raider spawn on a rotate frame) | **expected 0 by path**: if sector 0's Raider wave still has formations pending at f311 (to be checked in Phase B), the tick returns at `:503-508` before any new code. Then layout shifts are the only risk | to be proven by native probes on both builds |
| DMA-on maximum | unmoved (pre-fence work) | memory "native cycles vs fence margin" |

**The layout risk.** Director window code is linked before
`encounter-director-lifecycle.o` (map: `HYBRID_C_WINDOW` director part `$22E`
B, then lifecycle `$33E`). Every new byte therefore moves `light_tick_body`,
`light_publish`, the Light kernel and the ASM window, and a hot branch can
start crossing a page (the precedent is roadmap 4.6 step 5). Proof: run the
native population harness on `main` (in a detached baseline worktree) and on
the branch, in the same state, and compare totals for the Light tick, publish,
shot, cell resolve and the Heavy member update. If a crossing appears, the fix
is placement: move the new functions after the tick functions, as step 5 did.
CSV diffs are not a valid proof, because an extra transport sector shifts every
frame from boot onward.

### 2.4 Where this differs from gameplay-variety §3.8

* **C1 is not applied when the next sector is a capital or a boss.** Both
  entries already wait for a full drain (`sector_c_drain_clear`; the boss's
  `FLAG_BOSS_DUE`), which is stricter than their caps (0/0, 1/0). Holding in
  the space sector instead would move the capital's sky change and its
  `CAPITAL_DUE` edge for no gain. Effect on the population: none.
* **The Heavy test is "ceiling is 0", not a count.** This matches
  `heavy_request`, which admits a whole pair under any non-zero ceiling. A
  count test could hold an elite sector against a legal pair.
* **`DIRECTOR_RAM` +3 → 8 B, not 20 → 24.** All the logic moves into window
  functions, and two of the three call sites only retarget an existing `jsr`.
* **`director_c_try_event` is not touched**, because of the boss install's
  unconditional arm (§1).

### 2.5 Level 1 data (owner answer 2026-10-08: drop the reserves and chain one Light wave)

| # | Today | After | Why |
| ---: | --- | --- | --- |
| 0 elite | 272 rows; R + W × 4 at 0, B × 4 at 88 | **unchanged** | the capital's due row is pinned (owner decision 3). The dead-time measurement shows no tail in sector 0 (gameplay-variety §2.1): the cut falls inside the Bomber wave, so the early end should not fire there. **To be checked with the probe in Phase B**; if it can fire, the capital's timing moves and that is reported |
| 2 swarm | 280 rows (21 % reserve); W × 3 (`flight-lead`, X 160) → I × 3 (X 88) | **W × 3 (`flight-lead`, X 160) → I × 3 (X 88) → W × 3 (plain, X 88)**; rows = the measured no-kill cut on HARD | the chained wave (owner). The column comes down the other side. Pausing between waves costs nothing: a Light wave holds the cursor (gameplay-variety §2.1, cause 5) |
| 3 elite (a) | 120 rows | **unchanged** | — |
| 4 elite, Bomber pair | 224 rows; B × 1 at **row 24** | B × 1 at **row 0, `afterCleared`** | the lead-in goes (49–61 frames). The Bombers come when (a)'s Raiders and their Interceptor are gone. This is the in-game use of rule 2 (gameplay-variety §5 #1). Rows = the no-kill cut |
| 5 elite (b) | 240 rows (22 % reserve) | rows = the shortest no-kill cut at which (b)'s Raiders still arrive on HARD with the Bomber pair carried in (**≈ 200**, from the W2 PROBE's frame 394 of 480; measured in Phase B) | gameplay-variety §3.8 gives ~188. That would cut (b)'s Raiders when no shot is fired, so the probe decides |

Decision 8 holds: R B R B R alternate as before, and the swarm adds no Heavy.
Variants a/b hold. The waves go from 7 to 8 of 20, and the image stays at 13
sectors.

**Time to the boss (natural-sweep bot) — ESTIMATE, measured in Phase B:**
88.2 / 77.2 / 71.5 s → **≈ 60 / 55 / 51 s** (E / M / H). That is the tails
(−30.3 / −24.1 / −22.7 s) and sector 4's lead-in (≈ −1 s) removed, plus the
chained column (≈ +2 to +4 s for a bot that kills it). Without kills, every
sector lasts its row count plus any C1 hold.

### 2.6 Tests

**RED on `main`'s build first, committed before the code:**
* a native Director test (the JS core over `build/encounter-director*`):
  - C1: a Heavy live at an elite sector's row-count end holds the end when the
    next sector is a swarm. Two live Lights hold the end when the next is an
    elite. Each releases on the first row tick after the population fits. The
    plain row-count cut still fires with nothing live.
  - early end: fires on a clear field once the last wave is spent. It does not
    fire with a formation pending, with the Light lock up, or with a live
    escort.
  - `afterCleared`: arms on the next row tick after the field clears, and not
    before. The row is a minimum. A wave without the flag arms on its row as
    today.
  - the boss install's arm (`director_c_try_event`) is unconditional.
* `tests/level-one-waves.test.mjs`: the swarm's three waves; the Bomber wave
  `afterCleared`; every wave arms on every difficulty (probe).

**Kept as is (owner answer):** "no swarm sector directly after an elite sector,
in every level source". It is still a hard test, now backed by C1.

**Re-pointed, each with its reason in the file:**
* "the swarm's Lights are gone before it ends … 20 % reserve" becomes "the
  elite after the swarm opens with at most its Light ceiling live, and (b)'s
  Raiders arrive" (C1 replaces F2's reserve);
* "one wave of each Light archetype" and "ends on the Interceptors" become
  "both archetypes, the chained column last";
* the timeline and timing pins that the shorter road moves
  (`level-one-equivalence`, `boss-band`, `plasma-fx`, `runtime-wall-trace`'s
  budgets).

### 2.7 Boss-sector integrity coverage (evidence-integrity §4)

The road to the boss gets shorter, so re-derive every integrity budget from the
measured runs:
* boss entry + the frames to the first laser + a margin;
* evasive 4 and hunt 7 keep their lives unheld and their game-over/restart
  coverage.

Requirement: at least three integrity replays with laser-active frames. If
three do not reach the lasers, add a sixth replay, chosen with the probe to
reach them.

### 2.8 STOPs (gameplay-variety §3.8, and the owner's standing decisions)

* `DIRECTOR_RAM` over 35 B;
* a worst fence margin under 1,300 that the row does not explain, or GO under
  500;
* any initial-block byte, or a new boot sector;
* ATR menu over 603;
* boss entry over 250 host frames;
* stress over 7,000 outside the boss sector or over 8,500 in it.

Phase B waits for the rest of the brief.
