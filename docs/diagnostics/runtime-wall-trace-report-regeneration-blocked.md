# `docs/runtime-wall-trace.json` cannot be regenerated — now `BLOCKED_PICKUP_CONTACT_STEEL_WINDOW`

> **Update, 2026-09-19 (FIX session, branch `wip/4.5d-gate-fail`, HEAD `a999af6`).**
> The owner unblocked `BLOCKED_PICKUP_COLLECTION_DRAW_CALL`. Both stale pickup
> trace-PC pins are repointed and now pass, with the root cause established:
> commit `04ae0a6` silently rebound three pickup trace PCs from renderers to PMG
> routines. The default run advances past both and now stops on a *different*
> kind of clause — a screenshot pixel count. **§7 is the current state**; §6 is
> the history of the pin just fixed, §1-§4 of the one before it.
>
> Earlier banner (SHORT FIX session): the owner unblocked
> `BLOCKED_STALE_PICKUP_CONTACT_PIN`; the `PRIOR` clause of §3-§4 was fixed and
> passes.

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
