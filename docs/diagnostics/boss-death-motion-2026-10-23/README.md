# Independent breakup motion — Spine preflight STOP

2026-10-23. **BLOCKED_CPU for the tested glyph-splice implementation.**
This does not establish that every implementation of pixel wobble is impossible.
Production game code and campaign ATR remain exactly `77c3104`. No new smoke
candidate, acceptance record, merge or push. The owner accepted that version's
read strobe, continuity, 175-tick duration and slower drift, then requested
independent random motion before merge.

## What was actually tested

Before integrating policy, a native Atari800 PAL probe adds a real NMOS 6502
pixel-row splice kernel to the existing Spine animation. It reads an immutable
copy of the real region font and writes recombined glyph scanlines. There are
34 distinct nonempty adjacent-row pairs in the spent-hull fixture at split 32:
14 crown, 10 left wing, 10 right wing. Six lines from the preceding glyph and
two from the current glyph implement +3 px around a three-pixel baseline.
All three pieces reach the maximum offset together. The kernel regenerates
all 34 glyphs every tick; the peak overlaps a normal one-cell-per-side copy.
A maximum rate of 0.75 cell/tick still has these one-cell copy ticks, so a
fractional-speed policy cannot remove that peak by itself.

This is a **component timing probe**, not the requested completed motion
engine or a visual candidate. Cache admission, scene-code conversion, random
speed/phase/period policy, crown horizontal drift and safe font publication
are not integrated. The rendered probe image is not evidence of visual
correctness. Those missing parts cannot be claimed as measured. The existing
secondary explosions, flash and 175 policy ticks remain in the probe.

The probe is deliberately tested first on Spine, as requested. It crosses
the stop threshold; no other boss or alternative kernel was then measured.
The build links and passes its build-time gates, but native death timing fails.

```markdown
| Spine / authored pose | Pre-fence peak | DMA-on window peak | Minimum fence |
| --- | ---: | ---: | ---: |
| 77c3104 baseline, same pose (historical measurement) | 20918 | 29098 | 3919 |
| Added pixel-splice kernel, measured | 31143 | 64669 | 0 |
| Required | <=24300 | <=31500 (hard 32568) | >=500 |
```

The 64,669-clock window includes waiting for the *next* fence after missing
this frame's fence; it is not a claim of 64,669 CPU instruction cycles.
Pre-fence elapsed time alone already exceeds its cap by 6,843 clocks.
The observer's `misses=80` counts late arrival and the subsequent host-frame
gap separately. DLI count 2365 versus 1925 for 175 ticks corresponds to 40
extra PAL frames, not 80 distinct skipped frames. HUD/P0 checks report zero
changes; DLI timing errors are 400 during those overrun frames. None of that
promotes this probe to a playable build.

## Bytes and disk

```markdown
| Area | 77c3104 -> probe | Free / status |
| --- | --- | --- |
| Engine $1000–$1DFF | 1948 -> 3258 useful B | 326 B of 3584 remain |
| Added probe code/calls | 0 -> 150 B | policy/admission not included |
| Added engine data | 0 -> 1160 B | 1024-B source font + 136-B pointer tables |
| Engine disk bytes | 2048 -> 3328 | +10 sectors |
| Bootstrap F | 512 -> 512 disk B | original execution code; count/fold rebuilt |
| Wing buffer | 512 -> 512 B | unchanged |
| Private E / resident / forbidden allocations | unchanged | no new allocation |
| Boss install | 383 -> 383 B | 1 B free; byte-identical |
```

```markdown
| Campaign disk | Unchanged production 77c3104 | Diagnostic probe only |
| --- | ---: | ---: |
| Breakup sectors | 20 | 30 |
| Remaining in 32-sector breakup reservation | 12 | 2 |
| Total free sectors in 1040-sector ATR | 562 | 552 |
```

The diagnostic reads more font/table sectors; it is not a new read-strobe
implementation and no repeated SIO certification was run. Production fight
and read paths are unchanged byte-for-byte. No fight-stress rerun, SIO repeat,
full npm test, wall-trace, showcase binding or failure reconciliation.

The game already has a seeded RNG: `entity_next_rng` at this build's $990E,
using `ENTITY_RNG_STATE` $8006 and polynomial $1D. It is outside the replaced
C/D/E/F ranges and forbidden Director/window areas. A future integrated
motion policy can call it through a disk-engine veneer, resolved from labels,
with no new resident code or state. Identical seeded gameplay/input remains
reproducible; different gameplay advances the state differently. POKEY RANDOM
is unnecessary. The probe itself has fixed maximum parameters and draws no RNG.

## Recovery choices — estimates, not measured promises

All choices keep the accepted read strobe, 80/80/15 timing, secondary blasts,
final flash and independent random horizontal rates in approximately the
0.25–0.75-cell/tick range. Crown keeps its upward direction with a small
independently drawn horizontal component. All need a new Spine-first check.

```markdown
| Option | Visible tradeoff | Additional engine bytes, estimate | CPU strategy / estimate | Risk |
| --- | --- | ---: | --- | --- |
| 1. All pieces, 2-pixel wobble steps on reserved no-copy ticks | Each piece changes between -1/+1 px; periods/phases quantized to the update slots | 1250–1600 B; +9–12 sectors | Reserve one horizontal-copy-free tick in four; update one piece there. Largest current batch is 14/34 glyphs, about 4200 added clocks rather than 10225; aim pre-fence <24300, DMA <31500 | tight code budget; source-font compaction and runtime cache admission still unproven |
| 2. Wobble only the wings | Crown flies upward without pixel wobble; wings retain independent phase/period | 1100–1450 B; +8–11 sectors | Alternate wings on no-copy ticks; 10/34 glyphs per update, about 3000 added clocks before optimisation | smaller shader batches, but still requires publication/cadence measurement |
| 3. Independent horizontal speeds only | Omit vertical wobble | 200–450 B; +1–3 sectors | No glyph regeneration; estimated +300–1000 clocks on copy ticks | least change to the renderer; explicit scope reduction |
```

Option 1 is the closest continuation to the requested look. Its byte ranges
include the intended compact font/cache and new policy, not another 1-KB font
on top of the probe. Added-clock estimates scale the measured component and
are not combined-frame guarantees. No forbidden RAM, larger wing buffer or
boss-install growth is proposed. STOP for owner selection before more work.

## Historical reproduction / evidence

The archived [probe source](probe-boss-death-wobble.mjs.txt) was removed from
active scripts after the owner rejected per-piece wobble. Historically,
`node scripts/probe-boss-death-wobble.mjs` built only the diagnostic Spine
variant, restores production source and the previous debug build in `finally`,
and retains `build/boss-death-motion-probe/`. It requires the current candidate
build and normal toolchain; it does not alter dist. Then:

```sh
node scripts/measure-boss-death.mjs --prepare --build=build/boss-death-motion-probe --region=3 --case=motion-probe
# Expected: Death gates failed, with the recorded timing failure.
node scripts/measure-boss-death.mjs --restore
```

[Raw native output](spine-probe.jsonl), [pair fixture and exclusions](probe.json),
[build result](build.txt). The full probe generator is retained here as a text snapshot; its old
relative imports require the original scripts/ location to reproduce. Generated ATR/media are not a smoke handoff.

The existing hash-suffixed Bastion smoke file was written by gameplay in sector
599 (record persistence); it is intentionally not overwritten here. Its pristine
debug-build source still has the recorded d0fe7e8400b1 SHA prefix. This task's
production campaign ATR and every tracked game byte remain unchanged.
