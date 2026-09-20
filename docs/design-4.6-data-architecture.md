# 4.6 data architecture — LevelDef, SectorDef, WaveDef, paths and the Director boundary

> **Status note (2026-09-20).** §7.4 is void as a risk (owner decision 22) and
> §10.1's variants no longer describe the choice that was made: owner decisions
> B and C take **both** the window and the disk — the window is opened and
> carries code, the disk carries per-level DATA. See
> [project-overview.md](project-overview.md) §3, §5.3 and §8.9. This file
> remains a design proposal, not an accepted scope.

**Status: DESIGN PROPOSAL, 2026-09-18. Not implemented, not committed, not an
owner decision.** Written on `wip/4.5d-gate-fail` at `cf650eb` (clean
worktree, accepted runtime checkpoint `0002d84`). It is a data architecture,
not a build plan; an implementation session follows only after the owner
answers the decisions in §10.

Evidence base: `docs/STATUS.md`, owner decision 21 (§21.1-21.3),
`docs/plan-realizacji.md` §4 items 2-7, `src/c/director.c`,
`src/c/lifecycle.c`, `src/hybrid/*.s`, `src/integration-glue.s`,
`cfg/encounter-director.cfg`, `build/encounter-director.lbl`,
`build/manifest.json`, and the population and Light-multiplicity figures
quoted in the task brief. **Those two reports are not in the repository**
(nothing under `docs/` or `build/` mentions them; only the
`scripts/measure-*` tooling is committed), so every figure attributed to them
below is taken from the brief and marked BRIEF. Everything else is MEASURED
(from STATUS, the manifest or the `.lbl` files) or ESTIMATE.

---

## 0. Summary and the one finding that reshapes 4.6

The owner's target — eight levels, each a path of `SPACE(SWARM|ELITE)`,
`CAPITAL` and a final `BOSS` sector, with something new in every level — is
reachable from the existing records **as data**, provided six behaviours are
written once as resident code: flight paths, column-aimed fire, formation
entry, synchronised volleys, conditional firing and non-bottom retirement.
The costing already established that firing variety, projectile looks and most
movement variety are record edits. This document turns that into record
layouts, an ownership boundary the runtime enforces, and a buffer discipline
that lets a between-level loader arrive later without a redesign.

The finding that must shape the roadmap: **4.6 is bounded by bytes, not by
cycles.** After Option D the worst fence margin is 1,464 cycles (MEASURED) and
a Heavy-free SWARM frame has ~3,100 (BRIEF); §8 shows a three-Light swarm fits
with a one-expensive-event-per-frame rule and a four-Light swarm is
conditional. But the resident bytes 4.6 needs are on the order of 700-800 B
(ESTIMATE, itemised in §7.3), while every reachable free window together with
the bytes freed by deleting the provisional schedulers and the phase machinery
comes to roughly 300-400 B. The two provisional schedulers 4.6 deletes free
about 50-80 B (8 B of schedule columns in the 39 B arena RODATA MEASURED at
HEAD, ~40 B of arena C ESTIMATE, 4 B of table and counters) — an order of
magnitude short of funding the new Director. The only
byte source of the required size is the 8 KB BASIC window `$A000-$BFFF`,
which the project rules treat as a non-default option (`reguly-projektu.txt`
line 89), so opening it is the first owner decision (§10.1). The architecture
below is written so that it works either way; what changes with the decision
is how many levels the ATR can hold resident and whether per-level payloads
(appearances, paths, hull variants) exist at all.

---

## 1. Record types

Conventions that every record follows, because they are what cc65 compiles
well on this project (`director.c` already does all three):

- **Structure-of-arrays, fixed strides.** Every table is a set of parallel
  byte arrays indexed by one 8-bit register (`lda table,y`), never a struct
  pointer. This is how `LEVEL1_DATA` and `EnemyArchetypeTable.byte[]` work
  today and it is what keeps the cc65 stack, `ptr1` and zero-page usage at 0.
- **Page-bounded.** A table read with an 8-bit index never crosses a page; the
  level buffer is `.align $100`.
- **Authored in JSON, compiled to bytes, validated at build time.** Like
  `assets/graphics/enemy-roster.json` and `fighter-weapons.json`. The
  validator is where authoring mistakes die: it rejects a Heavy path with a
  negative dy, a wave whose archetype class does not fit its sector subtype, a
  level with the boss anywhere but last.

### 1.1 LevelDef — the level buffer image (256 B core page, optional 256 B payload page)

`director.c:53-118` (`LEVEL1_DATA`, 158 B MEASURED in `DIRECTOR_RAM`
`$9D75-$9E12`) is already a LevelDef: 13 per-phase arrays × 8 phases and 5
per-event arrays × 6 events. 4.6 **renames and re-strides** it rather than
inventing a new concept: a phase becomes a `SectorDef` row, an event becomes a
`WaveDef` row, the row clock (`STATE_ROW_LO/HI`, `director_c_world_row_tick`)
stays the only clock.

**Core page (256 B, always present):**

| Offset | Bytes | Field | Holds |
| ---: | ---: | --- | --- |
| 0 | 1 | `magic_version` | `$56` \| format version nibble; the future loader refuses a mismatch |
| 1 | 1 | `level_number` | 1..8, HUD only |
| 2 | 1 | `sector_count` | 1..10 |
| 3 | 1 | `wave_count` | 1..20 |
| 4 | 1 | `seed` | Director private RNG seed (`STATE_RNG` initial value) |
| 5 | 1 | `star_colour` | `SPACE` star colour for this level (decision 21.3) |
| 6 | 1 | `nebula_pattern` | id/density used by `generate_starfield_row` thickening (0 = none) |
| 7 | 1 | `boss_id` | 0 = no boss; else BossDef index (4.7) |
| 8 | 1 | `hull_variant` | capital hull parameter set (4.8a); 0 = the current hull |
| 9 | 1 | `pickup_policy` | every-Nth-kill divisor (today 3) and allowed booster bits |
| 10 | 1 | `debris_density` | base debris spawn cadence for the level |
| 11 | 1 | `spacing_scale` | per-difficulty spacing rule selector (see §1.3) |
| 12-15 | 4 | reserved | zero |
| 16 | 80 | `SectorDef` SoA | 8 arrays × 10 sectors (§1.2) |
| 96 | 160 | `WaveDef` SoA | 8 arrays × 20 waves (§1.3) |

**Payload page (256 B, present only when the level bank exists, §3):**

| Offset | Bytes | Field | Holds |
| ---: | ---: | --- | --- |
| 0 | 48 | `appearance[3]` | three 16-byte Light bitmaps for glyph pairs 120/121, 122/123, 124/125 |
| 48 | 96 | `path[8]` | up to eight level-local PathDefs (§1.4), ids 8-15 |
| 144 | 18 | `weapon_glyph[2]` | two hostile projectile looks (9 B each) installed into free `weapon_class` slots 4-5 for this level |
| 162 | 32 | `hull_params` | 4.8a gondola heights / corridor width / turret rows |
| 194 | 62 | `boss_def` | 4.7 BossDef (phases, path ids, fire pattern, HP, weak points) |

