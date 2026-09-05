# Current PAL runtime headroom

This is the current performance summary after the accepted PAL headroom
recovery pass, the completed Spread Shot rebuild, Shield Booster, the H3.1
frontend, and the data-only H4.2 C INDUSTRIAL gameplay art update. The local runtime includes
distinct HULL plates, the full BOOST HUD field, and the multi-position TOP
SCORES fix, plus fixed 2/5/7 difficulty-scaled player/debris damage.
The machine-readable source is
[runtime-wall-trace.json](runtime-wall-trace.json), generated from and bound to
the packed boot BIN, XEX, and ATR.

## Current result

| Measure | Current result | Current gate |
| --- | ---: | ---: |
| Initial boot block | 12,928 B / 101 sectors | Director configuration only; hard ceiling 101 sectors |
| Initial boot content | 12,889 B | final 39 B are GLUE staging `$5259-$527F` |
| Extension chunks | 6,528 B / 51 sectors | BROADSIDE, GLUE and DIRECTOR records |
| Total occupied transport | 19,456 B / 152 sectors | DFMC v1, no preallocated empty sectors |
| Free ATR transport | 72,704 B / 568 sectors | reported separately from residency |
| Remaining safe residency | 4,766 B fragmented | simultaneous residency is 17,421 B |
| XEX size | 20,292 B | artifact format result |
| ATR size | 92,176 B | standard 90 KB single-density image |
| PAL frame | 35,568 cycles | fixed PAL frame |
| Worst measured wall | 24,264 cycles | Director gate maximum 32,584 |
| Physical headroom | 11,304 cycles | Director gate minimum 2,984 |
| Spread delta from accepted 32,040 baseline | 32 cycles | preferred at most 200; hard 500 |
| Shield delta from accepted 32,072 baseline | -7,808 cycles | preferred at most 350; hard 496 |
| H3.1 delta from accepted 32,108 Shield checkpoint | -7,844 cycles | no gameplay hot-path cost |
| Missed synchronization | 0 | 0 |
| Deadline overruns | 0 | 0 |
| Additional VBI boundaries | 0 | 0 |

The 32,040/3,528 result remains the pre-Director comparison baseline. The exact
D.2 artifact measures 24,264/11,304 in the current replay set; its heaviest
frame executes `director_world_row_tick`. Separate trace counters observe
37,581 Director world rows, 36,460 requests, and 55 sparse-event paths.

The current linked runtime is exactly 16,735 B. GLUE and DIRECTOR raise
simultaneous residency to 17,421 B, leaving 4,766 B of the architectural safe
residency allowance. Raw residency, packed transport, staging and the six-byte
guard are accounted separately.

## Focused booster-compositor candidate evidence

The focused booster-compositor baseline was measured without the
full gauntlet and does not replace the accepted global report below. Its native
Atari800 focused sessions cover 8,400 PAL frames: a 1,800-frame complete
traversal, a 4,000-frame three-drop Rapid/Spread/Shield replay, and two
1,300-frame player-contact replays. The largest measured interval is 25,118
cycles, leaving 10,450 cycles in a 35,568-cycle PAL frame; the traversal maximum
is 24,088 cycles. All sessions report one draw and one 2x2/2x3 footprint per
active slot, exact reverse erase, zero capsule codes in saved backing, 192 total
A2 wraps (eight while a capsule is active), no missed PAL frame, and no returned
footprint after release. The player-overlap
synchronization adds twelve linked bytes: the current linked metric is 16,817 B,
simultaneous residency is 18,655 B, and safe residency is 3,532 B. Persistent
BSS and glyph allocation are unchanged.

PENDING retains its early fixed wait so the ACTIVE transition cannot miss a PAL
frame. While ACTIVE, the 50 Hz main loop begins immediately after ANTIC has
scanned the previous capsule bottom. This moving raster fence retains the old
footprint for the whole displayed pass and gives the unchanged final overlay
order the remainder of the PAL frame before the next pass reaches the new
position. It adds no simulation work: world rates, ring rotation, movement
cadence, and global scrolling retain their prior values.

## Focused tracked-muzzle candidate evidence

The host-only Atari800 7.1.2 observer measured 6,000 HARD PAL frames through
the deterministic capital-section fixture. It covered both fixed-divider to
ring transitions, logical rows 0-22 for allied and enemy muzzles, 137 ring
wraps, 75 warning frames, 12 launch-flash frames, and 134 flying BROADSIDE
frames. The trace found zero transient codes outside the two current legal
footprints and zero muzzle or BROADSIDE pointer mismatches. Six frames contain
a legal `$CD/$CE` shell overlay on the current muzzle cell rather than a muzzle
code; none create another footprint. The maximum wall interval is 24,781
cycles, leaving 10,787 cycles of the 35,568-cycle PAL frame, with no missed
frame. This focused candidate measurement does not replace the accepted global
report below.

