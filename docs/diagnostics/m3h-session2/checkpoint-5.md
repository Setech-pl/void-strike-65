# M3-H checkpoint 5 — guarded controlled publisher

OWNER-SMOKE CANDIDATE. H12 is **187 B** of self-contained checked-home ASM:
home **823/1,920 B**, including the 24-B H13 tables. The resident veneer adds
23 B; window **2,182 B (+114 session)**. It tests validity and gameplay phase
before fetching any home byte. Invalid requests clear without PMG writes or
stale reads (poisoned-home read trap). There is no normal live event caller yet.

On first damage both intact bodies are copied lazily to H16; only requested
live members get holes and forced current-Y publication. A peer keeps its own
body. Stage2 supersedes stage1 without healing; admission invalidates the copy.
No every-frame/row path was added. Normal build/byte gates PASS; focused
**17 PASS, 0 FAIL**, plus review variant **1 PASS** over six shape/difficulty
lifetimes, covering flight, 64-frame hold, hit dodge, retirement and exact planes.

Linked NMOS costs, **including guard/copy/masks/draw but excluding DMA**:
first full-height single **1,225 armour /1,286 Bomber**, dual **1,912 /2,034**;
later dual **1,490 /1,612**. Guard successful entry is 21 instruction cycles
before home execution; invalid entry 16/23/26 depending on failed guard branch.
The final H14 claim will be charged separately. No fallback to window placement.

Record8 now **15 sectors (+1)**, packed 1,791 B; all other DFMC record counts
unchanged, total transport 212 sectors. Corrected the old 14-sector test ceiling
to 15 because the approved guarded entry exceeded record8's three-byte packed
tail. Protected byte gates/record1/record7 assertions remain. Fixed content run
still 15 sectors, **313,556 CPU cycles, added 0 cycles/reads** in linked synthetic
drive fixture. Final native quick checks remain due after checkpoint6 integration.

[Exact samples, resources and ATR hashes](checkpoint-5.json). Both ATRs are under
`build/play/m3h-session2/checkpoint-5/`: campaign remains whole-bodied;
`damage-review.atr` starts level2's Heavy sector with stage1/stage2 preselected
per formation. Rebuild review with
`node scripts/build.mjs --heavy-damage-review --level=2:sector=5`.