What LevelDef does **not** hold: archetype records, subtype ceilings, the path
evaluator, glyph tables for the roster, anything executable. A level file can
make the game *easier* than the runtime allows, never harder (§2.3).

Read by: the Director (core page, every world row and every admission);
`level_select()` (both pages, once between levels); the Light admission (the
appearance table, once per admission); `generate_starfield_row` via a
published byte (never the buffer directly — ASM does not index C data).

Lives: the core page is the `LEVEL_BUFFER` segment (§3). The payload page
follows it. Level 1's image is transported at boot exactly as `LEVEL1_DATA`
is today (inside the Director DFMC record); levels 2-8 live in the level bank
or on disk (§3, §10.1).

### 1.2 SectorDef — 8 B per sector, SoA, max 10

| Array | Bits | Holds |
| --- | --- | --- |
| `sector_kind` | 0-1 kind: `SPACE=0`, `CAPITAL=1`, `BOSS=2`; 4-5 subtype: `SWARM=0`, `ELITE=1`; 7: last sector | what the sector is |
| `sector_len` | rows / 8 (1 B → up to 2,040 rows); `CAPITAL` ignores it (the hull traversal is the clock), `BOSS` ignores it (boss death is) | how long |
| `sector_light_cap` | 0-4 | **requested** Light ceiling; the runtime takes `min(this, subtype table)` |
| `sector_heavy_cap` | 0-2 | **requested** Heavy formation ceiling, same rule |
| `sector_hazards` | 0-1 debris max live (0-2), 2 pickups allowed, 3 broadside allowed, 4-7 debris cadence step | the standing tax knobs (decision 21.1: debris and pickups run in every sector) |
| `sector_wave_first` | index into the WaveDef SoA | first wave |
| `sector_wave_count` | 0-20 | waves in this sector |
| `sector_look` | 0-3 star colour override index, 4 nebula on/off, 5-7 hull section variant for `CAPITAL` | per-sector look (21.3) |

Level 1 today maps onto three sectors: `SPACE/ELITE` rows 0-1856 (phases
0-4), `CAPITAL` (phases 5, currently admitted by the provisional
`FIRST_CAPITAL_FRAME = 600` frame gate in `lifecycle.c`, which 4.6 retires in
favour of the sector row), `SPACE/ELITE` rows 2752-3712 (phases 6-7), then the
existing `BOSS_HANDOFF` event becomes the implicit end of the last sector.

What SectorDef does **not** hold: the population ceilings themselves (those
are the resident subtype table, §2.3), the difficulty budget/reaction/recovery
triplets of today's phases (retired; the ceiling replaces the intensity budget
for enemies, and hazards keep their own byte), the capital state machine
(`sector_c_update_capital_phase` stays code).

Read by: `director_c_world_row_tick` (sector advance), `director_c_request`
(hazard mask and caps), the starfield publication opcode (look byte at sector
entry).

### 1.3 WaveDef — 8 B per wave, SoA, max 20

| Array | Holds |
| --- | --- |
| `wave_row` | trigger: row offset inside the sector / 8 |
| `wave_flags` | 0-1 appearance slot (0-2); 2 trigger mode (0 = at row, 1 = when the previous wave has ended, `wave_row` then a minimum delay); 3 Light escort accompanies a Heavy formation; 4 volley (members share one fire pulse); 5 mirror alternates per member; 6 aimed column at admission; 7 reserved |
| `wave_archetype` | `EnemyArchetype` byte offset (0/12/24/36) — the class (Heavy/Light) is read from the record's `renderer_class`, never authored separately |
| `wave_path` | PathDef id: 0-7 resident library, 8-15 level payload |
| `wave_count` | Light: members to admit in total; Heavy: formations (each two members) |
| `wave_spacing` | frames between admissions (Light) or minimum frames after a formation recycles (Heavy), authored for MEDIUM |
| `wave_entry` | bits 0-5 entry X / 4 (HPOS cell, 12..50 → 48..200), bit 6 mirror path, bit 7 entry from the top (0) or from the side (1, with the path's first segment horizontal) |
| `wave_member_offset` | signed nibbles: per-member ΔX (×4 HPOS) and ΔY (×8 lines) applied cumulatively — spacing 0 with an offset makes a V or a line abreast; spacing > 0 with 0 offset makes a conga line |

This carries exactly the five properties decision 21.2 names (archetype,
path, count, spacing, entry) plus the two flags bytes that make formation
entry, volleys and conditional firing data rather than archetype branches.

What WaveDef does **not** hold: HP, score, weapon class, cadence (archetype);
anything that would let a wave exceed the sector's ceiling (the count is
throttled by admission, never trusted); glyph bitmaps (payload page).

Read by: the Director's wave stepper (once per world row, plus once per
admission), the Light admission (path, entry, offset, appearance), the Heavy
admission through `enemy_c_spawn_raiders` (archetype, path, escort).

**Difficulty (design decision, §10.6 lets the owner override):** waves are
authored for MEDIUM. EASY spacing = spacing + spacing/2, HARD spacing =
spacing − spacing/4, both shift-and-add (≈ 20 B of C, 0 data). Archetype
reload keeps its existing per-difficulty triplet. `wave_count` is not scaled:
the ceiling already caps what HARD can show at once, and three count columns
would triple the wave table for a knob the ceiling mostly nullifies.

### 1.4 PathDef — 12 B each, piecewise-linear velocity segments

A path is four segments of 3 B, evaluated once per member per frame:

| Byte | Holds |
| --- | --- |
| `seg_velocity` | signed nibbles: dx (HPOS per frame, −4..+3 → authored as −2..+2 in practice) and dy (lines per frame, −2..+2) |
| `seg_frames` | duration; 0 = hold until an external event (Heavy attack run uses this) |
| `seg_flags` | 0 fire enabled on this segment; 1 track player column (Interceptor-style ±4 HPOS every other frame, replaces the Interceptor branch); 2-3 on segment end: next / loop to segment 0 / retire / hold; 4 mirror dx for members with the mirror bit; 5-7 reserved |

Sine, arc, loop and snake are all authored as 4-segment envelopes
(an octagonal loop is `(+1,+1),(0,+1),(−1,+1),(−1,0)`… with loop-to-0). This
is chosen over a sine table because the evaluator is ~80-120 cycles per member
(ESTIMATE, all 8-bit adds and a nibble unpack) and 0 B of table; a 32 B sine
table with a phase accumulator would look smoother and cost ~+40 cycles and
+32 B (§10.4 is that choice).

**The Heavy restriction is a hardware fact, not a style choice:** the P1/P2
departing-row erase (`erase_enemy_departing_row`) requires a member's Y to
grow by at most one line per frame, so a Heavy path may only carry dy ∈
{0, +1}. The validator rejects anything else on a Heavy wave. A Heavy holding
its Y is also the cheap case under Option D (only `HPOSP1,x` is republished),
so hold-heavy Heavy paths are the affordable ones.

