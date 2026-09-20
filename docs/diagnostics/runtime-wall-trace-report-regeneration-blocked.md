# `docs/runtime-wall-trace.json` cannot be regenerated — now `BLOCKED_PICKUP_SEQUENCE_DRAWN_MASK`

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

## 9. §8.6 fixed, the model taught its third writer, and a new clause

FIX session, 2026-09-19, branch `wip/4.5d-gate-fail`, HEAD at start `791a019`
(the §8.6 docs commit; `4de4be9` is its parent). Build
`npm run build:candidate -- --quiet`, XEX
`5ea523a44a345ae62fba89a077d6d8957f42a0f9d94812721f9bdd2013b618bf`.
Baseline reproduced `ecc9ceda…` byte-identical before any edit.

### 9.1 The defect, fixed

`restore_launch_flash_cell` no longer stamps
`CAPITAL_TURRET_MUZZLE_SCREEN_CODE_OFFSET`. `render_launch_flashes` saves the
covered cell's own content into a new 3-byte `BROAD_FLASH_BACKING`
(`$4E75-$4E77`, one byte per broadside slot, inside the `$4E75-$4E9F`
compatibility state hole that already holds `BROAD_RASTER_TOP`), and the expiry
returns that byte. This is the discipline the tracked-muzzle overlay already had
with `MUZZLE_BACKING`; the two do **not** share state — `MUZZLE_BACKING` is two
bytes indexed by turret side and rewritten every scroll by
`advance_tracked_muzzles`, the flash has three slots and a four-frame lifetime.

**Why one backing byte per slot is unambiguous.** The two overlays do write the
same cell in the same frame (§8.6.4 measured 63 such frames), but they nest.
Within one `main_loop` pass: `tick_launch_flashes` (`:2493`) restores, then
`update_starfield` → `scroll_hull_columns` runs `restore_active_muzzles`,
`advance_tracked_muzzles` and `redraw_tracked_muzzles`, then
`render_launch_flashes` (`:2527`) saves and writes. The flash saves **last** in
the frame and restores **first** in the next, entirely inside the tracked
overlay's own save/restore, and nothing between those two points moves
`BROAD_ROW_LO/HI` — so the restore always targets exactly the cell the last
render wrote. A guard (`cmp (dst_ptr),y`) skips the save when the cell already
carries this flash's own code, or a multi-frame flash would become its own
backing.

Factoring the duplicated cell-pointer prologue into
`set_launch_flash_cell_ptr` made the two routines 14 bytes smaller; the bytes
are returned as unreachable `.res` padding after an unconditional `rts`
(`launch_flash_layout_pad`), so `__BROADSIDE_SIZE__` stays `$19FD` and
`free_broadside_slot` stays pinned at `$76A7`.

### 9.2 The ownership model's third writer — OWNER-APPROVED

Owner decision 2026-09-19: teach the model the third writer, narrowing only.
`scripts/runtime-wall-trace.mjs` gained `liveLaunchFlashOwnsIllegalCell`,
`unownedHullTransientCells` and `legalLaunchFlashCells`, wired into the three
sites that tested `muzzle_illegal_cells === 0` (`:2608`, `:2810`, `:4379`). A
broadside slot owns `BROAD_ROW_LO/HI + muzzle column` **only** while its
`broad{N}_flash` is non-zero, and only for one cell, one address and one code on
a frame with exactly one orphan. `muzzle_illegal_address` and
`muzzle_illegal_code` were also added to `numericCsvFields`; they had been
parsed as strings, so every comparison against them would have been silently
false.

**Proof that it narrows.** Re-run against the *unfixed* build: raw orphans 68,
unowned under the new model **52**. The model exonerates the same 16 live-flash
frames on both builds and cannot forgive the 52-frame defect — the clause still
fails on the unfixed binary.

### 9.3 Orphan counts, split by cause

| Build | raw orphan frames | unowned under the model |
| --- | ---: | ---: |
| `4de4be9` (unfixed) | 68 | 52 |
| this build | 16 | **0** |

**52 frames came from the `src/main.s` fix** (the muzzle-constant stamp, codes
`$45`/`$D0`) and **16 from the ownership model** (live launch flashes, codes
`$51`/`$D2`). The two are not interchangeable: the fix removed cells that were
really on screen; the model removed cells that were never a defect.

### 9.4 Still `BLOCKED` — a different clause, pre-existing

The session now fails the **fifth** term of the same invariant,
`legalMuzzleCodes + legalBroadsideOcclusions === row.active_muzzles`, on **13
frames**: `885, 887, 1029, 1030, 1171, 3809-3814, 3937, 3938`. A tracked muzzle
record is active while its cell holds ordinary content and no broadside occludes
it — a **missing** glyph, the converse of the orphan case:

