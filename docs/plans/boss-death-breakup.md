# Boss death breakup — Phase A

**OWNER REVIEW CANDIDATE, 2026-10-22.** Branch `codex/boss-death-breakup`,
from clean `main` `686d3f5`. Offline mockups only; no game code, build,
runtime measurements or new ATR. The owner picks a direction before Phase B.
The accepted game, resident allocation and window allocation are unchanged.

## Rendering facts used

Read AGENTS.md (including §BM), current STATUS, `boss-concepts.md`,
`s5-boss-regions.md`, `boss-art.md`, `boss-polish.md`, `boss-order-scale.md`
and the current converter/controller/renderer. The concept page's historical
“not implemented” disclaimer and old region numbers do not override current
code: `order.json` is `[1,4,3,2]`: Breaker, Citadel, Spine, Bastion.

`src/hybrid/boss.s` (`boss_install`, `boss_apply_pos`, `boss_motion`,
`boss_pal_dli`) displays ANTIC 4 rows, 64 codes per stored row, with LMS on
each row and HSCROL enabled. Rows 0–5 occupy `$A880`, rows 6–7 `$AC80`;
the tables start at `$AD00`. Only occupied rows are shown: **5/5/8/5** in
campaign order. One cell is 8 screen pixels wide × 8 scanlines; its four
multicolour pixels are twice as wide as tall. The horizontal position obeys
`LMS*4 - HSCROL = p`, not two independent scroll registers for two halves.
COLPF1/COLPF3 change at row boundaries. Void Citadel is stationary in combat;
the others drift. Mockups freeze each boss at its authored starting position.

Today `boss.c` enters CHAIN on the last weapon's destruction, fills module
rectangles with blast glyphs, then HOLD and handoff. The proposed animation
replaces that ending after combat cleanup. It must use the actual surviving
screen cells, never reconstruct intact weapons. These storyboards use one
consistent reachable fixture: all modules gone, with the final weapon broken
until tick 20; nozzles go dark on defeat. The Spine's field has already
collapsed with its generators. Intact hull cells remain.

## Three choices

All numbers below are **ESTIMATES**, not measurements or PAL certification.
Bytes include shared C policy, ASM publication, PMG masks and four small boss
descriptors; they exclude existing glyphs and runtime scratch. Cycles are
conservative peak **death-engine CPU cycles/frame**, including its DLI work;
they exclude unchanged music/VBI, ANTIC DMA and frame waiting.

| Variant | Look and motion | Disk run | Peak CPU/frame | Defeat to end / whole GIF |
| --- | --- | ---: | ---: | ---: |
| **A — clean split** | Two pieces at column 32; both move one character outward each frame. Two-tick flash, brief common band shake; no extra PMG. | 896–1,152 B, 7–9 sectors | ~12,000 | 1.24 s / 1.64 s |
| **B — crown launch** | Top two complete rows fly up one row every 3 frames; lower rows split at the final weapon's centre. Wings move one character/frame. P1/P2 edge fragments + two missile sparks. | 1,280–1,536 B, 10–12 sectors | ~14,000 | 1.48 s / 1.88 s |
| **C — staggered tear** | Central 12-column × 3-row cap launches up one row every 4 frames, after 8 flight ticks. Off-centre split at the final weapon; right wing starts 4 frames later. P1/P2 + four missile sparks. | 1,536–1,792 B, 12–14 sectors | ~21,000 | 1.80 s / 2.20 s |

The GIFs include 0.40 s before defeat and a quiet tail. All animation advances
in 20 ms PAL ticks; identical holds are merged by the existing GIF encoder
without changing their duration. Stills use nearest-neighbour ×2 (640×480).
The background stars and lower guide are schematic; the boss cells, damage
looks, blast glyphs and PAL colours come from the current real assets.

**Recommendation: B.** It gives the requested third piece without C's extra
composition work. A is a cheaper two-piece comparison and omits the upward
piece. B separates the cap vertically, so its source-row palettes can follow
it. C's cap crosses rows occupied by the wings: the mockup intentionally
switches the entire boss to one death palette at launch. Preserving separate
horizontal palettes there would require a different raster design.

## Hardware method and limits for Phase B