Retirement other than off the bottom: `retire` on a segment whose dy < 0
leaves through the top; dx-only segments leave through a side (the Light X
clamp becomes a retire condition when the path says so). The Light erase does
not care where the cell is, so this is data plus ~15 B in the tick.

Read by: the path evaluator (C, once per live member per frame). Lives:
resident library (8 paths, 96 B RODATA) plus the payload page (8 more per
level).

### 1.5 EnemyArchetype — 12 B (unchanged) plus a 4 B motion companion

The 12-byte record stays exactly as `enemy-archetype.h` defines it (the
`sizeof == 12` assertion stands; ASM indexes it by byte offset). The costing's
"seven bytes extracted from constants" (BRIEF: descent rate, fire window, entry
X, lateral step + track phase, retire Y) is absorbed differently once paths
exist: descent, lateral step, entry X and retirement belong to the **path and
wave**, not the archetype. What remains archetype-owned is a 4 B companion
table, SoA, indexed by the same byte offset:

| Field | Holds |
| --- | --- |
| `fire_top`, `fire_bottom` | the fire window (today `LIGHT_FIRE_TOP/BOTTOM` 24/224 and `BOMBER_FIRE_TOP/BOTTOM` 24/200 are constants) |
| `track_step_mask` | 0 = no pursuit; else the every-Nth-frame column tracking mask (`INTERCEPTOR_TRACK_PHASE`) |
| `default_path` | path used when a WaveDef says `wave_path = $FF` (keeps the Raider's ASM cross-pursuit and the Bomber lane sweep reachable as "movement id + no path") |

`movement_behavior_id` gains one value, `ENEMY_MOVEMENT_PATH = 4`: the member
follows its wave's path through the shared evaluator. Raider (`0`, ASM) and
Bomber (`3`, C lane sweep) keep their handlers; a Raider on a path is a wave
that says `PATH` for a Raider archetype — data, no new branch.

`fire_policy_id` gains `ENEMY_FIRE_VOLLEY = 5` (fires on the wave's shared
pulse instead of its own timer) and `ENEMY_FIRE_CONDITIONAL = 6` (fires only
when the path segment enables fire *and* the player is within ±N columns).
Both are ~20-30 B of C in the existing Light fire controller and reuse
`burst_count`/`burst_interval`/reload unchanged.

ROSTER FREEZE (decision 21) is respected: no new record is added here. The
companion table costs 16 B for the four records.

Read by: Light tick (`LIGHT_FIELD`), Heavy tick (`HEAVY_FIELD`),
`heavy_publish_profile`, ASM score/weapon paths (unchanged fields only).
Lives: `ENEMY_ARCHETYPE_DATA` (48 B in `HYBRID_C_EXT`, unchanged); the
companion in arena RODATA (the EXT tail is 19 B, 3 B above its floor).

### 1.6 weapon_class visual record — 9 B (unchanged)

`hostileWeaponVisuals` in `assets/graphics/fighter-weapons.json`: 8 B glyph +
`stepPeriodFrames`. Classes 1-3 used, glyph codes 90-109 give room for up to
10; the brief counts five free slots. A new projectile look and speed is a JSON
entry and a class number in a record — no code (MEASURED at 4.4c/4.5b: the
per-slot publication cost +26 cycles is already paid for every class).

Per-level projectile looks are possible only with the payload page: the builder
writes glyph rows at build time into BROADSIDE (`free_broadside_slot` fixed at
`$76A7`, 3 B free), so a level-time install must write the 8 glyph bytes into
the charset directly, exactly like the Light glyph install does. That is ~20 B
of ASM reachable from the level-select opcode, and it is why `weapon_glyph[2]`
sits in the payload page rather than being resident.

Player boosters are a different table (player PairShot glyphs 11-46) and a
different hot path (`handle_collisions`, 2,945 cycles MEASURED); see §5.

### 1.7 Obstacle and hull layouts

Debris is already an object with a pool (4 physical, 2 live). An obstacle
*layout* in 4.6 is a `SectorDef.sector_hazards` value: max live, cadence step,
allowed. A debris *pattern* (two debris admitted at authored columns as a
gate) is the one obstacle feature that needs code: `entity_spawn_debris` takes
its X from the Director instead of the RNG (~20 B). Bigger debris and moving
gondolas are 4.8a.

Capital hulls: the corridor hull is glyphs 59-89 plus BROADSIDE row data. A
"fresh hull per level" is ~10 ATR sectors of art per level (BRIEF: eight such
hulls ≈ 136 sectors with the LevelDefs) and is affordable only on the disk
path (§10.1 option B). A hull **variant** (4.8a: gondola heights, corridor
width, turret rows) is the `hull_params` payload block, 32 B, read by the
capital row generator and the player-vs-hull collision check that 4.8a adds.
Roadmap item 2's open question — whether that collision reads the character
map or assumes a fixed corridor width — is still unanswered in the repository;
the `hull_params` block is designed on the assumption that it will read the
map, because a fixed-width assumption cannot support variable corridors at all.

### 1.8 BossDef (4.7, shape only)

62 B in the payload page: 3 phases × (path id, fire `weapon_class`, burst
triplet, HP threshold, weak-point module mask) + entry/exit paths + reward.
The boss is not an enemy archetype (decision 21); it is a `BOSS` sector whose
lifecycle drives capital-style modules. This document only reserves its place
and its id so that `sector_kind = BOSS` and `boss_id` exist from day one.

---

## 2. The ownership boundary

### 2.1 Who owns which decision

| Decision | Owner | Field / state |
| --- | --- | --- |
| Which sector, when it starts and ends | Director | `sector_index`, row-in-sector, `sector_len`, capital completion, boss death |
| Which wave, when, how many, how spaced, in what formation | Director | `wave_*`, `wave_cursor`, `wave_remaining`, `spacing_timer` |
| Whether one more enemy may exist now | **Runtime, not level data** | subtype ceiling table + live counts (§2.3) |
| When a wave has ended | Director | `wave_remaining == 0` and no live member tagged with the wave |
| Which archetype a slot runs | Director (from the wave) → written once into `light_archetype_offset[slot]` / `heavy_archetype_offset` | replaces `encounter_light_schedule_advance` and `encounter_heavy_*` |
| Path, entry, mirror, member offset | Wave (Director copies them into the slot at admission) | slot `path_id`, `path_seg`, `seg_timer` |
| Movement inside the path | Archetype handler / shared path evaluator (C) | per-member X, Y |
| Fire cadence, burst, weapon class, fire window, pursuit | Archetype (C) | record + companion |
| HP, score, hull colour, renderer class | Archetype (C decides, ASM executes) | record; `enemy_c_light_hit`, `enemy_c_apply_pending_damage` |
| Debris/pickup/broadside allowance | Director from `sector_hazards`; lifecycles unchanged | `director_c_request` hazards 1-3 |
| Starfield colour and nebula per sector | Director decides at sector entry; ASM writes the register and reads a published byte per row | dispatch opcode `STARFIELD` |
| Publication, backing, glyph install, collision, PMG | ASM (unchanged) | — |

The line the owner drew ("Director owns what / when / how many / formation /
wave end; Archetype owns movement, fire, HP, score, weapon_class") holds with
one refinement the runtime needs: **formation** splits into *entry* (wave:
entry X, member offsets, spacing) and *flight* (path, chosen by the wave,
executed by the archetype handler). Nothing about a formation lives in an
archetype.

### 2.2 Heavy is pull-based, Light is push-based — deliberately

Heavy admission today is the kernel asking: `interceptor_admission_update`
runs its retry timer and calls `DIRECTOR_REQUEST` with hazard 0 through
`provisional_interceptor_director_request`, which temporarily overrides the
Director's phase and clears its reaction/recovery clocks to borrow another
phase's policy (`main.s:11337`). 4.6 keeps the question and deletes the
override: the kernel keeps asking on its cadence, and `director_c_request`
answers *yes* only when the current wave is a Heavy wave with formations
remaining and the ceiling allows. The Heavy "when" therefore moves into
`wave_spacing` without touching `reset_enemy` or the P1/P2 path. The
provisional request wrapper (`PICKUP_CODE`, 7 B fill) and
`select_interceptor_request_phase` (~55 B together, ESTIMATE) become free
bytes in that stream.

Light admission is C-owned end to end (`encounter_light_admit` today), so the
Director admits directly into a free slot when a Light wave is due. The two
styles meet at the same ceiling check.

### 2.3 How admission ENFORCES the ceiling instead of trusting the level

This is the mechanism decision 21.1 asks for, and it is the reason ceilings
are **not** level data:

1. A resident, build-time table `subtype_ceiling[subtype][class]` (4 B:
   SWARM → Heavy 0 / Light ≤ 4, ELITE → Heavy ≤ 2 / Light ≤ 1) is derived from
   measurement, changed only by a measured commit, and is the upper bound.
   `SectorDef.sector_light_cap` and `sector_heavy_cap` can only lower it:
   `effective = min(requested, table)`. A level file that asks for a Heavy in
   a SWARM sector gets zero Heavies and the validator warns at build time.
2. ASM maintains one byte per class of **live counts** (`ENEMY_LIVE_COUNT`
   already exists for Heavy members; Light and debris counts are new, 2 B),
   incremented at admission and decremented at retire/kill by the code that
   already owns those transitions.
3. `director_c_request(class)` compares live count to the effective ceiling
   before it asks ASM anything, and `_asm_director_can_allocate(class)` then
   answers only the hardware question: is a physical slot of that class free
   and is the player in an admitting lifecycle. Both reads are table lookups
   indexed by the class byte.
4. `wave_count` is a *request*: the stepper only decrements it when an
   admission actually succeeds, so a wave of eight in a sector capped at three
   simply takes longer. No wave can exceed the ceiling by authoring.
5. Heavy and swarm never coexist because `SWARM` has Heavy ceiling 0 and
   `ELITE` has Light ceiling 1 in the resident table — and a sector's subtype
   cannot change mid-sector.

### 2.4 The two ASM primitives that become data-driven (~30 B)

- `_asm_director_can_allocate` (`c-asm-abi.s:157`, 8 B today, ignores its
  argument and tests only `PLAYER_LIFECYCLE`) becomes: `lda live_count,x ;
  cmp physical_capacity,x ; bcs deny ; lda PLAYER_LIFECYCLE ; lsr ; …` — about
  14 B of code plus two 5-byte tables (classes: Heavy formation, Light, debris,
  broadside, pickup).
- `_asm_director_dispatch_event` (`c-asm-abi.s:179`, 10 B today: opcodes 1-4
  are accepted no-ops, 5 is the boss fallback) becomes a jump table indexed by
  opcode: `CAPITAL_DUE` (sets `DIRECTOR_FLAG_CAPITAL_DUE`, replacing the
  frame-600 gate), `BOSS_HANDOFF` (existing), `STARFIELD` (writes the star
  colour register and the published nebula byte), `LEVEL_SELECT` (copies a
  level image into the buffer, §3), `BREAKUP` (spawns the deferred Light
  breakup at a slot's X/Y, §8), `INSTALL_APPEARANCE` (16-byte glyph copy for a
  slot pair). Six entries × 2 B plus a ~12 B dispatcher.

Both stay semantic primitives, both stay in the ABI veneer segment
(`DIRECTOR_ABI`, 0 B free — the growth has to be paid for by the deleted
opcode-5 comparison and by relocating `director_publish_low`, 15 B, which is
boot-only, into bootstrap padding; ESTIMATE).

---

## 3. Buffer discipline — the level buffer

Rule: **the Director reads level data only through `level_buffer[offset]`,
where `level_buffer` is the single link-time symbol of a page-aligned
`LEVEL_BUFFER` segment.** No C source names an absolute address for level
data (today `LEVEL1_DATA` is reached by symbol already; the rule forbids
regressing to `U8_AT`), and no runtime pointer is ever formed (cc65 `ptr1`
audit stays at zero). Loading happens **only between levels**; during play the
buffer is read-only by contract and the native write-watch can assert 0 writes
to it from level start to level end, exactly as it does for the arena.

`level_select(n)` is the only writer. In 4.6 it is a 256/512-byte copy from
the level bank (§10.1 option A) or a no-op for a single resident level; later
it becomes a sector read into the same buffer (option B). Because the Director
never sees where a level came from, adding the disk path changes
`level_select` and nothing else. Two constraints keep option B honest:

- the buffer size is a multiple of 128 B (SIO sector size on this disk
  format), so a future reader lands whole sectors without a bounce buffer;
- the format carries `magic_version` so a stale ATR level cannot drive a newer
  Director.

Adding the disk path itself is out of 4.6's scope and is not free: ADR-004
explicitly forbids disk I/O between levels, the only sector reader is boot
stage-2 overlay code calling `SIOV` (`main.s:11641`), and an in-game reader is
hardware-critical work (OS call after takeover, against the live VBI/DLI and
display). The buffer discipline is what makes that a later, bounded task
instead of a redesign.

**HARD REQUIREMENT on that reader — the loader-mode display must set the OS
shadows before it hands control to SIO.** Not merely restore hardware
registers afterwards. EMULATOR-MEASURED 2026-09-20 (Atari800 7.1.2 PAL/XL,
boot smoke 8/8, `build/runtime-wall-trace/boot-smoke/report.json`,
`snapshots[].sdlst` / `.memtop` / `.ramtop`): on a machine cold-started **with
BASIC enabled**, the OS sets `RAMTOP = $A0`, `MEMTOP = $9C1F` and
`SDLSTL`/`SDLSTH` = `$9C20`, putting its screen at `$9C20-$9FFF` — **inside
resident game RAM**, not in the BASIC window. That range holds the
`ENTITY_CODE` tail (`$9C20-$9D5C`), `DIRECTOR_C_PRE`, `LEVEL1_DATA` and
`DIRECTOR_C_CODE` (`$9E13-$9FF7`). `disable_basic_rom` unmaps the ROM but
**does not move the OS shadows**.

Nothing breaks today, because MEASURED `NMIEN = $80` from frame 250 on: the OS
VBI NMI is off and no one rewrites the display list from those shadows. The
reader is what changes that. It calls `SIOV`, and an in-game `SIOV` path that
revives the OS VBI hands the OS a display-list pointer of `$9C20` — into
Director code. Restoring `DMACTL`, `DLISTL`/`DLISTH`, the colours, `CHBASE`
and `PMBASE` *after* the read is too late: the OS VBI acts during it. The
loader-mode display state therefore owns `SDLSTL`/`SDLSTH`, `RAMTOP` and
`MEMTOP` — it writes its own values into them before the first `SIOV` call, and
this is part of the reader's definition of done, not a later hardening step.
See decision O and decision R in
[owner-decisions-2026-09-11.md](owner-decisions-2026-09-11.md) §R.1.

Where the buffer lives is the placement question of §7.3: the core page wants
to replace `LEVEL1_DATA` in `DIRECTOR_RAM` (158 → 256 B, which forces ~100 B
of Director code out to the arena), and the payload page only exists if the
BASIC window is opened.

### 3.1 Director runtime state (RAM)

Today's 12 B at `$80F4-$80FF` are reinterpreted, not grown: `STATE_ROW_LO/HI`
stay; `STATE_PHASE` → `sector_index`; `STATE_EVENT_INDEX` → `wave_cursor`;
`STATE_PENDING` → `wave_remaining`; `STATE_DEFER_LEFT` → `spacing_timer`;
`STATE_INTENSITY/REACTION/RECOVERY` → sector row-in-sector low/high and the
volley pulse timer; `STATE_RNG`, `STATE_FLAGS`, `STATE_ADMISSION_FRAME`
unchanged. New: 3 B "which bitmap is installed in appearance slot 0-2", 1 B
expensive-event token (§8), 2 B live counts — 6 B, from the unowned windows.

### 3.2 Light slot state (RAM)

Four slots as SoA, 12 arrays × 4 = 48 B plus 2 shared (BRIEF figure), split
across the two unowned windows `$8126-$813F` (26 B) and `$85E6-$85FF` (26 B):
state, hp, x, y, fire_timer, burst_left, archetype_offset, path_id,
path_seg|appearance, seg_timer, screen_lo, screen_hi. Backing0/backing1 move
to the ASM render cache side per slot. The single-slot record at `$8100-$810F`
is retired into this layout. The two ASM prerequisites named by the costing
stay prerequisites: the backing resolver keyed by screen address instead of
glyph code (so slot count and glyph code count are decoupled; ~20-30 B) and
the glyph install hoisted from every frame to admission (−255 cycles per
frame; required before two appearances can be live).

---

## 4. Where each record lives (proposed)

| Record | Size | Segment / address | Transport |
| --- | ---: | --- | --- |
| LevelDef core page | 256 B | `LEVEL_BUFFER` in `DIRECTOR_RAM` (replaces `LEVEL1_DATA`, 158 B) | level 1 image in the Director DFMC record, as today |
| LevelDef payload page | 256 B | `LEVEL_BUFFER+$100`, only with the level bank | copied by `level_select` |
| Level bank (levels 1-8, both pages) | 4 KB | `$A000-$AFFF` — **the window is open (owner decision B, 2026-09-20): `BASIC_WINDOW` `$A000-$BC19`, 7,194 B, empty)** | one new DFMC record: **MEASURED 2026-09-20**, `MAX_CHUNKS` / `CHUNK_MAX_COUNT` 8 → 9 costs **exactly 16 B** of the stage-2 overlay (`$4EF` → `$4FF` of `$800`) and is already done; the chunk loader accepts window destinations on both media. Cost still to pay: **one ATR transport sector** per record (~2 ATR menu frames), and the boot smoke's fixed frame-300 loader checkpoint, which has 3 frames of margin |
| SectorDef / WaveDef | inside the core page | — | — |
| PathDef library (8) | 96 B | arena RODATA | arena record |
| Archetype records | 48 B | `ENEMY_ARCHETYPE_DATA` (unchanged) | extension stream |
| Archetype motion companion | 16 B | arena RODATA | arena record |
| Subtype ceiling table, physical capacity table | 4 + 5 B | arena RODATA / `DIRECTOR_ABI` | — |
| `weapon_class` visuals | 9 B each | BROADSIDE builder (build time); level overrides via payload | — |
| Light appearances (Wingman, Interceptor base art) | 32 B | ENTITY_CODE tail `$9D2B-$9D4A` (unchanged) | — |
| Light slot SoA | 50 B | `$8126-$813F`, `$85E6-$85FF` | BSS |
| Director state | 12 + 6 B | `$80F4-$80FF` + window | BSS |
| Director core C (sector/wave stepping, ceilings) | ≤ 389 B | `DIRECTOR_RAM` after the buffer | Director record |
| Path evaluator, multi-slot Light tick, volley/conditional fire, breakup token | ~360 B (ESTIMATE) | arena (`HYBRID_C_ARENA`) — or `$B000+` if opened | arena record |
| Multi-slot `LIGHT_CODE` loops, address resolver, hoisted install, live-count maintenance | ~140 B (ESTIMATE) | `HYBRID_C_EXT` after the Light tick C moves to the arena (frees ~170 B there) | extension stream |
| Starfield colour + nebula thickening | ~40 B ASM (ESTIMATE) | `generate_starfield_row` lives in the STARFIELD segment, whose packed size is 7 B over its correction gate — **no home today** (§10.2) | — |

---

## 5. Extension-point cost table

Marginal costs use the brief's and STATUS's measured numbers where they exist.
"Per-level" means the thing can differ per level with no resident cost beyond
the payload page; "per-game" means it is resident code or resident data shared
by all levels.

| Extension | Data or code | Bytes (marginal) | CPU (marginal) | Per-level? | Notes |
| --- | --- | ---: | ---: | --- | --- |
| Light archetype (new record) | data | 12 + 4 B | 0 | per-game | ROSTER FREEZE: needs an owner decision; the EXT tail (19 B) cannot take it, arena can |
| Heavy variant (same PMG art, new record + colour) | data | 12 + 4 B + 1 B colour | 0 (Option D) | per-game | a new 16 B silhouette also needs a roster shape entry (BROADSIDE 3 B, ENTITY 1 B free: **no home**) |
| Firing style expressible by burst/interval/reload/class | data | 0 (record edit) | 0 | per-game | MEASURED: Wingman vs Interceptor differ by data alone |
| Firing style needing a branch (volley, conditional, column-aimed) | code | 20-60 B C each | ≤ ~40 cycles per firing member | per-game | three of the six "new code" items |
| Projectile look and speed (hostile `weapon_class`) | data | 9 B | 0 (+26 cycles per rendered slot already paid) | per-level with payload; per-game otherwise | 5 free class slots |
| Flight path | data | 12 B | ~80-120 cycles per member per frame (ESTIMATE) after the ~150 B evaluator (per-game) | per-level (8) + per-game (8) | replaces the 167 B Interceptor branch pattern for all future motion |
| Appearance (Light bitmap) | data | 16 B | ~300 cycles once at admission; −255/frame standing after the hoist | per-level with payload | max 3 live at once (codes 120-125); non-overlapping waves may share a slot |
| Obstacle layout (debris density/cadence) | data | 1 B in SectorDef | 0 | per-level | debris pattern at authored columns: +20 B code per-game |
| Capital hull, fresh art | data | ~10 ATR sectors + 248 B glyph payload | 0 | per-level **only on the disk path** | not affordable resident |
| Capital hull variant (4.8a params) | data + one check | 32 B payload + collision check code (4.8a) | 4.8a's own budget | per-level | assumes map-reading collision |
| `weapon_class` for player boosters | data + hot-path code | 9 B glyph + 30-80 B ASM in `handle_collisions` | rate/strength/pierce ≈ 0-100; spread costed separately (roadmap item 4) | per-game | ENTITY_CODE and BROADSIDE are full: placement decision first |
| Boss | data + module code | 62 B BossDef + 300-500 B controller (ESTIMATE, 4.7) | 4.7 budget | BossDef per-level; controller per-game | designed as data from the start (decision 21 item 5) |
| Sector SUBTYPE | data | 0 (a SectorDef row + a 2 B row in the ceiling table) | 0 | per-level | e.g. SWARM/ELITE today; a "GAUNTLET" subtype = new ceiling row |
| Sector TYPE (new kind) | code | 100-300 B lifecycle + possibly renderer work | unknown | per-game | the expensive axis: keep three kinds |

The pattern the table shows: everything under "data" is cheap and mostly
per-level; the six behaviours are per-game code written once; and the three
things that are genuinely expensive — fresh hull art, new silhouettes, a new
sector kind — are expensive because of placement, not cycles.

---

## 6. Eight levels, each with something new — does the budget carry the promise?

> **SUPERSEDED 2026-09-20 in its premise — owner decision E: the campaign is
> SIXTEEN levels, not eight.** The table below stays as the demonstration it
> was: it shows that the novelty axes and the budget line up, and every row is
> still a valid level. It is no longer the campaign. Its "Bytes: not without an
> owner decision" verdict is **answered**: owner decisions **B** (open the
> window) and **C** (the loader carries data per level, not code) take *both*
> §10.1 variants A and B, so the campaign has a home. And owner decision **F**
> makes capital variety parametric — four segment-art sets with length, turret
> density and gondola protrusion as independent 4-step parameters — so sixteen
> levels do not mean sixteen art sets. See
> [project-overview.md](project-overview.md) §3.6 and §6.1.

