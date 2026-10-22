# Boss breakup B revision — OWNER-SMOKE CANDIDATE

2026-10-23, branch `codex/boss-death-breakup`. Replaces the rejected
`e97244c` card/74-frame version. Owner selected approach 2: safe DLI,
NMIEN=$80, VBI off. No acceptance, §BQ record, merge or push yet.

[ATR paths, complete SHA-256 and launch commands](candidate.json),
[80 native trials](revision-native.json), [disk accounting](revision-disk.json),
[fight-byte comparison](fight-unchanged.json), [plan](../../plans/boss-death-breakup.md).
The earlier [preflight stop](revision-preflight.md) is historical and superseded
by the owner's explicit DLI choice. Its 565 free sectors described e97244c.

## What changed

Kill -> held spent boss/player/HUD with PF3 colour strobe -> 175 PAL ticks
(3.50 s) of destruction -> normal summary. No HULL BREACH card, text or blank
screen during the read. The real band/charset/LMS position remains visible.
The separator and lower-playfield palettes retain their normal fight paths;
intermediate boss-row palette changes give way to the death strobe.

The animation has 80 ticks of secondary explosions before launch, 80 ticks
of flight, then 15 ticks of finish. This is the first timing option proposed
to the owner while work continued. Wings move **one character every two
frames**, crown **one row every six frames**: exactly half e97244c's flight
speeds. The chain fires every eight ticks before/during flight, varies its position
and alternates blast phases, on nonempty material only; burning tiles travel with the pieces. Final flash is ticks
156–159, fragments clear at 160, handoff at 175. The top-header/crown clipping
is unchanged (one row earlier than the offline mockup).

C owns the cadence/phase decisions; ASM copies/publishes the band, applies
bounded secondary blasts and writes hardware. Read-time rumble was omitted
to preserve the byte budget; the breakup has its own bounded sound cue.

## Placement, including the 99-byte limit

```markdown
| Area | e97244c -> revised | Free / invariant |
| --- | --- | --- |
| Former card bytes in A | 47 data -> 46 code + 1 pad | same 47-byte slot |
| Existing C takeover block | 81 -> 81 B | unchanged fixed end |
| Net replacement within C | 52 -> 52 B | includes the HUD guard; see below |
| Engine $1000–$1DFF | 1607 -> 1948 useful B; 1664 -> 2048 disk B | 1636 / 3584 code B free |
| Bootstrap F $5200–$53FF | 157 useful / 512 disk B -> unchanged | 355 B |
| Wing buffer $1E00–$1FFF | 512 -> 512 B | same claim |
| E scratch $4C00–$4E3F | 576-B limit unchanged; 297 -> 301-B used span | high-water $4D2D; 275 B above it |
| Boss A / C / D / E during fight | 2038 / 2044 / 1788 / 527 B -> unchanged | 10 / 4 / 4 / 49 B |
| Boss install | 383 -> 383 B, byte-identical | 1 / 384 B |
| Initial content / remaining safe residency | 13569 / 1852 B -> unchanged | zero new resident bytes |
| Reserved window tail | $B8FB -> $B8FB | all 5 B remain reserved |
```

The new one-time C instructions total 55 B; a **redundant 3-B guard_reset
call is removed**, making the net card replacement 52 B and leaving the
entire original 81-B C block unchanged. The boss-entry guard_compare already
zeros its fold, and combat performs no disk access. Bootstrap and engine
checksum/fold checks remain mandatory; the focused corruption tests pass.
No start-block slack, DIRECTOR_RAM/C_LOW, lance run, page 4 or window-tail
allocation. No new resident segment or address reservation.

The new DLI entries/counter occupy only the former 47 B. They share the
existing A-only boss palette/ring code and resident HUD tail. Setup replaces
the old C/D publish call with the A strobe and disables intermediate row DLIs.
A one-byte motion-compare patch makes the two reads refer to the same address;
the NMI suspends the CPU's writer, so motion is never called even while the
old scratch bytes are being replaced. No DLI executes C, D, E or F; the native
observer checks execution addresses. Re-entering a boss reloads original A.

## HUD/SIO details

The reader's command gaps use WSYNC. A HUD NMI can therefore start on line
240 rather than 239. The safe HUD entry writes black immediately, then the
font, without another WSYNC. Preparing blank first scanlines in the gameplay
font as well as the HUD font prevents an already-fetched wrong-font line.
This guard skips live star glyph 1 and touches only first scanlines of the
released-shot/helper bank. The final tick restores those scanlines from the
existing resident charset source. Boss art, P0 graphics and HUD RAM are never
reconstructed or overwritten by this guard. The canonical star/fine-Y glyph
is preserved throughout. Full font copying was replaced with this bounded
partial restore to keep the last tick inside the frame budget.

```markdown
| Read DLI phase | Opcode-accounted CPU cycles | Notes |
| --- | ---: | --- |
| Boss top + strobe | 109 | counter advances once per PAL frame |
| Below-band / field restore | 94 | no motion call |
| Fast HUD | 57 | handles a line-240 arrival |
| Maximum observed NMI block | 382 wall clocks | includes hardware NMI, ROM dispatch, DMA, WSYNC, RTI |
```

The first three counts include shared A/resident continuations but exclude
hardware/ROM dispatch; they use the native emulator's opcode cost table plus
observed branch/page-cross costs. The block measurement includes those costs.
An existing reader WSYNC can add at most 114 clocks before NMI service; even
382+114 is below the reader's documented approximately 900-clock byte margin.
This is bounded analysis plus the emulator checks below, not hardware proof.

## Native PAL measurements

