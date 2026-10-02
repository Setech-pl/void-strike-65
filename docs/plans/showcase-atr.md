# Showcase from the ATR — gameplay GIF, timing chart, recaptured frames, README

Branch `docs/showcase-atr`, cut from `main` `c0d13c9` on 2026-10-02.
Owner decision 2026-10-02 ([plan-realizacji.md](../plan-realizacji.md) §0
item 1): the showcase is the next task and includes recapturing the screenshots
from the ATR; it absorbs `chore/showcase-recapture` from
[budget-1.0.md](budget-1.0.md) §2 M9.

Status: **PLAN** (Phase A). No game byte changes: the ATR
(`f127d7a4…f09cf49e`) and the boot image (`1daed1be…943bd33`) at the end must
equal those at the start.

## 1. What exists today (inventory)

* `scripts/github-showcase.mjs` (`npm run showcase`, `-- --capture`) writes
  `docs/media/manifest.json`: nine gameplay frames (`docs/media/gameplay/01…09`),
  four source-derived asset sheets (`docs/media/assets/`), two owner concept
  images. Without `--capture` it re-reads the committed gameplay frames and
  regenerates the asset sheets only.
* `--capture` runs the trace observer smoke (`runtime-wall-trace.mjs
  --smoke-frames=150`) for frames 25/31/100/113 and the focused session
  `weapon-pickup-2-hunt-fire4` for the Rapid Fire pickup/active frames. It does
  **not** produce three of the nine sources: the Spread frame (written only by
  `weapon-pickup-spread-0-hunt-fire4`), the engine frame
  (`engine-atr-a5-0-immediate-096.png`, written by the `engine-first-150`
  session) and the loader frame (the boot smoke's `atr-a5` snapshot). They were
  taken from whatever a previous full trace left in `build/`.
* Every committed gameplay frame records `source_medium: "XEX"`; the Spread
  frame records frame 3351 against the evidence's `capture_frame` 2537.
* **Geometry finding (MEASURED).** Under the harness default
  `SDL_VIDEODRIVER=dummy` the Atari800 screenshots are 256×192 (no HUD, no
  border); under the macOS desktop driver (`cocoa`) they are the native 336×240
  that `cropRuntimeFrame` requires. The XEX-era frames were 336×240, so they
  were captured with a desktop video driver. The harness honours an inherited
  `SDL_VIDEODRIVER` (`process.env.SDL_VIDEODRIVER ?? "dummy"`), so the capture
  scripts set it; no harness change.
* Tests that read the media: `tests/github-showcase.test.mjs` (manifest
  binding, regeneration, concept art, README structure, README links/images) and
  `tests/preview.test.mjs` (the generated previews; it does not read
  `docs/media/`).

## 2. The two recorded failures

| test | first failing assertion | fixed here? |
| --- | --- | --- |
| `github-showcase` "showcase manifest binds every image to the current packed release" | `tests/github-showcase.test.mjs:67` — `spread.frame` 3351 ≠ evidence `capture_frame` 2537 | **Yes.** A `--capture` run on the current ATR records the evidence's frame and `source_medium: "ATR"` for all nine. |
| `preview` "preview consumes the canonical charset, screen, PMG, and palette source" | `tests/preview.test.mjs:166` — the gameplay preview does not change when `player_shape` changes (24 of 29 rows drawn) | **No.** A `scripts/preview.mjs` defect (`chore/preview-29-rows`); none of this task's deliverables touch it. It stays recorded. |

## 3. Deliverables and scripts

1. **Gameplay GIF** — `scripts/showcase-gif.mjs` (`npm run showcase:gif`).
   * Replay: the existing deterministic session
     `weapon-pickup-spread-0-hunt-fire4` (level 1, EASY, scripted `hunt` input,
     fire delay 4), run focused with `--only-session`, with
     `DFTRACE_ENGINE_SCREENSHOT_PREFIX`/`_LIMIT` capturing every gameplay frame.
     The focused run writes only into `build/`.
   * Scene, gameplay frames **450–1149** (700 frames, 14.0 s at 50 Hz),
     located from the session's CSV: Rapid Fire running out with a Bomber and an
     Interceptor on screen; the Spread capsule admitted at f480 and collected
     at f537; Spread volleys (three-shot fan, then the single follow-up) through
     the open space; the capital sector from f940, both hulls on screen, the
     first `BROADSIDE` at f1024.
   * Encoder: a dependency-free GIF89a writer in the script (LZW, global
     palette of the colours the frames use, frame differencing with a
     transparent index, infinite loop). The Atari800 screenshots are already
     indexed PNGs, so no quantisation happens and no package is added.
   * Output: `docs/media/showcase/void-strike-65-level-1.gif`, 320×240 (the
     same 8-pixel side crop as the gallery), ≤ 5 MB. Its provenance (ATR
     SHA-256, session, frame range, frame delay, bytes, SHA-256) goes into
     `docs/media/manifest.json` under `animations`.
2. **Timing chart** — `docs/media/timing-history.json` (data, one cited source
   per value) and `scripts/showcase-timing-chart.mjs` (`npm run
   showcase:chart`) → `docs/media/showcase/timing-history.svg`. Two stacked
   panels on a shared milestone axis (no dual axis): worst line-238 fence margin
   against GO 500; DMA-on maximum against the target 31,200 and the hard gate
   32,568. The script verifies every cited value against the cited file at the
   cited commit (`git show`) before drawing.
3. **Recaptured gallery** — `npm run showcase -- --capture` extended to run
   every session its nine sources need (boot smoke, observer smoke, the Rapid,
   Spread and engine sessions), with the desktop video driver.
4. **README.md / README.pl.md** — the GIF and the chart under the opening
   paragraph, the releases link, how to run, licences; headings unchanged.

## 4. Chart data (sources)

All values are copied from committed evidence; `timing-history.json` holds the
exact quote for each.

| date | milestone | commit | worst fence margin | DMA-on max | sources |
| --- | --- | --- | ---: | ---: | --- |
| 2026-09-21 | Pre-4.6 baseline (Light multiplicity A/B) | `82c155b` | 1,464 | — | STATUS §Light multiplicity step 5, A/B table |
| 2026-09-21 | Light multiplicity step 5 | `4cd3024` | 552 | — | STATUS §Light multiplicity |
| 2026-09-21 | Ring-rotate token gate | `9fc73b9` | 2,981 | — | STATUS §ring-rotate token gate |
| 2026-09-22 | Music v2 GRA-2 | `944450f` | 1,985 | 31,200 | STATUS §Music v2 10.2; trace JSON |
| 2026-09-22 | Heavy break-up | `1fa7e7e` | 979 | 31,216 | STATUS §Heavy break-up; trace JSON |
| 2026-09-22 | Capital hulls v2 FULL MASS | `73108dc` | 979 | 31,351 | STATUS §Capital hull set v1 step 1; trace JSON |
| 2026-09-23 | Main-menu star sky | `c8320e9` | 991 | 31,349 | STATUS §Main-menu star sky; trace JSON |
| 2026-09-23 | Director 4.6 step 1 | `28bd1e7` | 991 | 31,349 | STATUS §4.6 step 1; trace JSON |
| 2026-09-29 | Director 4.6 step 2 | `dbf6b1c` | 727 | 31,670 | STATUS §4.6 step 2; trace JSON |
| 2026-09-29 | Pickup boost colour | `830a023` | 788 | 31,626 | STATUS §Pickup boost colour; trace JSON |
| 2026-10-01 | Spread volley | `02ed450` | 785 | 31,121 | STATUS §Spread volley; trace JSON |
| 2026-10-01 | **v0.1.0** | `cf99af3` | 785 | 31,121 | STATUS at `cf99af3`; trace JSON |
| 2026-10-01 | **v0.2.0** (step 5) | `7d3697b` | 788 | 31,133 | STATUS §4.6 step 5; trace JSON |
| 2026-10-02 | Heavy break-up rotate gate | `2777e8f` | 1,439 | 31,133 | STATUS §rotate gate; trace JSON |

Left out: the three September-21 points have no committed DMA-on figure (their
STATUS sections state only the fence margin, and `docs/runtime-wall-trace.json`
was not regenerated at those commits), so their DMA-on value is absent;
`v0.1.1` (2026-08-06) predates the line-238 fence audit and has neither value.
Pre-2026-09-20 figures are from XEX replays and a different replay set; they
are not on the chart.

## 5. Tests affected

* `github-showcase` "binds every image…": passes after the recapture — leaves
  `docs/recorded-test-failures.json`.
* `github-showcase` "README links and image sizes…": `imageTargets.length` 8 →
  10 (the GIF and the chart are added), a layout pin re-pinned with its reason.
  The 4 MB README image budget is unchanged and still asserted.
* New assertions for the GIF and the chart: the manifest binds the GIF to the
  current ATR and its bytes; the chart data's every value has a source, and the
  SVG regenerates byte-identically from the data.

## 6. Status bookkeeping

`docs/STATUS.md` and `budget-1.0.md` §2 M9 record that `chore/showcase-recapture`
is done (dated note). No other document changes.