```
885  m0 $83C8 = $30   m1 $8367 = $D0   every flash timer 0
1171 m0 $4030 = $30   m1 $4047 = $D0   both on the fixed divider
3809 m0 $8418 = $45   m1 $842F = $E6   broad1_turret 255 (free slot)
```

`$30`/`$31`/`$32`/`$E6` are not star codes (`STAR_NEAR_FIRST = 1`) and not
transients. **A/B: the same 13 frames, identical frame numbers, on a rebuilt
unfixed `ecc9ceda…`.** Pre-existing and independent of this work; the orphan
clause aborted first and masked it. No term is proposed — the owner has called
for a review of the whole gate set rather than another single clause.

`docs/runtime-wall-trace.json` is therefore **still stale** and a final
(non-candidate) build is still refused at `validateRuntimeEvidenceBinding`.

### 9.5 Gates

* Build: clean; `__BROADSIDE_SIZE__` `$19FD` unchanged, `free_broadside_slot`
  `$76A7` unchanged.
* Boot smoke: **4/4 PASS**.
* PAL, `capital-muzzle-ring-2-sweep-fire4`, 6,000 frames, **both builds
  identical**: worst wall **30,337** cycles, **2,231** margin to the 32,568
  gate, 0 missed frames, 0 extra VBI boundaries, 0 DLI ordering violations. The
  fix has no measurable cost on this session's worst frame. The full 69-replay
  audit was **not** run: the default run still aborts in this session.
* `tests/broadside-fire.test.mjs`: 47/54 pass, **7 failures A/B-confirmed
  identical on a rebuilt unfixed `ecc9ceda…`** (45/52 there) — none from this
  work. The two new tests are the delta.
* Baseline-failure proof: on the rebuilt unfixed build the new test fails with
  `slot 0: the expiry stamped the per-turret muzzle constant into the cell,
  actual: 69` (`$45`). The second new test also fails there, but only because
  `BROAD_FLASH_BACKING` does not exist on that build — it guards the new
  mechanism against regression and is **not** an independent proof of the defect.

## 9.6 The 13 frames measured: the PairShot character overlay

DIAGNOSTIC-AND-UNBLOCK session, 2026-09-19, branch `wip/4.5d-gate-fail`, HEAD at
start `a8e2d93`; instrumentation `51839a4`. Build `npm run build:candidate --
--quiet`, XEX `5ea523a44a345ae62fba89a077d6d8957f42a0f9d94812721f9bdd2013b618bf`
— byte identical to the build §9 measured. Boot smoke 4/4 PASS.

**No clause was added, widened or relaxed.** 4e stands exactly as §9.4 left it.

### 9.6.1 The instrumentation

`dftrace_snapshot_muzzles` now reads `dftrace_character_last_writer[pointer]` at
each tracked muzzle's own screen pointer and emits it as
`muzzle0_writer_pc` / `muzzle1_writer_pc`. The array was already maintained on
every character write into the divider and ring ranges
(`scripts/atari800-wall-trace.h:1806-1812`) and already surfaced twice
(`transient_effect_first_writer_pc`, `broad_pmg_first_writer_pc`); this adds no
tracking and no hook. Both columns are registered in `numericCsvFields` —
§9.2's silent-string trap.

### 9.6.2 The writer, on all 13 frames

`capital-muzzle-ring-2-sweep-fire4`, 6,000 rows. Of the five terms of the
invariant at `scripts/runtime-wall-trace.mjs:2598`, only 4e fails, on the same
13 frames §9.4 recorded: `885, 887, 1029, 1030, 1171, 3809-3814, 3937, 3938`.
Terms 4a-4d fail on **0** rows.

On **13 of 13** frames the writer of the offending cell is the same PC:

```
$92D6  render_fighter_projectile_overlays @draw_top   sta (dst_ptr),y
       src/main.s:4396-4397
```

The healthy slot on those same frames carries `$6627` =
`redraw_tracked_muzzles+26`, the legitimate publisher.

### 9.6.3 It is a legitimate, save/restore-disciplined occluder

`render_fighter_projectile_overlays` runs at `src/main.s:2965`, long after
`update_starfield` (`:2526`) has run `restore_active_muzzles`,
`advance_tracked_muzzles` and `redraw_tracked_muzzles`, and after
`render_launch_flashes_with_capital_debris` (`:2532`). A PairShot is therefore
the **last** writer of any cell it occupies, the tracked muzzle's included.

