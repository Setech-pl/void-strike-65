# Siege Spine engine-nacelle link

2026-10-26. Task `spine-nacelle-link`, base `ab5e5ed`, branch
`codex/spine-nacelle-link`. Implemented; **OWNER-SMOKE CANDIDATE**, owner smoke pending.

Owner waived §BU.9 and the one-session-per-folder check for this task.
Recheck branch/HEAD/status before each commit; preserve other sessions' files.

## Findings

`assets/graphics/boss-regions/region-3/modules.json`: gen-l (11,1) and
 gen-r (49,1), each 3×3 characters = 12×24 ANTIC multicolour pixels.
`src/hybrid/boss.s:boss_draw_module` GONE fills all nine characters with
`BOSS_T_CAVITY` (R3 code 0). Nozzles are separate characters at columns
10/52, rows 1/2/3, so both sides have the same defect. Their phase-zero
pixels occupy local rows 1–5, 9–13, 17–21, matching the brief.

The brief's cells are art pixels, not the engine's 4×8-pixel characters.
Colour mapping: G = pixel 1/COLPF0 $0C, P = pixel 2/COLPF1 $66,
B = pixel 3/PF2 bank/COLPF2 $28. All already exist; no new colour values.
New glyph shapes are needed; existing glyphs cannot represent the exact pattern.

Repo/brief difference: the field already drops one half per destroyed generator,
not only after both die. Preserve this, all collision maps and hull stops.

## Technique and budget

Data alone cannot work: GONE repeats one glyph regardless of slot position.
Keep the generic renderer unchanged. Append the exact right bitmap and its
horizontal mirror as deduplicated glyphs in the existing charset reservation;
append their nine-code layouts to R3's look tail. Only the R3 field's collapsing
column path calls a small helper: at its first column, enqueue the generator's
COPY look through the existing draw queue, after the queued GONE. This gives
normal scrolling and ring/flash protection. No spawn, Director, resident,
shared boss code, L2, $AE00, summary or startup changes.

This DOES add code executed during a boss frame (only field collapse).
Therefore run L7/L9 stress without the lance and with lost-target lance,
limit 8,500 and delta <= +2, plus entry <= 350. No shared runtime path changes.
The helper has no new resident entry: only the existing F field_late hook calls
it. It shares F's current boss lifetime. Existing boss death preparation drains
COPY entries before F is overwritten; gameplay hooks cease during boss death,
summary and entry, and the next region installs its own block.

MEASURED by compiling current art and packing/deduplicating the supplied pixels:
right 6 new glyphs = 48 B; left 5 additional glyphs = 40 B (one shared glyph).
Each layout is 9 B; together 18 B in the existing 30 B look-tail padding
(80 -> 98 of the fixed 110 B prefix). Existing 108 glyphs -> 119/128,
864 -> 952 B, still the same charset reservation; transport 7 -> 8 sectors.
F before: 323/512 B, 189 B free.
INSTRUCTION-COUNT estimate: helper + call + tables 30 B; owner x2 = 60 B.
Total physical art/layout/code allowance: 88 + 18 + 60 = 166 B <= 189 B.
F end estimate 323 + 60 = 383 B (129 free); layouts reclaim existing padding.
Code and final totals remain estimates until linked. Extra sector entry time
ESTIMATE 4 host frames (x2 = 8), base 340 -> <=348; build/harness must measure.
Collapse-only extra CPU ESTIMATE <=400 native cycles including queue insertion,
x2 <=800; steady powered/down and stress kill-frame paths should be unchanged.
Any actual gate/budget failure stops the task under the owner's instruction.

## Validation and delivery

Extend ONE R3 PF2/art test: both destroyed slots, exact mirrored pixels,
allowed codes, field/shot map unchanged and F budget. RED on baseline artifacts,
GREEN on candidate. Build normal candidate and direct R3 route, deliver ATRs
under build/play/. Run only that focused test plus the required stress/entry
measurements. Capture destroyed states cheaply from the harness if practical.
Update STATUS, memory accounting, game design, hardware smoke and decision BX.
Only local [codex] commits; no merge/push. Owner smoke remains pending.

## Implemented result

Plan commit `3c4987f`. No deviations from the supplied 12×24 pattern.
G/P/B reuse pixel values 1/2/3 and the existing $0C/$66/$28 palette.
Editable source: `modules.json.generatorLink.right`; normal build compiles it
and its exact horizontal mirror. No PNG regeneration or new dependency.

