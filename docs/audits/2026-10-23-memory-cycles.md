```markdown
| Check | What / how checked | Result | Status |
| --- | --- | --- | --- |
| M1 | Clone, remote, fetched baseline; pwd, git remote -v, fetch, detached checkout and status | Clean origin/main 6dae5a6f0af31869f8d9255716544bfe98b9bc75; only void-strike-audit used | PASS |
| M2 | Report isolation; branch/status/diff | audit/memory-cycles-2026-10-23; ff0e202 retained intact; one reconciliation commit above it; only this report changes | PASS |
| M3 | Normal build, previous turn; npm --cache=build/audit/npm-cache run build | Exit 0; computed gates pass; unchanged game sources on resumption | PASS |
| M4 | Evidence freshness; manifest runtimeEvidence | normal-awaiting-trace; boot/ATR stale against b3b8e466; expected §BR warning, not release certification | INFO |
| M5 | Existing emulator preparation, authorised on resumption | --prepare failed at missing build/atari800-trace/src/cpu.c, before any emulator write | FAIL |
| M6 | Native trace budget | No native trace launched in either audit; 0 of 90 minutes used; static-estimate fallback explicitly authorised | INFO |
| M7 | Memory verification | Fresh build maps/labels/manifest, cfg and source equates; memory-map renderer imported read-only, output under build/audit | PASS |
| M8 | Disk accounting | Unique sector union from manifest runs: 482 used / 1040; 558 unplaced | PASS |
| M9 | Hull format and colour ownership | Existing compiler evaluated read-only; source paths, glyph pixels, codebooks and collision readers inspected | PASS |
| M10 | Capital enemy limits | Compiler, Director ceiling, lifecycle and publication branches independently checked | PASS |
| M11 | Nacelle collision | Existing SW contact confirmed; no hull-exclusive P0PF mask in current art; per-frame HITCLR conflicts with proposed read location | INFO |
| M12 | Forecast and cost precision | Exact current capacities; explicit estimates for unimplemented work; old budget rebased, no prototype or native proof claimed | INFO |
| M13 | Restricted actions | No game/config/script/test/asset/evidence edits; no full test/trace, release build, showcase, failures:reconcile, merge or push | PASS |
| M14 | Cleanup | Preparation changed no tracked files; audit scratch moved to the designated leftovers folder; generated normal-build products remain ignored | PASS |
| M15 | Reconciliation control | ff0e202 report compared with preserved audit-review/report-this-session.md; no new build/trace; HEAD checked before editing and commit | PASS |
```

# Void Strike 65 — memory, cycles and capital-sector audit

Baseline **`6dae5a6f0af31869f8d9255716544bfe98b9bc75`**, 2026-10-23. Report only. This reconciles the report committed in **ff0e202** (F) with the preserved **`../void-strike-audit-leftovers/audit-review/report-this-session.md`** draft (R), keeping ff0e202 intact. Only this report is changed; no build or trace was run for reconciliation. The original audits replaced the initial blocked report: the owner authorised emulator preparation and a static fallback. No gameplay acceptance or release certification is implied.

**Main findings:** the window is effectively full; the old milestone budget has lost its placement assumptions; disk capacity is adequate; capital traffic needs publication/lifecycle work; nacelles should extend the existing software collision rather than depend on a colour mask. The promising capital timing evidence is historical, not a current measurement.

## Evidence and units

* **B** = this normal build: `build/manifest.json`, `build/*.map`, `build/*.lbl`, `build/*.lst`, generated binaries. **S** = current source/static inspection. **H** = existing historical measurement, not remeasured here. **E** = static estimate (no trace), not a measured maximum or a formal bound.
* Addresses and ranges are inclusive unless explicitly called an end pointer. Bytes are raw RAM/code unless labelled packed/disk. An overlay byte is not additional permanent RAM. Different phase occupants are not additive.
* PAL target **31,500**, hard gate **32,568**, physical frame **35,568**; fence minimum **500**. Sources: `AGENTS.md`, `scripts/pal-timing-audit.mjs`. CPU-only instruction counts, DMA-on wall time, fence margin and frame waiting are different quantities.
* Source shorthand: **CAP** `scripts/capital-hulls.mjs`, `assets/graphics/capital-hulls.json`, editable `assets/graphics/hull-drafts/hull-set-v2.json`; **LV** `scripts/level-compiler.mjs`, `assets/levels/level-01.json`, `level-02.json`; **MAIN** `src/main.s`; **DIR** `src/c/director.c`; **LIFE** `src/c/lifecycle.c`; **LK** `src/hybrid/light-kernel.s`.
* Planning sources: `docs/plans/budget-1.0.md` with its supersession notes; `m3-waves-heavy.md`; `gameplay-variety.md` §§3–5, 8; `docs/plan-realizacji.md` §0. Current boss/lance ownership checked against `boss-death-breakup.md`, `m6-void-lance.md`, `m6-gauges.md` and their final as-built sections. Historical prose in these files is not treated as current code.

Normal-build ATR: **133,136 B**, SHA-256 `b282f1a86ec2b103f5ba5d0b2c07f3c927a3514be6f3bfbd721bd1ca61042034` (B `runtimeEvidence.artifacts`). Boot BIN SHA-256 `5e95ec81f916d65012bde3d17b93fff9430a175509ceef3c9574fa23041ac323`.

Preparation command attempted:

```sh
node scripts/runtime-wall-trace.mjs --prepare \
  --atari800-source=build/atari800-trace \
  --artifacts=build/level-1-s0 \
  --only-session=director-complete-2-natural-sweep-fire0
```

It failed in `prepareAtari800` at line 2146: missing local `src/cpu.c`. It did not reach route validation or a trace. No source download, system installation, protected-checkout access or external build was attempted. Per owner clarification, the rest of the audit proceeds. **Native trace execution: 0 minutes**, preparation failure less than one second. All new cycle projections below are E.

## Disagreements and reconciliation

F and R below identify the two report snapshots, not independent measurements. Source-supported observations from both are retained; an estimate is not strengthened merely because both reports repeat it. Part D is the single merged ranking. Disk estimates there include code transport; small descriptor-only prices remain visible below.

```markdown
| Subject | F value / verdict and source | R value / verdict and source | Trusted conclusion / reason |
| --- | --- | --- | --- |
| Boss scratch $1800–$18FF | 0 safely allocatable, A1 cfg/manifest | 250 used / 6 physical tail, A2 boss.map | Both: 6 physical bytes, 0 certified new allocation; phase/ownership proof required |
| MAIN hole after kernel move | 58 B net, A4 labels | Table 104 B before live tables; later A6 corrects to 58 | 1259−1155−46=58; retain 31-B publisher and 15-B live tables |
| MAIN transport | Compressed suffix 7743→6536, A4 manifest | Filled 8192-B image means deletion alone does not shrink raw transport, A1 cfg | Raw span stays fixed; compressed transport can change. F's compression qualification controls boot forecast |
| A2/splash packing | A2 alone 14 B gross, A4 read-only packer | A2+splash 43 B gross, A5 same packer | 14 + (512−483)=43 before decoder/setup; no contradiction once scope is explicit |
| STATUS mismatch count | Six displayed rows, A3 resource table | Five resources, six displayed rows, A4 | Six comparisons: initial content appears under two limits |
| Capital timing model | 16000 CPU +12900 DMA/DLI=28900, B3 | 9000–16000 CPU; 18000–30000 wall reserve, B1 | Use explicit 28900 additive model and retain 30000 sensitivity. Neither bounds current native maximum; no timing PASS |
| Capital attribution | Partitioned 16000 allowance, B3 | Overlapping ranges 3000–5000 world, 2000–5000 shots, 800–2500 broadside, 1000–3500 FX, 800–2500 other, B2 | F shares are shares of an assumption only; R ranges cannot be summed as independent maxima |
| L2 capital-sector evidence | 29540 wall, boundary-inclusive, B1 | Same latest maximum; older fence values also cited in prior analysis | Trust final 2026-10-02 section at 2777e8f, not superseded 2026-10-01 rows; pure capital has no fighter fence |
| Window levers / forecast | 1720 conditional B; 1632–3598 demand excluding nacelles, A5 | 1155+352+96=1603 gross; 1728–2300 code demand including nacelles, A6 | Different scopes, not alternate measurements. Preserve both ledgers; neither proves 1.0 fits. Do not add overlapping capital-table/duplicate or MAIN levers |
| Menu/boot relocation | 600–1200 packed B E, A4 | 650–1000 packed B E, A5 | Use broader 600–1200 until packed output is measured; same move, not additive |
| Demo hooks / overlay | 12–48 / 450–1200 B E, A5 | 40–80 / 500–1000 B E, A6 | Reserve up to 80 resident / 1200 overlay; lower figures assume integration already supplied by menu lever |
| SW nacelles | R60–160, O180–420+128–256, disk384–896; +300–1800 CPU, D7 | R32–80, O128–280+64–192, disk64–256 descriptors; +900–2000 CPU, D7 | Use F's full strip/transport bytes and R's +900–2000 peak. R's compact extents remain an alternative, not equivalent full map/transport cost |
| Chained FX | R16–48 / O80–200 / disk128–384; +300–1200, D4 | R24–64 / O96–224 / disk0–128 data; +500–1500, D4a | Merged R16–64 / O80–224, +300–1500; full new-run disk128–384, zero possible only within existing padding |
| Turret station | R16–32 / O120–240 / disk128–384; +300–900, D2 | R48–112 / O144–320+16–32 state / disk32–128 data; +500–1400, D2 | Reserve upper integration/state/CPU envelope, retain two-shot cap |
| Hit marks | R8–24 / O140–320+32–96 / disk256–512; +150–800, D5 | R32–96 / O160–360+32–96 / disk16–96 data; +300–1000, D5 | Reserve R8–96 / O140–360+32–96; +150–1000; full transport256–640 |
| One / two Lights | R80–160 / 100–200; O240–480 / 300–600; +700–2800 / 1400–4800, D1 | R160–320 / 192–384; O160–320 / 192–384; +1500–3500 / 2500–5500, D1 | Conservative union, including kill/publication peak; no safe capital publisher exists yet |
| One Heavy | R100–240 / O350–700; +1200–4500, D1 | R224–448 / O224–448+8–24; +2000–4500, D1c | Union R100–448 / O224–700+up to 24; reserve peak4500; PMG colour/lifecycle cost remains |
| Row palette | R16–48 / O160–360+56–112; +2200–8500 wall, D6 | R64–160 / O224–480+32–96; +1200–3500 including stalls, D6b | Use 1200–8500 wall for 8–28 splits. F includes up to 28×114 WSYNC separately; R's upper end is not a safe 28-split allowance |
| Shake | Increment beyond chain R16–48 / O200–500+64–128, D4 | Total with chain R48–112 / O320–640+96–192, D4b | Different scopes: total reserve R32–112 / O280–724+64–192; +800–2200 main CPU and up to 800 extra DLI/wall; DMA0–360 |
| Reactor/lance | Ordinary target R60–160/O350–800+32–96, plus lance R40–120/O400–1000, D3 | Combined R192–448/O768–1536+32–96, D3 | Keep ordinary target separately; combined reserve R100–448/O750–1800+32–96. Lance is a distinct scope/weapon-rule change |
| Sector stars | R80–200/O0–64; +100–600, D8 | R96–224/O0–64; +150–700, D8 | Union R80–224; +100–700; layers beyond bounded existing kernel separately priced |
| HW full redesign | R64–160/O250–700+128–320, D7 | R96–224/O256–640 plus unpriced global art, D7 | R64–224/O250–700+128–320 is exploratory only; global exclusive-colour feasibility not established |
| EASY passability | Suggested20 cells, compares logical8-HPOS collision width, D7 | Suggested16 cells, visible ship about 16 HPOS, D7 | Prefer generous20-cell proposal; use visible16 HPOS for clearance, not legacy8 collision width. Neither threshold is owner acceptance |
| Trace preparation command | level-1-s0/director-complete-2 route, completion | level-1-s1/2-evasive-fire1 route, completion | Two failed preparation attempts; both stopped at missing src/cpu.c before trace. Total native time remains0 min |
```

## A — Memory

### A1. Current usable capacities

Derived from B, not copied from the documentation map. Appendix A gives the detailed address/phase inventory freshly rendered from the actual maps, labels, listings and equates. “Free” below means a reservation tail, not blanket permission to allocate it; phase/load-order constraints still apply.

