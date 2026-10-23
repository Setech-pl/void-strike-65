# Boss death breakup — Phase A and B

**Phase A historical review, 2026-10-22.** Branch `codex/boss-death-breakup`,
from clean `main` `686d3f5`. Offline mockups only; no game code, build,
runtime measurements or new ATR. The owner subsequently selected B; the candidate implementation is recorded below.
The accepted game, resident allocation and window allocation are unchanged.

## Rendering facts used

Read AGENTS.md (including §BM), current STATUS, `boss-concepts.md`,
`s5-boss-regions.md`, `boss-art.md`, `boss-polish.md`, `boss-order-scale.md`
and the current converter/controller/renderer. The concept page's historical
“not implemented” disclaimer and old region numbers do not override current
code: `order.json` is `[1,4,3,2]`: Breaker, Citadel, Spine, Bastion.

`src/hybrid/boss.s` (`boss_install`, `boss_apply_pos`, `boss_motion`,
`boss_pal_dli`) displays ANTIC 4 rows, 64 codes per stored row, with LMS on
each row and HSCROL enabled. Rows 0–5 occupy `$A880`, rows 6–7 `$AC80`;
the tables start at `$AD00`. Only occupied rows are shown: **5/5/8/5** in
campaign order. One cell is 8 screen pixels wide × 8 scanlines; its four
multicolour pixels are twice as wide as tall. The horizontal position obeys
`LMS*4 - HSCROL = p`, not two independent scroll registers for two halves.
COLPF1/COLPF3 change at row boundaries. Void Citadel is stationary in combat;
the others drift. Mockups freeze each boss at its authored starting position.

Today `boss.c` enters CHAIN on the last weapon's destruction, fills module
rectangles with blast glyphs, then HOLD and handoff. The proposed animation
replaces that ending after combat cleanup. It must use the actual surviving
screen cells, never reconstruct intact weapons. These storyboards use one
consistent reachable fixture: all modules gone, with the final weapon broken
until tick 20; nozzles go dark on defeat. The Spine's field has already
collapsed with its generators. Intact hull cells remain.

## Three choices

All numbers below are **ESTIMATES**, not measurements or PAL certification.
Bytes include shared C policy, ASM publication, PMG masks and four small boss
descriptors; they exclude existing glyphs and runtime scratch. Cycles are
conservative peak **death-engine CPU cycles/frame**, including its DLI work;
they exclude unchanged music/VBI, ANTIC DMA and frame waiting.

| Variant | Look and motion | Disk run | Peak CPU/frame | Defeat to end / whole GIF |
| --- | --- | ---: | ---: | ---: |
| **A — clean split** | Two pieces at column 32; both move one character outward each frame. Two-tick flash, brief common band shake; no extra PMG. | 896–1,152 B, 7–9 sectors | ~12,000 | 1.24 s / 1.64 s |
| **B — crown launch** | Top two complete rows fly up one row every 3 frames; lower rows split at the final weapon's centre. Wings move one character/frame. P1/P2 edge fragments + two missile sparks. | 1,280–1,536 B, 10–12 sectors | ~14,000 | 1.48 s / 1.88 s |
| **C — staggered tear** | Central 12-column × 3-row cap launches up one row every 4 frames, after 8 flight ticks. Off-centre split at the final weapon; right wing starts 4 frames later. P1/P2 + four missile sparks. | 1,536–1,792 B, 12–14 sectors | ~21,000 | 1.80 s / 2.20 s |

The GIFs include 0.40 s before defeat and a quiet tail. All animation advances
in 20 ms PAL ticks; identical holds are merged by the existing GIF encoder
without changing their duration. Stills use nearest-neighbour ×2 (640×480).
The background stars and lower guide are schematic; the boss cells, damage
looks, blast glyphs and PAL colours come from the current real assets.

**Recommendation: B.** It gives the requested third piece without C's extra
composition work. A is a cheaper two-piece comparison and omits the upward
piece. B separates the cap vertically, so its source-row palettes can follow
it. C's cap crosses rows occupied by the wings: the mockup intentionally
switches the entire boss to one death palette at launch. Preserving separate
horizontal palettes there would require a different raster design.

## Hardware method and limits for Phase B