Before it draws, the slot saves the covered cell into
`FIGHTER_PROJECTILE_BACKUP_TOP` (`:4376-4381`), and
`erase_fighter_projectile_restore` (`$2B48`, `src/main.s:3798-3799`) returns it
on the next frame. Measured: on every frame that follows an episode, the cell is
back to `$45`/`$D0`, written either by `erase_fighter_projectile_restore` or by
`redraw_tracked_muzzles`. `muzzle_illegal_cells` is 0 on all 13 frames and
raw orphans are 0 across the replay — the saved muzzle glyph is never resurrected
at a stale address.

This is the exact analogue of `legalBroadsideOcclusions`, which 4e already
credits for a broadside hull covering the muzzle column. The term simply does
not know that a projectile can cover it too.

### 9.6.4 The two episode families are one mechanism at two relative speeds

| Family | Slot | Codes | Length | Cause |
| --- | --- | --- | ---: | --- |
| Allied | `m0`, column 8 | `$30`/`$31`/`$32` (player PairShot glyph) | 1-2 frames, alternating | PairShots climb faster than the ring scrolls, so each crosses the muzzle cell for one frame; a `fire4` stream re-enters on the next-but-one frame |
| Enemy | `m1`, column 31 | `$E6`/`$E7` (hostile projectile) | 2-6 frames | hostile shots descend at roughly the scroll rate, so shot and muzzle cell stay co-located; `$E6 -> $E7` is the glyph phase advancing under a stationary pointer |

The review's observation that the allied failures sit on a divider->ring domain
transition is confirmed for 885, 1029 and 1171: at a transition the tracked
pointer relocates to a new address chosen without regard to what occupies it,
and lands on a cell the PairShot stream is already holding. Co-location is the
mechanism; the transition only raises its odds.

### 9.6.5 Verdict — `OWNER_DECISION_REQUIRED`

4e is measuring a **fourth legitimate writer the ownership model does not know**,
not a defect. No term is proposed and none was changed: teaching the model a
reviewed invariant is an owner decision, as it was for writer 3 in §9.2. The
session remains `BLOCKED`, `docs/runtime-wall-trace.json` remains stale, and a
final (non-candidate) build is still refused at `validateRuntimeEvidenceBinding`.

---

## 10. Both owner decisions of 2026-09-19 implemented; a new, different blocker

IMPLEMENTATION session, 2026-09-19, branch `wip/4.5d-gate-fail`, HEAD at start
`a2cda6b`, worktree clean. Build `npm run build:candidate -- --quiet`, XEX
`5ea523a44a345ae62fba89a077d6d8957f42a0f9d94812721f9bdd2013b618bf` — byte
identical to §9 and §9.6. Boot smoke **4/4 PASS**. No production byte changed:
the whole change is in `scripts/`.

### 10.1 Decision 1 — term 4e taught its fourth writer, OWNER-APPROVED

The occluder §9.6 measured is now part of the ownership model, in the same shape
as writer 2 (`legalBroadsideOcclusions`).

**The evidence column.** `scripts/atari800-wall-trace.h` gained
`muzzle_projectile_occlusion[2]`, emitted as `muzzle0_projectile` /
`muzzle1_projectile` and registered in `numericCsvFields`. It is computed by:

```c
static unsigned dftrace_projectile_occludes(unsigned address)
{
	unsigned code;
	if (address == 0u)
		return 0u;
	code = MEMORY_mem[address];
	if (dftrace_is_player_pairshot_code(code) && dftrace_player_pairshot_owns(address))
		return 1u;
	if (dftrace_is_enemy_pairshot_code(code) && dftrace_enemy_pairshot_owns(address))
		return 1u;
	return 0u;
}
```

`dftrace_player_pairshot_owns` and `dftrace_enemy_pairshot_owns` already existed
(`scripts/atari800-wall-trace.h:1671`, `:1707`) as the authority behind
`player_projectile_orphan_cells` and `enemy_projectile_stale_cells`. Each walks
the projectile slots, skips any slot whose `FIGHTER_PROJECTILE_RENDERED` (and,
for hostiles, `ACTIVE`) is clear, and compares that slot's **own**
`FIGHTER_PROJECTILE_SCREEN_LO/HI` against the address. No tracking, no new hook,
no new array.

**This is presence, not history** — the question the owner required the columns
to answer. The moment the shot advances, the slot's pointer moves; the moment it
is released, its rendered flag clears; either way the column reads 0 on the very
next snapshot. A cell a projectile merely crossed earlier is never forgiven. The
code test is a second, independent lock: the two projectile glyph families
(`$0B`, `$1D`, `$2F-$33` allied; `$DA-$E7` hostile) are **disjoint** from the
hull-transient codes `$45`/`$D0`/`$51`/`$D2`, so this writer can never exonerate
a muzzle or launch-flash code.

**The term, verbatim.** At `scripts/runtime-wall-trace.mjs:2598` the fifth
conjunct changed from a sum of two mutually exclusive counts to a per-slot
alternation of three:

