# ATR boot deadline — what the gate measures, where it lives, what re-basing unblocks

Session: OWNER-DECISION, 2026-09-18. Branch `wip/4.5d-gate-fail`, HEAD `cf650eb`.
Companion to owner decision 22 in
[owner-decisions-2026-09-11.md](../owner-decisions-2026-09-11.md).

Nothing in the gate implementation was changed by this session. This file is
the report and the costed proposal; the restatement is the owner's call.

---

## 1. What the ATR boot smoke actually measures

`npm run boot:smoke` → `node scripts/runtime-wall-trace.mjs --boot-smoke-only`.

Four native Atari800 7.1.2 PAL/XL cold sessions — XEX and ATR, each with cold
RAM fill `$A5` and `$5A` over `$8000-$9FFF` — run with zero guest
instrumentation bytes. The observer
([scripts/atari800-wall-trace.h](../../scripts/atari800-wall-trace.h)) records
six PC milestones, as frame numbers, from the host frame counter:

| Milestone | Symbol |
| --- | --- |
| `start` | `start` |
| `loader` | `show_loader` |
| `menu` | `enter_main_menu` |
| `frontend_poll` | `frontend_input_poll` |
| `gameplay_init` | `start_gameplay` |
| `main_loop` | `main_loop` |

plus five state snapshots at frames **1, 250, 300, 500, 750** (display list,
charset base, PM base, `DMACTL`, `NMIEN`, `VDSLST`, `game_state`,
`loader_timer`, `DOSVEC`/`RUNAD`) and one PNG per snapshot frame. The session
exits at frame 750 (`atari800-wall-trace.h:1033`).

The **deadline** is one invariant over the `menu` and `frontend_poll`
milestones. It is a wall-clock budget on `start → main menu accepting input`.
It is not a raster, CPU or correctness measure: everything else in the smoke
(loader raster legality, gameplay display state, milestone ordering, RUNAD /
DOSVEC identity, screenshot capture) is independent of it.

**Measured at the accepted runtime checkpoint `0002d84` (182 transport
sectors):**

| Medium | `menu` | deadline | slack |
| --- | ---: | ---: | ---: |
| XEX | 392 | 502 | 110 frames |
| ATR | **554** | **554** | **0 frames** |

ATR menu at frame 554 = **11.08 s** of PAL wall clock.

## 2. Where the formula is implemented

**One site, and only one:**

- [scripts/runtime-wall-trace.mjs:1555-1559](../../scripts/runtime-wall-trace.mjs) —

  ```js
  const menuDeadline = definition.id.startsWith("atr")
    ? 190 + manifest.transportCapacity.totalTransportSectors * 2
    : 502;
  invariant(milestones.menu <= menuDeadline &&
    milestones.frontend_poll <= menuDeadline + 1, …);
  ```

  `totalTransportSectors` is read from the build manifest (currently **182**),
  so the ATR deadline re-derives itself from the artifact on every run. The
  XEX deadline is the fixed constant **502**.

There is no second implementation, no config file, no test that re-derives
`190 + 2 × sectors`, and no build step that consumes it.

## 3. Everything else that depends on it

### 3.1 Structural couplings in the same harness (these bind harder than the formula)

These are not the formula, but they cap how far a re-based deadline can
actually be exercised. A ceiling above ~500 frames is **nominal only** until
they move:

| Site | What it fixes |
| --- | --- |
| `scripts/atari800-wall-trace.h:845-848` | snapshot frames hard-coded to `1, 250, 300, 500, 750` |
| `scripts/atari800-wall-trace.h:1033` | the boot session **exits at frame 750** — nothing past 15 s is observable |
| `scripts/runtime-wall-trace.mjs:1530` | invariant: the snapshot list must be exactly `1,250,300,500,750` |
| `scripts/runtime-wall-trace.mjs:1535` | the *menu* snapshot is taken at frame **500** |
| `scripts/runtime-wall-trace.mjs:1536, 1561-1565` | the *gameplay* snapshot is taken at frame **750** |
| `scripts/runtime-wall-trace.mjs:1570` | `milestones.main_loop < 750` |
| `scripts/runtime-wall-trace.mjs:1579, 1618` | screenshots at those five frames; the frame-750 PNG is the gameplay hash |
| `scripts/runtime-wall-trace.mjs:1623-1624` | report fields `frames_observed: 750`, `duration_seconds_pal: 15` |
| `src/main.s:3009` + `build/loader-screen.inc:12,169` | `LOADER_DURATION_FRAMES = 250`, asserted at assembly — a hard 250-frame floor between `loader` and `menu` on both media |