MEASURED: right 48 glyph B + 9 layout B; left another 40 glyph B + 9 layout B;
shared helper/call/tables 30 B. New meaningful bytes 136; 18 reclaim existing
F padding, so linked occupied spans grow 118 B. Overlay F R3 323 -> 353/512 B,
free 189 -> **159 B**; look tail 80 -> 98/110. Charset 864 -> 952/1024 B,
108 -> 119 codes, free 160 -> 72 B. One additional disk sector for the charset;
F remains three sectors. No reservation, resident RAM or startup code change.
All other regions' disk runs and shared install/C/D/E/lance/death runs are
byte-identical to main. Shared boss-code differences are only R3's generated
sector-count byte and two integrity-fold bytes; its executable instructions
are unchanged. Initial content stays 12,825 B. No shared runtime path or other
region changes; protected L2/window/summary
and start-block sources untouched.

The only added runtime path is `field_link` in R3's existing field_late:
it queues a COPY once per generator at the first collapsed field column.
Following collapse columns pay 23 native cycles (INSTRUCTION COUNT including
JSR); powered/down/kill-frame paths do not call it. First publication uses
the existing bounded queue (at most seven entries, at most 24 cells per draw).
The helper's first-call cost in bounded queue fixtures is MEASURED 137 cycles
(empty), 311 (six entries), 1,177 (full queue flushing a ten-cell R3 plate),
plus the caller's six-cycle JSR. Thus the preliminary 800-cycle upper estimate
was low for the full-queue case; use approximately 1,200 native cycles for that
case. The stress gates above still pass without a delta. The extra nine-cell
COPY is one ordinary queued draw on a later eligible frame.
It may appear a few frames after the kill while spark/flash and prior draws
finish. Both sides use the ordinary scrolling band and collision remains empty.
The helper is placed before the tables/state so the existing observer's writable
state interval remains exactly eight bytes; no code is admitted as writable.

MEASURED stress, fresh baseline -> candidate, native cycles:

| Case | Baseline | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Spine L7, lance off | 7,771 | 7,771 | 0 |
| Spine L7, lost target | 8,186 | 8,186 | 0 |
| Spine L9, lance off | 8,025 | 8,025 | 0 |
| Spine L9, lost target | 8,440 | 8,440 | 0 |

All <=8,500 and delta <=+2. The brief's 8,191/8,446 are not the fresh baseline's
8,186/8,440; no pins changed. Native Atari800 PAL entry **344 host frames**
(accepted baseline 340; limit 350). The JS harness's VCOUNT polling counters
526/532 are NOT host frames and were excluded. Short native observation:
119 combat frames, maximum DMA-on 28,051, fence margin 15,013, no missed frames,
extra VBI, DLI-order or slot-F foreign-write errors. This is a short entry smoke,
not a full-fight or release certification.

ONE extended test in `tests/boss-region-3.test.mjs`, selected with
`node --test --test-name-pattern='the art rule:' tests/boss-region-3.test.mjs`:
RED on fresh baseline (right slot blank at the exact-pattern assertion), GREEN
on final candidate (1/1). It uses real shot kills in both orders, checks both
mirrors/both-dead, living art, palette, PF2 codes, empty collision columns and
F budget. Normal campaign and direct-route builds pass computed gates; stale
wall-trace binding remains the expected release warning. No full npm test.
Focused trace format omits the reconciler's gate field: a derived adapter of
its successful acceptance reconciles with zero new/moved failures; this does
not regenerate release evidence or resolve any unrelated recorded failure.

Audit only, current campaign order [1,4,3,2]:

- R1 Blockade Breaker: no analogous detached-engine defect. Nozzles at 6/57,
  rows 2–4, border fixed hull at 7/56; all six neighbour cells are nonblank
  and overlap no module footprint (`region-1/modules.json` + compiled band).
  MEASURED required change: 0 B.
- R2 Citadel: displayed nozzle lists both empty (`region-4/modules.json`,
  engines removed by the immobile-Citadel decision). MEASURED change: 0 B.
- R4 Bastion: displayed nozzle lists both empty, phases false
  (`region-2/modules.json`). MEASURED change: 0 B.

[Evidence](../diagnostics/spine-nacelle-link/result.json) and adjacent logs /
three PNG band captures preserve the result. Captures decode 6502 harness
memory after actual kills; they are not native framebuffer screenshots.

ATRs (normal, not release-certified):

- `build/play/spine-nacelle-link/campaign-56f15f260cf2.atr`
- `build/play/spine-nacelle-link/spine-direct-17f66fc463a6.atr`

Full SHA-256 values are in result.json. NEXT TASK: owner smoke, then owner's
merge decision. No next roadmap item started.