Use one data-driven engine: shown row count, existing row addresses and
palettes, split column (clamped to the visible span), cap rectangle, cadence
and effects amount. C owns phase/cadence decisions; ASM performs bounded
copies, display-list publication and PMG writes. No combat AI runs alongside
it. Reuse existing boss exit/vector sites; add no resident or window storage.

For A/B, shift left spans in ascending order and right spans in descending
order, clear the newly exposed seam and discard codes at each outer edge.
Keep common HSCROL fixed except during the short shake. For B, preserve the
cap rows and change their LMS placement; replace vacated rows with blank
rows. The two positions above the band (divider/top blank) become death-only
ANTIC 4 rows, so the cap clips at the top of the visible area. Rebuild the
death display list and palette schedule after the previous frame has passed;
retain the bottom HUD and restore the summary's display on handoff.
For C, compose disjoint spans from a saved source into a blank working band.
No bitmap scaling, rotation, sub-character sideways motion or alpha blending.

Budget basis: at most 512 source cells, about 16 cycles per copied cell plus
row setup; C additionally clears up to 640 working cells (~5,120 cycles with
grouped stores). Allow ~1,000–2,000 cycles for bounded PMG/phase work and
~2,000 for palette/list/DLI work, then round upward. No full PMG-page clear
each frame: erase previous short spans and publish two 8-bit strips and up to
four fixed-X missile trails. No multiplexing. Setup copies should be spread
over the lead-in if necessary. These estimates do **not** prove a complete
frame is below the 31,500 target or 32,568 hard gate; C has the largest risk.

**Disk-only residency proposal:** after quiescing combat, read the selected
shared engine over dead C/D/scratch storage in the existing `$1000–$1FFF`
boss claim. Maximum proposal: code/data 1,792 B + source 512 + working band
640 + list 128 + palettes 80 + state 64 = **3,216/4,096 B**, reusing the
claim; **0 new resident bytes, 0 new window bytes**. Preserve `$0C00` charset,
band/tables and existing PMG pages. This is a placement estimate, not a new
reservation. Disable the old DLI before overwriting its slot-D palette code;
the death engine installs its own DLI. Restore/reload fight overlays only at
the normal next entry; summary/START GAME keep their existing restore duties.

**Visible limitation omitted from GIFs:** a post-fight disk read is required
before this overlay can run. At an assumed ~4 PAL host frames/sector the
run alone adds roughly **0.56–0.72 / 0.80–0.96 / 0.96–1.12 s** (A/B/C),
plus takeover; slower drives can take longer. This is an estimate, not a new
measurement. The current polled reader owns POKEY and requires silent audio:
an uninterrupted score/explosion soundtrack during the read is not promised.
A held defeat image or short black transition and a fresh explosion cue on
return must be designed in Phase B. Streaming while combat continues is not
assumed. Glyph/row steps and the limited PMG count are hardware-compatible
methods; flicker-free takeover, palette landing, disk guards, complete frame
cost and the exact load/exit integration remain unverified on real hardware.

## Rebuild and review

```sh
node scripts/boss-death-breakup.mjs --regions=1,2,3,4
```

Outputs are under `build/play/boss-death-breakup/` (generated, uncommitted):

* `index.html`: all looping comparisons and links to ×2 key stills.
* `comparison-x2.png`: rows in campaign order, columns A/B/C, flight tick 4.
* `r1-blockade-breaker-{a-clean-split,b-crown-launch,c-staggered-tear}.gif`
* `r2-void-citadel-{a-clean-split,b-crown-launch,c-staggered-tear}.gif`
* `r3-siege-spine-{a-clean-split,b-crown-launch,c-staggered-tear}.gif`
* `r4-bastion-{a-clean-split,b-crown-launch,c-staggered-tear}.gif`
* Matching `*-f019-x2.png` (last weapon), `*-f033/035/039-x2.png`
  (A/B/C flight tick 4), `*-f041/043/047-x2.png` (flight tick 12).
* `manifest.json`: every exact filename, frame, split, final weapon and estimate.

Validation is offline rendering and GIF timing/PNG inspection only. No game
tests, build or runtime-evidence regeneration applies to this mockup-only
change (§BM); no implementation or acceptance claim. **NEXT TASK: owner
chooses A/B/C or requests a visual adjustment. STOP before Phase B.**

## Phase B — pre-code answers (owner pick B, 2026-10-22)