## Focused provisional early-enemy evidence

Six cold-start Atari800 7.1.2 PAL/XL replays cover XEX and ATR on BEGINNER,
MEDIUM, and HARD for 1,500 active gameplay frames each. This is a provisional
development schedule, not final level balance. First Interceptor admission is
active frame 1 and first visibility is frame 2 in every replay. The measured
release-to-next-visibility maxima are 50/38/26 frames, within the policy limits
60/45/30. At least three qualifying Player Fighter-projectile kills occur by
frames 256/238/300. Their single natural pickup enters PENDING on that third
kill, ACTIVE at 447/381/331, and is collected at 527/455/400.

The capital request becomes due at active frame 600. Mutual exclusion with a
still-live ordinary enemy delays actual admission to 720/694/627 and first
visible hull pixels to 723/696/628; no ordinary admission occurs during the
active hull. XEX and ATR are replay-equivalent per difficulty. Maximum wall
intervals are 29,385/30,305/30,733 cycles, leaving at least 4,835 cycles of the
physical 35,568-cycle PAL frame and 1,835 cycles below the focused 32,568-cycle
gate. Missed frames, deadline overruns, extra VBI boundaries, DLI ordering
errors, backing contamination, orphan glyphs, and extra PMG scanlines are all
zero. These focused measurements do not regenerate or replace the accepted
global gauntlet evidence. Raw traces and their report are under
`build/runtime-wall-trace/early-enemy-*`.

The current change adds a 16-bit active-gameplay clock and a table-driven
single-slot admission wrapper without adding BSS, glyphs, or enemy slots.
Linked runtime is 17,287 B; simultaneous residency is 18,917 B and safe
residency is 3,270 B. Executed linked bytes bound the per-frame clock at 34 CPU
cycles including its `JSR` on the low-byte rollover path. The provisional
Director wrapper costs at most 269 CPU cycles including its `JSR` on a
successful phase-zero admission (143 on the measured phase-mask rejection) and
runs only when the sole slot's retry timer permits an admission attempt.

The owner-independent capital-shell/player collision module remains a 33-byte
inclusive final-raster swept-AABB routine, now at `$8EBE-$8EDE` after the
expanded admission code. The aggregate pickup/code/collision transport is
1,022 B in nine sectors; total transport is 163 sectors.

Focused native XEX MEDIUM and ATR HARD sessions cover both owners and true
top, middle, bottom, and one-scanline near-miss contacts. Their
current timings are recorded in `capital-player-collision-trace.json`; this
focused run deliberately does not replace the accepted global gauntlet below.

## Heaviest legal frame

The global maximum is HARD session `weapon-pickup-2-hunt-fire4`, frame 3,183.
It measures 24,264 cycles, includes actual Director world-row work, and retains
11,304 cycles of physical headroom. The host-only profile adds no guest
instructions or cycles.

| Exclusive subsystem group | Cycles |
| --- | ---: |
| Gameplay DLI service and VBI/synchronization; wait is outside the interval | 246 |
| World, ring playfield, hull, starfield and Director tick | 11,117 |
| Broadside update and render | 318 |
| Player Fighter projectile erase, update, weapon control, and render | 4,968 |
| Interceptor projectile erase, update, weapon control, and render | 806 |
| Enemy update and collision resolution | 2,781 |
| Entity/debris | 103 |
| Effects | 1,513 |
| Capsule/interactive controller | 187 |
| Music and sound | 311 |
| Remaining player, lifecycle, hull-contact, sector, and loop work | 1,914 |
| **Measured wall** | **24,264** |

Cross-cutting totals in the JSON record 4,907 mainline render cycles and 1,000
mainline erase/backing cycles. They overlap the exclusive subsystem groups and
must not be added to the wall total.

## Artifact and cold-start evidence

- Boot BIN: `8e963c78361f9cef41c4984d7380dd03715c53ff4684496a344da7598516efd3`.
- XEX: `7809cb6950464926aed069f29ccc671069cfd12a2fc7aad1ea5b1a7bca5400a5`.
- ATR: `55a3f11225f02c2c00499a88ffa00a7865034a6296ec8b362ba27a1f43d2d1ce`.
- XEX and ATR cold boots pass with `$A5` and `$5A` fills across
  `$8000-$9FFF`.
- XEX and ATR each run two 4,000-frame integrity sessions, for 8,000 frames
  (160 PAL seconds) per medium; the legal hunt maximum is 24,264 cycles for
  both media.
- Gameplay state parity is required between XEX and ATR. DLI order violations,
  missed synchronization, deadline overruns, and extra VBI boundaries are zero.

## Maximum legal pool coverage

