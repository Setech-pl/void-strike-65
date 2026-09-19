# `docs/runtime-wall-trace.json` cannot be regenerated — now `BLOCKED_MUZZLE_ORPHAN_TRANSIENT`

> **Update, 2026-09-19 (DIAGNOSTIC session, branch `wip/4.5d-gate-fail`, HEAD
> `cdc2695`; instrumentation `4de4be9`).**
> `BLOCKED_MUZZLE_ORPHAN_TRANSIENT` is **measured and diagnosed**, not widened.
> The emulator now reports the offending address and code, and the answer is
> reading **(b)**: a real one-cell ghost written by the BROADSIDE launch flash
> and left behind by `restore_launch_flash_cell` (`src/main.s:8097-8110`),
> visible in the central corridor for 0.14-0.28 s, seven times per replay. The
> gate clause is correct and was **not** touched. **§8.6 is the current
> state**; §8.1-§8.5 are how the blocker was reached.
>
> Earlier banner (FIX session, HEAD `9a80fe2`).
> The owner unblocked `BLOCKED_PICKUP_CONTACT_STEEL_WINDOW`. The pickup contact
> raster window is now **derived** from `pickup_hposm0` and `colpf3` instead of
> pinned, and **both pickup sessions pass every clause**. The default run has
> left the pickup path entirely and now stops in the capital-muzzle ring
> session on a live emulator-side orphan-transient count — which, unlike the
> three clauses before it, **may be reporting a real defect rather than a stale
> pin**, and must not be widened on that assumption. §7 is the history of the
> two pins before it, §6 of the one before that, §1-§4 of the first.
>
> Earlier banner: the owner unblocked `BLOCKED_PICKUP_COLLECTION_DRAW_CALL`;
> both stale pickup trace-PC pins were repointed, root cause commit `04ae0a6`.
> Earlier still (SHORT FIX session): the owner unblocked
> `BLOCKED_STALE_PICKUP_CONTACT_PIN`; the `PRIOR` clause of §3-§4 was fixed.

Session: IMPLEMENTATION, 2026-09-19. Branch `wip/4.5d-gate-fail`, HEAD at the
time of measurement `8156e66`. Build: `npm run build:candidate -- --quiet`,
XEX `ecc9cedafd87f871989fc0b279343d1848c225792bf17e5be4ad9fadd1f7d3c7` — **byte
identical to the accepted runtime checkpoint `0002d84`**.

This is the *separate* defect the previous session found, kept separate from
the boot-deadline restatement. Nothing here is caused by that change.

## 1. The defect, restated with current numbers

`docs/runtime-wall-trace.json` is stale. Committed 2026-09-05; its
`artifact.sha256` is `ab682d84…` and its ATR boot-smoke `menu` milestone is
**502**, against an accepted runtime of `ecc9ceda…` at menu **554**.
`tests/runtime-wall-trace.test.mjs` reads that committed file, not a live run,
so the whole test file is measuring a five-build-old artifact.
`scripts/build.mjs:1589-1597` also refuses a **final** (non-candidate) build
whose wall trace does not bind to the current artifacts, so the stale report
blocks a release build as well.

## 2. Regeneration was attempted and is blocked

Only the default mode of `scripts/runtime-wall-trace.mjs` writes that file
(`:6074`); `--only-session` and every focused mode return before it
(`:4744-4747`). The default run was executed in full on this build:

```
node scripts/runtime-wall-trace.mjs --atari800-source=build/atari800-trace
```

21 sessions passed, all PAL-clean, and then:

```
Error: weapon-pickup-contact-2-hunt-fire4 changed GTIA priority or the single
erase/draw lifecycle
    at invariant (scripts/runtime-wall-trace.mjs:832:25)
    at main (scripts/runtime-wall-trace.mjs:2983:7)
```

The throw is inside the session loop, so `main()` never reaches the
`fs.writeFileSync(reportPath, …)` at `:6074` and no report is produced. This
is the pre-existing abort already recorded in `docs/STATUS.md` and
A/B-confirmed on a freshly built `0a90c1c` worktree.

## 3. Exactly which clause fails, and why it is a stale pin

The invariant at `scripts/runtime-wall-trace.mjs:2983-2987` has five clauses.
Measured over the 8 contact rows of this build's
`build/runtime-wall-trace/weapon-pickup-contact-2-hunt-fire4.csv`:

| Clause | Failing rows |
| --- | ---: |
| `row.prior === 0` | **8 of 8** |
| `row.pickup_erase_calls === 1` | 0 |
| `row.pickup_draw_calls === 1` | 0 |
| `row.pickup_erase_scanline > row.pickup_prev_y` | 0 |
| `row.pickup_draw_scanline !== 0` | 0 |