Step 0 PASS: clean `codex/boss-death-breakup` at `9500224`, containing
`686d3f5`, also the local `origin/main` tip. No rebase. Stale Current task
debt corrected in `458423e`. Journal **§BQ** is reserved for the acceptance
record after the owner writes OK; this is authorization, not smoke acceptance.

1. **Budget.** The 8,500-cycle proxy continues to apply to the fight only.
   Breakup takes exclusive control after defeat: boss/controller/region fire,
   lasers, escorts, hostile/player shots, torpedo, pickups, input and collision
   updates stop. The ship and HUD hold their final state. The private animation
   loop retains display/PMG publication and a bounded audio cue, not a second
   normal gameplay tick. Gates remain DMA-on target **31,500**, hard **32,568**,
   physical PAL **35,568**, no frame skips, and fence margin **>=500**.
   For a line-20 start, the line-240 fence allows `(240-20)*114-500 = 24,580`
   clocks of pre-fence wall work, including DMA/interrupts. Use the actual
   start clock for measurement, never 8,500 or 35,568 as the death budget.
   Best conservative ESTIMATE, to be replaced by measured results:

   | Region | Engine CPU peak | Pre-fence DMA-on work | Fence margin | Whole DMA-on iteration |
   | --- | ---: | ---: | ---: | ---: |
   | R1 Breaker, 5 rows | <=14,000 | <=22,000 | >=3,080 | <=28,500 |
   | R2 Citadel, 5 rows | <=14,000 | <=22,000 | >=3,080 | <=28,500 |
   | R3 Spine, 8 rows | <=16,000 | <=24,000 | >=1,080 | <=30,500 |
   | R4 Bastion, 5 rows | <=14,000 | <=22,000 | >=3,080 | <=28,500 |

   These include worst-row palette/DLI and fixed PMG work; no combat allowance
   is borrowed. Render into an offscreen wing buffer, then publish the next
   list/LMS after the fence: no writes racing visible boss rows.

2. **Placement.** Post-defeat disk reads, not extra boss-entry reads. Replace
   the old chain/hold implementation with takeover; keep its fight path and
   existing 15-sector C run. A small disk bootstrap goes into dead region slot
   F `$5200-$53FF` (512 B). It loads the shared engine into dead C/scratch/D
   `$1000-$1FFF` (4,096 B reclaimed after combat, **not** their 4/6/4-B fight
   tails). Reserve up to **3,584 B** code/data there, leaving **512 B** for the
   second wing buffer. Reuse the original band as the other buffer and retain
   its first two rows as the crown. Dead E `$4C00-$4E3F` supplies **576 B** for
   the private list, source-row colours and state. Bootstrap + engine code
   budget **4,096 B**, 2.7 times Phase A's 1,536-B upper estimate; RAM budget
   is **5,184 B** across these already phase-exclusive homes. No persistent
   allocation. No use of the reserved `$B8FB-$B8FF` 5 B, initial-block slack,
   DIRECTOR_RAM, DIRECTOR_C_LOW, lance run or page 4. Existing band writes are
   screen data already allocated in the window, not added window bytes.
   Disk specs/guard folds and takeover live in disk boss overlays. If the
   existing A/C run sizes or install gate cannot be preserved, stop with costs.

3. **Read pause.** Before any read, prepare a stable DLI-free **HULL BREACH**
   status card using the existing HUD font, retain the bottom HUD and player
   PMG, and silence POKEY. This card replaces the battlefield deliberately;
   no black screen or old graphics under the wrong charset. After loading,
   restore the real spent hull and play B, then normal summary handoff.
   ESTIMATE: bootstrap 4 sectors + engine about 16–28 = **20–32 sectors**;
   emulator approximately **80–130 host frames (1.6–2.6 s)**. Standard 19,040
   baud on SIO2SD: payload/command wire time plus drive gaps, approximately
   **1.6–3.2 s** without retries. Not measured yet. Report actual sector count
   and emulator frames; hardware time remains an estimate until owner smoke.

4. **Coverage and entry.** All four campaign regions, using current band data
   and source-row colours; crown two rows, wings one character/frame, crown
   one row/3 frames, common brief shake, P1/P2 + two missile sparks. No new
   install call or byte: boss install stays **383/384 B**, one byte free.
   Keep boss-entry read counts unchanged (**84/88/88/89 sectors**), <=350 host
   frames. Existing overlay slots may replace removed death code; no added
   entry run. Fresh build and focused native checks must confirm these claims.

