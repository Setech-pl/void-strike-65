# Boss death breakup B — rejected candidate, 2026-10-22

**Owner smoke of `e97244c`: NOT OK.** Historical measurements below belong to
the rejected 74-frame/card version. See [revision prerequisite](revision-preflight.md);
no revised candidate exists yet.

Branch `codex/boss-death-breakup`, baseline `686d3f5`. This is a focused
candidate check, not owner acceptance or release certification. The owner
selected B (two-row crown + two wings) from Phase A. Journal §BQ remains
reserved until the owner writes OK.

[Candidate ATR paths, full SHA-256 and launch commands](candidate.json),
[native observations](native.json), [resource comparison](resources.json),
[two additional fight probes](fight-stress.json),
[plan and pre-code answers](../../plans/boss-death-breakup.md).

## Disk and phase-exclusive RAM

All new code/data is read **after defeat**. Combat is stopped; no boss AI,
lasers, shots, torpedo, escorts, pickups, collisions or input ticks run in the
private 74-frame animation. The existing ship and HUD hold their final state.
C owns animation policy; ASM owns publication, copies, DLI, PMG and audio.
The brief bounded noise cue obeys SOUND OFF; normal music resumes for summary.

```markdown
| Area | Before | Candidate | Free / impact |
| --- | --- | --- | --- |
| New disk runs | 0 B | 2,176 B / 17 sectors | sectors 720–736; 15 reserved sectors remain |
| Bootstrap, dead F $5200–$53FF | region/look tail during fight | 157 useful B, 512 B on disk | 355 B; released after jump |
| Engine, dead C/scratch/D $1000–$1DFF | combat overlays | 1,607 useful B, 1,664 B on disk | 1,977 of 3,584 B code capacity |
| Wing buffer $1E00–$1FFF | dead D/banner claim | 512 B | 0 B; separate from displayed buffer |
| Private scratch, dead E $4C00–$4E3F | combat helper overlay | high-water $4D29 (297-B span) | 279 B above high-water |
| Boss A / C | 2,038 / 2,044 B | unchanged | 10 / 4 B |
| Boss D / E during fight | 1,788 / 527 B | unchanged | 4 / 49 B |
| Boss install | 383 B / 3 sectors | unchanged | 1 of 384 B |
| Initial content / remaining safe residency | 13,569 / 1,852 B | unchanged | 0 new resident B |
| Window end | $B8FB | unchanged | 5 B still reserved for window levers |
| ATR geometry / file bytes | 720 sectors / 92,176 B | standard 1,040 sectors / 133,136 B | existing sector locations retained |
```

No allocation in the start block, DIRECTOR_RAM, DIRECTOR_C_LOW, lance run,
page 4 or the reserved five window bytes. Screen-memory writes reuse the
existing band. The old cold ending is replaced inside the same A/C loads;
fixed C table/state addresses preserve fight page-crossing costs. Pending
module COPY draws finish before F is overwritten; temporary module flashes
and shot/ring backings are restored before their helpers are replaced.
Both new disk runs are guarded; corrupt bootstrap/engine fixtures reject.
The standard 1,040-sector ATR uses the existing 128-byte-sector reader and
requires no enhanced SIO protocol. Real SIO2SD playback is still owner smoke.

## Measured native PAL result

Twelve checks: authored entry position plus `p=0`/left final weapon and
`p=63`/right final weapon, in each region. The observer boots each direct-start
ATR through the real loader and boss entry, then seeds a spent-band/defeat
fixture. It changes RAM state, never guest opcodes. These are observed peaks
across those fixtures, not exhaustive certification of every fine-scroll
phase. The separate focused CPU tests exercise the last-weapon bonus/clock
and pending cleanup paths.

The loop begins around scanline 22. Its conservative pre-fence ceiling is
**24,300** clocks (tightened from the plan's illustrative line-20 value
24,580). The actual measured margin to line 240 must also be **>=500**.
The DMA-on measured window (`death_frame_begin` -> `death_publish_end`)
includes DMA, interrupts, waiting to the fence and publication. It excludes
the idle wait for the next frame start, like the main-loop work gate. The target is **31,500**, hard gate **32,568**, physical PAL
frame **35,568**; the fight's **8,500** proxy is not a death-sequence limit.

```markdown
| Region | Pre-fence peak / 24,300 | DMA-on peak / 31,500 | Minimum fence / >=500 | Card pause, frames | Boss entry / <=350 |
| --- | ---: | ---: | ---: | ---: | ---: |
| R1 Blockade Breaker | 13,455 | 28,547 | 11,383 | 66 | 325 |
| R2 Void Citadel | 13,468 | 28,547 | 11,369 | 66 | 340 |
| R3 Siege Spine | 20,832 | 28,547 | 4,005 | 67 | 340 |
| R4 Bastion | 13,516 | 28,547 | 11,321 | 66 | 344 |
```