The erase/draw lifecycle half of the invariant is intact. The only failure is
`PRIOR`, which measures **`$10`** on every contact row (sample, frame 388:
`pickup_state 2, player_y 172, pickup_y 132, prior 16, erase 1, draw 1,
erase_scanline 246, prev_y 130, draw_scanline 113`).

`$10` is **deliberate and current**. The weapon-pickup PMG renderer sets it
itself:

```asm
; src/main.s:10484-10487
    lda #$00
    sta SIZEM
    lda #$10                    ; GTIA fifth-player mode: M0-M3 use COLPF3
    sta PRIOR
```

and `release_fighter_pickup_pmg_hardware` (`src/main.s:9820-9823`) restores
`$00` when the pickup leaves. The pickup is drawn as the GTIA fifth player, so
`PRIOR = $10` for exactly as long as a pickup is on screen — which is the whole
window the invariant samples. The gate is pinning a value the accepted runtime
no longer uses; it is not reporting a regression in the pickup path.

## 4. The smallest recovery — NOT applied

One clause, one line: pin the contact rows to the fifth-player value the
renderer actually programs.

```js
-    invariant(contactRows.every((row) => row.prior === 0 &&
+    // The pickup is the GTIA fifth player (src/main.s:10486), so PRIOR is $10
+    // for as long as it is on screen and $00 again after release.
+    invariant(contactRows.every((row) => row.prior === 0x10 &&
```

**This session did not apply it.** Changing what a native gate accepts is an
owner-visible change to a reviewed invariant, it is outside the bounded scope
of this task, and the project's standing practice is that moving a reviewed
margin or pin is an owner decision. The evidence above is what the decision
needs; the recovery is one line and no rebuild.

Until it is taken, `docs/runtime-wall-trace.json` stays at `ab682d84…`, the
`tests/runtime-wall-trace.test.mjs` failures stay in the known test debt, and
a final (non-candidate) build stays blocked.

## 4b. A second stale pin, in the test — fixed here

While verifying that the rewritten boot-horizon test would pass on real data,
a second assertion turned out to be wrong against the current build,
independently of the deadline change:

```js
assert.ok(byFrame.get(250).loader_timer > byFrame.get(300).loader_timer);
```

Measured on this build, the frame-250 snapshot is a loader raster only on the
**XEX** (`DMACTL $22`, `NMIEN $80`, `loader_timer 137`). On the **ATR** it is
`DMACTL $00`, `NMIEN $00`, `loader_timer 0` — the machine is still inside the
SIO load and the countdown has not started; it is 249 by frame 300. The
assertion therefore compares a countdown that does not exist yet and fails on
both ATR sessions.

`scripts/runtime-wall-trace.mjs` already applies the correct rule
(`completeLoaderSnapshots` gates exactly this comparison on the frame-250
raster being complete); only the test asserted it unconditionally. The test now
mirrors the harness: `loader300.loader_timer > 0` always, and the countdown
comparison only when frame 250 is a complete loader raster. This is a test
correction, not a relaxed runtime gate — the harness's own invariant is
unchanged.

With that fixed, **every assertion of the rewritten boot-horizon test was run
directly against the live measured boot-smoke report of this build and
passes.** It still fails in `npm test` for one reason only: it reads the stale
committed report of §1, which §2-§4 explain cannot be replaced.

## 5. What is *not* blocked

The 21 sessions that run before the abort are PAL-clean on this build, and
every replay audited in this session reports 0 miss events. The boot smoke —
including the restated deadline — passes 4/4 independently of this defect
(`npm run boot:smoke`), because `--boot-smoke-only` returns before the session
loop.

---

## 6. After the `PRIOR` fix: `BLOCKED_PICKUP_COLLECTION_DRAW_CALL`

Owner decision (2026-09-19): unblock the stale pin. Applied at
`scripts/runtime-wall-trace.mjs:2992` — the contact rows now accept **both**
`$00` and `$10`, and only that clause changed:

```js
-      invariant(contactRows.every((row) => row.prior === 0 &&
+      invariant(contactRows.every((row) => (row.prior === 0x00 || row.prior === 0x10) &&
```

with the reason recorded in a comment at the assertion site. Both values are
correct and **no trace column separates them**: over the whole
`weapon-pickup-contact-2-hunt-fire4` trace the `pickup_state 2` window holds
one row at `prior 0` (the first state-2 frame, sampled before that frame's PMG
setup) and 61 at `prior 16`, and `pickup_pmg_rows` is `16` on both. A
state-derived assertion would therefore have pinned an unverifiable rule, so
the gate accepts both and keeps every other clause.