No pre-code estimate breaks the stated limits. Proceed with implementation;
stop if linked sizes or focused measurements contradict these bounds. Step 3
is OWNER-SMOKE CANDIDATE only; merge/push waits for the owner's explicit OK.


## Phase B — implemented candidate (awaiting owner smoke)

**OWNER-SMOKE CANDIDATE, 2026-10-22.** B runs on all four bosses. This section
records the candidate implementation, not accepted as-built status. §BQ is
reserved for the owner's OK. The pre-code estimates above remain historical;
[focused evidence and resource tables](../diagnostics/boss-death-breakup-2026-10-22/README.md)
contain the measured replacement values and exact reproduction commands.

C owns the 74-tick (1.48 s) policy. ASM uses the surviving real band, backs up
and restores the lead-in blast cells, retains the two crown source rows, and
shifts only lower rows between the original band and a separate 512-B buffer.
LMS/palette changes publish after the fence; displayed rows are not shifted
in place. The crown rises one row every three frames; wings move one character
per frame at the last weapon's centre, clamped to the visible span. P1/P2 and
two missiles provide bounded debris; P0 and HUD are retained. Source-row
colours follow each piece. The top blank header is preserved, so the cap
clips one character row earlier than in the offline canvas. No new resident
or window bytes are used.

The post-defeat load uses 17 sectors / 2,176 B: 512-B bootstrap into dead F
$5200, then 1,664-B padded engine into dead C/D $1000. Useful code is
157 + 1,607 B; engine capacity is 3,584 B with 1,977 B free. The wing buffer
uses $1E00–$1FFF, private scratch dead E $4C00–$4E3F (279 B above high-water).
The five window bytes, start block, DIRECTOR_RAM/C_LOW, lance and page 4 stay
untouched. Both reads carry disk guards. The ATR is standard 1,040 sectors;
existing sectors and boss-entry reads do not move. Install remains 383/384 B.

The DLI-free **HULL BREACH** card, bottom HUD and player cover the complete
66–67-frame emulator pause. The read calls themselves take 64.067 frames.
Hardware standard-SIO estimate is 1.3–1.8 s; owner hardware smoke remains due.
Combat and normal gameplay ticks stop before load. Queued COPY draws drain
before F reuse; flash/ring/shot backings are restored before E/C/D reuse.

Measured DMA-on peak is **28,547** in every region, below target 31,500 and
hard 32,568. The actual loop starts near line 22, tightening the illustrative
pre-code line-20 ceiling to **24,300**; observed peaks R1/R2/R3/R4 are
13,455 / 13,468 / 20,832 / 13,516. Minimum fence margin is **4,005**, above
500. Twelve authored/end-position fixtures show 74 frames each, no missed
frames, HUD/P0 changes or DLI ordering errors. Entry is 325/340/340/344 host
frames, below 350. Required fight probes are unchanged at 7,596 / 8,447 /
8,478. Build gates and 17 focused tests pass; release evidence remains stale
as already documented. Summary -> menu -> START GAME works in every native
fixture; automatic next-level progression remains deferred M4 scope.

**NEXT TASK: owner plays the campaign and four direct boss ATRs, compares B
with the GIF and checks pause/HUD/ship/summary. STOP until explicit OK.**


## Owner rejection and revision prerequisite (2026-10-22)

**OWNER-REJECTED:** smoke of `e97244c` is NOT OK. The card must be removed and
replaced by a continuous held fight image/strobe during reads. The requested
breakup duration is now ~175 PAL frames (3.5 s), superseding the 74-frame
candidate, with slower crown/wings, secondary blasts and final flash.

Before coding, inspection confirms VBI is disabled during the current
post-fight read (`boss_death_read` writes NMIEN=0); gameplay enables only DLI.
The owner's explicit stop condition therefore applies. No revision code or
new candidate was produced. [Prerequisite report, estimated alternatives and
whole-disk accounting](../diagnostics/boss-death-breakup-2026-10-22/revision-preflight.md).
The previous candidate evidence above is historical and is not owner acceptance.
§BQ remains unwritten until OK on a revised candidate; no merge/push.