The two reads total **64.067 PAL frames**; card setup, cleanup and activation
make the complete visible pause **66–67 frames (1.32–1.34 s)** before the
animation. The card shows **HULL BREACH**, bottom HUD and P0 ship throughout;
released objects are hidden. The fight image returns when the engine starts.
Standard-speed SIO2SD at 19,040 baud is an **ESTIMATE of 1.3–1.8 s**, allowing
command/sector gaps; hardware timing is not measured. The animation itself
is **74 frames / 1.48 s** on all four bosses.

Across the twelve checks: **888 animation frames**, **9,768 DLIs**, zero
missed frames, DLI-row-order errors, HUD-byte changes or P0
bitmap/position/size/colour changes. Native PNGs under
`build/play/boss-death-breakup/native/` include `r1.jsonl-f100.png` through
`r4.jsonl-f100.png` (loading card) and `-f1/12/18/26/40.png` (animation).
The observer also checks the HUD/ship pixels and P0/HUD state in 756 complete
loading-card frames: zero changes or visibility failures.
They are generated review media, not committed. Visual inspection covered
all four regions and the HUD's first scanline.

## Fight regression probes

Compared with the accepted §BP/§BO results; same harness proxy and fixtures.
No death-engine tick is called while fighting. Full four-region fight
certification was not repeated.

```markdown
| Probe | Before | Candidate | Limit | Delta |
| --- | ---: | ---: | ---: | ---: |
| R1 stress maximum | 7,596 | 7,596 | 8,500 | 0 |
| Citadel L5 lance lost-target | 8,447 | 8,447 | 8,500 | 0 |
| Bastion L10 worst swap | 8,478 | 8,478 | 8,500 | 0 |
```

Candidate build and all four sector-6 debug builds pass the computed gates.
Focused death, placement, cfg overlap and generated-map tests: **17 PASS**.
R1 boss stress tests: **12 PASS**. Additional Citadel/Bastion probes:
**9,856 / 856 cases**. Logs are `build/boss-death-{build,focused,r1-stress,other-stress}.log`.
The cheap runtime-evidence binding check reports the already known stale
release evidence (one PASS, one binding failure); no full `npm test`, release
wall trace, showcase binding or failure reconciliation was requested/run.
The extra launch-policy check passes its source/launch clauses; its saved
stage-2 evidence clause also remains stale: `atr-a5 stage-2 SIOV reads`,
106 != 109. Both baseline `686d3f5` and this candidate have 109 extension
sectors; the old trace has 106. The combined machine/SIO checks are 9 PASS,
1 pre-existing evidence failure (`build/boss-death-launch-tests.log`).
The release regeneration remains due under §BM.

## Reproduce and smoke

```sh
npm run build:candidate
node scripts/build.mjs --candidate --level=1:sector=6
node scripts/build.mjs --candidate --boss-region=2 --level=1:sector=6
node scripts/build.mjs --candidate --boss-region=3 --level=1:sector=6
node scripts/build.mjs --candidate --boss-region=4 --level=1:sector=6
node --test tests/boss-death.test.mjs tests/boss-claim.test.mjs tests/cfg-overlaps.test.mjs tests/memory-map-generated.test.mjs
node scripts/measure-boss-death.mjs --prepare --build=build/level-1-s6 --region=1
node scripts/measure-boss-death.mjs --build=build/boss-region-2-level-1-s6 --region=2
node scripts/measure-boss-death.mjs --build=build/boss-region-3-level-1-s6 --region=3
node scripts/measure-boss-death.mjs --build=build/boss-region-4-level-1-s6 --region=4
# Repeat each with --case=left --position=0 and --case=right --position=63.
node scripts/measure-boss-death.mjs --restore
```

The prepare/restore actions forcibly recompile the observer's CPU object,
so changing headers cannot silently reuse the other observer. The usual
wall-trace observer is restored after this check.

Owner checks: compare B with the Phase A GIF on all four bosses; check the
crown/wing split, flash and sparks, HUD and ship stability, loading-card pause,
then summary and normal continuation. The real display preserves the top
blank header: the crown clips at the playfield's upper edge one character row
earlier than the offline canvas. There is no scaling/rotation or new PMG
multiplexing. The existing normal continuation is **summary -> menu -> START
GAME**; the native checks exercise it in every fixture. Automatic next-level
progression is the existing deferred M4 work and is not introduced here.

**STOP for owner smoke. No acceptance, merge or push yet.**