```markdown
| Region / owner | Address range | Capacity B | Used B | Free B | Verification / qualification |
| --- | --- | ---: | ---: | ---: | --- |
| Initial boot content | $2000–$5500 | 13652 planning / 13684 physical | 13569 | 83 / 115 | B transportCapacity; content, not sector-padded bytes |
| Initial boot sectors | 107 sectors | 13696 | 13569 content + 127 envelope | 0 sector growth assumed | B; content ceilings above are the relevant gates |
| CODE + RODATA image | $2000–$3FFF | 8192 | 8178 linked + 14 fill | 0 ordinary tail | main map; runtime phase reuse below |
| Stage 2, transient over MAIN | $21C1–$29C0 | 2048 | 1332 | 716 | main map; replaced by resident suffix, not permanent spare |
| Boot splash / later summary | $0500–$06FF / $0500–$0BFF | 512 / 1792 | 512 blob / 1775 summary | 0 / 17 | main and summary maps; mutually exclusive |
| Main zero page | $80–$9F | 32 | 32 | 0 | main map |
| Reader ZP / menu music / summary stats | $A0–$A1 / $A2–$AB / $AC–$B5 | 2 / 10 / 10 | 2 / 10 / 10 | 0 | reader map, MAIN equates, summary manifest |
| Lance ZP | $B6–$C3 | 14 used; nominal 16 allowance | 14 | 2 nominal, not separately certified | boss map; $C4–$FF otherwise unclaimed, 60 B total |
| OS low RAM / stack | $0000–$007F / $0100–$03FF | 128 / 768 | machine-owned | 0 available | OS ZP, stack, OS/SIO shadows and vectors; do not reclaim |
| Lance page 4, H | $0400–$04FF | 256 | 250 | 6 | boss LANCE_PAGE |
| Boss region charset | $0C00–$0FFF | 1024 | 744 / 864 / 864 / 800 | 280 / 160 / 160 / 224 | B campaign R1 Breaker / R2 Citadel / R3 Spine / R4 Bastion; unused codes not uniformly free |
| Overlay C, fight | $1000–$17FF | 2048 | 2044 | 4 | boss map: code/data + BSS/alignment; disk code run 1920 B |
| Boss scratch | $1800–$18FF | 256 | 250 linked | 6 physical; 0 certified | boss cfg/manifest; not interchangeable with C tail |
| Overlay D, fight | $1900–$1FFF | 1792 | 1788 | 4 | boss map; 1684 code + 104 state |
| Breakup engine, death only | $1000–$1DFF | 3584 | 2559 | 1025 | boss-death.map: head 492 + code 1892 + data 175 |
| Breakup wing/crown buffer | $1E00–$1FFF | 512 | 512 | 0 | boss-death.map; replaces dead fight D |
| Breakup scratch/list/palettes | $4C00–$4E3F | 576 | 480 address span | 96 above high-water | boss-death.s, final shake diagnostics; 23-B C state is included, not additional |
| Breakup bootstrap, dead F | $5200–$53FF | 512 | 157 useful / 512 loaded | 355 after execution | boss-death-boot.lbl __DEATH_BOOT_SIZE__; transient, not fight capacity |
| PMG active DMA pages | $3B00–$3FFF | 1280 | 1280 reserved | 0 | MAIN MISSILES/P0–P3; PMBASE $3800, not a free 2-KB allocation |
| Screen/HUD/frontend | $4000–$43FF | 1024 | reserved screen | 0 ordinary code room | MAIN; banner/loader phase aliases in Appendix A |
| Gameplay charset | $4400–$47FF | 1024 | reserved font | no unproven glyph reclamation | MAIN; hull 59–89, Light 120–125, shell 126–127 |
| Frontend charset | $4800–$4BFF | 1024 | reserved font | 0 ordinary tail | MAIN; boot packed-source reuse is transient |
| Expanded allied + enemy hull maps / slot E | $4C00–$4E3F | 576 | 288 + 288 capital; 527 boss | 0 capital / 49 boss | MAIN and boss map; E code 511 + BSS 16 |
| Broadside/player/music/state + GLUE | $4E40–$4FF9 | 442 | named ranges, including GLUE 250 | no combined allocation assumed | Appendix A equates; $4FFA–$4FFF gap not a measured-free pool |
| HUD charset / F | $5000–$53FF | 1024 | lower half HUD; upper half F | phase-dependent | lower 64 codes retained; upper half separately below |
| F: Breaker / Citadel / Spine / Bastion | $5200–$53FF | 512 each | 110 / 406 / 323 / 508 | 402 / 106 / 189 / 4 | B boss.slotF.blocks, campaign order; only one loaded |
| PROJECTILES | $5400–$54E3 | 228 | 158 | 70 | main map; state headroom, not automatic initial-file code headroom |
| STARFIELD run | $54E4–$5E0F | 2348 | 1991 code/data + 5 HUD backing | 352 | B + MAIN HUD_BOOSTER_BACKING $5E0B–$5E0F |
| BROADSIDE, including capital A | $5E10–$780F | 6656 | 6653 | 3 tail | main map; 119 internal zero-pin bytes separate below |
| Overlay A | $6DE8–$75E7 | 2048 | capital restore 2048 / boss 2038 | 0 capital image / 10 boss | B overlays, boss.slotA; boss tail is not resident free memory |
| Pause/staging/summary art | $7810–$7BCF | 960 | phase buffers | 0 ordinary resident room | MAIN and manifests; install and music theme also phase-reuse it |
| Boss install | $7810–$798F | 384 | 383 | 1 | boss map; overwritten in later phases |
| HYBRID_C_ARENA | $7BD0–$7F0F | 832 | 818 | 14 | encounter-director.map; ASM 162 + C 617 + rodata 39 |
| Display-list header / lists A, B | $7F10 / $7F11–$7F6A / $7F6B–$7FC4 | 1 + 90 + 90 | 181 | 0 | MAIN equates; current layout, not earlier 830-B arena proposal |
| Light SoA | $7FC5–$7FFF | 59 | 59 | 0 | director map |
| Entity state / Director BSS | $8000–$80FF | 256 | 256 reserved; Director $80F4–$80FF included | 0 guaranteed | main/director overlap; not additive |
| Light/Heavy/flow state | $8100–$813A | 59 | 59 | 0 | director maps; $813B–$813F 5-B unassigned gap needs live validation |
| Ring | $8140–$8577 | 1080 | 1080 | 0 | 27 physical rows × 40 B |
| Row tables / hull cache / stars | $8578–$8601 | 138 | 129 explicitly named | 9 gap $85E6–$85EE | MAIN equates; gap is not measured-free |
| HYBRID_C_SECTOR | $8602–$86F9 | 248 | 241 | 7 | director map |
| C mailbox | $86FA–$8700 | 7 | 7 | 0 | director map |
| DIRECTOR_ABI | $8701–$8775 | 117 | 106 | 11 | director map |
| PICKUP_CODE | $8776–$8B66 | 1009 | 1002 | 7 | main map |
| Capital/player collision veneer | $8B67–$8B87 | 33 | 33 | 0 | capital-player-collision.map |
| DIRECTOR_C_LOW | $8B88–$8C7C | 245 | 214 | 31 | director map |
| Archetypes + C extension + Light/Heavy helpers | $8C7D–$8FFF | 899 | 48 + 696 + 67 + 64 = 875 | 24 | director/main maps |
| A2_KERNEL | $9000–$90FF | 256 | 237 | 19 | main map; ENTITY_RUN_PAD aliases first byte, not extra consumption |
| ENTITY_CODE, actual usable home | $9100–$9D5D | 3166 | 3161 | 5 | main map and next Director neighbour; cfg nominal $9000–$9FFF is not all available |
| Director RNG | $9D5E–$9D74 | 23 | 21 | 2 | director map |
| DIRECTOR_RAM | $9D75–$9FF9 | 645 | 20 rodata + 623 code = 643 | 2 | director map; $9FFA–$9FFF guard 6 B |
| Sector reader | $A000–$A5FF | 1536 | 1498 | 38 | sector-reader.map |
| LEVEL_BUFFER, level phase | $A600–$ADFF | 2048 | 1664 image | 384 beyond image | B; 13 sectors, not 16 loaded |
| Gameplay music inside LEVEL_BUFFER | $A608–$A87F | 632 | 512 | 120 | gameplay-music.map; no extra claim |
| Hull style block inside LEVEL_BUFFER | $A880–$A9FF | 384 | 280 | 104 pad | B capitalHulls.levelBlock |
| Core / payload / geometry inside LEVEL_BUFFER | $AA00–$AAFF / $AB00–$ABFF / $AC00–$AC7F | 256 / 256 / 128 | full reserved pages | 0 general-purpose | LV: path 96 B and hullParams 22 B have planned owners |
| Boss B reuses level image | $A880–$A9FF and $AC80–$ADFF | 384 + 384 | 768 fixed bands/tables | 0 within B | boss band runs; not free LEVEL_BUFFER tail during fight |
| Window below lance | $AE00–$B8FF | 2816 | 2811 | 5 reserved | Director 1656 + Light link 1155; last byte $B8FA, end pointer $B8FB |
| Lance G | $B900–$BBFF | 768 | 752 code + 5 BSS = 757 | 11 | boss map; boss-only, still reserved against window growth |
| Reader BSS | $BC00–$BC19 | 26 | 21 | 5 | reader map; $BC1A–$BC1F guard 6 B |
| OS screen | $BC20–$BFFF | 992 | OS/startup claim | 0 assumed | no new hardware proof; not a free lever |
| ROM and I/O | $C000–$FFFF | 16384 address space | OS ROM / GTIA / POKEY / PIA / ANTIC | 0 under current mapping | Appendix A; no bank-out architecture proposed |
```

The build's `residentCapacity.basicWindow.freeBytes = 773` is **3584 − 2811**, before charging the **768-B lance reservation**. Practical unreserved growth is **zero**: the remaining **5 B are explicitly held**. Likewise `remainingSafeResidencyBytes = 1852` is a build accounting result, not one 1852-B allocation. Fragmented, phase-specific space cannot pay a different region's overflow without relocation.

### A2. Disk and transport

B: **11/11 DFMC records**, 190-B manifest, 107 initial + 109 extension = **216 transport sectors / 27,648 B**. Each extension sector is 128 B; packed records include framing, so sector padding is not simply `sectors*128-packedLength` of new code.

```markdown
| Record | Sector range | Final destination | Packed / raw B | Interpretation |
| --- | --- | --- | ---: | --- |
| 1 | 108–151 | $5E10 | 5,529 / 6,653 | BROADSIDE |
| 2 | 152–161 | $8C80 staging | 1,193 / 1,193 | Two packed streams, pickup and sector C; not 1,193 B resident here |
| 3 | 162 | $8018 staging | 105 / 106 | ABI |
| 4 | 163–166 | $9B40 staging | 441 / 498 | Low C + glue composite |
| 5 | 167–172 | $7810 staging | 746 / 746 | Packed extension container; resident composite 875 B |
| 6 | 173 | $9D5E | 23 / 21 | Director pre |
| 7 | 174–179 | $7BD0 | 740 / 818 | Arena |
| 8 | 180–190 | $AE00 | 1,315 / 1,656 | Window C |
| 9 | 191–199 | $B478 | 1,019 / 1,155 | Kernel/guard/LIFE composite |
| 10 | 200–211 | $A000 | 1,498 / 1,498 | Sector reader |
| 11 | 212–216 | $9D75 | 535 / 643 | Director |
```

B: union of `transportCapacity`, `sectorReader.levels`, `overlays.runs`, `boss.runs`, `levelSummary.code/art/saveRecord`, identity sector. Runs counted once, not by counting nonzero bytes.

```markdown
| Sectors | Owner | Used / reservation | Unplaced within reservation |
| --- | --- | ---: | ---: |
| 1–216 | Boot + extension transport | 216 / 279 (must stop before banners at 280) | 63 through 279 |
| 280–319 | Four banners | 38 / 40 | 2 |
| 320–511 | Twelve level slots, 16 sectors each | 13 / 192 | 179 |
| 512–527 | Capital A restore | 16 / 16 | 0 |
| 528–583 | Boss A/install/C/D/E | 52 / 56 | 4: 562, 581–583 |
| 584–597 | Summary code | 14 / 14 | 0 |
| 598–599 | Identity and save | 2 / 2 | 0 |
| 600–627 | Summary art | 28 / 28 | 0 |
| 628–631 | Unplaced | 0 / 4 | 4 |
| 632–695 | Boss theme/bands/charset | 59 / 64 | 5 |
| 696–711 | F blocks | 12 / 16 | 4 |
| 712–719 | Lance G/H | 8 / 8 | 0 |
| 720–751 | Breakup reservation | 24 / 32 | 8 |
| 752–1040 | Unplaced | 0 / 289 | 289 |
| Total | Current ATR | 482 / 1040 | 558 |
```

The manifest's transport-only `remainingAtrSectors = 504` is **720 − 216**; it is neither current whole-disk free space nor an allowance to overwrite level/overlay runs. The actual ATR is the expanded **1040-sector** disk. At thirteen sectors per additional level: **558 − 11×13 = 415 free**. If all twelve images grow to sixteen: **558 − (12×16 − 13) = 379 free**. This does not enlarge the **63-sector boot-growth gap** before banners or the **16-sector per-level RAM limit**.

### A3. STATUS reconciliation

Every row of the explicit resource table at `docs/STATUS.md:554–573` was compared to B. The differences are below; its window, Director RAM, A/B/C/D/E/F and H rows agree. Latest capsule-recovery prose at the top agrees with the current initial/low-C/install/summary/lance values. Thus these are stale retained checkpoint rows, not new game regressions.

```markdown
| STATUS resource-table row | Published used / free | Current B used / free | Difference |
| --- | --- | --- | --- |
| Initial content, STOP 13652 | 13572 / 80 | 13569 / 83 | −3 used |
| Initial content, physical 13684 | 13572 / 112 | 13569 / 115 | −3 used |
| DIRECTOR_C_LOW, 245 | 203 / 42 | 214 / 31 | +11 used |
| G lance, 768 | 763 / 5 | 757 / 11 | −6 used |
| Boss install, 384 | 380 / 4 | 383 / 1 | +3 used |
| Summary, 1792 | 1770 / 22 | 1775 / 17 | +5 used |
```

Other misleading current-looking statements: STATUS's “Repository HEAD” names old `wip/4.5d-gate-fail`; its budget synopsis still says first shortfall M5; older prose describes a 720-sector disk and larger window. B and the later accepted checkpoints override these. The generated memory-map calls `$B8FB–$B8FF` “unclaimed/not measured”; the owner reservation is stronger. Its “unclaimed ranges” list also omits small equate gaps such as `$813B–$813F` and `$85E6–$85EE` because overlapping transient claims complicate its classification. Neither those gaps nor ZP `$C4–$FF` are certified live-free here. The earlier 830-B arena proposal in `m6-gauges.md` is not the current 832-B linked layout.

### A4. Reclaim candidates, with costs and restrictions

Effort E: small = roughly one focused session; medium = several bounded changes; large = loader/placement and phase validation. No deletion is recommended solely because a symbol has no textual caller: vectors and self-modified operands are real callers.

```markdown
| Candidate | Bytes / destination benefit | Risk / effort | Evidence and restriction |
| --- | --- | --- | --- |
| BROADSIDE internal pins | 103 sequence remainder + 16 codebook = 119 RAM B | low–medium / small | B label spans, MAIN world_rotate_due uses 17 of former 120; 98 + 6 already budgeted to M3-H, leaving 15; not 136 free |
| RODATA hull publish slack | 129 RAM B at $3781–$3801 | medium / small | B label span, MAIN .res; already inside proposed MAIN-hole lever, do not count twice; filling zeros can grow compressed initial suffix |
| STARFIELD tail as a new landing zone | 352 RAM B | medium / medium | B; moving/expanding a DFMC landing is needed; simply growing STARFIELD spends initial-block packed capacity too |
| Move complete current Light link into MAIN holes | 1155 window B; gross target $3615–$3AFF = 1259 B | high / large | B Light map and MAIN labels; menu-data overlay first; relocate live publisher and PMG/damage tables too; current link is not old 902 B |
| Move menu music/data to menu overlay | 514 music B + menu tables/other data; gross menu-screen-to-loader interval 528 B includes live code and pins | high / large | B labels, gameplay-variety §8; 31-B hull publisher and 15-B live tables need homes. 1155 + 46 fits 1259 with 58 B left if tightly packed; estimate, not linked proof |
| Reduce LEVEL_BUFFER 16→15 / 14 | 128 / 256 B reclaimed at window base | high / medium | S layout constants; thirteen-sector level fits, but boss B uses $AC80–$ADFF, so relocate/preserve band and table addresses explicitly; cannot allocate overlapping live boss code |
| LEVEL_MAX_ID 16→12 | 12 B reader directory; potentially 8 B summary fold table if length changes together | low–medium / small | S reader 3 B/entry, build summaryLevelSums 2 B/entry; no initial-block saving assumed; fixes quarter-of-16 hull mapping |
| A2_KERNEL packing | 237 raw→223 packed: only 14 B gross; likely zero or negative net after setup | medium–high / medium | B bytes passed through existing packBroadsideLzss without modifying artifacts; old 38-B estimate does not reproduce; no runtime RAM gain |
| Frontend/boot data out of initial image | approximately 600–1200 packed B initial relief, not measured | high / large | E from menu music 514, screen data, frontend glyph/list tables; may overlap preceding lever, never add both; loader and restart ordering must be proven |
| Cold loader bitmap RAM below PMG | $3825–$3AFF = 731 B after boot | high / medium | B label/range, MAIN only boot reader; loader blob still needed during boot; included in 1259-B hole above |
| Capital-only tables/code to preloaded capital overlay | roughly 600–1200 raw B movable, net benefit depends on veneers | high / large | E based on 662-B capital-table inventory in gameplay-variety §8.2 and live readers; existing A alone is full for capital; load before sector, never mid-frame |
| Non-boss phase low RAM | up to $1000–$1FFF = 4096 B, or narrower D $1900–$1FFF = 1792 B | high / large | S phase-exclusive boss claim; new run/restore policy required, competes with demo/fighter modules; not new physical RAM |
| Hull/music pads in level image | 104 + 120 = 224 data B | medium / small | B; already transported padding; fixed offsets/guards and owner of each byte must change |
| Identical hull glyphs | 16 B raw equality, not safely reclaimable as shared mutable cells | high / not worthwhile | Read-only compiler comparison: allied_mass=allied_engine and enemy_mass=enemy_engine; engine cells mutate every eight frames, mass cells must not |
| Capital vector table and its image | 36 B duplicated intentionally | high / not worthwhile | B LK CAPITAL_VECTOR_IMAGE and vector table; boss patches live vectors, restore needs pristine copy |
```

