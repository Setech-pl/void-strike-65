# VOID STRIKE 65 — CURRENT STATUS

Last update: 2026-09-21

What is true now. Rules: [reguly-projektu.txt](reguly-projektu.txt). Roadmap:
[plan-realizacji.md](plan-realizacji.md). Source-of-truth order:
[README.md](README.md). Always verify local HEAD and artifacts before relying on
the values below.

> **One-document picture:** [project-overview.md](project-overview.md)
> consolidates roadmap, architecture, the measured memory map, decisions,
> backlog, the content target and the working method at HEAD `c31b220`, and
> lists every disagreement it found between these documents and the repo — this
> file's included (see its §8.3 and §8.4). It does not replace this file; this
> file stays the primary handoff.

---

## Checkpoint

### Repository HEAD

`wip/4.5d-gate-fail` (branched from `experiment/hybrid-c-director` at
`2a8ff26`; adds the 4.5d Enemy Identity Freeze WIP `7b50bd6`, the PAL timing
audit tooling, the death-frame deferral and its respawn double-image fix, and
Option D — the Heavy body-copy skip, now the accepted runtime checkpoint;
sections below).
`experiment/hybrid-c-director` carries the roadmap 4.4 Interceptor,
its 4.4b visual identity (X/quad art since `3838c00`),
the 4.4c hostile weapon visuals, the roadmap 4.5a Heavy window capacity
increment (superseded by the M3 arena), the 4.5b `BOMBER` weapon class, the
4.5M-M1 starfield staging swap and the 4.5M-M2 cold-record relocation (both
owner smoke PASS 2026-09-17), the 4.5M-M3 `HYBRID_C_ARENA`, the
emitter-independent hostile shots fix and the roadmap 4.5c Bomber (sections
below) on top of `f4cb18b`, the documentation-only reconciliation of
the owner acceptance recorded here. All of it runs in the accepted runtime
below and all of it is owner-accepted under that checkpoint.

**Four `OWNER-SMOKE CANDIDATE`s are outstanding: the roadmap 4.6 ring-rotate
token gate** (section "Roadmap 4.6 — the ring-rotate token gate" below;
72-replay PAL audit PASS with the worst fence margin 552 → 2,981, boot smoke
8/8, full-suite failure list identical to `4cd3024`), **owner decision A, the
ATR boot fix** (section "Owner decision A" below) — it changes the boot contract,
so it also needs a real-hardware smoke this session could not run —
**owner decision B, the open BASIC window**, and **the main-menu title colour
run** (sections below).

### Accepted runtime checkpoint

Commit `0002d84` — `perf(renderer): skip the P1/P2 body copy when a Heavy
member holds its Y` (Option D; owner smoke PASS 2026-09-18 over the whole
stack: the Bomber lane sweep, the Bomber attack-phase freeze — the longest skip
runs — the Raider crossing and pause/resume all render correctly, with no stale
or torn sprites).

XEX SHA-256:
`ecc9cedafd87f871989fc0b279343d1848c225792bf17e5be4ad9fadd1f7d3c7`

**Provenance of the hash.** It is measured from the existing
`dist/void-strike-65.xex` artifact in this worktree (2026-09-18) and matches
the XEX recorded in
[diagnostics/stage-2b2t-option-d-standing-cost.json](diagnostics/stage-2b2t-option-d-standing-cost.json).
**A clean-export reproduction of `ecc9ceda…` has NOT been re-verified since the
acceptance** — unlike `b4b942e`, whose reproduction was re-verified. Re-run
`npm run build:candidate -- --quiet` from a clean export of `0002d84` before
relying on this hash for a release or a hardware milestone.

**The stack this checkpoint carries (owner-enumerated, 2026-09-18):**

- roadmap 4.5c Bomber;
- the death-frame deferral (Option E);
- the respawn double-image fix;
- the debris score, on a player shot and on contact;
- the segment neighbour guards;
- the 4.5d enemy identity freeze (catamaran silhouette, HP-driven blue hull
  ramp);
- Option D — the `draw_enemy_member` `P1`/`P2` body-copy skip on frames where a
  Heavy member holds its Y.

**Measured state at this checkpoint:**

| Measure | Value |
| --- | --- |
| Worst fence margin | **1,464 cycles** (`raider-remnant-rapid-xex-hard` row 1945) |
| Distinct miss events | **0** across 69 audited replays |
| Native stale-body gate | **0** stale-body rows across 78,124 live-body frames |
| `HYBRID_C_ARENA` | **617 / 832 B**, 215 B free |
| `BROADSIDE` free tail | **3 B** |
| `ENTITY_CODE` free tail | **1 B** |

**Folded into the same acceptance (owner instruction, 2026-09-18).** The
increments that reached this binary as candidates — roadmap 4.4 Interceptor
with its 4.4b visual identity and 4.4c hostile weapon visuals, roadmap 4.5a,
4.5b, 4.5M-M1, 4.5M-M2, 4.5M-M3 and the emitter-independent hostile shots — all
run in `0002d84` and were exercised in the owner smoke. They are
**OWNER-ACCEPTED** under this checkpoint; a candidate label is not carried for
code that ships in an accepted binary. Each keeps its own section and its own
history below — only the status label changed.

It also contains everything the earlier accepted checkpoints carried: the
hybrid C Director foundation (`2df89da`), Light Wingman M1 (`41ace65`), the PMG
pickup raster fix and per-type capsule silhouettes (`f30754a`, `c2af6a6`),
step 4.3 Stage 1 reusable resident capacity (`fca5e31`, `0290d83`) and the
debris late publication with exact ownership (`b4b942e`).

Previous accepted runtime checkpoint: `0a90c1c` (XEX
`8940d646fcb2e59e54cb383de382ac86dfb4959f18016854919c3f5157b89d34`,
owner smoke PASS 2026-09-18); before it `b4b942e` (XEX
`965468077747f527b7d3f8ffeb7c37ace27377892ea5fc6f2e8aaf062d0d8a6e`,
owner smoke PASS 2026-09-16); before that `41ace65` (XEX `900152fe…`).

---

## Architecture

Hybrid **C/cc65 + ca65**, defined in
[hybrid-c-architecture.md](hybrid-c-architecture.md).

- C decides WHAT: Encounter Director, sector state, high-level lifecycle,
  `EnemyArchetype` (Raider, Light Wingman; Interceptor in the candidate),
  Raider and Light HP/state, Light archetype selection,
  admission/retire/recycle, formation motion, fire decisions, Director
  scheduling and RNG; progressively waves, AI, pickup policy, progression and
  boss state.
- ASM performs HOW: VBI/DLI, ANTIC/raster, PMG, Heavy, Light, debris and
  PairShot publication, character ring, backing/restore, hot collisions,
  hardware writes, audio hot paths, loader and XEX/ATR startup.

---

## Gameplay capability (accepted)

- Player Fighter movement and PairShot weapon (Normal/Rapid/Spread, Shield);
- two Heavy Raiders on P1/P2 with fire, contact damage, score and
  character-free destruction;
- one Light Wingman per Raider formation: character 2x1, centred behind Heavy
  slot 0, no side switching, published late after the playfield (no flicker),
  destructible, 5 points, retired before the capital sector; its 8-line
  vertical stepping relative to the leader is intentional and accepted;
- debris, published late with exact ownership (debris < effects < Light <
  PairShots < sparse near), visible from Y 24 in capital and post-capital
  fighter phases;
- Encounter Director Level 1, capital broadside traversal;
- fighter-sector pickup: deterministic admission (every third Raider kill by
  Player PairShot), PENDING/ACTIVE lifecycle, collection and boosters, visible
  as a fifth-player PMG mark published after the playfield, with a per-type
  capsule silhouette (Rapid slot, Spread fan, Shield crest) in `COLPF3`;
- white four-point starfield, one scanline per frame.

Deferred by the owner: smooth 1-line Light tracking (M2).

---

## CPU / RAM baseline (`2-evasive-fire3`, 920 PAL frames, XEX `96546807`)

| Measure | Value |
| --- | ---: |
| PAL max wall cycles | 29,258 |
| Target 31,200 headroom | 1,942 |
| Hard gate 32,568 headroom | 3,310 |
| Missed frames / extra VBI / DLI errors | 0 / 0 / 0 |
| Linked runtime | 17,495 B |
| Simultaneous residency | 20,986 B |
| Safe residency remaining | 1,201 B |

The three residency rows are the accepted-checkpoint CPU baseline's companions
only for the CPU columns; the byte columns above are re-measured at HEAD.

**Re-measured 2026-09-21 at `4d12d6e`** (finding F5 of
[plan-4.6-placement.md](plan-4.6-placement.md)). The rows read 17,521 / 20,131
/ 2,056 while `build/manifest.json` measured 17,495 / 20,986 / 1,201 — they had
not in fact been re-measured across roadmap 4.3 and Light multiplicity.
**Safe residency remaining has fallen by 855 B** since that table was written;
linked runtime fell 26 B because the Light ASM left `CODE`/`LIGHT_RESIDENT`/the
`STARFIELD` tail for its own window link, and simultaneous residency rose by
what the code window now holds at the same time.
(Corrected 2026-09-20: simultaneous residency and safe residency remaining read
20,128 / 2,059 here while `build/manifest.json` measured 20,131 / 2,056. The
manifest's own `runtimeCodeBudget.measurement` label was also corrected in the
same pass: it named five segments for a six-segment sum that includes
`PICKUP_CODE`.)

Reusable free capacity at HEAD (measured, `build/manifest.json` and the `.lbl`
files; the authoritative table is the current-checkpoint override section of
[memory-map.md](memory-map.md)): `HYBRID_C_EXT` tail 19 B, `HYBRID_C_SECTOR`
window **18 B**, `ENTITY_CODE` tail **1 B** (`$9D5D`), A2 kernel tail 19 B,
pickup stream fill **236 B**, BROADSIDE 6,653 B with a **3 B** free tail,
`HYBRID_C_ARENA` **114 B** free, `DIRECTOR_ABI` **11 B**, `DIRECTOR_C_LOW` 3 B,
pickup/collision record
1,170 of 1,277 B cold capacity. Packed STARFIELD is **1,780 B: 24 B under** the
1,804-B two-stream correction gate and 45 B under the 1,825-B hard staging
limit, since Light multiplicity step 1b moved the 31-byte resolver out of it
(2026-09-21; the segment was 1,811 B and 7 B over before). Use identical
replays when comparing CPU.

`ENTITY_CODE` is effectively full: 1 B. Its ca65 asserts measure against
`ENTITY_CODE_RESERVED_BYTES = $F00` (the `$9000-$9FFF` memory area), but the
first real neighbour is the `DIRECTOR_C_PRE` record at `$9D5E`, so those two
asserts guarded 675 B of phantom headroom and could not fire until 675 B of
somebody else's memory had been overwritten. The same class of phantom existed
for `DIRECTOR_C_LOW` (3 B) and `DIRECTOR_ABI` (1 B). Link-time
`__*_RAM_LAST__` guards now bound all four against their real neighbours, and
`scripts/build.mjs` refuses any negative free tail instead of publishing it in
the manifest. **Standing rule: any commit that changes a segment's size must
state the resulting free tail in its message and in the memory-map override
section.**

---

## PAL timing gate — distinct miss events

`scripts/pal-timing-audit.mjs` is the PAL frame-overrun gate. It runs on every
traced replay of `scripts/runtime-wall-trace.mjs` (baseline, targeted, debris,
forced and diagnostic sessions alike), reports per replay, writes
`build/runtime-wall-trace/pal-timing-audit.json`, and fails the run on any
distinct miss event. It also runs standalone over CSVs:
`node scripts/pal-timing-audit.mjs [--json <path>] <csv-or-dir>...`.

**The fence.** In fighter OPEN the main loop reaches `profile_after_sector` and
calls `publish_fighter_projectile_overlays`, which waits for VCOUNT `$77`.
`wait_frame_at_line` waits for VCOUNT `== $77` and then for `!= $77`, so arrival
anywhere inside PAL scanlines 238-239 still catches the fence; the deadline is
the start of scanline 240. Arriving at or after it costs one whole PAL frame.
The audit reports worst pre-wait cycles and worst margin to that deadline, and
confirms each verdict against the measured `profile_publication_begin` release
(0 disagreements across both full gate sets, ~245,000 traced frames).

**Distinct miss events.** An overrun row whose predecessor was still in the
normal loop phase is one miss event. After a miss the loop keeps starting one
phase later (fighter row start moves from scanline 18 to ~250-273) until a new
gameplay generation resyncs it; those shifted-phase rows are attributed to the
event that caused them, never counted as new misses. The normal phase is
derived per replay and per publication path from the modal start scanline.

**`missed_frames` and `extra_vbi_boundaries` are unreliable for overrun
detection** and are kept in the report for continuity only: both are derived
from `Atari800_nframes` boundaries crossed inside one traced iteration, and an
overrunning frame simply waits for the same VCOUNT one frame later, so they
report 0 through a real dropped frame. Raw counts of rows over 31,200 or 32,568
are equally unusable for comparing builds: they conflate one real miss with its
phase-shift aftermath (1,394 and 1,055 such rows for the two single miss events
measured below).

**Measured 2026-09-17/18.** Full gate set (66 audited replays; 67 on the
candidate, which also traces `weapon-pickup-overlap-2-hunt-fire4`).
`7b50bd6` (4.5d WIP, XEX `838a9686…`): **2 distinct miss events — FAIL**:
`debris-gate-0-neutral-fire0` row 3007 (pre-wait 25,656, margin −407) and
`raider-remnant-rapid-xex-hard` row 1945 (pre-wait 26,042, margin −765); worst
clean margin 137 cycles. `2a8ff26` (XEX `0e4721b2…`): 0 miss events, worst
margin 781. **Death-frame deferral candidate (XEX `b8ed318c…`): 0 distinct miss
events across 67 replays — PASS**; the same rows are still each replay's worst
row (they precede any replay divergence): row 3007 pre-wait 24,206, margin
**+1,043**; row 1945 pre-wait 24,811, margin **+466** (the worst of the set);
the former thin rows were death frames too and rose to 1,847 / 1,920 / 2,146.
**Respawn double-image fix (XEX `3ce1a1d6…`): 0 distinct miss events across 67
replays — PASS, and timing-neutral**: no session's worst fence margin moved in
either direction, row 3007 still pre-wait 24,206 / margin +1,043 and row 1945
still pre-wait 24,811 / margin +466 (still the worst of the set). The fix costs
nothing on the death frame and removes 809 cycles from the respawn frame, which
is not fence-bound.
Root cause of the two 4.5d misses (measured, native frame profiler): both misses are Light contact
kills inside `light_update`, which runs after the enemy update and the ring
rotate; the two Bombers' standing cost (`integration_update_enemy` 4,630
cycles per frame with two live *before Option D*: `heavy_member_update` ~946,
`draw_enemy_member` ~1,164, `erase_enemy_departing_row` ~56 per member) plus
the death (+4,317) and kill (+3,009) coincidence overran the fence; the 4.5d
behaviour itself adds +36 cycles to the death frame. **After Option D that
standing cost is 3,418-3,894 wall cycles per frame** (the range is the
held/moved mix: a member that holds its Y republishes only `HPOSP1,x`).
Cross-checked in the NMOS harness, where `update_enemy` with two live Bombers falls
from a 2,195-cycle mean (min 1,901) to a 1,532-cycle mean (min 1,058) and the
Raider stays level (1,517 → 1,467). Evidence:
[diagnostics/stage-2b2q-pal-timing-audit.json](diagnostics/stage-2b2q-pal-timing-audit.json),
[diagnostics/stage-2b2r-death-frame-deferral.json](diagnostics/stage-2b2r-death-frame-deferral.json),
[diagnostics/stage-2b2s-respawn-double-image.json](diagnostics/stage-2b2s-respawn-double-image.json).

**Option D — Bomber standing cost (XEX `ecc9ceda…`, commit `0002d84`) —
OWNER-ACCEPTED (owner smoke PASS 2026-09-18): 0 distinct miss events across 69
audited replays.** Full gate set re-run 2026-09-18 (default run through its
pre-existing abort, the post-abort `--only-session` list, the
`--raider-formation-only` and `--raider-sector-only` modes, `--debris-gate-only`
and `--raider-remnant-only`; 0 rows over target, 0 over the hard gate). The
worst fence margin is **1,464 cycles** at `raider-remnant-rapid-xex-hard` row
1945 — the same row that was the worst of the set at **+466** before Option D,
so the skip buys **+998 cycles** on the binding row; the next worst is 1,713 at
row 1963. The new native stale-body gate reads **0 stale or torn rows across
134,880 traced frames**, 78,124 of which carry a live `P1`/`P2` body: the
emulator rebuilds the expected plane from `ENEMY_MEMBER_STATE`, `ENEMY_Y`,
`ENEMY_ARCHETYPE` and the archetype body table on every traced frame, so the
skip's licence is verified rather than assumed. Byte-neutral in `BROADSIDE`
(6,653 B used, free tail still 3 B); packed transport 5,642 → 5,644 B, 45
sectors unchanged, ATR menu 554 against a 554 deadline. Every native gate
failure in the set is A/B-confirmed pre-existing (identical on a freshly built
`0a90c1c` worktree), including two the recorded procedure did not list:
`weapon-pickup-overlap-2-hunt-fire4` on the same GTIA/erase-draw invariant as
the recorded abort, and `raider-sector-xex-hard` "did not return to post-sector
OPEN"; the debris visibility gate's single post-capital blank on
`debris-gate-0-neutral-fire0` is likewise identical on `0a90c1c`. Evidence:
[diagnostics/stage-2b2t-option-d-standing-cost.json](diagnostics/stage-2b2t-option-d-standing-cost.json).

**Procedure correction (found during the Option D audit, 2026-09-18).**
`two-pmg-raiders-xex-hard` and `raider-sector-xex-hard` are **not**
`--only-session` ids: they are mode-gated and only run under
`--raider-formation-only` and `--raider-sector-only` respectively. A full gate
run driven from an `--only-session` list alone is therefore **silently two
replays short** — it reports 67 replays where the audited set is 69, with no
error. Both modes must be run explicitly.

## Measurement tooling (`scripts/measure-*`)

Rescued from a measurement session's scratchpad 2026-09-18 and committed so it
survives. All of it is MEASUREMENT ONLY — not part of the build, the boot smoke
or the test suite — and each file carries a header saying what it measures and
how to run it.

- [../scripts/measure-stage-profile-from-trace.mjs](../scripts/measure-stage-profile-from-trace.mjs)
  — the most valuable of the set: turns **any existing wall-trace CSV** into a
  per-stage native profile grouped by live population, with **no emulator
  re-run**.
- [../scripts/measure-population-harness.mjs](../scripts/measure-population-harness.mjs)
  — the shared JS NMOS-6502 population harness (pre-fence cycles directly
  comparable to the audit's `worst_pre_wait_cycles`); imported by the rest,
  needs a linked build in `build/`.
- `measure-population-harness-smoke.mjs` (5-frame boot check — run it first),
  `measure-population-drive.mjs` (N driven frames, worst frame by population),
  `measure-population-cost-deltas.mjs` and
  `measure-population-cost-distribution.mjs` (marginal cost of a Light, a
  debris object and each Heavy member, by A/B poking),
  `measure-frame-stage-calibration.mjs` and `measure-routine-call-costs.mjs`
  (inclusive JSR..RTS cost per routine),
  `measure-heavy-body-copy-skip.mjs` (the Option D A/B itself),
  `measure-starfield-row-cost.mjs` (per-row starfield budget for 4.6 nebulae).

These are the direct inputs to roadmap item 2, the population budget.

## 4.6 data architecture — proposal committed, not approved

[design-4.6-data-architecture.md](design-4.6-data-architecture.md) is committed
as of 2026-09-19 as a **design proposal**: not implemented, not a build plan,
and not an accepted scope. It is in the repository so that the owner answers
recorded against it have something to bind to.

The owner has answered six of its §10 decisions (owner decision 23): levels
load **from disk** (§10.1 variant B; the BASIC window `$A000-$BFFF` is
rejected), the ATR menu deadline is **re-based** (§10.3 → decision 22),
flight paths are **piecewise-linear segments** (§10.4), aimed fire is a
**column choice at admission** with no angled projectiles (§10.5), difficulty
scales **spacing but not counts** (§10.6), and the SWARM ceiling to ship is
**3** with the format allowing 4 (§10.7). §10.2 (the per-sector starfield's
placement) and §10.8 (the level-1 mapping) remain open.

**§7.4 of that design is void as a risk.** It assumed every 4.6 candidate that
grows a record decoded before the menu must be presumed to fail boot smoke
until measured. Under the re-based deadline that is no longer true: at 2 PAL
frames per occupied 128-byte sector, the full ~745 B resident ask of §7.3
costs **+6 sectors = +12 frames** (menu 554 → 566, 11.3 s), a 4 KB level bank
costs +32 sectors = +64 frames, and filling **every** free sector of the
single-density ATR (538 of them) still reaches the menu at ~1,630 frames
≈ **32.6 s** — half the 60-second budget, with a completely full disk. The
loader-ordering mitigation §7.4 proposed, and the rule-89 exception it would
have needed, are both unnecessary.

**What still constrains 4.6 is resident RAM, not boot time.** `HYBRID_C_ARENA`
has 215 B free, `BROADSIDE` 3 B, `ENTITY_CODE` 1 B, against a §7.3 deficit of
roughly 350-450 B. That is a placement problem and it is unchanged by the
re-basing.

## Roadmap 4.6 prerequisite — Light multiplicity — `OWNER-SMOKE CANDIDATE` (2026-09-21)

Branch `experiment/light-multiplicity`, from `main` at `82c155b`.
`docs/plan-light-multiplicity.md` steps 0-4, under **owner decision X** (the
level buffer 44 → 32 sectors) and four in-flight corrections recorded in the
plan as `[C1]`-`[C5]`.

**What it is.** The single Light slot became **four SoA slots**, 48 B at
`$7FC4-$7FF3`, with a shipped SWARM ceiling of **3** (format and ceiling are
separate; see `hybrid-c-architecture.md`). `light_leaderless` and
`light_post_burst_slot` are gone — the first is the `light_state` value, the
second one add at reload. The backing resolver is keyed by **screen address**
rather than glyph code, because with several slots the code no longer names a
cell and two slots may carry the same code. The glyph install is **hoisted out
of every frame** onto the admission frame. A **one-expensive-event token**
serialises the five things that can collide on a frame: the deferred breakup
spawn, the appearance install, an admission, a fire and a lethal hit.

**The provisional swarm wave is NOT in the default build.** It is measurement
scaffolding behind `--force-light-population`; real waves arrive with 4.6's
Director and WaveDef. The default build runs one Light exactly as before, so
every replay and every reviewed coverage clause passes unchanged (plan §2.4
`[C4]`, owner decision 2026-09-21).

**Placement.** The Light kernel is its **own link after main**
(`src/hybrid/light-kernel.s`, `cfg/light-kernel.cfg`), built by
`buildResidentModule` the way the sector reader is, landing in decision X's
code window above the Director link's C half. The boundary between the two
links is not a constant: `HYBRID_ASM_WINDOW_BASE` in `director-abi.inc` **is**
`__HYBRID_C_WINDOW_RAM_LAST__` from the same build, asserted at link time and
again against the XEX block. `main.s` reaches the kernel through a frozen
five-entry vector table and nothing else; the kernel reaches `main.s` through
the generated `build/light-kernel-abi.inc`.

**MEASURED.** Marginal cost of one Light, pre-fence, harness (n = 282):
**412 → 257 mean**, −38 %, because the install hoist is −234 and steps 1a-1c
added +79. Native `2-sweep-fire4`, 920 frames: worst pre-fence 19,186 →
19,676, margin 5,573, 0 miss events. Transport 195 → 203 sectors, eleven DFMC
records. Free tails: `HYBRID_C_EXT` 19 → **70 B**, pickup stream fill 7 →
**236 B**, code window **58 B**, `HYBRID_LIGHT_SLOTS` 5 B,
`HYBRID_LIGHT_STATE` 1 B, `DIRECTOR_ABI` 0 → **11 B**, `HYBRID_C_ARENA` 165 B.
**`STARFIELD` 1,811 → 1,780 B packed** — the resolver left it, which closed
the open correction-gate decision (below).

**GO for the ceiling of 3, MEASURED.** M1, eight sessions, 9,300 frames,
un-serialised: worst fence margin at three live Lights **6,227 standing /
4,941 where a slot emptied**, against a ≥ 500 requirement. The binding row of
the whole set is a **one-Light admission frame** (margin 2,205) — Light count
is not what binds, which is why admission became the token's fourth consumer.
M2 forces the coincidence the replays cannot guarantee (three Lights, a kill
and a volley on one frame) and measures the token saving at **513 cycles at
three Lights and 942 at four**, with a negative control that must show the
same frame costing more without it. Evidence:
[diagnostics/light-population-m1-2026-09-21.md](diagnostics/light-population-m1-2026-09-21.md).

**Not shipped:** a fourth live slot. The format allows it, no ceiling grants
it, and M2's four-Light result is recorded as evidence for a later owner
decision only.

### Step 5 — the CPU cost, where it is, and owner fix (a)

The full audit found **0 distinct miss events** but two fighter rows far below
anything this file recorded, both A/B-confirmed against a clean `82c155b`
worktree. Three rounds of work followed; all of it is per-function MEASURED in
[diagnostics/light-population-m1-2026-09-21.md](diagnostics/light-population-m1-2026-09-21.md).

| worst fighter-row margin | `82c155b` | after the slot-limit gating | **after fix (a)** |
| --- | ---: | ---: | ---: |
| `weapon-pickup-2-hunt-fire4` | 1,713 | 898 | **951** |
| `director-complete-1-natural-sweep-fire0` | 1,831 | 705 | **896** |

**These two are the sessions this work PROFILED, not the worst in the audited
set.** The full §5.1 re-run on the final binary (section below) found the
binding row of all 72 replays is `raider-remnant-rapid-xex-hard` frame 1945 at
**552** (`82c155b`: 1,464). Everything this section says about *where* the cost
is still holds — it is the same Light-class cost on a different replay — but
the worst margin to quote for this candidate is **552**, not 896.

**Where the cost is.** Both binding frames were profiled per function, inclusive
of callees, against the same `82c155b` worktree. On both, Light-class code
carries essentially the whole delta (+685 of +882 on one, +993 of +935 on the
other); the remainder sits in routines whose instruction counts are
byte-for-byte identical — ANTIC DMA redistribution as the frame's work shifts
later in the raster, not new work. Within the Light class it is `light_shot`'s
SoA slot loop, the lifecycle logic that moved from ASM into C, address-keyed
backing resolution, and the kernel's vector table (36-52 cycles a frame, as M1
said). **`light_publish` is not in the fence budget at all** — it runs in the
late window, after the fence — so the erase loop's full width costs wall cycles
and zero margin.