```js
      const projectileOccludesMuzzle = (row, muzzleSlot) =>
        row[`muzzle${muzzleSlot}_projectile`] === 1;
```

```js
        const explainedMuzzles = [0, 1].filter((slot) =>
          row[`muzzle${slot}_pointer`] !== 0 &&
          (transientCodes.has(row[`muzzle${slot}_cell`]) ||
            broadsideOccludesMuzzle(row, slot) ||
            projectileOccludesMuzzle(row, slot))).length;
```

```js
          explainedMuzzles === row.active_muzzles;     // was:
          legalMuzzleCodes + legalBroadsideOcclusions === row.active_muzzles;
```

The sum and the alternation are equivalent on the two pre-existing writers:
`legalMuzzleCodes` required `transientCodes.has(cell)` and
`legalBroadsideOcclusions` required `!transientCodes.has(cell)`, so their sum was
already the count of slots satisfying either. The alternation also makes the
model correct for a slot explained twice — a slot is one slot, not two. Terms
4a-4d are unchanged; `legalMuzzleCodes` is still what term 4d is summed against.
The evidence JSON gained `legal_projectile_muzzle_occlusion_frames`.

### 10.2 The narrowing proof

**A/B of the predicate on the same 6,000-row CSV** of the production build,
recomputing the old and the new term offline:

| Term | frames failed |
| --- | ---: |
| old 4e (`legalMuzzleCodes + legalBroadsideOcclusions`) | **13** — `885, 887, 1029, 1030, 1171, 3809-3814, 3937, 3938` |
| taught 4e (`explainedMuzzles`) | **0** |

Exactly the 13 frames §9.4 named, no others. `muzzle{N}_projectile` is 1 on 19
slot-frames; the 6 beyond the 13 (`1172, 1178, 3853-3856`) were already balanced
by the other slot and were never failures.

**Fault-injected build — the term still fails when the occlusion's discipline is
absent.** `erase_fighter_projectile_restore` (`src/main.s:3798-3799`) was patched
to write `#CH_SPACE` instead of `FIGHTER_PROJECTILE_BACKUP_TOP,x`, so a
projectile that leaves a cell does **not** return the covered content. Build
`468d6188cd476ff099b7a6ce3561ab39062c2b2d2236fe8d5e25a9b97db13351`, same session,
same 6,000 frames:

```
CLAUSE FAILURE capital-muzzle-ring-2-sweep-fire4: capital-muzzle-ring-2-sweep-fire4
  observed a stale muzzle/flash code or invalid derived pointer

frame  886  m0 $83C8 = $00  projectile 0   m1 $8367 = $D0  active_muzzles 2
frame  888  m0 $83C8 = $00  projectile 0   m1 $8367 = $D0  active_muzzles 2
frame 1030  m0 $8530 = $24  projectile 0   m1 $824F = $D0  active_muzzles 2
```

| Build | taught 4e fails on | raw orphan frames |
| --- | ---: | ---: |
| production `5ea523a4…` | **0** | 16 (all live launch flashes, writer 3) |
| fault-injected `468d6188…` | **3** — `886, 888, 1030` | 16 |

Those are the frames *immediately after* the occlusion episodes at 885, 887 and
1029: the muzzle cell is empty (`$00`) or foreign (`$24`), `muzzle0_projectile`
is 0, no broadside occupies it. That is precisely the owner's required error (2),
"a projectile's covered cell not restored after the projectile leaves", and in
the `$00` case also (1), "a muzzle cell empty with no projectile and no
broadside occupying it". `src/main.s` was reverted and the production XEX
re-reproduced as `5ea523a4…` before commit.

### 10.3 Decision 2 — stage 1, session failures accumulate

`scripts/runtime-wall-trace.mjs`:

* `const sessionFailures = []` beside `allRows` / `summaries`;
* the session loop's assertion span is wrapped in `try` / `catch`, the catch
  recording `{session, message}`, printing `CLAUSE FAILURE <id>: <message>` and
  setting `process.exitCode = 1` — the precedent of the PAL timing audit in the
  same loop;
* `parseCsv` stays **outside** the try. A malformed or short CSV leaves no rows
  to carry forward and remains fatal, as the owner required for stage 2;
* `allRows.push(...rows)` and `summaries.push(...)` sit **after** the catch, so a
  failing session still contributes its coverage and the 176 post-loop
  aggregates cannot fail for absence;
* the body was deliberately not reindented — reindenting ~670 lines would bury
  the change;
* an end-of-run summary prints the accumulated list.