Not a level design; a demonstration that the novelty axes and the budget line
up. Novelty sources available from this architecture: 4 archetypes × N paths ×
3 live appearances × 5 projectile looks × subtypes × volley/conditional flags ×
debris density × starfield look × hull variant × boosters.

| Level | New thing (from data unless marked) | What it depends on |
| --- | --- | --- |
| 1 | today's ELITE Raider + escort, straight descent, debris | 4.6 core |
| 2 | first SWARM: three Wingman-class Lights on a sine envelope, appearance A | multi-slot Light, path evaluator |
| 3 | Interceptor swarm with LASER on a snake path; first booster (rapid) | volley off, `track` segment; roadmap item 4 |
| 4 | Bomber ELITE with a hold-heavy Heavy path; new heavy shell look (class 4); hull variant 1 | Heavy-on-path (dy ≥ 0), payload weapon glyph, 4.8a |
| 5 | synchronised volleys; nebula starfield | volley flag; starfield thickening (§10.2 placement) |
| 6 | mixed pacing: ELITE Bomber pair with Interceptor escort alternating with SWARM; conditional fire; appearance C; denser debris | flags only |
| 7 | V and line-abreast entries; retire-upward ambush waves; second booster (piercing) | member offsets, retire flag; item 4 |
| 8 | boss last, preceded by the level's hardest SWARM/ELITE alternation | 4.7 |

