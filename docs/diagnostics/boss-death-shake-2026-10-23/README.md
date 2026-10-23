# Independent boss breakup speeds + compensated shake

**OWNER-SMOKE CANDIDATE**, 2026-10-23, `codex/boss-death-breakup`.
No §BQ acceptance, merge or push before owner OK. The owner accepted 77c3104's
strobe/continuity, 175 ticks and slower flight, rejected per-piece vertical
wobble (03fe9ee), and selected independent horizontal motion plus VSCROL shake.
[Pristine ATR paths, complete SHA-256, launches](candidate.json).

## Behaviour and placement

Each encounter draws a permutation of **.25/.5/.75 character cells/tick** for
left wing, right wing and crown. Wings therefore always have different speeds.
Crown keeps its upward row/6-tick cadence and draws its horizontal direction.
Wings move 0/1 cell on three ticks of each four; crown moves 1/2/3 cells on the
reserved fourth tick while visible. These are average horizontal speeds;
crown's horizontal movement is quantized to that fourth tick. Crown/wing copies
never coincide, preserving the old maximum six-row Spine copy bound.
No glyph regeneration, no per-piece vertical wobble. The two formerly unused
wing-buffer rows hold the crown, with its own front flag.

Entity RNG is the existing seeded `entity_next_rng`, state `$8006`, called
through an engine-only veneer. Its result is XORed with the frozen kill-frame
byte: different kill timing varies direct-start runs, identical seed/input
replays reproduce. Save the RNG byte in E before init; restore it before
summary. All native runs confirm restoration. No POKEY RANDOM, new resident
code/state or dependency on a replaced overlay.

Keep **175 ticks / 3.5 s**, 80 buildup / 80 flight / 15 finish, secondary
explosions and final flash. Shake uses random VSCROL 0..3 before tick 80,
0..2 until 111, 0..1 until 143, then zero, with a single 3-line hit at 156.
Finish restores exactly VSCROL=0 and the original unscrolled 90-byte A layout.
The existing read-time A-only DLI/strobe and VBI-off state are unchanged.

The private 92-B header/display list in E enables VSCROL only on boss slots
1..8, retaining HSCROL/LMS. The first below-band field row is the scroll-exit
buffer; a seven-scanline blank compensates its height. A star in this one
buffer row can be clipped during shake. All later rows, PMG player and HUD
stay fixed. Separator slot 0 stays outside VSCROL; its accepted crown/flash
content can still change. Its raster position and colours match the same
unshaken motion frame.

Top palette DLI has a direct vector: 11 CPU cycles to its WSYNC instead of 22
through the dispatcher; PF3 is the first write after WSYNC. This removes the
observed two-pixel old-colour landing in the separator when the crown enters
it. Other row DLIs retain their 4/12-cycle PF1/PF3 landing. Top is line 15,
separator split 23, moving boss splits 31-v..87-v, HUD restore 239. This code
is in the death engine only; the read DLI and fight are unaffected.

```markdown
| Area | 77c3104 -> candidate | Capacity / free |
| --- | --- | --- |
| Engine $1000–$1DFF | 1948 -> 2559 useful B | 3584 / 1025 B free |
| Engine disk bytes | 2048 -> 2560 B | +4 sectors |
| Bootstrap F $5200–$53FF | 157 useful / 512 disk B -> unchanged | 355 B free |
| Wing/crown buffer $1E00–$1FFF | 512 -> 512 B | unchanged claim |
| E scratch $4C00–$4E3F | used span 301 -> 480 B | 576-B limit; 96 B above high-water $4DE0 |
| Private list / zero row, included in E | +92 B at $4CA0 / +64 B at $4DA0 | no resident display-list growth |
| C policy state, included in E | 13 -> 23 B | inside its existing 64-B slot |
| Boss install | 383 -> 383 B, identical | 1 B free |
| Resident / window / forbidden homes | +0 B | window end remains $B8FB |
```

No start-block, DIRECTOR_RAM/C_LOW, lance-run or page-4 allocation. The
feasibility's 1000-B reserve covered the actual 611-B engine increase.

## Measured PAL gates and frame checks

Six speed permutations × two crown directions × two extreme last-weapon/band
poses = **24 maximum-envelope runs per boss**, each paired with the exact same
motion/input and VSCROL forced to zero. No guest opcode patching: fixtures set
only policy parameters after init and select the maximum legal shake envelope.
Four additional nominal RNG-driven captures also pass. Values below include
the nominal captures. Build gates pass for campaign and all four debug ATRs;
entry remains 325/340/340/344 frames, install remains 383 B.