No additional dead gameplay routine is proven removable. Large opportunities are **phase separation**, not indiscriminate instruction deletion. `MAIN` is compressed (`residentRuntime.suffixRawBytes 7743 → 6536 packed`); replacing a zero pin with code is not necessarily transport-neutral. The initial 83-B budget and STARFIELD's **106 packed B to its hard staging gate** must both be watched (B `starfieldRuntime.packedTotalGate`).


Additional source-supported reclaim observations from R A5:

```markdown
| Candidate | Bytes / region | Source, risk and effort |
| --- | --- | --- |
| Share identical allied/enemy module-source tables | 96 gross BROADSIDE B | B labels $6917/$6977 and read-only comparison of all 96 bytes; repoint readers, small–medium effort. LZ may already compress the duplicate; packed saving unmeasured |
| CODE loader pin slack | 57 raw B | S MAIN pinned loader slack; preserve entry addresses, medium effort; not57 guaranteed packed boot bytes |
| Splash packing in addition to A2 | 29 gross B; combined 43 | B current 512-byte splash→483 with existing packer; decoder/copy changes can consume savings, high boot risk |
| Simpler loader bitmap | Unquantified packed saving | B loaderScreen already7680→1967; art edit/preview and compression check needed, medium effort |
| Twelfth DFMC record | About16 initial bytes COST, not RAM gain | S manifest record/framing; 11/11 current. E83→67 initial planning margin if expansion uses 16; new transport destination still needs a phase-safe home |
```

The **662-B** capital-table inventory overlaps the **96-B** duplicate: after crediting that duplicate, at most **566 B** of that inventory remains, before veneers. The identical mutable mass/engine glyphs and the 36-B pristine vector image above are not safe duplicate eliminations. Stage2's **716-B runtime tail** also differs from its **204-B file slack** after the 512-byte splash occupies the shared2048-byte file area (B maps). These distinctions prevent double counting.

### A5. Rebased path to 1.0

Do not charge completed M5, sector-flow, LIFE or lance work again. Keep repair, weapon roles/K1 and demo before M7 as instructed. The old `budget-1.0` cumulative table predates overlays; use its amended `gameplay-variety` cost lines and the current measured baseline.

**First break with the old order:** M3-H sessions 1–2 require **472–516 B window** (H planning, `gameplay-variety §4.1`), while current usable unreserved window capacity is **0 B**. Shortfall **472–516 B**; even spending the reserved five would leave **467–511 B**. The lever session must precede this growth, or the feature must land elsewhere. Independently, M3-H H16's **32-B damaged-body buffer** has a **7-B** proposed pickup tail: **25 B short**. M3 P8's old **8-B** state home is already occupied by loops/flash. These are current placement conflicts, not a prediction of CPU failure.

A transparent optimistic ledger below puts the levers FIRST, without treating them as already implemented. Count **1155** from moving the full Light link, **352** STARFIELD tail, **128** buffer shrink, **70** arena after planned `−143 +83 +4` work (`14+143−83−4`), and **15** residual pins: **1720 B**. The arena/pin gains are conditional on the corresponding planned moves and cannot be spent before they happen. MAIN's 46 B of live publisher/tables stay within its 1259-B target, not charged twice. Boss-band relocation and loader proof are prerequisites to the buffer lever.

```markdown
| Step, optimistic placement ledger | Spend B | Remaining B | Basis |
| --- | ---: | ---: | --- |
| Conditional levers, no spending reserved 5 B | −1720 | 1720 | A4 arithmetic |
| M3-H with weapon profiles | 516 | 1204 | gameplay-variety §4.1 upper planning line; includes 143-B spawn relocation |
| M3 paths | 524 | 680 | same; state placement still required |
| M4 loop + initials | 360 | 320 | same; completed summary is not charged again |
| M6 permanent weapon level K1 | 180 | 140 | budget + gameplay-variety; not yet implemented |
| M6 repair + rotation/icon + persistence plumbing | 80–180 | 60 to −40 | E: 16-B shape, collection/rotation branches, veneer and persistence work; excludes already built LIFE |
| Per-sector sky controller | 60–200 | 0 to −240 | old 60-B plan versus wider audit range; fixed global sky edit costs less |
| Demo input hook, overlay already provided by lever | 12–48 resident; 450–1200 menu-overlay | −12 to −288 resident | E, gameplay-variety demo 60+80+300 baseline with integration reserve |
| M7 twelve levels | 0 resident if current schema suffices | unchanged | B 13/16-sector level image; disk arithmetic A2 |
```

This ledger still excludes D's optional capital enhancements. Its first negative balance is **M6 repair at the upper range (40 B)**; even the low path is **12 B short after sky/demo**. The uncertainty is larger than that apparent near-fit: audit contingency ranges for M3-H **500–1000**, M3 **500–1050**, M4 **300–720**, K1 **180–400**, repair/persistence **80–180**, sky **60–200**, demo hooks **12–48** total **1632–3598 B**, versus **1720** conditional relief: **88 B left to 1878 B short**. These are E planning envelopes, intentionally wider than the old +20%; LIFE actually grew beyond its old estimate (STATUS records 302 actual versus 125–160 predicted). They are not probability intervals or implemented sizes.

**Three compliant recovery choices:** (1) extend the already accepted menu-data relocation to reclaim more STARFIELD/ENTITY_CODE runtime, potentially several hundred raw bytes; short menu reads and moderate relocation risk, no extra gameplay CPU; (2) preload a fighter/capital-phase module in existing low boss RAM, up to 1792 B in D alone, restoring at transitions; extra disk reads and shared-phase ownership risk, no bank switching; (3) retain required mechanics with smaller looks/path sets and reuse current collision/FX; lowest load risk but less visual variety. The second option covers the optimistic deficit; the high contingency end may need additional relocation. These are alternatives for an implementation plan, not scope deletions authorised by this audit.

**M4 reload constraint:** breakup overwrites C/D/F/E, and boss bands overwrite level data. A next-level loop must reload level music/hull/payload/geometry, restore capital A/vectors, rebuild hull maps and reset/retain state deliberately. The existing one-level START GAME restoration is a precedent, not proof that simply incrementing level works. Twelve levels fit disk, but do not exist as a playable campaign today (only level 1 is placed in the normal ATR; level 2 is a debug-route source).

The hull style/steel mapping still divides by **LEVEL_MAX_ID=16**: R1 levels 1–4, R2 5–8, R3 9–12, R4 13–16; steel changes at 9. It must be reconciled with the **twelve-level, four-region** campaign before M7. Boss campaign region numbers already mean Breaker/Citadel/Spine/Bastion; old asset R2/Bastion labels must not be mistaken for campaign R2.


**Minimal cover for the first break:** moving the complete1155-B Light composite after the menu-data lever covers M3-H's472–516 B and leaves **639–683 B window**. The MAIN target remains1259 B, with 46 B retained live data/code, leaving58 B placement tolerance. For the separate32-B body buffer, the **70-B PROJECTILES tail** is a candidate home (32 allocated →38 left), subject to writer/lifetime proof; the existing 7-B pickup tail cannot provide it. Alternatively dedicate32 B of the 352-B STARFIELD tail. These are separate allocations: do not subtract the 25-B shortage from the window and call the body buffer placed. The119-B internal pins have104 B already promised, so only 15 B is additional; they cannot by themselves cover the deficit.

R's narrower, non-buffer-shrink scenario remains useful: M3-H472–516 + M3 paths496–524 leave **115–187 B** after the 1155-B move; M4's300–360 then creates **113–245 B** deficit. Its total **1728–2300 B** (M3-H, M3, M4, repair capsule80–160, K1/roles180–300, demo hooks40–80, nacelle code160–360; excludes new state/art) is **573–1145 B short** against1155. Adding352 STARFIELD and 96 duplicate yields1603 gross, still **125–697 B short** before veneers. This preserves R's supported forecast without pretending that its compact nacelles or capsule equal the fuller dock/strip implementation below. F's1720-B optimistic ledger includes128 buffer shrink and conditional70 arena/15 pins instead; it must not be added to R's1603.

### A6. Required 1.0 planning lines — incremental, static estimate (no trace)

R/O/disk below use Part D's meanings. Geometry shared with D7 is charged once. These are planning options, not implemented features or additional accepted scope. Sources: existing MAIN hull contact/3-HP debris, C lifecycle/pickup policy, LV payload layouts and `compileBossDef`; size anchors are the 209-B LIFE ASM,214-B low-C allocation and current 33-B collision veneer. No new packed result is claimed.

```markdown
| Planning line / player result | Resident / overlay / disk B | Existing data support versus work needed | Peak cost / 1.0 implication |
| --- | --- | --- | --- |
| Repair booster: fly-through dock in ALLIED hull, using SW edge collision | Increment after D7:48–96 / 160–320 code +16–32 state / 256–512 transport; standalone80–160 / 240–560 +32–96 / 384–896 | New dock descriptor, entry/once-only heal policy, visible bay and safe collision aperture. Reuse D7 contiguous outer edge; make an open recessed bay, not an enclosed tunnel that one edge cannot represent. Existing hull.length/turrets cannot author a dock | E +300–1000 CPU on trigger above shared D7, DMA0; reserve contact peak together. Replaces capsule-style repair estimate, does not add another copy of LIFE. Before M7 per owner |
| One asteroid/mine sector using playfield characters | Existing sparse asteroid/debris authoring:0 / 0 / 0 extra within existing level blocks. True bounded minefield:128–320 / 256–640 code +64–192 state / 512–1280 transport, of which32–128 descriptors | LV hazards.debris0–2 and debrisStep0–15 exist; current actor is one destructible debris object, not a multi-mine layout. Suppress ordinary waves to author an asteroid-themed existing sector. Multiple persistent mines need placement/trigger records, bounded publisher and collision/restore code; a new sector enum is unnecessary | E sparse variant existing cost; true minefield+800–2500 CPU, DMA0 with current mode. Larger option competes with M3/capital overlay homes; cannot call it data-only |
| Boss variants per level from data only | Existing scalar variants:0 / 0 / 0 incremental sectors,17 used bytes within 62-B bossDef. New arbitrary region/art selector: E0–32 resident /40–120 entry overlay /1–4 descriptor bytes per level plus selected asset runs | Today: bonus, HP scale by difficulty, laser damage/warning/reload by difficulty (LV:515–575). Existing region module/art data varies a shared region, not independently each level. Arbitrary per-level geometry/art/region, emitter topology or new behaviour needs a new field and consumer; bossId alone is not an arbitrary asset-directory selector | Scalars use existing entry/runtime paths, no structural steady cost; altered HP/cadence can change fight load. Four reused region asset sets cost 0 extra for A-16. New art variants require measured payload sizes and near-full F/C checks; not included in data-only claim |
```

The old optimistic ledger excluded chosen nacelles. Using the merged full D7 code split adds **240–580 B** (R60–160+O180–420), with **128–256 B** separate state/data. Replacing repair80–180 by the dock's shared incremental resident+code **208–416** adds **128–236 B** in matched low/high scenarios. Raising demo's upper integration reserve 48→80 adds 32 B at the high end. Thus the old ledger's final **12–288-B deficit** becomes approximately **380–1136 B code deficit** including nacelles/dock/demo, before state, new minefield or veneers (E scenario arithmetic, not a contiguous-placement solution). The sparse asteroid and scalar boss lines can stay data-only; the larger minefield adds 384–960 code B plus64–192 state. Phase placement can reduce resident demand, but does not make overlay destinations appear. M7 content is disk-affordable; the complete pre-M7 plan is **not demonstrated to fit RAM**.

### A-16. Sixteen levels with existing mechanisms plus new data

**Verdict: capacity is sufficient, but strictly JSON-only is not supported at this HEAD.** The first blocker is LV's level-number validator rejecting13–16; the normal build also emits only one level, and 4×4 boss/summary grouping and save eligibility need policy/constant changes. This is a small-format/assembly extension after M4, not a new renderer or additional resident level buffer. No such changes are made by this audit.

The following are the executable assumptions and associated coverage references found by searching `src/`, `scripts/`, `cfg/`, level assets and tests for campaign bounds, region arithmetic and twelve-level labels. Historical roadmap prose is not an executable constraint.

```markdown
| Assumption / source at 6dae5a6 (file:line) | Current effect | A-16 action / byte implication |
| --- | --- | --- |
| scripts/level-compiler.mjs:60,842 | MAX_LEVEL_NUMBER=12; rejects13–16 | Raise validation bound; host tooling only,0 target RAM |
| scripts/build.mjs:582,585; overlap guards3845,3888,3905 | Twelve16-sector slots320–511 before overlays512 | Put levels13–16 in noncontiguous directory runs, e.g.752–815; do not let naive level13 start512 |
| scripts/build.mjs:2536 | levelRuns contains one default/debug run | M4/M7 assembly must enumerate campaign files; merely adding JSON does not ship them |
| src/main.s:13265–13285; scripts/build.mjs:405 | Boss region min(3,(id−1)/3); debug first-level mapping1+3*(region−1) | Use divisor4 / debug multiplier4 for 4×4; constant replacements can be byte-neutral |
| scripts/build.mjs:2577–2579 | Escort-pairing validator chooses region with (id−1)/3 | Change to divisor4 with boss runtime grouping; otherwise validates against wrong region |
| src/hybrid/level-summary.s:72,477–491 | Four art regions, divisor3; last region catches10–16 | Divisor4 for 4×4; byte-neutral, reuse four art runs |
| src/hybrid/level-summary.s:90,96,766–779 | Save records only through 12, at 64+4*(level−1) | Raise RECORD_LAST_LEVEL16; additional 16 bytes use existing save bytes112–127, exactly fits128-byte record. No extra RAM/disk sector; document version/old-padding compatibility |
| scripts/measure-boss-curve.mjs:40–45; tests/boss-order-scale.test.mjs:45 | Curve cells1–3/4/5–6/7–8/9/10–12 | Re-author coverage for 4×4; not a runtime cap |
| scripts/boss-coverage.mjs:264; scripts/atari800-wall-trace.h:1093; scripts/pages/stills.json:55 | Region/coverage labels include 10–12 or3-level regions | Update diagnostics/captions when implementing; no target bytes |
| scripts/boss-art-rules.mjs:7,34; tests/heavy-bomber.test.mjs:591 | Comment/assert message says steel1–6/7–12; rule uses region halves | Actual four-region half mapping already suits1–8/9–16; correct stale labels and verify palette contrast |
| src/c/boss.c:255; tests/boss-region-2.test.mjs:11,42,427,735; tests/boss-region-4.test.mjs:431 | Comments/fixtures describe final tier as9–12 or10–12 | laser_tier in src/hybrid/boss.s:1960–1978 already handles9–16; retain threshold5/9 unless owner changes curve |
| tests/level-summary.test.mjs:766 | Read assertion expects level sectors320≤sector<512 | Extend for noncontiguous higher-level runs |
| scripts/boss-death-handoff.mjs:68 | Forecast assumes179 extra sectors for 12 capped levels | A-16 requires 243 extra at cap; bookkeeping only |
```

Already 16-aware: `scripts/build.mjs:560,567,573,1358,2553,2881` (directory, quarter-of 16 hull style, half-campaign steel,16 summary sums); reader's generated directory and `src/hybrid/level-summary.s:1133` assert16 sums. `scripts/hull-set-import.mjs:97` labels R3 as9–12 as part of the existing 4×4 art scheme; that is compatible, not a 12-level cap. Retain LEVEL_MAX_ID=16: the A4 16→12 saving would be inapplicable. Per-level13-sector image remains1664 B, cap2048; the same LEVEL_BUFFER is reused, not multiplied by 16.