Verdict, stated plainly:

- **Novelty:** yes. Seven of the eight rows are data once the six behaviours
  exist, and the six are small (≈ 300-400 B of C in total, ESTIMATE).
- **Cycles:** yes for ELITE (1,464 cycles worst margin MEASURED after Option
  D, with room for a Bomber salvo) and for SWARM at three Lights (§8). Four
  Lights is conditional on the hoist and the token rule and must be measured
  before any level authors it.
- **Bytes:** **not without an owner decision.** Eight LevelDefs are 2 KB of
  core pages alone (4 KB with payloads), the resident free space is ~300 B,
  and the boot transport has zero ATR slack. The promise holds only with
  either the BASIC-window level bank (A) or the between-level loader (B) in
  §10.1. With neither, the honest number is **one, at most two, resident
  levels**, and the campaign is a 16-level roadmap item without a home.
- **"A new obstacle" every level:** only partially. Debris density and
  patterns give two or three distinct obstacle feelings; hull variants give
  more but arrive with 4.8a; destructible gondola guns are backlog. The
  promise is better read as "a new enemy behaviour, wave shape, look or
  weapon", which the data supports, than as a new obstacle type per level,
  which it does not.

---

## 7. Byte and boot accounting

### 7.1 What the deleted schedulers free (MEASURED)