Use one data-driven engine: shown row count, existing row addresses and
palettes, split column (clamped to the visible span), cap rectangle, cadence
and effects amount. C owns phase/cadence decisions; ASM performs bounded
copies, display-list publication and PMG writes. No combat AI runs alongside
it. Reuse existing boss exit/vector sites; add no resident or window storage.

For A/B, shift left spans in ascending order and right spans in descending
order, clear the newly exposed seam and discard codes at each outer edge.
Keep common HSCROL fixed except during the short shake. For B, preserve the
cap rows and change their LMS placement; replace vacated rows with blank
rows. The two positions above the band (divider/top blank) become death-only
ANTIC 4 rows, so the cap clips at the top of the visible area. Rebuild the
death display list and palette schedule after the previous frame has passed;
retain the bottom HUD and restore the summary's display on handoff.
For C, compose disjoint spans from a saved source into a blank working band.
No bitmap scaling, rotation, sub-character sideways motion or alpha blending.

Budget basis: at most 512 source cells, about 16 cycles per copied cell plus
row setup; C additionally clears up to 640 working cells (~5,120 cycles with
grouped stores). Allow ~1,000–2,000 cycles for bounded PMG/phase work and
~2,000 for palette/list/DLI work, then round upward. No full PMG-page clear
each frame: erase previous short spans and publish two 8-bit strips and up to
four fixed-X missile trails. No multiplexing. Setup copies should be spread
over the lead-in if necessary. These estimates do **not** prove a complete
frame is below the 31,500 target or 32,568 hard gate; C has the largest risk.

**Disk-only residency proposal:** after quiescing combat, read the selected
shared engine over dead C/D/scratch storage in the existing `$1000–$1FFF`
boss claim. Maximum proposal: code/data 1,792 B + source 512 + working band
640 + list 128 + palettes 80 + state 64 = **3,216/4,096 B**, reusing the
claim; **0 new resident bytes, 0 new window bytes**. Preserve `$0C00` charset,
band/tables and existing PMG pages. This is a placement estimate, not a new
reservation. Disable the old DLI before overwriting its slot-D palette code;
the death engine installs its own DLI. Restore/reload fight overlays only at
the normal next entry; summary/START GAME keep their existing restore duties.

**Visible limitation omitted from GIFs:** a post-fight disk read is required
before this overlay can run. At an assumed ~4 PAL host frames/sector the
run alone adds roughly **0.56–0.72 / 0.80–0.96 / 0.96–1.12 s** (A/B/C),
plus takeover; slower drives can take longer. This is an estimate, not a new
measurement. The current polled reader owns POKEY and requires silent audio:
an uninterrupted score/explosion soundtrack during the read is not promised.
A held defeat image or short black transition and a fresh explosion cue on
return must be designed in Phase B. Streaming while combat continues is not
assumed. Glyph/row steps and the limited PMG count are hardware-compatible
methods; flicker-free takeover, palette landing, disk guards, complete frame
cost and the exact load/exit integration remain unverified on real hardware.

## Rebuild and review

```sh
node scripts/boss-death-breakup.mjs --regions=1,2,3,4
```

Outputs are under `build/play/boss-death-breakup/` (generated, uncommitted):

* `index.html`: all looping comparisons and links to ×2 key stills.
* `comparison-x2.png`: rows in campaign order, columns A/B/C, flight tick 4.
* `r1-blockade-breaker-{a-clean-split,b-crown-launch,c-staggered-tear}.gif`
* `r2-void-citadel-{a-clean-split,b-crown-launch,c-staggered-tear}.gif`
* `r3-siege-spine-{a-clean-split,b-crown-launch,c-staggered-tear}.gif`
* `r4-bastion-{a-clean-split,b-crown-launch,c-staggered-tear}.gif`
* Matching `*-f019-x2.png` (last weapon), `*-f033/035/039-x2.png`
  (A/B/C flight tick 4), `*-f041/043/047-x2.png` (flight tick 12).
* `manifest.json`: every exact filename, frame, split, final weapon and estimate.

Validation is offline rendering and GIF timing/PNG inspection only. No game
tests, build or runtime-evidence regeneration applies to this mockup-only
change (§BM); no implementation or acceptance claim. **NEXT TASK: owner
chooses A/B/C or requests a visual adjustment. STOP before Phase B.**