### 3.2 Test-suite dependencies

- [tests/runtime-wall-trace.test.mjs:77-121](../../tests/runtime-wall-trace.test.mjs)
  — "real Atari800 XEX/ATR cold boots reach visible gameplay by frame 750".
  Asserts `frames_observed === 750`, `duration_seconds_pal === 15`, the exact
  snapshot frame list, `main_loop < 750`, and — for **every** session —
  `game_state === 1` (main menu) **at frame 500**.

  It reads the committed report
  [docs/runtime-wall-trace.json](../runtime-wall-trace.json), not a live run.
  **That report is stale**: its `artifact.sha256` is `ab682d84…` while the
  accepted XEX is `ecc9ceda…`, and it records ATR `menu` **502**, not the
  current 554. Consequence: regenerating the report at the current build would
  fail this test's frame-500 `game_state === 1` assertion for both ATR
  sessions, because the ATR build is still in the loader at frame 500. This is
  a latent trap independent of the owner decision, and it is the frame-500
  snapshot — not the `190 + 2 × sectors` formula — that is the tightest
  structural ceiling in the suite today.

- No other test asserts the deadline. The `transportCapacity` assertions in
  `tests/formats.test.mjs`, `tests/hybrid-c-arena.test.mjs`,
  `tests/layout-d1.test.mjs`, `tests/starfield.test.mjs`,
  `tests/cold-pickup-record-fit.test.mjs`,
  `tests/weapon-pickup-spread-shot.test.mjs` pin sector counts and byte
  extents for transport-format reasons; they are unaffected by the deadline
  and must **not** be relaxed with it.

### 3.3 Build dependencies

None. `scripts/build.mjs`, `scripts/formats.mjs`, `scripts/runtime-image.mjs`
and `scripts/package-release.mjs` never evaluate the deadline. The boot smoke
is a separate, explicitly invoked gate.

### 3.4 Documentation that states or reasons from the formula

- `docs/STATUS.md:338-351` — the "boot-smoke margin" open-defect bullet (the
  0-frame-slack history: `3838c00`, 4.5a, 4.5b, 4.5M-M2 177/544, 4.5M-M3
  178/546, the 832-B arena 551 vs 550, the current 182/554);
- `docs/STATUS.md:260, 794, 819, 877, 883, 1082` — per-candidate boot-smoke
  results quoting deadline against menu frame;
- `docs/memory-map.md:312, 361, 426, 454, 508, 541, 612-613` — every sector-count
  change restates the derived deadline; `:612-613` states the zero-slack
  conclusion explicitly;
- `docs/design-4.6-data-architecture.md:607-631` (§7.4) and `:742-747`
  (§10.3 decision 3) — the design's boot-smoke risk analysis and the owner
  question that decision 22 answers. *(That file is untracked in this
  worktree and was deliberately left unmodified by this session.)*
- `docs/diagnostics/stage-2b2t-option-d-standing-cost.json:30-31,147`,
  `docs/diagnostics/stage-2b2m-hybrid-c-arena.json:96`,
  `docs/diagnostics/stage-2b2t-segment-neighbour-guards.json:70` — historical
  measurements; these are evidence records and stay as written.

## 4. Proposed restatements (costed, not implemented)

The owner's requirement: keep catching a build that suddenly boots twice as
slowly; stop letting a self-tracking identity shape engineering decisions.

### Option 1 — absolute ceiling only

```js
const menuDeadline = definition.id.startsWith("atr") ? 3000 : 3000;
```

- **Catches:** total boot failure, a hang, a pathological loader regression.
- **Misses:** everything short of a ~5× regression. A build that goes from
  11 s to 50 s passes silently.
- **Cost:** one line — *plus* the §3.1 horizon work (frame-750 exit, snapshot
  schedule, the frame-500 menu snapshot, the frame-750 gameplay snapshot and
  their test assertions). Without that work a 3,000-frame ceiling is
  unmeasurable and the gate is effectively deleted, which is not what the
  owner asked for. **Real cost is the harness change, not the constant.**
- **Verdict:** correct budget, insufficient sensitivity.

### Option 2 — absolute ceiling + committed baseline delta — **recommended**

