# L2 Phase B — computed MAIN-tail gate STOP

**BLOCKED_MAIN_TAIL_GATE**, 2026-10-25. Not an OWNER-SMOKE CANDIDATE.
Base: `codex/l2-phase-module` `bac5e79`; production code baseline `19b1464`.
Owner accepted Phase A and its art/reserve choices; those are recorded in §BW.7.

## Confirmed blocker

The checked-load skeleton adds overlay directory entry 11 and its two-byte
expected run fold. The existing disk guard lives inside the MAIN Light
composite. Adding the fold grows that composite from **MEASURED 1,196 to
1,198 B**, leaving **MEASURED 15 B** of its **1,213-B** capacity.

The normal build's actual computed validator at `scripts/formats.mjs:342`
requires **MEASURED (declared) at least 16 B** free. It exits with:

```text
Error: the Light composite leaves fewer than 16 MAIN bytes
```

Exact deficit: **MEASURED 1 B**. Maximum legal composite use is
**MEASURED 1,197 B**; the attempted skeleton uses **MEASURED 1,198 B**.
This is a current build/source constraint, not a CPU estimate. The accepted
Phase A resident table forecast **ESTIMATE 15 B** free after a new fold; that
forecast overlooked the existing validator. No gate or assertion was relaxed.
The owner's explicit Phase B STOP condition is “any computed gate failing”.

## What was attempted and restored

Only the checked-load skeleton: private fixed-entry L2 link/run, directory and
checksum wiring, reload at `summary_level_loaded` including resident hits.
No coordinate, island, debris, brake, warning or production art changes.

The summary's display-list pin initially rejected inserted inline code.
The scaffold instead replaces the existing `LDA MUSIC_ACTIVE` by a same-size
JSR and puts checked reload/INIT/displaced LDA in the existing tail. Its final
linked display list remains **MEASURED $0B58**; summary uses **MEASURED
1,792/1,792 B**. This is another correction to Phase A's **ESTIMATE 10-B**
summary allowance: the preserving-layout helper actually needs **MEASURED
17 B**, leaving **MEASURED 0 B**, not the forecast seven. The independently
linked LIFE and boss-entry constants were rebound for the fold growth; no
per-frame timing certification was attempted after the computed gate failed.

| Failed-skeleton allocation | MEASURED result | Evidence |
| --- | --- | --- |
| L2 | $1900-$1FFF; 22 used / 1,792 capacity; 1,770 free | `l2.map.txt`, `l2.lbl.txt` |
| Run | entry 11, sectors 251-264, 14 whole sectors | `incomplete-skeleton.patch`, `measurements.json` |
| MAIN Light | 1,198/1,213 B; 15 free; minimum 16 | `light-kernel.map.txt`, `measurements.json` |
| Reader | 1,508/1,536 B; 28 free; +5 directory B | `sector-reader.map.txt` |
| Summary | 1,792/1,792 B; 0 free; +17 helper B | `level-summary.map.txt` |
| Resident increase | 24 B = 2 Light + 5 reader + 17 summary | Exact arithmetic above |
| L2 reserve | 256 B designated; unused stub is not first-content fit proof | `measurements.json` |

All incomplete production edits were restored. The three new scaffolding
source/config files were removed after saving their reviewable patch. The
normal build on restored production sources **PASS** with the expected stale
runtime-evidence warning. Campaign ATR is byte-identical to the accepted L1
baseline:

```text
410652973ed76f0033f0fbff84c17a484104f95ff97cbcc1d9eff9e6cb996ae7
```

No failed ATR is offered for play. Actual final production CPU/RAM/residency/
disk delta is **MEASURED zero**. Only decisions and diagnostic documents remain.

## Compliant recovery options, not implemented

All recovery sizes/cycles below are **ESTIMATE**, from static instruction/layout
arithmetic; none is a linked or runtime PASS. All preserve player-visible
behaviour, the checked whole-run guarantee and the existing minimum-free gate.

| Option | Player effect | RAM/code and CPU | Limits / risk |
| --- | --- | --- | --- |
| **A, recommended: reader cold checksum extension** | Same checked level-start load | Keep original guard table/LIFE addresses. A same-size JMP replaces guard_check's opening LDA. Reader helper distinguishes entry 11, compares its separately stored fold, otherwise resumes displaced original guard logic. Approx. 19 code + 2 sum B fits the measured 28-B reader tail, leaving approx. 7 B. Zero per-frame cost; extra cold-load instructions must be timed. | Needs a pinned/generated cross-link entry and checksum relink. Restores 17 MAIN free B and avoids moving LIFE/boss kernel entries. Reprice resident subtotal by +19 B relative to the simple 2-B fold approach. Summary remains full. |
| B: recover space inside Light | Same | Recover at least 1 B within the current composite; 2 B would retain original 17-B slack. No new reservation. Instruction cost depends on the verified replacement. | No safe specific byte optimisation was proven in this stopped run. Per-frame code must gain no page crossing/cycle regression; cold guard optimisation preferred. Cannot assume a free byte. |
| C: move guard into reclaimed C-sector space | Same | After the already-planned phase-body move, approx. 99 guard/code/table/state B can be split across the 95-B reclaimed hole and separate 7-B tail; original MAIN area can be padded to preserve LIFE addresses. Cold-only call costs; no new per-frame callback into L2. | Uses almost all the space Phase A reserved for later dock policy. Requires repricing that later consumer and guard ABI consumers. More placement work than A. |

The smallest recovery is **one additional MAIN byte**, with all existing gates
intact. Option A avoids spending MAIN bytes for the new checksum at all. The
owner's STOP rule prevents applying it in this run; resume with that narrow
recovery, then continue the previously accepted Phase B sequence.

## Verification and remaining work

- Normal build on original baseline: PASS.
- Final skeleton normal build: FAIL at the exact computed assertion above.
- Restored normal build: PASS, expected pending release evidence.
- No focused gameplay tests run; no test files edited or assertions weakened.
- No PAL routes, stress, page-cross certification, boot smoke or load timing
  measurements claimed. The skeleton failed before those steps.
- No full tests, wall trace, stage-2, reconciliation, release build or packaging.
- No candidate campaign/960-row/boss ATR set; no owner-smoke designation.
- No merge. Branch push carries §BW.7 and this evidence only.

NEXT TASK: resolve this computed-gate STOP using a reviewed recovery (A is
recommended), then resume skeleton → coordinate/compiler → islands/debris/art
→ brake/warning → focused measurements and owner-smoke candidate.