**Fix (a), the one change made.** `light_cell_resolve` walks
`light_screen_slot_limit` instead of all four slots. `light_publish` maintains
that byte from `screen_hi` — zeroed as the full-width erase loop clears each
slot, raised inside the render loop as a slot's `screen_hi` goes live, so a
lower slot still resolves over a higher one published moments earlier. It is
**not** `light_slot_limit`: that one is state-derived and drops beneath a slot
killed this frame whose cells are still on screen. Stale HIGH is safe by
construction; stale LOW is impossible.
`tests/light-wingman.test.mjs` "a published slot above the state limit is still
resolved" pins both halves and carries a negative control; deleting the
render-loop raise fails it.

**ASSESS 2026-09-21 — deny the token to deferrable consumers on rotate frames —
COSTED FOLLOW-UP, GO recommended, NOT implemented.** MEASURED: **both binding
frames are ring-rotate frames**, and in the profiled window the ring rotates on
every other frame. On `weapon-pickup-2-hunt-fire4` row 1963 the deferrable
event is `light_spawn_breakup`, **1,063 cycles**, claimed by the contact-kill
path inside `light_update` — which runs *after* the rotate, so a gate would see
it exactly and move it to frame 1964 (pre-fence 15,012, ~9,000 cycles spare):
that row's margin **951 → ~2,014** ESTIMATE. The test is a **single compare**
(`_director_c_world_row_tick` already runs once per rotate and can mark the
frame), plus **1 B with no home** — both Light RAM areas are exactly full.
Must NOT be deferred: the kill's score and sound (they never take the token
today), the fire cadence (gameplay, and it would make fire rate a function of
the scroll cadence) and the admission (entry rhythm — owner call). The
forced-coincidence test's constructed frame **is itself a rotate frame** in all
four arms, so it is the right home for the new test.
**Why it stops at a follow-up:** the starvation question. Rotate frames are
never consecutive, so that half holds, but a pending event today waits for "the
first later frame with a free token" with **no counter and no bound**.
**The forcing rule, for the next session to start from (owner, 2026-09-21):**
because rotate frames are never consecutive, **the gate need only apply to an
event's FIRST attempt** — an event already deferred once ignores the rotate
gate on its next try, which **bounds the delay at two frames by construction**,
with no counter and no forcing branch. That is **one bit per slot**, and the
slot already carries `BREAKUP_PENDING`, so a second pending value encodes it
without a new byte. **Estimated worth ~1,000 cycles of margin on the binding
frames.** Full costing: `plan-light-multiplicity.md` §4.6.

**OWNER DECISION 2026-09-21 — effect scheduling.** The token is already a
minimal effect scheduler — a per-frame budget, pending states, an ordered set
of consumers — and a 1-2 frame delay is invisible, so deferrable work can move
off frames that are already expensive. But it **redistributes peaks and does
not create capacity**: it makes burst effects affordable (explosions, breakups,
flashes, admissions) and does nothing for standing per-frame costs such as
parallax, a second star layer or a static Andromeda, which every frame needs.
**Do not build a general scheduler.** Grow the token one consumer at a time,
when a concrete effect needs it. Every new consumer must be **visual only** (no
gameplay, score or collision effect), **capture its position at enqueue**
rather than read state that may have changed, and have **at most two frames of
delay** before it is forced or dropped. The risk is the stale-state class this
project has already paid for twice — the respawn double image and the
launch-flash orphan. Generalise only if five or more consumers show a clear
pattern. Full text: `plan-light-multiplicity.md` §4.5.

**OWNER DECISION 2026-09-21 — the margin threshold.** The ~1,000-cycle figure
used through this work was a rule of thumb, **not a measured requirement**, and
is withdrawn as a gate. The requirements are **zero distinct miss events** and
the plan's own **500-cycle** GO threshold. Both audited sessions clear 500 with
zero misses, so **the resulting worst margin is accepted as the deliberate cost
of Light multiplicity** — four slots, shared appearance pairs and the C/ASM
boundary — and not as a defect to chase with bytes 4.6 will need. Several
hundred cycles a frame is the price of swarms.

**What 4.6 inherits — SUPERSEDED by the rotate-frame token gate below.** At
step 5 the worst margin was materially thinner than 4.6's design assumed:
**1,713 / 1,831 → 951 / 896**, with the set's own binding row at **552**. The
gate took the set's worst margin to **2,981** (section "Roadmap 4.6 — the
ring-rotate token gate" below), so that is the number 4.6 branches from.
**4.6 must still set an explicit per-frame cycle budget in its own plan before
implementation begins**, derived from the measured worst margin at the
checkpoint it branches from — not from the historical margins recorded
elsewhere in this file. See `plan-light-multiplicity.md` §4.4.

**Placement after fix (a).** The change needed 19 B in a kernel with a 17-B
window tail; the link guards caught the overrun.
`encounter_light_schedule_advance` moved from `HYBRID_C_WINDOW` to
`HYBRID_C_ARENA` — the coldest thing in the window, at most once per admission,
and an absolute `jsr` costs the same either way. The bound's byte fits neither
Light RAM area (`HYBRID_LIGHT_STATE` 16 of 16, `HYBRID_LIGHT_SLOTS` 60 of 60),
so it became its own 1-byte segment **`HYBRID_LIGHT_SCREEN` at `$8126`**, the
first byte of the unowned gap above `HYBRID_HEAVY_STATE`, asserted against both
neighbours at link time.

| segment | before | after |
| --- | ---: | ---: |
| `LIGHT_KERNEL` | 689 B | **708 B** |
| code window free tail | 17 B | **32 B** |
| `HYBRID_C_ARENA` | 684 / 832 B | **718 / 832 B** (114 B free) |
| extension composite | 874 B | **877 B** (tail 22 B) |
| unowned `$8126-$813F` | 26 B | **25 B** (`$8127-$813F`) |

### Step 5 — the gates on the candidate binary (MEASURED 2026-09-21)

Branch `experiment/light-multiplicity`. XEX SHA-256
`3bbee68dad5f24966ffca0254e8bfe95b6862fe548ecfb991d1434852281bb19`, ATR
SHA-256 `e3fdd326e6117505d79b3917acd07fd0189211333943ecd16363fed7c8e58a93`,
reproduced by `node scripts/build.mjs --candidate --quiet` from this worktree.

**§5.1 PAL timing audit — 0 distinct miss events across 72 audited replays,
137,000 frames, 0 rows over the 31,200 target and 0 over the 32,568 hard gate.
PASS.** Re-run in full on this binary (procedure correction below), summarised
with `scripts/pal-timing-audit.mjs` over every CSV. Evidence:
[diagnostics/light-multiplicity-pal-audit-2026-09-21.json](diagnostics/light-multiplicity-pal-audit-2026-09-21.json).

**THE BINDING ROW OF THE WHOLE SET IS NOT A FIGHTER ROW, and it is thinner than
the two sessions this work profiled.** MEASURED, and A/B'd against a clean
`82c155b` export on the same emulator build:

| replay | `82c155b` | candidate | Δ |
| --- | ---: | ---: | ---: |
| `raider-remnant-rapid-xex-hard` frame 1945 | **1,464** | **552** | **−912** |
| `director-complete-1-natural-sweep-fire0` frame 2557 | 1,831 | 896 | −935 |
| `weapon-pickup-2-hunt-fire4` frame 1963 | 1,713 | 951 | −762 |
| `raider-remnant-normal-xex-hard` frame 1963 | 1,713 | 951 | −762 |

**552 clears the plan's 500-cycle GO threshold by 52 cycles** (and is
superseded by the gate section below, which takes the same row to 3,972).
It satisfies the owner's two stated requirements — zero distinct miss events, and ≥ 500 — and it
is the same row and the same replay that `0002d84` recorded as its worst
(1,464), so the delta is like-for-like and is the Light-class cost measured
elsewhere in this section, not a new mechanism. **But it is 52 cycles of
headroom, not 396**, and anything 4.6 adds to a Rapid-fire remnant frame spends
it. The rotate-frame token gate below is the cheapest recovery and is costed.

Behavioural clauses in the same run, every one A/B-confirmed pre-existing:
`capital-contact-{allied,hostile}-medium` and
`lower-playfield-hostile-contact-xex-hard` (16 consecutive contact rasters),
`raider-sector-xex-hard` ("did not return to post-sector OPEN"), the default
run's terminal pickup-raster abort, and the debris visibility gate at 2/3 —
`debris-gate-0-neutral-fire0` post-capital **1 blank / 1,558 in view, 1
disappearance**, byte-identical to the figure recorded for `0a90c1c`. The other
two debris replays are 0 blank / 0 disappearances.

**PROCEDURE CORRECTION, MEASURED 2026-09-21.** The recorded procedure says the
default `runtime-wall-trace.mjs` run aborts after 21 sessions at
`weapon-pickup-contact-2-hunt-fire4`, so each later session must be re-run with
`--only-session=`. **That is no longer true**: the default run now completes all
**64** sessions and throws the pickup-raster invariant at the very end, after
writing every CSV. Only the four mode-gated runs
(`--raider-formation-only`, `--raider-sector-only`, `--debris-gate-only`,
`--raider-remnant-only`) are still needed, which brings the set to 72 replays
and the wall time to roughly a third of what the per-session loop costs.

**§5.6 native gates.** Boot smoke **8/8** on both media against the re-recorded
`boot-deadline-baseline.json`: XEX 135 / 392 unmoved, ATR 336 / 593 → **338 /
595**, +2/+2 for the one transport sector fix (a) costs (203 → **204**), inside
the +10 warn band. The reader's level image at `$A600` compares byte-exact in
every session (identical `level_checksum`) and command frames stay **XEX 0 /
ATR 2** with 0 wire retries. cc65 audit: **C stack 0 B**, zero-page 0 B, and no
cc65 runtime helper is linked in any of the six maps. Write-watch: the
`$7FC4-$7FFF` classification recorded in the diagnostics file stands — fix (a)
adds no writer to that range, and its own byte is `HYBRID_LIGHT_SCREEN` at
`$8126`, a 1-byte segment ld65 gives exclusively to it, bounded by named
asserts against both neighbours.

**Residency, the three metrics separate** (`build/manifest.json`, against a
clean `82c155b` export built the same way):

| metric | `82c155b` | candidate | Δ |
| --- | ---: | ---: | ---: |
| Linked runtime | 17,521 B | **17,490 B** | **−31** |
| Simultaneous residency | 20,149 B | **20,973 B** | **+824** |
| Safe residency remaining | 2,038 B | **1,214 B** | **−824** |

Linked runtime *falls* because the Light ASM left `CODE`/`LIGHT_RESIDENT`/the
`STARFIELD` tail for its own link; simultaneous residency rises by what the
code window now holds at the same time.

**Free tails as measured at the candidate** (the authoritative table stays the
current-checkpoint override section of [memory-map.md](memory-map.md)):
`HYBRID_C_EXT` **22 B**, `ENTITY_CODE` **1 B**, pickup stream fill **236 B**,
A2 kernel **19 B**, `HYBRID_C_SECTOR` window **18 B**, `HYBRID_C_ARENA`
**114 B** (718 / 832), code window **32 B** (C half 796 B + `LIGHT_KERNEL`
708 B of 1,536), `BROADSIDE` **3 B**, `HYBRID_LIGHT_STATE` **0 B** (16 of 16),
`HYBRID_LIGHT_SLOTS` **0 B** (60 of 60), unowned `$8127-$813F` **25 B**,
packed `STARFIELD` **1,780 B** (24 B under the 1,804-B correction gate).

**Tests — focused set of plan §5.5, every failure A/B'd against a clean
`82c155b` export built the same way.** Green, 13 files: `light-wingman`,
`light-interceptor`, `light-multiplicity`, `hybrid-lifecycle`,
`source-contracts`, `enemy-combat`, `chunk-loader`, `sector-reader`,
`starfield-staging-streams`, `pal-timing-audit`, `focused-pal-acceptance`,
`heavy-bomber`, `debris-score` — every Light-class file among them.