```markdown
| Disk scenario (B current 482 occupied /558 free) | Added sectors relative to current one-level ATR | Free sectors after campaign | Extra for 16 versus 12 |
| --- | ---: | ---: | ---: |
| 16 images at current 13 sectors | 15×13=195 | 363 | 4×13=52 (6656 B) |
| 16 images at 16-sector cap, replacing current 13 | 16×16−13=243 | 315 | 4×16=64 (8192 B) |
```

These are raw occupied-sector counts, not a promise that all free holes are contiguous. Existing absolute-sector directory entries accommodate the noncontiguous placement without widening the format. **RAM/overlay impact for data-only content:0 extra working RAM,0 additional overlay capacity;** existing 16-entry reader/summary tables already paid. Save use grows16 B inside its existing 128-byte buffer. Constant changes can be byte-neutral; M4 loop/reload implementation is separately budgeted and not free. Boss F Bastion still has only 4 B; repeating it four levels does not enlarge it. First constraints are compiler/build/save/grouping policy, then existing residency/M4 reload—not the 315–363 free disk sectors. Reusing four boss looks with per-level scalar tuning fits this mechanism; sixteen independent boss engines do not follow from it.

## B — CPU, DMA and frame families

### B1. What is actually measured

The normal build executes linked NMOS bytes in its CPU harness: **15116 maximum main-loop CPU cycles**, including **13 option-poll cycles**, from `2-evasive-fire1` frame **531** (B `runtimeTiming`). Its additive diagnostic is **15116 + 12531 DMA + 369 DLI/WSYNC = 28016**. DMA components: refresh **2808**, PMG **1200**, screen/font **8448**, list **75**. DLI **141 CPU + up to 228 WSYNC = 369**. These are not a native PAL frame, a proof over all input histories, or a measured fence margin. The manifest explicitly leaves native wall evidence unbound.

The table deliberately keeps unavailable current measurements visible. E maxima are planning allowances, not certifications. In a fence-bound frame, extra pre-fence CPU can consume slack without changing the whole-iteration wall maximum, because the wait becomes shorter.

```markdown
| Frame family | CPU / workload | DMA-on wall / gates | Fence | Source, age and limitation |
| --- | --- | --- | --- | --- |
| Space ELITE, current build replay | 15116 max DMA-off | 28016 additive E; 3484 target / 4552 hard arithmetic slack, not measured headroom | no current native sample | B runtimeTiming; strongest current instruction measurement |
| Space ELITE, historical native worst | CPU not separable from wall breakdown | 31059; 441 to current target, 1509 to hard | not paired with a current fence minimum | H docs/runtime-wall-trace.json, stale binding b3b8e466; session 2-evasive-fire7 f564 |
| Space SWARM | E 10000–16000 CPU planning envelope | E additive 22900–28900; actual fence-wait iteration can approach 31500 | H three-Light worst margin 9137; old L2 swarm minimum 5931 | H gameplay-variety §2.2 and level-2 timing; E from current full-space envelope, not fresh subtype measurement |
| Capital L1 actual capital states | E budget 16000 CPU, components B3 | E 28900 with conservative whole-frame DMA/DLI sum; 2600 / 3668 planning slack | N/A: skips fighter fence | H actual capital max 18374, COMBAT 17213; E rebasing allowance only |
| Capital L2 actual capital states | same E per-frame allowance as L1; shorter hull does not reduce peak complexity | same E 28900, not measured | N/A on capital rows | Same kernel; old L2 capital-sector session maximum 29540 includes boundary fighter frames |
| Boss fight, strongest existing stress | 7596–8478 across region/tier fixtures | proxy limit 8500, not PAL limit; no new full-fight native wall max here | historical short routes min 12363 | H capsule stress recovery; entry-route wall max 28116 is not all stress states |
| Boss death, exclusive engine | CPU-only peak not isolated in cited final report | H final peaks 29535 / 29537 / 29534 / 29537 (R1–R4) | H min 10592 / 10594 / 2828 / 10591 | final boss-death-shake diagnostics; pre-fence peaks 14247 / 14245 / 22011 / 14248 include DMA |
| Boss entry / loading | transition-specific SIO, no active combat budget | H 325 / 340 / 340 / 344 host frames against 350 | normal gameplay fence not applicable during read | H capsule recovery and final breakup; 84 / 88 / 88 / 89 sectors |
| Post-fight disk read | H strobe handlers 109 / 94 / 57 CPU; old observed block peak 382 | H final read/strobe interval 94–95 host frames (~1.9 s), 24 sectors | read protocol/DLI scheduling, not ordinary frame fence | final breakup plan; strobe timings from revision-native.json, reader unchanged; hardware verification still debt |
```

**CAPITAL FRAME HEADROOM — per level.** The 2026-10-23 normal build reports global/space15116 CPU and additive28016, not a separate maximum for capital L1/L2. Current capital-only CPU maxima and measured fence margins are **unavailable**. Capital begins at VCOUNT$70 and bypasses the fighter$77/line238 publish wait (`MAIN:3209`): fence is **N/A**, not zero or automatic≥500 PASS. CPU additions and elapsed wall additions are not universally1:1.

```markdown
| Level / evidence and date | Worst observed or assumed capital work | Headroom to 31500 /32568 before nacelles | +900–2000 CPU SW-nacelle verdict |
| --- | --- | --- | --- |
| L1 H gameplay-variety §2.2,2026-10-08 | Pure-capital18374 wall (COMBAT17213); CPU-only unavailable; no fighter fence | 13126 /14194 historical wall | Historically ample: even an illustrative2.2× wall exposure on2000 gives22774,8726 below target. This factor is a sensitivity, not measured capital amplification. Current PASS not established |
| L2 H level-2-timing-2026-09-30.md final2026-10-02 section,2777e8f | Capital-sector E/M/H wall29540/29440/29193 includes fighter boundary rows; pure-capital CPU/wall max unavailable. Boundary fence10327/8411/11535, not actual-capital margins | Sector arithmetic1960/2060/2307 to target;3028/3128/3375 to hard | Cannot certify. Even naive+2000 to sector maxima gives31540/31440/31193; EASY exceeds target40. These maxima may be boundary frames on which nacelles do not run, so this is a conservative sensitivity, not a demonstrated failure |
| L1 E current code planning model,2026-10-23 | CPU16000 + DMA12531 + DLI369=28900 | 2600 /3668 | Add900–2000 CPU, unchanged full-frame DMA/DLI:29800–30900,1700–600 target slack. CONDITIONAL FIT under assumed CPU allowance; no measured fence. With R's30000 wall reserve instead,30900–32000 leaves 600 to−500 |
| L2 E current code planning model,2026-10-23 | Same16000 CPU allowance /28900 additive; shorter hull changes duration, not peak | 2600 /3668 | Same CONDITIONAL FIT and 30000-envelope risk. No L2 pure-capital trace, so not a verified≥500-fence/≤31500 verdict |
```

The **600-cycle target slack** in the additive upper case is not a 600-cycle fence margin. Neither level can be marked as satisfying both requested predicates from this evidence: current capital skips the relevant fence, and the CPU allowance is static. SW nacelles remain the recommended architecture; timing acceptance remains **unproven**, not “impossible.” Keep the current publication schedule; any newly introduced fence must be measured separately. Whole-session stale `capital-muzzle-ring` maximum31007 likewise cannot be relabelled a pure-capital peak. Historical L2 capital row counts were1035/921/829; fence samples belong to its fighter rows.

**Boss stress, including lost target:** H `docs/STATUS.md:67–76`, capsule recovery diagnostics:

```markdown
| Fixture | Maximum CPU | Lost-target CPU | Margin to 8500 |
| --- | ---: | ---: | ---: |
| Breaker L1 | 7596 | 7568 | 904 |
| Citadel L4 | 8112 | 8112 | 388 |
| Citadel L5 | 8447 | 8447 | 53 |
| Spine L7 | 8191 | 8186 | 309 |
| Spine L9 | 8446 | 8440 | 54 |
| Bastion L10 | 8478 | 8473 | 22 |
```

These scenarios include normal fire, charging/launch, torpedo flight/arrival, kill/miss, blast and lost target. They are existing native-instruction evidence; this audit did not rerun them. The breakup final record states fight instructions unchanged, but stale full-artifact binding still prevents calling this a refreshed release certificate. The **22-cycle boss proxy margin is real historical risk** for adding shared pickup/weapon work in M6; capital headroom cannot pay for boss work.

### B2. Worst space frame attribution

B current CPU frame 531, **exclusive** routine counts (do not add inclusive parents to their children):

```markdown
| Routine | CPU cycles | Share of 15116 |
| --- | ---: | ---: |
| update_enemy | 1654 | 10.9% |
| render_fighter_projectile_overlays | 1595 | 10.6% |
| rotate_playfield_rows | 1517 | 10.0% |
| scroll_hull_columns, exclusive | 1115 | 7.4% |
| read_input | 667 | 4.4% |
| player_fighter_projectile_hits_enemy | 615 | 4.1% |
| render_transient_effect_overlays | 589 | 3.9% |
| update_fighter_projectiles, exclusive | 532 | 3.5% |
| update_starfield, exclusive | 474 | 3.1% |
| scroll_world_columns, exclusive | 434 | 2.9% |
```

The stale native worst frame gives a different ranking because it includes DMA and waiting: player-projectile render/backing **14249/31059 = 45.9%**; enemy update **3708 = 11.9%**; world/ring **3332 = 10.7%**; projectile update/collision **3182 = 10.2%**; entity/effect update **1346 = 4.3%** (H `heaviest_frame_cost_breakdown`, sequential stages and projectile detail). The native projectile total **17492** includes its weapon/update work; it must not be added again to those components. This is why optimising “enemy AI” alone misses a major cost.

### B3. Capital cost attribution and optimisation

No current capital trace attribution exists in this audit. A conservative **E 16000 CPU planning envelope** is partitioned below to make the assumption reviewable; shares are shares of that allowance, not measured percentages. Anchors are B routine maxima and S bounded loops. The envelope is not a proof that all possible input histories fit it.

```markdown
| Capital work | E CPU allowance | Share | Basis |
| --- | ---: | ---: | --- |
| Ring/hull preparation and publication | 4500 | 28.1% | B update_starfield max 4893 inclusive; remove unrelated work only cautiously; cached COMBAT path in MAIN |
| PairShot erase/update/collision/render | 4000 | 25.0% | B render 2177, update 2085; bounded pools; capital changes erase timing |
| Broadside admission, shell contact and publication | 2800 | 17.5% | B update_broadside max 2446 plus render allowance |
| Debris, effects, capital explosion and engine | 2200 | 13.8% | B entity/effect paths and two bounded 3×3 capital effects; some maxima do not coincide |
| Hull contact, input, lifecycle, sound/music, dispatch | 2500 | 15.6% | S up to three contact rows; B input 667, music 336, sound 137; widened-path contingency |
| Total | 16000 | 100% | Add full-frame 12531 DMA + 369 DLI = 28900 E |
```

```markdown
| Optimisation | Saving, E unless H stated | Risk / player effect |
| --- | --- | --- |
| Existing Heavy stationary-body skip, via M3-H slower descent | H prototype 467 CPU/frame net for two Raiders; 485 per stationary member | Retain planned C policy/ASM copy boundary; changed descent feel, no promise on spawn-binding frame |
| Keep cached capital row preparation and universal-corridor fast reject | Avoid hundreds to roughly 1500 CPU on expensive contact/cache cases | Nacelles must update bounds/key; a too-wide fast reject silently misses collisions |
| One deferred visual burst on non-rotate frame | E move 300–1000 CPU peak, no average saving promised | Use existing bounded token/forced-next-frame rule; do not defer damage |
| Reduce PairShot pool by one | H 574–729 per active object from budget/STATUS, E on current layout | Visible weaker fire; owner choice, not an audit recommendation to change now |
| Fast-path unchanged backing / avoid repeated address resolution | E 100–500 CPU on dense projectile frame | High correctness risk: painter order, stale restores and Light backing; measurement first |
| Suppress unused capital-only calls outside capital via existing vectors | E tens of CPU, not thousands | Already partly done; do not expect to solve residency with this |
| Cache nacelle edge verdict until relevant row/ship position changes | E150–700 CPU on repeated edge frames | Must invalidate scroll, source-row, respawn and side-offset changes; not implemented |
| Lower average fire cadence only | No guaranteed worst-case saving | A full pool can still occur; cannot fund a hard gate |
```

KNOWN DEBT remains: stale wall/stage-2 binding; deferred validator repairs (core fall, row-switch/DLI observers, pickup oracle); real PAL/SIO2SD breakup/read and HUD/DLI checks; Citadel M0 colour coupling to lance-ready P0. No validator was repaired or relaxed.

## C — Capital sector: data and code

```markdown
| Concern | DATA today | CODE / constraint today | Source |
| --- | --- | --- | --- |
| Editable hull art | hull-set-v2.json drafts → hull-set-import.mjs → capital-hulls.json | fixed seven surface slots per faction/style, shared turret/effect glyph slots | CAP, import script, asset description |
| Shape | 32 reusable rows × 9 cells per side; 4-bit local codebook; 5 packed bytes/row | expands to 288 B each at $4C00/$4D20; draw loops copy 9 cells, right start column 31 | CAP packMap/compileSector; MAIN draw_hull_row |
| Codebooks | 16 entries incl. blank; current allied uses 12, enemy R1/R2/R3/R4 uses 11/12/11/12 | free local indices are not free charset glyph slots; hull codes 59–89 all assigned | Read-only CAP compilation; fixed glyph-order builder |
| Hull length | level.hull.length 0/1/2/3 → 288/352/416/480 rows, or explicit supported hull.rows | 224 fixed section rows + combat 64/128/192/256; finite 480-row coordinate with leading offset | LV compileHull/geometry |
| Actual levels | L1 length 3 = 480; L2 length 1 = 352 | length same for each difficulty; traversal cadence differs | Read-only compileLevelFile results |
| Difficulty | E/M/H rates 8/9/10 over 20; turret layouts 10/15/20 per side for L1, 7/10/14 for L2 | encoded module select and phase transitions; not three separate hull maps | CAP generated tables; LV geometry |
| Style / colour | enemy map/codebook/seven glyphs/32 boundaries: 280-B level block; allied COLPF1 byte | style and steel chosen by level number in build, not level JSON; 16-level mapping currently | B capitalHulls.levelBlock, build hullStyleIdForLevel |
| Turrets | one reusable turret profile per side, generated station occurrences and firing schedule | 2 tracked muzzle records; 3 physical shell slots, active limit 2; warning/flash/impact PMG and character kernels | CAP turretRecordsFor; MAIN BROADSIDE_* |
| Turret density | hull.turrets field exists | only value 3 accepted; 0–2 throw; 3 is density step, not three emplacements | LV compileHull |
| Damage | saturating per-side hull-hit counters, timed impact graphics | no capital module-HP/damage-stage state machine; counters do not make turrets destructible | MAIN count_broadside_hull_hit, begin_capital_hull_explosion |
| Existing feedback | two target-owned 3×3 effects, 24 frames, phase every 4; engine dim/bright every 8; launch flash 4 | restore old footprints, advance pointers with hull, render in order, POKEY cue | B flagshipSector; MAIN capital effect paths |
| Scroll/render | level module sequences, collision boundary tables | ASM row resolution/cache, full-width ring rotation, side-band draw, backing and DLI | MAIN prepare_next_hull_row, draw_hull_row, scroll_hull_columns |
| Stars/hazards | sector.look.stars, debris enabled, broadside enabled; global sparse star asset | debris count acts as enable rather than exact population; pickups do not freely populate capital | DIR/LV; pickup lifecycle; pending capsule resumes later |
```