## Revision 2 — DLI strobe and 175 ticks (candidate, 2026-10-23)

Owner explicitly selected approach 2 after the 83bc955 preflight stop. The
VBI remains off: safe A/resident-only DLI paths keep the held boss, P0 and HUD
visible during the two checked reads, with PF3 strobing from a counter advanced
by the top DLI. No text card or blank interval. The intermediate row palette
DLIs and old C/D publish/motion execution are disconnected before loading.
A fast HUD entry plus a blank first-scanline guard handles a DLI deferred into
line 240 by the reader's WSYNC. Star glyph 1 is preserved; guarded glyph lines
are restored before summary/new-game. No permanent allocation is added.

The 47-B former card slot contains 46 B of new entries/strobe plus a pad and
shares existing safe A/resident code. The C takeover remains exactly 81 B:
55 B of new setup minus the redundant 3-B guard_reset is a net 52-B replacement.
The boss-entry guard compare already zeroed its fold; no combat disk reads
intervene. The 383-B install and boss-entry reads do not grow.

The 175-tick timeline uses the first timing option proposed while work
continued: ticks 0–79 contain the secondary-explosion build-up, 80–159 the
flight, then 15 ticks of finish. Wings shift one character every two ticks;
crown rises one row every six ticks, both exactly half the old flight speed.
Secondary bursts are bounded, vary their location and phase, apply only to
material, and continue during flight. Final flash is 156–159; vanish at 160; handoff at 175. Existing
one-row-early crown clipping is unchanged and still awaits smoke acceptance.

The engine is 1948 useful B / 2048 disk B, 1636 B below its 3584-B cap.
Bootstrap stays 157 useful / 512 disk B. Total 20 sectors, three more than
e97244c; 12 remain in its 32-sector reservation. Campaign has 562 total
unplaced sectors; conservative M3/M3-H/M4 plus twelve capped levels still fit.
Wing buffer remains 512 B; private E limit remains 576 B (301-B span used,
high-water $4D2D). Reserved window/start/Director/lance/page-4 space is untouched.

All 80 native read trials pass with 1600 accepted sector checksums and no
retry/timeout/error. NMI block peak is 382 clocks; DLI instruction counts
109 / 94 / 57, including shared code but excluding hardware/ROM dispatch.
Death peaks R1/Citadel/Spine/Bastion are 29101 / 29000 / 29101 / 29101 DMA-on;
minimum fence 3507 against 500. Pre-fence max 21330 against 24300. Read/strobe
interval is 79 host frames; actual read calls 76.396–76.481. Fight bytes are
unchanged; no stress rerun. Six focused checks and all five build gates pass.
[Full tables, proof and launches](../diagnostics/boss-death-breakup-2026-10-22/README.md).

**NEXT TASK: owner smoke. No §BQ acceptance, merge or push before OK.**


## Revision 3 — independent motion preflight STOP (2026-10-23)

Owner smoke on 77c3104 accepted the read strobe/continuity, 3.5-second duration
and slower drift. Merge remains blocked pending independent random motion.
Before integrating policy, the first native Spine pixel-splice kernel probe
failed: pre-fence 31143 / 24300, DMA-on window 64669 / 31500, fence 0 / 500.
It adds 34 glyph-pair updates at maximum +3-pixel offset, overlapping the
existing horizontal copy tick. This component probe is not a completed motion
renderer or proof that every cheaper implementation is impossible.

Production game code, ATRs and 562 free sectors remain 77c3104. No new smoke
candidate; no other bosses measured after the explicit STOP threshold.
Seeded entity RNG is available; no POKEY randomness or new resident allocation
is needed. Options: schedule all three pieces' two-pixel wobble steps on
copy-free ticks; wobble wings only; or horizontal randomisation alone.
[Numbers, limits, raw proof and estimated options](../diagnostics/boss-death-motion-2026-10-23/README.md).
**NEXT TASK: owner selects a recovery option; do not merge or push.**

## Revision 4 — feasibility before code (2026-10-23)

Owner chose option 3 plus playfield shake; per-piece pixel wobble is rejected.
Cleanup archived the trial generator, kept its diagnostic evidence, and verified
all src/cfg/dist bytes against 77c3104. Baseline: engine 1948 B, 20 breakup
sectors. No game code from the trial was present in 03fe9ee.

