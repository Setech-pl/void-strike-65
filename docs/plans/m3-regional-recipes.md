# M3 regional recipes — final handoff

Engineering authoring sheet,2026-11-01. Level2 mechanics were owner-smoked OK;
the owner then requested denser, wider waves. Only level2 is implemented here.
Other rows are M7 recipes/ESTIMATES, not authored campaign files or automatic
progression. M4 still owns progression/summary/loader flow; M8 final balance.

Use the screen: alternate entry52,200,124; lateral sweeps should span120–152
HPOS where appropriate. Every-frame4-HPOS steps fit short, readable crossings;
tracking may stay every other frame. A mirrored centre fan moves above the
viewport before descending from opposite sides; follow it with a crossing.
Keep approach/terminal segments quiet and an escape lane open. Prefer2–3
back-to-back groups, row0/spacing16 when safe; each existing clear lock lifts
before the next group, so no overlapping-wave semantics are implied. Four
simultaneous free Lights is the measured ceiling, not a requirement for every
sector. Increase density through composition, not an automatic speed multiplier.

| Proposed12-level band | Level | Recipe and density | Fire/readability |
| --- | --- | --- | --- |
| R1 teach | 1 | Existing level1 unchanged; authored ceiling3 | Existing escorts/holds/boss remain familiar |
| R1 teach | **2 implemented** | Opening3×8: west→east→mirrored cross; pilot4×8: teach west→mirrored cross→tracking pressure→quiet upward release; ceiling4 | Normal→column→combined→quiet; quiet approaches/exits; hunter2/lancer4 HP |
| R1 exam | 3 | 2–3 groups of6–8, west/east entries then centre cross; reuse3–4 signatures | One volley accent; visible release lane |
| R2 recall | 4 | 2–3 groups of8, wider alternating snake/arc from opposite sides | Column accent after a familiar normal pass |
| R2 combine | 5 | 3 groups of8–10, mirrored crossing followed by a shorter return | One volley group, quiet return |
| R2 exam | 6 | 3–4 groups of8–10; one dive-return, others sweep full width | Separate tracking pressure from the strongest volley |
| R3 teach | 7 | 2–3 groups of8, tracking mixed with fixed crossings | Teach tracking without combined fire first |
| R3 combine | 8 | 3 groups of8–10, left/right/centre arrivals | Static column envelope then one mirrored volley |
| R3 exam | 9 | 4 groups of8–10, familiar sweeps surrounding one tracking group | One combined accent; quiet exit before next phase |
| R4 recall | 10 | 3 groups of8–12 recalling earlier signatures | Preserve entry cues; no continuous crossfire wall |
| R4 combine | 11 | 4 groups of8–12, pressure through width/count/sequence | Keep one recovery/release group |
| R4 recap | 12 | 4 groups of8–12 using3–6 records | Quiet terminal departure before Heavy/capital/boss drain |

Counts are total admissions/group, not live slots. Every level still has at
most20 total WaveDefs,8 distinct12-B path records and96 path payload B, including
all Heavy/escort waves. Reuse named recipes and deduplicate paths. Test no-fire
and fast-kill completion on E/M/H so the sector cut never silently drops the
release. Leave Heavy schedules, holds, armour and the two-Heavy-free-frame
capital handoff intact unless their own task explicitly changes them.

These R1–R4 labels describe the accepted proposed12-level ladder. Current
engine transport supports16 IDs and hull styles map1–4/5–8/9–12/13–16. This
sheet does not silently remap those styles or change the directory; M7 must
reconcile its final authored campaign length. Per-level Light looks/default,
PULSE/LASER overrides and one heavyLook remain independent; regional packs are
optional authoring convenience. Default appearance HP inherits the archetype.

Terminal overlap is deferred. Measured clear/arm gaps are2–3 frames; actual
render-visible entry gaps are up to34 frames (Y24 top), including the hidden
fan. A scan-free overlap sizing probe already exceeds content by32 B before
guard/caller/aggregation; the88-B helper also exceeds79 usable L2 B. No extra
frame scan, resident fighter policy relocation, new reserve use or mixed-wave
volley semantics were added. [Pricing and alternatives](../diagnostics/m3/final/tuning/report.md).
B-shot, independent hues, Bomber skins/shot re-skin, independent per-wave HP
and later campaign files remain deferred to their explicitly scoped tasks.