**Data-only today:** choose the supported hull length; edit existing surface glyphs/within-band contour maps in their source workflow; reorder/repaint existing modules within compiler rules; change generated turret layout seed/cadence tables within their constraints; switch authored star colour and hazard enables; author more varied surrounding waves and `afterCleared`. Global sparse star population **4–8** and speed **1–8 pixels/frame** are asset parameters accepted by `scripts/starfield.mjs`; this is a rebuild-wide change with CPU/state costs, not per-sector control. Far layer is explicitly disabled by the compiler. `mirror`, path payload and `hullParams` reserved bytes are not proof of runtime support. Named “yellow” star selector now maps through player-side PF2 **$AE**, not necessarily yellow (MAIN plasma FX).

**Not data-only:** additional simultaneous turret records, capital enemies, target HP/lance lock, deeper corridor intrusions, arbitrary per-sector speed/layers or persistent per-hit damage. Asset rules and zero-valued runtime ceilings explicitly prevent these, rather than merely lacking authored examples.

### C1. Why Light/Heavy limits are zero

`docs/design-4.6-data-architecture.md` §9 explicitly ties the zero Light ceiling to the fighter-only lifecycle and skipped late publication window. Its note on backlog 4.8c says corridor traffic was assumed by the idea but lifting that ceiling was outside its approved minimum scope. This audit prices that prerequisite; it does not promote traffic into an accepted implementation. The historical PMG description elsewhere in §9 predates current P3 capsule ownership; current code and the owner's allocation govern this audit.

Four independent barriers, all S: LV rejects capital archetype names; DIR `subtype_ceiling_light={3,1,0,1}` and `heavy={0,2,0,0}` clamp requests; LIFE `light_ceiling` returns zero outside fighter state and active Light tick deactivates there; MAIN `publish_fighter_projectile_overlays` capital branch bypasses the `$77` wait and `erase_fighter_projectile_overlays_with_light`. Entry drains and unpublishes Lights first (`sector_c_update_first_capital`). Raising a JSON count or table byte alone cannot work.

One/two Lights need a bounded capital publication phase, correct restore order against hull/debris/shells/PairShots, corridor-aware C motion and admission/drain changes. Use existing character slots, not PMG. A Heavy uses existing P1/P2 class, but capital broadside warning/impact missiles share their COLPM colours; normal formation admission also assumes a pair. A single member requires C admission/lifecycle changes and colour/publication handling, not a new renderer architecture by default. Actual costs are D1; no benchmark justifies a hardware redesign yet.

The capital branch starts around VCOUNT **$70**, and skips the fighter late fence. Adding the wait mechanically could wrap to the next frame if arrival is late. Placement/timing of a new publisher must be measured before integration; apparent total-cycle headroom alone does not prove correct pixels.

## D — Ranked ways to improve the capital

All numeric costs in this section are **E: static estimate (no trace)** unless “existing” or “data-only” is stated. Costs are incremental to today's game, not simultaneous promises. R = permanent resident code/state; O = additional capital-phase code/data including work buffers; disk = incremental **raw payload**, rounded up to 128-B sectors when a new run is needed, excluding existing allocated padding. Cost ranges include roughly 2–3× room around small instruction-count/old-plan estimates where integration is unproven. They are decomposed below. No additional run is assumed to fit a full existing slot automatically.

**Ranking is effect/cost, with chosen nacelles still the principal gameplay recommendation.** CPU is worst event/frame delta, not average; DMA is incremental bus steals, not CPU.

```markdown
| Rank / idea | Player effect | R / O / disk bytes, E | Worst capital delta; DMA delta | Data vs code; risk; milestone |
| --- | --- | --- | --- | --- |
| 1 — D9 existing art/layout/length variety | Distinct hull passages and approaches | 0 /0 /0 incremental for replacement tables | No structural increase; authored load still matters; DMA0 | Existing data; low; M3 authoring/M7 |
| 2 — D7 SW nacelles, CHOSEN | Navigable narrowing corridor | 60–160 /180–420 code +128–256 data/state /384–896 | +900–2000 CPU contact/rotate peak; DMA0 | New format/C policy/ASM strips and edges; medium–high; M3 proof/M7 sets |
| 3 — D4 chained capital bursts, no shake | Destruction travels along hull | 16–64 /80–224 /128–384; data-only part0–128 | +300–1500 CPU, one new scheduled burst; DMA0 | Existing two FX slots plus C cadence; medium; M3/M7 |
| 4 — D6 coarse colour every four levels | Visible campaign variation | 0–32 /0–32 /0–16 data within existing blocks | 0 steady CPU, entry-only; DMA0 | Allied field exists, hostile policy/field needed; low–medium; M7 |
| 5 — D8 sky tuning / sector parameters | Sector identity and motion contrast | Global0 code +0–16 state /0 /0–64; sector80–224 /0–64 /128–384, data4–24 per level | +100–700 CPU with bounded points; DMA0 | Global asset today; per-sector speed/density requires code; medium; M3/M7 |
| 6 — D5 hull hit marks | Persistent battle scars | 8–96 /140–360 code +32–96 state /256–640, data16–96 | +150–1000 CPU hit/redraw; DMA0 | Bounded world-row cache + art/code; medium–high; M7 |
| 7 — D2 second turret station per side | Varied crossfire origins | 16–112 /120–320 code +16–32 state /256–512, data32–128 | +300–1400 CPU, retain two active shells; DMA0 | Compiler/C policy/tracked-muzzle ASM; high; M3-H proof/M7 |
| 8 — D1 one Light | Moving corridor threat | 80–320 /160–480 /384–896 including 8–32 wave data | +700–3500 CPU incl. kill/publication; DMA0 | C lifecycle and ASM publisher integration; high; M3 proof/M7 |
| 9 — D1 two Lights, total | Sustained corridor pressure | 100–384 /192–600 /512–1152 including 16–48 wave data | +1400–5500 CPU incl. bounded kills; DMA0 | Same infrastructure, two-slot stress; high; M7 after one-Light proof |
| 10 — D6 per-row palette | Moving illuminated deck bands | 16–160 /160–480 code +32–112 schedule /256–768 | +1200–8500 wall incl. DLI/WSYNC,8–28 splits; DMA0 for existing DL instruction bits | New raster schedule; potential0–28 DL bytes if list format expands (then reprice DMA); high; M7 |
| 11 — D1 one Heavy separately | Large corridor patrol | 100–448 /224–700 code +0–24 state /512–1280 | +1200–4500 CPU; DMA0 with current PMG enabled | Single-member admission, P1/P2–M1/M2 colour sharing; high; M3-H proof/M7 |
| 12 — D4 chain plus compensated shake, total | Scene jolts on destruction | 32–112 /280–724 code +64–192 scratch/list /512–1152 | +800–2200 main CPU, plus up to 800 DLI/wall; DMA0–360 | Live-scroll adaptation, coordinate/exit compensation; high; M7 |
| 13 — D3 ordinary-shot reactor/bridge | A destructible mini-objective | 60–160 /350–800 code +32–96 data/state /512–1152 | +250–1400 CPU; DMA0 | C HP/reward, ASM hit/publication; high; M7 |
| 14 — D3 reactor with lance, total | Charged, aimed optional strike | 100–448 /750–1800 code +32–96 data/state /1024–2560, plus existing G/H loading | +750–3600 CPU; DMA0, P1/P2 conflicts with Heavy | New target API and boss-only weapon-rule change; very high; M7 separate scope |
```

Merged envelopes use the source-based alternatives in Disagreements; upper byte estimates are integration reserves, not a linked design. Disk totals allow code transport and differ from R's descriptor-only figures. A new run can use current level padding only with an explicit placement/loader contract. The compact descriptor-based D7 alternative remains below; no second ranking is implied. DMA0 means unchanged fetch structure, not zero elapsed impact.

**Bases / limits on each price:**

* **D1:** old plan one Light **120–190 B**, standing **412 CPU**, kill about **1360** (`gameplay-variety §3.9`, design §8) omitted some publication/placement interactions. Audit ranges budget a separate phase check/admission C block, bounded publisher and transition tests; two Lights share that infrastructure but increase per-frame tick/backing and collision work. Keep kill FX bounded by the existing token; no two unrestricted explosions on one binding frame. Heavy baseline uses B `update_enemy` maximum **2329** and old measured member costs, then allows spawn/death/colour work. These are not additive to all D items without a fresh budget.
* **D2:** old **56–70 B, 150–360 cycles** estimate is widened for four tracked muzzle records, more saved cells/flash state and scans. Existing `hull.turrets=3` is not the requested second station. Preserve two active shells: more firing origins need not mean more simultaneous projectiles. Increasing shell count beyond that is separately priced and risks M3/capsule PMG sharing.
* **D3:** at least one C target record (HP, world row, alive/visible state), new hot-shot dispatch, bounded damage glyph publication and completion reward. Existing broadside counters are insufficient. Lance G/H code refers to boss modules, band columns, covered/core/field rules and boss hit entry; it is unavailable in capital without loading/adapting it. Reuse art and gesture concepts first; do not budget the whole feature as one call to `boss_hit`. It also changes the current boss-only weapon rule, so this is a costed option, not implementation authorisation.
* **D4:** existing two-owner 3×3 capital effect slots are a cheap basis for a time-separated chain. Do not load the death overlay over a live fight: it assumes exclusive control, freezes input/combat, owns C/D/E/F and a private list. The death engine's **2559 B**, **480-B scratch span** and compensated list are evidence of integration cost, not a library available for free. VSCROL on a live scrolling field needs coordinate/collision and scroll-exit compensation; simply writing VSCROL shakes more than intended.
* **D5:** retain a bounded list of world-row/side/column marks, reapply when base rows recycle, and resolve backing through overlays. Directly stamping the ring is temporary and can be restored away; editing the shared 32-row module would scorch every repeated occurrence. Start with one fixed scorch cell per hit, existing glyph substitution; per-pixel damage is outside this estimate.
* **D6:** roughly **28 × 77–180 CPU** for dispatch/stores plus up to **28×114 WSYNC** gives the broad wall range. Retain global PF0/PF2 semantics or explicitly accept recolouring shots/stars; row palettes recolour all objects on that row. A **colour change every four levels alone** is much cheaper: **0–32 resident, 0–16 data B, 0 frame CPU** if applied at level start; it needs a build/runtime palette field because hostile PF3 is currently global. Changing allied COLPF1 by existing level-block data is already supported. Four-level colour groups and three-level campaign boss regions need not be identical, but should be intentionally authored.
* **D8/D9:** use current support before adding layers: global 4→8 sparse points adds **4×4=16 B** state; per-sector colour already exists. No far layer runs today. Extra layers add renderer/state work and are not included in the small sky price. Existing engine animation, timed shell impacts, supported hull lengths and R1–R4 styles can provide visible variety at replacement-data cost; unused `mirror`/paths are not free implemented features.

### D7 — Nacelles, detailed HW vs SW assessment

#### Colour ownership and hardware latches

ANTIC 4 glyph pairs select **00 background, 01 PF0, 10 PF1, 11 PF2**; a character's bit 7 redirects selector 11 to **PF3**. Current CAP code sets screen code `index | SCREEN_BANKS.get(screenBank)`: allied hull uses normal PF2 cells, enemy hull inverse PF3 cells. Actual read-only glyph compilation finds all selectors **0/1/2/3** across both faction glyph sets. A black groove is not a collision pixel. Register identity, not its current hue, controls playfield collisions; DLI palette writes cannot make a shared PF index hull-exclusive. Hardware basis: [Atari 400/800 Hardware Manual](https://www.atarimania.com/documents/atari-400-800-hardware-manual.pdf), GTIA register map; [Atari Microsoft BASIC II manual](https://www.atarimania.com/documents/Atari_Microsoft_BASIC_II.pdf), collision-control chapter. No long external quotation is reproduced.

```markdown
| Collision bit | Current hull use | Other play-band use, from source/assets | Hull-only? |
| --- | --- | --- | --- |
| PF0, mask $01 | white armour edges and detail | white stars; hostile weapon white detail; debris/effect white pixels | No |
| PF1, mask $02 | steel hull mass | steel stars in capital; debris; hostile weapon steel detail | No |
| PF2, mask $04 | allied selector-3 detail / energy | player shots, player-side blast/core; selector-3 sky when selected | No |
| PF3, mask $08 | inverse enemy armour, seam, weapons | enemy breakup fragments/core; Light pods/wings if admitted; inverse hostile projectile pixels where used | No |
```

Sources: MAIN palette constants/comments and dynamic star publisher; `assets/graphics/fighter-weapons.json`, `entity-effects.json`, `starfield.json`; LK survived-hit bit-7 toggles. The static debris masks contain selectors 1 and 2; enemy FX explicitly publish inverse selector 3. P0 can also overlap other play-band art during death; lifecycle gating is needed. P1/P2 Heavy collision is P/P, not identified by P0PF. Current hull collision uses a solid player rectangle; HW uses actually drawn P0 bits and therefore changes corner/gap/blink semantics.

S search of `src/`: no `P0PF` symbol/read; no `lda HPOSM0`/literal `$D004` collision read found. `$D004` writes position M0 and must not be mistaken for reads. `HITCLR` writes occur in MAIN gameplay init **2689**, pause resume **3013**, gameplay teardown **3135**, `handle_collisions` **5403**, enemy-death feedback **5460**, player latch reset **8235**, and boss entry **3557** in `src/hybrid/boss.s`. The main-loop order is **handle_collisions → update_starfield → hull contact**. Thus a new P0PF read inserted at today's hull-contact call would follow the regular clear and miss earlier overlap. A robust HW version must sample once before any clear, cache the result, then clear consistently; resets/death/respawn must not erase an unsampled event. Snapshot X/Y if collision refers to the previous displayed frame. An extra DLI does not solve object identity.

**HW verdict:** there is **no valid current hull-only mask**. A pure `LDA P0PF / AND mask / branch` is approximately **7–9 bytes, 8–9 CPU**, and `LDA #0 / STA HITCLR` another **5 bytes / 6 CPU**, but those are not a correct feature cost. Allow **20–40 B / 20–50 CPU** for a small sample/cache stub only. A full HW redesign needs an exclusive material palette, changes to every competing glyph/effect, and a consistent latch schedule; **E 64–224 resident + 250–700 capital overlay + 128–320 data/state**, **+80–500 CPU normally and +300–1200 on contact**, DMA **0** before any new DLI. These are exploratory prices, not a feasible mask solution. Adding a software position/map filter to reject stars and shots largely recreates the cheaper SW test. No art-direction change is assumed authorised.

#### Existing software path and format changes

MAIN `handle_player_hull_contact` at **9699** already resolves up to **three visible rows** for the **8-HPOS-wide ×15-scanline** player rectangle, takes the greatest allied and smallest enemy boundary, clamps `player_x`/HPOSP0 and calls canonical **two-unit HULL damage**, with existing cooldown/lifecycle/Shield rules. `player_inside_universal_hull_corridor` at **7601** skips the expensive path for the universal safe corridor bounded by immediates **$54/$AC**. Widening hull geometry without narrowing that fast rejection causes missed contact. Boundary rows derive from the source map, not arbitrary star/shot screen codes; palette changes do not affect SW collision.

Current format supports cosmetic in-band bulges (depth **5–8**, plus turret projection), but **does not support the proposed deeper nacelles today**:

* `MAP_COLUMNS=9`, allied columns **0–8**, enemy **31–39**; packed **5 B/row**, expanded **288 B/side**. Depth is derived from the map and hard-gated **5–8**. Every projection must match turret-row metadata; one turret module exposes one muzzle near its start.
* The v2 style has exactly **seven enemy surface glyphs**; codebooks have spare indices, but there are no spare new hull glyph slots by that fact alone. Reuse/repaint surface glyphs first. A new dedicated nacelle glyph needs a replaced slot or a deliberate charset/format change.
* Level JSON currently has `hull.length/rows/turrets`, **no per-level nacelle placement or corridor-width field**. `hullParams` has **22 B** reserved but unread; M3-H's older plan wants **17 B** of the former 32-B reserve. There would be only **5 B** left if that plan is adopted unchanged, not 15. Use the existing 104-B hull pad or a revised geometry record, with explicit offsets.

Recommended minimal design: maintain a contiguous outer-hull-to-inner-edge silhouette (no holes/tunnels), add bounded side strips for at most **two extra columns per side**, and store a small per-level nacelle pattern/width policy. C chooses difficulty/pattern at entry; ASM publishes strips and consumes the resulting boundaries. Do not expand the live maps in place: widening **9→11 cells ×32 rows ×2 sides adds 128 B**, and `$4E40` already contains broadside state. Keep those strips in separately reserved capital-phase RAM. Packing adds **32 B/side =64 B total** (6 instead of 5 packed bytes/row); boundary tables can remain 32 B/side if geometry is still one contiguous edge. Existing 40-B prepared row can hold the final visible row, but its cache key and star/debris placement rules must account for the pattern.

```markdown
| Variant | R / capital overlay / disk | Worst incremental capital cost | Correctness / player contact |
| --- | --- | --- | --- |
| SW, bounded two-column strips | 60–160 / 180–420 code + 128–256 data/state / 384–896 B | E +900–2000 CPU on edge/row/contact event; DMA 0 | Extends existing source-row boundaries, cache and fast reject; palette-independent; recommended |
| HW sampler + SW confirmation | 64–144 /160–360 code plus same geometry and 2–8 latch B /384–896 estimated transport | E +950–2100 CPU total; sampler20–60; DMA0 | Can reject false positives with geometry, but usually retains SW work and adds latch timing risk; no advantage established |
| HW, tiny mask stub only | 20–40 / 0 / fits existing payload if relocated | E 20–50 CPU; DMA 0 | Incorrect with current colour sharing and clear timing; not a shippable option |
| HW with palette/latch redesign | 64–224 / 250–700 + 128–320 data/state / 512–1280 B | E +80–500 CPU, contact +300–1200; DMA 0 before any added raster split | Art and lifecycle changes; pixel-shaped contact; feasibility unproven |
```

SW estimate basis: four extra visible side cells cost roughly **64–80 CPU per newly drawn row** using existing indirect load/store loops; decoding/choosing extents adds a bounded **100–300**; up to three previously skipped row resolutions dominate the larger **900–2000** event allowance (S instruction/path estimate). These deltas are **incremental**: the current worst edge path already does much of the work. They do not justify adding2000 to every ordinary frame. R anchors the upper reserve in at most six side resolvers at roughly 120 CPU each, row bookkeeping, clamp/damage/HUD and drawing; the existing centre fast path is 55 CPU (B/S). These are instruction/path estimates, not traced nacelle costs. Part B gives per-level conditional headroom and explicitly withholds a timing PASS.

**Compact descriptor alternative (R, static estimate):** keep the 9-column base maps and add per-module side/extent/row-span/glyph/difficulty descriptors, rather than storing two complete wider maps. R priced 32–80 resident +128–280 capital code +64–192 state/data, with 64–256 descriptor/art disk B (code transport additional). This may be cheaper but is less concrete than the full strip reserve in the ranking. Both need new schema/compiler/runtime fields and updates to row cache, clear/restore and the universal-corridor check. If needed,2–4 new shapes cost 16–32 raw glyph B; replace existing surface slots or prove allocation, since free codebook entries do not create charset space. Keep marks independent of collision unless destructible geometry is deliberately implemented.

**Passability:** easiest difficulty should retain a generous central safe channel and symmetric/telegraphed taper. Suggested design budget, not an owner decision: constrain visible rows to at least **20 free character cells** when both sides protrude two cells beyond the eight-column base; that is **80 HPOS units** versus the visible double-width ship's approximately **16**. The existing logical hull-collision footprint is only 8 HPOS; do not use that smaller rectangle as visual clearance. R's alternative16-cell/64-HPOS minimum would leave48 HPOS beyond the visible footprint; the more generous20-cell proposal leaves 64. Validate the intersection over all three collision rows, both sides' eight-row phase offset, all module joins and entry/exit; per-row width alone cannot prove a moving diagonal passage safe. Keep debris/spawn lanes inside the narrowest allowed channel and provide enough travel time at the selected scroll rate. “Passable for everyone” requires owner play on EASY, not just geometry arithmetic.

**Contact:** retain two of ten HULL units of damage, the existing 25-frame cooldown, and immediate push-back/clamp; it is already implemented and cheapest. Instant death also reaches an existing damage path cheaply, but would be a material gameplay change and disproportionately punish the new geometry. No instant-death recommendation. Keep the real-hardware path: no emulator-only collision assumptions, no new mid-sector disk reads.

## Completion and next action

Static Parts A/C/D/D7 are complete to the explicit estimates and source limits above; Part B combines current build CPU accounting, clearly dated existing evidence, and the authorised no-trace fallback. No capital addition is PAL-certified here. Production CPU/RAM delta **0**; no game bytes changed. Only the report is committed locally, in one reconciliation commit above ff0e202. That predecessor is preserved; no new build or trace was run during reconciliation. The next implementation decision is placement recovery before M3-H, followed by a focused nacelle SW prototype and real capital-row timing when the emulator source is available. No roadmap work was started. **STOP — await owner direction.**

## Appendix A — complete build-derived address inventory

This is generated read-only from the current build via `renderBlock()` in `scripts/memory-map-report.mjs`, not copied from `docs/memory-map.md`. It retains phase overlaps and individual owners. For a segment/state/transient row, its size is its occupied/reserved span (free within that row = 0); reservation-tail rows are free within that named reservation; enclosing slot capacities and useful-code/BSS distinctions are A1. Machine/guard rows have zero allocatable free bytes. Unclaimed means unverified, not safe. The generator's historical owner prose can lag (notably F asset-region labels and the five-byte window reservation); A1 supplies the audited campaign names and restrictions.