Two rebaselines this step owed and paid, both in `light-interceptor`: the
`HYBRID_C_EXT` tail 25 → **22 B** (fix (a)'s initialiser) and the
`HYBRID_LIGHT_SLOTS` segment 48 → **60 B** (48 B is the ten per-slot arrays
plus the cell-major backing — the whole segment only at step 1a; steps 2-4 put
the resolver scratch, the appearance pairs, the ceilings, the live count and
the wave state beside them).

**Known remaining issues — 11 pre-existing failures.** The clean `82c155b`
export fails the same 12 tests this worktree did before the two rebaselines
above; `light-interceptor` is now green and the other 11 are untouched, so none
of them belongs to this work:
`hybrid-c-arena` ×2, `entity-effects` ×3, `runtime-timing` ×3, `layout-d1`,
`transport-layout-regression` and `formats` — the set recorded under
"Known open defects", which has grown since it was last enumerated there. **`hybrid-c-arena` and `layout-d1`
were deliberately NOT rebaselined.** Their frozen numbers were already stale at
`82c155b` — the arena test expects `codeBytes` 504 against 535 there, and
`layout-d1` expects 13,113 against 13,196 — by a drift this work did not cause
and cannot account for. Rewriting a frozen-budget guard to match a number
nobody has explained would launder a pre-existing defect into this commit, so
they stay red and stay listed. What this work *did* move in them is stated for
whoever clears them: arena `asmBytes` 71 → 90 and `codeBytes` 535 → 589,
free 187 → 114; `layout-d1`'s figure 13,196 → 13,197; DFMC records 9 → 11.

---

## Roadmap 4.6 — the ring-rotate token gate — `OWNER-SMOKE CANDIDATE` (2026-09-21)

Branch `main`. XEX SHA-256
`d667d88d742b9febf3c8c4a45d79f9500b3391278011428b68b8bf5c21f5283f`, ATR
SHA-256 `514dba491a61111ec33d69bb883312a3cf1c333e466adb938a27fc478054fb26`,
reproduced by `node scripts/build.mjs --candidate --quiet` from this worktree.
`plan-light-multiplicity.md` §4.6 costed it; §4.7 records what shipped.

**What it is.** A DEFERRABLE consumer may not claim the one-expensive-event
token on a frame the background ring rotates. `advance_starfield_layers` — the
one place a rotate is decided, reached exactly once per rotate — stores
`frame_counter` in `light_rotate_frame`, 1 B at `$8127`;
`light_take_deferrable_token()` compares it against `FRAME_COUNTER` and
refuses without burning a token. The two deferrable consumers are the breakup
spawn and the appearance install. **The kill, its score and its sound are not
gated** and land on the frame the Light dies, as before.

**The starvation bound, which is why §4.6 stopped short before.** Rotate frames
are never consecutive, so the gate need only apply to an event's FIRST attempt.
`BREAKUP_PENDING` is already the one bit of per-slot history that says "this
event has been deferred once", so the retry in `light_tick_body` is now
**ungated — no rotate marker, no budget** — and the delay is bounded at two
frames by construction, with no counter. That also removes the unbounded
"first later frame with a free token" wait the token had before this change.

**Never consecutive, proved against the source and not the replays.**
`src/main.s` asserts `WORLD_SCROLL_RATE_HARD*2 <= WORLD_SCROLL_RATE_DENOMINATOR`
(10*2 <= 20), with the accumulator proof beside it: both branches of
`update_starfield` run the same fraction r/D, `scroll_accumulator` is the
residue so it is always < D, a rotate leaves acc' = acc + r - D, and a second
one would need acc >= 2D - 2r >= D. `scripts/capital-hulls.mjs` fixes
EASY < MEDIUM < HARD on the source data, so HARD is the bound.

**PAL timing audit — 72 replays, 137,000 frames, 0 distinct miss events, 0 rows
over the 31,200 target, 0 over the 32,568 hard gate. PASS.** Evidence:
[diagnostics/light-rotate-gate-pal-audit-2026-09-21.json](diagnostics/light-rotate-gate-pal-audit-2026-09-21.json).
A/B against `4cd3024` on the same instrumented Atari800 build:

| replay | frame | `4cd3024` | candidate | Δ |
| --- | ---: | ---: | ---: | ---: |
| `raider-remnant-rapid-xex-hard` | 1945 | **552** | **3,972** | **+3,420** |
| `director-complete-1-natural-sweep-fire0` | 2557 → 3631 | 896 | **2,981** | +2,085 |
| `raider-remnant-normal-xex-hard` | 1963 | 951 | 4,179 | +3,228 |
| `memory-integrity-{xex,atr}-2-hunt-fire4` | 1963 | 951 | 4,179 | +3,228 |
| `debris-effects-2-sweep-fire4` | 4189 | 3,740 | 3,737 | **−3** |
| `memory-integrity-atr-2-evasive-fire4` | 2013 | 3,899 | 3,868 | **−31** |

**Worst fence margin across the whole set 552 → 2,981**, on
`director-complete-1-natural-sweep-fire0` frame **3631**. The three binding
rows of the candidate are **2,981**, then `debris-effects-2-sweep-fire4` 3,737
and `memory-integrity-{xex,atr}-2-evasive-fire4` 3,868. The last two rows of
the table are frames where the gate does not fire: they pay its overhead and
nothing else, which is **3 to 31 cycles** and is the honest cost of the
change.

**The recovery is larger than the ~1,000-cycle ESTIMATE, and the reason is
measured.** §4.6 costed `light_spawn_breakup` alone at 1,063 cycles. Moving the
spawn off the frame also moves the FIRST RENDER of the effects it allocates,
which happens later in the same pre-fence window. `maximum_wall_cycles` is
unchanged on both remnant rows (30,605 → 30,602; 30,373 → 30,373) while
`worst_pre_wait_cycles` falls 24,713 → 21,293 and 24,298 → 21,070: the same
work, on a different frame.

**Behavioural clauses, every one A/B-confirmed pre-existing and byte-identical
to the figures recorded for step 5:** the two `capital-contact-*` and
`lower-playfield-hostile-contact-xex-hard` raster clauses, the default run's
terminal pickup-raster abort, `raider-sector-xex-hard` "did not return to
post-sector OPEN", and the debris gate at 2/3 with
`debris-gate-0-neutral-fire0` post-capital 1 blank / 1,558 in view, 1
disappearance.

**Harness measurement of the constructed frame** (`measure-population-harness`
units, NOT comparable to the native figures above), three Lights, contact kill,
token budget 8:

| frame | `4cd3024` | candidate |
| --- | ---: | ---: |
| rotate frame, pre-fence | 10,099 (spawn lands) | **7,827** (spawn deferred) |
| the next frame, pre-fence | 7,308 | 7,598 (spawn lands) |
| non-rotate frame, pre-fence | 8,961 | 9,030 |

The §5.2 negative control had to be re-based: its constructed frame was a
rotate frame by accident, and on one of those the gate denies the deferrable
half in BOTH arms, so the control measured the gate instead of the token
(saving 513 → 212 at three Lights). It now runs on a deliberately non-rotate
frame, where only the token can act: **528 saved at three Lights, 985 at
four** against 514 / 943 at `4cd3024`.

**Boot smoke 8/8** on both media against a re-recorded
`boot-deadline-baseline.json`. Transport 204 → **205 sectors**: 6 B of marker
store in `STARFIELD` re-packs that stream 1,780 → **1,785 packed B**. ATR
milestones 338 / 595 → **339 / 596**, +1/+1, inside the +10 warn band; XEX
unmoved at 135 / 392. The level image at `$A600` compares byte-exact in every
session and command frames stay **XEX 0 / ATR 2** with 0 wire retries.

**Placement.**

| segment | before | after |
| --- | ---: | ---: |
| `HYBRID_C_WINDOW` (C half) | 796 B | **801 B** |
| code window free tail | 32 B | **27 B** |
| extension composite | 877 B | **880 B** (tail 19 B) |
| unowned `$8127-$813F` | 25 B | **24 B** (`$8128-$813F`) |
| packed `STARFIELD` | 1,780 B | **1,785 B** |

`HYBRID_LIGHT_STATE` (16 of 16) and `HYBRID_LIGHT_SLOTS` (60 of 60) are still
exactly full and neither grew; the marker took `$8127` as its own 1-byte
`HYBRID_LIGHT_ROTATE` segment with named ld65 asserts against
`HYBRID_LIGHT_SCREEN` below and the gap's end above, the same answer fix (a)
gave at `$8126`.

**Two deviations from the §4.6 costing, both stated in
`plan-light-multiplicity.md` §4.7.** The appearance install has no per-slot
deferred-once bit, so its gate applies to every attempt — still bounded at one
frame by the cadence itself. And the marker is one frame stale on the PairShot
kill path, because `update_starfield` runs after
`update_player_fighter_weapon`; that is conservative in the only direction that
matters (it can miss a saving, it can never deny on a non-rotate frame), and
the contact-kill path §4.6 measured on the binding frame is inside
`light_update`, which runs after the rotate and sees the marker exactly.

**Tests.** Three new in `tests/light-multiplicity.test.mjs`, each A/B'd against
a build with the gate removed and a build with the forcing rule removed: the
breakup spawn does not land on a rotate frame (fails without the gate); a
breakup deferred once lands on the very next frame with the budget poked to
zero (fails without the forcing rule); two ring rotates can never land on
consecutive frames (the premise, re-run over the linked rate table for all
three difficulties). Five frozen contracts rebaselined with the reason in
place: `hybrid-lifecycle` (extension 880 B; the token call-site freeze, now
four claim sites with the two deferrable ones behind the wrapper),
`light-interceptor` (`HYBRID_C_EXT` tail 19 B), `light-wingman`
(`ENTITY_CODE` staging margin 77 B) and `entity-effects` (the
`advance_starfield_layers` source shape).

**Full suite: 732 tests, 613 pass, 116 fail — the failure list is IDENTICAL to
`4cd3024`'s**, 0 new and 0 fixed, A/B'd from a clean worktree export of that
commit built the same way. The 116 are the pre-existing set recorded under
"Known open defects".

---

## Roadmap 4.3 — resident direct-SIO sector reader — `OWNER-SMOKE CANDIDATE` (2026-09-20)

Owner decision W's reader exists, is transported on both media, and runs at
START GAME. Steps 1-4 of `plan-4.3-sector-reader.md`; steps 5-7 are open.

**What it is.** `src/hybrid/sector-reader.s`, its own link at `$A000`
(plan §4 `[C5]`), transported as the ninth DFMC record, RAW, direct-landing.
**1,466 B of 1,536; 70 B free.** Steps 1-7 of the plan are complete. Level buffer `$A600-$BBFF` (44 sectors),
BSS `$BC00-$BC14`, 2 B of zero page at `$A0`. START GAME reaches it through a
frozen vector table at `$A000`, an operand-only change that cost MAIN nothing:
`CODE` still ends `$3174` and `RODATA` `$3FF6`, exactly as before.

**Three corrections to the approved plan, measured not assumed.** A register
probe run before any reader code existed found three defects in plan §1.1 that
no automated gate would have caught. `SKCTL` is `$23`/`$33`, not a single
`$13` — `$13` clocks the output from the external clock, so the command frame
never reaches the wire and the reader would have returned `NO_DEVICE` on every
medium. The `SKSTAT` mask is `$A0`, not `$C0` — bit 6 is the *keyboard*
overrun. And the command frame needs the 750-1600 µs pre-frame delay that
§1.2 omitted. All three are folded into the plan in place and guarded by
tests. Evidence:
[diagnostics/sio-register-probe-2026-09-20.json](diagnostics/sio-register-probe-2026-09-20.json);
protocol facts with citations:
[diagnostics/sio-protocol-facts.md](diagnostics/sio-protocol-facts.md).

**MEASURED.** Transport 183 → **195 sectors**. ATR boot milestones
297/554 → **319/576** (+22 over two steps, inside the +50 band); XEX
milestones unmoved at 135/392. Boot smoke **8/8**. The figure that proves the
reader works end to end is the gameplay handoff: `gameplay_init` is frame
**3060 on ATR against 3053 on XEX**. That 7-frame difference *is* the
two-sector SIO read — the XEX carries the level image as a block and takes the
resident-skip path without touching SIO, the ATR reads it over the wire — and
it matches plan §1.6's ~3.8 frames/sector. Both media reach `game_state 6`,
which is reachable only if the read completed *and* the header validated,
since every failure class diverts to the failure screen instead. Three PAL
replays clean, 0 distinct miss events, max wall 30,375 cycles.

**The window budget is now the binding constraint.** The reader core measured
**682 B against a 300-360 B estimate** (plan §1.5 `[C4]`). With the display
driver, failure screen and an eight-line AI text pool, 70 B of the 1,536-B
area remain. **Sixteen AI lines do not fit** — they would need a further
304 B. Eight is decision O's v1 shape, so nothing is lost now, but a sixteen-
line pool needs the level buffer to shrink below 44 sectors, and that is an
owner decision.

**The read is gated, not inferred (step 6).** The boot smoke now compares the
image at `$A600` byte for byte against `build/level-1.bin` on every session and
counts what reached the wire: **XEX 0 command frames, ATR exactly 2 (one per
sector), 0 wire retries anywhere**, load window 7 frames on ATR and 0 on XEX.
Two negative controls confirm the gate is live — corrupting one byte of the
expected image fails it (the header still matched, so a header-only check would
not have), and breaking the resident-skip magic compare stops the XEX reaching
gameplay at all, which proves the XEX passes *because* of the skip rather than
because SIO happens to work with no disk. Evidence:
[diagnostics/sio-boot-smoke-gate-2026-09-20.json](diagnostics/sio-boot-smoke-gate-2026-09-20.json).

**Step 5:** `sector_c_drain_clear` extracted to the arena and exported as
`HYBRID_SECTOR_DRAIN_CLEAR`, so 4.9's level boundary reuses the capital entry's
drain test. Behaviour- and cycle-neutral: `2-sweep-fire4` replays to identical
numbers across the change. Arena 215 → 187 B free.

**What is NOT done.** Plan §8.3's in-emulator fault injection: there is no
`DFTRACE_SIO_CORRUPT_BYTE`, no `DFTRACE_SIO_FORCE_ERROR` and no stripped-XEX
flag. The reader's **success** path is gated end to end on both media; its
**failure** paths are gated in the 6502 harness only, and **the failure screen
has never been rendered in any automated run** — the owner's SIO2SD smoke will
be the first time a human sees it. The loader-mode animation is drawn but
unobserved; on a 2-sector level it steps twice, so it earns a gate when 4.6
lands a level big enough for the sweep to show. No hardware run: both
command-line hold windows and async receive against a real drive remain
unverified under decision R — see `hardware-testing.md` §11.

**Owner smoke.** XEX `ad06d6fb…b35205a9`, ATR `83d89fdb…d43fa18c`. See the
section's "what to look for" in the implementation report.

---

## Known open defects and open decisions

- ~~BLOCKED: the runtime evidence cannot be regenerated, so the default build
  cannot link~~ — **CLOSED.** `docs/runtime-wall-trace.json` was regenerated on
  2026-09-21 (64/64 sessions, one unbroken run) and binds to the artifacts this
  tree builds; the `pickup_drawn_mask` guard that blocked the write is repointed
  at the missile plane, and the deadlock in the release gate itself is resolved
  by owner decision 1 below. `tests/runtime-evidence-binding.test.mjs` is
  **green**, and `npm test` runs on the default build. History and the seven
  classified blockers:
  [diagnostics/runtime-wall-trace-report-regeneration-blocked.md](diagnostics/runtime-wall-trace-report-regeneration-blocked.md)
  §11-§15.

- **`npm test` is red at HEAD, and has been before roadmap 4.3 started.**
  A/B-confirmed on 2026-09-20 at `e48335f` by stashing all local changes and
  rebuilding clean, so none of it belongs to 4.3. **The first of its four
  causes is gone as of 2026-09-21** — `node scripts/build.mjs --quiet` no longer
  throws, so the suite reaches the tests and the default-build baseline further
  down this file is the current failure list. The rest stand:
  - `tests/formats.test.mjs`: "resident compaction proof survives and Spread
    Shot leaves at least 64 source-owned bytes";
  - `tests/hybrid-c-arena.test.mjs`: "HYBRID_C_ARENA is one contiguous 832-B
    arena at `$7BD0-$7F0F`" and "the arena lands directly as its own DFMC
    record and is the only owner of its range" — the arena assertion reads
    `[562, 5]` against an expected `[558, 5]`, a 4-byte drift.

  These were symptoms of the **stale-report blocker**
  (`diagnostics/runtime-wall-trace-report-regeneration-blocked.md`), now closed:
  the committed evidence again binds to the artifacts the build produces, and the
  gate that notices runs. The working rule stands regardless — **A/B any failure
  against the default-build baseline below before calling it a regression**, or
  it will be attributed to whatever landed last.

  **RE-ENUMERATED 2026-09-21** against a clean `82c155b` export, built with
  `--candidate` and its `node_modules` linked, running the focused set of
  `plan-light-multiplicity.md` §5.5: the set is **11 failing tests in 6 files**,
  not four. **SUPERSEDED as the reference baseline 2026-09-21** — that figure is
  a focused set on a clean `82c155b` export and is kept only as the history of
  this A/B. The current reference baseline is the whole-suite A/B further down
  this file ("Full-suite failure baseline — the DEFAULT build, measured
  2026-09-21"): **110 failures on the default build**, against 118 on a
  candidate build at `d4f085c` and 117 at `be91d17`. `hybrid-c-arena` ×2 (the arena assertion reads `codeBytes` 535
  against an expected 504, and the DFMC record count 9 against 8),
  `entity-effects` ×3, `runtime-timing` ×3, `layout-d1` (13,196 against 13,113),
  `transport-layout-regression` and `formats`. Most are frozen budgets that
  drifted; the three `entity-effects` ones are not — they assert a Raider kill
  scores 16 where the build scores 0 on that harness path — but they read
  identically on the clean `82c155b` export, so they predate this branch too
  and are named here rather than folded into it.

- **ATR boot contract is proven in Atari800 only.** Owner decision A
  (2026-09-20) makes the disk boot without OPTION; it is an
  `OWNER-SMOKE CANDIDATE` and the SIO2SD checks listed in its section below —
  BASIC enabled with nothing held, OPTION still held, and RESET during
  gameplay not re-mapping the ROM — have not been run on hardware;
- PAL fence budget: **relieved but not closed by Option D.** With two Bombers
  live the worst death frame now sits **1,464 cycles** under the fence (it was
  466 after the death-frame deferral alone), so a death frame in which both
  Bombers also fire (~+1,090 harness cycles) no longer misses on the measured
  set. The remaining margin is still the binding constraint on 4.6 population:
  roadmap item 2 measures it before further Bomber or 4.6 content;
- intermittent purple artifact after a Raider, not reproduced
  deterministically (hypothesis only: a stale hostile pulse — if it now shows
  white/steel on the 4.4c candidate, that points to its source);
- Spread second capsule trace / final glyph reported in plan v4.12 §11, not
  re-verified since PairShot and the PMG capsule;
- debris known limitation: a cell yielded to a 25 Hz effect shows the effect's
  lower backing for the frame in which that effect expires (effects still
  publish mid-frame; measured once in 4,600 in-view frames);
- debris contact-kill inconsistency (recorded 2026-09-18, owner left as is):
  `entity_player_debris_overlap` releases the debris only when
  `apply_player_damage` actually sets `BROAD_DAMAGE_APPLIED`. While the player
  is not `PLAYER_ALIVE` (dying / respawning) or inside the post-hit
  `BROAD_DAMAGE_COOLDOWN`, the call is refused, so flying through debris in
  that window destroys nothing and — since the award now hangs off the same
  release — awards nothing either. An active Shield *does* set the flag, so a
  shielded contact destroys the debris, awards `DEBRIS_SCORE` and costs no
  hull, which is what the owner rule asks for. A lethal contact also still
  destroys full-HP (3 HP) debris outright rather than decrementing HP, so it
  awards the same `DEBRIS_SCORE` that three shots would. Both behaviours were
  explicitly left unchanged by the owner in the contact-score task. Enemy
  contact is unconditional by comparison — contact scoring and destruction do
  not depend on PlayerFighter damage, death or invulnerability, asserted by
  "contact scoring is independent of PlayerFighter damage, death, and
  invulnerability" in `tests/enemy-combat.test.mjs`. The asymmetry is the
  defect's shape: it is debris, not enemies, that survives the dying/respawn
  window. Carried in the backlog below;
- boot-smoke margin: **closed.** The old ATR menu deadline
  (190 + 2 × transport sectors) was met with 0 frames of margin at every
  candidate that measured it (`3838c00`; 4.5a and 4.5b — 4.5b's +6 B packed
  BROADSIDE alone missed it by one frame; a 239-B Heavy proof payload;
  4.5M-M2 177 sectors, menu 544 / deadline 544; 4.5M-M3 178 sectors, 546/546;
  4.5c Bomber 180 sectors, 550/550; the 4.5d WIP and the death-frame deferral
  182 sectors, 554/554), and a throwaway 832-B arena at 180 sectors landed one
  frame late at 551 vs 550. That zero margin was an artefact: the formula
  tracked its own growth, so the slack was zero by construction. Owner decision
  22 (2026-09-18) re-based it on the owner's real budget — the menu within
  60 s ≈ 3,000 PAL frames — and the restatement is **implemented at this HEAD**
  (2026-09-19): an absolute ceiling of 3,000 frames, a hard fail at
  baseline + 50 and a non-blocking warn at baseline + 10, with the baseline in
  the committed [boot-deadline-baseline.json](boot-deadline-baseline.json)
  (XEX **392**, ATR **554**, measured on `ecc9ceda…` at 182 transport
  sectors). The baseline is re-recorded deliberately, in the same commit that
  grows the transport on purpose, with the reason in the commit message. The
  gate is NOT deleted: a build that suddenly boots twice as slowly still fails
  it, and so does an unexplained loader/decode regression with no sector
  change, because the baseline does not move on its own. The boot harness
  horizon moved with it — the session now runs to frame 3,300 — so a boot at
  the ceiling is observable instead of nominal; details in
  [diagnostics/atr-boot-deadline-rebasing.md](diagnostics/atr-boot-deadline-rebasing.md)
  and in the implementation note under owner decision 22. Every per-candidate
  "menu N against deadline N" figure recorded further down this file is a
  historical measurement under the superseded formula;
- boot-smoke **loader** checkpoint: **re-based** (2026-09-20, owner decision,
  same shape as decision 22). Decision 22's survey found one formula site and
  missed this one: the boot smoke observed the loader raster at a hard-coded
  frame **300**, and the loader raster arrives at `start + stage-2 decode`, so
  that constant tracked the transport exactly as the menu formula had. At the
  measured ATR milestone **297** it had 3 frames of slack, and the first real
  record landed in the BASIC window (loader 297 → 299) would have tripped it
  and reported "the loader raster never came up". The checkpoint is now split
  in two, because it was doing two jobs with one number. The **timing** half is
  an explicit gate in decision 22's shape: `milestones.loader` against the same
  3,000-frame ceiling and a committed per-medium baseline (`xex_loader_frames`
  **135**, `atr_loader_frames` **297**) with the same +10 warn / +50 fail
  bands. The **state** half — loader DLIST, charset, DMACTL/NMIEN, VDSLST and
  the countdown — is observed at `loader + 3` and `loader + 53`, derived from
  the measured milestone in the same run, inside the 250-frame loader hold by
  construction. Self-tracking is correct there because that half no longer
  carries a budget. Two side effects: the old frame-250 snapshot fell *before*
  the ATR loader raster and its countdown check was silently skipped on both
  ATR sessions, which is now fixed and unconditional; and the countdown proof
  is exact (50 frames of timer across 50 PAL frames) instead of "strictly
  decreasing". Snapshots are now `1, loader+3, loader+53, 3050, 3300`;
- ~~**`docs/runtime-wall-trace.json` is stale and cannot be regenerated**~~ —
  **RESOLVED 2026-09-21. THE EVIDENCE IS WRITTEN**, the first regeneration
  since `d72dd6a`, 184 commits back. One unbroken default run,
  **64/64 sessions**, XEX `d667d88d…`. Full narrative:
  [diagnostics/runtime-wall-trace-report-regeneration-blocked.md](diagnostics/runtime-wall-trace-report-regeneration-blocked.md)
  §14; §1-§13 are the history of the eight superseded blockers.

  **The owner's rule for behavioural blockers (2026-09-21).** Every clause that
  stopped the write was MEASURED into (a) stale scenario, (b) wrong selection
  or (c) real failure BEFORE being touched, and handled only as its class
  allows. Seven clauses: **four (a), two (b), two (c)** (one clause counts in
  two classes below because its (a) cannot be extended cheaply and is recorded
  like a (c)). **Not one assertion was loosened, deleted or re-pinned.**

  | Clause | Class | Handling |
  | --- | --- | --- |
  | `lower-playfield` clamp | (a) | scenario extended 420 → 1,400 frames |
  | `lower-playfield` capital encounter | (a) | same extension; muzzle 917, BROADSIDE 919 |
  | `director-complete-*` BOSS_HANDOFF | (a) | trace-only held lives; clause unchanged |
  | `engine-*` A2-list first DLI | (a), not cheaply extendable | **recorded**, 24 entries |
  | `engine-xex-*` XEX/ATR parity | **(c)** | **recorded**, 12 entries |
  | booster release erase count | **(c)** | **recorded**, 1 entry |
  | capsule during active booster | (b) | selection corrected + negative control |
  | debris 3/5 cadence | (b) | harness model corrected + negative control |

  **THE DIRECTOR IS HEALTHY — this does not block 4.6.** The BOSS_HANDOFF
  clause was expected to be (b); measurement says (a). BOSS_HANDOFF (level-1
  event index 5, world row 3712) never executed because the fighter lost its
  last life first and GAME OVER runs `director_c_init`, resetting the world
  row on a ~2,400-frame cycle against the ~9,300 the handoff needs — no frame
  budget can outrun that. With `DFTRACE_HOLD_PLAYER_LIVES=3` (trace-only,
  env-gated, no production byte patched) all three difficulties execute
  BOSS_HANDOFF → DRAIN on the next frame → terminal COMPLETE holding to frame
  10,499: **d0 9377/9378/9379, d1 8319/8320/8330, d2 7543/7544/7567**, with 4,
  3 and 5 deaths survived. The clause is byte-for-byte unchanged.

  **Gameplay-difficulty signal for the owner (measured, not gated).** Same
  replay, `d72dd6a` (XEX rebuilt and byte-identical as `ab682d84…`) vs HEAD:
  first life lost **never** vs frame **2690**; GAME OVERs **none** vs **6337
  and 8713**; final `sector_state` **6 terminal** vs 3. A continuously-firing
  `sweep` bot (`fire0` holds FIRE from frame 1 — TRIG0 is 0 when pressed) took
  **zero** damage across 10,500 frames at `d72dd6a` and now dies out twice.
  The 184-commit range carries 4.4 Interceptor, 4.5b `BOMBER`, 4.5c Bomber and
  the hostile weapon visuals; it was not narrowed further.

  **The 40 recorded gate failures** (`gate.behavioural_clause_failures`) live in
  **one data file**, `docs/recorded-gate-failures.json`, each entry carrying its
  class and its measurement reference: 24 A2-select (a) + 12 XEX/ATR parity (c)
  + 3 pre-existing contact-raster + 1 booster release (c). `scripts/build.mjs`
  and `tests/runtime-evidence-binding.test.mjs` both read that one file through
  the same evaluator, so the release gate and the tripwire cannot disagree.
  `gate.passed` is **false** and that is correct — the evidence is a truthful
  description of the build, failures included.

- ~~`npm test` on the DEFAULT build cannot run — OWNER DECISION REQUIRED~~ —
  **RESOLVED 2026-09-21 by owner decision 1 (release gate semantics).** The
  default build passes when there is **no UNRECORDED gate failure** and
  `gate.timing_and_dli_passed` is true; `gate.passed` keeps its meaning (false
  while any failure is recorded) and is still published. The recorded list is one
  data file, `docs/recorded-gate-failures.json`, read by `scripts/build.mjs` and
  by the tripwire through the same evaluator in `scripts/runtime-evidence.mjs`,
  so neither duplicates it and neither can drift from the other. Proven through
  the real default build: it is refused on an injected unrecorded failure, on a
  silently cleared recorded one, on `timing_and_dli_passed: false` and on a
  `gate.passed` that contradicts the published list, and passes on the real
  report. Standing regression test `tests/release-gate-semantics.test.mjs`;
  evidence §15.1 and
  [diagnostics/release-gate-and-pin-conversion-injection-proof.md](diagnostics/release-gate-and-pin-conversion-injection-proof.md).

- **Full-suite failure baseline — the DEFAULT build, measured 2026-09-21.**
  `npm test` (`node scripts/build.mjs --quiet && node --test tests/*.test.mjs`)
  runs to completion on the **default target** for the first time since the
  evidence went stale. This is the reference baseline; the candidate-build
  figures it replaces are kept only as the A/B below.

  | | tests | pass | fail |
  | --- | --- | --- | --- |
  | candidate build at `d4f085c` (re-measured in a `git worktree`) | 737 | 616 | **118** |
  | **default build at HEAD** | **744** | **631** | **110** |

  `744 − 737 = 7` new tests, all of `tests/release-gate-semantics.test.mjs`, all
  passing. **110 failures, every one of them already on the `d4f085c` list —
  0 NEW.** Eight cleared: three by owner decision 2 (the converted pins) and
  decision 1 (the `gate.passed` meaning), and **five by the default target
  itself**, which fills in the measured manifest fields `--candidate` leaves
  `null` (`runtime-wall-trace` Spread Shot / debris visual polish / destructible
  debris, `runtime-timing` "measured DMA-on fields …", `enemy-roster`
  "compile-time review harness …"). Full classification: §15.3 of
  [diagnostics/runtime-wall-trace-report-regeneration-blocked.md](diagnostics/runtime-wall-trace-report-regeneration-blocked.md).

  The remaining 110 are pre-existing. Five are in
  `tests/runtime-wall-trace.test.mjs` and are stale pins of the same family as
  the five converted, each a different number (`a2_heads` 27 vs 22; coverage
  `[10, 10, true]` vs `[19, 13, false]`; the explosion `colpm1`/`colpm2` sets;
  the enemy-breakup five-slot path; no frame carrying a `cpu_dma_off_reference`);
  their disposition is the same owner call and is **not** in scope of this
  session. A large share of the rest are preview/showcase/manifest determinism
  tests. Running the suite regenerates tracked media
  (`docs/media/assets/*.png`, `docs/media/manifest.json`); those are restored
  with `git checkout` and are not part of this session's commits.

- ~~open owner decision: the packed STARFIELD correction gate~~ — **RESOLVED
  2026-09-21, owner-confirmed. The gate was not moved; the segment fitted by
  itself.** It stood 7 B over the 1,804-B two-stream correction gate from
  4.5M-M1 until Light multiplicity step 1b took the 31-byte
  `light_cell_resolve` block out of `STARFIELD` and into the Light kernel's own
  link. MEASURED: packed STARFIELD **1,811 → 1,780 B, 24 B under** the
  correction gate and 45 B under the 1,825-B hard staging limit.
  `tests/light-wingman.test.mjs` ("Light kernel placement…") passes for the
  first time since 4.5M-M1. The reviewed margin is untouched, so nothing about
  the gate itself needs re-reviewing;
- 4.5M-M1 owner-visible deviations from the task text (see the 4.5M-M1
  section): the boot-only GLUE hold moved `$8300 → $8100` so that stream B
  has a contiguous idle window, and each stream is bounded by one 960-B
  resident copy (B ≤ 960 B, not 1,032 B) because the table-driven boot copier
  is stage-2 overlay code that is gone by the time the deferred copies run;
- debris death-frame blink (found 2026-09-17, pre-existing mechanism): when a
  player PairShot was published over a debris cell and the player dies next
  frame, `apply_player_damage → erase_bullet` restores the shot's resolved
  (space) backing mid-frame and the debris returns only in the late window, so
  the cell scans blank for one frame. It fails `debris-gate-0-evasive-fire3` on
  the hostile-shot candidate (divergent replay); first-writer proof in
  [diagnostics/stage-2b2n-hostile-shot-emitter-independence.json](diagnostics/stage-2b2n-hostile-shot-emitter-independence.json);
- pre-existing native gate failures (identical on `2a67684`): the default
  wall-trace mode aborts at `weapon-pickup-contact-2-hunt-fire4` ("changed GTIA
  priority or the single erase/draw lifecycle") after 21 sessions, and
  `--raider-remnant-only` reports fewer main explosions than kills (139/141 at
  `2a67684`, 134/135 on the candidate). **Superseded as of 2026-09-19** for the
  first of those: the three pickup clauses are fixed, both pickup sessions
  pass, and the default-mode abort has moved to
  `capital-muzzle-ring-2-sweep-fire4`, and from there, once term 4e was taught
  its fourth writer, to `capital-contact-allied-medium` — see the
  `BLOCKED_CAPITAL_CONTACT_MODE_UNSET` entry above;
- test debt: the full `node --test tests/*.test.mjs` run keeps known stale
  failures — 115 at `b4b942e` (measured 2026-09-16 on a clean export, counting
  the owner's uncommitted `tests/booster-admission-diagnostic.test.mjs`) and
  the same 115 names at the Interceptor candidate, its 4.4b visual identity
  and the 4.4c weapon visuals; treat a new failure name as a regression signal.

---

## Accepted increments in this checkpoint — summary and evidence

### Pickup runtime visibility (P0)

Root cause was raster: the missile plane was erased just after the frame gate
and rewritten mid-frame, so ANTIC saw zeroes when the beam crossed the capsule
(0/16 rows at beam crossing). The plane is now erased and redrawn in the
post-playfield window after `wait_frame_at_line $77`; each booster carries its
own capsule silhouette again. The earlier native gate used a `& $F0` mask that
inspected only half of the fifth-player missile bits. Owner decision 12 (solid
fifth-player PMG design) is unchanged. Evidence:
[diagnostics/stage-2b2d-pickup-raster-invisibility.json](diagnostics/stage-2b2d-pickup-raster-invisibility.json),
[diagnostics/stage-2b2e-pickup-capsule-silhouettes.json](diagnostics/stage-2b2e-pickup-capsule-silhouettes.json).

### Step 4.3 Stage 1 — reusable resident capacity

Option D = A + C1. C1 removed dead ENTITY_CODE (39 B). A moved the boot-only
GLUE hold from `$8600` to `$8300` and turned the former hold into the C area
`HYBRID_C_SECTOR_RAM` `$8602-$86F9` (248 B), carrying the five `sector_c_*`
functions (240 B) as a second LZ stream of the pickup/collision DFMC record
(8/8 records, 142 B manifest unchanged). The native write-watch
(`scripts/capacity-window-watch.mjs` — a **manually invoked proof tool**, not a
standing gate: it is referenced by nothing in `package.json`,
`scripts/build.mjs`, `scripts/runtime-wall-trace.mjs` or `tests/`, and it ran
once for this step) passed on XEX and ATR. Startup costs
+8,463 cycles once. Evidence:
[diagnostics/stage-2b2f-resident-capacity-glue-window.json](diagnostics/stage-2b2f-resident-capacity-glue-window.json);
the owner's post-capital debris observation was A/B-cleared as `PREEXISTING`:
[diagnostics/stage-2b2f-step43-post-capital-debris-ab.json](diagnostics/stage-2b2f-step43-post-capital-debris-ab.json).

### Debris late publication — exact ownership

Fighter OPEN: debris erase and render run adjacently inside the post-playfield
window, between the Light erase and the Light render. Capital frames: right
after the entity update, in the vertical blank, after every transient restore
and before every transient capture. The erase restores a cell only while it
still holds the published code; the render leaves a cell a rendered effect
owns to the effect; the recycled bottom ring row republishes the debris for the
frame that rotates it. `LIGHT_CODE` 133 → 203 B; PAL max 29,217 → 29,258
cycles. Native final-framebuffer gate (`node scripts/runtime-wall-trace.mjs
--debris-gate-only`) on three natural replays: 0 blank, 0 partial, 0
transitions, first visible Y 24 in capital and post-capital phases (pre-fix
`0-neutral-fire0` post-capital: 549 blank of 1,028 in view). Evidence:
[diagnostics/stage-2b2g-debris-late-publication.json](diagnostics/stage-2b2g-debris-late-publication.json).

---

## Interceptor (plan step 4.4) — **OWNER-ACCEPTED** (owner smoke PASS 2026-09-18, `0a90c1c`)

Not accepted until the owner smokes it. Built on the accepted `b4b942e`; the
2026-09-16 `BLOCKED_PLACEMENT` attempt is superseded.

**Design (owner decision 18).** Third `EnemyArchetype` (byte offset 24): HP 1,
pursuit movement 2, fire policy 3 (since 4.4c a single `LASER` bolt, then
56/44/32 frames EASY/MEDIUM/HARD; originally a 2-shot double-tap), character
2x1 renderer, score `$15`,
Director value 1. It has no leader: it enters at X 124, Y 0, descends 2 lines
per frame and, every other frame, steps one 4-HPOS cell toward
`player_x & $FC`, clamped to 48-200. It retires at Y 232 or outside the fighter
sector, exactly like the Wingman. No P1/P2, PMG, renderer, publication,
collision, Director or capacity change.

**Selection contract.** The single Light slot is explicitly
archetype-selectable (`Wingman OR Interceptor`) through the C-owned byte
`light_archetype_offset` (12 or 24). The Light admission in
`enemy_c_spawn_raiders` and `enemy_c_light_tick` only read it; the rejected
per-admission alternation of `32f2c20` is removed. Its only writer is the
separate, labelled **provisional** schedule `encounter_light_schedule_advance()`
— table `{WINGMAN, INTERCEPTOR}` indexed by `encounter_light_index` — called
only when the slot is free, so a fresh game shows Wingman, Interceptor,
Wingman… Roadmap 4.6 replaces it. Schedule index finding: no existing state
qualifies — `STATE_EVENT_INDEX` advances once per Director event (including
deferral expiry and boss handoff), not once per Light admission, and a busy
slot skips admission, so it cannot index the table without changing meaning;
the accepted 1 B counter at `$8119` (`HYBRID_ENCOUNTER_STATE`, reset in
`lifecycle_c_init`) is used. ASM changes are limited to the
`light_archetype_offset` ABI equate, `ldx LIGHT_ARCHETYPE_OFFSET` in
`light_destroyed` and `adc LIGHT_SCORE_BCD,x` in the unchanged 17 B pad.

**Placement (measured, `b4b942e` → candidate).**

| Metric | Before | After |
| --- | ---: | ---: |
| `ENEMY_ARCHETYPE_DATA` (3 records + 2 B schedule table) | 24 B `$8C7D-$8C94` | 38 B `$8C7D-$8CA2` |
| `HYBRID_C_EXT` C | 485 B `$8C95-$8E79` | 635 B `$8CA3-$8F1D` |
| `LIGHT_CODE` (unchanged size) | 203 B `$8E7A-$8F44` | 203 B `$8F1E-$8FE8` |
| Extension record raw / packed (limit 960) | 712 / 636 B | 876 / 785 B |
| **Free `HYBRID_C_EXT` tail** | 187 B | **23 B `$8FE9-$8FFF`** |
| `LIGHT_RESIDENT` | 226 B | 229 B `$8776-$885A` |
| `PICKUP_CODE` (unchanged size, 769 B) | `$8858-$8B58` | `$885B-$8B5B` |
| Pickup stream fill / pickup record of 1,277 B cold | 14 B / 1,158 B | 11 B / 1,161 B |
| `HYBRID_LIGHT_STATE` | `$8100-$810B` | `$8100-$810F` |
| Provisional schedule counter | — | `$8119` (1 B) |
| Simultaneous / safe residency | 19,295 / 2,892 B | 19,459 / 2,728 B |
| cc65 CODE / RODATA; C stack / new ZP | 1,233 / 182 B; 0 / 0 | 1,383 / 196 B; 0 / 0 |

Physical resident code/data +167 B, BSS +5 B, in previously unowned RAM;
reserved envelopes unchanged; reusable free capacity −164 B extension tail and
−3 B pickup fill. The extension record grows from 6 to 7 ATR sectors
(166-172), moving the RNG record to sector 173. The **23 B extension tail is
scarce remaining capacity**: above the 16 B owner floor, but the next
archetype or C growth needs a placement decision. Linked runtime (17,470 B) and
packed STARFIELD (1,805 B) are unchanged. The cc65 stack/helper audit passes.

**CPU (measured).** Ten `runtime-wall-trace` baseline replays, native PAL, on
both `b4b942e` and the candidate: 0 missed frames, 0 extra VBI, 0 DLI errors in
all 20. Candidate worst maximum 29,918 cycles (`2-sweep-fire4`; target headroom
1,282, hard-gate headroom 2,650) against 29,697 for `b4b942e`
(`2-sweep-fire6`); `2-evasive-fire3` 29,258 → 29,605. Replays diverge after the
first Light admission, so per-session deltas (−259 to +831) mix gameplay
divergence with cost. Isolated C cost (6502 harness, HARD): Light tick worst
case 127 → 173 cycles for the Wingman and 182 for the Interceptor (firing
frame), formation admission 88 → 174 cycles once per formation; the score path
adds one `ldx` (3 cycles). A native Light-slot probe
(`DFTRACE_LIGHT_OUTPUT`, opt-in, no emulated cost) shows an Interceptor alive
in all ten candidate replays (1-3 lives each, lateral pursuit observed).

**Native gates.** `--boot-smoke-only`: 4 XEX/ATR cold-start sessions pass.
`--debris-gate-only` on the three natural replays: PASS — 0 blank, 0 partial,
0 disappearances, first visible Y 24 in capital and post-capital phases, 0
publications inside the scanned playfield, 0 missed frames; maxima 30,098 /
30,406 / 30,050 cycles against 30,008 / 29,764 / 30,022 for `b4b942e` on the
same (diverging) replays, all under the 31,200 target.

**Tests.** New `tests/light-interceptor.test.mjs` (13): selection contract, no
toggle source contract, provisional schedule order, admission per difficulty,
descent and retirement, pursuit clamp and alignment, independence from Heavy
slot 0, double-tap cadence, visibility and dying gates, 15-point kill and
fighter-only retirement, placement contract, no PMG. Updated:
`light-wingman` (third record, explicit Wingman re-admission),
`hybrid-lifecycle` (extension 876 B, the two static helper calls in the
generated-C audit), `enemy-combat` (union syntax), `source-contracts`. Full
suite: 626 tests, 115 failing, the identical failure-name set to `b4b942e`
(613 tests, 115 failing).

Candidate XEX `01a6ae07…`, owner-smoke copy in
`build/owner-smoke/light-interceptor-01a6ae07/`. Evidence:
[diagnostics/stage-2b2h-light-interceptor.json](diagnostics/stage-2b2h-light-interceptor.json);
superseded blocked-experiment evidence:
[diagnostics/stage-2b2c-interceptor-blocked-placement.json](diagnostics/stage-2b2c-interceptor-blocked-placement.json).

---

### 4.4b Interceptor visual identity (owner decision A+C) — **OWNER-ACCEPTED**

ASM publication data only; C, records, codes, erase/render, backing, collision,
PMG, DLI/palette and the PairShot renderer are unchanged (a distinct
Interceptor projectile is deferred to 4.5).

- **Art.** A new 16-byte Interceptor table (owner-approved X/quad silhouette,
  candidate A: steel `COLPF1` arms, red `COLPF3` corner rotor pods, white
  `COLPF0` hub) follows the
  unchanged Wingman table; both moved from `LIGHT_RESIDENT` to the ENTITY_CODE
  tail, `$9D31-$9D50`, contiguous in one page (link-time asserts).
- **Selection.** `light_update` reads source end 15 (Wingman) or 31
  (Interceptor) by comparing `light_archetype_offset` with the ASM equate
  `LIGHT_OFFSET_INTERCEPTOR = 24`, which `source-contracts` cross-checks with
  `ENEMY_ARCHETYPE_OFFSET(ENEMY_ARCHETYPE_INTERCEPTOR)`; it still writes glyphs
  120/121 with codes `120|$80`/`121|$80`.
- **Placement (measured, `c1c106e` → candidate).** ENTITY_CODE 3,121 → 3,153 B
  (packed 2,701 → 2,733 B); **ENTITY_CODE free tail 45 → 13 B**;
  `LIGHT_RESIDENT` 229 → 225 B; pickup stream fill 11 → 15 B; pickup record
  1,161 → 1,157 B; ENTITY_CODE staging-to-BROADSIDE margin 107 → 75 B; linked
  runtime 17,470 → 17,502 B; simultaneous / safe residency 19,459 / 2,728 →
  19,491 / 2,696 B; **initial boot envelope 44 → 12 B**, the 12 B minimum at an
  unchanged sector count. `HYBRID_C_EXT` tail (23 B) and packed STARFIELD
  (1,805 B) unchanged. Both scarce margins are recorded, not gates.
- **CPU (measured).** 6502 harness, `light_update` with a live Light: Wingman
  472 → 515 cycles (+43), Interceptor 437 → 481 (+44; it previously installed
  the Wingman art). Native PAL, candidate: `2-sweep-fire4` 29,918,
  `2-sweep-fire6` 29,705, `2-neutral-fire0` 29,847, `2-evasive-fire3` 29,624
  cycles; 0 missed frames, 0 extra VBI, 0 DLI ordering errors; the
  `DFTRACE_LIGHT_OUTPUT` probe shows an Interceptor alive in all four (1-2
  lives, lateral pursuit in three). Worst candidate maximum 30,406 cycles
  (`debris-gate-0-neutral-fire0`), under the 31,200 target.
- **Native gates.** `--boot-smoke-only`: 4 XEX/ATR cold starts pass.
  `--debris-gate-only`: PASS on the three natural replays — 0 blank, 0 partial,
  0 disappearances, first visible Y 24 in capital and post-capital phases,
  0 missed frames; maxima 30,101 / 30,406 / 30,050 cycles.
- **Tests.** `light-wingman` (glyph 120/121 bytes via `light_update` for
  offsets 12 and 24, table contiguity), `light-interceptor` (placement
  numbers), `source-contracts` (offset cross-check). Harness defect fixed:
  `scripts/debris-destruction-runtime.mjs` now clears the whole Light state
  `$8100-$810F`, as `lifecycle_c_init` does; boot-staging residue there had
  decoded to a phantom live Light that took 6 of the 745 reproducer PairShots
  once ENTITY_CODE grew. The reproducer is 745/745 with 0 remnants on both
  `c1c106e` and the candidate. Full suite: 628 tests, 115 failing, the
  identical failure-name set to `c1c106e` (626 tests, 115 failing).

Candidate XEX `3adc3954…`, owner-smoke copy in
`build/owner-smoke/interceptor-visual-3adc3954/`.

---

### 4.4c Hostile weapon visuals (owner decision 19) — **OWNER-ACCEPTED**

Projectile colour and shape belong to `weapon_class`, not to the emitter's hull
colour. C picks the class and cadence; ASM publishes it.

- **Classes.** `ENEMY_WEAPON_RED_PAIRSHOT` is renamed `ENEMY_WEAPON_PULSE = 1`
  (Raider, Wingman); `ENEMY_WEAPON_LASER = 2` (Interceptor); 3 is reserved for
  the Bomber. The ids are mirrored in `src/main.s` and cross-checked by
  `source-contracts`.
- **Per-slot class, 0 B RAM.** Hostile ACTIVE = owner bits 0-2 |
  `weapon_class << 3`. The Raider emitter uses constant `ora`/`eor`, and the
  cursor stays 0/1. `enemy_c_light_tick` returns the record's class (≥ 1) on
  fire, and `light_update` shifts it into ACTIVE.
- **Publication.** `hostile_projectile_screen_code` (BROADSIDE) returns
  `(89 + class + (X & 2 ? 10 : 0)) | $80`, so PULSE publishes `$DA/$E4`
  (unchanged codes) and LASER `$DB/$E5`. The resolver range check is
  `$DA`..`$E5`. The table-driven builder writes glyphs 90+ and 100+ from the
  authored `hostileWeaponVisuals` in `assets/graphics/fighter-weapons.json`,
  validated by `scripts/fighter-weapons.mjs` (high nibble only, no `%11`
  pixels).
  - PULSE: white/steel tracer `$00,$A0,$50,$00,$00,$A0,$50,$00`.
  - LASER: thin 1-HPOS bolt `$20,$20,$20,$10,$10,$10,$10,$00`.
  - Unchanged: `GAMEPLAY_COLPF3`, speed, hitbox, lifetime, PMG, DLI, collision.
- **Interceptor cadence (C data).** Burst 1, interval 0, post 56/44/32. Fire
  ticks per pass: EASY 57; MEDIUM 45, 90; HARD 33, 66, 99 (1 / 2 / 3 shots).
  Raider and Wingman cadences are unchanged.
- **Trace header.** The `scripts/atari800-wall-trace.h` hostile code range now
  ends at `$E5`, so native classifiers see the LASER bolt.

**Placement (measured, `0c90d53` → candidate).**

| Metric | Before | After |
| --- | ---: | ---: |
| `HYBRID_C_EXT` C | 635 B | 637 B `$8CA3-$8F1F` |
| Free `HYBRID_C_EXT` tail | 23 B | **21 B** `$8FEB-$8FFF` (floor 16 B) |
| Extension record raw / packed | 876 / 785 B | 878 / 786 B |
| `LIGHT_RESIDENT` | 225 B | 229 B `$8776-$885A` |
| Pickup stream fill / pickup record | 15 / 1,157 B | 11 / 1,161 B |
| ENTITY_CODE raw / packed | 3,153 / 2,733 B | 3,153 / 2,727 B |
| Initial boot envelope | 12 B | 18 B |
| BROADSIDE raw / packed | 6,650 / 5,659 B | 6,650 / 5,662 B |
| Simultaneous / safe residency | 19,491 / 2,696 B | 19,493 / 2,694 B |

- **ENTITY_CODE.** The renderer's hostile-code block shrank from 16 B to 5 B.
  The 11 B saved land in the `.align $100` pad before `$9400`, so the tail is
  still 13 B.
- **BROADSIDE.** The 70 B builder slot keeps its size and address (19 B
  builder, 16 B table, 23 B helper, 12 B pad), because
  `free_broadside_slot = $76A7` is a fixed integration address. The pad holds
  the Bomber's 8 B glyph row without moving anything. §6 estimated −12 B here;
  the fixed address turns that into a pad.
- **Unchanged.** Linked runtime 17,502 B, packed STARFIELD 1,805 B, RAM, ZP,
  PMG, DLI and charset ranges.

**CPU (measured).**

- **6502 harness.**
  - `render_fighter_projectile_overlays` with 5 hostile slots: 1,056 → 1,186
    cycles (+26 per slot; §6 estimate +27).
  - Firing frame: Wingman `enemy_c_light_tick` 173 → 179 and `light_update`
    647 → 662.
  - Interceptor firing tick 147 → 163 and `light_update` 622 → 647. Burst 1
    now takes the reload branch.
- **Native PAL, 4 baseline replays.** 0 missed frames, 0 extra VBI, 0 DLI
  ordering errors.

  | Replay | Max cycles |
  | --- | ---: |
  | `2-sweep-fire4` | 29,814 |
  | `2-sweep-fire6` | 29,856 |
  | `2-neutral-fire0` | 29,641 |
  | `2-evasive-fire3` | 29,522 |

  The `DFTRACE_LIGHT_OUTPUT` probe shows an Interceptor alive in all four
  replays (1-2 lives) and firing its HARD bolts.
- **Worst candidate maximum.** 30,436 cycles (`debris-gate-0-neutral-fire0`),
  under the 31,200 target.

**Native gates.**

- `--prepare --boot-smoke-only`: 4 XEX/ATR cold starts pass.
- `--debris-gate-only`: PASS on the three natural replays.
  - 0 blank, 0 disappearances, first visible Y 24 in capital and post-capital
    phases.
  - 0 publications inside the scanned playfield, 0 missed frames.
  - Maxima: 30,232 / 30,436 / 30,207 cycles.

**Tests.**

- **Updated.**
  - `fighter-weapons`: assembled builder against the authored model, exact
    builder bytes, screen-code mapping, renderer, helper and resolver contracts.
  - `light-interceptor`: single-bolt ticks, tick return 2, placement numbers.
  - `light-wingman`: Interceptor record, emit ACTIVE `$0E`.
  - `raider-projectile-ownership`: ACTIVE `$0A/$0B`.
  - `hybrid-lifecycle`: extension 878 B.
- **New.**
  - `source-contracts`: C↔ASM class ids and authored order.
  - 6502 harness in `light-interceptor`: a real Raider emit publishes
    `$DA/$E4`, a real Interceptor emit `$E5`, and the resolver restores all
    three and ignores `$D9`/`$E6`.
- **Full suite.** 630 tests, 115 failing, the identical failure-name set to
  `0c90d53` (628 tests, 115 failing, clean export reproducing XEX `3adc3954…`).

Candidate XEX `3d88b35d…`, ATR `27ad309b…`, owner-smoke copy in
`build/owner-smoke/weapon-visuals-3d88b35d/`.

---

## Roadmap 4.5a — Heavy window `HYBRID_C_HEAVY` (owner decision 20) — **OWNER-ACCEPTED** (owner smoke PASS 2026-09-18)

Capacity only, for the Bomber's C (4.5c). No gameplay, C, archetype, PMG, DLI,
collision or projectile change; the window holds 0 B.

- **Window.** `HYBRID_C_HEAVY_RAM` `$7E12-$7F04`, **243 B contiguous and
  C-reachable** (`#pragma code-name ("HYBRID_C_HEAVY")`). The limit is staging,
  not the 254-B runtime range: `$7F2B` (A2 cold staging) − `$7E38` (low-C
  record + full `$F8` reservation).
- **Transport.** No new DFMC record (still 8). The linked image (used bytes
  only) follows the low-C LZ record image at `$7E38`. The low-C record is
  248 B raw / 213 B packed in 2 sectors (242 / 210 B before). A full window of
  incompressible bytes packs to 458 B in 4 sectors; a real 239-B cc65 proof
  payload to 435 B in 4 sectors. The chunk loader's reviewed cold range now
  ends at `$7F2A` instead of `$7F0F`: the A2 display lists at `$7F10` are built
  only at gameplay init.
- **Held publication (GLUE precedent).** `publish_director_abi` tail-jumps
  (former `rts` + 2 B pad) to `hybrid_c_heavy_hold`, which copies the full
  243 B to idle ring RAM `$8400-$84F2` before starfield staging overwrites
  `$7810-$81CF`. After `show_loader`, `hybrid_c_heavy_publish` expands the
  starfield and copies the hold to `$7E12`. Both copies (31 B) sit in the zero
  padding of the fixed bootstrap prefix (36 → 5 B), so the initial content
  does not grow.
- **Accounting (measured).** Physical: linked runtime 17,502 B, simultaneous
  19,493 B, safe 2,694 B unchanged. Reserved: +243 B `HYBRID_C_HEAVY_RAM`,
  +243 B boot-only hold. Reusable free: +243 B C-reachable; `HYBRID_C_EXT`
  21 B, `HYBRID_C_SECTOR` 8 B, ENTITY_CODE 13 B, A2 18 B and pickup fill 11 B
  unchanged. Initial content 13,166 B, envelope 18 B, 103 boot sectors and
  178 transport sectors unchanged.
- **CPU.** One-time boot cost (6502 harness): hold copy 3,938 cycles,
  publish copy 3,907 cycles. Native PAL focused replays are identical to
  `3838c00`: `2-evasive-fire3` 29,522 and `2-sweep-fire4` 29,814 cycles;
  0 missed frames, 0 extra VBI, 0 DLI ordering errors.
- **Native write-watch** (`scripts/capacity-window-watch.mjs` — manually
  invoked proof tool, not a standing gate; see the note under "Step 4.3
  Stage 1" — extended with a
  hold-size parameter, full-capacity staging injection, capital
  entry/completion counters and a keep-alive until one capital completes).
  XEX and ATR × cold fill `$00`/`$A5`: cold start, OPTIONS, gameplay,
  pause/resume, one capital sector entered and completed, game over, restart,
  pause, quit.
  - Heavy window: PASS 4/4. 0 hold writes, 0 window writes after publication,
    and the injected 243-B pattern arrives byte-exact in hold and window.
  - 4.3 GLUE hold and `$8602` window: PASS 4/4 (regression).
  - Real C proof (scratch tree, not committed): a 239-B cc65 payload is
    published equal to its linked image, PASS 4/4. One more statement makes
    ld65 reject the build (memory area overflow).
- **Boot smoke.** PASS 4/4, milestones identical to `3838c00`. The first
  variant carried the zero-padded full capacity (491 B raw); its stage-2
  decode moved ATR `start` by one frame on the `$A5` fill and missed the menu
  deadline, so only used bytes travel now.
- **Tests.** New `tests/heavy-window.test.mjs` (4): window contract, low-C
  transport, size-neutral boot wiring, byte-exact full-capacity copies in the
  6502 harness. Updated `formats` (the low-C XEX segment length is its
  `transportRawBytes`). Full suite: 634 tests, 115 failing, the identical
  failure-name set to a clean export of `3838c00` (630 tests, 115 failing).
- **Fallback.** `LIGHT_CODE` relocation was not needed.

Candidate XEX `8ac71861…`, ATR `6660c504…`, owner-smoke copy in
`build/owner-smoke/heavy-window-8ac71861/`. Evidence:
[diagnostics/stage-2b2i-heavy-window-placement.json](diagnostics/stage-2b2i-heavy-window-placement.json).

Carried owner corrections for 4.5b/c (decision 20, not implemented): generic
Heavy `weapon_class` emission chosen by C; "no Light escort with Bombers" is a
provisional 4.5 smoke policy only; visible separation of two QUAD Bombers
(lanes about `[48,92]` / `[132,176]`); roadmap after 4.5 is 4.6 data-driven
Encounter/Wave Director, 4.7 Boss, 4.8 capital traversal enrichment, then level
loop / 16-level campaign data.

## Roadmap 4.5b — `weapon_class = BOMBER` (decision 20) — **OWNER-ACCEPTED** (owner smoke PASS 2026-09-18)

On top of the 4.5a candidate `984f3ae` (owner smoke PASS, no gameplay
regression). Weapon class only: no emitter fires `BOMBER` yet, so gameplay is
unchanged. No Bomber movement, spawn, Heavy scheduling, PMG, DLI or C change
beyond the id.

- **Class.** `ENEMY_WEAPON_BOMBER = 3` in C and ASM (source contract). Authored
  glyph `$A0,$50,$50,$50,$50,$50,$A0,$00` (steel caps, white core, no `%11`),
  published `$DC` left / `$E6` right. The backing resolver range is derived
  from the class count and now covers `$DA-$E6`; the Atari800 trace hostile
  range ends at `$E6`.
- **Movement rate per class (generic).** Each class in
  `hostileWeaponVisuals` authors `stepPeriodFrames` (1, 2, 4 or 8). The
  generator emits `hostile_weapon_step_masks` (period − 1, indexed by
  `weapon_class − 1`). The hostile update loop reads `ACTIVE >> 3`, then
  `frame_counter & mask`; a non-zero result skips the slot. PULSE/LASER step
  every frame (2 lines/frame). BOMBER steps on even frames: 2 lines every
  second frame, 1 line/frame on average. Speed, hitbox, damage, renderer and
  lifetime semantics are shared; lifetime counts steps, not frames. The
  mechanism reads the class from ACTIVE, so 4.5c's generic Heavy emission of
  the C-chosen class needs no further change here.
- **6502 harness proof** (`tests/hostile-weapon-step-rate.test.mjs`, 6 tests).
  - On BOMBER skipped frames, Y, PREV_Y and LIFETIME stay byte-identical and
    `interceptor_projectile_hits_player` never runs for the slot.
  - On active frames the shot moves exactly 2 lines, lifetime −1, one sweep.
  - Over 40 frames: BOMBER 40 lines / 20 lifetime; PULSE 80 lines.
  - A full 96-step lifetime covers the same travel as PULSE in 192 frames
    instead of 96. The bottom exit stops at the same last Y.
  - A BOMBER resting on the player during a skipped frame hits on the next
    active step. The sweep starts at the resting Y, so detection is at most
    one frame late and never missed.
  - PULSE bottom exit, lifetime expiry and hit behave as before.
- **CODE placement: size-neutral, every address fixed.** The gate costs +11 B.
  The loop pays for it: the bottom test compares Y before the step (−4 B), and
  the hit path falls into `@interceptor_free` (−8 B). One never-executed pad
  byte after `rts` keeps every later CODE label at its address. The
  lbl diff shows only local loop labels and the BROADSIDE builder slot
  interior. `free_broadside_slot` stays at `$76A7`.
- **Tables.**
  - The 3-B step mask table sits in raw bootstrap-prefix padding at
    `$21BC-$21BE` (5 → 2 B free), the HUD-table precedent.
  - A first variant kept it in the BROADSIDE builder pad. BROADSIDE then
    packed +6 B, and ATR `$A5` reached the menu on frame 547, one frame past
    its 546 deadline (loader milestone 289 → 290). That variant was rejected.
  - The 8-B glyph uses the builder pad (12 → 4 B). The helper moves
    `$6287 → $628F` inside the fixed 70-B slot.
- **Accounting (measured).** Linked runtime 17,502 B, simultaneous 19,493 B,
  safe 2,694 B, initial content 13,166 B and envelope 18 B are unchanged.
  - BROADSIDE: 6,650 B raw (unchanged), 5,662 → 5,666 B packed.
  - Transport: 178 sectors, unchanged. XEX stays 23,104 B.
  - Reusable free: prefix padding 5 → 2 B, BROADSIDE builder pad 12 → 4 B.
    `HYBRID_C_HEAVY` 243 B and the others are unchanged.
- **CPU.**
  - Harness: +11 cycles per stepping hostile slot. Build model
    `maximumProjectilePool` update 1,714 → 1,769 (5 slots). Legal heavy
    main loop 13,504 → 13,515.
  - With 5 hostile slots: PULSE 548 cycles, BOMBER skipped frame 233, BOMBER
    step 548.
  - Native PAL (0 missed frames, 0 extra VBI, 0 DLI ordering errors):

    | Replay | 4.4c/4.5a | 4.5b |
    | --- | ---: | ---: |
    | `2-sweep-fire4` | 29,814 | 29,801 |
    | `2-sweep-fire6` | 29,856 | 29,856 |
    | `2-neutral-fire0` | 29,641 | 29,632 |
    | `2-evasive-fire3` | 29,522 | 29,519 |
    | debris gate worst (`0-neutral-fire0`) | 30,436 | 30,439 |
- **Native gates.** Boot smoke PASS 4/4 with milestones identical to
  `984f3ae`: XEX menu 393, ATR menu 546 against a 546 deadline, so there is
  still **0 frames of margin**. Debris gate PASS on the three natural replays:
  0 blank, 0 disappearances, first Y 24.
- **Tests.** New `hostile-weapon-step-rate` (6). Updated `fighter-weapons`
  (BOMBER glyph and codes), `source-contracts` (id 3), `light-interceptor`
  (resolver boundary `$D9`/`$E7`, BOMBER `$DC`/`$E6` resolved). Full suite:
  640 tests, 115 failing, the identical failure-name set to `984f3ae`
  (634 tests, 115 failing, same run command).

Candidate XEX `2fd5ace4…`, ATR `dd3977e2…`, owner-smoke copy in
`build/owner-smoke/bomber-weapon-class-2fd5ace4/`.

---

## Roadmap 4.5M-M1 — starfield staging swap — **OWNER-ACCEPTED** (owner smoke PASS 2026-09-18)

Boot/lifetime change only, on top of the 4.5b candidate (`9547bf0`), first step
of the 4.5M memory/lifetime migration (Strategy B). No gameplay change: linked
runtime 17,502 B, simultaneous 19,493 B, safe 2,694 B, runtime memory map,
GLUE/ABI/low-C/extension/A2/pickup publication, ENTITY order, Light, debris,
PMG, collision, DLI/VBI and every CODE/BROADSIDE/ENTITY address are unchanged
(`.lbl` diff: only bootstrap-prefix labels below `$21C1` moved;
`stage_starfield_stream` left ENTITY_CODE `$9495` for the prefix `$217C`;
`hybrid_c_heavy_hold`, `unpack_boot_broadside_runtime` and
`broadside_packed_source` are gone; `starfield_packed_source_b/size_b` added).

- **Packed STARFIELD as two independent LZ streams.** `build/starfield-runtime.bin`
  (2,224 B, byte-identical) is cut at raw offset 985: stream A 915 B packed
  (staged `$7810`, 960-B window, margin 45 B), stream B 896 B packed (staged
  `$81FA`, 960-B window, margin 64 B); total **1,811 B** against 1,805 B for
  the single stream (+6 B split overhead; the build picks the smallest total
  among 16-byte-step cuts below the largest stream-A prefix that fits).
  `unpack_starfield_runtime` expands A then B into the one continuous `$54E4`
  destination. Nothing writes `$7BD0-$7F2A` for the starfield any more.
- **Total-packed gate.** New reviewed baseline 1,811 B, hard gate **1,825 B**
  (build error above it) and correction gate 1,804 B — the single stream's
  14 B / −7 B content headroom carried over, not the 1,920 B of windows. The
  1,798 / 1,819 B single-stream gates are recorded as superseded in the
  manifest (`starfieldRuntime.packedTotalGate.supersedes`).
- **Heavy window.** `HYBRID_C_HEAVY_RAM = $7E12`, 243 B, staging `$7E38`
  unchanged; `hybrid_c_heavy_publish` (the retargeted former hold copy) copies
  `$7E38 → $7E12` once, ascending, at the existing `publish_director_abi`
  tail; the `$8400` hold and the post-loader publish (17 B) are retired and
  `jsr unpack_starfield_runtime` follows `show_loader` again.
- **Deviations from the task text (owner-visible).** (1) The task's stream-B
  window `$83FA-$8601` is 520 B, not 1,032 B; 1,032 B is the idle ring
  `$8100-$8601` minus the 250-B GLUE hold, which is contiguous only if the
  hold sits at `$8100`. The boot-only hold therefore moved `$8300 → $8100`
  (write-watched, PASS); the three-stream alternative around an unmoved hold
  measured +58 B of split overhead and needed 26 B more prefix code. (2) The
  plan assumed the table-driven `copy_boot_stream_backward` for the deferred
  copies; it is stage-2 overlay code at `$21C1` that `unpack_resident_runtime`
  replaces, so each stream is moved by one exact 960-B resident
  `copy_pause_screen` copy from the bootstrap prefix (HEAD used the same copier
  three times with a spill to `$81CF`). Hence B ≤ 960 B, not 1,032 B, and the
  prefix keeps 3 B of padding after retiring the dead pre-DFMC
  `unpack_boot_broadside_runtime` (27 B).
- **Transport (measured).** Initial content 13,166 → 13,162 B, envelope
  18 → 22 B, 103 boot sectors and 178 transport sectors unchanged (ATR deadline
  546 unchanged); the eight DFMC records are unchanged; XEX 23,104 B.
- **Boot CPU (native write-watch clocks, XEX).** `start → show_loader`
  2,070,929 → 2,051,496 cycles (−19,433); `unpack_starfield_runtime →
  layout_d_glue_publish_complete` 161,072 → 156,087 (−4,985): −24,418 fixed
  boot cycles (≈0.69 PAL frame). Boot smoke PASS 4/4: XEX menu 393 → **392**,
  ATR menu 546 against deadline 546 (still 0 frames of margin; the ATR loader
  countdown is frame-aligned and absorbs the sub-frame saving).
- **Native write-watch** (`scripts/capacity-window-watch.mjs` — manually
  invoked proof tool, not a standing gate — extended with
  `--stage`, `--expect-stage-bins`, `--expect-range-bin` and `--window-from`),
  XEX and ATR × cold fill `$00`/`$A5`, lifecycle cold start, OPTIONS, START,
  gameplay, pause/resume, one capital sector entered and completed (XEX frames
  1257-2463, ATR 1411-2617), game over, restart, pause/quit: GLUE hold `$8100`
  and `$8602` window (4.3 regression) PASS 4/4; Heavy window `$7E12` with the
  243-B injected pattern at `$7E38`, watched from `layout_d_entity_unpack_complete`
  to the end of the lifecycle, PASS 4/4; both stream stagings byte-equal to
  the packed streams with 0 writes from `init_entity_effects` to the decoder;
  decoded STARFIELD byte-equal to `build/starfield-runtime.bin` at GLUE
  publication, PASS 4/4.
- **PAL (native).** `2-evasive-fire3` 29,519 and `2-sweep-fire4` 29,801 cycles,
  identical to HEAD; 0 missed frames, 0 extra VBI, 0 DLI ordering errors.
  Debris gate PASS on the three natural replays (0 blank, 0 disappearances,
  first Y 24; maxima 30,232 / 30,439 / 30,216).
- **Tests.** New `tests/starfield-staging-streams.test.mjs` (4). Rebaselined
  with the reason in each file: `heavy-window` (direct publish, no hold),
  `layout-d1` (two-copy staging, `stage_a2_kernel` `$212B → $213E`, stream and
  Heavy lifetimes), `transport-layout-regression` (hold `$8100`, two staging
  windows), `runtime-timing` (`STARFIELD_STAGING_BYTES $03C0`, stream B
  equates), `light-wingman` and `broadside-fire` (1,804 B correction gate, two
  streams). Full suite: 644 tests, 115 failing, against 640 tests / 115
  failing on a clean export of `9547bf0` (candidate build then
  `node --test tests/*.test.mjs`); the failure-name sets are identical except
  one explained difference: `tests/pairshot-foundation.test.mjs` "PairShot
  uses one logical record and one character cell for two pulses" fails at HEAD
  (one restored-cell mismatch) and passes on the candidate. Its harness
  (`scripts/pairshot-proof.mjs`) watches the ring rows `$8140-$8577` after a
  harness boot; HEAD's three-copy starfield spill wrote packed bytes into
  `$8140-$81CF`, the candidate stages nothing there.

Candidate XEX `361cb8cf…`, ATR `b8766308…`, owner-smoke copy in
`build/owner-smoke/starfield-staging-swap-361cb8cf/`. Evidence:
[diagnostics/stage-2b2k-starfield-staging-swap.json](diagnostics/stage-2b2k-starfield-staging-swap.json).
Owner smoke PASS 2026-09-17 (M1 accepted as a migration step; the runtime
acceptance checkpoint stays `b4b942e`).

---

## Roadmap 4.5M-M2 — cold-record relocation — **OWNER-ACCEPTED** (owner smoke PASS 2026-09-18)

Boot-transport and cold-lifetime change only, on top of the 4.5M-M1 candidate
(`58404c6`), second step of the 4.5M migration. No gameplay change: linked
runtime 17,502 B, simultaneous 19,493 B, safe 2,694 B, the runtime memory map,
every CODE/BROADSIDE/STARFIELD/A2/ENTITY/PICKUP/C address, the ABI, low-C,
extension and GLUE runtime destinations, the `$8100` GLUE hold, the Heavy
window `$7E12` and the ENTITY order are unchanged (`.lbl` diff: one added
label `layout_d_cold_publish_complete` `$2040`; `encounter-director.lbl`
identical). Goal reached: **`$7BD0-$7E11` has no boot, cold or runtime owner**
(the M3 arena is not declared yet).

- **ABI cold record → `$8018-$808C`** (117 B raw / 116 B packed, 2 sectors,
  unchanged sizes): directly after A2 staging, inside the entity-state page;
  consumed by `publish_director_abi` before `unpack_entity_runtime` and
  255,216 cycles before `init_entity_effects` clears `$8000-$80FF`.
- **low-C + GLUE merged into one LZ record → `$9B40-$9D31`** (498 B raw /
  457 B packed, 4 sectors; separately 245 + 213 = 458 B in 3 + 2 sectors):
  low-C image at `$9B40` (242 B used, 6 B pad to its `$F8` reservation), GLUE
  image at `$9C38`; the Heavy window image rides the tail at `$9D32-$9D5D`.
  Runtime destinations unchanged: low C `$8B88`, GLUE hold `$8100` →
  `$4EFE`, Heavy `$7E12`.
- **Boot order.** `publish_director_abi` (ABI, low C, extension, then the
  GLUE hold and the Heavy copy as its `stage_glue_holding` tail) now runs
  between `unpack_resident_runtime` and `unpack_entity_runtime`;
  `stage_a2_kernel` tail-jumps `stage_starfield_stream` directly. Nothing
  else is reordered; the resident suffix and bootstrap prefix are
  size-neutral (prefix padding 3 B).
- **Deviations from the task text (owner-visible).** (1) The approved `$9B14`
  landing is inside the packed resident staging, which ends at `$9B1E`
  (6,687 B packed; the `$9B13` figure in the memory map was stale), so the
  record lands at `$9B40` with a build-enforced 33 B margin above the measured
  staging end. (2) The Heavy window image cannot keep a 243-B transport
  capacity there: `$9B40` + 498 B leaves 44 B below the direct-landing
  `DIRECTOR_C_PRE` record at `$9D5E`. The runtime window keeps 243 B, the
  build enforces `HYBRID_C_HEAVY_BYTES` ≤ 44 (0 B used today) and the copy
  moves exactly 44 B; M3's arena replaces this staging. (3) The ATR menu
  deadline follows the sector count (546 → 544): the menu also moved 546 →
  544, so the margin is still 0 frames, not weakened or re-baselined.
- **Transport (measured).** 8 → **7 DFMC records** (one slot free for M3);
  178 → **177 transport sectors**; initial content 13,162 B, envelope 22 B,
  103 boot sectors unchanged; manifest 142 → 126 B inside the fixed stage-2
  reservation; XEX 23,104 → 23,100 B; boot image 22,784 → 22,656 B. Sector
  padding: merged 34 B, ABI 119 B (before: GLUE 118 B, low 22 B, ABI 119 B).
  Record order: BROADSIDE 104-148, pickup 149-158, ABI 159-160, merged
  161-164, extension 165-171, pre 172, Director 173-177.
- **Boot CPU (native write-watch clocks, same emulator, HEAD export vs
  candidate).** `start → show_loader` XEX 2,051,496 → **2,047,758**
  (−3,738), ATR 2,051,505 → 2,047,766 (−3,739): the Heavy copy moves 44
  instead of 243 bytes (≈3,227 cycles of the saving). `start →
  layout_d_glue_publish_complete` XEX 11,111,171 unchanged (frame-aligned
  loader), ATR 11,120,699 → 11,113,417. Boot smoke PASS 4/4: XEX menu 392
  (deadline 502) unchanged; ATR menu 546 → **544** against deadline 546 →
  544 (one sector fewer; 0 frames of margin as before).
- **Native write-watch** (`scripts/capacity-window-watch.mjs` — manually
  invoked proof tool, not a standing gate — extended with
  `--hold-done`, windows up to 1,024 B and three added clock points), XEX and
  ATR × cold fill `$00`/`$A5`, lifecycle cold start, OPTIONS, START, gameplay,
  pause/resume, one capital sector entered and completed (XEX frames
  1257-2463, ATR 1409-2615), game over, restart, pause/quit; all PASS 4/4:
  - ABI record `$8018` and merged record `$9B40`: byte-equal to the linked
    images (`encounter-director-code-abi.bin`,
    `encounter-director-code-low-transport.bin`) at `start`, 0 writes until
    `layout_d_cold_publish_complete`, intact at consumption;
    `layout_d_cold_publish_complete` precedes `unpack_entity_runtime` (6
    cycles) and `init_entity_effects` (255,216 cycles);
  - `$7BD0-$7E11` (578 B): 0 writes from `start` to the end of the lifecycle;
    build-time: no record, XEX segment, staging window or hold intersects it;
  - GLUE hold `$8100` watched from `layout_d_cold_publish_complete` (and, in
    the M1 configs, from `stage_starfield_stream`): 0 writes, final GLUE
    equals the hold; `$8602` window equals its linked image, 0 writes;
  - STARFIELD streams A/B byte-equal and untouched, decoded STARFIELD
    byte-equal to `build/starfield-runtime.bin`;
  - Heavy window `$7E12`: the injected 44-B pattern at `$9D32` arrives
    byte-exact, 0 writes from `layout_d_entity_unpack_complete` to the end.
- **PAL (native).** `2-evasive-fire3` 29,519 and `2-sweep-fire4` 29,801
  cycles, identical to HEAD; 0 missed frames, 0 extra VBI, 0 DLI ordering
  errors. Debris gate PASS on the three natural replays (0 blank, 0 disappearances,
  first Y 24; maxima 30,232 / 30,439 / 30,216, identical to M1).
- **Tests.** Rebaselined with the reason in each file: `heavy-window` (merged
  record, 44-B transport, 7 records, 177 sectors, disjoint copy),
  `layout-d1` (publish before ENTITY expansion, call bytes, lifetime model),
  `formats` (no GLUE XEX segment), `starfield-staging-streams` (order),
  `transport-enabler` (fixture landings out of `$7BD0`),
  `transport-layout-regression` (GLUE at `$9C38`; still failing at HEAD and
  here on its stale numeric freezes and `light-wingman.s` include).
  Full suite: 644 tests, 114 failing, against 644 tests / 114 failing on a
  clean export of `58404c6` built in the same environment (candidate build
  then `node --test tests/*.test.mjs`, counting the owner's uncommitted
  `tests/booster-admission-diagnostic.test.mjs`); the failure-name sets are
  identical.

Candidate XEX `a5342494…`, ATR `c6d6ff8c…`, owner-smoke copy in
`build/owner-smoke/cold-record-relocation-a5342494/`. Evidence:
[diagnostics/stage-2b2l-cold-record-relocation.json](diagnostics/stage-2b2l-cold-record-relocation.json).
Owner smoke PASS 2026-09-17 (M2 accepted as a migration step; the runtime
acceptance checkpoint stays `b4b942e`).

---

## Roadmap 4.5M-M3 — `HYBRID_C_ARENA` — **OWNER-ACCEPTED** (owner smoke PASS 2026-09-18)

Infrastructure only, on top of the 4.5M-M2 candidate (`cac8657`), third step of
the 4.5M migration. No gameplay change and no Bomber code (no C tick,
admission, Heavy scheduler, QUAD, hull colour or Heavy marshalling; the
`experiment/bomber-4.5c-blocked-placement` branch is untouched). Every
CODE/BROADSIDE/LIGHT_CODE/A2/ENTITY_CODE/STARFIELD/debris/projectile/backing/
collision/VBI/DLI/PMG address is unchanged (`.lbl` diff: only
`hybrid_c_heavy_publish` removed and the arena symbols added).

- **`$7BD0-$7F0F` = `HYBRID_C_ARENA`, 832 B**, one contiguous reusable runtime
  arena (`HYBRID_C_ARENA_RAM` in `cfg/encounter-director.cfg`) that replaces
  the temporary 243-B `HYBRID_C_HEAVY` window architecture. Segments:
  `HYBRID_ASM_ARENA` (ca65 helpers, linked with the ABI veneer),
  `HYBRID_C_ARENA` (cc65 CODE, `#pragma code-name`) and
  `HYBRID_C_ARENA_RODATA` (cc65 RODATA, `#pragma rodata-name`). Content: the
  1-B `rts` anchor `hybrid_arena_anchor` at `$7BD0`. Used 1 B (ASM 1, CODE 0,
  RODATA 0), free 831 B.
- **Assertions.** ld65 (`src/hybrid/c-asm-abi.s`): start `$7BD0`, capacity
  832 B, end ≤ `$7F10` (A2 display lists), contents ≤ capacity, non-empty
  anchor; `src/main.s`: end ≤ `PLAYFIELD_DLIST_A` and A2 staging, start ≥
  starfield stream A / pause backup end; `scripts/build.mjs`: the same plus the
  arena record as the only owner of the range.
- **Transport (measured).** The arena is its own DFMC record in the slot M2
  freed: LZ, final destination `$7BD0`, 1 B raw / 3 B packed, 1 sector (173),
  104 B padding; direct landing (ATR stage 2 decode, XEX 1-B segment), no hold,
  no publish copy. **8 records, 178 transport sectors** (177 before), initial
  block 103 sectors / 13,162 B unchanged, XEX 23,100 → 23,105 B.
- **Retired.** `hybrid_c_heavy_publish` (its 14 B stay zero padding in place),
  the `stage_glue_holding` tail-jump (now `rts` + 2 B padding), the 44-B Heavy
  tail of the merged record (now 498 B, 44 B below `$9D5E`), the
  `HYBRID_C_HEAVY_*` equates, asserts and manifest `residentCapacity.heavyWindow`
  (now `residentCapacity.arena`). `scripts/chunk-loader.mjs` reviews
  `[$7BD0, $7F10)` as a landing range; `scripts/capacity-window-watch.mjs`
  documents the arena configuration.
- **Accounting.** Physical: linked runtime 17,502 B unchanged, simultaneous
  19,493 → 19,494 B, safe 2,694 → 2,693 B (the anchor). Reserved: arena 832 B
  (replaces the 243-B window). Reusable: arena 831 B free; `HYBRID_C_EXT` 21 B,
  `HYBRID_C_SECTOR` 8 B, ENTITY_CODE 13 B, A2 18 B, pickup fill 11 B unchanged.
  BSS unchanged (16 B C, no C stack, no new zero page). Packed record bytes
  8,751 → 8,754 B.
- **Boot (measured).** Native clocks `start → show_loader` XEX 2,047,758 →
  2,046,995 (−763), ATR 2,047,766 → 2,046,995 (−771): the retired 44-B copy;
  the extra ATR sector read and 3-B decode run before `start`. Boot smoke PASS
  4/4: XEX menu 392 (deadline 502) unchanged; ATR start 229 → 231, menu 544 →
  **546** against deadline 544 → **546** (formula unchanged, 0 frames margin as
  before).
- **Native write-watch** (XEX/ATR × cold fill `$00`/`$A5`; cold start,
  OPTIONS, gameplay, pause/resume, one capital sector entered and completed,
  game over, restart, pause/quit), all PASS 4/4: full arena `$7BD0-$7F0F`
  equal to `build/encounter-director-code-arena.bin` at `start` and 0 writes
  to the end of the lifecycle, combined with the M2 ABI (`$8018`) and merged
  (`$9B40`) record checks and GLUE hold from `layout_d_cold_publish_complete`;
  M1 streams A/B, decoded STARFIELD, GLUE hold `$8100` and `$8602` window.
- **Capacity proof (throwaway, not committed).** 20 cc65 functions (775 B
  CODE) + 34 B cc65 RODATA + 22 B ca65 helper behind the anchor: exactly 832 B
  linked; 833 B fails in ld65. Record 363 B packed, 3 sectors (180 transport
  sectors). Native write-watch PASS 4/4 byte-exact over all 832 B on XEX and
  ATR. Boot smoke: XEX 392; **ATR menu 551 vs deadline 550 (one frame late)**
  — see the boot-smoke margin under open defects; not a gate of this
  candidate, relevant to the Bomber retry.
- **PAL (native).** `2-evasive-fire3` 29,519 and `2-sweep-fire4` 29,801 cycles,
  identical to M2; 0 missed frames, 0 extra VBI, 0 DLI ordering errors. Debris
  gate PASS (maxima 30,232 / 30,439 / 30,216).
- **Tests.** `tests/heavy-window.test.mjs` → `tests/hybrid-c-arena.test.mjs`
  (3 tests: arena contract, direct-landing record, retired Heavy transport);
  rebaselined `layout-d1` (suffix tail, lifetime model) and
  `starfield-staging-streams` (arena instead of the Heavy window). Full suite:
  643 tests, 114 failing, against 644 / 114 on a clean export of `cac8657`
  (the renamed file has 3 tests instead of 4); the failure-name sets are
  identical.

Candidate XEX `cbba293f…`, ATR `a75c62b9…`, owner-smoke copy in
`build/owner-smoke/hybrid-c-arena-cbba293f/`. Evidence:
[diagnostics/stage-2b2m-hybrid-c-arena.json](diagnostics/stage-2b2m-hybrid-c-arena.json).

---

## Emitter-independent hostile shots — **OWNER-ACCEPTED** (owner smoke PASS 2026-09-18)

Owner decision 2026-09-17: an already-emitted hostile projectile is
independent of its emitter and continues its normal lifecycle after the enemy
dies (Raider, Light Wingman, Interceptor, future Bomber shell).

- **Root cause.** Every lethal Raider hit ran
  `begin_enemy_fighter_explosion_with_projectile_cleanup`, freeing the hostile
  slots whose ACTIVE bit 0 matched the dead Raider; Light shots carry the P1
  tag, so they vanished with Raider P1. The Light kill path never cleared
  shots; no C code touches projectile slots.
- **Change.** `spawn_interceptor_breakup_effects` jumps straight to
  `begin_enemy_fighter_explosion`; the 27-B cleanup routine is removed.
  Owner/class bits stay (allocation, burst alternation, tracing). Shots still
  end on player collision, lifetime expiry, the bottom edge, player death
  (`clear_interceptor_pulses`), respawn (`clear_fighter_projectiles`) and new
  game/quit (`init_fighter_projectiles`); capital admission already waits for
  released shots.
- **Placement (measured).** ENTITY_CODE 3,153 → 3,126 B; free ENTITY tail
  13 → 40 B; Light art `$9D31-$9D50` → `$9D16-$9D35`; linked runtime
  17,502 → 17,475 B; simultaneous 19,494 → 19,467 B; safe 2,693 → 2,720 B;
  initial boot content 13,162 → 13,137 B; 178 transport sectors unchanged;
  BSS, zero page and C stack unchanged. No memory-architecture change.
- **CPU.** No added code; per-kill cost −144 cycles (5-slot scan gone).
  Orphaned shots live out their lifetime inside the unchanged 5-slot pool.
  Native PAL, 21 sessions: 0 missed frames, 0 extra VBI, 0 DLI errors; worst
  30,820 → 30,820 (`director-complete-1`); largest delta
  `debris-effects-2-sweep-fire4` 30,216 → 30,767 (diverging replay);
  `2-evasive-fire3` 29,519 → 29,570, `2-sweep-fire4` 29,801 unchanged.
- **Gates.** Boot smoke PASS 4/4 (XEX menu 392; ATR 546 vs deadline 546).
  PairShot-stale native PASS. Raider-remnant native: 200 emitter-owned shots at
  135 kills all continued, 0 removed, 0 foreign removed, 0 stale cells / orphans
  (report fails only on the pre-existing explosion count). Debris gate: 2/3 PASS;
  `0-evasive-fire3` has 1 blank frame in 1,013 caused by the pre-existing
  death-frame blink (open defects); baseline PASS 3/3 on its own diverging
  replay.
- **Tests.** New `tests/hostile-projectile-emitter-independence.test.mjs` (6,
  all fail on `2a67684`); updated `raider-projectile-ownership`,
  `light-wingman`, and the measured sizes in `light-interceptor` and
  `hybrid-c-arena`. Full suite: failure-name set identical to `2a67684`
  except one renamed ownership test that keeps its pre-existing harness score
  assertion (0x35 ≠ 0x10).

Candidate XEX `f9c4a96d…`, ATR `5e026009…`, owner-smoke copy in
`build/owner-smoke/hostile-shot-independence-f9c4a96d/`. Evidence:
[diagnostics/stage-2b2n-hostile-shot-emitter-independence.json](diagnostics/stage-2b2n-hostile-shot-emitter-independence.json).

---

## Roadmap 4.5c — Bomber (decision 20) — **OWNER-ACCEPTED** (owner smoke PASS 2026-09-18)

The `BLOCKED_PLACEMENT` design of `experiment/bomber-4.5c-blocked-placement`
(`8e138a8`) reapplied on top of `67bfa73` with its Heavy formation C in the
4.5M-M3 arena. No redesign; the only adaptations are placement (arena
pragmas and veneer segment), an `asl/asl/asl/ora` class encoding in the
allocator (the build-time 6502 model has no `ROL A`) and the checked-in
`LIGHTFILE` placeholder size for raw test links.

- **Gameplay (candidate).** Fourth `EnemyArchetype` (offset 36): HP 4, lane
  sweep, single shot, pause 80/64/48, `BOMBER` class, score `$50`, Heavy
  `P1`/`P2` renderer with QUAD `SCYTHE_BOMBER` art in hull colour `$24`
  (recycle restores `$44` for the broadside missiles). Slot 0 sweeps X 48-92,
  slot 1 X 132-176 at 1 HPOS/frame, turning at lane edges or on a per-slot
  24-55-frame timer; entry at 1 line/frame to depth 40 / 16, then 1 line every
  other frame on opposite parity; each member fires on its own timer (first
  shot 48 / 72 frames) only for Y 24-200, player alive, capital not due. A
  **TEMPORARY 4.5 HEAVY SMOKE SCHEDULER** alternates Raider (with Light escort)
  and Bomber (no escort) formations, Raider first; roadmap 4.6 replaces it.
- **Ownership.** C: record, formation schedule, profile publication from the
  selected record, admission, lane-sweep tick and fire decision. ASM:
  `heavy_member_update` marshals the member's five slot bytes around
  `enemy_c_heavy_tick` and emits the returned class through the generic
  allocator (`ACTIVE = class << 3 | 2 | slot`, `$1A/$1B`); arena veneers write
  the hull colour to `COLPM1`/`COLPM2`. Raider formations keep their ASM
  motion.
- **Placement (measured).** Arena 392 / 832 B (ASM 20 incl. anchor, C 339,
  RODATA 33; 440 B free), record 355 B packed in 3 sectors. `HYBRID_C_EXT`:
  records 50 B + C 563 B + `LIGHT_CODE` 203 B + `HEAVY_CODE` 55 B, **tail 28 B**
  (21 B before; floor 16 B). `PICKUP_CODE` 769 → 773 B (fill 7 B). BSS +10 B:
  `$8119` Heavy schedule counter, Light counter moved to `$811A`,
  `HYBRID_HEAVY_STATE` `$811B-$8123`; C stack 0, new zero page 0. 180 transport
  sectors (178); XEX 23,105 → 23,497 B.
- **Accounting.** Physical: linked runtime 17,475 → 17,479 B, simultaneous
  19,467 → 19,855 B, safe 2,720 → 2,332 B. Reserved: unchanged. Reusable:
  arena 831 → 440 B, EXT tail 21 → 28 B, pickup fill 11 → 7 B.
- **CPU.** Build harness: Bomber member tick worst 545 cycles with a shot, 374
  without (≈1,090 per frame if both fire); admission 1,121, recycle 45 once per
  formation. Native PAL focused replays (67bfa73 → candidate, Bomber frames
  found by `colpm1 = $24`): `2-sweep-fire4` 29,801 → 29,101, `2-sweep-fire6`
  29,849 → **30,075**, `2-neutral-fire0` 29,807 → 29,894, `2-evasive-fire3`
  29,570 → 29,822; 0 missed frames, 0 extra VBI, 0 DLI errors (diverging
  replays).
- **Gates.** Boot smoke PASS 4/4: XEX 78/135/392; ATR start 235, loader 293,
  menu **550 vs deadline 550** (0 frames margin). Arena write-watch PASS 4/4
  (image exact at `start`, 0 writes). Debris gate PASS 3/3 (maxima 30,038 /
  29,881 / 30,077, with Bomber frames); `67bfa73` fails `0-evasive-fire3` on
  its own replay with the known death-frame blink, which is not fixed here.
- **Tests.** New `tests/heavy-bomber.test.mjs` (12). Rebaselined
  `hybrid-c-arena`, `hybrid-lifecycle`, `light-interceptor`, `light-wingman`,
  `cold-pickup-record-fit`, `enemy-combat`, `raider-projectile-ownership`
  (+ its runtime script), `hostile-projectile-emitter-independence`,
  `enemy-roster` (QUAD width, schedule shape) and `offscreen-spawn` (Bomber
  generation). Full suite 661 tests / 114 failing; failure names identical to
  a clean export of `67bfa73` plus the owner's untracked booster diagnostic,
  which fails identically there.

Candidate XEX `0e4721b2…`, ATR `42985ceb…`, owner-smoke copy in
`build/owner-smoke/bomber-4.5c-0e4721b2/`. Evidence:
[diagnostics/stage-2b2o-bomber-arena.json](diagnostics/stage-2b2o-bomber-arena.json).

---

## Death-frame deferral (Option E) — **OWNER-ACCEPTED** (owner smoke PASS 2026-09-18)

On top of the roadmap 4.5d Enemy Identity Freeze WIP (`7b50bd6`, its report:
[diagnostics/stage-2b2p-enemy-identity-freeze-report.md](diagnostics/stage-2b2p-enemy-identity-freeze-report.md),
corrected 2026-09-18) and the timing tooling (`423818e`). The branch now passes
the PAL timing gate that 4.5d failed; 4.5d itself is presented to the owner
together with this fix (the report's option 2).

- **Change.** The PMG publication of the player death is deferred by one
  frame. `apply_player_damage` keeps every decision and clear (lifecycle
  `DYING`, life, `erase_bullet`, `clear_interceptor_pulses`,
  `clear_transient_effects`, HUD, hit sound) but no longer calls
  `begin_player_fighter_explosion`; the first DYING tick of
  `update_player_death` (`player_dying_tick`, 18 B in the ENTITY_CODE tail)
  begins it when the player explosion slot is idle, so the death frame pays
  neither `erase_player` nor the first explosion phase. `BROAD_DEATH_TIMER` is
  now `SHARED_FIGHTER_EXPLOSION_TOTAL+1` (25): the explosion still erases
  itself in the respawn frame, before `respawn_player`. No C, enemy, ring,
  backing/restore, collision, VBI/DLI or PMG-kernel change; hostile pools are
  still zeroed on the death frame.
- **Why not the enemy update or the ring.** Both misses are Light contact
  kills inside `light_update`, after `integration_update_enemy` and
  `rotate_playfield_rows` have already run in the frame; the transition
  cannot skip work that precedes it. Skipping the Light breakup on a lethal
  contact (C-owned) would save ~2,800 more but needs ~14 B in `HYBRID_C_EXT`
  (tail 19 B, floor 16 B): an owner placement decision, not taken.
- **Placement (measured).** BROADSIDE 6,650 B unchanged (size-neutral edits,
  `free_broadside_slot` `$76A7` asserted); ENTITY_CODE 3,126 → 3,144 B
  (`player_dying_tick` `$9D36-$9D47` behind the unmoved Light art, tail 40 →
  22 B); 182 transport sectors, initial boot content 13,132 → 13,150 B
  (envelope 52 → 34 B); linked runtime 17,479 → 17,497 B; `.lbl` diff: only
  the new labels and the ENTITY_CODE size.
- **PAL (measured).** PAL timing audit section above: 0 distinct miss events
  across 67 replays, worst margin 466 (`raider-remnant-rapid-xex-hard` row
  1945, −765 before), row 3007 +1,043 (−407 before); the measured saving per
  death frame is 1,231-1,465 wall cycles. Debris gate: `0-evasive-fire3` and
  `capital-muzzle-ring` PASS; `0-neutral-fire0` 1 blank frame in 1,558
  post-capital frames at host frame 5426, a player-death frame with four
  PairShots erased mid-frame — the documented pre-existing death-frame blink,
  not caused here (its 32 blank frames at `7b50bd6` were the overrun's
  aftermath and are gone). Raider-remnant: fails only on the pre-existing
  explosion count (42/42 emitter shots continued, 0 stale, 0 orphans).
- **Boot smoke.** PASS 4/4: XEX menu 392; ATR menu 554 against deadline 554.
- **Tests.** New harness test (entity-effects): deferred begin, 25-frame
  DYING, explosion erase before respawn. Rebaselined with the reason in each
  file: `game-over`, `score`, `hud-status`, `entity-effects`, `broadside-fire`,
  `light-wingman`, `light-interceptor`, `hybrid-c-arena`, and the
  `scripts/broadside.mjs` model. Focused set 181 tests / 13 failing and full
  suite 675 / 114, both the identical failure-name set to a clean export of
  `423818e` (674 / 114).
- **Owner-visible.** The fighter stays visible one extra frame after a lethal
  hit and shows the ordinary hit flash on it before the death flash; respawn
  and Game Over come one frame later.

Candidate XEX superseded by the respawn double-image fix below. Evidence:
[diagnostics/stage-2b2r-death-frame-deferral.json](diagnostics/stage-2b2r-death-frame-deferral.json).

---

## Respawn double image after the deferral — fixed — **OWNER-ACCEPTED** (owner smoke PASS 2026-09-18)

Owner smoke of `b8ed318c…` **FAILED**: on every death, two PlayerFighter images
appeared during respawn — one at the corridor centre, one four colour clocks
left — flickered, then resolved to one ship. Fixed here; the deferral itself is
unchanged.

- **Cause (measured).** `player_dying_tick` guarded the deferred begin with
  "player explosion slot timer 0 means begin pending". On the LAST DYING frame
  that is false: `tick_shared_fighter_explosions` runs earlier in the same
  frame and, at `EXPL_TIMER` 1, erases the slot and decrements it to 0. The
  guard then read 0, restarted the explosion at the still-pre-death
  `player_x`/`player_y`, and fell through two instructions later to
  `respawn_player` — publishing a second image into P0/P3 for a further 24
  frames and leaving `HPOSP0`/`HPOSP3` at the explosion X instead of
  `PLAYER_RESPAWN_X`. `BROAD_DEATH_TIMER = SHARED_FIGHTER_EXPLOSION_TOTAL+1`
  is what makes both timers finish on that one frame. A regression of the
  deferral, not pre-existing: `2a8ff26` has no begin call in the DYING path.
- **Fix.** The finishing frame leaves before the idle-slot test:
  `player_dying_tick` decrements `BROAD_DEATH_TIMER` first and branches to
  `update_player_death_finished` on zero, so only a non-finishing DYING frame
  reaches the idle-slot test and the begin. `apply_player_damage` is the only
  entry into DYING and sets `PLAYER_DYING` and
  `BROAD_DEATH_TIMER = SHARED_FIGHTER_EXPLOSION_TOTAL+1` in one unbranched
  tail, so "not the finishing frame" is exactly "not yet begun, or still
  running". No begin-pending flag needed, no RAM, 18 B unchanged.
- **Unchanged.** The deferral stands: the death frame still pays neither
  `erase_player` nor the first explosion phase, DYING still lasts 25 frames,
  the explosion still self-erases in the respawn frame before `respawn_player`.
  BROADSIDE 6,650 B (`free_broadside_slot` `$76A7` asserted); ENTITY_CODE
  unchanged; `.lbl` diff is one cheap local label (`.@tick` → `.@running`).
- **PAL (measured).** 0 distinct miss events across 67 replays; **timing-
  neutral** — no session's worst fence margin moved. Worst margin still 466
  (`raider-remnant-rapid-xex-hard` row 1945); row 3007 still +1,043. Death-frame
  cost +0; respawn frame −809 cycles (`update_player_death` 1,898 → 1,562,
  `render_shared_fighter_explosions` 493 → 20).
- **Boot smoke.** PASS 4/4: XEX menu 392; ATR menu 554 against deadline 554.
- **Debris gate and raider-remnant.** Byte-identical to `b8ed318c`: the one
  `0-neutral-fire0` blank frame (pre-existing death-frame blink) and the
  remnant explosion-count failure both persist unchanged, A/B-verified against
  a build of `ac67d9e`.
- **Tests.** The old deferral test could not see this: it never re-read the
  explosion timer after the final `update_player_death`, never called
  `render_shared_fighter_explosions`, and asserted nothing about P0/P3,
  `HPOSP0`/`HPOSP3` or `COLBK`. Two new entity-effects tests drive the full
  main-loop order through frame N+50 and assert one published image, the
  respawn HPOS and no death-flash replay; both fail on a rebuilt `b8ed318c`.
  The `game-over` `player_dying_tick` source freeze is rebaselined with the
  reason in the file. Focused set 175 tests / 17 failing, the identical
  failure-name set to a build of `ac67d9e` (173 / 17).

Candidate XEX `3ce1a1d6…`, ATR `823b961b…`. Evidence:
[diagnostics/stage-2b2s-respawn-double-image.json](diagnostics/stage-2b2s-respawn-double-image.json).

---

## Debris score (owner change request) — **OWNER-ACCEPTED** (owner smoke PASS 2026-09-18)

- **Request.** Destroying interactive debris awarded nothing; it must award a
  single difficulty-independent `DEBRIS_SCORE = $05`. Debris is an obstacle,
  not an enemy: the value stays an order below the Bomber's `$50` so clearing
  debris cannot compete with killing enemies.
- **Where.** `entity_debris_destroyed` (`src/main.s`, ENTITY_CODE) is reached
  only from `entity_debris_hit`, itself reached only from
  `entity_player_fighter_projectile_debris_target` — the lethal PlayerFighter
  shot. It now calls the new 18-B `add_debris_score`, which is the same
  mechanism as `light_add_score` / `add_archetype_score_tail`: one packed-BCD
  add and `jmp update_score_display`. No per-object state, no new RAM beyond
  the constant, no collision-architecture change.
- **Not scored.** Player contact (`entity_player_debris_overlap`), the despawn
  path (`entity_despawn_debris`) and the sector-boundary release all reach
  `integration_debris_release` without passing through
  `entity_debris_destroyed`, so they award nothing. A non-lethal hit awards
  nothing. *Superseded for player contact by the contact-score section below
  (2026-09-18): contact now awards the same `DEBRIS_SCORE`.*
- **Cost.** ENTITY_CODE `$C48` → `$C5D` (+21 B: the routine plus its call);
  ~105 cycles, only on a debris-kill frame. BROADSIDE 6,650 B unchanged
  (`free_broadside_slot` `$76A7` asserted); `HYBRID_C_ARENA` 614/832 B used,
  218 free, unchanged; transport 182 sectors, boot 103 sectors, both unchanged.
- **PAL (measured).** 0 distinct miss events across the audited replays.
  Worst fence margin 466 → **463** (`raider-remnant-rapid-xex-hard`, pre-wait
  24,811 → 24,802); `debris-gate-0-neutral-fire0` row unchanged at pre-wait
  24,206 / margin +1,043.
- **Boot smoke.** PASS 4/4: XEX menu 392; ATR menu 554 against deadline 554.
- **Debris gate.** A/B-identical to a rebuilt `1358ea1`: same lives per phase
  in all three sessions and the same single `0-neutral-fire0` blank frame
  (pre-existing death-frame blink).
- **Pre-existing native failures, A/B-verified unchanged on `1358ea1`:** the
  default wall-trace abort at `weapon-pickup-contact-2-hunt-fire4`, the same
  abort on `weapon-pickup-overlap-2-hunt-fire4`, the
  `capital-muzzle-ring-2-sweep-fire4` stale muzzle/flash abort, and the
  emulator status-2 exits of `capital-contact-{allied,hostile}-medium` and
  `lower-playfield-hostile-contact-xex-hard`.
- **Tests.** New `tests/debris-score.test.mjs` (5 tests): the trace-driven
  lethal award, a non-lethal hit, the contact path, the despawn path and a
  single-call-site source contract. `entity-effects` debris destruction and the
  `hybrid-c-arena` byte ledger rebaselined.

Candidate XEX `07dea143…`.

## Enemy roster freeze (owner decision 21, 2026-09-18)

**ROSTER FREEZE.** With the 4.5d Enemy Identity Freeze accepted, the enemy
roster is closed: **no new enemy archetype without a new owner decision.** This
makes binding what owner decision 20 announced ("the Bomber is the last MVP
archetype"). From here, new gameplay content comes from waves, flight paths,
sector subtypes and boosters — not from new enemy types. The 4.7 boss is not an
enemy archetype and the freeze does not cover it.

The accepted roster is: Raider and Bomber (Heavy, `P1`/`P2`), Wingman and
Interceptor (Light, character-rendered).

## Current task

**Owner decision A — the ATR must boot without OPTION — is implemented and is
an `OWNER-SMOKE CANDIDATE`; see the section below.** It is not the only
outstanding candidate: owner decision B (the open BASIC window) and the
main-menu title colour run are also awaiting smoke. `0002d84` is still the accepted runtime checkpoint: **Option D, the
Bomber standing cost (roadmap item 1 below), is OWNER-ACCEPTED** (owner smoke
PASS 2026-09-18 on XEX `ecc9ceda…`). `draw_enemy_member` skips the 16-row
`P1`/`P2` body copy on frames where a member's Y is unchanged; X still goes out
through `HPOSP1,x` every live frame. Measured result in the section above: the
worst fence margin rises from **450/466 to 1,464 cycles** and the native
stale-body gate reads 0. **Three `OWNER-SMOKE CANDIDATE`s are outstanding: owner decision A (the ATR
boot fix), owner decision B (the open BASIC window) and the main-menu title
colour run** (sections below). The sentence that previously stood here, "No
`OWNER-SMOKE CANDIDATE` is outstanding", was a leftover from before decision A
and contradicted both the paragraph above it and the Checkpoint section;
corrected 2026-09-20, and corrected again the same day as candidates B and the
title fix landed.

**Light multiplicity (roadmap 4.6 prerequisite) is an `OWNER-SMOKE CANDIDATE`
through step 5**, on branch `experiment/light-multiplicity` — see its section
above for what it is, what it measured and the three owner decisions of
2026-09-21 (the margin threshold, effect scheduling, and the rotate-frame gate
recorded as a costed follow-up).

**Tooling, 2026-09-21 (this session, no production code):** the two owner
decisions on the release gate and the five stale pins are implemented. `npm test`
runs to completion on the **default** build — 744 tests, 631 pass, **110 fail,
0 new** against the 118 of `d4f085c` — and that default-build list is now the
reference baseline for every "is this a regression?" question. The recorded gate
failures live in `docs/recorded-gate-failures.json`, the one file the build gate
and the tripwire share. The XEX, ATR and boot BIN are byte-identical to
`d4f085c`; nothing about the runtime changed, so no owner smoke is owed for it.

**NEXT TASK.** Owner smoke of the Light multiplicity candidate. After that, the
first of these two, in this order:

1. **The rotate-frame token gate** — costed, GO recommended, ~1,000 cycles of
   margin on the binding frames, with the two-frame bound already designed
   (`plan-light-multiplicity.md` §4.6). It is the cheapest margin left.
2. **Roadmap 4.6 itself**, which must open by setting an explicit per-frame
   cycle budget in its own plan, against the measured worst margin at the
   checkpoint it branches from — not against the historical margins in this
   file. See §4.4 of the same plan.

## Main-menu title colour run — fixed — `OWNER-SMOKE CANDIDATE` (2026-09-20)

The menu title coloured **12** cells of a **14**-character title: on screen
`VOID STRIKE` was highlighted and `65` was left in the plain colour. Two sides
encoded the title's length and only one followed the 2026-09-04 rename
(`d72dd6a`): `scripts/preview.mjs` derived its run from the title record,
`src/main.s`'s `style_main_menu_title` hard-coded `ldx #11`. The defect stood
from 2026-09-04 and was masked because `--menu-raster-only` aborted in its
static clauses before reaching a live session. Diagnostic:
[diagnostics/menu-title-colour-run-two-cells-short.md](diagnostics/menu-title-colour-run-two-cells-short.md).

**Fixed by derivation, not by a corrected literal.** The title string now
exists once in the repository, as `.define MAIN_MENU_TITLE_TEXT` in
`src/main.s`; `MAIN_MENU_TITLE_LENGTH = .strlen(MAIN_MENU_TITLE_TEXT)` is what
`style_main_menu_title` loads, and the screen record emits the same define.
`scripts/preview.mjs` gained a ca65 `.define` expansion pass and `.strlen`
support, and no longer carries the title as a literal of its own.
`tests/frontend.test.mjs` evaluates the routine's `ldx` operand and compares it
with the record's own length, so neither side can be handed a number again;
the test reads `12 !== 14` at `6190d2e`.

**Cost: 0 bytes, 0 cycles.** `build/void-strike-65.lbl` is byte-identical to
the pre-fix build and every segment size is unchanged; the only map difference
is the `main.s` line number of a segment's first contribution. The loop runs
two iterations more per menu build, outside the visible frame.

**`--menu-raster-only` now clears the title clause** and every other
per-snapshot clause, and stops one clause further along, on the harness's
hard-coded `canonicalRasterSha256` (`runtime-wall-trace.mjs:1992`) — an
accepted-raster hash captured before the fix. All ten required checkpoints
agree on one new raster,
`ee08628457a1c489a7ee780c7e2739410c31284c53e9b021f4d2ff8efad8999a`. That hash
was deliberately **not** updated here: it is the accepted player-visible image,
so re-accepting it is the owner's call. With it swapped locally the audit runs
to completion, 8/8 sessions — it is the only thing left in the way.

**Gates.** Boot smoke **8/8**. PAL timing audit over every replay that runs —
the default set to its pre-existing abort, each post-abort session by
`--only-session=`, then `--raider-formation-only`, `--raider-sector-only`,
`--debris-gate-only` and `--raider-remnant-only` — **72 replays, 137,000
frames, 0 distinct miss events, every replay PASS**. Worst fence margin
**1,464 cycles** (`raider-remnant-rapid-xex-hard`, frame 1945, maxWall 30,437);
maximum wall across the set 30,609 cycles. The worst margin is unchanged from
the accepted Option D figure, as a 0-cycle change should leave it.

**Test suite**: `npm test` cannot complete at this HEAD and could not before
this change either — its final (non-candidate) build requires
`docs/runtime-wall-trace.json` to bind to the current artifacts, and the
committed report still binds to XEX `ab682d84…`, 21,399 B. Verified by A/B:
`node scripts/build.mjs --quiet` fails with the identical
`Runtime wall trace binding mismatch` with this session's source changes
stashed. Against a candidate build the suite reads **694 tests / 578 pass /
113 fail**, versus **693 / 577 / 113** at `6190d2e`, and the two failing-test
name sets are **identical** — one new test, one new pass, no regression.

## Owner decision A (2026-09-20) — the ATR must boot without OPTION — **OWNER-SMOKE CANDIDATE**

**Not accepted. Needs owner smoke AND a real-hardware smoke this session could
not run** (see "What the owner must verify on SIO2SD" below).

### The defect

Distribution defect, not a gameplay one. The free ATR only reached the game if
the player held OPTION at power-on. `boot_entry` ended in `rts` and relied on
OS coldstart jumping through `DOSVEC`; coldstart only does that when no
cartridge is enabled. Measured by the feasibility session in the trace
emulator: with BASIC enabled the ATR loads all 182 sectors and the PC then
lands at **$A8AA inside the BASIC ROM at frame 223**, and the menu never
arrives by frame 2500; with BASIC off the menu arrives at frame 555.

It went unnoticed because **all four boot-smoke cold sessions ran `-nobasic`**.
No gate ever exercised the OS path that fails.

### The boot sequence change

- `boot_stage2_atr_entry` now begins `jsr disable_basic_rom`, ahead of the SIO
  chunk load; `boot_stage2_xex_entry` likewise, ahead of `jmp start`.
- `boot_entry` ends `jmp start` instead of `clc` / `rts`. The OS is never
  returned to. `DOSVEC` is still published — for the warm-start path and for
  the boot-smoke ATR entry-identity invariant.
- `disable_basic_rom` is `lda PORTB / ora #$02 / sta PORTB / lda #$01 /
  sta BASICF / rts`. Read-modify-write, so **bit 0 (OS ROM) and bit 7
  (self-test) are preserved** and only bit 1 is forced to 1; `BASICF` ($03F8)
  = $01 is the flag the OS warm start re-reads, so RESET does not map the ROM
  back in.
- **Ordering.** Writes into a mapped ROM window are lost, so the unmap runs at
  each medium's stage-2 entry — strictly earlier than every write either medium
  makes. Nothing in this build targets `$A000-$BFFF` today (ATR chunk staging
  is `$8100`; no segment in `cfg/atari-boot.cfg` loads above `$9FFF`), so no
  write was being lost before the change either; unmapping first makes that
  structural rather than incidental.
- It is not in `start` because the fixed `$01A3` bootstrap prefix has fewer
  than three bytes free, and not at the top of `boot_entry` because
  `boot_entry` must stay exactly 24 bytes: `start` is pinned at `$201E` since
  `scripts/build.mjs` requires `resident_runtime_suffix` at `$21C1` = `start` +
  `$01A3`. The 14-byte routine reuses the retired 4.5M-M3 padding exactly, so
  every later address is unchanged, and `boot_return` (the OS init vector)
  shares its `rts`.

### Cost

The initial boot block was **exactly full** (13,172 content + 12 envelope =
103 × 128), so the six bytes of call sites cost one sector: initial block
**103 → 104**, transport **182 → 183**. Deliberate growth under owner decision
22. `docs/boot-deadline-baseline.json` was **not** re-recorded — the measured
ATR menu frame did not move. `tests/starfield.test.mjs` re-records
`initialBootSectors` 103 → 104 (a transport-format pin, not a deadline pin).

### Boot smoke — now eight cold sessions, 8/8 pass

`-basic` sessions added on both media at both cold RAM fills.

| Session | Medium | Cold fill | BASIC | `menu` | `frontend_poll` | baseline | delta |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| `xex-a5` | XEX | `$A5` | off | 392 | 393 | 392 | 0 |
| `xex-5a` | XEX | `$5A` | off | 392 | 393 | 392 | 0 |
| `atr-a5` | ATR | `$A5` | off | **554** | 555 | 554 | 0 |
| `atr-5a` | ATR | `$5A` | off | **554** | 555 | 554 | 0 |
| `xex-a5-basic` | XEX | `$A5` | **on** | 383 | 384 | 392 | -9 |
| `xex-5a-basic` | XEX | `$5A` | **on** | 383 | 384 | 392 | -9 |
| `atr-a5-basic` | ATR | `$A5` | **on** | **538** | 539 | 554 | -16 |
| `atr-5a-basic` | ATR | `$5A` | **on** | **538** | 539 | 554 | -16 |

The ATR menu frame did **not** move on the BASIC-off sessions despite the extra
sector. With BASIC enabled both media reach the menu *earlier* — OS coldstart
takes a shorter path when a cartridge is enabled.

**Negative control.** The pre-fix source was rebuilt and run against the new
eight-session gate: `atr-a5-basic` fails ("did not reach a complete loader
raster by frame 300") while the four `-nobasic` sessions and both
`xex-*-basic` sessions pass. The new coverage reproduces the reported defect
and localises it to ATR × BASIC-enabled. **The XEX was never affected**: it
enters at `RUNAD = boot_stage2_xex_entry` and never executes `boot_entry`, so
it never depended on `DOSVEC`.

### PAL timing audit

Full set re-run on this build: default wall-trace run, then
`--raider-formation-only`, `--raider-sector-only`, `--debris-gate-only`,
`--raider-remnant-only`, then the standalone summary over
`build/runtime-wall-trace`.

**72 replays, 137,000 traced frames, 0 distinct miss events**, 0 rows over
target, 0 over the hard gate, 0 fence-model disagreements, every session
`passed`. Worst fence margin **1,464 cycles** on `raider-remnant-rapid-xex-hard`
frame 1945 (max wall 30,437) — byte-for-byte the Option D worst margin, as
expected: this change adds no gameplay-time work, only 14 B of one-shot boot
code and 6 B of call sites. Next five: 1,713 on
`memory-integrity-{xex,atr}-2-hunt-fire4`, `raider-remnant-normal-xex-hard` and
`weapon-pickup-2-hunt-fire4` (frame 1963), then 1,831 on
`director-complete-1-natural-sweep-fire0`.

The replay set covers the 64-replay default run (the eleven `baseline-9040`
sessions, targeted, parallax cadence, fighter flash, debris effects, weapon
pickup and its traversal/contact/overlap sessions, the three director-completion
runs, early-enemy, memory-integrity, lower-playfield, engine startup and
engine-restart) plus `two-pmg-raiders-xex-hard`, `raider-sector-xex-hard`, the
three debris-gate replays and the three raider-remnant replays.

Every behavioural failure in the set is the recorded pre-existing one, with
unchanged numbers: the three "did not capture 16 consecutive contact rasters"
sessions, the default run's terminal pickup-raster abort, `raider-sector-xex-hard`
"did not return to post-sector OPEN", and the debris visibility gate's
`debris-gate-0-neutral-fire0` post-capital 1 blank / 1,558 in view / 1
disappearance — identical counts to the recorded `0a90c1c` baseline.

### Test suite

`node --test tests/*.test.mjs` A/B against HEAD `80bf1e2` on the same machine:
**577 pass / 112 fail before and after, 0 new failures.** The 112 are the
pre-existing set caused by the stale, currently un-regenerable
`docs/runtime-wall-trace.json`; `npm test` itself is blocked at HEAD too,
because it runs a *final* build which refuses to bind to that stale report.
`tests/runtime-wall-trace.test.mjs` now asserts the boot-smoke session list as
a (medium, cold RAM fill) matrix per BASIC state instead of a pinned count of
four, so it validates the stale committed four-session report and a live
eight-session one exactly, and does not become a trap when that report is
finally regenerated.

### What the owner must verify on SIO2SD

Emulator success is necessary but not sufficient, and this changes the boot
contract. On a stock 65XE PAL from SIO2SD:

1. the ATR boots to the main menu with **BASIC enabled and nothing held on the
   keyboard**;
2. the ATR still boots with **OPTION held**;
3. the XEX still runs in both cases;
4. **RESET during gameplay does not bring the BASIC ROM back** (this is what
   the `BASICF` write is for and it is the part an emulator proves least well);
5. load time is unchanged in practice — the transport grew by one sector.

Until 1-4 pass on hardware, the ATR boot contract is proven in Atari800 only.

### Evidence

[diagnostics/atr-basic-enabled-boot.json](diagnostics/atr-basic-enabled-boot.json).
Documentation corrected with it: `hardware-testing.md` (the "No BASIC
dependency" line was **wrong before this fix and is right after it**; the
correction is recorded inline, with new cold-start and real-hardware boxes),
`memory-map.md` (`$A000-$BFFF` is now unconditionally RAM), `architecture.md`
(cold-startup handoff, 104-sector initial block).

## Roadmap (owner decision 21, 2026-09-18)

This ordering **replaces** every earlier ordering in the documents, including
the "roadmap after 4.5" list in owner decision 20. The full text of each item
is in [plan-realizacji.md](plan-realizacji.md) §4.

1. **Option D — Bomber standing cost.** Skip the 16-row `P1`/`P2` body copy in
   `draw_enemy_member` when a member's Y is unchanged (X goes through
   `HPOSP1,x` anyway). ~1,164-2,328 cycles per frame with two Bombers. This is
   a **hardware-critical renderer invariant**: it needed a High plan with proof
   of every `P1`/`P2` writer and of the pause and respawn paths.
   **OWNER-ACCEPTED** (owner smoke PASS 2026-09-18, `0002d84`): the worst fence
   margin rises from
   450/466 to **1,464 cycles**, and a native `enemy_pmg_mismatch` gate now
   rebuilds the expected plane every traced frame and holds the skip to its
   invariant.
2. **Population budget measurement** — three numbers that gate 4.6 wave design:
   (a) how many Lights fit simultaneously with debris and a pickup capsule
   live; (b) how many Heavy + debris + capsule (roughly known: 1,464 cycles of
   margin with two Bombers after Option D, 450/466 before it); (c) what debris
   alone costs as object count rises.
   The same task answers: does player-vs-capital-hull collision read the
   character map or assume a fixed corridor width; can the starfield colour
   change per sector, and what else uses that register; and can
   `generate_starfield_row` conditionally thicken the field, at what per-row
   cost.
3. **4.6 data-driven Encounter / Wave Director**, with three owner decisions
   folded in:
   - **SECTOR SUBTYPES.** A level is a path of sectors: `SPACE`, `CAPITAL`,
     `BOSS`. `SPACE` has two subtypes: **SWARM** (many character-rendered
     Lights, no Heavy) and **ELITE** (one or two Heavy, no swarm). Heavy and
     swarms never coexist — this removes the worst-case population the budget
     cannot afford. Each subtype declares a maximum simultaneous population and
     **admission ENFORCES it**, rather than leaving it to level-design intent.
     Debris and pickups run in every sector, so they are a standing tax in
     every budget.
   - **PATH-DRIVEN WAVES.** The flight path is a property of the wave, not of
     the archetype, so the same archetype can fly a sine, an arc, a loop or a
     snake in different waves (Zybex-style envelopes). `WaveDef` carries:
     `archetype`, `path`, `count`, `spacing`, `entry`.
   - **STARFIELD PER SECTOR.** The `SPACE` sector should look distinct:
     nebulae as conditional thickening/brightening inside
     `generate_starfield_row`, plus a per-sector star colour. No new objects,
     no second scroll layer.

   Hierarchy: `LevelDef -> SectorDef(+subtype) -> WaveDef -> Encounter Director
   -> admission -> EnemyArchetype`. The Director owns what / when / how many /
   formation / wave end; the Archetype owns movement, fire, HP, score,
   `weapon_class`.
4. **Player weapon boosters.** `weapon_class` already exists, pickup capsules
   already have a full lifecycle, and 12 hostile projectile glyphs are free.
   The cost lands in the player projectile slots (**4,407** cycles in
   `handle_collisions`, MEASURED at HEAD in `build/manifest.json`
   `runtimeTiming.cpuDmaOff`; the 2,945 previously stated here is stale), so
   prefer boosters that do **not** multiply shots in flight (faster rate,
   stronger shot, piercing) over spread, which must be costed separately.
   Scheduled **after Option D**. **Owner decision N (2026-09-20) makes the
   headline booster permanent:** one variable, "booster level 0-5", setting
   projectile damage, with death costing one level. **Decision U** settles the
   signalling: **shape and sound**, not colour — a per-level bolt from the
   player glyph bank's three spare codes, plus a different firing sound as
   parameters on the existing POKEY channel. Colour is rejected; `COLPF2` is
   shared. See the new decisions section below.
5. **4.7 Boss** — designed **data-driven** (phases, movement pattern, fire
   pattern, HP, weak points as data) so that later bosses are records rather
   than implementations. This is a decision to make **when planning 4.7**, not
   afterwards.
6. **4.8a Capital geometry** — deeper, uneven gondolas at varying heights,
   variable corridor width, bigger debris; River Raid-style spatial flying.
   Data plus a collision check.
7. **Level complete / next level**; 16-level campaign as data; polish.
   **Confirmed by owner decision E (2026-09-20): sixteen levels**, a boss on
   each, easiest difficulty beatable by anyone. The eight-level content target
   that appeared in `project-overview.md` §6.1 and design-4.6 §6 is withdrawn —
   this item's figure was the correct one.

## Owner decisions E-W (2026-09-20) — the game concept is settled

**Recorded, not implemented.** No gameplay, renderer, engine or build behaviour
changed for these. Full text, with rationale, in the decision journal:
[owner-decisions-2026-09-11.md](owner-decisions-2026-09-11.md), section
"Decyzje literowe 2026-09-20". A-D were moved into the same section from
`project-overview.md` §5.3.

| Letter | Decision |
| --- | --- |
| **E** | **Sixteen levels**, not eight; a boss ends every level; the easiest difficulty beatable by anyone. Supersedes design-4.6 §6 and the eight-level content target; `plan-realizacji.md` §4 item 7 and decision 21 item 7 stand. |
| **F** | Capital variety is **parametric**: four segment-art sets, with length in segments, turret density and maximum gondola protrusion as three independent 4-step parameters. One hull variant per level. ≈ 4 × 1,253 B on disk instead of sixteen art sets. |
| **G** | Capital turrets stay **non-destructible**. Confirms backlog 4.8b. |
| **H** | Boss: **one controller, a record per boss** (module layout, weapon placement and count, weak points). Boss weapons reuse existing `weapon_class` records, to save code for the boosters. |
| **I** | **Boss laser**: drawn at once from gun to bottom of screen — the earlier "unfolding beam" is withdrawn. One second, telegraphed by ~2 s of visible gun heating with sound, destroys everything in its path. 1 / 2 / 4 per level on 1-4 / 5-9 / 10-16. Cost assessment is an owner ESTIMATE, to be costed at 4.7. |
| **J** | Difficulty scales the existing reload/spacing scaling **and** damage: player-dealt, player-taken, contact and boss. |
| **K** | Lives: three at start, **+1 after each odd level from 3** (3, 5, 7, 9, 11, 13, 15) — seven extra. |
| **L** | Level select from the furthest level reached. RAM only; a difficulty change in the menu resets it to level 1; the menu shows which levels are available. |
| **M** | High scores: **RAM only, no disk write.** Confirms today's behaviour. |
| **N** | **Permanent weapon booster**, level 0-5. One variable; the level sets damage; death costs one level. Both repo checks **ANSWERED** (below). Colour no longer carries the signal — see **U**. |
| **O** | **Loader screen**: a random line from 8-16 short English texts spoken by the fighter's cynical onboard AI, plus an animation stepped one frame per sector read — not a progress bar. Texts (~640 B for 16 lines) resident before the read starts. Written in a later session. |
| **P** | **End screen**: eventually an animation in the top third at full width plus a text scroll below — a separate sub-project, a loaded sector, not resident. A simple message suffices for now. |
| **Q** | **The project rules are explicitly superseded.** `plan-realizacji.md` §7 and `reguly-projektu.txt` §11 keep their "BASIC RAM, loader changes, runtime disk I/O" entries, marked SUPERSEDED with the superseding decision and why the ground changed. `reguly-projektu.txt` is now version 3.2. |
| **R** | **Hardware measurements deferred — risk OWNER-ACCEPTED 2026-09-20.** Register below. |
| **W** | **The between-levels reader uses DIRECT SIO, not the OS `SIOV`.** Supersedes the "resident `SIOV` reader (~80-120 B)" of decision 23 §10.1 and `project-overview.md` §4.3, which named the wrong reader *and* the wrong estimate: direct SIO is **~250-350 B** (ESTIMATE). The game has run with `sei` set, with `NMIEN` never enabling the VBI, and with nothing but the game writing `DLISTL`/`DLISTH`, `CHBASE`, `PMBASE` or the colour registers since start; the OS route would have to unwind all three and re-establish them, with a display-shadow exposure window on both sides of the call. Direct SIO unwinds none of them — no OS vector is ever taken. Implemented from the protocol specification (Altirra Hardware Reference Manual ch. 9), not vendor GPL-2 code, so `AGENTS.md` rule 13 is not strained. **IMPLEMENTED 2026-09-20 by roadmap 4.3** (section above). The ESTIMATE was low: the core measured **682 B**, the whole module 1,466 B with its display and texts. Three register values in the plan built on this decision were wrong and were corrected against the manual before any code was written — see the 4.3 section and `diagnostics/sio-register-probe-2026-09-20.json`. |
| **U** | **Booster level is signalled by SHAPE and SOUND**, not colour. A thicker/doubled bolt per level (the player glyph bank has three spare codes) plus a different firing sound per level (parameters on an existing POKEY channel). The two act at different moments and reinforce rather than duplicate, so neither may later be dropped as redundant. Colour was conditional on one check, the check was run, and **colour is REJECTED**: `COLPF2` is shared (below). Five levels stand; three may read more clearly if sound discrimination proves weak — settled during balancing. |

### Correction 2026-09-20 — the OS VBI does **not** rewrite the display shadows during SIO

Several documents, `design-4.6-data-architecture.md` §3 and
`project-overview.md` §6 among them, stated that the OS VBI rewrites `DMACTL`,
the display list, the colours, `CHBASE` and `PMBASE` from its shadows **during**
SIO. **It does not.** OS SIO sets `CRITIC`, which suppresses VBI stage 2 for the
whole call (*Mapping the Atari*, location 66 `$42`; corroborated by HiassofT's
OS-SIO replacement, which sets `CRITIC` as its third instruction after `SEI`).
The real exposure is narrower: a window on either side of the call — between
re-enabling the VBI and SIO setting `CRITIC`, and again after SIO clears it.

**The hard requirement survives intact**: a loader-mode display must **set** the
OS shadows (`SDLSTL`/`SDLSTH`, `RAMTOP`, `MEMTOP`), not merely restore the
hardware registers afterwards. Only its stated reason was wrong — and a plan
written from the wrong reason would guard the wrong window. Corrected in
`design-4.6-data-architecture.md` §3 and `project-overview.md` §6 on 2026-09-20.

> **VOID 2026-09-20, once the reader existed.** The requirement was conditional
> on a reader that hands control to OS SIO. Under decision W the reader is
> direct SIO, and the one roadmap 4.3 built calls no OS routine, takes no
> vector and writes no shadow; its loader-mode display is a DLI-free ANTIC 2
> screen raised with `NMIEN = 0`, so there is no VBI to restore anything from,
> and `start_gameplay` rebuilds every display register afterwards regardless.
> Nothing needs to survive the read. The measurement behind the requirement
> still stands; the requirement itself is withdrawn in all three documents.

### What decision N's two repo checks measured — both ANSWERED

- **No existing booster modifies damage. ANSWERED: no.** MEASURED:
  player-shot damage is a hardcoded `lda #$01` at `src/main.s:3892`;
  `queue_enemy_damage`'s only other callers are player-enemy contact and
  capital fire. Rapid Fire changes cadence, Spread changes count, Shield
  absorbs. The booster level can be the sole source of the number, so "one
  variable, level 0-5" stays one variable and does not become a system of
  composing modifiers.
- **Player projectile classes do not share the hostile `<= 9` limit.
  ANSWERED: they have their own bank.** MEASURED
  (`build/fighter-weapons.inc`): player glyphs are their own bank at base 11,
  stride 9, 36 codes; the `<= 9` assert (`src/main.s:797`) bounds the hostile
  bank at base 90 only. The player ceiling is `src/main.s:792`,
  `BASE + COUNT <= CAPITAL_HULL_GLYPH_BASE = 59`, so **five looks (45 glyphs,
  codes 11-55) fit with three to spare**; a sixth does not. This is what pays
  for decision U's per-level bolt shape.

### Decision U — the COLPF2 check, and why colour is REJECTED

MEASURED at HEAD `95eac61`. In the gameplay field,
`GAMEPLAY_COLPF2 = PLAYER_FIGHTER_PROJECTILE_COLOR` (`src/main.s:511`) is the
register for pixel value `%11` **in a positive screen code** (a code with D7
set goes to `COLPF3` instead). Three live objects besides player projectiles
draw in it, and a fourth is declared:

1. **The debris-destruction effect, in its yellow phase.** Fragments and core
   at `EFFECT_FRAGMENT_GLYPH_BASE = 118` (`src/main.s:716`, assert `:771`) are
   deliberately alternated between a positive code and `code|$80` —
   `@fragment_yellow`/`@fragment_red` and `@yellow_core`/`@red_core`
   (`src/main.s:10754-10789`). The fragment glyphs
   (`build/entity-effects.inc:122-124`: `$C0,$F0,$3C,$30`) carry `%11` pixels,
   so the yellow half of that two-phase flicker is drawn in `COLPF2`.
2. **Three allied capital-hull glyphs.** Every allied glyph is `screenBank:
   pf2`, i.e. a positive code (`EMIT_ALLIED_HULL_CODEBOOK` =
   `$3D,$3E,$3B,$41,$3C,$3F,$40,$42,$43,$44,$45`; the enemy codebook is
   `$CC,$C9,…`, all inverse). `allied_service`, `allied_turret_housing` and
   `allied_turret_muzzle` carry `%11` pixels, and all three are placed in
   `EMIT_ALLIED_HULL_PACKED_MAP` (nibbles `6`, `9`, `B`).
3. **The capital explosion core in its `pf2`-banked cells.**
   `EMIT_CAPITAL_EXPLOSION_PHASES` (`build/capital-hulls.inc:259-264`) emits
   `$57` (positive → `COLPF2`) alongside `$D7` (inverse → `COLPF3`) for the
   same glyph, which carries `%11` pixels.
4. **The allied capital shell — declared, not yet emitted.**
   `projectileVisuals.capital.alliedRegister = COLPF2` and
   `CAPITAL_PROJECTILE_ALLIED_ATTRIBUTE = 0`
   (`build/capital-hulls.inc:83`), but nothing in `src/` uses it: only the
   hostile attribute is written (`src/integration-glue.s:177`).

**Checked and not sharing it:** stars (`COLPF0`/`COLPF1`); debris glyphs
110-117 (no `%11` pairs at all); hostile projectiles (`COLPF0`/`COLPF1` by
contract, never `%11`); Light Wingman and Interceptor
(`src/hybrid/light-wingman.s:27`, inverse code → `COLPF3`); Heavy Raider (PMG);
the HUD (its own DLI zone, `HUD_COLPF2 = $00`, `src/main.s:515`); allied
engines. **Dead data, not a user:** `weaponPickupRapidFire`'s
`fillRegister: COLPF2` — the `EMIT_WEAPON_PICKUP_*` macros are invoked nowhere
in `src/`; the character capsule was replaced by the fifth-player PMG mark in
`COLPF3`.

Recolouring `COLPF2` per booster level would therefore recolour the debris
breakup, three allied hull glyphs and the capital explosion core — exactly what
`art-direction.md` forbids. **Colour stays `$1E` at every level**; shape and
sound carry the signal.

## Technical-debt register — OWNER-ACCEPTED RISK 2026-09-20 (decision R)

| # | Debt | What it invalidates if it goes wrong |
| --- | --- | --- |
| 1 | **RESET during gameplay may re-map the BASIC ROM over `$A000-$BFFF`.** The `BASICF = $01` write should prevent it; an emulator proves this least well. | Decision B stands entirely on it. |
| 2 | **Real per-sector read rate** — the emulator's SIO is patched. | The inter-level pause and how much content fits on disk. Decision O is designed not to care; E and F do. |
| 3 | **The ATR boot-without-OPTION fix is emulator-proven only.** | Decision A, and through it the unconditional window (B) and the whole roadmap on real hardware. |
| 4 | **What the OS occupies above `$BC20`** was unmeasured. | **Measured 2026-09-20 — see below.** Entry retained because the measurement is Atari800-only. |
| 5 | **The ATR's sector interleave is not a documented property of the build** (added 2026-09-20). Sectors are laid out logically ordered. | Nothing on SIO2SD or in emulation. On a **real 1050**, logically-ordered sectors make the drive "blow a rev" between reads: roughly **half speed, ~208 ms per sector instead of ~104**. Every real-hardware load figure derived from disk doubles, including the inter-level pause (decision O) and how much content fits inside an acceptable wait. The owner will verify on a CA2001 once he has a monitor for it, and notes that in practice almost everyone will run this on an emulator or SIO2SD. |

### The window measurement (debt item 4, done)

The boot-smoke observer now records `SDLSTL`/`SDLSTH` (`$0230`), `MEMTOP`
(`$02E5`) and `RAMTOP` (`$6A`) in every snapshot. **8/8 sessions pass.**
EMULATOR-MEASURED, Atari800 7.1.2 PAL/XL, identical on both media and both cold
RAM fills:

| BASIC at coldstart | `RAMTOP` | `MEMTOP` | `SDLSTL`/`SDLSTH` | OS screen | Usable window |
| --- | ---: | ---: | ---: | --- | ---: |
| disabled | `$C0` | `$BC1F` | `$BC20` | `$BC20-$BFFF`, 992 B | `$A000-$BC1F` = **7,200 B** |
| enabled | `$A0` | `$9C1F` | `$9C20` | `$9C20-$9FFF`, 992 B | all 8,192 B |

**Plan against 7,200 B.** The frame-1 snapshot reads zero in all eight sessions
— the OS has not initialised those cells that early; the values above come from
frames 250 onward and are constant thereafter.

**Second result, not looked for:** cold-started **with** BASIC the OS puts its
screen at `$9C20-$9FFF` — inside resident game RAM (`ENTITY_CODE` tail,
`DIRECTOR_C_PRE`, `LEVEL1_DATA`, `DIRECTOR_C_CODE`), not in the window.
`disable_basic_rom` unmaps the ROM but does not move the OS shadows. Nothing
breaks today — MEASURED `NMIEN = $80` from frame 250 on, so the OS VBI NMI is
off — but the between-levels reader must **set the OS shadows before handing
control to SIO**, not just restore hardware registers afterwards. This is now a
**hard requirement on the sector reader**, written where the reader is
specified: `design-4.6-data-architecture.md` §3. Evidence: `build/runtime-wall-trace/boot-smoke/report.json`,
`snapshots[].sdlst` / `.memtop` / `.ramtop`.

### Boot-frame note, re-measured 2026-09-20

"**+2 PAL frames per occupied sector**" is **not an identity**. With the same
183 sectors the ATR menu arrives at **554** frames cold-started without BASIC
and **538** with BASIC enabled (XEX: 392 and 383). A 16-frame ATR spread —
eight sectors' worth by the rule — from a variable unrelated to sector count.
Combined with decision A's +1 sector not moving the frame at all, the rule is
frame-quantised and was calibrated over one 177→182 range on one emulator. Use
it to size a budget, never to predict a frame. The committed baselines
(XEX 392, ATR 554) are the BASIC-off figures.

## Backlog — deferred, not forgotten

Deliberately deferred work, distinct from the open defects above. Not to be
started without owner instruction.

- HEAVY DESTRUCTION EFFECT. A destroyed Heavy (Raider, Bomber) vanishes with a
  screen flash, while a Light breaks apart into fragments. Owner-observed, and
  verified pre-existing on 0a90c1c (before Option D and the Light work), so
  not a regression. The Bomber is QUAD, 32 HPOS wide, and its body disappears
  in one frame; a small central effect reads as a disappearance. A destruction
  effect scaled to the Heavy's size would give the heaviest enemy the heaviest
  death. It is a burst effect, so it fits the token as a consumer under the
  scheduling rules: visual-only, position captured at enqueue, bounded delay.
  Cost to be measured: the Light breakup is ~1,000 cycles, and a wider effect
  is likely more.

- **PROJECTILE LOAD LEVERS — costed 2026-09-21, NOT applied.** A **25 % fire-rate
  reduction** (with damage +25 % to keep time-to-kill, or damage left to final
  balancing) lowers the **average** projectiles in flight by about a quarter —
  roughly **700-1,500 cycles on a dense frame**.
  **Figures verified against the current build** (`weapon-pickup-2-hunt-fire4`,
  2,788 effect-free fighter rows, pre-fence bucketed by projectiles in flight):
  **~574 cycles per player projectile** least-squares, **~729** between the two
  best-populated buckets — the brief's ~740 stands; **~79-117 per hostile
  projectile**, which is **lower than the ~200 the brief assumed**. Mean load is
  2.8 player and 2.5 hostile projectiles, so a quarter off the average is
  ~450-580 cycles on an ordinary frame and ~820-1,050 on a dense one.
  **It does not bound the WORST frame.** The pools are fixed-size and a held
  trigger still fills them, only more slowly, and the fence cares about the
  worst case, not the average.
  **The direct worst-case lever is POOL SIZE**: one fewer player PairShot slot
  (five today, `INTERCEPTOR_PROJECTILE_SLOT_BASE = 5`) is a hard ceiling
  regardless of rate, worth ~574-729 cycles off the worst frame by the same
  measurement.
  **Fire rate is a feel decision, not a performance one**, and belongs to final
  balancing alongside difficulty and the permanent booster. **If margin is ever
  short, reach for pool size first.**

- **Disk save (progress, high scores) — PARKED** (2026-09-20). Needs SIO write,
  error handling, and a decision about whether the game's own ATR stays
  pristine when people share disk images. Decisions L and M keep both in RAM
  for exactly that reason.
- **End-screen animation and its scroll text** (decision P, 2026-09-20). The
  scroll text is written at the end of the process.

- **4.8b destructible gondola guns.** Confirmed as backlog by **owner decision
  G (2026-09-20): capital turrets stay non-destructible.** Turrets are not
  objects today:
  `BROAD_TURRET` is a shell field and `BROAD_TURRET_FIRED` a fire latch — no
  HP, no slot state, not a collision target. This is a **new object type**
  needing its own plan and budget, and it **must not delay the boss**.
- **Hostile projectile motion is visibly stepped** (recorded 2026-09-18, a
  deferred finding, **not a defect and not a regression**). Hostile projectiles
  advance 2 scanlines per frame — the Bomber torpedo 2 scanlines every other
  frame — drawn as glyph phases inside a single ANTIC 4 cell, so the motion
  reads as stepping rather than gliding. The owner verified it is present in
  every build back to 4.5c (`2a8ff26`) and earlier, so **it did not come from
  4.5d or Option D**. Smoothing it needs either more glyph phases (12 free
  hostile codes exist) or a different rendering approach, and it touches the
  projectile publication hot path — so it is costed work, not polish.
- **`advance_tracked_muzzles` captures `MUZZLE_BACKING` from the wrong cell**
  (recorded 2026-09-19, **unmeasured**, a deferred finding). `src/main.s:6281-6283`
  derives `MUZZLE_SCREEN_LO/HI` = row start + column 8/31, then reads the backing
  byte with `lda (dst_ptr),y` at `y = 0` — the **row start**, not the muzzle cell
  it just derived. `restore_active_muzzles` therefore returns column 0's content
  to column 8/31. Same defect class as the launch-flash constant fixed in the
  BLOCKED_MUZZLE_ORPHAN_TRANSIENT work below, in the tracked path instead. Found
  while implementing that fix and deliberately left alone: outside the bounded
  task, and no measurement yet shows a player-visible effect.
- **Broadside admission can move `BROAD_ROW_LO` under a live flash**
  (recorded 2026-09-19, **unmeasured**, pre-existing). `src/main.s:7829` calls
  `set_broadside_row_ptr` for a newly admitted slot without consulting
  `BROAD_FLASH_TIMER`. A shell released within four frames of launch frees its
  slot while the flash is still running, so re-admission repoints the flash at a
  new cell and abandons the old one. `scroll_broadside_scene` already treats a
  live flash as owning the row pointer (`:7973-7975`), so admission is the one
  path that does not. Not observed in the 6,000-frame capital-muzzle replay.
- **Starfield parallax** — ~3,000 cycles for a second scrolling layer; revisit
  after Option D.
- **Static Andromeda** in the `SPACE` sector background, occluded during
  capital traversal.
- **XEX/ATR engine screenshot parity, frames 0-4** — known, low priority, **not
  in scope**. MEASURED across all 12 XEX/ATR pairings: exactly frames **0-4**
  differ and frames 5-149 are byte-identical, in every pairing; the only
  non-clock traced-state difference is `capital_visible_allied_cells` **6 (XEX)
  vs 8 (ATR)** on frame 0, identically in all 12. A five-frame medium-dependent
  entry transient; pre-existing, and neither the engine nor the boot path was
  touched by the sessions that found it. It is one of the 40 recorded gate
  failures (12 entries, class `c-real-failure`) in
  `docs/recorded-gate-failures.json`, so it cannot disappear unnoticed. Whether
  it is acceptable is an owner judgement. Evidence:
  [diagnostics/runtime-wall-trace-report-regeneration-blocked.md](diagnostics/runtime-wall-trace-report-regeneration-blocked.md)
  §14.7.

- **Double erase on booster release** — known, low priority, **not in scope**.
  The missile plane IS cleared on every release frame
  (`pickup_missile_rows === 0`), but `pickup_erase_calls` is **2** where the
  clause asserts 1, on exactly the 4 release frames of the replay; ACTIVE frames
  (233 of them) do exactly one erase and one draw. Whether the second erase in
  the collection frame is real waste or an intended belt-and-braces teardown is
  an owner judgement; `release_frame_detail` in the evidence carries the
  per-frame numbers. Recorded gate failure, class `c-real-failure`. Evidence:
  §14.8 of the same document.

- **PAL resync after a miss** — one overrun costs ~1,393 shifted-phase rows
  until the next gameplay generation.
- **Debris blink on the player death frame** — pre-existing, documented under
  the open defects above.
- **Debris survives player contact** in the dying/respawn window and inside
  `BROAD_DAMAGE_COOLDOWN` — pre-existing, explicitly left as is by the owner;
  described under the open defects above ("debris contact-kill
  inconsistency").

---

## Segment neighbour guards — **OWNER-ACCEPTED** (owner smoke PASS 2026-09-18)

- **Defect.** `ENTITY_CODE_RESERVED_BYTES = $F00` gives a `$9FFF` ceiling, but
  the first real neighbour is the `DIRECTOR_C_PRE` record at `$9D5E`. The two
  ca65 asserts (`src/main.s:1311`, `:11406`) therefore guarded **675 B of
  phantom headroom** and could not fire before 675 B of somebody else's memory
  had been overwritten. Same class: `DIRECTOR_C_LOW` (3 B phantom, real ceiling
  `$8C7D`), `DIRECTOR_ABI` (1 B phantom, `$8776`) and `HYBRID_C_EXT` (its tail is
  shared between two link units, so no linker symbol can see the composite).
  This had already caused a silent overrun: a 3-byte inline insert assembled
  cleanly, ran ENTITY_CODE past `$9D5D` and crashed at runtime on
  `2-contact-debris-fire0` frame 61.
- **Guards (0 bytes).** `lderror` asserts on the linker's own
  `__*_RAM_LAST__` (the address *after* the last byte used in the memory area)
  against the neighbour's first byte: `__ENTITY_CODE_RAM_LAST__ <= $9D5E` and
  `__PICKUP_CODE_RAM_LAST__ <= $8B67` in `src/main.s`;
  `__DIRECTOR_ABI_RAM_LAST__ <= $8776` and
  `__DIRECTOR_C_LOW_RAM_LAST__ <= $8C7D` in `src/hybrid/c-asm-abi.s`. The last
  two are **not** in `build/void-strike-65.lbl` — they exist only in
  `build/encounter-director.lbl`, a separate ld65 link — so they had to go into
  that link's only hand-written ca65 source, next to the existing
  `HYBRID_C_ARENA` asserts. No substitute symbol was invented.
  `ENTITY_CODE_RESERVED_BYTES` is unchanged and the old asserts are not
  contradictory: `$9D5E` is simply stricter than `$9FFF`.
- **Proof (the point of the task).** A temporary `.res 4` in ENTITY_CODE makes
  the build fail at link, with no XEX produced:
  `main.s:1321: Error: Assertion failed: ENTITY_CODE reaches the DIRECTOR_C_PRE record at $9D5E`.
  The same filler at the head of `DIRECTOR_ABI` gives
  `encounter-director-abi.s:292: Error: Assertion failed: DIRECTOR_ABI reaches the PICKUP_CODE window at $8776`.
  In both cases the pre-existing `ENTITY_CODE_RESERVED_BYTES` asserts stayed
  silent. Filler removed afterwards.
- **Manifest refuses.** `residentCapacity.tails` now throws
  `segment free tail is negative: <name> <n> B` instead of shipping the
  overrun, and derives the ENTITY_CODE ceiling from `directorPreRunAddress`.
  The A2 tail off-by-one is fixed (`0x00ff` → `0x0100`): reported 18 → **19 B**.
- **Size-neutral.** XEX and ATR byte-identical to a build of the same HEAD
  without the change (`04821731…` / `6aaff6fd…`); both `.lbl` files
  byte-identical; `free_broadside_slot` `$76A7` still asserted.
- **Free tails after (measured).** BROADSIDE **3 B** (6,653 of 6,656 B),
  `HYBRID_C_ARENA` 218 of 832 B, `DIRECTOR_ABI` **0 B**, `HYBRID_C_SECTOR` 8 B,
  pickup stream fill 7 B, `DIRECTOR_C_LOW` 3 B, `HYBRID_C_EXT` 19 B, A2 kernel
  19 B, `ENTITY_CODE` **1 B** (`$9D5D`). Transport: 103 boot sectors + payload
  sectors 104-182 (79), last sector 182.
- **Gates.** Boot smoke PASS 4/4 (XEX menu 392; ATR menu 554 against deadline
  554). PAL timing audit: **0 distinct miss events across 28 replays**, worst
  fence margin 463 (`raider-remnant-rapid-xex-hard` row 1945), maximum wall
  30,609 (`director-complete-2-natural-sweep-fire0`). Focused set: 8 failing
  names, the identical failure-name set with the change stashed — all
  pre-existing. Debris gate and raider-remnant keep their documented
  pre-existing failures unchanged.
- **Standing rule (new).** Any commit that changes a segment's size must state
  the resulting free tail in its commit message and in the current-checkpoint
  override section of [memory-map.md](memory-map.md).

Evidence:
[diagnostics/stage-2b2t-segment-neighbour-guards.json](diagnostics/stage-2b2t-segment-neighbour-guards.json).

---

## 4.5d Enemy Identity Freeze — Bomber silhouette and hull ramp — **OWNER-ACCEPTED** (owner smoke PASS 2026-09-18)

Owner smoke PASS 2026-09-18: the catamaran silhouette and the HP-driven blue
hull ramp are **owner-accepted** as the Bomber's identity, as part of the whole
`0a90c1c` stack (see *Accepted runtime checkpoint*).

Owner decision after the 4.5d smoke: the Bomber read as a bigger Raider — the
two masks were the same family (full-width shoulders, converging V, identical
three-row spine tail) in adjacent hues at the same luminance (`$24` vs `$44`).
Fixed with **data and C only**: no renderer, raster, PMG, `PRIOR`, DLI or
collision change, no new PMG allocation, no multiplexing, no accent plane.

- **Silhouette (data).** `SCYTHE_BOMBER` in
  [../assets/graphics/enemy-roster.json](../assets/graphics/enemy-roster.json)
  is now a **catamaran**: two hulls joined by a bridge (rows 3-5) and twin
  prongs instead of a single spine.
  `$C3 $E7 $E7 $DB $FF $FF $DB $E7 $E7 $E7 $C3 $C3 $81 $00 $00 $00`.
  Height stays 16 rows (anything taller is blocked by the BROADSIDE 3 B and
  ENTITY_CODE 1 B free tails and by the fence margin).
  `build/enemy-roster.inc` regenerated by `scripts/enemy-roster.mjs`; the
  generated include is never hand-edited.
- **Compiler gates (measured).** `connectedComponents` **1** (≤ 2; the flood
  fill runs over the whole mask, not per row, so the bridge joins the two
  masses); Hamming distance to the Raider **44** (≥ 20) and to the Talon **76**
  (≥ 35); `occupiedArea` **72** > 1.5 × Talon 44 = 66; `visibleBits` `[0,7]`
  matching the occupied columns; last row cleared (the compiler's
  "one explicit cleared tail row" minimum — the shape leaves rows 13-15 clear);
  `upperWidth` 8 ≥ `noseWidth` 2.
- **Projectile origin.** `enemy_projectile_spawn_y_offsets` `$0E` → **`$0D`**
  (the mask ends at row 12), so the torpedo now leaves between the prongs.
- **Frame height unchanged.** `enemy_frame_heights` stays `$0E,$10,$10`, so the
  fighter-projectile hit box ([../src/main.s](../src/main.s):3919), the
  departing-row erase and the explosion anchor ([../src/main.s](../src/main.s):11383)
  — all three read `enemy_frame_heights` — are untouched.
- **Hull colour and damage ramp (C).** `HULL_COLOUR_BOMBER` `$24` → **`$88`**
  (hue 8, blue) and `bomber_colour()`
  ([../src/c/lifecycle.c](../src/c/lifecycle.c)) derives the luminance from the
  remaining HP: `BOMBER_HULL_HUE | (HP << 1)`. This also supplies the
  non-lethal Heavy hit feedback listed as a known gap. HP is existing state
  (`ENEMY_HP_n`), so **no new per-slot state and no ASM change**.

  | HP | base | + charge (+4) | + flash (+6) |
  | ---: | ---: | ---: | ---: |
  | 4 | `$88` | `$8C` | `$8E` |
  | 3 | `$86` | `$8A` | `$8C` |
  | 2 | `$84` | `$88` | `$8A` |
  | 1 | `$82` | `$86` | `$88` |

  `BOMBER_FLASH_LUMA` and `BOMBER_CHARGE_LUMA` are still added without
  clamping; the worst case is HP 4 + flash = `$8E`, inside hue 8. A compile-time
  assertion (`bomber_hull_ramp_must_stay_inside_hue_eight`) now proves it.
  The recycle path still restores `HULL_COLOUR_RAIDER` `$44` for the capital
  broadside missiles M1/M2.
- **Placement (measured).** The only segment that changed size is
  `HYBRID_C_ARENA`: 614 → **617 B** of 832, **free tail 218 → 215 B**
  (`$7E39` last used byte). `.lbl` diff is exactly those three bytes
  (`__HYBRID_C_ARENA_SIZE__` `$1F8` → `$1FB`, rodata `$7E0F` → `$7E12`,
  `__HYBRID_C_ARENA_RAM_LAST__` `$7E36` → `$7E39`); no other label in
  `void-strike-65.lbl`, `encounter-director.lbl` or `integration-glue.lbl`
  moved. **BROADSIDE 6,653 of 6,656 B (3 B free) and ENTITY_CODE 1 B free are
  unchanged**, as required. Transport 182 sectors unchanged.
- **PAL (measured) — NOT timing-neutral, reported as asked.** 0 distinct miss
  events across **64 replays**. Worst fence margin **450**
  (`raider-remnant-rapid-xex-hard`, pre-wait 24,815) against 463 / 24,802 on an
  A/B build of the same HEAD: **−13 cycles**. `update_enemy` 2,493 → 2,501
  (+8 measured), heaviest main-loop frame 15,634 → 15,638 DMA-off. The extra
  work is the HP derivation (`lda`/`asl`/`ora #$80` instead of one `lda` of
  `heavy_hull_colour`), which runs once per ticked Heavy member; it is charged
  even in Raider replays because `HYBRID_C_ARENA` rodata shifted three bytes.
  Every other audited session is within a cycle or two of the A/B baseline.
- **Boot smoke.** PASS 4/4: XEX menu 392; ATR menu 554 against deadline 554
  (zero slack, as before).
- **Debris gate A/B.** Verdicts and counts identical to an A/B build of the
  same HEAD: same lives per phase in all three sessions (23/5, 16/17, 8/16) and
  the same single `debris-gate-0-neutral-fire0` blank frame in 1,558
  post-capital frames (the documented pre-existing death-frame blink). Only the
  `covered`/`occluded` tallies move, as the new, wider silhouette hides
  different cells.
- **Raider-remnant A/B.** Explosion and cleanup counters byte-identical
  (26 main explosions, 42 emitter-owned continuations, 0 stale restores, 0
  orphans); it still fails only on the pre-existing explosion count.
- **Pre-existing native failures, A/B-verified unchanged:** the default
  wall-trace abort at `weapon-pickup-contact-2-hunt-fire4` (after 21 sessions),
  the same abort on `weapon-pickup-overlap-2-hunt-fire4`, the
  `capital-muzzle-ring-2-sweep-fire4` stale muzzle/flash abort, the
  `raider-sector-xex-hard` "did not return to post-sector OPEN" abort (A/B
  confirmed at HEAD; not previously recorded here) and the emulator status-2
  exits of `capital-contact-{allied,hostile}-medium` and
  `lower-playfield-hostile-contact-xex-hard`.
- **Tests.** New `tests/enemy-roster.test.mjs` case pinning the catamaran mask,
  its component count, area, spawn offset `$0D` and the unchanged frame
  heights; `tests/heavy-bomber.test.mjs` reworked onto `HULL_AT`/`CHARGE_AT`/
  `FLASH_AT` helpers with a new assertion over the whole HP ramp including
  every charge and flash combination. Focused set: the same two pre-existing
  failure names with the change stashed (`PMG ownership…`, `compile-time review
  harness…`, both artefacts of the candidate build variant).

---

## Owner decision B — the BASIC window is open to the build — `OWNER-SMOKE CANDIDATE` (2026-09-20)

**Plumbing only. Nothing moved into the window.** Placement of content is a
per-record decision and belongs with roadmap 4.6.

- **Region and guard.** `cfg/encounter-director.cfg` declares
  `BASIC_WINDOW_RAM` `$A000-$BC19` (7,194 B, `type = ro, file = %O`) and
  `BASIC_WINDOW_GUARD` `$BC1A-$BC1F` (6 B, `file = ""`, no segment), in the
  same shape as the `$9FFA` Director guard. The `BASIC_WINDOW` segment is the
  last MEMORY area in the config, so its bytes close the combined image.
  7,200 B measured usable minus the 6-byte guard = 7,194 B addressable.
- **The assert fires.** `src/hybrid/c-asm-abi.s` carries
  `.assert __BASIC_WINDOW_RAM_LAST__ <= __BASIC_WINDOW_GUARD_START__, lderror,
  "BASIC_WINDOW reaches the window guard at $BC1A"`. A temporary `.res 7179,
  $00` in the segment — one byte past `$BC19` — fails the build at link with
  `encounter-director-abi.s:358: Error: Assertion failed: BASIC_WINDOW reaches
  the window guard at $BC1A`, with no XEX or ATR produced. Filler removed.
- **Loader bound lifted, on both sides of the ABI.**
  `scripts/chunk-loader.mjs` accepts destinations up to `$BC1F` and refuses
  `$BC20` upwards as `chunk destination enters the OS screen above $BC1F`; the
  stage-2 validator in `src/main.s` enforces the same bound in 6502 (record end
  `<= $BC20`, destination page `< $BD`), 18 B. `MAX_CHUNKS` / `CHUNK_MAX_COUNT`
  8 → 9: **MEASURED** `BOOT_STAGE2` `$4EF` → `$4FF` = +16 B exactly, inside its
  `$800` reservation (767 B still free), boot payload unchanged at 104 sectors.
- **The XEX needed one more thing.** The ATR is safe by construction —
  `boot_stage2_atr_entry` unmaps BASIC before the first SIO read. The XEX is
  not: its blocks are placed by the binary loader and `RUNAD` only runs after
  the whole file is loaded, so a block at `$A000` started with BASIC enabled
  would be written into ROM and lost. `scripts/build.mjs` now emits a 2-byte
  `INITAD` (`$02E2`) record after the first block **whenever a block lands at
  or above `$A000`**, pointing at `disable_basic_rom` (`$21AD`, already inside
  that first block). It emits nothing while the window is empty.
- **MEASURED proof that the window is real.** An inert 16-byte record
  (`"VS65WINDOW" $A0 $00 $BC $1F $DE $AD`) was landed at `$A000` as the ninth
  DFMC record and read back **byte-exact at frames 3050 and 3300 on all eight
  cold boot sessions** — XEX and ATR, cold RAM fills `$A5` and `$5A`, BASIC
  enabled and disabled — with `PORTB` bit 1 set in every snapshot. The two
  BASIC-enabled XEX sessions prove both that the ROM is unmapped and that the
  `INITAD` record is honoured.
- **The probe was then removed, and this is the one thing the owner should
  weigh.** Its own DFMC record costs one ATR transport sector (183 → 184). The
  ATR menu deadline is fine — 554 → 556 against a +50 band — but the
  `-nobasic` ATR loader milestone moves 297 → 299 and the loader raster is no
  longer complete at the boot smoke's **fixed frame-300** observation. That
  checkpoint has only **3 frames of margin** and was never re-based when owner
  decision 22 re-based the menu deadline; it is the same "zero margin by
  construction" class as the reservation-vs-neighbour guards of `254ca16`.
  **The first real window record will trip it.** Options are to re-base the
  loader observation frame, to give it a recorded baseline with a band like the
  menu deadline, or to accept the loader screen appearing ~2 frames later per
  added sector. This task did not decide that.
- **What stays.** The boot smoke keeps a standing `PORTB` bit 1 assertion at
  frames 3050 and 3300 on all eight sessions, records the first 16 bytes of the
  window in every snapshot, and reads them back automatically as soon as
  `BASIC_WINDOW` carries content again.
- **Accounting.** `manifest.residentCapacity.basicWindow`: address `$A000`,
  guard `$BC1A`, end `$BC20`, capacity 7,194 B, used 0, free 7,194, transport
  `null`. `manifest.xexInitAd` is `null` while the window is empty.
  `transportCapacity.maximumChunkCount` 8 → 9 and, with it,
  `architecturalAdditionalCapacityBytes` **0 → 6,400 B**: the ninth record slot
  is real additional transport capacity (one record, up to 50 sectors) where
  the build had none.
  `runtime-cycles` replaces the old `basicRomConditionalRange` entry with
  `basicWindowRange` (unconditional, `inRuntimeRanges: false`) and
  `osScreenRange` `$BC20-$BFFF`; its limitation text no longer claims the
  window is excluded because it is conditional.
- **The one narrow margin this cost.** The 18 B of stage-2 validation code sit
  inside the boot payload, so every packed source after `BOOT_STAGE2` moves up
  18 B: `starfieldRuntime.packedSourceToPickupMarginBytes` **36 → 18 B**
  (packed STARFIELD now ends `$47EF`, pickup cold staging starts `$4801`). It
  is hard-gated — `scripts/build.mjs` throws on overlap — but 18 B is thin, and
  anything that grows the fixed prefix or the packed resident/starfield images
  eats it next.
- **Size-neutral below `$A000`.** Transport 183 sectors, XEX 23,862 B, boot 104
  sectors — the same shape as HEAD. Every runtime address that moved is inside
  `BOOT_STAGE2` `$21C1-$26C2`, the transient overlay `unpack_resident_runtime`
  overwrites before gameplay; no gameplay, renderer, raster, PMG or collision
  address changed.
- **Free tails.** `BASIC_WINDOW` 7,194 of 7,194 B free; `BOOT_STAGE2` 767 B
  free (785 before). Every other tail unchanged: BROADSIDE 3 B,
  `HYBRID_C_ARENA` 440 B, `DIRECTOR_ABI` 0 B, `HYBRID_C_SECTOR` 8 B, pickup
  stream fill 7 B, `DIRECTOR_C_LOW` 3 B, `HYBRID_C_EXT` 28 B, A2 kernel 19 B,
  `ENTITY_CODE` 22 B.

- **Gates.** `build:candidate` PASS. Boot smoke **8/8 PASS**, menu frames
  identical to HEAD: XEX 392/392 (`-nobasic`) and 383/383 (`-basic`); ATR
  554/554 (`-nobasic`) and 538/538 (`-basic`), all delta 0 against the
  committed baseline. PAL timing audit: **0 distinct miss events across 72
  replays**, 0 rows over target, 0 over the hard gate; worst fence margin
  **1,464** (`raider-remnant-rapid-xex-hard` row 1945), maximum wall 30,609
  (`director-complete-2-natural-sweep-fire0`). Replay set: the default
  wall-trace set plus `--raider-formation-only`, `--raider-sector-only`,
  `--debris-gate-only` and `--raider-remnant-only`. Focused tests: 92 pass /
  17 fail, the 17 being exactly HEAD's failure set (A/B-verified with the
  change stashed; HEAD is 91/17, the extra pass is the new window test).
  Pre-existing native failures unchanged: the `capital-contact-*` and
  `lower-playfield-hostile-contact-xex-hard` contact-raster clauses and the
  `raider-sector-xex-hard` post-sector OPEN abort.
- **One test this change had to move.** The ENTITY_CODE reservation tests read
  `src/main.s` textually from the first `.segment "ENTITY_CODE"` to its end and
  refuse the literals `$A000`/`$BFFF`. The new stage-2 comments were reworded
  rather than the tests relaxed: ENTITY_CODE still must not address the window,
  and decision B does not change that.

XEX SHA-256 `4ff49d887e7375076214d3461f598bc6d59218789c8e3e3ac7b3ee17f2944415`;
ATR `62fd0a72a7c435f036465b4712f846f0d1d95eaa8124f7e7440f466f1fd21bba`.

Evidence:
[diagnostics/owner-decision-b-basic-window.json](diagnostics/owner-decision-b-basic-window.json).
Memory map: [memory-map.md](memory-map.md), "Owner decision B plumbing".
