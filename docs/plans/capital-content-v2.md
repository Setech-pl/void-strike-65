# Capital content v2 — Phase 0 working plan

Status: Phase 0 checkpoint; increment0 WIP stopped at the mandatory Director C ABI gate. No candidate ATR. Baseline `5053697`; no gameplay implementation.
Owner Amendment 1 (2026-10-27) supersedes the original capital-mine scope:
mines occupy a new minefield sector; capital receives bonuses only. Both
sectors receive bonuses. Shipped level 1/2 data remain unchanged. Diagnostic
campaign inserts the hazard before capital. Window growth limit is 64 B,
leaving at least 682 B. No other reservation changes are authorized.

## Evidence and unresolved prerequisites

The registered fifteen-route native gate exited 0. It includes the complete
480/960 × E/M/H × flight/brake L2 matrix. Peak 31,432 wall cycles, capital
30,025; every boss entry 325 frames. The capital distribution over 31,477
frames is p50 15,479, p95 24,491, p99 26,711, max 30,025.
`../diagnostics/capital-content-v2/baseline.json` binds traces and records the
top twenty rows. Shared segment costs include DMA; do not count them as
reclaimed CPU. The previous 17,660 measurement used an earlier image and
cannot be substituted for current headroom. The earlier audit explicitly identifies 17,660 as pre-island/pre-slalom;
the current fifteen-route tool measures the present image with both enabled.
Ordinary/event maxima are 28,936/30,025: measured budgets after safety
2,264/1,175. Event means a music row, live hull explosion or non-steady phase;
ordinary is steady phase2 without either. MUSIC_ACTIVE with MUSIC_ROW_TIMER=1
is an existing pre-audio deferral signal. Entry phases and hull explosion
state supply the remaining signals; no new state byte is needed for these.
`reclaim-attribution.json` records exclusive PC costs at each route's retained
capital peak. Reclaiming those costs remains ESTIMATE until hazard measurement.

The conservative capital composed budget from the accepted baseline is
31,500 − (29,128 + 1,187) − 300 = 885 wall cycles. This is arithmetic on
prior measurements, not a new composed measurement. Minefield budget remains
unknown until the hull-free sector is built and measured without content.

## Proposed lifecycle and architecture

Content home $1180–$18FF: 1,920 B, phase exclusive. Static overlaps include
boss C, banner, scratch and death. Native CPU read/write census passed a direct480 route, all four boss lifecycle
fixtures and eight 480/960 real-exit fixtures. No access outside boot/boss was
observed. Static loader destinations and display memory owners keep this
interval outside normal menu/SPACE/capital/pause/summary use. It is available
in those phases after boot, with explicit disarm before boss install/reset;
this is phase/fixture-bounded evidence, not a real-hardware certification. Checked overlay read at level start beside
L2; INIT alone arms. Disarm before boss installation, real exit, reset and
load head. Pause freezes time; death/respawn retains field world state.
A stale or failed load cannot enter the content code.

C owns field activation, fuse/chain decisions, damage policy and bonus state.
ASM owns screen tests, exact pixel checks, glyph/backing publication, bounded
shot tests, canonical damage execution and P3 adaptation. Indexed volatile
stores remain ASM so L2's existing ABI gate is unchanged.

Select option (b) provisionally: author kind:"minefield", compile it as the
existing capital kind with a validated spare hazard flag. Existing ceiling,
drain and phase comparisons are then reused. A new kind would require those
comparisons to grow in several resident C paths; its extra branch costs have
not been measured. The final choice remains subject to linked-byte and native
measurement in increment2; no reclaimed-cycle claim follows from this choice. Reuse world clock, warning, islands and brake; disable hull publication,
broadside, turrets, turret shots and hull explosions in the hazard. Admission
of Light and Heavy is zero; use the existing drain before sector entry.
The Heavy early-exit rule applies to capital and minefield entry alike.

## Schema, placement and collision

Validate new keys and reject unknown keys. Diagnostic authoring exposes
kind minefield, islands, mines and bonuses. Lengths 288/352/416/480/960 follow
existing hull-row units. Density sparse/standard/dense is 4/6/8 across E/M/H.
Field counts scale by length, retaining the prior placement rules: columns
9–30, first row >=96, footprint14, spacing>=48, island clearance16, final64
rows clean, <=1 visible field. Amendment1 additionally requires side fields
within chain radius of corridor mines for most of the sector and islands
that constrain dodging. These requirements need a host placement proof;
no layout is accepted yet. Bonuses lie between fields and scale with length.

