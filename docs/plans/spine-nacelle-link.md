# Siege Spine engine-nacelle link

2026-10-26. Task `spine-nacelle-link`, base `ab5e5ed`, branch
`codex/spine-nacelle-link`. Phase A; implementation pending.

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