20 fresh cold-entry ATR runs per region, varied fine position
`(trial*7 + region*5) % 64`, spent-band/defeat RAM fixture after real entry.
Observer does not patch guest opcodes. Four additional authored-position
captures check the visuals. The table reports the maximum observed values;
it is not exhaustive certification of every kill/scroll combination.

Measured window: death_frame_begin -> death_publish_end; includes DMA,
interrupts, fence wait and publication, excludes idle wait for next start.
Limits: pre-fence **24300**, DMA-on target **31500**, hard **32568**, physical
PAL **35568**, actual fence margin **>=500**, entry **<=350 host frames**.

```markdown
| Region | Pre-fence peak | DMA-on peak | Min. fence | Strobe/read pause, host frames | Entry frames |
| --- | ---: | ---: | ---: | ---: | ---: |
| R1 Blockade Breaker | 14013 | 29101 | 10824 | 79 | 325 |
| Void Citadel | 14013 | 29000 | 10824 | 79 | 340 |
| Siege Spine | 21330 | 29101 | 3507 | 79 | 340 |
| Bastion | 14013 | 29101 | 10824 | 79 | 344 |
```

Read calls alone: R1/Citadel/Bastion **76.405–76.414**, Spine
**76.396–76.481** PAL frames. Setup/activation makes the complete strobe
interval **79 host frames, about 1.58 s**, then the 175-tick animation.
Standard-speed SIO2SD remains unmeasured; the prior 1.3–1.8 s hardware estimate
was for 17 sectors, while this revision reads 20. Hardware smoke must judge
the revised pause and sequence, not treat that earlier range as a measurement.

```markdown
| Region | Repeated reads | Accepted sector checksums | Failures | Retries | Timeouts |
| --- | ---: | ---: | ---: | ---: | ---: |
| R1 | 20 | 400 | 0 | 0 | 0 |
| Citadel | 20 | 400 | 0 | 0 | 0 |
| Spine | 20 | 400 | 0 | 0 | 0 |
| Bastion | 20 | 400 | 0 | 0 | 0 |
| Total | 80 | 1600 | 0 | 0 | 0 |
```

All runs reach the guarded engine and normal summary/menu/START GAME exit;
each has exactly 20 sector attempts, so no hidden retry. Baseline without
DLI: one original e97244c run per region, 17 attempts/17 sectors and zero
failures/retries/timeouts. Native checks also cover 14,000 animation frames,
154,000 breakup DLIs and 6,000 complete read-image frames: zero missed frames,
HUD/P0 changes, HUD-first-line stray pixels, separator changes or unsafe DLI
execution. Image comparison starts after released PMG objects have been
hidden; P0 bitmap/position/size/colour and HUD RAM are independently compared
against the pre-defeat snapshot.

Fight code remains byte-identical: resident gameplay, hot A/C and the complete
D/E/install payloads; only cold death/entry bytes differ. **No fight-stress
rerun** was needed. Prior R1 / Citadel L5 lost-target / Bastion results remain
7596 / 8447 / 8478 against 8500; they are not new measurements.
Candidate plus all four debug builds pass their gates. Six focused death
checks pass, including damaged-run rejection and pending COPY/flash cleanup.
No npm test, release wall-trace, showcase binding or failures:reconcile.
Existing stale release evidence still needs the full pre-release chain.

## Disk

```markdown
| 1040-sector campaign image | Before | Revised |
| --- | ---: | ---: |
| Placed sectors | 475 | 478 |
| Total unplaced sectors | 565 | 562 |
| Breakup runs | 17 | 20 |
| Breakup-only reservation | 32 | 32 |
| Unused breakup reservation | 15 | 12 |
```

Three added sectors / 384 B. Engine now occupies 724–739; bootstrap remains
720–723. The remaining twelve are **740–751 in the breakup area**, not the
whole disk. Unfilled level reservations and other holes are included in total
unplaced space. The accepted 1.0 disk assumptions still fit: charging M3 +3,
M3-H +1, M4 +2 and twelve 16-sector levels leaves **377** sectors unplaced.

## Reproduce and owner smoke

```sh
npm run build:candidate
node scripts/build.mjs --candidate --level=1:sector=6
node scripts/build.mjs --candidate --boss-region=2 --level=1:sector=6
node scripts/build.mjs --candidate --boss-region=3 --level=1:sector=6
node scripts/build.mjs --candidate --boss-region=4 --level=1:sector=6
node scripts/measure-boss-death.mjs --prepare --build=build/level-1-s6 --region=1 --sio-count=20
node scripts/measure-boss-death.mjs --build=build/boss-region-2-level-1-s6 --region=2 --sio-count=20
node scripts/measure-boss-death.mjs --build=build/boss-region-3-level-1-s6 --region=3 --sio-count=20
node scripts/measure-boss-death.mjs --build=build/boss-region-4-level-1-s6 --region=4 --sio-count=20
node scripts/measure-boss-death.mjs --restore
```

For the four authored-position captures, run each measurement without
`--sio-count`, redirecting stdout to `build/boss-death-rN-native.log`. The
`node scripts/boss-death-handoff.mjs` helper then packages immutable ATR copies
and proof JSON; its fight comparison uses the e97244c build copies/logs
retained before this revision under `build/boss-death-baseline/`.

Native stills: `build/play/boss-death-breakup/native/r1.jsonl-f100.png`
through `r4.jsonl-f100.png` show the read; `-f1/12/40/80/120/160.png` show
animation phases. Generated media is not committed. Exact ATR commands and
full SHA-256 are in candidate.json.

Owner checks: **kill -> strobing boss with correct HUD, no text/blank screen
-> slow 3.5 s destruction** feels continuous; secondary blasts and final flash
read clearly; HUD/ship stay clean; summary follows normally. Current normal
continuation remains summary -> menu -> START GAME; direct next-level
progression is deferred M4. **STOP for owner smoke.**