### Fine-scroll and DLI decision

**Feasible with a compensated private display list.** The boss uses ANTIC 4
with HSCROL (bit $10) and per-row LMS; it does not use VSCROL. Bit $20 and
VSCROL can coexist with that horizontal setup. Set vertical scrolling only on
boss slots 1–8; leave the header/top separator and HUD outside it. Write VSCROL
at the post-HUD fence, before the next top row, never from the moving row DLI.

A naive bit change is unsafe. For offset v=0..3 the first scrolling row has
8-v lines and the first non-scrolling mode row has v+1. Eight boss rows plus
that exit row therefore occupy 65 lines regardless of v. Add seven blank
scanlines after the exit row to recover the original 72-line span. The exit
uses the existing first below-band field row as its fine-scroll buffer: only
its first v+1 lines are shown during shake, followed by the seven blank lines.
No boss row, HUD row or PMG storage is removed. This small strip below the
boss may clip a star during shake; it returns with the unscrolled list.

Top DLI stays at 15, separator-row DLI at 23, boss-row splits at 31-v through
87-v, below-band restore at 87-v, and HUD restore at 239. The row colour
splits move with their own glyph boundaries; the compensator fixes all later
row positions. No additional DLI is needed. HSCROL/LMS drift is retained.
The existing top separator scanlines 8–15 remain unchanged. Native checking
must use the v-adjusted expected boss DLI positions and fixed HUD/header image
strips on every frame, rather than demanding the old unscrolled boss positions.

Use a 92-B private header/list in dead E ($4CA0–$4CFB); shadow list remains
$4C40–$4C99. This avoids enlarging the resident 90-B A/B display-list slots.
Only post-fence publication writes the active list. At the final tick set
VSCROL exactly zero, publish the original unshaken 90-B death-list layout to
A, and select its original entry before the normal summary path. No return
to overwritten fight code or reactivation of its DLI is permitted.

Hardware rule checked against Atari's [De Re Atari, chapter 6](https://www.atarimania.com/documents/De-Re-Atari.pdf)
and the in-repo Atari800 ANTIC implementation (`antic.c`, vscrol_flag/off and
lastline handling). The shortened first row and the exit row require explicit
height compensation. The exact landing and image checks remain to be measured.

### Placement / estimated cost

Shake executor estimate: 110–180 disk-engine B, +150–350 clocks in publication,
92 B in already permitted E scratch. Combined motion/shake reserve: **1000 B**
of the 1636 available code bytes, allowing for the project's previous low
estimates. No resident/start/Director/lance/page-4/window/install allocation.
The 512-B wing buffer also holds the crown's two rows with its own front flag;
a separate 64-B zero row fits in E ($4DA0–$4DDF), within the unchanged 576-B cap.

Draw a permutation of .25/.5/.75 horizontal cells/tick for left/right/crown.
Wings use distinct one-cell cadences; reserve one tick in four for a 1/2/3-cell
crown move. Crown keeps its accepted upward cadence and gets a random horizontal
direction. Crown and wing copies never run on the same tick, preserving the
old worst six-row Spine copy bound. No glyph regeneration. Estimated added
pre-fence work 300–1050 clocks; estimated peak about 22400 vs 24300, DMA-on
about 30500 vs 31500, minimum fence about 2450 vs 500. These are estimates,
not measured gates. Allow up to eight additional sectors in the planning
reserve; actual linked bytes/sectors will replace it after build.

Use the existing seeded entity_next_rng ($990E / state $8006 in this baseline),
resolved from build labels through a disk-only veneer. Save its state in E at
entry and restore it before summary; this prevents consumption changing any
later summary/menu/game behaviour. Mix the frozen kill-frame byte into the
returned random values, so different kill timing varies direct-start smoke
runs while identical seed/input traces reproduce. No POKEY RANDOM.

Shake offsets: random 0..3 in buildup, reduce to 0..2 then 0..1 during flight,
zero near the end, one 3-line hit at the start of the final flash, exactly zero
on finish. Keep 175 ticks, 80/80/15 phases, secondary explosions and final flash.
Implementation and the four-region worst-case/native image checks follow only
after this committed feasibility decision. No merge before owner smoke.