Hard-fail at 3,000 frames (the owner's actual budget). Additionally record the
measured `menu` frame per medium in a committed baseline, and fail when the
current run exceeds it by more than a band:

```js
// boot-deadline.json (committed):  { "atr_menu_frames": 554, "xex_menu_frames": 392 }
hard  fail: menu > 3000                         // the owner's 60-second budget
delta fail: menu > baseline + 50                // +1 s unexplained growth
delta warn: menu > baseline + 10                // visible, non-blocking
```

- **Catches:** the 2× case loudly (+554 frames ≫ +50); also catches the class
  the current gate was accidentally good at — an unexplained loader/decode CPU
  regression with no sector change — because the baseline does not move on its
  own.
- **Allows:** the whole 4.6 shape. The §7.3 ~745 B ask is ≤ 6 sectors ≈ **12
  frames**: below the warn band. A 4 KB level bank is 32 sectors ≈ **64
  frames**: one deliberate baseline re-record, in the same commit, with the
  reason in the commit message.
- **Cost:** one small committed JSON, ~15 lines in `runtime-wall-trace.mjs`, a
  line in the session-end checklist ("re-record the boot baseline when the
  transport grows on purpose"), and the same §3.1 horizon work as Option 1.
- **Property the owner asked for:** growth is *visible and deliberate* instead
  of *forbidden*. The baseline is data under review, not an identity.

### Option 3 — keep `190 + 2 × sectors + k`

- **Catches:** sector-neutral CPU regressions, as today.
- **Problem:** it is the same self-tracking identity, only looser. Choosing
  `k` is choosing a load-time budget again, by a different name, and every
  future candidate re-argues `k`. It also still fails the exact case that
  produced this decision: a record that grows without adding a sector while
  its decode costs one frame.
- **Cost:** one constant. Cheapest to write, and it preserves the problem.
- **Verdict:** not recommended.

**Recommendation: Option 2.** It is the only one that expresses the owner's
budget (60 s) and the owner's actual concern (a sudden doubling) as two
separate, independently meaningful numbers.

## 5. What the re-based deadline unblocks — computed

Inputs, all MEASURED: streaming costs **2 PAL frames per occupied 128-byte
sector** (confirmed across 177→182 sectors: 544, 546, …, 554 — exactly +2 per
sector); the current transport is **182 sectors**; the ATR menu milestone is
**554 frames**; PAL is 50 fps; the owner's budget is **60 s = 3,000 frames**.

| Quantity | Value |
| --- | ---: |
| ATR menu today | 554 frames = **11.08 s** |
| Owner budget | 3,000 frames = 60 s |
| Headroom | **2,446 frames** |
| Headroom in sectors (÷2) | **1,223 sectors** |
| Headroom in transport bytes (×128) | **156,544 B ≈ 153 KB** |

**The disk runs out long before the clock does.** The manifest reports
`remainingAtrSectors = 538` (`remainingAtrTransportBytes = 68,864`). Filling
every free sector of the single-density ATR costs 538 × 2 = **1,076 frames**,
putting the menu at **1,630 frames ≈ 32.6 s** — *half* the budget, with the
disk completely full. Under the re-based deadline the ATR boot time can no
longer be the binding constraint on a standard 90 KB disk at all.

**Against the 4.6 design's own numbers:**

| 4.6 item | Transport | Sectors | Frames | Menu at | Clock |
| --- | ---: | ---: | ---: | ---: | ---: |
| today | 23,296 B | 182 | — | 554 | 11.1 s |
| §7.3 full resident ask (~745 B) | +745 B | +6 | +12 | 566 | 11.3 s |
| §10.1 Option A level bank (4 KB) | +4,096 B | +32 | +64 | 618 | 12.4 s |
| eight levels × 4 KB | +32,768 B | +256 | +512 | 1,066 | 21.3 s |
| every free sector on the disk | +68,864 B | +538 | +1,076 | 1,630 | 32.6 s |

Decode-CPU surcharge: the worst measured anomaly is **+1 frame** for an
oversized single record (the 832 B throwaway arena at 180 sectors, 551 vs
550). Against 2,446 frames of headroom that is noise.

**Concretely, §7.4 of the 4.6 design is void as a risk.** Its three bullets —
"shrinking the arena buys nothing", "growing a direct-landing record must be
assumed to fail until measured", "a new level-bank record is a coin flip per
sector" — were all true *only* against a zero-slack identity. Under a
3,000-frame budget:

- record growth is affordable to roughly **153 KB** of transport, i.e. more
  than the disk holds;
- no 4.6 candidate needs to be "assumed to fail until measured" on boot-time
  grounds;
- the loader-ordering mitigation §7.4 proposed (landing 4.6 content in a
  record decoded *after* the menu milestone) is **unnecessary**, which also
  removes the rule-89 exception it would have needed;
- §10.3 decision 3 is answered "not sacred" — see decision 22.

**What still constrains 4.6, unchanged by this decision:** resident RAM, not
boot time. `remainingSafeResidencyBytes = 3,653`,
`maximumNewSimultaneousResidencyBytes = 7,993`, `maximumExtensionChunkBytes =
6,400`, `maximumChunkCount = 8` with 4 records used; `HYBRID_C_ARENA` 215 B
free, `BROADSIDE` 3 B, `ENTITY_CODE` 1 B. The §7.3 deficit of ~350-450 B is a
**placement** problem and remains exactly as stated. §10.3 decisions 1 and 2
are untouched.

---

## 6. What was implemented — 2026-09-19

Added by the follow-up implementation session on the same branch. Sections 1-5
above are the previous session's report and stay as written.

**Owner chose Option 2.** `scripts/runtime-wall-trace.mjs` (`runBootSmoke`,
the single site of §2) now applies, per session:

| Check | Rule |
| --- | --- |
| hard fail | `menu > 3000` and `frontend_poll > 3000` — the owner's 60-second budget |
| hard fail | `menu > baseline + 50` |
| warn (stderr, non-blocking) | `menu > baseline + 10` |

The baseline lives in [../boot-deadline-baseline.json](../boot-deadline-baseline.json):
XEX **392**, ATR **554**, measured 2026-09-19 from this build
(`ecc9ceda…`, 182 transport sectors). Re-record it deliberately, in the same
commit as a transport growth, with the reason in the commit message.

The per-session result is written into the report as `boot_deadline`
(`menu_frame`, `baseline_frames`, `delta_frames`, `warn_at_frames`,
`fail_at_frames`, `warned`), and the deadline configuration into
`boot_smoke.deadline`, so the committed report shows what the gate measured
rather than only whether it passed.

**The §3.1 horizon work was done with it**, because without it a 3,000-frame
ceiling is unmeasurable:

| Site | Before | After |
| --- | --- | --- |
| `atari800-wall-trace.h` session exit | frame 750 | frame **3300** (`DFBOOT_GAMEPLAY_FRAME`) |
| snapshot frames | `1, 250, 300, 500, 750` | `1, 250, 300, 3050, 3300` |
| menu proof snapshot | 500 | **3050** (`DFBOOT_MENU_FRAME`) |
| FIRE press | frames 501-506 | frames 3051-3056 |
| gameplay proof snapshot | 750 | **3300** |
| `milestones.main_loop <` | 750 | 3300 |
| report `frames_observed` / `duration_seconds_pal` | 750 / 15 | 3300 / 66 |

**Why 3050 and 3300.** The menu proof must sit *above* the ceiling, or a boot
that lands exactly at the ceiling is never observed and the gate is nominal;
3050 is the smallest round frame above 3,000 with a little slack. Nothing
presses FIRE before that snapshot, so the build waits in the menu and the
`game_state == 1` proof holds for a fast boot and a slow one alike. 3300 keeps
the same 250-frame menu→`main_loop` handoff window the old 500/750 pair gave.
`readBootDeadline` asserts `absolute_ceiling_frames < BOOT_MENU_FRAME`, so the
ceiling cannot be raised again without the horizon.

`LOADER_DURATION_FRAMES = 250` is **unchanged**; it did not block this work —
it is a floor between `loader` and `menu`, not a ceiling.

**Cost.** The boot smoke runs 4 × 3,300 frames instead of 4 × 750: measured
**~14.5 s** wall clock instead of ~5 s, under `-turbo`. No guest bytes added.

**Measured with the new gate on this build** (`ecc9ceda…`, 182 sectors):

| Session | `menu` | baseline | delta | warn at | fail at | ceiling |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `xex-a5` / `xex-5a` | 392 | 392 | 0 | 402 | 442 | 3000 |
| `atr-a5` / `atr-5a` | 554 | 554 | 0 | 564 | 604 | 3000 |

**The `transportCapacity` assertions in the six format/layout tests were not
touched**, as §3.2 requires: they are transport-format pins, not deadline pins.

**The stale committed report of §3.2 was regenerated** in the same session, as
a separate change: `docs/runtime-wall-trace.json` was `ab682d84…` / ATR menu
502, against the accepted runtime `ecc9ceda…` at menu 554.