```markdown
| Range | Size | Kind | Owner | Phases | Source |
| --- | ---: | --- | --- | --- | --- |
| `$0000-$007F` | 128 B | machine | OS zero page (the game's ZP area starts at the cfg's `ZP` start) | `boot` `resident` | cfg/atari-boot.cfg `ZP` |
| `$0080-$009F` | 32 B | segment | `ZEROPAGE` — main: zero-page runtime variables | `resident` | build/void-strike-65.map |
| `$00A0-$00A1` | 2 B | segment | `READER_ZP` — sector reader (zp),y pointer | `resident` | build/sector-reader.map |
| `$00A2-$00AB` | 10 B | state | menu music v2 column pointers and publication scratch (equates) | `resident` | src/main.s `MUSIC_VOICE_COLUMN` |
| `$00AC-$00B5` | 10 B | state | level-summary stat block (`STATS_SHOTS` … `STATS_BONUS`), cleared at every START GAME | `session` | manifest `levelSummary.statBlock` |
| `$00B6-$00C3` | 14 B | segment | `LANCE_ZP` — the VOID LANCE's state in the zero page (the torpedo - its lines, its HPOS, the exhaust's and the explosion's counts -, the reticle's line and mark, the readiness shown, the slow frame's stick, the HUD meter's cells shown, the ordinary fire's hold after a launch): the boss sector only, cleared by the boss install at every entry; MEASURED written by nothing else but the OS's RAM clear at boot and RESET (the trace's zero_page_b6 watch) | `overlay` | build/boss.map |
| `$00C4-$00FF` | 60 B | unclaimed | **unclaimed — not measured** | — | — |
| `$0100-$01FF` | 256 B | machine | 6502 stack | `boot` `resident` | 6502 |
| `$0200-$03FF` | 512 B | machine | OS page 2-3 workspace, shadows and vectors (`VDSLST`, `SDMCTL`, `MEMLO`, SIO `DDEVIC`-`DAUX2`, `BASICF`) | `boot` `resident` | src/main.s equates |
| `$0400-$04FF` | 256 B | slot | the VOID LANCE's page 4 run (slot H, journal §BL): the OS's cassette buffer, which no path of the game uses; read at every boss entry after the lance run, the boss sector only; run `boss-lance-page` (2 sectors, 718-719); the trace's `page_4` watch lists its writers | `overlay` | manifest `boss.lance.page` |
| `$0400-$04F9` | 250 B | segment | `LANCE_PAGE` — the VOID LANCE's page 4 run (slot H, journal §BL): the HUD meter (its two glyphs, the four cells by the meter's quarters), the reticle's rows, the explosion on P2 and the torpedo's shapes; read at every boss entry after the lance run, the boss sector only | `overlay` | build/boss.map |
| `$0500-$0BFF` | 1,792 B | slot | level-summary claim (owner decision 2026-10-03): no other link, cfg area or boot range may reach it | `session` | manifest `levelSummary.code`, tests/level-summary-build.test.mjs |
| `$0500-$0BEE` | 1,775 B | segment | `LEVEL_SUMMARY` — level-summary module (read at the first START GAME) | `session` | build/level-summary.map |
| `$0500-$06FF` | 512 B | segment | `BOOT_SPLASH` — boot splash blob (ADR-003 hold, cassette sound, fade, loader_dli) | `splash` | build/void-strike-65.map |
| `$0BEF-$0BFF` | 17 B | reserved | free tail of `LEVEL_SUMMARY_RAM` | `session` | cfg/level-summary.cfg |
| `$0C00-$1FFF` | 5,120 B | slot | boss claim (owner answers Q-B5, Q7): the region charset, slot C, the scratch page, slot D - the boss sector only; no other link, cfg area or boot range may reach it | `overlay` | manifest `boss.claim`, tests/boss-claim.test.mjs |
| `$0C00-$0FFF` | 1,024 B | slot | boss region charset (CHBASE `$0C` under the band), read at every boss entry; codes 0-6 the divider's, copied by the install; each region's run: R1 93 codes / 6 sectors, R2 108 codes / 7 sectors, R3 108 codes / 7 sectors, R4 100 codes / 7 sectors (region 2's two nozzle codes, never drawn, at 126-127 outside its run: the engine writes them unseen) | `overlay` | manifest `boss.charset` |
| `$1000-$19FE` | 2,559 B | slot | boss breakup B: disk-only post-defeat C policy, ASM executor and region palettes; replaces dead fight C/D storage | `boss` `death` | manifest `boss.death`, cfg/boss-death.cfg |
| `$1000-$17FF` | 2,048 B | slot | boss slot C: the C controller, run `boss-slot-c` (15 sectors) | `overlay` | manifest `boss.slotC` |
| `$1000-$14FB` | 1,276 B | segment | `BOSS_C_CODE` — boss slot C: the C controller (cover and exposure, stages, tier, defeat, fire countdown, the finale, chain, bonus, clock) | `overlay` | build/boss.map |
| `$1000-$14B7` | 1,208 B | transient | boss banner run (the largest region's), landed in slot C's area before slot C is read | `boss-entry` | manifest `boss.banner` |
| `$1000-$11EB` | 492 B | segment | `DEATH_HEAD` — boss breakup: post-load setup and private animation loop | `boss` `death` | build/boss-death.map |
| `$1000-$10BE` | 191 B | segment | `BOSS_BANNER` — boss banner screen (feat/boss-banners): the frontend screen cleared, the list, the title, the empty bar, shown on a frame edge, then the run's other sectors read and checked; first in each region's banner run (its first 2 sectors with the head), landed in slot C's area before slot C is read | `boss-entry` | build/boss.map |
| `$10BF-$10EE` | 48 B | segment | `BOSS_BANNER_HEAD` — boss banner region head (feat/boss-banners): the region, the bar's step, the name's line, the run's other sectors and their fold, the title's records; written by the build into each region's banner run, in the screen's 2 sectors | `boss-entry` | build/boss.map |
| `$10EF-$11DA` | 236 B | segment | `BOSS_BANNER_LATE` — boss banner rest of the set-up (feat/boss-banners): the reads copied out, the bar's state, the VOID LANCE's line under INCOMING and its '+' glyph (M6 journal §BI 1), the picture unpacked and mirrored into its lines under the shown screen | `boss-entry` | build/boss.map |
| `$11EC-$194F` | 1,892 B | segment | `DEATH_CODE` — boss breakup: C decisions, character copies and PMG/DLI publication | `boss` `death` | build/boss-death.map |
| `$14FC-$154C` | 81 B | segment | `BOSS_DEATH_PREP` — post-defeat takeover in the former chain/hold tail; no fight work, no new resident bytes | `overlay` | build/boss.map |
| `$1500-$17FF` | 768 B | transient | boss banner picture's stored half, unpacked (12 B a line), mirrored into the screen | `boss-entry` | manifest `boss.banner` |
| `$154E-$1557` | 10 B | segment | `BOSS_C_RODATA` — boss slot C: C read-only data | `overlay` | build/boss.map |
| `$1558-$171C` | 453 B | segment | `BOSS_C_ASM` — boss slot C: the overlay's once-per-entry ASM (boss_prepare) | `overlay` | build/boss.map |
| `$171D-$17FB` | 223 B | segment | `BOSS_C_BSS` — boss slot C: the controller's state (after its code, never read from disk) | `overlay` | build/boss.map |
| `$1800-$18FF` | 256 B | slot | boss scratch page: the column map, the ring, slot A's state; set by the install | `overlay` | manifest `boss.scratch` |
| `$1800-$1897` | 152 B | segment | `BOSS_SCRATCH` — boss scratch page: the column map, the cell-flash ring, the draw queue, a rebuild's candidates | `overlay` | build/boss.map |
| `$1898-$18F4` | 93 B | segment | `BOSS_BSS` — boss scratch page: slot A's band, collision, feedback, queue and nozzle state | `overlay` | build/boss.map |
| `$18FB-$18FF` | 5 B | segment | `BOSS_HUD_BACKUP` — the HUD's five booster cells across the boss entry (S5-1; five since journal §BL 2), the scratch page's last five bytes | `overlay` | build/boss.map |
| `$1900-$1FFF` | 1,792 B | slot | boss slot D: the lasers and the boss's shots in the band, run `boss-slot-d` (14 sectors) | `overlay` | manifest `boss.slotD` |
| `$1900-$1F93` | 1,684 B | segment | `BOSS_D_CODE` — boss slot D: the lasers (B2: M1 / M2, the column, the warning, the beam, the hit test; the twin cannons' turn, feat/boss-r1-twin-lasers; the publish's tail jump to the gravity column's M0, S5-4, a build with the well), the boss's shots in the band (QA1) and the band's shown rows, measured once at the install | `overlay` | build/boss.map |
| `$1950-$19FE` | 175 B | segment | `DEATH_DATA` — boss breakup: all four regions' source-row palettes and glyph codes | `boss` `death` | build/boss-death.map |
| `$1E00-$1FFF` | 512 B | slot | boss breakup: second wing buffer, published after the fence; reuses dead boss claim | `boss` `death` | cfg/boss-death.cfg |
| `$1E00-$1FFF` | 512 B | segment | `DEATH_BUFFER` — boss breakup: offscreen wing buffer over dead slot D | `boss` `death` | build/boss-death.map |
| `$1F94-$1FFB` | 104 B | segment | `BOSS_D_BSS` — boss slot D: the lasers' state and the boss shots' band cells (after its code, never read from disk) | `overlay` | build/boss.map |
| `$2000-$5500` | 13,569 B | transient | initial boot block image, 107 sectors (code, data and packed sources) | `boot` | manifest `transportCapacity` |
| `$2000-$316F` | 4,464 B | segment | `CODE` — main: resident code | `resident` | build/void-strike-65.map |
| `$21C1-$26F4` | 1,332 B | segment | `BOOT_STAGE2` — stage-2 loader; the resident suffix is unpacked over it | `boot` | build/void-strike-65.map |
| `$3170-$3FF1` | 3,714 B | segment | `RODATA` — main: resident read-only data (its tail is boot-only, see reuse) | `resident` | build/void-strike-65.map |
| `$3825-$3FD3` | 1,967 B | transient | packed loader bitmap (in `RODATA`) | `boot` | build/void-strike-65.lbl |
| `$3B00-$418B` | 1,676 B | transient | boss banner picture: 64 mode F lines 26 B apart (0-48 in the PMG area, 49-63 over the text screen's rows 0-9) | `boss-entry` | manifest `boss.banner` |
| `$3B00-$3FFF` | 1,280 B | state | PMG DMA: missiles `MISSILES` and players `PLAYER0`-`PLAYER3` (single-line, `PMG_BASE` + `$300`) | `resident` | src/main.s `PMG_BASE` |
| `$3C00-$3CC9` | 202 B | transient | expanded loader display list (202 B) | `loader` | src/main.s `LOADER_DISPLAY_LIST_ADDRESS` |
| `$4000-$43FF` | 1,024 B | state | screen: HUD prefix, divider, frontend screen RAM | `resident` | src/main.s `SCREEN` |
| `$4010-$4FFF` | 4,080 B | transient | loader bitmap lines 0-101 | `loader` | manifest `loaderScreen` |
| `$407D-$442C` | 944 B | transient | packed STARFIELD stream A | `boot` | manifest `starfieldRuntime.streams` |
| `$41B8-$424F` | 152 B | transient | boss banner text and bar rows: WARNING (ANTIC 7), the name and INCOMING (ANTIC 6), the bar's two mode F rows, the VOID LANCE's line (ANTIC 2, M6 journal §BI 1) | `boss-entry` | manifest `boss.banner` |
| `$4400-$47FF` | 1,024 B | state | gameplay charset | `resident` | src/main.s `CHARSET` |
| `$442D-$4733` | 775 B | transient | packed STARFIELD stream B | `boot` | manifest `starfieldRuntime.streams` |
| `$4734-$4820` | 237 B | transient | A2 kernel image in the initial block | `boot` | manifest `a 2Kernel` |
| `$4800-$4BFF` | 1,024 B | state | frontend charset | `resident` | src/main.s `FRONTEND_CHARSET` |
| `$4801-$4CA9` | 1,193 B | transient | packed pickup/collision + window streams held in the frontend charset | `boot` | src/main.s `WEAPON_PICKUP_COLD_STAGING`, manifest `residentCapacity.pickupRecordPackedBytes` |
| `$4821-$52FC` | 2,780 B | transient | packed ENTITY_CODE source | `boot` | manifest `entityEffects` |
| `$4C00-$4E3F` | 576 B | slot | boss breakup: row list, palettes and state over dead pickup/laser slot E; player's P0 and bottom HUD preserved | `boss` `death` | src/hybrid/boss-death.s |
| `$4C00-$4E3F` | 576 B | slot | boss slot E: read at the boss entry over the expanded hull maps (the capital's, rebuilt at every gameplay start), the boss sector only; run `boss-slot-e` (4 sectors) | `overlay` | manifest `boss.slotE`, cfg/boss.cfg |
| `$4C00-$4DFE` | 511 B | segment | `BOSS_E_CODE` — boss slot E (M5b-S4b.5): the capsule from a destroyed module (none on the defeat), the laser warning's flicker colour, the module hit flash's frame step, guards and bit-7 toggle (fix/boss-polish), the lasers' admission and the twin cannons' index and gate (feat/boss-r1-twin-lasers, a build with twins), the gravity column's HPOSM0 publish and its position byte (S5-4, a build with the well); read at the boss entry over the expanded hull maps, the boss sector only | `overlay` | build/boss.map |
| `$4C00-$4D1F` | 288 B | state | expanded Allied hull map: built at every gameplay start, read by the capital's draw_hull_row; the boss's slot E holds this RAM in the boss sector | `resident` | src/main.s `CAPITAL_HULL_RUNTIME_ALLIED` |
| `$4D20-$4E3F` | 288 B | state | expanded Hostile hull map: built at every gameplay start, read by the capital's draw_hull_row; the boss's slot E holds this RAM in the boss sector | `resident` | src/main.s `CAPITAL_HULL_RUNTIME_ENEMY` |
| `$4D20-$4D36` | 23 B | segment | `DEATH_STATE` — boss breakup: C policy state over dead slot E | `boss` `death` | build/boss-death.map |
| `$4DFF-$4E0E` | 16 B | segment | `BOSS_E_BSS` — boss slot E: its state - the boss shots' band cells, the hit flash's timer, module and request (fix/boss-polish), the twin flag (feat/boss-r1-twin-lasers) - after its code, never read from disk | `overlay` | build/boss.map |
| `$4E40-$4E6F` | 48 B | state | broadside slot state | `resident` | src/main.s `BROAD_STATE_BASE` |
| `$4E70-$4ED0` | 97 B | state | difficulty, hull scroll, final-raster bolt tops, flash backing, sector, player lifecycle, capital explosion, engine and Raider state | `resident` | src/main.s `DIFFICULTY_SETTING` |
| `$4ED1-$4ED6` | 6 B | state | star RNG, near-star phase, PAL frame ids | `resident` | src/main.s `STAR_RNG_STATE` |
| `$4ED7-$4ED8` | 2 B | state | muzzle row-domain state | `resident` | src/main.s `MUZZLE_ROW_DOMAIN` |
| `$4ED9-$4EE9` | 17 B | state | music and tracked-muzzle state | `resident` | src/main.s `MUSIC_ACTIVE` |
| `$4EEA-$4EFD` | 20 B | state | TOP SCORES table (packed BCD) | `resident` | src/main.s `TOP_SCORE_TABLE` |
| `$4EFE-$4FF7` | 250 B | segment | `GLUE` — late-published integration glue | `resident` | build/integration-glue.map |
| `$4FF8-$4FF9` | 2 B | state | 16-bit active-gameplay frame counter | `resident` | src/main.s `ACTIVE_GAMEPLAY_FRAME_LO` |
| `$5000-$5E0F` | 3,600 B | transient | loader bitmap lines 102-191 (second LMS) | `loader` | manifest `loaderScreen` |
| `$5000-$53FF` | 1,024 B | state | gameplay HUD charset | `resident` | src/main.s `HUD_CHARSET` |
| `$5200-$53FF` | 512 B | slot | boss breakup: checked disk bootstrap over dead region slot F; reads the engine while the A-only DLI retains boss, player and HUD | `boss` `death` | cfg/boss-death-boot.cfg |
| `$5200-$53FF` | 512 B | slot | boss slot F (S5-1, owner decision Q9): the HUD charset's unused upper half (codes 64-127, never shown); the region's block, read at every boss entry as the region's fourth run; no restore | `overlay` | manifest `boss.slotF`, tests/slot-f.test.mjs |
| `$5200-$526D` | 110 B | slot | boss region look tail (open looks, nozzle phases, hull stops; owner decision E4 (b)): the region block, first in slot F (S5-1; slot D's head until then) | `overlay` | manifest `boss.slotF.lookTail` |
| `$5233-$526C` | 58 B | segment | `BOSS_R_DATA` — region 2's cannons' lens cells, the rails' scratch and the frame hook (S5-5, "B - the window"; the owner's look at 110c274): the locked bays' laser countdown, the warning's heat on each lens, the missile plane's armour row - no beam behind a locked bay's armour; in region 2's block between its look tail and BOSS_F_HOOK; read with that block at region 2's boss entry only | `overlay` | build/boss.map |
| `$526E-$53FB` | 398 B | segment | `BOSS_R_CODE` — region 2's sliding rails and hangar (S5-5): a front gun's kill slides its rail one pitch inward and opens its bay (the stop lines up to the muzzle row), the cover, the warning pulse, the doors' escort cue, the doors' and the bays' unlock cue, the core's armoured flank; the rails' tables and state after the code; its code in region 2's block (slot F, after the look tail's 110 B, at the field's and the well's address - one region's block is in memory at a time); read with that block at region 2's boss entry only | `overlay` | build/boss.map |
| `$526E-$5395` | 296 B | segment | `BOSS_G_CODE` — region 4's gravity well (S5-4): the pull, the core's pulse and the gravity column (missile M0), its code, wave table and state in region 4's block (slot F, after the look tail's 110 B, at region 3's field's address - one region's block is in memory at a time); read with that block at region 4's boss entry only | `overlay` | build/boss.map |
| `$526E-$5342` | 213 B | segment | `BOSS_F_CODE` — region 3's force field (S5-3): its code, tables and state in region 3's block (slot F, after the look tail's 110 B); read with that block at region 3's boss entry only | `overlay` | build/boss.map |
| `$52FD-$54FC` | 512 B | transient | boot splash blob in the initial block, copied to `$0500` | `boot` | manifest `transportCapacity.bootSplash` |
| `$5318-$5DF3` | 2,780 B | transient | ENTITY_CODE packed source after its backward staging copy | `boot` | manifest `entityEffects` |
| `$5400-$549D` | 158 B | segment | `PROJECTILES` — PairShot pool, burst controllers, fighter explosions, Raider records, menu music voice state | `resident` | build/void-strike-65.map |
| `$549E-$54E3` | 70 B | reserved | free tail of `PROJECTILE_RAM` | `resident` | cfg/atari-boot.cfg |
| `$54E4-$5CAA` | 1,991 B | segment | `STARFIELD` — relocated STARFIELD segment (see contents) | `resident` | build/void-strike-65.map |
| `$54FD-$5500` | 4 B | transient | boot payload trailer `DFB1` | `boot` | manifest `bootPayloadTrailer` |
| `$5CAB-$5E0A` | 352 B | reserved | free tail of `STARFIELD_RAM` | `resident` | cfg/atari-boot.cfg |
| `$5E0B-$5E0F` | 5 B | state | BOOST HUD-cell backing | `resident` | src/main.s `HUD_BOOSTER_BACKING` |
| `$5E10-$780C` | 6,653 B | segment | `BROADSIDE` — relocated BROADSIDE segment (see contents); holds overlay slot A | `resident` | build/void-strike-65.map |
| `$6DE8-$75E7` | 2,048 B | slot | overlay slot A (`update_broadside` onward; run `capital-slot-a`) | `overlay` | manifest `overlays.slotA` |
| `$6DE8-$6E0E` | 39 B | segment | `BOSS_HEAD` — boss overlay: head JMP and the capital vector table's boss image | `overlay` | build/boss.map |
| `$6E0F-$75B9` | 1,963 B | segment | `BOSS_CODE` — boss overlay: band, boss DLI, motion, the column map, shot-versus-module, hit feedback, fire, the draw queue, nozzles, drawing, hand-off | `overlay` | build/boss.map |
| `$75BA-$75DD` | 36 B | segment | `BOSS_HEAD_CHECK` — boss overlay: the head's run check and module-count bound (audit-hardening), last in slot A | `overlay` | build/boss.map |
| `$780D-$780F` | 3 B | reserved | free tail of `BROADSIDE_RAM` | `resident` | cfg/atari-boot.cfg |
| `$7810-$7BCF` | 960 B | transient | pause-screen backup (`PAUSE_SCREEN_BACKUP`) | `pause` | manifest `pause` |
| `$7810-$7BBF` | 944 B | transient | STARFIELD stream A staging | `boot` | manifest `starfieldRuntime.streams` |
| `$7810-$7B8F` | 896 B | transient | summary art run (largest region run) read for the summary screen | `summary` | manifest `levelSummary.art` |
| `$7810-$7AF9` | 746 B | transient | packed C extension record landing (`HYBRID_C_EXT_STAGING`) | `boot` | manifest `directorCodeRuntimes` |
| `$7810-$798E` | 383 B | segment | `BOSS_INSTALL` — boss install run at $7810, run once in place per boss entry; builds the band's list down to its last row with a cell (feat/boss-r1-twin-lasers) | `boss-entry` | build/boss.map |
| `$7810-$788F` | 128 B | transient | save-record sector buffer | `summary` | manifest `levelSummary.saveRecord` |
| `$7990-$7A81` | 242 B | transient | boss banner display list (40 blank lines, 64 LMS lines, the text, the VOID LANCE's line, the bar) | `boss-entry` | manifest `boss.banner` |
| `$7A48-$7A89` | 66 B | segment | `BOSS_ENTRY_COLD` — the boss entry's cold tail (feat/interceptor-armour): the theme's start, then (feat/boss-banners) the banner screen's registers and the region's banner run's 2 screen sectors read and checked against the theme run's spec; copied into every region's theme run at $7A48, run once per entry | `boss-entry` | build/boss.map |
| `$7A90-$7B89` | 250 B | segment | `BOSS_BANNER_KEEP` — boss banner reads (feat/boss-banners): the boss code and the head's eight runs one sector a call, the bar's step, the hand-over; copied from the banner run behind the banner's display list | `boss-entry` | build/boss.map |
| `$7B8A-$7B99` | 16 B | segment | `BOSS_BANNER_KEEP_BSS` — boss banner state (feat/boss-banners): the run spec, the bar's position and step, the region; behind the reads, never read from disk | `boss-entry` | build/boss.map |
| `$7BD0-$7C71` | 162 B | segment | `HYBRID_ASM_ARENA` — arena: assigned ca65 helpers | `resident` | build/encounter-director.map |
| `$7C72-$7EDA` | 617 B | segment | `HYBRID_C_ARENA` — arena: cc65 code (Heavy, recycle, drain) | `resident` | build/encounter-director.map |
| `$7EDB-$7F01` | 39 B | segment | `HYBRID_C_ARENA_RODATA` — arena: cc65 read-only data | `resident` | build/encounter-director.map |
| `$7F02-$7F0F` | 14 B | reserved | free tail of `HYBRID_C_ARENA_RAM` | `resident` | cfg/encounter-director.cfg |
| `$7F10` | 1 B | state | the gameplay display lists' shared header ($E0: 7 blank lines after a list's JMP, the first DLI on line 15) | `resident` | src/main.s `PLAYFIELD_DLIST_HEADER` |
| `$7F11-$7F6A` | 90 B | state | gameplay display list A (the divider, 27 ring rows, the HUD's line, the JMP to the header) | `resident` | src/main.s `PLAYFIELD_DLIST_A` |
| `$7F2B-$8017` | 237 B | transient | A2 kernel staging (`BOOT_A2_STAGING`) | `boot` | manifest `a 2Kernel` |
| `$7F6B-$7FC4` | 90 B | state | gameplay display list B | `resident` | src/main.s `PLAYFIELD_DLIST_B` |
| `$7FC5-$7FFF` | 59 B | segment | `HYBRID_LIGHT_SLOTS` — Light per-slot SoA state | `resident` | build/encounter-director.map |
| `$8000-$80FF` | 256 B | segment | `ENTITY_STATE` — entity/effect slots and Encounter Director state | `resident` | build/void-strike-65.map |
| `$8018-$8081` | 106 B | transient | ABI record landing (`DIRECTOR_ABI_STAGING`) | `boot` | manifest `coldRecordRelocation.abiRecord` |
| `$8100-$9A87` | 6,536 B | transient | packed resident-suffix staging (`PACKED_RESIDENT_STAGING`) | `boot` | manifest `residentRuntime`, `coldRecordRelocation.mergedRecord` |
| `$8100-$96FF` | 5,632 B | transient | DFMC record sector staging (largest record) | `boot` | manifest `transportCapacity.manifest` |
| `$8100-$81F9` | 250 B | transient | GLUE hold until `layout_d_publish_glue` | `boot` | manifest `integrationGlue.holdingAddress` |
| `$8100-$810F` | 16 B | segment | `HYBRID_LIGHT_STATE` — Light record and render cache | `resident` | build/encounter-director.map |
| `$8110-$8118` | 9 B | segment | `HYBRID_C_STATE` — derived Raider profile cache | `resident` | build/encounter-director.map |
| `$8119-$811A` | 2 B | segment | `HYBRID_ENCOUNTER_STATE` — Encounter state | `resident` | build/encounter-director.map |
| `$811B-$8125` | 11 B | segment | `HYBRID_HEAVY_STATE` — Heavy state | `resident` | build/encounter-director.map |
| `$8126` | 1 B | segment | `HYBRID_LIGHT_SCREEN` — Light published-slot bound | `resident` | build/encounter-director.map |
| `$8127` | 1 B | segment | `HYBRID_LIGHT_ROTATE` — ring-rotate marker | `resident` | build/encounter-director.map |
| `$8128` | 1 B | segment | `HYBRID_HEAVY_BREAKUP` — Heavy break-up deferred bit | `resident` | build/encounter-director.map |
| `$8129-$812D` | 5 B | segment | `DIRECTOR_SECTOR_STATE` — Director sector row clock and call holds | `resident` | build/encounter-director.map |
| `$812E-$813A` | 13 B | segment | `HYBRID_LIGHT_LOOK` — Light appearance keys | `resident` | build/encounter-director.map |
| `$8140-$8577` | 1,080 B | state | physical gameplay ring, 40 B per row | `resident` | src/main.s `GAMEPLAY_RING_SCREEN` |
| `$81FA-$8500` | 775 B | transient | STARFIELD stream B staging | `boot` | manifest `starfieldRuntime.streams` |
| `$8578-$85B6` | 63 B | state | ring row tables and A2 publication state | `resident` | src/main.s `PLAYFIELD_ROW_LO` |
| `$85B7` | 1 B | state | fresh allied boundary cell (row 0 of the retired left boundary cache) | `resident` | src/main.s `CORRIDOR_BOUNDARY_LEFT` |
| `$85B8-$85B9` | 2 B | state | allied/enemy tracked-muzzle backing | `resident` | src/main.s `MUZZLE_BACKING` |
| `$85BA-$85E1` | 40 B | state | prepared COMBAT hull row (centre byte `CORRIDOR_BOUNDARY_RIGHT` aliases the fresh enemy boundary cell) | `resident` | src/main.s `PREPARED_HULL_ROW` |
| `$85E2-$85E5` | 4 B | state | prepared-row key | `resident` | src/main.s `PREPARED_HULL_LO` |
| `$85EF-$85F1` | 3 B | state | corridor phase, hull draw row | `resident` | src/main.s `CORRIDOR_PHASE_HI` |
| `$85F2-$8601` | 16 B | state | near-star tables | `resident` | src/main.s `STAR_NEAR_ROW` |
| `$8602-$86F2` | 241 B | segment | `HYBRID_C_SECTOR` — cc65 sector functions (the resident window) | `resident` | build/encounter-director.map |
| `$86F3-$86F9` | 7 B | reserved | free tail of `HYBRID_C_SECTOR_RAM` | `resident` | cfg/encounter-director.cfg |
| `$86FA-$8700` | 7 B | segment | `DIRECTOR_C_BSS` — cc65 Director mailbox and scratch | `resident` | build/encounter-director.map |
| `$8701-$876A` | 106 B | segment | `DIRECTOR_ABI` — C/ASM ABI veneer and startup publishers | `resident` | build/encounter-director.map |
| `$876B-$8775` | 11 B | reserved | free tail of `DIRECTOR_ABI_RAM` | `resident` | cfg/encounter-director.cfg |
| `$8776-$8B5F` | 1,002 B | segment | `PICKUP_CODE` — pickup/collision stream: PMG pickup, publication scaffold, backing resolver, admission helpers | `resident` | build/void-strike-65.map |
| `$8B60-$8B66` | 7 B | reserved | free tail of `PICKUP_CODE_RAM` | `resident` | cfg/atari-boot.cfg |
| `$8B67-$8B87` | 33 B | segment | `COLLISION` — capital-bolt / Player Fighter collision module | `resident` | build/capital-player-collision.map |
| `$8B88-$8C5D` | 214 B | segment | `DIRECTOR_C_LOW` — low cc65 Director code | `resident` | build/encounter-director.map |
| `$8C5E-$8C7C` | 31 B | reserved | free tail of `DIRECTOR_C_LOW_RAM` | `resident` | cfg/encounter-director.cfg |
| `$8C7D-$8CAC` | 48 B | segment | `ENEMY_ARCHETYPE_DATA` — C EnemyArchetype table | `resident` | build/encounter-director.map |
| `$8C80-$9128` | 1,193 B | transient | pickup/collision + window record landing (`WEAPON_PICKUP_PACKED_STAGING`) | `boot` | manifest DFMC records |
| `$8CAD-$8F64` | 696 B | segment | `HYBRID_C_EXT` — cc65 extension: sector, lifecycle, Light | `resident` | build/encounter-director.map |
| `$8F65-$8FA7` | 67 B | segment | `LIGHT_CODE` — Light late-publication kernel (tail of the C extension composite) | `resident` | build/void-strike-65.map |
| `$8FA8-$8FE7` | 64 B | segment | `HEAVY_CODE` — Heavy late-publication helper (tail of the C extension composite) | `resident` | build/void-strike-65.map |
| `$8FE8-$8FFF` | 24 B | reserved | free tail of `HYBRID_C_EXT_RAM` | `resident` | cfg/encounter-director.cfg |
| `$9000-$90EC` | 237 B | segment | `A2_KERNEL` — A2 display/ring kernel | `resident` | build/void-strike-65.map |
| `$9000` | 1 B | segment | `ENTITY_RUN_PAD` — 1-B bss link pad that aligns ENTITY_CODE; nothing writes it | `resident` | build/void-strike-65.map |
| `$90ED-$90FF` | 19 B | reserved | free tail of `A2KERNEL_RAM` | `resident` | cfg/atari-boot.cfg |
| `$9100-$9D58` | 3,161 B | segment | `ENTITY_CODE` — relocated ENTITY_CODE segment (see contents) | `resident` | build/void-strike-65.map |
| `$9B40-$9D31` | 498 B | transient | merged low-C/GLUE record landing | `boot` | manifest `coldRecordRelocation.mergedRecord` |
| `$9D59-$9D5D` | 5 B | reserved | free tail of `ENTITY_CODE_RAM` | `resident` | cfg/atari-boot.cfg |
| `$9D5E-$9D72` | 21 B | segment | `DIRECTOR_C_PRE` — cc65 Director RNG | `resident` | build/encounter-director.map |
| `$9D73-$9D74` | 2 B | reserved | free tail of `DIRECTOR_C_PRE_RAM` | `resident` | cfg/encounter-director.cfg |
| `$9D75-$9D88` | 20 B | segment | `DIRECTOR_C_RODATA` — cc65 Director constants | `resident` | build/encounter-director.map |
| `$9D89-$9FF7` | 623 B | segment | `DIRECTOR_C_CODE` — high cc65 Director code | `resident` | build/encounter-director.map |
| `$9FF8-$9FF9` | 2 B | reserved | free tail of `DIRECTOR_RAM` | `resident` | cfg/encounter-director.cfg |
| `$9FFA-$9FFF` | 6 B | guard | `DIRECTOR_GUARD`: reserved, no segment | `resident` | cfg/encounter-director.cfg |
| `$A000-$BFFF` | 8,192 B | machine | RAM under the BASIC ROM: `disable_basic_rom` forces `PORTB` bit 1 and `BASICF` at every stage-2 entry (a description, not a claim) | `boot` `resident` | src/main.s, cfg/encounter-director.cfg |
| `$A000-$A5D9` | 1,498 B | segment | `SECTOR_READER` — between-levels sector reader, overlay runs, stat hooks | `resident` | build/sector-reader.map |
| `$A5DA-$A5FF` | 38 B | reserved | free tail of `SECTOR_READER_RAM` | `resident` | cfg/sector-reader.cfg |
| `$A600-$ADFF` | 2,048 B | slot | `LEVEL_BUFFER`, 16 sectors: the level image | `level` | manifest `sectorReader.levelBuffer` |
| `$A600-$A607` | 8 B | slot | level image header (byte 7: LevelDef's first sector) | `level` | manifest `capitalHulls.levelBlock` |
| `$A608-$A807` | 512 B | segment | `GAMEPLAY_MUSIC` — gameplay music player (in the level image) | `level` | build/gameplay-music.map |
| `$A808-$A87F` | 120 B | reserved | free tail of `GAMEPLAY_MUSIC_RAM` | `level` | cfg/gameplay-music.cfg |
| `$A880-$A997` | 280 B | slot | level hull block (style, packed map, codebook, glyphs, collision boundaries) | `level` | manifest `capitalHulls.levelBlock` |
| `$AA00-$AAFF` | 256 B | segment | `LEVEL_CORE` — LevelDef core page (bss inside the level buffer) | `level` | build/encounter-director.map |
| `$AB00-$ABFF` | 256 B | slot | LevelDef payload page | `level` | manifest `levelDef.payload` |
| `$AC00-$AC7F` | 128 B | slot | HullGeometry page (after its linked 8-B header) | `level` | manifest `levelDef.geometry`, `sectorReader.levels` |
| `$AC00-$AC07` | 8 B | segment | `LEVEL_GEOMETRY` — HullGeometry header (bss inside the level buffer) | `level` | build/encounter-director.map |
| `$AE00-$B3FC` | 1,533 B | segment | `HYBRID_C_WINDOW` — Director link's half of the BASIC window | `resident` | build/encounter-director.map |
| `$B3FD` | 1 B | segment | `HYBRID_ASM_WINDOW` — the boss entry's resident half (M5b-S3), last in the Director link's window half | `resident` | build/encounter-director.map |
| `$B3FE-$B477` | 122 B | segment | `HYBRID_C_WINDOW_FLOW` — the Director's sector-flow verdicts (feat/sector-flow), placed after the boss entry so the Light C keeps its addresses | `resident` | build/encounter-director.map |
| `$B478-$B790` | 793 B | segment | `LIGHT_KERNEL` — Light ASM kernel; carries the capital vector table | `resident` | build/light-kernel.map |
| `$B487-$B4AA` | 36 B | slot | capital vector table, 12 entries (inside `LIGHT_KERNEL`) | `resident` | manifest `overlays.capitalVectors` |
| `$B791-$B7EF` | 95 B | segment | `DISK_GUARD` — the disk guard (audit-hardening): the run fold and check, every directory run's expected value, the disk's identity block; behind the Light kernel in its record | `resident` | build/light-kernel.map |
| `$B7F0-$B813` | 36 B | segment | `CAPITAL_VECTOR_IMAGE` — the capital vector table's boot image, which the reader's capital restore copies back (moved from the reader by audit-hardening) | `resident` | build/light-kernel.map |
| `$B814-$B829` | 22 B | segment | `HUD_BOOSTER_BACKUP` — the boss entry's region read (its WARNING records gone with the text screen, feat/boss-banners), the Light kernel link's last segment (named for the S5-1 HUD booster backup, inlined into the entry's head by feat/interceptor-armour) | `resident` | build/light-kernel.map |
| `$B82A-$B8FA` | 209 B | segment | `LIFE_CAPSULE` — M6 stage 2 LIFE vectors, four PMG masks, state and hardware veneers; policy lives in DIRECTOR_C_LOW | `resident` | build/light-kernel.map |
| `$B8FB-$B8FF` | 5 B | unclaimed | **unclaimed — not measured** | — | — |
| `$B900-$BBFF` | 768 B | slot | the VOID LANCE run (M6, decision BD 6): the window's unclaimed tail from $BBFF down, read at every boss entry after slot E, the boss sector only; run `boss-lance` (6 sectors, 712-717); the build fails when the window's record reaches it | `overlay` | manifest `boss.lance`, scripts/lance-layout.mjs |
| `$B900-$BBEF` | 752 B | segment | `LANCE_CODE` — the VOID LANCE (M6): the tick (the meter, the readiness indicator - the ship green, its charge ramp - and its cue, the target under the ship, the reticle on P1 while a lance is ready - the crosshair over a target, the hollow mark over none - the charge's axis rule (journal §BL 4), the torpedo's flight - the hull on P1, the exhaust on P2, both homing - and its discharge on channel 3, the kill through boss_hit or the miss that keeps the lance, journal §BL 5) and its C policy (src/c/lance.c); read at every boss entry after slot E into the window's unclaimed tail from $BBFF down, the boss sector only | `overlay` | build/boss.map |
| `$BBF0-$BBF4` | 5 B | segment | `LANCE_BSS` — the VOID LANCE's C state (the meter, the charge, the gesture, the target bit), inside the run: read as zeros at every boss entry - the meter resets (the rest of its state: LANCE_ZP) | `overlay` | build/boss.map |
| `$BC00-$BC14` | 21 B | segment | `READER_BSS` — sector reader state | `resident` | build/sector-reader.map |
| `$BC15-$BC19` | 5 B | reserved | free tail of `READER_BSS_RAM` | `resident` | cfg/sector-reader.cfg |
| `$BC1A-$BC1F` | 6 B | guard | `HYBRID_C_WINDOW_GUARD` / `READER_GUARD`: reserved, no segment | `resident` | cfg/encounter-director.cfg, cfg/sector-reader.cfg |
| `$BC20-$BFFF` | 992 B | machine | OS screen when BASIC is off at coldstart (`RAMTOP $C0`); with BASIC on it sits at `$9C20-$9FFF` instead (MEASURED, *The window at `$A000-$BFFF`*) | `boot` `resident` | boot smoke snapshots |
| `$C000-$CFFF` | 4,096 B | machine | OS ROM | `boot` `resident` | 65XE |
| `$D000-$D0FF` | 256 B | machine | GTIA | `boot` `resident` | src/main.s `HPOSP0` |
| `$D100-$D1FF` | 256 B | machine | unused I/O page (parallel bus) | `boot` `resident` | 65XE |
| `$D200-$D2FF` | 256 B | machine | POKEY | `boot` `resident` | src/main.s `AUDF1` |
| `$D300-$D3FF` | 256 B | machine | PIA | `boot` `resident` | src/main.s `STICK0` |
| `$D400-$D4FF` | 256 B | machine | ANTIC | `boot` `resident` | src/main.s `DMACTL` |
| `$D500-$D7FF` | 768 B | machine | cartridge control and unused I/O | `boot` `resident` | 65XE |
| `$D800-$FFFF` | 10,240 B | machine | OS ROM (floating point at `$D800-$DFFF`, `SIOV` `$E459`, vectors) | `boot` `resident` | 65XE, src/main.s `SIOV` |
```