```markdown
| Boss | Pre-fence peak / 24300 | DMA-on peak / 31500 | Min. fence / >=500 |
| --- | ---: | ---: | ---: |
| R1 Blockade Breaker | 14247 | 29535 | 10592 |
| Void Citadel | 14245 | 29537 | 10594 |
| Siege Spine | 22011 | 29534 | 2828 |
| Bastion | 14248 | 29537 | 10591 |
```

DMA-on hard limit remains 32568, physical PAL frame 35568. The measurement
window is death_frame_begin -> death_publish_end, including interrupts, DMA,
fence wait and publication. Pre-fence and fence are separately measured.

**4200 complete paired frames per boss, 16800 total**: exact full-byte pixel
comparison of screen rows 8..15 (separator, including legitimate crown/flash)
and 208..239 (player/HUD strip), 258048000 bytes compared. Zero differences.
All 175 frames per run have fixed expected DLI boundaries, no missed frames,
no HUD/P0 RAM/register damage, and the normal summary/menu/START GAME exit.
VSCROL zero, unscrolled A opcodes and saved RNG restoration all pass. These
are emulator measurements, not the outstanding SIO2SD/hardware smoke.
[Raw case records and comparison counts](native.json).

Seven focused death checks plus three generated-map checks pass. No npm test,
release wall-trace, showcase binding or failures:reconcile. Stale release
binding/stage-2 evidence still owes the full pre-release regeneration chain.

[Fight/read byte comparison](fight-read-parity.json): resident runtime,
entity/pickup/starfield/A2, complete boss C/D/E/install and sector-reader are
identical to 77c3104. Boss A differs only at its generated cold bootstrap-fold
operands 613/615. Bootstrap differs only at generated engine sector-count/fold
operands 125/143/145. No fight-stress rerun or separate SIO certification was
needed; the measurement runs themselves complete their guarded reads normally.
This is not a claim that the generated length/checksum bytes are identical.

## Disk and handoff

```markdown
| 1040-sector campaign ATR | 77c3104 | Candidate |
| --- | ---: | ---: |
| Placed sectors | 478 | 482 |
| Total free sectors | 562 | 558 |
| Breakup sectors | 20 | 24 |
| Unused in 32-sector breakup reservation | 12 | 8 |
```

Bootstrap 720..723, engine 724..743; eight remain 744..751. The extra four
sectors extend the otherwise unchanged strobe/read interval to 94..95 host
frames, about **1.9 s** (previously 79 / about 1.6 s). Actual read calls are
about 91.6 PAL frames. The hardware pause remains unmeasured. All 1.0 disk
assumptions previously accepted still fit (373 sectors after the same M3,
M3-H, M4 and twelve capped-level allowance).

Hashes describe pristine files before play. Gameplay's record persistence can
change sector 599 of a played ATR. The old owner-smoked Bastion file has been
left untouched. New packaged names are distinct from that earlier candidate.

Owner checks: pieces fly apart at visibly different speeds; hard shake during
buildup calms down during flight; HUD and player remain steady/clean; secondary
blasts/final flash and normal summary remain intact. Current continuation is
summary -> menu -> START GAME; direct next-level progression is deferred M4.
**STOP for owner OK.**

## Reproduction

Build candidate and the four sector-6 variants using the commands in the
candidate's predecessor report, or the current package.json build entry points.
Then:

```sh
node scripts/measure-boss-death.mjs --prepare --build=build/boss-region-3-level-1-s6 --region=3
node scripts/measure-boss-death-shake.mjs
# Optional nominal captures, N=1..4 with the corresponding --build path:
node scripts/measure-boss-death.mjs --build=build/level-1-s6 --region=1 --output-dir=build/play/boss-death-breakup/shake-native
node scripts/measure-boss-death.mjs --restore
node scripts/boss-death-shake-handoff.mjs
```

The packaging helper uses the saved 77c3104 builds under
`build/boss-death-shake-baseline/` for exact parity. Editable source/scripts
and compact proof are tracked; ATRs, captures and paired pixel strips remain
under build/play/boss-death-breakup/. See also [resources](resources.json),
[disk accounting](disk.json), and [as-built plan](../../plans/boss-death-breakup.md).