The brief attributes 33 B of `HYBRID_C_ARENA_RODATA` to the TEMPORARY Heavy
smoke scheduler; the linked size of that RODATA is 39 B at HEAD
(`__HYBRID_C_ARENA_RODATA_SIZE__ = $27`), and only the four schedule columns
`encounter_heavy_archetype/roster_shape/hull_colour/light_escort` (4 × 2 B)
are scheduler data — `heavy_profile_fields`, `bomber_formation_start` and the
lane tables are Bomber data that stay. Deleted with them:
`encounter_light_schedule` (2 B in `ENEMY_ARCHETYPE_DATA`), the two counters
at `$8119-$811A`, and `encounter_light_schedule_advance` plus the schedule
reads in `enemy_c_spawn_raiders` and `encounter_light_admit`, ~40 B of C
(ESTIMATE from the generated code shape). **Order of 50-80 B.** That is not
what funds the new Director; it is what makes the arena record slightly
smaller.

### 7.2 What the retired phase machinery frees (ESTIMATE)

`phase_budget/reaction/recovery` (three 3-way selectors), `director_check_phase`,
the defer/pending path in `director_c_world_row_tick`, the intensity charge in
`director_c_request/release`: ~190 B of the 485 B `DIRECTOR_C_CODE`, plus
the 158 B `LEVEL1_DATA` itself (replaced by the 256 B core page). Net in
`DIRECTOR_RAM`: −190 + ~200 (sector/wave stepping) −158 + 256 ≈ **+110 B over
a segment with 2 B free**, which is why `director_c_request` (~110 B) must
move to the arena.

### 7.3 What 4.6 needs, and where it does not fit (ESTIMATE)

