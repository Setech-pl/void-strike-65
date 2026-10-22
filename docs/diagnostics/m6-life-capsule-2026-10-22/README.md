# M6 stage 2 — placement diagnostics (2026-10-22)

**Recovery A built: OWNER-SMOKE CANDIDATE.** The owner selected A; see
[the option-A build report](option-a-candidate.md). The failed attempt below
is preserved historical evidence; the blocker is resolved, owner smoke pending.

## Original BLOCKED_WINDOW_BYTES attempt

Session: Codex. Branch `codex/m6-life-capsule`, Phase A commit `83f6ec2`.
The owner picked rescue cross A and authorized Phase B. This is a failed
implementation attempt, not an owner-smoke candidate. Production edits were
reverted; the committed Phase A plan and art sources remain untouched.

## Measured failure

`node scripts/build.mjs --candidate --level=1` failed at the link assertion:
`LIFE tail does not start at $B82A`. No capsule ATR was produced. A second
diagnostic invocation captured assembler listings at the same failure without
removing any assertion. Neither run reached ATR generation.

The new sector-entry call is in `enter_sector`, which currently resides in
`HYBRID_C_WINDOW`, not DIRECTOR_C_CODE. Its 3 B shifts the Light kernel from
$B478 to $B47B and the intended capsule start from $B82A to **$B82D**. That
is the first failing assertion. Independently, the assembled new payload is
**299 B**: ASM/data **204 B**, C **95 B**. With the hook: **302 B demanded
against 214 B available, 88 B short**, projected end **$B958** versus the
lance's fixed **$B900** start. Merely adjusting the tail's pin would still
overlap the lance; it is not a repair.

| Assembled content | Bytes |
| --- | ---: |
| Four masks, state and fixed vectors | 78 |
| Spawn/rotation veneer | 34 |
| Forced-entry execution veneer | 30 |
| Collection, sound and cue veneer | 47 |
| Colour publication veneer | 15 |
| C drop decision | 56 |
| C capped life award | 19 |
| C forced-entry decision | 20 |
| New call in existing window code | 3 |
| **Total** | **302** |

The Phase A 125-160 B estimate was too small. No gate was relaxed or baseline
changed to accommodate the attempt. Frame/DMA and boss-entry checks were not
reached for a completed build. Boss source was untouched. The unchanged source
assertion and baseline linked label still place `summary_display_list` at
**$0B58**; there is no new linked ATR to validate.

## Recovery choices — require an owner resource decision

Both retain the chosen look and all agreed drop/collection rules, keep policy
in C, leave the lance at $B900 and use no new capsule/PMG/effect slots. Neither
has been implemented or built. Counts below allocate the assembled prototype
pieces; final packing and guards still need the build.

| Choice | Player-visible effect | RAM/code payer | Window left | CPU/raster and risk |
| --- | --- | --- | ---: | --- |
| **A — new C policy in DIRECTOR_C_LOW (recommended)** | Same art, drop rules and feedback | Put the 95-B new C object after existing low C. Its baseline free tail is 140 B; budget 6 B for the init clear, leaving **at least 39 B** there. Retarget the existing star-publication call byte-neutrally to a 6-B ASM continuation veneer in PICKUP_CODE (13 B free -> **7 B**), so the old window addresses stay fixed. Keep all four masks in the appended tail. Outside-window net growth budget: **+59 B raw** (95 + 6 + 6 - 48 moved masks). Window growth **204 B** | **10 B** | No extra per-frame policy poll; new code remains event-driven. Prototype colour publication adds **25/26 cycles IC** per fighter frame and effects add their existing cost while active; native total is unmeasured. Boot transport likely needs 1-2 more sectors (EST); thin window margin. |
| **B — policy in DIRECTOR_C_LOW, all four masks in STARFIELD** | Same as A | Same low-C/continuation placement. Keep the existing contiguous 48-B table at its source home and append LIFE's 16 B, rather than move the table to the window. Window growth **140 B**; outside-window net growth **+123 B raw** (95 + 6 + 6 + 16). No new renderer branch needed | **74 B** | Same CPU shape as A. Initial-block raw data grows **16 B**, against the baseline's **43 B** content margin (13,609 -> STOP 13,652); packed effect and transport are unmeasured. More window room, less initial-block room. |

The effects pool does not support allocating one free fragment independently:
its update path assumes all four fragments exist whenever its mask is nonzero.
The saved implementation therefore reuses the existing five-slot breakup only
when the pool is completely empty, with a growth glyph at its centre. It does
not erase another effect. No partial allocation or renderer redesign was made.

The prototype is preserved for review, not runtime use:

* `implementation.patch` contains only this attempt's production edits and new
  source/data files. Do not apply and boot it without resolving the placement.
* `build-failure.log` records the first failing assertion.
* `assembled-sizes.txt` contains the relevant assembler offsets.
* `measurement.json` records exact byte counts and validation limits.

No full tests, targeted tests, boss stress, wall trace, GIFs, ledger deviation,
merge, push or release. STATUS is unchanged because this blocker has not been
promoted to the official project state. Await the owner's placement choice.