| Pool | Physical capacity | Maximum evidenced state |
| --- | ---: | --- |
| Player Fighter projectiles | 10 | Rapid 10/10; Spread steady state 9/10 |
| Interceptor projectiles | 9 | exercised by lifecycle tests; legal replay contributes to a 13-projectile combined maximum |
| Combined fighter projectiles | 19 | 13 observed in the legal D.2 replay; forced-pool behavior is tested separately |
| Broadside projectiles | 3 | 1 observed through the natural first capital-section pass on every difficulty |
| Interactive entities | 4 physical / 2 active | active limit exercised |
| Transient effects | 6 physical / 5 active | 5/5 active envelope exercised |

The D.2 behavioral correction rolls back the two-unit reservation whenever
`schedule_broadside` discovers a full pool or the absence of an eligible muzzle.
Committed projectiles charge exactly two units and their normal lifecycle
releases exactly two. Natural OPEN-to-handoff now enters DRAIN, and final
COMPLETE remains terminal.

## Weapon-mode balance and isolated cost

The packed-XEX 500-frame held-FIRE trace executes the complete Player Fighter erase,
update/collision, control, render/backing path and the booster timer where
applicable. Counts include the established eight/ten-shot burst controller and
12-frame post-burst pause.

| Mode | Salvos / 500 frames | Salvos/s | Projectiles/s | Maximum active | Rejected Spread salvos | Peak isolated pipeline |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Normal | 122 | 12.2 | 12.2 | 8 | n/a | 3,441 cycles |
| Rapid Fire | 170 | 17.0 | 17.0 | 10 | n/a | 4,107 cycles |
| Spread Shot | 49 | 4.9 | 14.7 | 9 | 0 | 3,885 cycles |

Spread's legal maximum projectile lifetime is 28 updates. A nine-frame
candidate reaches the tenth slot with a centre-only transitional salvo; the
selected ten-frame cooldown is therefore the exact minimum that admits every
steady-state volley as three projectiles and keeps the tenth slot reserved.

## Evidence pipeline and method

## Focused full-height playfield checkpoint

The candidate-only lower-playfield replay extends the safe gameplay raster to
scanline 239 without running the full release gauntlet. A 420-frame native XEX
joystick replay reaches PMG Y=32 and Y=225, shows far stars and the capital
encounter throughout the recovered rows, and peaks at 24,569 wall cycles
(10,999 cycles PAL headroom). A separate 1,200-frame lower Hostile-contact replay
records a real hit with player PMG Y=199 and peaks at 24,734 cycles (10,834
headroom). The 1,800-frame native pickup traversal covers two complete Y=24 to
Y=238 passes and release at Y=240; its focused maximum is 29,216 cycles (6,352
headroom). All three traces have zero missed frames, deadline overruns, extra
VBI boundaries, and DLI-order violations.

This checkpoint changes linked executable bytes by +40 versus `d94702b2`:
main CODE -14 B, ENTITY_CODE +27 B, and PICKUP_CODE +27 B. RODATA and the
256-byte persistent entity/Director BSS are unchanged. The post-loader screen
workspace grows by 220 B: +200 B for five ring rows, +10 B for row pointers,
and +10 B for hull boundary backing. No glyphs are added.

Runtime evidence has four explicit phases:

1. `npm run build:candidate` creates current packed artifacts and marks the
   manifest `candidate-awaiting-trace`; an older trace is not accepted.
2. `npm run runtime:wall-trace` runs every required legal replay against those
   exact bytes and writes schema v2 with complete session counts and SHA-256
   bindings for boot BIN, XEX, and ATR.
3. `npm run build` performs final binding only when the complete trace matches
   all three artifacts and its gate passes.
4. `npm run verify` rejects candidate manifests, partial traces, stale hashes,
   report-hash drift, and failed gates.

There is no force/bypass mode. Timing is the exact Atari800 7.1.2 ANTIC
master-clock interval from the first instruction after `wait_frame` returns to
the first instruction of the next `wait_frame` call. Production DMA and DLI
behavior remain enabled; guest instrumentation adds zero instructions and zero
cycles.

The three short no-fire cadence sessions measure the exact 20/22.5/25
world-row rates during the Director intro, before debris admission is legal.
Complete debris lifecycle behavior remains covered by the extended combat and
component harnesses. `five_heaviest_frames` is sorted across all legal replays
and begins with the global maximum.

The DMA-off CPU comparison and additive estimate remain diagnostics only.
Physical timing acceptance uses the measured 24,264-cycle wall. The automated
behavior and PAL release gates now pass; physical smoke remains the next gate.

The measurement is exact for the stated Atari800 version, not an electrical
measurement of a physical Atari. Real-hardware validation remains required by
[hardware-testing.md](hardware-testing.md). Historical gates and the invalid
34,132-cycle checkpoint are archived under [history/](history/).