**`report.gate.passed`, in the same commit.** `gate` gained
`behavioural_clause_failure_count` and `behavioural_clause_failures`, and the
`passed` expression is now `sessionFailures.length === 0 && <the previous timing
and DLI conjunction>`. The file's existence is no longer the pass signal, so
`scripts/build.mjs:1594-1596` stays sound: a report written on a run that had a
clause failure carries `gate.passed === false` and cannot authorise a final
build. The 176 post-loop aggregates were **not** restructured; that is stage 2.

The mechanism was proven by the fault-injected run above, which recorded the
failure, continued, and exited 1 instead of aborting.

### 10.4 What now runs — and the new blocker

**Default mode, this build.** 30 of the 64 default sessions ran in the loop, up
from 21, with **0** accumulated clause failures. The run then died **outside**
the stage-1 catch, at the emulator invocation:

```
capital-contact-allied-medium
  atari800 … failed with status 2
  voidstrike65 trace: invalid DFTRACE_CAPITAL_CONTACT_MODE=undefined
```

`BLOCKED_CAPITAL_CONTACT_MODE_UNSET`. `capitalContactSessions`
(`scripts/runtime-wall-trace.mjs:347-355`) and the second
`lowerPlayfieldSessions` entry (`:441-450`) define `contactOwner` but **no
`contactModeId`**, while `:2551-2552` sends
`DFTRACE_CAPITAL_CONTACT_MODE: String(session.contactModeId)` for every session
whose kind sets `DFTRACE_CAPITAL_CONTACT_PREFIX` — the literal string
`"undefined"`, which `dftrace_env_u` rejects with `exit(2)`. Only
`capitalPlayerGeometrySessions` carries a `contactModeId`. The defect is
**pre-existing and untouched by this work** — the same eight lines are in
`a2cda6b` — and it was already recorded as "exit 2, no CSV" against `0002d84`; it
was simply unreachable while the loop aborted at
`weapon-pickup-contact-2-hunt-fire4`. It is **not fixed here**: per the owner's
instruction, newly surfaced failures are listed, not fixed.

Because `run()` precedes `parseCsv`, such a session yields no rows, so it cannot
be accumulated under stage 1's own constraint that a caught session must still
push rows. Deciding what a rows-less session contributes is an owner decision.

**The 34 sessions behind that abort, each run with `--only-session=`:**

| Result | Count | Sessions |
| --- | ---: | --- |
| ran to completion, no clause failure | **31** | `memory-integrity-{xex,atr}-2-{evasive,hunt}-fire4`; `lower-playfield-xex-hard`; all 24 `engine-{xex,atr}-{a5,5a}-{0,1,2}-{immediate,delayed}`; `engine-restart-{xex,atr}-a5` |
| hard abort, `DFTRACE_CAPITAL_CONTACT_MODE=undefined` | **3** | `capital-contact-allied-medium`, `capital-contact-hostile-medium`, `lower-playfield-hostile-contact-xex-hard` |

**Mode-gated sets, all sessions to completion, 0 clause failures:**
`--raider-formation-only` (1), `--raider-sector-only` (1),
`--debris-gate-only` (3), `--raider-remnant-only` (3). Three of the four exit 1
on the pre-existing native gates, not on a clause — `debris-gate-0-neutral-fire0`
reports 1 blank post-capital debris frame (the documented death-frame blink) and
`--raider-remnant-only` fewer main explosions than kills.

**So: across all 61 sessions that can run at all on this build, zero behavioural
clauses fail.** The 286-clause set is clean; one three-session environment-wiring
defect stands between it and the report.

### 10.5 The four answers

1. **61 of 64** default-mode sessions run to completion (30 inside the default
   loop, 31 individually); **0** accumulate a clause failure. 3 cannot start:
   `capital-contact-allied-medium`, `capital-contact-hostile-medium`,
   `lower-playfield-hostile-contact-xex-hard`.
2. **No.** `docs/runtime-wall-trace.json` is still the 2026-09-05 report bound to
   `ab682d84…`. Only the default mode writes it and the default mode still
   aborts — now at `capital-contact-allied-medium`, not at a clause.
3. **No**, and unchanged: `tests/runtime-wall-trace.test.mjs` fails 9 of 10 tests,
   `:77-121` among them, because it reads the stale committed report rather than
   a live run. **A/B: the identical 9 failures at `a2cda6b`** (`git stash` of the
   two changed scripts, same command) — no regression from this work. §8 already
   established that every assertion of `:77-121` passes against this build's live
   boot-smoke report.
