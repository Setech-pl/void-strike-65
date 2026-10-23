# Breakup revision — stopped at the owner's VBI prerequisite

2026-10-22. Branch `codex/boss-death-breakup`, inspected game HEAD `e97244c`.
The owner rejected that smoke: the HULL BREACH card interrupts the reward and
74 frames is too short. Requested replacement: frozen fight image with a
colour-only death-throes strobe during reads, then approximately 175 frames
of B with slower motion, secondary blasts and final flash. No merge.

## Confirmed stop condition

**VBI does not run during the current post-fight read.** This is established
from executable source, not inferred from an emulator screenshot:

- `src/hybrid/boss.s`, `boss_death_read`, explicitly stores zero to NMIEN
  immediately before preparing the card and calling `boss_read_run`.
- `src/hybrid/sector-reader.s` lines 5–7 specifies direct, polled SIO with
  NMIEN zero. Neither the bootstrap nor the engine read enables VBI.
- Normal gameplay also enables DLI only (`NMIEN=$80`, `src/main.s` lines
  2729–2730). Leaving that value enabled would not enable VBI.
- `sector_reader_wait_serial` detects PAL edges by polling VCOUNT; its
  `sector_reader_frame_tick` is a subroutine, **not VBI**. The loader documents
  a roughly 900-cycle serial-byte service margin and an existing bounded
  336-cycle music tick. Those figures are existing source documentation,
  not new measurements.

The owner explicitly instructed STOP if VBI is disabled/blocked. No game,
loader, cfg, build script or candidate artifact was changed, and no new
build/timing/stress run was made. The 175-frame revision remains unimplemented.
This is a prerequisite stop, not a claim that an interrupt-safe strobe is
impossible.

## Available homes and alternatives

The card frees exactly **99 B**: 11 B text + 36 B display-list data in A,
plus 52 B card-only preparation instructions in C. Guard reset, music/PMG
cleanup, queued draw drain, disk specs and guards must remain. This is not
99 B of new resident capacity, nor one contiguous block: **47 B in A survive
both reads; the 52 B in C can hold setup only**, because the engine load
replaces C. Any interrupt/callback body live across both reads must fit in
surviving A code, with setup using the freed C space. Install stays 383/384 B.
The engine still has 1,977 B of its 3,584-B code budget free; buffer and E
scratch limits are unchanged. No prohibited reservation is available.

The following are **planning estimates, not linked sizes or measured
interrupt-safe solutions**. Preserving a frozen frame also needs live
charset/row palette/HUD handling while old C/D are overwritten: the old boss
DLI calls `laser_publish` in D, so simply leaving it enabled is unsafe.
Any replacement must disconnect those dependencies before the reads.

```markdown
| Alternative | Visible result / execution | Estimated new replacement control code | Estimated added work | Limitation |
| --- | --- | ---: | ---: | --- |
| Private VBI + safe boss/HUD DLIs | Requested 50 Hz strobe over the held fight | ~80–128 B, compared with 99 B reclaimed | ~160–320 cycles/VBI, plus retained row DLIs | New interrupt contract; upper estimate exceeds reclaimed bytes by 29 B; must prove placement and serial service latency first, no resident growth authorized |
| DLI-only strobe | 50 Hz boss-palette modulation at the top of each frame; lower playfield/HUD colours restored by DLIs | ~48–96 B within the same 99-B allowance | ~80–200 added cycles/frame, plus retained row DLIs | Meets continuous visual effect but changes requested VBI source; C/D call dependencies must be removed |
| Existing polled PAL-edge clock | 50 Hz strobe driven by reader VCOUNT wrap callback | ~64–96 B for an overlay shim plus hook/restore | ~100–220 added cycles/frame, plus retained row DLIs | No VBI; may temporarily redirect existing resident call operands, requiring reader-path proof and the owner's resident-code stress condition |
```

All options target zero additional resident/window allocation. Their actual
complete code and its A/C split must fit before integration; the table is not permission to
spill into any reserved area. No OS VBI is enabled blindly: its full dispatch,
register preservation and serial/audio effects have not been proven here.

## Disk clarification and 1.0 comparison — unchanged e97244c artifact

Counted the union of boot transport, the one level, capital restore, summary
code/art, identity/save record and every boss run in the committed campaign
manifest. Sector contents being zero does not make a placed sector free.
This is static allocation accounting, not a new build or runtime measurement.

```markdown
| Current 1040-sector campaign image | Sectors |
| --- | ---: |
| Placed sectors | 475 |
| Total unplaced sectors | 565 |
| New death runs, 720–736 | 17 |
| Death-only reservation, 720–751 | 32 |
| Unused portion of that one reservation, 737–751 | 15 |
| Free tail outside that reservation, 752–1040 | 289 |
| Unused level reservation, 333–511 | 179 |
```

The previous report's **15 sectors** meant the remaining part of the
**death-run reservation only**, never the whole disk. The 565 includes
unfilled reserved level slots and other reservation holes; it is not all
freely relocatable space. The old transport manifest's `remainingAtrSectors`
is transport-only and must not be used as whole-disk free space.

Use the 2026-10-18 disk amendment in `docs/plans/budget-1.0.md`, not its
superseded original “400 sectors from 320” row. Levels are reserved at
320–511 (12 × 16). Historical future transport estimates are M3 +3 sectors,
M3-H +1 sector, M4 +2 sectors. Charging all six again here is conservative
for disk arithmetic; this is not an assertion that none of their work has
already landed. Their other RAM/CPU constraints are not certified here.

```markdown
| Projection from the unchanged 565 free | Additional sectors charged | Free left |
| --- | ---: | ---: |
| M3 + M3-H + M4 historical transport allowances | 3 + 1 + 2 = 6 | 559 |
| Also 12 levels at 13 sectors each (11 more × 13) | 143 | 416 |
| Instead 12 levels at the 16-sector cap (192 minus current 13) | 179 | 380 |
| Same capped projection, also fill all 15 unused death sectors | 15 | 365 |
```

**Those 1.0 disk allowances still fit** the 1040-sector image. The original
720-sector geometry cannot hold the existing death run through sector 736
without relocation. New secondary-blast code has not been assembled, so its
actual extra-sector count and the final revised image's free total remain
unknown. Up to 15 more death sectors fit the current death reservation;
using them would reduce whole-disk free space from 565 to 550 before any
other changes.

**NEXT: owner selects the interrupt/clock approach after this required stop.
Then remove the card, implement ~175-frame B, build and perform only the
requested measurements. No accepted §BQ record, merge or push.**
