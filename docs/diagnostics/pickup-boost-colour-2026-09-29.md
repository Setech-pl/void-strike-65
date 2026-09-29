# The pickup capsule on `PLAYER3` — the measurements behind the change

**Implementation session, 2026-09-29**, branch `feat/pickup-boost-colour` from
`main` `2c4c193`, worktree `../dark-fighter-pickup-boost`. Plan:
[../plans/pickup-colour.md](../plans/pickup-colour.md), Option 2 variant **2a**,
owner decisions of 2026-09-28 in its §7.

Everything below is **MEASURED** on this branch against a detached `main`
worktree built the same way, unless it says ESTIMATE.

---

## 1. What this file is for

Three things this change produced are worth keeping beyond the commit messages:

1. the fire-delay sweep of the three delay-tuned pickup scenarios, before and
   after the observer moved to `PLAYER3`;
2. the broadside-residue finding — whether a broadside warning mark can survive
   into an `OPEN` frame, where `PRIOR $00` would show `M1`/`M2` in the Heavy
   hull colour and `M3` in the capsule's boost colour;
3. the harness defect the change exposed, which had five score assertions in
   four test files reading a leftover boot-staging byte.

---

## 2. Fire-delay sweep — the three delay-tuned scenarios

Owner decision 9 (plan §7): the delay-tuned pickup scenarios are made **robust**
rather than re-tuned to a single fire delay. Each session was run on its own
(`--only-session`) at fire delays **4, 5, 6 and 8**, on this branch's build, with
the real clause code — the focused-run early return was moved below the
post-loop pickup blocks in a throwaway copy of `scripts/runtime-wall-trace.mjs`
so that the traversal clause actually evaluates. Nothing in that copy shipped.