**Result.** Rebuilt (XEX `ecc9ceda…`, still byte-identical to `0002d84`) and
re-ran the default mode in full. The contact invariant at `:2992` passes. The
run now aborts one clause later, at `scripts/runtime-wall-trace.mjs:2998`:

```
Error: weapon-pickup-contact-2-hunt-fire4 did not collect and activate exactly once
```

Measured over the fresh trace, the collection row is unique and three of the
four sub-clauses hold:

| Sub-clause | Measured |
| --- | --- |
| `collectionRows.length === 1` | 1 — **passes** |
| `pickup_booster_state === 3` | 3 — **passes** |
| `entity_active_mask === 0` | 0 — **passes** |
| `pickup_draw_calls === 0` | **1 — fails** |

Collection frame 396: `pickup_state 3, booster_state 3, entity_active_mask 0,
pickup_erase_calls 2, pickup_draw_calls 1, player_y 164, pickup_y 148`.

Both clauses were introduced by the same commit, `e187ffd`
(`fix(render): preserve booster during player overlap`, 2026-09-01), so this is
the same vintage as the pin just removed and is a candidate for the same
diagnosis — but that has **not** been established here. Whether the draw on the
collection frame is legitimate runtime behaviour or a real defect in the
collection path is undetermined; the owner's instruction for this session was
to stop rather than widen the gate further, so no further clause was touched.

`docs/runtime-wall-trace.json` therefore still carries `ab682d84…` / ATR menu
`502`, `tests/runtime-wall-trace.test.mjs:77-121` still fails on that stale
data, and a final (non-candidate) build stays blocked — `npm test` itself
cannot run for this reason (`validateRuntimeEvidenceBinding`,
`scripts/build.mjs:1594`), so the suite must be run as a candidate build plus
`node --test tests/*.test.mjs`.

**Gates for the change made here.** Boot smoke 4/4 PASS on this build
(XEX menu 392/392 baseline, ATR menu 554/554 baseline, delta 0 frames on all
four sessions, no warn). PAL timing audit over all 21 replays that run before
the abort: 21/21 PASS, 0 distinct miss events, worst margin 1,713 cycles
(`weapon-pickup-2-hunt-fire4`). Focused A/B on
`tests/runtime-wall-trace.test.mjs` + `tests/pal-timing-audit.test.mjs`, which
both read this script's source: 28 tests / 9 failing with and without the
change, identical names. Full suite (candidate build + `node --test`): 690
tests, 112 failing.

---

## 7. The trace-PC rebinding, and a third clause: `BLOCKED_PICKUP_CONTACT_STEEL_WINDOW`

Owner decision (2026-09-19): the collection clause is stale; repoint it to what
it was always meant to measure. Done, with the root cause established.

### 7.1 Root cause of §6 — commit `04ae0a6`

`DFTRACE_PC_ENTITY_DRAW` was bound to `render_weapon_pickup_overlay`, a real
character-overlay renderer reachable only when `ENTITY_ACTIVE_MASK != 0`. With
that binding the three sub-clauses of the collection invariant formed one
coherent statement: collection cleared the mask, so the capsule glyph was not
redrawn on the collection frame.

Commit `04ae0a6` (2026-09-11, *feat: prototype row-baked far stars*) repointed
all three pickup trace PCs in a single hunk:

```
-  DFTRACE_PC_ENTITY_ERASE: "erase_weapon_pickup_overlay_restore",
-  DFTRACE_PC_AFTER_ENTITY_ERASE: "weapon_pickup_erase_done",
-  DFTRACE_PC_ENTITY_DRAW: "render_weapon_pickup_overlay",
+  DFTRACE_PC_ENTITY_ERASE: "clear_fighter_pickup_pmg",
+  DFTRACE_PC_AFTER_ENTITY_ERASE: "release_fighter_pickup_pmg_hardware",
+  DFTRACE_PC_ENTITY_DRAW: "update_fighter_pickup_pmg",
```

`update_fighter_pickup_pmg` (`src/main.s:10415`) is the movement / collection /
booster **policy wrapper**. It writes no pixels — the renderer is
`render_fighter_pickup_pmg` — and the collection itself passes through it. The
counter therefore reads 1 on the collection frame and `=== 0` has been
unsatisfiable by construction since that commit.

The erase side survived the rebinding intact: `clear_fighter_pickup_pmg` does
zero the missile rows, so `pickup_erase_calls` is still a real erase measure.

### 7.2 The runtime is correct

Measured on `weapon-pickup-contact-2-hunt-fire4` of this build:

| Frame | `pickup_state` | `pickup_pmg_rows` | `entity_active_mask` | `pickup_draw_calls` |
| ---: | ---: | ---: | ---: | ---: |
| 392-395 | 2 | 16 | 2 | 1 |
| **396** (collection) | 3 | **0** | 0 | 1 |
| 397-403 | 3 | 0 | 0 | 1 |

`pickup_pmg_rows` goes `16 -> 0` on the collection frame and stays 0. The first
erase is at scanline 116, ahead of the capsule's own rows at 156. No ghost, no
stale footprint.

### 7.3 Changes applied

Collection row (`:3028`), restoring the original intent against the plane the
capsule is actually drawn on:

```js
-        collectionRows[0].entity_active_mask === 0 && collectionRows[0].pickup_draw_calls === 0,
-      `${session.id} did not collect and activate exactly once`);
+        collectionRows[0].entity_active_mask === 0 && collectionRows[0].pickup_pmg_rows === 0,
+      `${session.id} did not collect and activate exactly once, or left the `
+      + `capsule on the missile plane after collection`);
```

Contact rows (`:3006`). The surviving `pickup_draw_calls === 1` asserted only
"the policy wrapper was entered once" — **true on all 500 post-collection
frames of this trace, with no capsule on screen at all**. No column counts
renderer entries, so "exactly one draw" is not assertable here; the clause is
repointed to the published result instead, which post-collection frames of the
same trace fail (they read 0/2/4/6):

```js
-        row.pickup_erase_calls === 1 && row.pickup_draw_calls === 1 &&
+        row.pickup_erase_calls === 1 && row.pickup_pmg_rows === 16 &&
         row.pickup_erase_scanline > row.pickup_prev_y &&
         row.pickup_draw_scanline !== 0),
-      `${session.id} changed GTIA priority or the single erase/draw lifecycle`);
+      `${session.id} changed GTIA priority, the single erase, or the published `
+      + `16-row missile capsule at player contact`);
```

`pickup_pmg_rows` was added to `numericCsvFields` — it is emitted by
`scripts/atari800-wall-trace.h:4449` but was not on the script's numeric
allowlist, so it parsed as CSV text.

Both clauses now pass. The reason each pin was unsatisfiable, naming `04ae0a6`,
is recorded at both assertion sites.

### 7.4 The run still does not reach the report

The default mode now advances past both pickup-trace clauses and stops at
`scripts/runtime-wall-trace.mjs:3037`:

```
Error: weapon-pickup-contact-2-hunt-fire4 final raster contains a cut capsule
or stale post-collection footprint
```

This is **not** a trace-PC clause. It is a screenshot pixel count, and it is a
different defect from §6 and §7.1. Measured over the 11 captured
`weapon-pickup-contact-nose-*.png` frames of this run:

* the sampled window is `x 140-164, y 8-216`, and the steel colour
  `rgb(13,58,115)` occurs **0 times in it on every one of the 11 frames** — so
  the `>= 40` head clause fails on frame 00, not only at the tail;
* the steel pixels do exist — 32 on frames 00-05, 24 on frames 08-10 — but at
  `x 188-223, y 128-186`, entirely outside the pinned x-window;
* the screenshots are `256 x 192`, so the window's `bottom: 216` already reads
  past the bottom of the image.

Per the owner's instruction for this session — *two stale pins from the same
rebinding is a pattern; a third needs its own diagnosis* — the gate was **not**
widened and no further clause was touched. The geometry above is evidence for
that diagnosis, not a conclusion: whether the window, the colour, or the
capsule's raster position is the stale half is undetermined here.