| Item | Bytes |
| --- | ---: |
| Path evaluator (C) | ~150 |
| Multi-slot Light tick delta (SoA loop, per-slot path state) | ~80 |
| Volley + conditional + column-aimed fire | ~60 |
| Breakup token and deferred breakup | ~30 |
| Ceiling enforcement + live-count maintenance + data-driven primitives | ~60 |
| Multi-slot `LIGHT_CODE` erase/render loops (ASM) | ~60 |
| Resolver by screen address (ASM) | ~40 |
| Hoisted glyph install (net) | ~+5 |
| PathDef library + motion companion + ceiling tables | ~120 |
| Level buffer growth (158 → 256) | ~100 |
| Starfield colour + nebula thickening (ASM, STARFIELD segment) | ~40 |
| **Total** | **~745** |

Reachable room: arena 215 B free + 50-80 B from §7.1 + `HYBRID_C_EXT` 19 B +
the ~170 B freed in EXT by moving the Light tick C into the arena (which the
arena then has to absorb) + 52 B of unowned RAM already earmarked for the
Light slot SoA. Rearranged: the arena is asked to hold roughly 617 − 70 + 110
(request) + 170 (Light tick) + 150 + 60 + 30 + 120 ≈ **1,190 B against 832 B**.
The deficit is ~350-450 B of code/data before a single level beyond level 1
exists. The STARFIELD segment is separately over its correction gate by 7 B,
so the per-sector starfield work has no home in its own segment regardless.

Conclusion: **4.6 cannot be placed in the current resident map** by deleting
the schedulers and phase machinery alone. The design does not change with
where the bytes come from, but the roadmap does (§10.1).

### 7.4 Boot-smoke risk, either way

> **VOID as a risk since owner decision 22 (2026-09-18).** The
> `190 + 2 × transport sectors` deadline this section is built on was re-based
> on the owner's real 60-second budget: an absolute ceiling of 3,000 PAL frames
> plus a delta against a committed baseline (fail at +50, warn at +10). The
> zero-slack "met with 0 frames" framing below described a formula agreeing
> with itself, not a requirement. STATUS has said so since 2026-09-18; this
> banner was added 2026-09-20 so the section does not state the risk in its own
> voice.
>
> Two further corrections, MEASURED 2026-09-20: the free-sector figure below is
> **537**, not 538 (decision A spent one), and **"+2 frames per sector" is not
> an identity** — with the same 183 sectors the ATR menu arrives at 554 frames
> cold-started without BASIC and 538 with BASIC enabled. Use it to size a
> budget, never to predict a frame.

The ATR menu deadline is `190 + 2 × transport sectors` frames and is met with
0 frames of slack at every candidate since `3838c00` (MEASURED). Two measured
facts bound the risk: a 4.5M-M1 boot saving of 24,418 cycles (0.69 frame) did
not move the ATR menu frame (the loader countdown is frame-aligned), and a
throwaway 832 B arena was one frame late where the 617 B arena is exactly on
time. So:

- shrinking the arena record by 50-80 B (schedulers gone) buys **nothing**;
- growing any direct-landing record by a few hundred bytes without adding a
  sector is the shape that has failed before (4.5a first variant, 4.5b BROADSIDE
  +6 B) and must be assumed to fail until measured;
- adding sectors raises the deadline by two frames per sector, and the record
  set so far has consumed exactly that allowance, so a new 2-4 KB level-bank
  record is a coin flip per sector, not a known pass.

The only structural mitigation that stays inside the rules is to make 4.6's
new resident content land in a record whose decode happens **after** the menu
milestone is measured (the deadline measures `start → menu`, and stage-2
decodes every record before the menu). That is a loader ordering change and is
itself a non-default action under rule 89. The alternative is an owner
re-basing of the deadline formula (§10.3). Either way, every 4.6 candidate
carries its own `--boot-smoke-only` run and the design assumes it may lose.

---

## 8. The SWARM death-frame rule

Arithmetic with the brief's numbers (Heavy-free SWARM frame margin ~3,100;
one Light ~412 standing; a Light kill frame up to 1,771; a firing Light
≈ +150 over standing, MEASURED at 4.4c as `light_update` 515 → 662):

| Lights | Standing | Margin | + one kill (+1,359) | + all firing |
| ---: | ---: | ---: | ---: | ---: |
| 3 | 1,236 | 1,864 | 505 | 55 |
| 4 | 1,648 | 1,452 | 93 | **−507** |

So a four-Light swarm misses the fence when one dies on the frame the others
volley, and two kills on one frame miss at any count. The architecture
prevents the pile-up with one rule, on the Option E pattern (the player
death's PMG publication is already deferred by a frame):

**At most one expensive event per frame.** A 1-byte token in Director state is
reset to 1 at the start of the Light tick loop. The events that consume it:
a Light breakup spawn, a wave volley pulse, and (if measurement demands) a
Heavy explosion. A Light whose `enemy_c_light_hit` returns lethal while the
token is spent enters `DYING_PENDING`: it is erased and freed this frame (the
cheap part, backing restore), scores this frame, and its breakup is spawned by
the C tick on the first later frame with a free token through the `BREAKUP`
dispatch opcode (slot X/Y). A volley whose pulse lands on a spent frame slips
one frame. Player-visible effect: a debris burst up to two or three frames
late when several Lights die together — at 50 Hz, invisible.

Where the rule lives: **in C, in the per-slot tick loop of the Director's
lifecycle** — it is a decision about when, so it is C's by the AGENTS.md
boundary. ASM's kill and contact paths change in one place: `light_destroyed`
no longer spawns the breakup itself; it erases, frees, scores and returns.
The token also covers the two 4.5d misses' shape (Light contact kill inside
`light_update` after the enemy update has already run), because the breakup
is what made those frames expensive.

With the rule, three Lights are affordable with the measured numbers and four
are affordable **if** the hoisted install's −255 cycles and the token's
deferral of the volley are both confirmed by a population measurement. The
subtype table ships with SWARM Light ceiling 3 until that measurement raises
it; the level format already allows 4.

---

## 9. What this architecture deliberately does not support

- **A third Heavy, or Heavy alongside a swarm.** Two Heavies are the PMG
  ceiling (P0+P3 player, P1+P2 Heavy, no fifth player). The subtype table
  makes the exclusion unauthorable. A future session must not "just add a
  slot" or multiplex P1/P2.
- **Angled, homing or leading hostile projectiles.** Hostile shots move
  straight at their class step rate inside one ANTIC 4 cell column; an X
  velocity means re-backing across cells in the PairShot renderer hot path,
  in ENTITY_CODE (1 B free) and BROADSIDE (3 B free). "Aimed" in 4.6 means
  the emitter chooses its column (path `track` segment, `aimed` wave flag),
  which is free. §10.5 is the owner's call if angled shots are wanted anyway.
- **Lights in `CAPITAL` sectors.** The Light lifecycle is fighter-only because
  capital frames skip the late publication window (`sector_c_update_first_capital`
  waits for the Light to be unpublished). `CAPITAL` has Light ceiling 0 in the
  resident table.
- **More than three live Light appearances.** Codes 120-125 are the only free
  glyphs; the 4.6 format has exactly three appearance slots.
- **A bytecode path VM or 16-bit keyframes.** Paths are four velocity
  segments; anything needing multiplication, tables per path or runtime
  pointers is out. Smoother curves are a sine table, not an interpreter.
