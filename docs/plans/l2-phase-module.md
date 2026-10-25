# L2 fighter/capital phase module — Phase A

**Committed plan for owner review; no production implementation.** Code baseline
`main = origin/main = 19b1464`. Decisions: [§BW](../owner-decisions-2026-09-11.md#bw-capital-sector-islands-brake-sector-length-2026-10-25).
The unchanged spike report is [here](../audits/2026-10-25-spike-nacelles.md).
Its pending-smoke statements are historical; §BW records subsequent owner smoke.
The production integration itself has never been owner-smoked.

Numeric convention throughout: **MEASURED (M)** means current linked bytes,
source-declared addresses/limits, exact arithmetic on those declarations, or
explicitly identified emulator results. A source-declared limit is not a timing
measurement. **ESTIMATE (E)** means a proposed address, format, allocation,
implementation budget or runtime forecast. M spike timings apply only to the
spike artifact, not to the future production module. All table numbers inherit
the M/E tag in their row or table caption. Section IDs, dates, file names and
Git IDs are identifiers. No unbuilt proposal is claimed to be linked.

## Baseline and transferred evidence

M baseline snapshot: [baseline-build.json](../diagnostics/l2-island-mockups/baseline-build.json),
from the normal build, plus `build/{manifest.json,*.map,*.lbl}`. Initial content
is **M 12,829 B**, planning slack **M 823 B**, boot/chunk occupancy **M 210
sectors**, MAIN slack **M 17 B**, ENTITY_CODE tail **M 5 B**, BASIC-window use
**M 1,656 B**. Normal computed gates PASS. Runtime evidence is pending, with the
expected warning naming stale boot/ATR bindings and evidence commit `b3b8e466`;
release build will fail. This session did not refresh release evidence.

M campaign ATR remains
`410652973ed76f0033f0fbff84c17a484104f95ff97cbcc1d9eff9e6cb996ae7`.
Phase A production CPU/RAM/residency and occupied-disk delta: **M zero**; this
is the existing L1 campaign, not an L2 smoke candidate.

The report was copied unchanged from remote spike HEAD `cdd08e7`, without a
merge. Only these GIFs accompany it (M Git blob lengths):

| File under `docs/diagnostics/spike-nacelles/` | M bytes | Purpose |
| --- | ---: | --- |
| `p5-flight-easy.gif` | 621,575 | Accepted obstacle geometry in flight |
| `p5-throttle-bottom.gif` | 299,778 | Bottom-limit brake demonstration |
| Total | 921,353 | All other spike artifacts remain branch-qualified links |

Sources read: owner §BU.1/.2/.4 and §BV.4/.5/.6; the spike's geometry,
publication, debris, fairness, brake and length sections; memory/cycles audit
[Part C / D7](../audits/2026-10-23-memory-cycles.md#c--capital-sector-data-and-code);
[L1 plan](l1-window-levers.md); [memory map](../memory-map.md);
`docs/hybrid-c-architecture.md`; `AGENTS.md` §BM/§BR. No defect ledger rows.

## Phase ownership and callable lifetime

M approved capacity is `$1900-$1FFF`, **1,792 B** (§BU.1; current boss claim in
`build/manifest.json` `boss.slotD`; `docs/memory-map.md:104-110`). E make an
independent link unit with a fixed entry table, code/RODATA and private BSS
inside this same interval. It is a level-start overlay, not a boot DFMC record.

| Phase | M current owner/evidence | E L2 contract for the whole `$1900-$1FFF` interval |
| --- | --- | --- |
| Boot / RESET | OS may clear RAM; game initial block starts `$2000`; `scripts/build.mjs:2346`, `cfg/atari-boot.cfg` | Unavailable/uninitialised. No L2 caller, vector or interrupt may execute it. RESET repeats the cold path. |
| Menu / options / scores / GAME OVER | Checked menu run ends `$117F`; packed Light hold ends `$10FF`; `docs/plans/l1-window-levers.md` linked result | No active L2 owner; stale bytes are harmless and never read. A menu return does not reload L2. |
| Level-start loading | Reader `$A000-$A5FF`, summary claim `$0500-$0BFF`; `build/sector-reader.map`, `build/level-summary.map` | Reader exclusively writes L2, with gameplay stopped. Entire run checks before INIT or any other entry. Failure branches to existing failure screen; no partial module can execute. |
| Summary / optional future interlude | Summary code `$0500-$0BEE`, its art lands `$7810`; `build/level-summary.map`, manifest | No L2 call on level-end summary. Start summary may load/init it after the level check. Any future interlude may destroy it; M4 must load it after that interlude. |
| Fighter / SPACE | No current low-RAM writer; MAIN Light `$3643-$3AEE`; `build/light-kernel.map` | L2 resident for this phase. Brake policy returns normal speed; module state/lookup valid. SPACE debris retained. |
| Capital, including COMPLETE | Current hulls/maps are elsewhere; `src/main.s:6990-7086,7149-7202,9780-9854` | L2 owns code/state. Same row stream feeds islands, hulls, stations and Director. No disk access. |
| Boss install | Banner reads at `src/hybrid/boss.s:3941`, install at `:3351`; current D code `$1900-$1F93`, BSS through `$1FFB` | L2 becomes invalid as soon as entry begins. Complete/drain and abandon gameplay stack before first boss read. Existing boss vector replacement must exclude all L2 entries. |
| Boss fight | D code/state; private boss frame loop (`build/boss.map`, `src/hybrid/boss.s`) | Slot D owns the interval, including unused tail; no L2 read/call. VBI/DLI/music/Light/shared admission remain independent of L2. |
| Boss-death | Death code reaches `$194F`, data `$1950-$19FE`, wing buffer `$1E00-$1FFF`; `build/boss-death.map`, `cfg/boss-death.cfg` | Boss-death owns the interval. Never use a return address or callback into L2 after overwrite. Reload at next level start. |

M disjoint reservations, unchanged: menu `$0C00-$117F`, summary
`$0500-$0BEE`, retained MAIN `$3615-$3642` and Light `$3643-$3AEE`, M3-H
`$549E-$54BD`, reserved window `$B8FB-$B8FF` (baseline snapshot; memory map
L1 clarification). **E no byte is borrowed from any of them.** The current
blanket boss-claim validator must become phase-aware for this deliberate
shared slot; do not delete its protection for other links/boot records.

E entry table has **7 JMP entries / 21 B**: INIT, row publication, island
contact, brake policy, warning policy, capital phase, capital entry-coordinate
initialisation. Static JSR/JMP operands replace existing hook instructions;
keep padding where needed to retain other hot addresses. The original
`draw_hull_row` body stays once, in its existing home. Retain the spike's
**M 8-B** displaced-instruction trampoline, never its earlier duplicated
**M 191-B** renderer (spike “P5 geometry and publication”).

E call graph: only fighter/capital main-loop callers enter L2; no VBI, DLI,
audio, Light or shared Director spawn callback points there. The C capital
phase body is callable only before boss takeover; a resident JMP at its old
symbol preserves the ABI. The boss-due branch of `sector_c_update_first_capital`
remains resident and runs before the new coordinate-init call. Boss install
retains its own vector patch, no new per-frame phase test in shared spawn.
M4 will invoke the same checked load/init service after summary/interlude and
level selection, even when the level buffer is a resident hit. Today START
GAME after a menu is the only campaign level-start path; it must also reload
after a quit/death during boss ownership. No boot-once or resident-hit shortcut
may skip the L2 read.

## Disk run, load points and latency

E reserve overlay directory entry **11**, run `fighter-capital-l2`, sectors
**251–264**, destination `$1900`, **14 × 128 = 1,792 B**. Always transport the
whole slot, with deterministic zero padding and initial BSS image. M current
menu uses **240–250**, banners begin at **280**, levels at **320**, and boss
runs begin at **512** (`build/overlay-directory.inc`; `scripts/build.mjs:554-585,2737-2757,4381`).
Thus this proposed disk run needs no displacement of existing payloads.
It adds **E 14 occupied sectors**, no DFMC record, and does not grow the fixed
ATR file. E extend the directory and disk-guard expected-sum table together;
the disk identity/layout binding must change with the layout, generated by build.

M existing checks: per-sector carry-wrap SIO frame checksum plus whole-run
Fletcher fold of accepted sector sums, compared with build-generated expected
bytes (`src/hybrid/disk-guard.s:11-25,37-80`;
`src/hybrid/sector-reader.s:470-507,698-717`). E use this exact path. The final
L2 checksum/SHA cannot be known until Phase B links it; do not invent one.
A zero-count, wrong-disk, short or corrupt run must never publish L2.

E load at `summary_level_loaded`, after the normal level-image check and
capital restore, before gameplay: `LDX #L2; JSR READ_RUN; BCS summary_failed;
JSR L2_INIT`. Preserve the existing summary wait and FIRE release/press.
On a level resident hit, still read L2. Both a reset/cold start and a
post-boss START GAME take this path. M present code is
`src/hybrid/level-summary.s:150-179`; `sector_reader_start_gameplay` at
`src/hybrid/sector-reader.s:240-274` establishes the handoff.

M fresh emulator baseline is committed in
[sio-baseline.json](../diagnostics/l2-island-mockups/sio-baseline.json). Reproduce:

```sh
npm run build
node scripts/sio-boot-repro.mjs --atr=dist/void-strike-65.atr --labels=build \
  --atari800-source=build/atari800-trace --frames=4500 --start-game \
  --out=build/l2-phase-a-sio --json=build/l2-phase-a-sio.json
```

The command's frame budget is an observation limit, not a game requirement.
No probe, gameplay patch or experimental worktree was used. The tool reports
menu entry before its checked read finishes; readiness is `frontend_input_poll`.

| Timing in PAL frames, no BASIC, same held-FIRE harness | Patched OS SIO | Standard SIO | Evidence / classification |
| --- | ---: | ---: | --- |
| Today cold input-ready menu | M 598 | M 1,384 | `sio-baseline.json` milestones; agrees with §BV.6 |
| Today first main loop, cold origin | M 909 | M 1,695 | Same artifact |
| Today input-ready menu → first loop | M 311 | M 311 | Exact milestone subtraction, includes summary/input/init |
| Today level-image wire read, inclusive endpoints | M 50 | M 50 | M 13 sectors, tail-first; per-sector transactions in artifact |
| Added full L2 run alone | E 54–64 | E 54–64 | M 50/13 frames per sector, E 14 sectors; upper allowance for rounding/animation/fold |
| Added level-data sectors and init | E 14–16 | E 14–16 | E 3 sectors plus bounded table build; derivation below |
| **Total added level-start work vs today** | **E 68–80** | **E 68–80** | Conservative sum; standard-SIO STOP is declared 100 in task |
| Transfer/init work for level+L2 vs today's wire-only read | E 118–130 | E 118–130 | M 50 + E 68–80; not a measured future launch time |

M the patch accelerates OS SIOV boot reads; the game's transition reader is
direct POKEY in both modes (`src/hybrid/sector-reader.s:5-15`). Do not claim a
fast L2 transition merely because boot is patched. E the nominal extra disk
work is `ceil(17 × 50/13) = 66` frames, with additional scheduling/init margin
in the table. E allow **≤2 frames / ≤63,000 CPU cycles** for one-time lookup
construction, included in the margin; measure it with the display active.
Visible delay can be partly hidden by the existing summary minimum; do not
add an artificial wait. Input-ready → first loop is conservatively **E ≤391
frames** for the same scripted input; real player FIRE time is unbounded.
This is a forecast, not a measured latency PASS. At Phase B **added standard
SIO work >100 frames is STOP**, irrespective of hidden summary dwell.

## First production contents and accounting

E budget uses a compact per-module island lookup in level RAM and keeps art
recipes in L2. It does not bring the spike's padded difficulty tables into L2.
The spike's **M 644–704 B** estimate covered P5+brake only, excluding longer
coordinates, art, warning and infrastructure (report “production estimate”).
The following is a new gross first-content budget, with no compressed-size claim.

| Item | E resident delta B | E L2 B (code/RODATA/BSS) | E level-data B, maximum | E disk attribution | CPU / DMA basis |
| --- | ---: | ---: | ---: | --- | --- |
| Islands: shared row renderer hook, exact interval collision, C entry selection | 0 (same-size hooks) | 380 = M spike 291 code + M 8 state + E 81 integration | 120 lookup + 42 span records | Within padded L2 run and level tail | M spike ordinary +500/+500/+503 CPU E/M/H, whole contact max 793, row draw max 1,921; production E allow +100 for new addressing, no unbounded scan. DMA structure E unchanged. |
| Director debris admission obeys mask; capital flags cleared | −9 | 0 | 0 (existing hazard bits) | Packed saving unknown; no promised sector credit | M spike linked reduction −9, no new state; E shared-path cycle delta must be measured; boss target ≤+2. |
| Brake C policy / ASM cached-rate consumption | 0 | 114 = M 107 code/veneer + M 6 data + M 1 state | 0 | Included in L2 | M spike C 33 CPU in SPACE, 88–95 in normal capital states, 107 recovery; ordinary capital net +81–88, predictor +2; E placement allowance +10. E no added DMA or VBI/DLI work. |
| Bottom warning policy | 0 | 23 (M spike C body) | 0 | Included in L2 | M spike +30 CPU at admission, zero state/ordinary policy work; E same cost before placement penalties. |
| Longer axis, phase body and entry helper | −95 (M 98-B body → E 3-B JMP) | 178 = M 98 relocated + E 80 widening/helpers | +120 sequence bytes; padding below | Within L2 and expanded level image | E +20–80 CPU on changed row/phase events, not every shot; E no new DMA. Already-wide counters retained. |
| Art recipe decode / existing-glyph role lookup | 0 | 256 = E 84 ASM + M 150 recipes + M 22 role-map B | 0 | Included in L2, all candidate recipes budgeted | E ≤+400 CPU per widest row over solid P5 publication; contact geometry unchanged; no dynamic glyph upload/DMA. |
| Fixed entries, cold init and checked-load integration | +17 = E summary 10 + directory 5 + guard 2 | 73 = E 21 JMP table + 52 cold init/support | 94 reserved/header bytes, detailed below | Padded L2; resident packed/rounding unknown | E ≤63,000 CPU once; no new per-frame guard; resident existing-opcode hook replacements add E 0 bytes. |
| **First contents total / ceilings** | **−87** | **1,024** | **376 live maximum + 8 padding = 384 added transported B** | **14 L2 + 3 level sectors = 17 new occupied sectors**, before resident packing rounding | Row/contact bounds are separate from whole-frame peaks; combined production is not measured. |

M source anchors: spike “Bytes and L2 production estimate”, “Collision and
ordinary-frame cost”, “Independent cheap warning alternative”, and “Brake
measurements”; `build/encounter-director.lbl` has phase body `$8653-$86B4`
(**M 98 B**), whole sector segment **M 241/248 B**. E replacing only that body
by a fixed JMP leaves the remainder resident; retain its old subsequent symbol
addresses with a separately placed reclaimed tail/explicit layout, rather than
shifting all callers. New phase policy is C; ASM owns row/interval execution.
The length increment's **E 80 B** is the spike's upper **E 32–80 B** forecast,
not an extra duplicate renderer. Final linker placement decides feasibility.

M throttle cost details are from the report, and must be checked with the
warning enabled together; no combined native proof exists. E the upper
incremental ordinary test planning budget is **+603 CPU**; art adds only on
row-publication events. Do not sum an isolated routine maximum into every
frame or treat DMA-off CPU as elapsed PAL wall time. Record worst complete
capital frames and the target/hard distinction in Phase B.

### Resident hooks and transport capacity

| Resident item | M baseline | E after first contents | Evidence / rule |
| --- | ---: | ---: | --- |
| Sector reader | 1,503/1,536 B, 33 free | +5 directory B; 28 free | `baseline-build.json` reader; existing READ_RUN reused |
| Summary | 1,775/1,792 B, 17 free | +10 call/failure/init B; 7 free | `build/level-summary.map`; branch reach must be checked |
| MAIN Light composite | 1,196 B, 17 B MAIN tail | +2 guard-sum B; 15 free | `build/light-kernel.map`; shifted LIFE literals/vectors must be regenerated |
| C sector segment | 241/248 B, 7 free | −95 used B, 102 reusable/free B in total | `build/encounter-director.lbl`; phase-only body moved |
| Director high code | 623 B, 2 free in its code area | −9 used B, 11 code-tail B | M spike measured mask change; same area must be verified |
| MAIN/BROADSIDE/entity hooks | Existing fixed instructions | 0 net B; no body duplication | E retain addresses/pads and inspect linked branch/index penalties |

E the resident subtotal is **−87 B**; the active used-byte increase with
L2 and the new level payload is **1,321 B = 1,024 − 87 + 384**, within existing
phase/buffer reservations. Reservation growth is **zero**; this is not
permanent whole-session residency. Full raw L2 transport includes **E 768 B**
initial padding, not executable feature cost. Resident packing may change boot
sectors independently; do not offset the **E 17-sector** run growth with an
unmeasured compression credit. Enforce the existing initial-content, DFMC,
window and ATR occupancy gates at build.

E prefer not to consume the reclaimed C-sector holes now. Future dock resident
policy has the audit's **E 48–96 B** envelope; **E 102 B** total free leaves
**E 6–54 B** by arithmetic. The largest hole is only **E 95 B**, plus a
separate **M 7-B** tail. The upper dock case therefore requires a measured
relink/coalescing of the remaining sector functions in that later task, or a
smaller/split policy; total free bytes alone are not contiguous fit proof.
No dock code is part of first production contents.
Do not spend the M3-H window or its damaged-body reservation to make this fit.

### L2 ledger and later consumers

All allocations/addresses here are **E**, arithmetic on the approved
**M 1,792-B** slot. Only the first row is proposed first production content.

| Use | E B | E slot range | Condition |
| --- | ---: | --- | --- |
| First production contents above | 1,024 | `$1900-$1CFF` | Upper budget, not linked footprint |
| Later repair dock, including SW edge/bay publication + state | 352 | `$1D00-$1E5F` | Audit upper 320 code + 32 state; separate resident policy above; BU.4 still needed |
| Later data-driven bonus pickup integration | 128 | `$1E60-$1EDF` | BV.4 proposal; P3/M3 mechanism shared, no second pickup renderer |
| Proposed post-1.0 reserve | 256 | `$1EE0-$1FDF` | Owner to choose under BV.5; unspent |
| Unallocated fit margin | 32 | `$1FE0-$1FFF` | Protect until linking |
| Total | 1,792 | `$1900-$1FFF` | Leaves 768 B after first contents, 32 after all reservations |

E a **512-B** reserve with all the same later allocations needs **2,016 B**,
a **224-B deficit** against the slot. To retain the larger reserve: choose
fewer art recipes/smaller measured integration, reduce/re-scope the later bonus
budget, or postpone one later consumer; do not silently drop the dock or use
forbidden RAM. Recommended owner choice is **E 256 B**, pending Phase B link.
If first contents exceed **E 1,024 B**, reprice this ledger before consuming
future allocations; **>M 1,792 B even with shared rendering is STOP**.

## Longer axis, table layout and authoring

E retain one universal, finite coordinate, now right-aligned at **960 rows**.
For authored hull length L, `firstRow = 960-L`; module count **120**, prow
**928–959**, DRAIN **968**. E allow lengths **288–960**, multiples of **8**;
fixed non-combat sections remain **224 rows**, combat is **L−224**. This is an
authoring proposal for the owner's “up to 960”, not a second maximum-length
decision. Legacy `hull.length` aliases keep their old **M 288/352/416/480**
meanings; reject specifying both. E default L remains **480**. No seamless
capital chaining or mid-sector load is introduced.

E changes required, by current source site:

- `scripts/level-compiler.mjs:36-45,120-129,275-355,365-385,999-1089`: replace
  fixed-step-only validation; widen sequence **M 60 → E 120 B/side**, move enemy
  sequence **M offset 68 → E 128**, full geometry **M 128 → E 256 B** at `$AC00`.
  Keep rows as little-endian word and phase starts as byte module indices.
  Change initial lead calculation, drain module **M 61 → E 121**, format magic
  and both generated ASM/C contracts. Reject stale format/checksum.
- `scripts/capital-hulls.mjs:28,251-330,440-541,672`: replace the combat-step
  restriction and fixed-total asserts, extend combat module sequence by
  deterministic reuse of authored combat modules; preserve end sections.
  Replace exhaustive nested-subset enumeration for the larger station sets
  with bounded host selection/DP, retaining seeded nesting and spacing/gap
  constraints. Do not replicate the last station or change fire cadence.
- `src/c/lifecycle.c:760-806`: entry writes BOTH phase bytes from **E 960−L**.
  Replace `HI > 1` and `if HI != 0: OR 0x20` with full module calculation
  `(lo >> 3) | (hi << 5)`, guarded before truncation. Phase body moves to C in
  L2; use **E 121** drain module. Neither high-byte-zero assumption survives.
- `src/main.s:6990-7086`: row resolvers accept the new finite end, generate
  **E 0–119** module indices, preserve both source-row bytes and side offset.
  Existing five shifts of the high byte already form a byte module index for
  this bound. `:7149-7202,7493-7510,7679-7690` row publication/cache paths must
  retain full coordinates; never compare only the low byte.
- `src/main.s:8048-8049`: sequence reservation and equality assert must cover
  **E 120** entries; this currently also hides `world_rotate_due` in the old
  sequence reserve, so retain its fixed address or explicitly relink/measure
  it. Do not silently grow BROADSIDE by another **E 120 B**: the sequences
  already live in level RAM. Remove/reprice the obsolete reserve while keeping
  the hot predictor's placement; the long-axis budget above does not rely on
  reclaiming a second copy of those bytes.
- Generated `CAPITAL_HULL_*` section/end constants plus
  `src/main.s:9712-9740,9780-9854` and the integration prow glue
  (`src/integration-glue.s`, generated includes): rebase prow profiles,
  full-word end tests, collision local-row subtraction, trailing hull and
  DRAIN/COMPLETE/visible-row mapping. M existing prow is **448–479**, DRAIN
  **488**; all become the E values above together, including right-side offset.
- M `CORRIDOR_PHASE`, `HULL_DRAW_ROW`, ring row arrays, broadside source rows,
  Director world row and `sector_row` already have low/high bytes
  (`src/main.s:233-266,411-436`; `src/c/director.c:64,182,644-686`). E retain
  **16-bit** width; no extra clock byte, no independent island timer. Exercise
  **255/256, 511/512, 767/768** and trailing rows beyond **960**. Frame timers
  (warnings, projectiles, cooldown, animation) stay frame based.

E island lookup: a **120-B**, current-sector module table at `$AD80-$ADF7`,
zero for no island; nonzero is `1 + (recipe << 4) + (faction << 3) + part`
(recipe E 0–4, faction E 0–1, part E 0–5; maximum E 78). Build once at capital
admission from at most **7 spans**, after clearing it. A span has **6 B**:
start module, end module, recipe, faction, pattern flags, reserved. Part/width
uses the selected recipe envelope and difficulty cap; an indexed module read
finds the interval in constant time for each of at most **3** contact rows.
No scan over all fragments per contact, and no spike padded table indexed by
only **9 bits**. Publication and collision consume the same envelope, including
all cache-hit/miss, hull-only fallback and ring-clear paths. E only one fragment
per row; compiler proves contact union, tie-left nearest push and safe side
channels. No new collision architecture or projectile blocking.

E level image becomes **16 sectors / 2,048 B**, using the existing
`$A600-$ADFF` buffer. Current transport is **M 13 / 1,664 B**. Level extension:

| E range | E bytes | E contents |
| --- | ---: | --- |
| `$AC80-$ACF7` | 120 | Net sequence growth (geometry overall header + two 120-entry sequences = 248 B) |
| `$ACF8-$ACFF` | 8 | Deterministic geometry padding |
| `$AD00-$AD07` | 8 | Island extension header / version / bounded counts |
| `$AD08-$AD1B` | 20 | Two bytes per sector: pattern/density/descriptor selection, max current 10 sectors |
| `$AD1C-$AD45` | 42 | Up to seven current authored span records; shared by capital sectors |
| `$AD46-$AD7F` | 58 | Reserved authoring extension, initially zero |
| `$AD80-$ADF7` | 120 | Current-sector lookup workspace, transported zero and built at entry |
| `$ADF8-$ADFF` | 8 | Reserved zero tail |
| Total added transport | 384 | 376 non-padding/reserved/workspace + 8 geometry padding; no window movement |

The sequence growth is a shift within the full geometry page, not literal
appending of just the enemy sequence: both sequence bases change as above.
E one shared descriptor set per level is sufficient for first production;
per-sector selection may disable it or select validated subsets/density.
Reject combinations requiring more than the bounded descriptor capacity;
do not silently alias different authored patterns. Future multi-capital art
sets must fit this same envelope or return to planning.

### Turret scaling on the longer axis

M current station formula uses eligible endpoint distance in modules:
`round(baseCount * (lastEligible-firstEligible) / 51)`, base **10/15/20**,
minimum spacing **16 rows**, maximum gaps **64/48/32 rows** E/M/H
(`scripts/capital-hulls.mjs:440-541`; compiled baseline hull). Preserve that
formula and stricter-difficulty nesting; E extend only the combat section and
eligible distance. No runtime station list scan: existing encoded module IDs
carry the minimum enabled difficulty; `select_sector_module` remains an indexed
lookup (`src/main.s:7074+`). Existing simultaneous shell-slot capacity and
per-difficulty rates remain fixed.

| Length / eligible endpoint distance | Stations per side E/M/H | Classification |
| --- | --- | --- |
| 480 rows / 51 modules | 10 / 15 / 20 | M level 1 compiler result |
| 352 rows / 35 modules | 7 / 10 / 14 | M level 2 compiler result, audit Part C |
| 960 rows / 111 modules | 22 / 33 / 44 | E exact application of unchanged density formula |

E host validator proves minimum spacing, maximum gaps, first/last eligibility,
`EASY ⊂ MEDIUM ⊂ HARD` and strict count increase for every allowed length.
If a requested density cannot meet those constraints, reject with the exact
length/count/gap conflict; never silently reduce harder counts or fire rates.
The host generator needs bounded selection because enumerating all subsets
of the extended HARD set would be combinatorial. This is host compiler work,
not target RAM or recurring CPU growth.

### Proposed author schema (E; not implemented)

```json
{
  "hull": { "rows": 960, "turrets": 3 },
  "sectors": [
    {
      "kind": "capital",
      "hazards": { "debris": 0 },
      "islands": { "pattern": "salvage", "density": "standard" }
    }
  ]
}
```

E defaults: hull rows **480**, turret density **3** (current only supported
density); omitted `islands` means `pattern:"none"`, density `"standard"`.
Explicit `"salvage"` is the selected production recipe set, not an arbitrary
runtime function name. Omitted debris keeps today's **M zero** default;
capital requires zero in production, non-capital sectors retain their authored
values. Existing SPACE examples must keep their nonzero flags; no global
debris removal. Reject capital nonzero debris with an actionable compiler
error rather than ignoring the author's value.

E standard island placement preserves the spike's initial local row **96**,
spacing **112 rows**, fragment maximum height **48 rows**, hence at least
**64 clear rows** between full-size fragments; retain a final **64-row**
clear section before hull end. Shorter silhouettes still reserve the same
span. E density `"sparse"` selects every other valid span; no `"dense"` in
first production. Recipes/factions are host-selected deterministically from
owner-chosen designs, using a layout seed without consuming runtime Director
RNG. E first content changes the current capitals to explicit debris zero and
salvage islands, with legacy lengths; include an explicitly longer diagnostic
level for verification, without silently lengthening today's campaign.

E validation rejects unknown fields/enums, out-of-range/misaligned lengths,
both length aliases together, non-capital islands, descriptor overflow or
out-of-range module/recipe indices, overlapping spans, insufficient entry/gap
warning, impossible density/station layouts, and unapproved glyph roles.
Prove side-channel minima **6/8/10-cell island → ≥8/7/6-cell channels** over
all three footprint rows, all fine alignments, right-side offset, joins and
entry/exit. Keep initial carry-in debris clearance: M spike worst debris
exit by hull row **48**, before first tip **96** (report “Debris policy”).
A changed placement that breaks that proof requires a newly priced guard.
Generate format/checksum/assert updates together; no handwritten report hashes.

## Island-art choice before implementation

Review-only sources and output:
[render.mjs](../diagnostics/l2-island-mockups/render.mjs),
[manifest.json](../diagnostics/l2-island-mockups/manifest.json).
Rebuild from repo root:

```sh
node docs/diagnostics/l2-island-mockups/render.mjs
```

M the helper calls the game's `readGameGraphicsSource` / `compileCapitalHulls`,
uses their actual charset bytes and screen-code bit-7 bank, decodes ANTIC
pixels, and maps actual gameplay registers through `atari800PalRgb`. Labels
use the actual frontend font. No new raster asset or glyph is installed.
Each PNG has EASY allied/enemy on top and HARD allied/enemy below, with both
real hulls beside each fragment for scale. Full **M 48-row** fragments are
shown taller than a gameplay viewport; these are design sheets, not screenshots.
M all designs use **30 B recipe data** (six half-widths plus six four-role
rows), with a shared **22-B** role map for both factions; new glyph slots and
new glyph bytes are **M zero** in these mockups. E production decode code is
priced in the table, and its output is subject to owner choice.

| M PNG absolute path | Design / existing roles | M data / slots |
| --- | --- | --- |
| `/Users/marcinkrzetowski/Projects/dark-fighter/docs/diagnostics/l2-island-mockups/01-module-wreck.png` | Torn module: mass, seam, groove and bevels | 30 B / 0 new slots |
| `/Users/marcinkrzetowski/Projects/dark-fighter/docs/diagnostics/l2-island-mockups/02-engine-pod.png` | Detached drive pod: armour, grooves, static existing engine energy glyph | 30 B / 0 new slots |
| `/Users/marcinkrzetowski/Projects/dark-fighter/docs/diagnostics/l2-island-mockups/03-turret-deck.png` | Broken deck: existing barrel, housing and base; decorative, never fires | 30 B / 0 new slots |
| `/Users/marcinkrzetowski/Projects/dark-fighter/docs/diagnostics/l2-island-mockups/04-girder-mast.png` | Thin girder/antenna shaft with broad cross-member, seams and accents | 30 B / 0 new slots |
| `/Users/marcinkrzetowski/Projects/dark-fighter/docs/diagnostics/l2-island-mockups/05-panel-plate.png` | Broad panel plate with repeated inset panels and broken bevel | 30 B / 0 new slots |

M recipe total **150 B**; PNG bytes and checksums are in the manifest. Engine
energy is static in the mockup, using an already animated slot without adding
an animation owner. E if owner wants independently animated flame, loose
antenna wires or genuinely new silhouette glyphs, reprice before art work.
The role map is faction-specific, not simply ORing bit 7 onto allied art.
For subsequent enemy styles, map the same surface roles to that level's real
style glyphs; no extra charset bank. Pixel grooves/negative detail do not
create traversable holes: the single per-row interval remains authoritative,
as with the existing hull. Owner must choose the visual set before production
art enters the build; these review files do not constitute that choice.

## Phase B commit sequence

E proposed sequence, one feature result (L2 infrastructure + first contents):

1. Link/load skeleton, phase-aware overlap guards and generated ABI/disk sums;
   checked level-start reload, boss invalidation, format bump and extended
   level geometry. Keep baseline visible behaviour until the new lookup works.
2. Longer coordinate/compiler/station generation and bounded current-sector
   island table; old-length output equivalence after rebasing, longer diagnostic
   level. Keep C policy and ASM hardware boundaries.
3. Shared P5 publication/collision, capital-only debris data and unconditional
   Director mask, owner-selected art recipes. No Light or pickup renderer fork.
4. Brake and bottom warning together, then focused measurements below and a
   normal build; resource/current-state docs, local candidate commit and ATR.
   Owner plays on real hardware before acceptance/merge. No automatic next task.

### Measurements (only these)

All numeric limits here are **M declared gates**, from task/§BM/§BR/§BV.3,
not measurements of unbuilt L2. Proposed route lengths and coverage are E.

- Normal build's computed **31,500 target / 32,568 hard / 35,568 physical PAL**
  distinction; DMA, fence, block-size, window, initial content, boss-entry and
  disk limits remain fatal as currently computed. Report full linked ranges,
  MAIN/reader/summary/sector/Light tails, L2 code/data/BSS, **≤1,792 B** slot,
  current versus new occupied sectors, and actual run checksums. Protect
  `$549E-$54BD`, `$B8FB-$B8FF`, menu, summary and L1 placements with writer checks.
- Focused compiler/coordinate tests: legacy and maximum length, all boundary
  high-byte transitions listed above, first/prow/DRAIN/COMPLETE and SPACE return;
  station counts/nesting/gaps, unknown/invalid schema, no island overlap,
  descriptor bound and no runtime data scan. Inspect actual linked hooks and
  branch/index page crossings for shared hot callers; retain ≤+2 boss delta.
- Capital PAL/native routes on EASY/MEDIUM/HARD, current lengths and the longer
  **960-row** diagnostic: full traversal unbraked, hold/release bottom brake,
  deliberate contact/cooldown/nearest clamp, gap flight, bottom warning
  threshold and combined brake+warning. Record complete-frame max/mean, worst
  row/contact cost, fence margin, misses, extra VBI and DLI anomalies. Require
  zero misses/anomalies and no hard/frame/DMA/fence failure; separately report
  target overruns. Verify identical hull/world residues and Director row events,
  no catch-up burst, no mid-sector disk read and correct final drain.
- Focused backing: normal/Spread/hostile PairShot and both broadside factions
  over chosen art; cache hit/miss, full-width fallback, unoccluded cells,
  physical ring reuse/clear and no ghosts. Retain canonical damage and Shield/
  lifecycle behaviour; verify SPACE debris remains and capital carry-in clears
  before the first approach. A bottom warning that scrolls off may cancel;
  test that expected behaviour without promising every late shot is escapable.
- **Shared debris path: lost-target boss stress, all required cases**, with
  and without lance firing: Citadel **L4/L5**, Spine **L7/L9**, Bastion **L10**.
  Compare with main `19b1464`, each **≤8,500 CPU**, delta **≤+2 CPU**. Retain
  all-state maxima in the same focused fixtures, including R1 where touched;
  zero rule-(B) clashes. M reference off/firing (§BV.3):

  | Case | M main off / firing CPU | M all-state max |
  | --- | ---: | ---: |
  | Citadel L4 | 7,697 / 8,060 | 8,112 |
  | Citadel L5 | 8,032 / 8,423 | 8,447 |
  | Spine L7 | 7,771 / 8,180 | 8,191 |
  | Spine L9 | 8,025 / 8,435 | 8,446 |
  | Bastion L10 | 8,058 / 8,467 | 8,478 |

  Relevant existing tools: `scripts/measure-boss-stress-{r2,field,r4}.mjs` and
  `tests/boss-{region-2,region-3,region-4,stress}.test.mjs`,
  `tests/lance.test.mjs` and its `tests/lance-states.mjs` cases. Inspect
  current arguments/test names before invoking; do not launch a broad suite.
- Boss entry for every region **≤350 host frames**; M baseline
  **325/340/340/344** (§BV.6). Prove no L2 PC/read after slot overwrite through
  fight, death and summary; reload succeeds on post-boss START GAME. The planned
  phase body moves before takeover, never onto a boss-shared spawn path.
- Level-start timing: same current/new scripted route, patched OS SIO and
  standard direct SIO, cold and post-boss; per-run sectors/checksum/retry,
  raw transfer/INIT time and visible summary delay separately. Added standard
  read/init **≤100 frames**; failed/corrupt run never executes. Because loading
  changes, run short `npm run boot:smoke --
  --atari800-source=build/atari800-trace`, with current loading guards, RESET
  and real-hardware-compatible direct SIO. No release trace regeneration.
- Menu unaffected: cold input-ready **≤650 patched frames**, added standard
  return delay **≤50 frames** (§BV.2/.6); menu run unchanged, after-boss menu,
  options/scores/GAME OVER/pause remain valid. No menu L2 dependency/read.
- Owner smoke: real PAL 65XE + SIO2SD campaign, EASY/HARD obstacle choices,
  brake release/half speed, fair warning, long capital and transition after
  boss; only owner sets OWNER-ACCEPTED. Build → owner plays → merge.

### NOT required

No full `npm test`, runtime wall-trace regeneration, stage-2 evidence pass,
`failures:reconcile`, `build:release`, package/release, showcase regeneration,
hash-bound GIF per variant, RED-first workflow, ledger deviation rows or
second broad test pass. §BM/§BR win. Focused changed-behaviour checks and the
normal build's computed gates remain required. Release-evidence pending is
explicit; it does not turn estimates into current release evidence.

## Risks, proposed STOP conditions and owner choices

- **Layout/lifetime:** STOP if any phase has concurrent ownership of L2, any
  interrupt/shared boss reader reaches it after overwrite, or re-entry can
  skip a checked reload. Keep exact conflict range/caller evidence.
- **Size:** STOP if first contents exceed **M 1,792 B** with shared rendering.
  Reprice as soon as the **E 1,024-B** first-content or **E 32-B** final margin
  is consumed. Do not treat optimistic dock/bonus budgets as accepted fits.
  A branch-cross or C-code expansion can spend the small resident tails;
  keep hot symbol addresses and regenerate all LIFE/guard/vector consumers.
- **Latency:** STOP at added standard-SIO **>100 frames**. Recovery options:
  (a) transfer only occupied L2 sectors, preserving a separate in-slot BSS
  clear (E first image roughly **8 sectors**, saves roughly **23 frames**,
  future reads grow with use); (b) existing deterministic packed transport
  with checked packed run then bounded expansion (compression and code cost
  unmeasured, price first); (c) reduce first art set/data while retaining
  geometry. No mid-sector read or faster-SIO assumption is a recovery.
- **Timing:** STOP for any hard frame/DMA/fence violation, missed frame,
  unexpected VBI/DLI anomaly, boss stress **>8,500** or delta **>+2**, or boss
  entry **>350**. Compare real linked pages; do not relax pins or put a new
  L2 phase test in the boss spawn path to hide a placement failure.
- **Geometry/fairness:** STOP for lost high bits, skipped/duplicated row event,
  invalid longer-axis station lookup, insufficient side channels, premature
  DRAIN, debris surviving into an island approach, failed restore or stale
  cache. Brake+warning together were not native-certified by the spike;
  the longer warning can suppress offscreen charges and needs owner smoke.
- **Scope:** STOP for a new renderer/collision architecture, glyph-bank redesign,
  conflicting owner decisions, or need to spend protected reservations. Report
  compliant alternatives with exact byte/cycle recovery before proceeding.

Open owner choices before Phase B art: which of the five designs (and whether
all are wanted) should be used? Both allied and enemy variants are required.
Proposed reserve choice: **E 256 B** fits the full later-consumer ledger;
**E 512 B** needs **E 224 B** recovered/re-scoped. Proposed author minimum/
alignment/defaults and standard/sparse placements above await plan approval;
no routine code choice or art selection is inferred from this review session.

**Phase A complete; STOP.** No Phase B implementation, merge or release is
included. The branch is pushed for owner/reviewer access; the campaign ATR is
unchanged and remains the accepted L1 build.