**Consequence.** `docs/runtime-wall-trace.json` still carries `ab682d84…` / ATR
menu `502`; `tests/runtime-wall-trace.test.mjs:77-121` ("real Atari800 XEX/ATR
cold boots reach visible gameplay inside the boot horizon") still fails on that
stale data; and a final (non-candidate) build is still refused —
re-confirmed in this session:

```
Error: Runtime wall trace binding mismatch for void-strike-65-boot.bin
    at validateRuntimeEvidenceBinding (scripts/runtime-evidence.mjs:49:13)
    at build (scripts/build.mjs:1594:5)
```

### 7.5 Gates for the change made here

* Build: `npm run build:candidate -- --quiet`, XEX
  `ecc9cedafd87f871989fc0b279343d1848c225792bf17e5be4ad9fadd1f7d3c7` —
  byte-identical to the accepted runtime checkpoint `0002d84`.
* Boot smoke: **4/4 PASS**. XEX menu 392/392, ATR menu 554/554, delta 0 frames
  on all four sessions, no warn.
* PAL timing audit, **default-mode set** — the 21 replays that run before the
  abort: **21/21 PASS, 0 distinct miss events**, worst margin **1,713 cycles**
  (`weapon-pickup-2-hunt-fire4`). This is the default-mode figure, not the
  1,464 of the full 69-replay set, which this mode does not run.
* Focused A/B on `tests/runtime-wall-trace.test.mjs` +
  `tests/pal-timing-audit.test.mjs`, which read this script's source: **28
  tests / 19 pass / 9 fail, identical with and without the change**. All nine
  read the stale committed report of §1.

---

## 8. The raster window derived, and a fourth clause: `BLOCKED_MUZZLE_ORPHAN_TRANSIENT`

Owner decision (2026-09-19): the steel window is stale — reading (b). Restore
its intent by **deriving** the window rather than pinning new literals. Done.
The run now passes both pickup sessions and stops in a **different subsystem**.

### 8.1 What was derived, and what it measures

Applied at `scripts/runtime-wall-trace.mjs` (the clause formerly at `:3037`):

| Half | Was | Now |
| --- | --- | --- |
| x | `left 140, right 164` | `left = 2 * (row.pickup_hposm0 - 64)`, `right = left + 16` |
| colour | `rgb(13,58,115)` (`$84` steel) | `row.colpf3` resolved through the screenshot's own PLTE |
| y | `top 8, bottom 216` | `0 .. image.height` |

Thresholds are **unchanged**: `>= 40` on every frame but the last three, `< 40`
on those three. `decodeAtari800Screenshot` now returns the decoded `palette` so
the colour can be resolved per screenshot instead of hard-coded, and
`pickup_hposm0` was added to `numericCsvFields` (it is emitted by
`scripts/atari800-wall-trace.h` but parsed as CSV text until now, exactly as
`pickup_pmg_rows` was last session). A precondition invariant asserts that
`pickup_hposm0` and `colpf3` are constant across the contact rows, since a
single window can only describe them if they are; both are, in both sessions.

Why both halves were stale: `f6eee5c` retired the character compositor, moving
the capsule from character cells to the missile plane. The colour became
COLPF3 (`$46`, measured) instead of `$84` steel, and the column moved with it.
Fixing x alone would still have counted zero.

**Measured with the derived window** (`HPOSM0 = 92`, `COLPF3 = $46`, window
`x 56-72`, full 192-line height; PLTE index 70 is the only palette entry
carrying `rgb(128,48,111)`, so the count is unambiguous):

| Session | Head frames | Tail frames | Verdict |
| --- | --- | --- | --- |
| `weapon-pickup-contact-nose-*` (11) | 216 ×6, 210, 182 | 0, 0, 0 | head floor **182** ≥ 40, tail 0 < 40 |
| `weapon-pickup-contact-edge-*` (15) | 216 ×9, 188, 156, 132 | 0, 0, 0 | head floor **132** ≥ 40, tail 0 < 40 |

The `216 -> 182` / `216 -> 132` taper is the player's P0/P3 taking foreground
priority over the capsule, which is what the 40 floor tolerates. The original
intent — capsule present through contact, gone three frames after collection —
is satisfied exactly, on both sessions, with no threshold moved.

The clause was **not** repointed at `pickup_pmg_rows`. It is the only gate that
measures the framebuffer rather than the memory counters, and
`stage-2b2d-pickup-raster-invisibility.json` is the recorded case of those two
diverging (16/16 missile rows set at frame end, 0/16 at the beam crossing,
framebuffer pure background). Repointing would have made it redundant with the
clause above it and deleted the only gate that would have caught 2b2d. The
reason is recorded at the assertion site.

### 8.2 Documentation discrepancy, corrected

`docs/diagnostics/stage-2b2e-pickup-capsule-silhouettes.json` records the
mapping as `screen_x = 2*HPOSM0 - 64 + 2*cc`. That constant assumes a wider
crop origin than this project's Atari800 captures have: on the 256×192
screenshots of this build the capsule at `HPOSM0 = 92` measures `x 56-72`,
i.e. `2*(HPOSM0 - 64) + 2*cc`, **64 pixels further left**. The captures are the
authority; the doc now carries a `screen_x_correction` field stating this, and
the assertion site states it too. Only the absolute origin is affected — the
relative `+2*cc` term and every silhouette in that file are unchanged.

### 8.3 The run advances two sessions and stops again

Default mode, re-run in full on the rebuilt candidate:

```
weapon-pickup-contact-2-hunt-fire4: 1300 frames, max 29682 wall cycles   PASS
weapon-pickup-overlap-2-hunt-fire4: 1300 frames, max 29677 wall cycles   PASS

Error: capital-muzzle-ring-2-sweep-fire4 observed a stale muzzle/flash code
or invalid derived pointer
    at invariant (scripts/runtime-wall-trace.mjs:838:25)
    at main (scripts/runtime-wall-trace.mjs:2538:7)
```

Both pickup sessions now clear every clause, including the derived raster one.
The abort has moved out of the pickup path entirely, into the capital-muzzle
ring session. **`docs/runtime-wall-trace.json` is still not written** — the
throw is still inside the session loop, ahead of `:6074`.

### 8.4 Why this one is not a stale pin

The three clauses fixed so far pinned things that had been retired or rebound.
This one does not. `muzzle_illegal_cells` is a **live scan performed by the
emulator on this build's memory** (`scripts/atari800-wall-trace.h:4212-4223`):
it walks the 40 cells of the divider row and the whole ring screen, and counts
every hull-transient character code sitting at an address that is not one of
the two live muzzle pointers. Nothing about it was rebound; it reads memory by
address.

Measured over the 6,000 frames of the fresh
`capital-muzzle-ring-2-sweep-fire4.csv`:

| Sub-clause | Failing frames |
| --- | ---: |
| `row.muzzle_illegal_cells === 0` | **68** |
| `row.muzzle_code_cells === legalMuzzleCodes` | **68** (same frames: 3 observed, 2 accounted for) |
| `legalMuzzleCodes + legalBroadsideOcclusions === row.active_muzzles` | **13** |
| `row.muzzle_pointer_errors === 0` | 0 |
| `row.broad_pointer_errors === 0` | 0 |

On all 68 frames both muzzle slots are healthy — `muzzle0` at `$45`,
`muzzle1` at `$D0`, both in the ring domain, pointers valid — and a **third**
hull-transient code is present on the ring screen that no muzzle owns.

The 68 frames form seven contiguous episodes of 7-14 frames:
`925-938, 944-954, 1027-1034, 1362-1370, 1395-1402, 1444-1450, 4112-4122`.

**Every episode begins on the frame a BROADSIDE enters its launch flash.**
Frame 925: `broad0_state` goes `1 -> 2` and `broad0_flash` starts its `4,3,2,1`
countdown; frame 4112: `broad0_state` goes `2 -> 3` with `broad1_flash` at 1.
The orphan then persists roughly ten frames past the flash reaching 0 and
clears without any state change (925-938 while the states stay `[2,1,0]`
throughout, clearing at 939).

The gate models only two owners of a hull-transient code — `muzzle_pointer[0]`
and `muzzle_pointer[1]` — plus `broadsideOccludesMuzzle`, which models a
broadside sitting *on* a muzzle pointer. Nothing models a broadside's own
transient glyph at its own cell.

**This is undetermined and is not concluded here.** Two readings fit the
evidence equally well:

* **(a) Unmodelled legitimate transient.** The BROADSIDE launch flash is a
  third legitimate writer of a hull-transient code, and the gate's ownership
  model has never accounted for it. If so the gate is incomplete, not the
  runtime, and the fix is to extend the ownership model — not to widen the
  count.
* **(b) A real one-cell ghost.** A transient glyph written at launch outlives
  its owner by ~10 frames and is cleared only incidentally, by the ring
  scrolling the address out of the scanned range. That would be a real,
  player-visible single-character ghost lasting about 0.2 s, seven times in
  this replay — precisely what this gate exists to catch.

The datum that separates them is **not recorded**: the emulator counts orphan
cells but never reports the offending address or code. Adding that — one pair
of columns in `scripts/atari800-wall-trace.h` beside the existing counters —
would settle (a) against (b) immediately, at the cost of a header change and a
`--prepare` rebuild of the traced emulator.

Per the standing practice that moving a reviewed gate is an owner decision, and
because reading (b) would make widening this clause the act that deletes the
gate catching a real defect, **no fourth clause was touched**. Recovery
requires an owner decision, and reading (a) should not be assumed.

### 8.5 Gates for the change made here

* Build: `npm run build:candidate -- --quiet`, XEX
  `ecc9cedafd87f871989fc0b279343d1848c225792bf17e5be4ad9fadd1f7d3c7` —
  byte-identical to the accepted runtime checkpoint `0002d84`, so nothing in
  this change reaches the artifact.
* Boot smoke: **4/4 PASS**. XEX menu 392/392, ATR menu 554/554, `delta_frames`
  0 on all four sessions, no warn.
* PAL timing audit over every replay that runs before the new abort: **all
  PASS, 0 miss events**, worst margin **1,713 cycles**
  (`weapon-pickup-2-hunt-fire4`); the two pickup-contact sessions that this
  change gates report margins of 5,587 cycles each.
* Focused tests `tests/runtime-wall-trace.test.mjs` +
  `tests/pal-timing-audit.test.mjs`: **28 tests / 19 pass / 9 fail**, identical
  to the figure recorded in §7.5 before this change. All nine still read the
  stale committed report of §1.
* Final (non-candidate) build: still refused, as expected, because the report
  was still not written —
  `Error: Runtime wall trace binding mismatch for void-strike-65-boot.bin` at
  `scripts/runtime-evidence.mjs:49` / `scripts/build.mjs:1594`.

---

## 8.6 The orphan measured: reading (b), the launch-flash restore

Owner decision (2026-09-19): measure `BLOCKED_MUZZLE_ORPHAN_TRANSIENT`, do not
decide it on correlation. Done. §8.4 left (a) and (b) open because the emulator
counted orphan cells without naming one. It names them now, and the answer is
**(b)** — a real one-cell ghost, with a named writer and a named defect. The
gate clause was **not** touched, in either direction.

DIAGNOSTIC session, branch `wip/4.5d-gate-fail`, HEAD at measurement
`cdc2695`; instrumentation committed as `4de4be9`.

### 8.6.1 The instrumentation

`scripts/atari800-wall-trace.h` gained two columns beside the existing
counters, written in both scan loops (divider row and ring screen):

| Column | Meaning |
| --- | --- |
| `muzzle_illegal_address` | screen address of the **first** orphan cell of the frame, 0 when there is none |
| `muzzle_illegal_code` | the character code found at that address |

This is measurement only. No clause, threshold or ownership model changed, and
every pre-existing counter keeps its meaning and its column order.

Rebuilt (`--prepare`) and re-ran `capital-muzzle-ring-2-sweep-fire4`. The
failure reproduces exactly: **68 of 6,000 frames**, the same seven episodes
`925-938, 944-954, 1027-1034, 1362-1370, 1395-1402, 1444-1450, 4112-4122`, and
`muzzle_illegal_cells` is **1** on every one of them.

### 8.6.2 The addresses and codes

| Episode | Address | Ring row / col | Codes | Frames |
| ---: | --- | ---: | --- | ---: |
| 925 | `$83C8` | 16 / 8 | `$51` -> `$45` | 14 |
| 944 | `$829F` | 8 / 31 | `$D2` -> `$D0` | 11 |
| 1027 | `$84B8` | 22 / 8 | `$51` -> `$45` | 8 |
| 1362 | `$83DF` | 16 / 31 | `$D2` -> `$D0` | 9 |
| 1395 | `$8148` | 0 / 8 | `$51` -> `$45` | 8 |
| 1444 | `$81C0` | 3 / 8 | `$51` -> `$45` | 7 |
| 4112 | `$8407` | 17 / 31 | `$D2` -> `$D0` | 11 |

Every address lies in the ring screen (`$8140-$8578`) at **column 8 or column
31** — `CORRIDOR_CENTRAL_FIRST` and `CORRIDOR_CENTRAL_END-1`, the two
turret-muzzle columns. Code census over the 68 frames: **16** carry a launch
flash code (`$51` allied / `$D2` enemy), **52** carry a muzzle code (`$45`
allied / `$D0` enemy).

### 8.6.3 The writer

On **7 of 7 episodes**
`muzzle_illegal_address == BROAD_ROW_LO/HI[slot] + CAPITAL_TURRET_MUZZLE_COLUMN_OFFSET`
for the slot whose flash was running. The path is the launch flash:

* `render_launch_flashes` (`src/main.s:8066-8094`) writes
  `CAPITAL_HULL_{ALLIED,ENEMY}_FLASH_CODE` at `BROAD_ROW_LO/HI,x` plus the
  turret's muzzle column.
* `restore_launch_flash_cell` (`src/main.s:8097-8110`), reached from
  `tick_launch_flashes`, writes
  `CAPITAL_TURRET_MUZZLE_SCREEN_CODE_OFFSET` — the `$45`/`$D0` **muzzle** code
  — into the same cell on the frame `BROAD_FLASH_TIMER` reaches 0. That is
  exactly the measured `$51 -> $45` / `$D2 -> $D0` transition, on exactly the
  expiry frame.

**Why the gate does not model it.** `dftrace_snapshot_muzzles` attributes a
hull-transient code only to `MUZZLE_SCREEN_LO/HI[0..1]`
(`src/main.s:287-288`) — the single-per-side overlay record maintained by
`track_top_muzzles`, `advance_tracked_muzzles` and `redraw_tracked_muzzles` —
plus `broadsideOccludesMuzzle`, which models a broadside sitting *on* one of
those pointers. The launch flash addresses its cell through `BROAD_ROW_LO/HI`,
set by `set_broadside_row_ptr` (`src/main.s:8015`). These are two independent
pointers into the same ring: they coincide at broadside admission
(`src/main.s:7826-7830`) and diverge afterwards, because the broadside advances
on its own state machine while the tracked record advances on ring scroll and
is re-claimed at the top or retired to the divider. Nothing in the model
describes a flash at the broadside's own row.

### 8.6.4 Verdict: (b)

The flash write itself is reading (a) — a legitimate writer the gate never
modelled, with a real cleanup. **The cleanup is the defect.**

1. **52 of the 68 orphan frames have every `BROAD_FLASH_TIMER` already 0.** The
   writer's lifecycle is over and the flash path never revisits the cell. That
   is the (b) criterion of §8.4 verbatim.
2. `restore_launch_flash_cell` restores a **per-turret constant, not the cell's
   prior content**; it performs no backing save. The tracked-muzzle overlay
   maintains `MUZZLE_BACKING` and restores it through `restore_active_muzzles`
   (`src/main.s:6233-6247`, `6281-6284`) precisely because a ring cell's prior
   content must be preserved across an overlay. The flash path skips that
   discipline entirely.
3. Provable content loss in 2 of the 7 episodes: at **1027** and **1395** the
   flash was drawn **on the tracked muzzle cell** (previous-frame
   `muzzle0_cell == $51`), the record then left that cell for `$4030` without
   `restore_active_muzzles` ever restoring `MUZZLE_BACKING` there, and
   `restore_launch_flash_cell` stamped `$45` into it. Over the whole trace,
   **63 frames** show a tracked muzzle cell holding a flash code — the flash
   routinely clobbers the tracked cell with no save.
4. The orphan clears 7-14 frames later with no flash-path state change and
   while the broadside is mid-flight: incidental coverage by a later screen
   write, not lifecycle cleanup.

**Where the defect lives.** `restore_launch_flash_cell`
(`src/main.s:8097-8110`), with the missing counterpart save in
`render_launch_flashes` (`src/main.s:8066-8094`). The launch flash needs the
same save/restore discipline the tracked-muzzle overlay already has, instead of
restoring a constant muzzle glyph. Fixing it is production work in the capital
broadside path and was **not** attempted in this session.

The gate is not the thing that is wrong. Widening this clause would have been
the act that deleted the catch, exactly as §8.4 warned.

### 8.6.5 Player visibility: yes

* The ring spans `$8140-$8578` = 1080 bytes = 27 x 40 = `DFTRACE_RING_ROWS`, so
  **every ring address is mapped to a displayed row at all times**; rotation
  changes only which raster row shows it. The cell is on screen for the whole
  episode.
* At onset the owning broadside sits at display rows **20-24 of 27**, raster x
  **84-164** — inside the visible playfield, low on the screen, in the central
  corridor.
* It renders as the **capital-hull turret muzzle glyph** — the same character
  `track_top_muzzles` scans for. It does not read as corruption; it reads as a
  turret muzzle on a hull row that has no turret.
* Duration **7-14 frames, i.e. 0.14-0.28 s**, seven times in this 6,000-frame
  (120 s) replay, always exactly one cell.

**What the trace cannot settle.** Only `broad_raster_row` is emitted, and only
for the broadside's own pointer, so the cell can be shown to be displayed
throughout but not tracked to a specific raster row on each later frame. And
nothing captures the cell's original content, so the destroyed glyph cannot be
named.

**What an owner smoke must look for.** During a capital-muzzle ring sweep with
broadsides firing: a single extra turret-muzzle character in the central
corridor — column 8 for allied, column 31 for enemy — on a hull row that has no
turret, appearing as the launch flash fades and lasting about a quarter of a
second, low on the screen. Easiest to catch by frame-stepping the moments after
a launch flash and comparing the two corridor columns against the hull's real
turret positions.

### 8.6.6 Gates for the change made here

* Build: `npm run build:candidate -- --quiet`, XEX
  `ecc9cedafd87f871989fc0b279343d1848c225792bf17e5be4ad9fadd1f7d3c7` —
  byte-identical to the accepted runtime checkpoint `0002d84`. The header is
  emulator-side instrumentation and does not reach the artifact.
* Boot smoke: **4/4 PASS**. XEX menu 392/392, ATR menu 554/554.
* Gate clause: **unchanged**, in either direction.
* `docs/runtime-wall-trace.json` still carries `ab682d84…` / ATR menu `502`;
  `tests/runtime-wall-trace.test.mjs:77-121` still fails on that stale data;
  a final (non-candidate) build is still refused. The blocker is unchanged —
  it is now diagnosed rather than undetermined.