4. **No** — and **not** because `gate.passed` is false. `npm run build` is refused
   earlier, at `validateRuntimeEvidenceBinding`
   (`scripts/runtime-evidence.mjs:49`, "Runtime wall trace binding mismatch for
   void-strike-65-boot.bin"), because no new report was written at all. The
   `gate.passed` AND added here has never yet been evaluated on a real run.
5. **Newly surfaced failures from the previously dark sessions: exactly one
   defect, in three sessions** — `BLOCKED_CAPITAL_CONTACT_MODE_UNSET` above.
   Not fixed. No behavioural clause failed in any of the 40.

### 10.6 Gates

* Build: `npm run build:candidate -- --quiet` reproduces XEX
  `5ea523a44a345ae62fba89a077d6d8957f42a0f9d94812721f9bdd2013b618bf`; `dist/`
  byte-clean against `a2cda6b`.
* Boot smoke: **4/4 PASS** (after `--prepare`, mandatory for the header change).
* PAL timing audit, standalone over all 69 replays
  (`node scripts/pal-timing-audit.mjs --json … build/runtime-wall-trace`, the set
  being the 30 default-loop replays, the 31 individually run, the 2 mode-gated
  Raider replays and the 3 + 3 debris-gate and remnant replays): **0 distinct
  miss events, 69/69 PASS**, worst fence margin **1,464** cycles
  (`raider-remnant-rapid-xex-hard` frame 1945), maximum wall **30,609** cycles —
  identical to the accepted checkpoint.
* `capital-muzzle-ring-2-sweep-fire4`: 6,000 frames, max **30,337** wall cycles,
  fence margin 5,331, 0 misses — unchanged from §9.5, byte-identical binary.
* CPU/RAM delta: **zero**. No production source changed.

## 11. `BLOCKED_CAPITAL_CONTACT_MODE_UNSET` fixed — all 64 sessions run; the report is blocked in the post-loop aggregates

FIX session, 2026-09-19, branch `wip/4.5d-gate-fail`, HEAD at start `9215013`,
worktree clean. No rebuild: the accepted artifact in `dist/` is still XEX
`5ea523a44a345ae62fba89a077d6d8957f42a0f9d94812721f9bdd2013b618bf`, byte
identical to §9, §9.6 and §10, and the whole change is in
`scripts/runtime-wall-trace.mjs`. The trace header was **not** touched, so the
instrumented emulator is the same build; `--prepare` was re-run only because
`/tmp/atari800-7.1.2` had been cleared, and the repo copy
(`ATARI800_TRACE_SOURCE=build/atari800-trace`) was used. Boot smoke **4/4 PASS**.

### 11.1 The mode each session needs — derived, not chosen

The four modes are named by `capitalPlayerGeometrySessions` and decided by one
expression in `dftrace_capture_capital_contact_decision`
(`scripts/atari800-wall-trace.h:3314-3319`), against the physical player and
bolt boxes:

| `contactModeId` | name | geometry required | capture PC |
| ---: | --- | --- | --- |
| 0 | `top` | `bolt.bottom == player.top` | `player_aabb_hit` |
| 1 | `middle` | `bolt.top == player.top + 4` | `player_aabb_hit` |
| 2 | `bottom` | `bolt.top == player.bottom` | `player_aabb_hit` |
| 3 | `near` | `bolt.bottom + 1 == player.top` | `player_aabb_**miss**` |

All three affected sessions assert a **hit** — the shared
`capitalContactPrefix` block requires `capital_player_damage_calls === 1` and 16
captured rasters — so mode 3 is excluded by the assertions themselves.

Among 0, 1 and 2 the repository decides it exactly, in two independent ways.

**(a) The mode replaced a delta, and the delta had a default.** Commit `4753399`
("fix(collision): use final raster bounds for capital bolts") replaced
`DFTRACE_CAPITAL_CONTACT_DELTA` with `DFTRACE_CAPITAL_CONTACT_MODE`, renaming the
geometry set `top/side/bottom/near/sweep` to `top/middle/bottom/near`. Before it,
`DFTRACE_CAPITAL_CONTACT_DELTA` was sent **only** for sessions carrying
`contactDelta` — which these three never did — so they ran on the file-scope
default `static int dftrace_capital_contact_delta = 7`, i.e. the old `side`
(delta 7), the geometry the rename folded into `middle`. The same commit dropped
the conditional spread and began sending the mode unconditionally; that is the
line the `"undefined"` comes from.

**(b) The steering arithmetic is identical.** The legacy default steered
`target_y = shell_y - 7`; the bolt's logical top is `shell_y - 3`, so the bolt top
sat 4 rows below the player top. Mode 1 steers `player_top = bolt.top - 4` and its
capture predicate is `bolt.top == player.top + 4` — the same offset, exactly.
Mode 0 corresponds to the legacy `top` (delta −2 → `bolt.bottom == player.top`)
and mode 2 to `bottom` (delta 17). `lower-contact-hostile`, the third session's
policy, is not even mode-driven: it steers `target_y = shell_y - 7u`
(`scripts/atari800-wall-trace.h:2537`) in its own branch — the same mid-body
overlap, written out literally.

So **`contactModeId: 1` for all three**, and each carries the derivation as a
comment beside it. Nothing was tried until it passed: the value was fixed from
history and arithmetic before the first run.

### 11.2 The guard, verbatim

Placed where the session tables are defined
(`scripts/runtime-wall-trace.mjs`, immediately after `lowerPlayfieldSessions`),
so a missing field throws by name at module scope rather than becoming
`exit(2)` inside the emulator hundreds of frames later:

```js
/* Kinds whose runs set DFTRACE_CAPITAL_CONTACT_PREFIX, and therefore also send
 * DFTRACE_CAPITAL_CONTACT_OWNER and DFTRACE_CAPITAL_CONTACT_MODE. */
const capitalContactPrefixKinds = new Set([
  "capital-projectile-contact",
  "lower-playfield-contact",
  "capital-player-geometry",
]);

function assertCapitalContactEnvironment(session) {
  if (!capitalContactPrefixKinds.has(session.kind)) return;
  invariant(Number.isInteger(session.contactModeId) &&
    session.contactModeId >= 0 && session.contactModeId <= 3,
  `${session.id} (${session.kind}) sets DFTRACE_CAPITAL_CONTACT_PREFIX but carries ` +
  `contactModeId=${session.contactModeId}; the emulator requires an integer 0-3`);
  invariant(session.contactOwner === 0 || session.contactOwner === 1,
    `${session.id} (${session.kind}) carries contactOwner=${session.contactOwner}; ` +
    "the emulator requires 0 (Allied) or 1 (Hostile)");
}

for (const session of [...capitalContactSessions, ...capitalPlayerGeometrySessions,
  ...lowerPlayfieldSessions]) assertCapitalContactEnvironment(session);
```

The set is the single definition of "this kind sends the capital-contact
environment"; the session loop now asserts against it too, so a **new** kind that
starts setting the prefix cannot slip past the table-level sweep:

```js
    const capitalScreenshotPrefix = capitalGeometryPrefix ?? capitalContactPrefix;
    invariant(capitalScreenshotPrefix === undefined ||
      capitalContactPrefixKinds.has(session.kind),
    `${session.id} sets DFTRACE_CAPITAL_CONTACT_PREFIX under kind ${session.kind}, ` +
    "which capitalContactPrefixKinds does not cover");
    assertCapitalContactEnvironment(session);
```

`contactOwner` is guarded with `contactModeId`: it is the other value
`dftrace_env_u` bounds-checks in the same `exit(2)`, and a session table is the
only place either is set.

**Proven by fault injection.** With the `contactModeId: 1` line deleted again
from the `lowerPlayfieldSessions` entry, the harness fails at import, naming the
session and the field:

```
Error: lower-playfield-hostile-contact-xex-hard (lower-playfield-contact) sets
DFTRACE_CAPITAL_CONTACT_PREFIX but carries contactModeId=undefined; the emulator
requires an integer 0-3
```

Module scope means this precedes even the "Instrumented Atari800 is missing"
check in `main()` — no emulator is started, no frames are replayed, and the
message names the fix. The line was restored before commit.

### 11.3 Rows-less sessions are a HARD failure — recorded, not changed

Owner decision 2026-09-19. Stage 1's accumulation is unchanged. The boundary it
already drew at `parseCsv` is now stated where the code draws it
(`scripts/runtime-wall-trace.mjs`, above the session `try`): `run()` and
`parseCsv` are **outside** the try, so a session that produces no CSV — a
non-zero emulator exit, a truncated file — stops the run, while a failing
behavioural clause is recorded and the loop continues. Corrupt or absent data is
not a clause.

### 11.4 What the full default run now does

`ATARI800_TRACE_SOURCE=build/atari800-trace node scripts/runtime-wall-trace.mjs`,
default mode, this build:

* **64 of 64 sessions run to completion** — the first time the whole default set
  has executed. The three that could not start now start;
* PAL timing audit: **0 distinct miss events across 64 replays, PASS**;
* boot smoke **4/4 PASS**;
* **3 accumulated behavioural clause failures**, all the same clause in the three
  newly reachable sessions: *"did not capture 16 consecutive contact rasters"*;
* the run then throws **outside** the session loop, in the post-loop aggregates,
  at `scripts/runtime-wall-trace.mjs:4599`: *"Atari800 did not capture all 16
  consecutive pickup raster frames"*. Exit 1, **no report written**.

`BLOCKED_PICKUP_SEQUENCE_DRAWN_MASK`.

### 11.5 The three contact sessions: measured, and it is not the mode

The mode fix is complete — the emulator no longer exits 2, each session runs its
full frame budget and writes a CSV, and each is PAL-clean (max wall 28,936 /
28,437 / 28,768 cycles, 0 misses). What they now fail is a **different,
pre-existing staleness**: on this build no capital projectile ever contacts the
player in these scenarios, so nothing is captured. Measured from the CSVs:

| Session | frames | capital bolts seen | rows with `capital_collision_calls` | `capital_player_damage_calls` |
| --- | ---: | --- | ---: | ---: |
| `capital-contact-allied-medium` | 560 | **none** — every `broad{0,1,2}_state` is 0 on all 560 rows | 0 rows | 0 |
| `capital-contact-hostile-medium` | 360 | **none** | 0 rows | 0 |
| `lower-playfield-hostile-contact-xex-hard` | 1,200 | 234 rows with a live BROADSIDE (frames 966-1199) | 174 rows | **0** |

**This is mode-independent, and provably so.** In the two `capital-contact-*`
sessions no BROADSIDE is ever live, so no value of `contactModeId` could produce
a contact; the mode only steers the player and tests the geometry of a bolt that
never exists. In those 560 frames the player is instead killed twice by ordinary
enemies (`player_health_after` 10 → 0 at frames 145 and 496, lives 3 → 2 → 1)
while holding position at `x=148, y=112`. In the third session the mode is not
consulted at all by the `lower-contact-hostile` steering branch, and the reason
the player never meets a bolt is visible in the trace: the branch engages only on
a hostile shell with `shell_y >= 191`, and every live shell in the replay sits at
`shell_y` 116 or 180, so `target_y` stays pinned at `DFTRACE_PLAYER_MAX_Y` and the
player never leaves `y=225`.

These are stale **scenarios** — frame budgets and playfield rows written against
an older Director and BROADSIDE schedule — not a stale pin and not a runtime
defect. Under the stage-1 decision they are accumulated, not fatal, which is why
the run reached the post-loop aggregates at all. Repairing them is a separate
owner decision: it means changing what each replay does (frame budget, difficulty
or policy) until a capital bolt reaches the player again, and the evidence each
session then publishes is owner-facing.

### 11.6 The new blocker, measured

`scripts/runtime-wall-trace.mjs:4599` requires 16 files
`build/runtime-wall-trace/weapon-pickup-frame-{00..15}.png`. **Zero exist.** The
three neighbouring screenshot invariants in the same block pass — the static
capsule, the Rapid projectile and the Spread fan were all rendered and captured.

The capture gate is `scripts/atari800-wall-trace.h:6063-6069`, and its third
conjunct is `(MEMORY_mem[dftrace_entity_drawn_mask + 1u] & 15u) == 15u`. That
byte is published to the CSV as `pickup_drawn_mask`
(`scripts/atari800-wall-trace.h:3461`, `:4365` — the same `ENTITY_DRAWN_MASK + 1`).
Measured over `weapon-pickup-2-hunt-fire4.csv`, 4,000 frames:

| Column | Distribution |
| --- | --- |
| `pickup_drawn_mask` | **`0` on 4,000 of 4,000 frames** |
| `entity_active_mask` | `0`×2,289, `1`×1,478, `2`×204, `3`×29 |
| frames with `entity_active_mask == 2` **and** `(pickup_drawn_mask & 15) == 15` | **0** |

So the gate is **unsatisfiable by construction on this build**, exactly like the
three pickup clauses §6 and §7 repaired: production writes `ENTITY_DRAWN_MASK`
(slot 0) at `src/main.s:9509`, `:10368` and `:10393` and never `+1`. Slot 1's
character drawn-mask is dead memory since `f6eee5c` moved the capsule from
character cells to the missile plane — the same commit and the same cause as the
stale screenshot clause §7 derived away. `pickup_pmg_rows` is the live
measurement of the capsule on this build.

The defect is **pre-existing and untouched by this work**; it was simply
unreachable while the run aborted earlier. It is **not fixed here**: it sits in
the 176 post-loop aggregates that §10.3 explicitly left to stage 2, and choosing
what replaces an unsatisfiable capture gate — repoint the emulator's gate at the
missile plane, or retire the sequence — is an owner decision of the same kind as
the three already taken.

### 11.7 Gates

* Build: none. `dist/` untouched; XEX still `5ea523a4…`, byte-identical to §10.
* Boot smoke: **4/4 PASS** (inside the default run).
* PAL timing audit: **0 distinct miss events across 64 replays, PASS**.
* Sessions: **64/64 run**; 3 accumulated clause failures; 0 hard failures inside
  the loop.
* CPU/RAM delta: **zero**. No production source changed.