- **A new sector kind.** `SPACE`, `CAPITAL`, `BOSS`; new feelings are subtypes
  (a ceiling row and wave lists), not lifecycles.
- **Mid-level disk I/O**, an overlay manager or a module format (ADR-004).
  The buffer discipline exists so that a between-level loader is a later
  bounded task, not so that anything loads during play.
- **Per-difficulty wave tables.** One authored table, a spacing rule and the
  archetype reload triplet. Three copies of every wave for a knob the ceiling
  caps is not a good trade at 8 B per wave.
- **New enemy archetypes.** ROSTER FREEZE. Variety comes from paths, waves,
  looks and weapons; the companion table gives the four records room to differ
  without a fifth.
- **Fresh capital hull art per level while levels are resident.** Ten sectors
  of art per hull is a disk-path feature (option B) only.

---

## 10. Decisions only the owner can make

Each is phrased as a decision with its consequence; the design works under any
answer, the roadmap does not.

1. **Where do eight levels live?** — **ANSWERED AND SUPERSEDED TWICE.**
   Owner decision 23 §10.1 (2026-09-19) chose **variant B** and rejected
   variant A. Owner decisions **B** and **C** (2026-09-20) then took **both**:
   the window *is* opened, and the disk carries per-level **data**, not code.
   The variants below no longer describe the choice that was made, and the
   question's own premise changed: owner decision **E** makes it **sixteen**
   levels. Variant C ("one or two levels resident, the target deferred") is
   dead. Kept for the reasoning and the costs, which are still sound.
   - **A. Open the BASIC window `$A000-$BFFF` as a boot-loaded level bank
     (recommended for 4.6).** 4 KB of LevelDef pages plus the 4.6 code that
     does not fit the arena. Keeps ADR-004 (no disk I/O after boot), needs a
     rule-89 exception, one more DFMC record (`MAX_CHUNKS` 9) or a merged
     record, a `PORTB` bit-1 write at takeover (the runtime does not touch
     `PORTB` today, so BASIC's state on a real 65XE ATR boot is whatever the
     boot left it — that write and its SIO2SD smoke are new hardware work),
     and a boot smoke that may lose a frame (§7.4). Consequence: fresh hull art per level
     stays unaffordable; hull variants are parameters.
   - **B. A between-level loader into the resident buffer.** Supersedes
     ADR-004, adds a resident `SIOV` reader (~80-120 B) and a loader-mode
     display state, hardware-critical validation on real SIO2SD. Consequence:
     the disk's 537 free sectors (MEASURED at HEAD; 538 before decision A) become the content budget, fresh hulls and
     per-level payloads become cheap, and 4.6 grows a hardware task.
   - **C. Neither.** One or two levels resident; the eight-level target is
     deferred with the campaign. Consequence: 4.6 still ships subtypes, waves
     and paths, for level 1 only.
2. **The per-sector starfield (21.3) has no bytes in its segment.** Either
   the STARFIELD correction gate moves (the open decision already in STATUS),
   or the thickening runs from a `jmp` into a window elsewhere at +3 B in the
   STARFIELD tail plus the code elsewhere, or 21.3 waits for A. Consequence:
   the "distinct-looking SPACE sector" is data-cheap but placement-gated.
3. **Is the ATR menu deadline formula sacred?** If yes, 4.6 must be
   packed-byte-neutral in every record decoded before the menu, which the
   numbers in §7.3 say is not possible; the practical reading is that any
   4.6 candidate that lands one frame late needs an owner re-basing rather
   than a redesign. If no, state the new allowance once (e.g. `190 + 2 ×
   sectors + k`).
4. **Path look: piecewise-linear segments (proposed) or a sine table.**
   Segments: 0 B tables, octagonal loops, ~80-120 cycles per member. Sine:
   +32 B, +~40 cycles per member, smoother envelopes. Art-direction call.
5. **Aimed fire = column choice at admission (proposed), or angled
   projectiles.** Angled projectiles are hot-path ASM in full segments and
   would be `BLOCKED_PLACEMENT` today; approving them means approving a
   renderer task before 4.6 can author them.
6. **Difficulty model.** *(Answered by decision 23 §10.6: scaled spacing,
   unscaled counts, ceilings never scaled. Extended by owner decision **J**,
   2026-09-20: difficulty scales the existing reload and spacing scaling **and**
   damage — player-dealt, player-taken, contact and boss. Ceilings still never
   scale.)* Proposed: waves authored for MEDIUM, spacing scaled
   by shifts, counts unscaled, ceilings never scaled. Alternative: HARD adds
   +1 to Light wave counts (a 1 B header rule) — cheap, but it makes HARD
   swarms hit the ceiling sooner rather than feel different.
7. **SWARM ceiling to ship: 3 (measured-safe) or 4 (conditional on the hoist
   and the token, re-measured).** The format allows 4 either way; the resident
   table decides what the runtime admits.
8. **Level 1 mapping.** The proposed three-sector reading of today's 3,712
   rows (ELITE / CAPITAL / ELITE) changes nothing the player sees except that
   the capital arrives on a row instead of active frame 600. Confirm that the
   frame-600 gate is provisional and may go.

---

## Appendix — mapping today's `director.c` onto the new records

| Today (`LEVEL1_DATA`) | 4.6 |
| --- | --- |
| `level1_phase_end_lo/hi[8]` | `sector_len[]` (rows / 8), cumulative in the stepper |
| `level1_phase_hazards[8]` | `sector_hazards[]` bits 0-3 |
| `level1_phase_budget_{easy,medium,hard}[8]` | retired: ceilings replace the intensity budget for enemies; debris max is in `sector_hazards` |
| `level1_phase_reaction_*`, `recovery_*` | retired: `wave_spacing` and the Heavy recycle cadence carry pacing |
| `level1_phase_capital_state[8]` | `sector_kind == CAPITAL` |
| `level1_phase_pickups[8]` | `pickup_policy` (level) + `sector_hazards` bit 2 |
| `level1_phase_variants[8]` | `wave_flags` (mirror/alternate) |
| `level1_event_row_lo/hi[6]`, `opcode`, `arg0`, `arg1` | `wave_row[]`, `wave_flags[]`, `wave_archetype[]`, `wave_path[]`; the boss handoff becomes the end of the last sector |
| `hazard_bits[4]`, `hazard_costs[4]` | `hazard_bits` stays (mask test); costs retired |
| `STATE_PHASE`, `STATE_EVENT_INDEX`, `STATE_PENDING`, `STATE_DEFER_LEFT` | `sector_index`, `wave_cursor`, `wave_remaining`, `spacing_timer` |
| `asm_director_can_allocate()` (player alive only) | class-indexed live-count vs physical-capacity check |
| `asm_director_dispatch_event()` (accept 1-4, deny 5) | opcode jump table (§2.4) |
| `encounter_light_schedule`, `encounter_heavy_*` (provisional) | deleted; the wave names the archetype |
| `provisional_interceptor_director_request` (kernel phase override) | deleted; the kernel's request is answered from the wave |
| `FIRST_CAPITAL_FRAME` (frame-600 gate) | `CAPITAL_DUE` opcode at the sector row |