| Session | passed before (recorded in the script's own comments) | 4 | 5 | 6 | 8 |
| --- | --- | :-: | :-: | :-: | :-: |
| `weapon-pickup-contact-2-hunt` | 4 (authored) | **PASS** | **PASS** | **PASS** | **PASS** |
| `weapon-pickup-overlap-2-hunt` | **5 or 48 only** | **PASS** | **PASS** | **PASS** | **PASS** |
| `weapon-pickup-traversal-2-observe` | **8 only** | FAIL | FAIL | FAIL | **PASS** |

### 2.1 The overlap session is robust now, and this is why

Its raster clause counts the capsule's own pixels in a 16-pixel column over the
whole captured image and requires the count to fall under 40 three frames after
collection. At fire delay 4 it read 46 px on two of those three frames, which is
what forced the re-script to 5. The script's own measurement says what those 46
pixels were: **a player projectile in the capsule's column**, counted as capsule
pixels because the capsule was the GTIA fifth player in `COLPF3` and the
fighter's missiles took `COLPF3` too.

The capsule is one `PLAYER3` image in `COLPM3` now, and **nothing else in
fighter space writes `COLPM3`**. The contamination is not reduced, it is
impossible, and the clause passes at every delay measured. This is the owner's
"robust rather than re-tuned", achieved by the observer change itself.

### 2.2 The traversal session is still delay-bound, and not for a capsule reason

Its clause is `entity_active_mask === 2 && plane_rows === 16 &&
plane_union === 255 && draw_calls === 1` over 108 consecutive ACTIVE frames.
Measured conjunct by conjunct on the ACTIVE window of each replay:

| fire delay | ACTIVE frames | `entity_active_mask !== 2` | `plane_rows !== 16` | `plane_union !== 255` | `draw_calls !== 1` |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 4 | 108 | **26** | 0 | 0 | 0 |
| 5 | 108 | **27** | 0 | 0 | 0 |
| 8 | 108 | 0 | 0 | 0 | 0 |

**The capsule's own three conjuncts hold on 108/108 frames at every delay**, now
measured on `PLAYER3`. The only conjunct that ever fails is bit 0 of
`entity_active_mask` — a **debris** sharing the frame. The clause requires the
capsule's whole 108-frame traversal to fall inside a debris-clear window, the
sector's debris cadence decides where that window is, and the window leaves
about 20 frames of slack anywhere in the replay. That is a scenario property of
the Director's hazard cadence; it has nothing to do with the capsule, its plane
or its colour, and the observer move could not and did not change it.

It is a class (a) clause under the owner's rule of 2026-09-28 — the scenario
moves, the clause is untouched — so the session stays at fire delay 8, and this
table is the reason, stated rather than assumed.

### 2.3 The booster-cycle hunt pair — three of the four, for the same reason

The fourth delay-tuned scenario is the `hunt` half of the `memory-integrity-160s`
pair, whose post-loop clause asks for **10 weapon-booster cycles** across the
four 4,000-frame replays. The `evasive` half is fixed at fire delay 4 and
collects **0** in both media, so the whole count comes from the `hunt` pair.
Each session was run on its own and the clause evaluated from its CSV, counting
the collection event (`events` bit 19) exactly as the clause does.

| hunt fire delay | XEX | ATR | booster cycles | `>= 10` | XEX/ATR parity |
| ---: | ---: | ---: | ---: | :-: | :-: |
| 4 (the authored delay) | 4 | 4 | **8** | FAIL | OK |
| **5** (the current scenario) | 5 | 5 | **10** | **PASS** | OK |
| 6 | 6 | 6 | **12** | **PASS** | OK |
| 8 | 5 | 5 | **10** | **PASS** | OK |

Three of the four now pass where only 5 was known to. The one that does not
fails for the same class of reason as the traversal session: the clause counts
**how many capsules a fixed 4,000-frame window contains**, which the Heavy kill
cadence decides, and at delay 4 the fifth capsule is not missing but late. No
observer change can move it, and the clause, its threshold and the XEX/ATR
parity clause beside it are untouched.

### 2.4 Summary against the owner's "robust rather than re-tuned"

| scenario | what made it delay-bound | robust now? |
| --- | --- | :-: |
| `weapon-pickup-overlap` | the capsule shared `COLPF3` with the player's shots, so a shot in its column counted as capsule pixels | **yes — 4/4 delays** |
| `weapon-pickup-contact` | — (already passed at its authored delay) | **yes — 4/4 delays** |
| `weapon-pickup-traversal` | the capsule's 108 ACTIVE frames must fall inside a debris-clear window | no — 1/4, and not for a capsule reason |
| `memory-integrity` `hunt` | the replay window must contain 10 collections | 3/4, and not for a capsule reason |

The one the observer could fix, it fixed completely. The two it could not are
both properties of the Director's cadence, and both are measured above rather
than assumed.

---

## 3. Broadside residue in `OPEN` frames — NONE, and the code says why

The question (implementation brief, Phase A item 5): broadside warning marks are
the only other writer of the missile plane. With `PRIOR $00` in `OPEN` after this
change, `M1`-`M2` take the Heavy hull colour and `M3` the boost colour, so any
broadside byte left in the missile plane after a capital sector would be on
screen.

### 3.1 From the code

`update_broadside` (`src/main.s`) begins by calling `erase_broadside_slot` for
**every** slot, unconditionally, before any slot can move, change state or draw:

```
    ldx #(BROADSIDE_SLOT_COUNT-1)
@erase_slot:
    jsr erase_broadside_slot
    dex
    bpl @erase_slot
```

`erase_broadside_slot` returns immediately when `BROAD_PREV_H` is zero, and
otherwise clears exactly the span it drew (`and missile_clear_masks,x`) and then
zeroes `BROAD_PREV_H`/`BROAD_PREV_Y`. `update_broadside` is called from
`handle_collisions`, which runs on **every gameplay frame in every sector
state**, `OPEN` included. A span drawn on the last capital frame is therefore
erased on the next frame whatever the sector state became, and nothing redraws
it because `schedule_broadside` returns immediately below `CAPITAL_HULL_STATE_DRAIN`.

### 3.2 From a trace

A new host-side column, `missile_plane_rows`, counts every non-empty row of the
`$3B00` plane. MEASURED on this branch's build:

| replay | sector states seen | `OPEN` frames | `OPEN` frames with a non-empty missile row | capital frames | capital frames with one |
| --- | --- | ---: | ---: | ---: | ---: |
| `weapon-pickup-traversal-2-observe-fire4` | 0,1,2,3,4,5,6,7 | 715 | **0** | 1,085 | 537 |
| `weapon-pickup-traversal-2-observe-fire8` | 0,1,2,3,7 | 926 | **0** | 874 | 485 |
| `weapon-pickup-contact-2-hunt-fire4` | 0,1,2,7 | 894 | **0** | 406 | 191 |
| `weapon-pickup-overlap-2-hunt-fire4` | 0,1,2,7 | 896 | **0** | 404 | 190 |

The first replay runs the **whole** capital sequence, `ENGINES` through
`COMPLETE`, and returns to `OPEN` for 715 frames. Broadside marks are on the
plane for half of its capital frames and on **none** of its `OPEN` frames.

**No runtime defect. Nothing to report as a blocker.** The column stays in the
trace as a standing watch, because the cost of it is one comparison per frame
and the consequence of a regression here is now a visible boost-coloured dot in
open space.

One thing the change makes strictly better in the other direction:
`clear_fighter_pickup_pmg` used to zero sixteen rows of the **missile** plane,
which is the broadside's. It does not touch that plane at all now.

---

## 4. The harness defect this change exposed

`ENEMY_PROFILE_SCORE_BCD` (`$8117`, `build/director-abi.inc`) is a C global in
`HYBRID_C_STATE`, written by `heavy_publish_profile` (`src/c/lifecycle.c`) when
a Heavy formation is admitted and read by `add_archetype_score_tail`
(`src/main.s`) when a kill scores.

The isolation harnesses poke `ENEMY_*` directly and call the ASM routine; they
admit nothing through C, so that byte was never written. It sits inside the
`$8100` GLUE hold, which boot-only A2 staging passes through — `lifecycle_c_init`
clears what it owns at gameplay init, and the harnesses never call it either.
So **every score assertion in those traces was reading a leftover staging byte.**

MEASURED, same harness, same routine, two builds:

| | byte at `$8117` after boot | `$8110-$811F` | `score_bcd_lo` after one Raider kill |
| --- | --- | --- | --- |
| `main` `2c4c193` | `$0A` | `f7 21 29 7f 8d 0d 80 0a 0a 0a 85 94 …` | `$10` |
| this branch | `$2F` | `69 44 85 95 8a 18 69 2f 8d 0e 80 0a …` | `$35` |

Both windows hold **6502 opcodes**, not published profile data. `$0A` is not the
roster's score; it is a staged byte that in decimal mode normalises to exactly
`$10`, which is the roster's score, which is why the expectations looked right
for as long as the packed stream did not move. Shortening that stream by 26 B
moved the byte to `$2F`, and five assertions in four files changed by `+$25`
each — with **no runtime change whatsoever**.

The correction is the observer, not the assertion: `publishEnemyProfileScore`
(`scripts/runtime-image.mjs`) publishes the authored score, read from
`build/enemy-roster.inc`, at the address `build/director-abi.inc` gives. Every
existing expectation holds byte-for-byte — BCD `$0A` and `$10` add identically —
and now holds for the right reason.

Affected: `tests/raider-fragment-origin.test.mjs` (two),
`tests/raider-projectile-ownership.test.mjs`,
`tests/weapon-pickup-rapid-fire.test.mjs`, `tests/entity-effects.test.mjs`.

---

## 5. What moved, and what did not

| | `main` `2c4c193` | this branch |
| --- | ---: | ---: |
| `ENTITY_CODE` | 3,161 B, free tail 5 B | **3,140 B**, free tail **26 B** |
| `PICKUP_CODE` | 960 B, stream fill 49 B | **934 B**, stream fill **75 B** |
| `ENTITY_CODE` staging margin | 25 B | **38 B** |
| Light art tables | `$9D27` / `$9D37` | **`$9D12` / `$9D22`** |
| initial block content / ceiling | 13,634 / 13,684 | **13,626 / 13,684** |
| boot / extension / total sectors | 107 / 101 / 208 | **107 / 101 / 208** |
| `$AE00` window used / free | 1,991 / 1,593 | **1,991 / 1,593** |
| XEX bytes | 29,355 | **29,332** |

`CODE` (`$2000-$317D`) and `RODATA` (`$317E-$3FFF`) are byte-identical in size
and no segment start moved: the `MAIN` bytes the change returns went into
`LOADER_SPLASH_CODE_SLACK` (56 -> **57**) and into
`white_starfield_broadside_abi_pad` (`.res 0` -> **`.res 1`**), which is what
keeps `free_broadside_slot` on its fixed `$76A7` integration ABI.

---

## 6. The smooth-sequence gate: what the boost colour exposed

**Phase B, 2026-09-29.** The first full `runtime:wall-trace` after the observer
move reached every replay and then **threw** in the post-loop pickup block:

```
Error: Expected one complete smooth final-raster capsule sequence, found 0/0
    at main (scripts/runtime-wall-trace.mjs:5355)
```

No evidence was written, so this had to be understood before Phase B could
finish. It is not a runtime defect, and it is not the colour: **the capsule was
complete on all sixteen captured frames.**

### 6.1 What the gate actually asserted

The gate took a 16x16 RGB window from the first capture and required
`findRgbTemplate` to find it **byte-identical, exactly once, at
`initialY + 2 * index`** in each of the sixteen. That is a statement about every
object on screen, not about the capsule: it says *nothing may cross the box.*

It held for as long as it did because the object that crosses the box most often
shared the capsule's colour. `PLAYER_FIGHTER_PROJECTILE_COLOR` is
`GAMEPLAY_COLPF2` **`$1E`** (`build/fighter-weapons.inc`), the capsule now wears
`COLPM3` **`$1C`**, and `$1E | $1C = $1E`, so a shot over the mark is a
distinguishable pixel inside the silhouette where it used to be invisible.

MEASURED on the captures of that run (`weapon-pickup-2-hunt-fire4`, frames
288-303, `pickup_hposp3` 94, derived column x 60-75):

| | frame 00-07 | 08 | 09 | 10-12 | 13 | 14 | 15 |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| capsule pixels (`$1C`) | 216 | 208 | 208 | 216 | 212 | 208 | 208 |
| `$1E` pixels inside the silhouette | 0 | 8 | 8 | 0 | 4 | 8 | 8 |

The silhouette itself is **216 px on every frame** once the `$1E` pixels are
counted as the capsule they occlude, and it descends by exactly **2 scanlines a
frame** with the column fixed. It is the **player's own shots** that cross it,
not his hull: the ship sat at `player_y` 185-200 and `player_x` 92 while the
capsule fell 116 -> 146 at x 94 — the mark descends straight down the firing
line.

### 6.2 What it asserts now (owner decision 9, "robust rather than re-tuned")

Re-pointed to the capsule's own register, exactly as the contact clause already
reads it:

* a **capsule** pixel is the boost colour;
* a pixel whose GTIA output merely **contains** the boost colour's bits (`$1E`
  over `$1C`, a Heavy hull's `$5C`) is an **occlusion** — not a capsule pixel,
  and not a foreign silhouette either;
* the reference silhouette is the **least-occluded** captured frame; every frame
  must hold that silhouette translated by two scanlines, with every missing
  pixel explained by an occluding object and no capsule pixel outside it;
* a **complete** candidate must also fill **16 scanlines and all 8 colour
  clocks** — the raster half of what the CSV clause says as
  `pickup_plane_rows === 16 && pickup_plane_union === 255`;
* completeness and uniqueness are unchanged: the maximum-pixel candidate must be
  the only one, and at least 16 px.

The alternative — re-scripting the coverage session's fire delay until the
captured window happens to be shot-free — is exactly the delay-tuning owner
decision 9 retired, and a capsule descending the firing line is ordinary
gameplay, not a stale scenario.

### 6.3 Falsified both ways, against the run's own captures

| fixture | old gate (byte-identity) | colour mask without the row/column counts | **the clause as shipped** |
| --- | :-: | :-: | :-: |
| the real 16 captures | **0/0 — FAIL** | 1 complete, 216 px | **1 complete, 216 px, 16 rows x 16 px — PASS** |
| a 2x2 hole blanked in frame 05 (a failed erase) | — | accepts a smaller window at 188 px | **0 complete — FAIL** |
| frame 12 replaced by frame 11 (a one-frame stutter) | — | 0 — FAIL | **0 complete — FAIL** |

So the re-pointed clause is **stricter** than the one it replaces, not weaker:
the formulation it replaces accepts a hole in the capsule as long as a smaller
window excludes it. `rgbTemplate()` and `findRgbTemplate()` were **DELETED** with
it; no other clause asks for byte-identity of a raster window.

### 6.4 One more test re-point this exposed

`tests/runtime-wall-trace.test.mjs` pinned the evidence key
`maximum_simultaneous_missile_blocks`. The trace renamed that aggregate
`maximum_simultaneous_plane_blocks` with the column it is named after, so the pin
read `undefined` the moment the evidence was regenerated. Re-pointed, with the
old key asserted **gone** on the `maximum_pickup_glyph_cells` precedent beside
it. Same measurement, same value (**1** — one capsule, not a trail); only the
word "missile" left it. It is the last re-point this change owes, and the only one
that could not appear until the evidence itself had been rebuilt.