F1 selects the authorized screen-cell fallback. Existing playfield art uses
PF0 white, PF1 steel, PF2 player-side and inverse PF3 hostile colour; the
resident DLI changes palette registers and collision latches are cleared at
frame/respawn paths. Colour values do not create an exclusive GTIA collision
bank. Exclusive mine ownership was not proved, so no hardware latch is used.
Screen-cell mine-code screening precedes exact lit-pixel testing. Never scan all ship mask bits on idle ticks.
F2 uses shot overlay captured backing codes, no per-mine geometry loop.

One mine blast publishes per frame in private content slots. R_CHAIN4 cells,
BLAST_HIT2 cells, damage1, delay2 (delay3 authorized). Contact applies canonical
2 damage once and suppresses that mine's own blast hit; other chain blasts
ignore contact cooldown, honour Shield/DYING/respawn protection. Score +25,
no capsule cadence. F3 defers remaining expensive events at most twice; music
row and entry signal choice awaits measurement. Full eight-mine chain must
not depend on the five-slot breakup replacement routine.

Bonus uses existing amber $28 P3 adapter and +100 BCD score path. While weapon
capsule is PENDING or P3 belongs to DYING, retain bonus world state and defer
spawn/publication. No resident colour change.

## Provisional sizing

All rows are ESTIMATE ×2, not fitted or measured allocations.

| Resource | Base estimate | ×2 planning allowance |
| --- | ---: | ---: |
| Module code/data/state | 900 B | 1,800 B |
| L2 hooks | 24 B | 48 B |
| Window hooks/state | 24 B | 48 B |
| Idle field tick | 140 CPU | 280 CPU |
| Contact screen miss | 120 CPU | 240 CPU |
| Five-shot miss | 90 CPU | 180 CPU |
| Chain step | 440 CPU | 880 CPU |
| Bonus idle/collect | 70/290 CPU | 140/580 CPU |

Reader directory entry may use F8 L2 INIT fallback if its seven-byte tail is
insufficient. Level image remains <=16 sectors; arena use0, reserve use0.
Load increment must be measured <=1.5s (target1.2s). No estimates waive gates.

## Sequence and delivery

Finish Phase0 proof and commit; increment0 Heavy rule; increment1 checked
module with no-op tick; increment2 hazard mines; increment3 bonuses in both.
Each passing increment produces play ATRs before the next. Increment2/3:
diagnostic campaign, direct hazard480/960; increment3 adds capital480 bonus.
No owner acceptance, merge or release is implied by a local checkpoint.

## Concrete provisional module and level layout (ESTIMATE ×2)

Reserve the module's final72 B ($18B8–$18FF) for state: eight four-byte mine
records32 B, field/chain/deferral counters16 B, one blast publication record16 B,
and bonus state8 B. Code, vectors, art and immutable templates occupy at most
$1180–$18B7 (1,848 B). The doubled code/data estimate1,800 B must include the
vectors and art, leaving48 B planning slack; final linker accounting decides.
A 24-byte vector table exposes INIT, DISARM, row publication, contact, shots,
chain tick, bonus tick and erase/restore. No copied code is called before INIT.

The existing 256-byte island extension has seven six-byte span records at
28–69 and its runtime lookup at128–247. Use only the currently unassigned
70–127 interval (58 B), subject to build checks: ten per-sector descriptors,
one format byte and compact shared event records. World starts are eight-row
module indices (0–119); field density/template id is packed with the event
kind. Positions come from immutable templates in the module, selected by the
compiler's passage proof. Identical records can be shared across sectors.
Reject overflow instead of touching hull_params, M3-H or extending16 sectors.
All sizes are ESTIMATE, not implemented claims; an explicit schema version
must reject unknown formats and keys. No data changes to shipped levels.

A 1,920-byte module is15 disk sectors. Prior14-sector L2 load was53 host frames
(historical measurement); scaling predicts roughly57 frames/1.14s, ESTIMATE,
not a current load measurement. The <=1.5s gate stays mandatory. Directory
uses5 B/entry; checksum and dispatch pins require a link check. F8 permits
issuing the checked read from L2 INIT, within the64-B hook-growth allowance.
