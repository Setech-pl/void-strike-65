# L2 fighter/capital phase module — Phase A

Current: **audit-fixed OWNER-SMOKE CANDIDATE**; see [current measured results](#audit-fix-results--owner-smoke-candidate-2026-10-26). Earlier Phase A estimates and STOP checkpoints are historical.

**Phase A accepted by owner at `bac5e79`; Phase B stopped at a computed gate.** No production implementation remains. Code baseline
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


## Phase B attempted skeleton — computed gate STOP (2026-10-25)

Owner choices are recorded in §BW.7. The checked-load skeleton reached the
normal validator, which rejected MAIN Light free space: **MEASURED 15 B**,
required **MEASURED (declared) ≥16 B**. Adding the new expected run fold costs
**MEASURED 2 B**, while the baseline has only **MEASURED 1 B** spendable before
that gate. Phase A's forecast of 15 free bytes overlooked this existing gate.
The address-preserving summary load helper also measured **17 B**, not the
Phase A **ESTIMATE 10 B**; it fills the summary's tail while retaining `$0B58`.

The owner's “any computed gate failing” STOP applies. All incomplete production
changes are restored; normal build passes again and the campaign ATR is
unchanged. No L2 smoke candidate or Phase B timing/test certification exists.
See [exact evidence, scaffold patch and recovery alternatives](../diagnostics/l2-phase-b-gate-stop/).
Recommended recovery: keep MAIN/LIFE addresses fixed and put the new cold-only
checksum comparison/constant in the reader's **MEASURED 28-B** tail after its
new directory entry; **ESTIMATE 21 B**, leaving **ESTIMATE 7 B**. Not implemented.


### Phase B continuation — option A and standing placement rule

Owner chooses option A: preserve MAIN/LIFE addresses; cold L2 checksum extension
in the sector reader, no per-frame work. Resume the accepted Phase B scope.

Standing rule: when a computed gate fails **only because of byte placement**,
apply a recovery and continue if every gate passes without relaxing assertions,
no protected reservation is used (menu `$0C00-$117F`, summary-owned contents
`$0500-$0BEE`, MAIN `$3615-$3AEE` layout, M3-H `$549E-$54BD`, `$B8FB-$B8FF`,
the L2 post-1.0 reserve **256 B**), no per-frame cycles or new per-frame page
crossing is added, and the complete fix costs **≤32 B**. Record measurements.
All other gate failures remain STOP, including timing/correctness/stress/entry/
load/menu and first contents **>20%** above the **1,024-B** budget.

Risk: the address-preserving reload helper measured **17 B**, not the Phase A
**ESTIMATE 10 B**. Summary is **1,792/1,792 B**; M4's next-level loop and grade
screen must find room there or relocate. Do not spend its existing contents.

## Phase B results — native acceptance STOP

**BLOCKED_FOCUSED_PAL_ACCEPTANCE**, 2026-10-25. These measured checkpoint
results supersede Phase A estimates; they do not mark Phase B complete.
[Evidence/reproduction and recovery choices](../diagnostics/l2-phase-b/).

Option A is implemented: **MEASURED 19 B code + 2 B fold** in the reader tail;
MAIN's same-size JMP reaches **MEASURED `$A5E4`**, then returns to the pinned
MAIN guard comparison. Existing MAIN/LIFE labels remain unchanged. Checked
entry **MEASURED 11**, sectors **MEASURED 251-264**, padded **MEASURED 1,792 B**,
fold **MEASURED `$B8AA`**. Real read/reload/corruption tests pass. No new
per-frame callback belongs to interrupts, audio, Light or shared spawn.

| Item | MEASURED checkpoint | Evidence |
| --- | ---: | --- |
| L2 ABI/init/wrapper/displaced renderer trampoline | 45 B, `$1900-$192C` | `build/l2.lst` |
| Bounded interval | 142 B, `$192D-$19BA` | `build/l2.lst` |
| Contact/nearest-side/canonical damage | 199 B, `$19BB-$1A81` | `build/l2.lst` |
| Shared-row island publication / full-width commit | 116 B, `$1A82-$1AF5` | `build/l2.lst` |
| Non-executed table alignment | 10 B | `build/l2.lst` |
| Indexed tables / approved recipes | 123 B = 15 + 108 | `build/l2.lst`, editable recipe JSON |
| ASM scratch | 14 B | `build/l2.lst` |
| C rates/state | 12 B | `build/l2.lbl` |
| C phase / entry+lookup | 93 / 152 B | `build/l2.lbl` |
| C brake including warning alignment | 118 B, including 17 B padding | `build/l2.lst` |
| C bottom warning | 23 B | `build/l2.lbl` |
| Total first contents | **1,047 B** | `build/l2.map`, +23 vs planning budget; below 1,228 gate |
| Remaining / reserved / otherwise free | **745 / 256 / 489 B** | linked checkpoint |
| Later dock / bonus | **ESTIMATE 352 / 128 B** | Phase A estimates; not implemented |
| Remaining after later estimates | **ESTIMATE 9 B**, reserve intact | 489 − 352 − 128 |
| Resident reader / summary / Director delta | **MEASURED +26 / +17 / −9 = +34 B** | maps/manifests |
| Level data / disk delta | **MEASURED +384 B / +17 sectors** | level16 vs13, L2 adds14 |
| Active linked used-byte delta | **MEASURED +1,465 B** | 1,047 +34 +384, no reservation growth |
| Initial content / boot+chunk sectors | **MEASURED 12,807 B / 210**, −22 B / zero delta | normal build manifest |

The original row renderer remains single. Hooks retain their byte lengths and
addresses. The C sector segment stays **MEASURED 241/248 B**, including
**MEASURED 95 B** reclaimable pinned padding; it is not yet free linked tail.
MAIN Light **MEASURED 1,196 B**, tail **MEASURED 17 B**. Reader **MEASURED
1,529/1,536 B**, tail **MEASURED 7 B**. Director high **MEASURED 634 B**, tail
**MEASURED 11 B**. Summary **MEASURED 1,792/1,792 B**: helper **MEASURED 17 B**
rather than **ESTIMATE 10 B**. **M4 risk:** next-level loop and grade screen
must find room or relocate; its current contents are not spare memory.

Placement recovery under the standing rule: **MEASURED 27 B** non-executed
padding (table **10**, warning **17**) avoids all new indexed/branch page
penalties. No protected reservation, per-frame cycles or assertion change.
The complete [page-cross table](../diagnostics/l2-phase-b/l2-page-cross.md)
reports **MEASURED zero** new per-frame crossings. Guard option A has
**MEASURED zero** per-frame cost. Detailed row/contact/brake worst CPU costs
remain pending; no Phase A estimate is promoted to a runtime measurement.

| Measurement | MEASURED result / status | Artifact |
| --- | --- | --- |
| Normal computed CPU/DMA/fence/block/window/disk gates | PASS; CPU DMA-off 16,471 incl option poll; additive diagnostic ESTIMATE 29,371; stale release evidence WARNING | linked-checkpoint.json, normal build log |
| Short HARD campaign flight | 2,300 frames, peak31,424; zero misses/DLI | 480-hard-neutral-focused-run.json |
| HARD 960 brake capital portion | 3,064 frames, mean10,139.62 / peak17,128; zero misses/DLI; full coordinate0-968 | native-stop.json |
| Synchronization / warning | 3,064/3,064 residues equal; rates10-20; warning35 | 960-hard-clock.csv.gz |
| After boss handoff | **FAIL**, gameplay peak39,437, 1,285 misses, 3,852 DLI errors | failed focused acceptance |
| Limits retained distinctly | target31,500 / hard32,568 / physical35,568 | task/§BM/§BR |
| Required boss off/fire stress | all five cases match main, delta0; worst8,467, clashes0 | l2-boss JSON files |
| Prior all-state worst cases | R1 7,596; Citadel8,112/8,447; Spine8,191/8,446; Bastion8,478, unchanged | R1 log and off/fire/lost/swap outputs |
| Focused coordinate/compiler/island/brake checks | 14/14 PASS | l2-focused-tests.log |
| Real loader/placement subset | 10/10 PASS | l2-loader-final-tests.log |
| Backing / fallback / carry | 1,640 PASS; worst carry47 rows before first96 | backing.json |
| Projectile publication CPU | player987, enemy447, shell158; increments vs blank63 normal /610 Spread /55 enemy | backing.json |
| Cold raw read span, patched / standard | 49→113 frames, **+64** both; INIT-inclusive/post-boss gate pending | read-timing.json |
| Cold visible gameplay, patched / standard | 909→909 /1695→1695, **+0**; fixed summary wait absorbs read | SIO current/main JSON |
| Cold input-ready menu, patched / standard | unchanged598 /1384 | SIO current/main JSON |

The long route's failure starts after capital completion, at boss handoff.
A game lifetime defect versus host observer PC alias in reused boss memory is
**unresolved**. No L2-after-overwrite safety claim is made. The byte-placement
exception does not apply, so implementation and remaining measurements STOP.
No candidate set is built or promoted. The summary-full risk remains recorded
in STATUS. The complete author schema is in `docs/level-authoring.md`.

Every edited test file: `tests/boss-claim.test.mjs`,
`tests/level-compiler.test.mjs`, `tests/sector-reader.test.mjs`, new
`tests/l2-coordinate.test.mjs`, `tests/l2-islands.test.mjs`,
`tests/l2-brake.test.mjs`. Assertions remain strict; fixture setup executes the
real checked level/L2 path. The old “13 sectors” test title is stale despite
its actual updated 16-sector assertions; documentation/test-name polish is
pending with the stopped work.

Remaining required matrix: all difficulties/both lengths with complete
unbraked/braked/contact routes and row/contact costs; protected writer checks;
all-region entry and no-L2-after-overwrite proof through death/summary;
post-boss read/init timing/menu/pause; short RESET/boot smoke; final candidate
build/provenance, owner smoke. **NOT required** items above were not run.

## Phase B current results — OWNER-SMOKE CANDIDATE

This section supersedes the earlier STOP checkpoint and Phase A forecasts.
Owner authorised recovery choice1, then choice2 if needed. The native logs
prove a **guest lifetime defect** in both lengths, repaired in `2af5b6d`:
boss install returns to the shared loop, whose brake JSR and rate read still
used overwritten L2. [Complete recovery evidence](../diagnostics/l2-phase-b/recovery/).
No timing gate or assertion is relaxed. Owner hardware acceptance is pending.

### MEASURED placement, ownership and budget

| Phase | `$1900-$1FFF` owner / callable contract |
| --- | --- |
| Boot / RESET | Uninitialised/OS-cleared; no gameplay call until checked level start |
| Menu | No active L2; stale fighter/boss/death bytes are not called |
| Level loading | Whole checked run11, sectors251-264, 1,792 B; fold `$9876`; failure never enters partial L2 |
| Start summary | Calls INIT only after full validation, including resident level-buffer hits |
| End summary | L2 inactive; no callback; next START GAME checks and reloads it |
| Fighter / capital | L2 owns the full slot; one resident hull renderer; all hooks armed |
| Boss entry | Before first read, resident blank/disarm `$8656` redirects brake JSR and zeros resident rate `$86B4`; state is drained to FIGHTER |
| Boss fight | Boss D owns slot; install replaces capital vectors before returning to shared loop; no stale L2 consumer |
| Boss death | Death code/data/buffer own slot; rate stays resident zero, hook stays disarmed |
| Next level start / future M4 | Checked whole L2 run + INIT after any overwriting interlude; re-arm only after success |

The physical CPU **does fetch from this range** during installed boss/death
execution. A literal range ban would contradict accepted slot D. The permanent
check therefore identifies stale L2 caller/read provenance, permits verified
boss/death code, and verifies the full reloaded L2 image before INIT. Native
logs cover first boss read through death, summary, menu and checked reload.
No VBI/DLI/audio/Light/shared-Director callback points into L2.

MEASURED recovery: **19 B cold code +1 B resident cached rate** in the old
95-B C-phase pad; **75 B** remain reclaimable. No new linked reservation or
protected tail. **16 B** L2 re-arm code appended after hot routines, preserving
their addresses. **+30 CPU once on transition**, INIT **30 CPU**, **+15 CPU**
versus the previous L2 INIT; **zero new gameplay-frame cycles/page crossings**
for the repair. The remaining standing byte-placement rule still applies;
the earlier **27-B non-executed alignment** remains valid and no reserve is used.

| Item | MEASURED linked bytes / data / disk | CPU bound / evidence |
| --- | --- | --- |
| ABI/init/wrapper/displaced-renderer trampoline | L2 45 B, `$1900-$192C` | cold INIT/re-arm30 CPU; lifetime tests |
| Indexed interval | L2 142 B, `$192D-$19BA` | included in row/contact bounds |
| Interval contact / clamp / canonical damage | L2 199 B, `$19BB-$1A81` | max1,267 CPU including resident damage path |
| Shared row publication / full-width commit | L2 116 B, `$1A82-$1AF5` | max1,939 CPU including original resident renderer |
| Table alignment / indexed data / recipes | L2 10 +15 +108 B | zero executed padding; no new glyph slots |
| ASM scratch / C rates-state | L2 14 +12 B | within L2; resident cached rate separately1 B |
| C phase / coordinate entry + lookup | L2 93 /152 B | phase105 CPU, cold entry3,464 CPU |
| C brake including warning alignment | L2 118 B, including17 padding | brake101 CPU; half/full rates8/16,9/18,10/20 |
| C warning | L2 23 B | max30 CPU; Y≥201 selects35, otherwise25 |
| Cold re-arm | L2 16 B, `$1D17-$1D26` | included in INIT30 CPU |
| Cold reader/checksum integration | resident +26 B, including19 code +2 fold +5 directory | no per-frame work; reader1,529/1,536 |
| Summary helper | resident +17 B | summary1,792/1,792, DL `$0B58` retained |
| Debris admission mask | resident −9 B | shared stress delta0; capital off, SPACE retained |
| Wider geometry / island page | data +128 /+256 B | full level16 sectors at `$A600-$ADFF` |
| Transport | L2 14 late sectors +3 extra level sectors; boot+1 | run checks and normal disk gates PASS |

Evidence: `build/l2.map/lst/lbl`, [resource snapshot](../diagnostics/l2-phase-b/recovery/resources.json),
[focused CPU checks](../diagnostics/l2-phase-b/recovery/l2-final-focused-tests.log),
[lifetime CPU checks](../diagnostics/l2-phase-b/recovery/l2-final-lifetime-test.log).
CPU-only numbers above are not DMA-on frame costs. No duplicated renderer.

| Ledger | MEASURED current / ESTIMATE future |
| --- | ---: |
| First contents `$1900-$1D26` | M1,063 B, below1,228-B first-content gate |
| Slot free | M729 B |
| Post-1.0 reserve `$1F00-$1FFF` | M256 B, intact |
| Otherwise free | M473 B |
| Later dock / bonus | E352 /E128 B, not implemented |
| Future forecast balance | E−7 B; reprice/reduce or move cold work later; never borrow reserve |
| Resident linked delta vs main | M+34 B; recovery consumes padding rather than enlarging C sector |
| Active linked used-byte delta | M+1,481 B =1,063 +34 +384 |
| Initial content / planning slack | M12,807 /845 B (gate13,652) |
| Initial / boot+chunk transport | M101 /211 sectors; +1 total vs main |

**M4 risk:** summary is full because the address-preserving helper measured17 B
rather than the Phase A estimate10. Next-level loop/grade screen must find room
or relocate. C-sector linked241/248 B, tail7; reader tail7; MAIN Light1,196 B,
tail17; Director high634 B, tail11. MAIN/LIFE pins and all protected reservations
remain fixed. Re-check the256-B reserve and future consumer forecasts at freeze.

### MEASURED verification

[Full 12-route table](../diagnostics/l2-phase-b/recovery/matrix-results.md):
**47,326 gameplay frames**, peak **31,598**, minimum fence **4,892**, zero misses,
extra VBI, DLI anomalies, shifted frames or distinct fence misses. Ten frames
exceed **31,500 target**, maximum +98; all are below **32,568 hard** and
**35,568 physical PAL**. Normal computed CPU/DMA/fence/block/window/initial-content/
disk gates PASS; CPU DMA-off16,471, additive diagnostic **ESTIMATE29,371**.
Native wall measurements remain separate from that diagnostic estimate.

All difficulties traverse both480 and960, unbraked and brake/contact. All world/
hull residues match; first axis480 or0 reaches968. Director ticks match their
16-bit counter; its unchanged DYING/GAME OVER gate still freezes progression
while the world scrolls, with zero unexplained row loss (`director-clock.json`). Prow928-959 and drain968
are exercised through high-byte boundaries, completion and return to SPACE.
No 960-specific admission/predictor path exists. Lookup indices0-119, bounded
host station selection, nesting and counts7/10/14,10/15/20,22/33/44 pass.
Warning reaches35; controlled checks cover the exact Y200/201 boundary and
8/9/10-frame ramps. Native central island pushes occur on every route; 82 capital damage frames
publish cooldown25.
SPACE debris remains; worst carry clears47 rows before first island96.
Backing1,640 cases pass, including cache/fallback/ring reuse, with zero native
stale projectile cells. Shield and lifecycle retain canonical damage policy.

Required lost-target off/fire stress matches main exactly: Citadel L4
7697/8060, L5 8032/8423; Spine L7 7771/8180, L9 8025/8435; Bastion L10
8058/8467, delta0, no clashes. Worst-state bounds remain7596,8112/8447,
8191/8446,8478. R1 runs all18 modes; other regions run off/fire/lost plus prior
worst swap where different. Boss entry325/340/340/344 ≤350. Four native death,
summary, menu and reload checks pass; the full reloaded L2 checksum is verified
before INIT. Native post-boss pause/resume passes499 frames, peak27,703.

| Load / menu measurement, MEASURED | Patched | Standard |
| --- | ---: | ---: |
| Cold read + completed INIT, main→L2 | 49→113, **+64 frames** | 49→113, **+64** |
| Post-boss read + completed INIT | 49→114, **+65 frames** | 49→114, **+65** |
| Visible level-start interval increase | cold0 /post-boss54 | cold0 /post-boss54 |
| Boot-only increase for extra sector | +1 frame | +5 frames |
| Cold input-ready menu | 599 ≤650 | 1,389 |
| Menu entry→input | 42 ≤50 | 42 ≤50 |

[Exact timestamp records](../diagnostics/l2-phase-b/recovery/load-timing.json).
No retries or corrupt/partial L2 execution. Cold, RESET, 130XE compatibility
and forced-capital-restore boot smoke PASS. Menu run bytes are unchanged.
[Every changed-routine/page table](../diagnostics/l2-phase-b/recovery/l2-final-page-cross.md):
zero new per-frame crossings; indexed tables stay in-page.
Native protected writer inventories retain only the existing phase owners;
M3-H and `$B8FB-$B8FF` have no runtime consumer. L2 reserve remains unallocated.

Edited tests: `boss-claim`, `boss-runtime`, `sector-reader`, `level-compiler`,
`l2-coordinate`, `l2-islands`, `l2-brake`, `l2-lifetime` (`.test.mjs`). Core17/17,
loader/claim subset10/10, lifetime at both lengths PASS, post-boss reload in all
four regions PASS; unchanged frontend/pause suite29/29 and map checks3/3 PASS.
The real checked load path is used. Old13-sector fixture bounds become exact
full16-sector comparisons; post-boss tests add complete-L2 and re-arm assertions.
Corrupt reads require zero partial-L2 fetches. No assertion is weakened.

The smoke ATRs are built from the final committed branch HEAD and copied to
`build/l2-owner-smoke/`; its `candidate.json` records absolute paths, SHA-256,
source HEAD and launch commands. Owner smoke list: cold menu; SPACE debris;
capital on ROOKIE/ACE with both colours; bottom brake and warning;960 test;
one boss; boss→summary→menu→START GAME; pause after boss. Only owner promotes
the result to OWNER-ACCEPTED. The earlier NOT required list remains unrun.

### Audit-fix results — OWNER-SMOKE CANDIDATE (2026-10-26)

These results supersede the pre-audit candidate measurements above. Owner
smoke of `b2b38ff` passed ("generally OK", 2026-10-25); the fixes await a new
owner smoke. Audit `668f692` merged unchanged in `66f53b9`; L2-01 `52ee66b`,
L2-04 `c77ebba`, L2-02/03/05/06/07/08 code `cba50fd`.
[Full measurements, test failures and reproduction](../diagnostics/l2-audit-fixes-2026-10-25/).

Owner correction: DYING/respawn in a capital keep the checked L2 valid.
Invalidate/disarm on boss install, GAME OVER, pause-quit, level teardown,
RESET/warm start and every L2 load head. Only checked load + INIT validates;
invalid START GAME returns to the checked reader. L2-04 costs32 new B,
L2-02 costs31; no protected reservation or new per-frame page crossing.
Brake arms only in a capital; contact is gated resident before jumping L2.
Death/capital completion intentionally snap to full speed; release retains
its ramp. Capsules move at half the braked world speed for every ramp step,
zero new bytes. C/ASM constants are generated and warning X preservation is
a fatal build check. Harness allowances are diagnostic only.

Final ledger: L2 **1,082/1,792 B**, **710 free**, **256 reserve intact**, 454
otherwise free; C sector 244/248, tail 4 plus54 reclaimable pinned padding;
reader 1529/1536 tail 7; summary 1792/1792 tail 0; MAIN Light 1196/1213 tail 17;
Director high tail11, C arena tail14, ENTITY_CODE tail5, HYBRID_C_EXT tail24,
A2 tail19. Initial content12,825 B, total211 transport sectors. Physical
linked delta vs `b2b38ff`: resident+3 B and L2+19 B. Future dock 352+bonus 128
remain ESTIMATES,26 beyond nonreserve space; no reserve borrowing.

**12 routes /47,326 frames**, 480/960 ×E/M/H ×flight/contact and
brake/contact: **10 frames exceed 31,500** (previously 10), peak **31,598**
(previously 31,598), maximum target excess 98. Hard gate 32,568: **970 cycles
margin**; physical 35,568: 3,970. Minimum publication fence **4,977**, capital
peak 17,660; zero missed frames, extra VBI boundaries, DLI errors, shifted
phase rows, world/hull clock mismatches or stale L2 accesses. Every route
reaches universal phase 968. Broadened lifetime checks PASS at both lengths,
through boss install and all real exits (8/8), including capital death and
respawn with validity retained.

SPACE CPU **−2 cycles** vs main `19b1464` in all 720 identical full-loop
fixtures, with predictor delta 0 for every Light. Boss lost-target/no-lance,
firing and swap stress matches main (all 20 deltas 0), max 8478≤8,500. Entry
325/340/340/344≤350; all four native death→summary→menu→START GAME reloads
pass, as does post-boss pause. Cold/RESET/130XE/forced-restore boot smoke
7/7. Focused edited gameplay files 98 tests:86 PASS/12 pre-existing FAIL,
all reproduced on fresh main by name and first assertion; generated map 3/3,
observer tools 4/4, generic debug reuse check1/1, regional Q-S4 checks 3/3.
All 13 boss-runtime tests reported:12 PASS, pre-existing "the win" FAIL.
No full tests/release/evidence regeneration. No gate or assertion relaxed.

Six final-HEAD normal-build ATRs: campaign,960-row capital and direct R1,
Citadel, Spine and Bastion. Absolute paths, SHA-256 and build HEAD are in
`build/l2-owner-smoke/candidate.json`; expected guest bytes are committed in
the audit diagnostics. NEXT TASK: owner smoke, then only after owner OK
record the result, normal branch build, authorized --no-ff merge, normal
main build and push. **OWNER-SMOKE CANDIDATE — STOP.**
