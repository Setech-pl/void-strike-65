# Main-menu title colour run is two cells short — `BLOCKED_MENU_TITLE_COLOUR_RUN`

> **RESOLVED 2026-09-20 — owner chose candidate 1, implemented as a derivation
> rather than a corrected literal.** The title string now exists once, as
> `.define MAIN_MENU_TITLE_TEXT` in `src/main.s`, and
> `MAIN_MENU_TITLE_LENGTH = .strlen(MAIN_MENU_TITLE_TEXT)` is what
> `style_main_menu_title` loads into X. `scripts/preview.mjs` keeps deriving its
> run from the title record and no longer carries the title as a literal of its
> own. `tests/frontend.test.mjs` ("the runtime highlights the whole main-menu
> title, however long the title is") evaluates the routine's own `ldx` operand
> and compares it with the record's length, so neither side can be given a
> number by hand again. Cost: **0 bytes, 0 cycles** — the label file is
> byte-identical to the pre-fix build and every segment size is unchanged.
>
> `--menu-raster-only` now clears the title clause and every other per-snapshot
> clause, and stops one clause further along, on the harness's hard-coded
> `canonicalRasterSha256` (`runtime-wall-trace.mjs:1992`) — an accepted-raster
> hash captured before the fix. All ten required checkpoints agree on one new
> raster, `ee08628457a1c489a7ee780c7e2739410c31284c53e9b021f4d2ff8efad8999a`.
> Re-accepting that hash is the owner's call, because it *is* the player-visible
> image; it was deliberately not changed in the fix session. With the hash
> temporarily swapped locally the audit runs to completion, 8/8 sessions — so
> the stale hash is the only thing left in its way.


Session: FIX, 2026-09-20. Branch `wip/4.5d-gate-fail`, HEAD `4f72614`.
Build: `npm run build:candidate -- --quiet`, XEX
`4ff49d887e7375076214d3461f598bc6d59218789c8e3e3ac7b3ee17f2944415` —
byte-identical to the committed candidate. **Not caused by this session**: the
session changed harness code only and the XEX reproduces unchanged.

This is a **defect**, reported and not fixed, per the task's instruction. The
fix is one byte of ca65 and it is a player-visible rendering change, so it is
the owner's call — see "What the owner decides" below.

## What was measured

`--menu-raster-only` reaches the live sessions and stops on:

```
Error: xex-00 0:3 differs from the generated frontend asset
```

The screen is the only asset that differs; the frontend charset and the
main-menu display list are byte-identical. The difference is **two bytes**, at
screen offsets 16 and 17 (row 0, columns 16-17), and it is the same two bytes
in **all 30 snapshots** of the session — every menu generation and menu age, so
it is the steady state, not a transient.

| Offset | Observed | Expected | Glyph code | Difference |
| ---: | ---: | ---: | ---: | --- |
| 16 | `$07` | `$47` | 7 | `ANTIC67_COLOR_PF1` (`$40`) clear |
| 17 | `$06` | `$46` | 6 | `ANTIC67_COLOR_PF1` (`$40`) clear |

The glyph codes agree. Only the ANTIC 6/7 colour bits differ: the runtime
colours **12** title cells (columns 4-15, `VOID STRIKE `), the generated
expectation colours **14** (columns 4-17, `VOID STRIKE 65`). On screen the
title reads `VOID STRIKE` in PF1 with `65` left in the plain colour.

## Root cause — the 2026-09-04 rename, dated

Two sides encode the title's length, and only one of them followed the rename.

* Runtime, `src/main.s:1966` (`style_main_menu_title`): `ldx #11` … `bpl` —
  a hard-coded 12 cells at `MAIN_MENU_TITLE_OFFSET+4`. Last touched by
  `90ffbd8`, **before** the rename.
* Generator, `scripts/preview.mjs:1428`: `for (index < title.text.length)` —
  derived from the record, so it follows the title automatically.

Before `d72dd6a` (*refactor(brand): rename game to Void Strike 65*,
2026-09-04) the title was `DARK FIGHTER`, **12 characters**, and the two agreed
exactly. The rename lengthened it to `VOID STRIKE 65`, **14 characters**. The
generator followed; `ldx #11` did not. `d72dd6a` touched
`scripts/preview.mjs`'s title loop and did not touch `src/main.s:1966`.

The defect has therefore stood since 2026-09-04 and was masked the whole time:
`--menu-raster-only` aborted in its static clauses long before reaching a live
session (see the commit that accompanies this note), and
`tests/menu-raster.test.mjs` reads the stale committed
`docs/menu-raster-trace.json` rather than a live run.

## What the owner decides

The disagreement is real; which side is wrong is a design question.

1. **The runtime is wrong** — the title should be one PF1 run. Fix:
   `src/main.s:1966`, `ldx #11` → `ldx #13`. Costs 0 bytes and 0 cycles of
   raster work (the loop runs twice more, once per menu build, outside the
   visible frame). `docs/menu-raster-trace.json` then regenerates clean.
2. **The runtime is right** — `65` in the plain colour is the intended
   two-tone title. Fix: `scripts/preview.mjs:1427-1431` colours the record's
   first 12 cells rather than `title.text.length`, and the intent is recorded
   so the next rename does not silently re-open it.

Either way the pair should stop encoding the length twice: whichever side
wins, the other should derive its run from the same figure.
