# `docs/runtime-wall-trace.json` cannot be regenerated — `BLOCKED_STALE_PICKUP_CONTACT_PIN`

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
