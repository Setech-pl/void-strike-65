# VOID STRIKE 65 — consolidated project overview

**Pinned to HEAD `c31b2208e9ae85678c02a20ed2e11a3ef4b38cfa` (`c31b220`), branch
`wip/4.5d-gate-fail`, worktree clean. Written 2026-09-20.**

This document exists because the picture had scattered across eight documents
and the copies had gone stale in ways that cost real work. The immediate cause:
[STATUS.md](STATUS.md) and [memory-map.md](memory-map.md) both stated a **45 B**
`ENTITY_CODE` free tail while the measured tail was **1 B**, and a 3-byte inline
insert assembled cleanly, ran `ENTITY_CODE` past `$9D5D` and crashed at runtime
on `2-contact-debris-fire0` frame 61.

**Every figure below is labelled.**

| Label | Meaning |
| --- | --- |
| **MEASURED** | Read at this HEAD from `build/void-strike-65.map`, `build/encounter-director.map`, `build/integration-glue.map`, `build/capital-player-collision.map`, the `.lbl` files, `build/manifest.json`, `cfg/*.cfg` or the source. |
| **EMULATOR-MEASURED** | Measured in Atari800 7.1.2 only. Provisional. See §7. |
| **ESTIMATE** | Not measured. Derived, projected or owner-stated. |

Nothing here was carried over from an older document without re-measuring it.
Where a document disagrees with the repo, §8 names the document, the wrong
figure and the measured value.

**Standing of this document.** It is the single entry point, not a new tier of
truth. The precedence list in [README.md](README.md) is unchanged: current Git,
code and build output outrank every document including this one. This file is
authoritative *for this HEAD*; once the repo moves, the build output wins and
this file must be re-measured or retired.

**Build state.** `build/` and `dist/` were produced at this HEAD
(`buildVariant: "candidate"`). MEASURED artifact hashes of the current worktree:

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `dist/void-strike-65.xex` | 23,862 | `276433cd15d4e983935888ca064ad00e1f3d6d901d3712e0f05bb73f3dee949b` |
| `dist/void-strike-65.atr` | 92,176 | `ab2d50fadb67ff9b51a0af1b0c3687a583386e1be5581ae0c476f0763a895b6a` |

---

## 1. What the game is now

### 1.1 The accepted runtime checkpoint

**Commit `0002d84`** — Option D, the `P1`/`P2` body-copy skip in
`draw_enemy_member`. Owner smoke **PASS 2026-09-18**.

XEX SHA-256 (as recorded, not reproduced at this HEAD):
`ecc9cedafd87f871989fc0b279343d1848c225792bf17e5be4ad9fadd1f7d3c7`

> **Caveat carried forward, unchanged.** A clean-export reproduction of
> `ecc9ceda…` has never been re-verified since acceptance. Re-run
> `npm run build:candidate -- --quiet` from a clean export of `0002d84` before
> using that hash for a release or a hardware milestone. The hash above is not
> the hash of the artifacts now in `dist/` — those are the decision A candidate.

**Increments carried by the accepted checkpoint** (all OWNER-ACCEPTED under it;
a candidate label is not carried for code that ships in an accepted binary):

- the hybrid C Director foundation; C-owned sector, lifecycle and
  `EnemyArchetype`;
- Light Wingman M1 and the solid fifth-player PMG pickup with per-type capsule
  silhouettes;
- step 4.3 Stage 1 reusable resident capacity; debris late publication with
  exact ownership; the debris score on shot and on contact;
- roadmap 4.4 Interceptor, 4.4b visual identity, 4.4c hostile weapon visuals;
- roadmap 4.5a Heavy window, 4.5b `BOMBER` weapon class, 4.5c Bomber,
  4.5d enemy identity freeze (catamaran silhouette, HP-driven blue hull ramp);
- roadmap 4.5M-M1 starfield staging swap, M2 cold-record relocation,
  M3 `HYBRID_C_ARENA`;
- emitter-independent hostile shots; the death-frame deferral (Option E) and
  its respawn double-image fix; the segment neighbour guards; Option D.

**Enemy roster — FROZEN** (owner decision 21): Raider and Bomber (Heavy, on
`P1`/`P2`), Wingman and Interceptor (Light, character-rendered). MEASURED:
`ENEMY_ARCHETYPE_DATA` is 50 B = 4 records × 12 B + a 2 B provisional Light
schedule table (`ENEMY_ARCHETYPE_RECORD_BYTES 12u`, `src/c/enemy-archetype.h:32`).

**Measured state at the accepted checkpoint** (EMULATOR-MEASURED for the two
timing rows; MEASURED for the byte rows, and all four byte rows still hold at
this HEAD):

| Measure | Value | Label |
| --- | ---: | --- |
| Worst fence margin (`raider-remnant-rapid-xex-hard` row 1945) | 1,464 cycles | EMULATOR-MEASURED |
| Distinct miss events, 69 audited replays | 0 | EMULATOR-MEASURED |
| Native stale-body gate, 78,124 live-body frames | 0 stale rows | EMULATOR-MEASURED |
| `HYBRID_C_ARENA` | 617 / 832 B, 215 B free | MEASURED |
| `BROADSIDE` free tail | 3 B | MEASURED |
| `ENTITY_CODE` free tail | **1 B** | MEASURED |

### 1.2 What is outstanding as a candidate

**Exactly one: owner decision A (2026-09-20) — the ATR must boot without
OPTION.** `OWNER-SMOKE CANDIDATE`. It is implemented at this HEAD and is what
`dist/` currently contains.

- **Defect it fixes.** `boot_entry` ended in `rts` and relied on OS coldstart
  jumping through `DOSVEC`, which coldstart only does when no cartridge is
  enabled. With BASIC enabled the free ATR loaded all its sectors and the PC
  landed inside the BASIC ROM. The disk only reached the game if the player
  held OPTION. It went unnoticed because **all four boot-smoke cold sessions
  ran `-nobasic`** — no gate exercised the failing OS path.
- **Fix.** `disable_basic_rom` (14 B, reusing the retired 4.5M-M3 padding
  inside the fixed `$01A3` bootstrap prefix) forces `PORTB` bit 1 read-modify-
  write, preserving bits 0 and 7, and writes `BASICF = $01` so a warm start
  does not re-map the ROM. Called from `boot_stage2_atr_entry` before the SIO
  load and from `boot_stage2_xex_entry` before `jmp start`. `boot_entry` now
  ends `jmp start`.
- **Cost, MEASURED.** Initial boot block 103 → **104** sectors; transport
  182 → **183** sectors. Deliberate growth under owner decision 22.
- **Boot smoke, EMULATOR-MEASURED.** Now eight cold sessions (XEX/ATR ×
  cold fill `$A5`/`$5A` × BASIC on/off), **8/8 pass**. A negative control on
  the pre-fix source fails exactly one session, `atr-a5-basic`.
- **Not accepted.** It changes the boot contract and needs a real-hardware
  smoke on SIO2SD that this session could not run. See §7.2.

### 1.3 Known open defects

Carried from STATUS, unchanged, with staleness corrected where measured:

1. **ATR boot contract is proven in Atari800 only** (decision A, above).
2. **PAL fence budget is relieved but not closed.** 1,464 cycles of worst
   margin with two Bombers live. It remains the binding constraint on 4.6
   population.
3. **`docs/runtime-wall-trace.json` is stale and cannot be regenerated.**
   Current blocker `BLOCKED_PICKUP_SEQUENCE_DRAWN_MASK`: the emulator's pickup
   capture gate requires `(ENTITY_DRAWN_MASK + 1) & 15 == 15`, and production
   never writes slot 1's drawn mask (dead memory since `f6eee5c` moved the
   capsule to the missile plane), so the gate is unsatisfiable by construction.
   Pre-existing, previously unreachable, awaiting an owner decision.
   Consequence: `npm test` is blocked at HEAD, because it runs a *final* build
   which refuses to bind to the stale report.
4. **Intermittent purple artifact after a Raider** — no deterministic
   reproduction.
5. **Spread second capsule trace / final glyph** — reported in plan v4.12 §11,
   not re-verified since PairShot and the PMG capsule.
6. **Debris death-frame blink** and **debris contact-kill inconsistency** in
   the dying/respawn window and inside `BROAD_DAMAGE_COOLDOWN` — both
   pre-existing, both explicitly left as is by the owner.
7. **Packed STARFIELD correction gate** — open owner decision. MEASURED at this
   HEAD: 1,811 B total against a 1,804 B correction gate (7 B over) and an
   1,825 B hard gate (14 B under). Two tests fail on that gate on purpose.
8. **Test debt** — the focused suite carries a known stale failure-name set. A
   *new* failure name is a regression signal; an old one is not.

---

## 2. Memory map, measured

All addresses and sizes in this section are **MEASURED** at this HEAD from the
four link maps and `build/manifest.json`. Where an existing document states a
figure differently, the row is flagged and §8 gives the detail.

### 2.1 Linked segments — every segment, its real neighbour, its real free tail

"Free tail" is the gap to the **first real neighbour**, never the ld65
reservation. This distinction is the one that caused the runtime crash: the
`ENTITY_CODE` asserts measured against `ENTITY_CODE_RESERVED_BYTES = $F00`
(a `$9FFF` ceiling) while the first real neighbour is `DIRECTOR_C_PRE` at
`$9D5E` — 675 B of phantom headroom that the asserts could not see.

| Segment | Range | Size | Next occupied | Real free before it |
| --- | --- | ---: | --- | ---: |
| `ZEROPAGE` | `$0080-$009F` | 32 | `$0100` stack | — (ZP page boundary) |
| `CODE` | `$2000-$3174` | 4,469 | `$3175` RODATA | 0 |
| `RODATA` | `$3175-$3FF6` | 3,714 | `$4000` (file image) / PMG pages at runtime | **0** — its tail `$382A-$3FD8` is the boot-only packed loader bitmap, and `$3B00-$3FFF` becomes the active PMG DMA pages after the loader. Not capacity. |
| `BOOT_STAGE2` | `$21C1-$26AF` | 1,263 | — | boot-only overlay; replaced by the resident suffix before runtime |
| `GLUE` | `$4EFE-$4FF7` | 250 | `$4FF8` frame counter | 0 |
| `PROJECTILES` (BSS) | `$5400-$5489` | 138 | `$54E4` STARFIELD | **90** (`$548A-$54E3`) |
| `STARFIELD` | `$54E4-$5D93` | 2,224 | `$5E06` BOOST HUD backing | **114** (`$5D94-$5E05`) |
| `BROADSIDE` | `$5E10-$780C` | 6,653 | `$7810` pause-screen backup | **3** (`$780D-$780F`) |
| `HYBRID_ASM_ARENA` | `$7BD0-$7C16` | 71 | `$7C17` | 0 |
| `HYBRID_C_ARENA` | `$7C17-$7E11` | 507 | `$7E12` | 0 |
| `HYBRID_C_ARENA_RODATA` | `$7E12-$7E38` | 39 | `$7F10` A2 display list A | **215** (`$7E39-$7F0F`) |
| *(A2 display lists A+B)* | `$7F10-$7FC3` | 180 | `$8000` | **60** (`$7FC4-$7FFF`) |
| `ENTITY_STATE` (BSS) | `$8000-$80FF` | 256 | `$8100` | 0 |
| `HYBRID_LIGHT_STATE` (BSS) | `$8100-$810F` | 16 | `$8110` | 0 |
| `HYBRID_C_STATE` (BSS) | `$8110-$8118` | 9 | `$8119` | 0 |
| `HYBRID_ENCOUNTER_STATE` (BSS) | `$8119-$811A` | 2 | `$811B` | 0 |
| `HYBRID_HEAVY_STATE` (BSS) | `$811B-$8125` | 11 | `$8140` gameplay ring | **26** (`$8126-$813F`) |
| *(gameplay ring + row tables + publication/prepared-row state)* | `$8140-$85E5` | 1,190 | `$85FE` near-star state | **24** (`$85E6-$85FD`) |
| `HYBRID_C_SECTOR` | `$8602-$86F1` | 240 | `$86FA` `DIRECTOR_C_BSS` | **8** (`$86F2-$86F9`) |
| `DIRECTOR_C_BSS` (BSS) | `$86FA-$8700` | 7 | `$8701` | 0 |
| `DIRECTOR_ABI` | `$8701-$8775` | 117 | `$8776` `PICKUP_CODE_RAM` | **0** |
| `LIGHT_RESIDENT` | `$8776-$885A` | 229 | `$885B` | 0 |
| `PICKUP_CODE` | `$885B-$8B5F` | 773 | `$8B67` `COLLISION` | **7** (stream fill) |
| `COLLISION` | `$8B67-$8B87` | 33 | `$8B88` | 0 |
| `DIRECTOR_C_LOW` | `$8B88-$8C79` | 242 | `$8C7D` `HYBRID_C_EXT_RAM` | **3** (`$8C7A-$8C7C`) |
| `ENEMY_ARCHETYPE_DATA` | `$8C7D-$8CAE` | **50** | `$8CAF` | 0 |
| `HYBRID_C_EXT` | `$8CAF-$8EE1` | **563** | `$8EE2` | 0 |
| `LIGHT_CODE` | `$8EE2-$8FAC` | 203 | `$8FAD` | 0 |
| `HEAVY_CODE` | `$8FAD-$8FEC` | **64** | `$9000` `A2_KERNEL` | **19** (`$8FED-$8FFF`) |
| `A2_KERNEL` | `$9000-$90EC` | 237 | `$9100` | **19** (`$90ED-$90FF`) |
| `ENTITY_CODE` | `$9100-$9D5C` | **3,165** | `$9D5E` `DIRECTOR_C_PRE` | **1** (`$9D5D`) |
| `DIRECTOR_C_PRE` | `$9D5E-$9D72` | 21 | `$9D75` `LEVEL1_DATA` | **2** (`$9D73-$9D74`) |
| `LEVEL1_DATA` | `$9D75-$9E12` | 158 | `$9E13` | 0 |
| `DIRECTOR_C_CODE` | `$9E13-$9FF7` | 485 | `$9FFA` Director guard | **2** (`$9FF8-$9FF9`) |
| *(Director guard — not capacity)* | `$9FFA-$9FFF` | 6 | `$A000` | 0 |

`ENTITY_CODE` tail detail, MEASURED: Light art tables `light_glyph` /
`light_interceptor_glyph` `$9D2B-$9D4A` (32 B), `player_dying_tick`
`$9D4B-$9D5C` (18 B), free `$9D5D` (**1 B**).

### 2.2 Real free RAM below `$A000`

MEASURED total of the gaps above: **593 B**, in fifteen fragments, the largest
being the arena's 215 B and the starfield reservation's 114 B. Plus **6 B** at
`$4FFA-$4FFF` in the fixed low block. Nothing in that list is a contiguous
block big enough for the ~350-450 B code/data deficit that
[design-4.6-data-architecture.md](design-4.6-data-architecture.md) §7.3
projects for 4.6 (ESTIMATE), except the arena tail — which is where 4.6's code
would have to live and which §7.3 already spends.

**Do not sum these fragments as if they were one budget.** They are in
different segments with different link units, different transport records and
different neighbours. Per project memory: physical bytes, reserved envelopes
and reusable free capacity are three separate metrics and must be reported
separately.

### 2.3 Residency metrics, kept separate

MEASURED at this HEAD from `build/manifest.json`:

| Metric | Value | Where |
| --- | ---: | --- |
| Linked runtime (`CODE + STARFIELD + BROADSIDE + A2_KERNEL + ENTITY_CODE + PICKUP_CODE`) | **17,521 B** | `encounterDirector.linkedRuntimeBytes` |
| Simultaneous feature residency | **20,131 B** | `encounterDirector.simultaneousResidencyBytes` |
| Safe residency remaining | **2,056 B** | `encounterDirector.safeResidencyBytes` |
| Remaining safe residency (transport view) | **3,653 B** | `transportCapacity.remainingSafeResidencyBytes` |
| Maximum new simultaneous residency | **7,993 B** | `transportCapacity.maximumNewSimultaneousResidencyBytes` |

> The manifest's own `runtimeCodeBudget.measurement` string names five
> segments; the value 17,521 is the sum of **six** — `PICKUP_CODE` is included
> and unnamed. MEASURED: 4,469 + 2,224 + 6,653 + 237 + 3,165 + 773 = 17,521.
> The label is wrong, the number is right.

### 2.4 Transport and disk

MEASURED at this HEAD (`transportCapacity`):

| Quantity | Value |
| --- | ---: |
| Initial boot block | 13,312 B, **104** sectors (13,178 content + 134 envelope) |
| Extension | 10,112 B, 79 sectors |
| Total transport | 23,424 B, **183** sectors |
| DFMC records / manifest | 8 records, 142 B, `MAX_CHUNKS` 8 |
| Remaining free ATR sectors | **537** (68,736 B) |

### 2.5 The window at `$A000-$BFFF`

**MEASURED: the game occupies 0 bytes of it.** No segment in any of
`cfg/atari-boot.cfg`, `cfg/encounter-director.cfg`,
`cfg/integration-glue.cfg`, `cfg/capital-player-collision.cfg` or
`cfg/encounter-director-asm.cfg` loads or runs above `$9FFF`; the ATR chunk
staging buffer is `$8100`. The highest runtime address any link map reaches is
the 6-byte Director guard at `$9FFA-$9FFF`.

**Owner decision A changed what the window *is*.** Before it, whether
`$A000-$BFFF` held RAM or the BASIC ROM depended on how the player started the
machine. Since `disable_basic_rom` runs at each medium's stage-2 entry — before
every write either medium makes — the window is **unconditionally 8,192 B of
RAM for the whole runtime**: still unused, but now *reliably* unused rather
than avoided because its contents were unknowable. That is the technical
precondition for decision B.

**What the OS occupies above `$BC20` — NOT MEASURED, and it must be.**
The owner states that the OS's default GRAPHICS 0 screen — its display list
around `$BC20` and its screen RAM to `$BFFF`, roughly 992 B — sits at the top
of this window after coldstart on a 64 KB XL/XE with no cartridge enabled.
**ESTIMATE.** Nothing in this repository measures it: no document records it,
no gate reads it, and the game takes the display over completely, so it has
never mattered.

It starts mattering the moment the window carries level data, because the OS
VBI is alive during SIO (§6.2) and restores `DMACTL`, the display-list pointer,
colours, `CHBASE` and `PMBASE` from its shadows. If `SDLSTL`/`SDLSTH` still
point into `$BCxx`, a between-levels read would put the OS's own screen back on
the display — and level bytes stored there would be *shown*, not merely at
risk.

**The measurement is cheap and already half-built.** The boot smoke's observer
(`scripts/atari800-wall-trace.h`) already snapshots the display list, `CHBASE`,
`PMBASE`, `DMACTL` and `NMIEN` at fixed frames. Recording `SDLSTL`/`SDLSTH`,
`MEMTOP` and `RAMTOP` at the frame-1 snapshot would settle the exact top-of-
window extent in one boot-smoke run. **Do this before any work places bytes
above `$B800`.**

### 2.6 Above the window

`$C000-$FFFF` (16,384 B) is OS ROM and hardware I/O. Not gameplay RAM. No
current code, state, charset, loader data or staging buffer uses `$A000-$BFFF`
or reaches above it.

---

## 3. The resident / per-level split

### 3.1 The owner's target shape, recorded as the target shape

> "The game has a common part — loader, menu, the player and his weapons — in
> resident, unchanging memory. We disable BASIC and reuse that area too. Levels
> consist of sectors which contain the data and the code for the kinds of
> enemies. A level is loaded into a reusable, overwritable area of memory, so
> each level can contain different sectors with different code and different
> data."

That is the **TARGET SHAPE**. It is recorded here as the destination, not as a
description of the build.

### 3.2 Where the agreed path differs, stated plainly

**The agreed path differs in exactly one respect: code containers are not built
now (owner decision C).**

With the window open, every variant handler fits resident with no swapping, so
**the loader carries DATA per level, not code**. The difference is not
architectural disagreement; it is sequencing. Everything else in the target
shape — the resident common part, reusing the BASIC area, levels made of
sectors, a reusable overwritable area — is the agreed path.

**The seam for code swapping is prepared inside 4.6**, so that swapping becomes
a bounded task if variant code ever outgrows the window:

1. the four behaviour entries become a **fixed jump table**, not four direct
   calls, so the target of a behaviour can change without changing its caller;
2. art is selected **by slot**, not by a hard-coded compare against an
   archetype constant, so a slot's art can come from whatever is currently
   loaded;
3. the **pre-capital drain is named as a boundary predicate**, so there is one
   named place that answers "is it safe to replace the enemy set right now?".

None of the three costs anything on its own and all three are inside 4.6's
scope anyway.

### 3.3 Why not now: the gate set is blind to the container failure family

This is the reason, and it is a measurement fact, not a preference.

- **No gate watches a code region for writes or for execution.** The one native
  write-watch that exists, `scripts/capacity-window-watch.mjs` with
  `scripts/atari800-capacity-watch.h`, proves the opposite invariant: that a
  region receives **no** writes for a whole lifecycle. MEASURED: it is
  referenced by nothing outside its own two files — not by `package.json`, not
  by `scripts/build.mjs`, not by any test, not by the wall trace. It is a
  manually invoked proof tool, not a gate. A code container is *supposed* to be
  overwritten; the invariant it needs is "overwritten only by the loader, only
  at a boundary", which no tool expresses.
- **No gate checks that per-slot state belongs to the current archetype's
  domain.** Today `light_archetype_offset` and `heavy_archetype_offset` index a
  resident table that never changes, so a stale index cannot be wrong. Swap the
  table and a slot surviving a boundary indexes the previous level's records —
  and nothing anywhere asserts otherwise.
- **No session crosses a sector or level boundary.** MEASURED: the game has one
  level. `LEVEL1_DATA` is 158 B, `levelWorldRows` is 3,712, and there is no
  next-level transition in the runtime — `BOSS_HANDOFF` closes admissions,
  drains, and emits exactly one `LEVEL COMPLETE`. The 64-session default
  wall-trace set and the mode-gated sessions contain no replay that could cross
  a boundary, because no boundary exists to cross.

**The three native invariants a container build would need first:**

1. **Container write ownership.** Over the container's address range, for the
   whole lifecycle: every write originates from the loader, every write lands
   inside a declared boundary window, and the container's bytes are
   byte-identical to the declared image between boundaries. This is the
   existing write-watch inverted and given a boundary concept.
2. **Execution domain.** No instruction fetch inside a container range that
   does not belong to the image currently declared resident there — asserted on
   every emulated instruction, not sampled. This is the invariant that catches
   a jump through a stale vector into a half-overwritten handler, which is the
   failure that kills a container build silently.
3. **Per-slot archetype domain.** On every traced frame, every live slot's
   archetype index, art pointer and behaviour entry resolve inside the
   currently resident archetype domain; a slot that survives a boundary either
   retires or is re-bound, never carries an index across. This is the
   state-domain half of the same family, and it is the one that produces
   plausible-looking wrong behaviour rather than a crash.

**Prerequisite to all three: a replay that crosses a boundary.** None exists.
Building one is a precondition for the container work, not part of it.

### 3.4 What is common and unchanging — bytes, MEASURED

Segment sizes are exact. The mapping of a segment to a functional group is
**ESTIMATE** wherever a segment mixes groups — `CODE`, `RODATA` and
`ENTITY_CODE` each carry loader, frontend and gameplay code together, and no
linker symbol separates them. Rows that mix are marked.

| Group | Segments | Bytes | Note |
| --- | --- | ---: | --- |
| Resident ASM core: boot handoff, frontend/menu, player, weapons, gameplay kernels | `CODE` 4,469 + `RODATA` 3,714 | **8,183** | MIXED — includes boot-only RODATA (`loader_bitmap_lzss` `$382A-$3FD8`) consumed before runtime |
| Capital traversal / BROADSIDE runtime | `BROADSIDE` | **6,653** | |
| Entity, effect, booster, projectile, PMG pickup and H3.1 frontend runtime | `ENTITY_CODE` | **3,165** | MIXED |
| Starfield runtime | `STARFIELD` | **2,224** | |
| Pickup / collision stream | `LIGHT_RESIDENT` 229 + `PICKUP_CODE` 773 + `COLLISION` 33 | **1,035** | |
| Light and Heavy late-publication kernels | `LIGHT_CODE` 203 + `HEAVY_CODE` 64 | **267** | |
| A2 ring/display kernel | `A2_KERNEL` | **237** | |
| Integration glue | `GLUE` | **250** | |
| Zero page + projectile/entity BSS | `ZEROPAGE` 32 + `PROJECTILES` 138 + `ENTITY_STATE` 256 | **426** | |
| **Resident ASM subtotal** | | **22,440** | |
| C Director / lifecycle **code and data** | `HYBRID_ASM_ARENA` 71 + `HYBRID_C_ARENA` 507 + `HYBRID_C_ARENA_RODATA` 39 + `HYBRID_C_SECTOR` 240 + `DIRECTOR_ABI` 117 + `DIRECTOR_C_LOW` 242 + `ENEMY_ARCHETYPE_DATA` 50 + `HYBRID_C_EXT` 563 + `DIRECTOR_C_PRE` 21 + `DIRECTOR_C_CODE` 485 | **2,335** | |
| C-owned BSS | `HYBRID_LIGHT_STATE` 16 + `HYBRID_C_STATE` 9 + `HYBRID_ENCOUNTER_STATE` 2 + `HYBRID_HEAVY_STATE` 11 + `DIRECTOR_C_BSS` 7 | **45** | |
| **Total resident (excl. `BOOT_STAGE2`)** | | **24,978** | |

Plus the fixed low block `$3800-$53FF` (display memory, PMG DMA pages,
charsets, hull maps and persistent runtime state) which is documented in
[memory-map.md](memory-map.md) §"Post-loader low and display memory" and is not
a linker segment. And `BOOT_STAGE2` (1,263 B), which is boot-only and is
replaced by the resident suffix before runtime.

### 3.5 What lives in the window today, and what the window could hold

**Today: nothing. 8,192 B, MEASURED, zero bytes used.**

Under decision B the window becomes the reusable, overwritable area of the
owner's model. **ESTIMATE, pending §2.5's measurement:** usable extent is
`$A000` up to wherever the OS screen begins — the whole 8,192 B if the game's
takeover makes the OS screen area reclaimable, or roughly 7,200 B
(`$A000-$BC1F`) if it does not. **Do not plan against 8,192 B until §2.5 is
measured.**

### 3.6 What arrives per level

Per owner decision C: **DATA only, no code.** The per-level payload is, in
order of cost:

| Item | Bytes | Label | Source |
| --- | ---: | --- | --- |
| Capital hull art, one fresh variant | **1,253** | MEASURED | `capitalHulls.glyphBytes` 248 + `capitalHulls.packedMapAndMetadataBytes` 1,005 |
| `LevelDef` core page | 256 | ESTIMATE | design-4.6 §1.1 |
| `LevelDef` optional payload page | 256 | ESTIMATE | design-4.6 §1.1 |
| `SectorDef` set, ≤ 10 × 8 B | ≤ 80 | ESTIMATE | design-4.6 §1.2 |
| `WaveDef` set, ≤ 20 × 8 B | ≤ 160 | ESTIMATE | design-4.6 §1.3 |
| `PathDef` references (library is resident) | 0 | ESTIMATE | design-4.6 §1.4 |

The capital hull variant is the item that decides the shape of the whole plan:
**it is an order of magnitude larger than everything else per level put
together, it is different on every level by the content target (§5.1), and 8 of
them is ~10 KB** — which does not fit the window alongside anything else and
never fits resident. That is why the between-levels sector reader is **in
scope, not optional**.

**Disk budget, MEASURED:** 537 free ATR sectors = 68,736 B. Eight hull variants
at 1,253 B ≈ 80 sectors. The disk is not the constraint.

---

## 4. Roadmap, in order, with dependencies

This ordering **extends** owner decision 21's ordering rather than replacing
it: items 4.4-4.9 below are decision 21's items 1-7 with Option D removed
(accepted) and the three new items inserted ahead of them. Where it differs
from `plan-realizacji.md` §4, §8 says so.

| # | Item | Decision | Depends on | Blocks |
| --- | --- | --- | --- | --- |
| 4.1 | **ATR boot fix** | A | — | everything on real hardware; B |
| 4.2 | **Open the window** | B | A (the unmap is what makes it RAM) | 4.3, 4.6 placement |
| 4.3 | **Between-levels sector reader** | B, 23 §10.1 | 4.2, and a loader-mode display state | per-level hull art, the campaign |
| 4.4 | **Population budget measurement** | 21 §2 | — | 4.5 wave design |
| 4.5 | **4.6 data-driven Encounter / Wave Director**, with the window open | 21 §21.1-21.3, 23, C | 4.2, 4.4 | 4.6, 4.7, 4.8 |
| 4.6 | **Player weapon boosters** | 21 §4 | 4.5 | — |
| 4.7 | **4.7 Boss** (data-driven) | 21 §5, 7 | 4.5 | the campaign |
| 4.8 | **4.8a Capital geometry** | 21 §6 | 4.5 | per-level hull variety |
| 4.9 | **The campaign** — level complete, next level, eight levels as data | 21 §7, content target §5.1 | 4.3, 4.7, 4.8 | — |

### 4.1 ATR boot fix (owner decision A) — `OWNER-SMOKE CANDIDATE`
Implemented at this HEAD. Needs owner smoke **and** the SIO2SD checks in §7.2.
Everything downstream that touches the boot path waits on it, because decision
B's guarantee that the window is RAM is literally the code this item adds.

### 4.2 Opening the window (owner decision B)
Technically already done by decision A — `disable_basic_rom` makes
`$A000-$BFFF` unconditionally RAM. What remains is *using* it: declaring a
memory area, a segment and a transport record, plus the §2.5 measurement of
what the OS holds at the top. **This supersedes design-4.6 §10.1's framing,
where opening the window was variant A and was rejected; see §5 and §8.**

### 4.3 Between-levels sector reader
A resident `SIOV` reader (~80-120 B, ESTIMATE, design-4.6 §10.1 B) plus a
loader-mode display state, plus the loader screen of §6. **Supersedes
ADR-004.** Needs hardware validation on real SIO2SD; decision D defers that
measurement, so the reader lands with an explicitly unmeasured per-sector rate
on hardware — which is exactly what §6 designs around.

### 4.4 Population budget measurement (decision 21 item 2)
Three numbers that gate 4.6 wave design: (a) Lights simultaneous with live
debris and a pickup capsule; (b) Heavy + debris + capsule; (c) what debris
alone costs as object count rises. The same task answers whether
player-vs-capital-hull collision reads the character map or assumes a fixed
corridor, whether the starfield colour can change per sector and what else uses
that register, and whether `generate_starfield_row` can conditionally thicken
the field and at what per-row cost. The rescued `scripts/measure-*` tooling is
the starting point.

### 4.5 4.6 with the window open
`LevelDef -> SectorDef(+subtype) -> WaveDef -> Encounter Director -> admission
-> EnemyArchetype`. SECTOR SUBTYPES (`SPACE`{`SWARM`,`ELITE`}, `CAPITAL`,
`BOSS`; Heavy and swarm never coexist; admission ENFORCES the ceiling).
PATH-DRIVEN WAVES (`archetype`, `path`, `count`, `spacing`, `entry`).
STARFIELD PER SECTOR (conditional thickening inside `generate_starfield_row`
plus a per-sector star colour; no new objects, no second scroll layer).
**With the window open, the ~350-450 B placement deficit of design-4.6 §7.3
stops being a blocker.** This is the item that carries the three seam
preparations of §3.2.

### 4.6 Player weapon boosters
`weapon_class` exists, pickup capsules have a full lifecycle, and 12 hostile
projectile glyphs are free. Cost lands in the player projectile slots
(`handle_collisions`, MEASURED 4,407 cycles worst case in the manifest's
DMA-off procedure table), so prefer boosters that do **not** multiply shots in
flight — faster rate, stronger shot, piercing — over spread, which must be
costed separately.

### 4.7 4.7 Boss
Designed **data-driven** — phases, movement pattern, fire pattern, HP and weak
points as data — so that later bosses are records, not implementations. This is
a decision to make when *planning* 4.7, not after it. One boss foundation
first: modules, one gun, a victory condition. Nova Missile is designed together
with boss lifecycle and boss HULL, never as an ordinary drop.

### 4.8 4.8a Capital geometry
Deeper, uneven gondolas at varying heights, variable corridor width, bigger
debris; River Raid-style spatial flying. **Data plus a collision check, not a
new subsystem.** This is also where hull variants stop being parameters and
become the per-level art of §3.6.

### 4.9 The campaign
Level complete, next level, eight levels as data, polish.

---

## 5. Decisions, consolidated

Every owner decision still in force. Superseded entries are marked with what
superseded them. Sources: [owner-decisions-2026-09-11.md](owner-decisions-2026-09-11.md)
(numbered 1-23), [decisions/](decisions/) (ADR-001…004), STATUS
(the lettered 2026-09-20 decisions and the four of 2026-09-19), and the owner's
own statement in this session for B, C and D.

### 5.1 Numbered decisions

| # | Decision | Status | Consequence |
| --- | --- | --- | --- |
| 1 | Optimisation goal | ACTIVE | CPU work serves playability, not elegance. |
| 2.0 | Starfield master decision (2026-09-14) | ACTIVE / ACCEPTED | White four-point field, one scanline per frame. |
| 2.1 | Row-baked far stars | **SUPERSEDED** by 2.0 | Retired; the far-pattern phase byte is dead state. |
| 2.2 | Starfield: only two layers | **SUPERSEDED** by 2.0 | — |
| 2.3 | Player PairedProjectile | ACCEPTED, implemented | One lifecycle, one collision, one cell, two pulses. |
| 2.4 | Enemy PairedProjectile | ACCEPTED, implemented | Raider, Interceptor, Bomber all use it. |
| 2.5 | Effects 25 Hz / staggered | ACTIVE, implemented | — |
| 2.6 | Background/ring visual publish 25 Hz | **REJECTED** | Do not revisit without new evidence. |
| 2.7 | Debris 25 Hz / staggered | ACTIVE direction; 2026-09-14 proof REJECTED | Not implemented. |
| 3 | Optimisation proof priority | **SUPERSEDED** by decision 21 | Order lives in `plan-realizacji.md` §4. |
| 4 | Capital traversal direction | ACTIVE, planned | Hull, capital-gun shells, gun batteries, telegraph, destroyable turrets. |
| 5 | Gondolas / protruding hull geometry | ACCEPTED, planned | Becomes roadmap 4.8a. |
| 6 | Capital traversal sector rhythm | ACTIVE, planned | — |
| 7 | Reuse capital → boss | ACCEPTED, planned | The boss is a composition of capital modules with its own scheduler and budget. |
| 8 | Design principle | ACTIVE | — |
| 9 | Raider flying breakup fragments | ACCEPTED (removed) | — |
| 10 | Raider character destruction effects | ACCEPTED (removed) | — |
| 11 | Booster runtime contract | ACTIVE | — |
| 12 | Pickup PMG visibility — solid fifth-player design | APPROVED DESIGN | No character compositor; capsule silhouettes in `COLPF3`. |
| 13 | Hybrid C Director | ACCEPTED — project foundation | C decides, ASM executes. |
| 14 | Light Wingman M1 + visible PMG capsule | ACCEPTED (2026-09-15) | Smooth 1-line Light tracking (M2) deferred by the owner. |
| 15 | Enemy classes, Light capacity, Interceptor | ACCEPTED (2026-09-16) | `P1`/`P2` are Heavy-only, forever. Light allocates no PMG. |
| 16 | Step 4.3 Stage 1 resident capacity | GO (2026-09-16) | Produced the `$8602-$86F9` window. |
| 17 | Smoke 4.3 Stage 1 + debris late publication | ACCEPTED (2026-09-16) | — |
| 18 | Step 4.4 Interceptor, full pursuit, selectable Light slot | GO (2026-09-16) | Slot is `Wingman OR Interceptor`; no in-lifecycle alternation. |
| 19 | Step 4.4c hostile weapon visuals by `weapon_class` | GO (2026-09-16) | `PULSE`/`LASER`/`BOMBER` glyph pairs. |
| 20 | Step 4.5 Bomber / Heavy Assault | GO (2026-09-17); its ordering **SUPERSEDED** by 21 | "The Bomber is the last MVP archetype." |
| **21** | 4.5d identity freeze, **ROSTER FREEZE**, order after 4.5 | **ACCEPTED (2026-09-18)** | No new enemy archetype without a new owner decision. New content comes from waves, paths, sectors and boosters. The boss is not an archetype. Its §21.1-21.3 bind 4.6. |
| **22** | ATR boot deadline re-based to a 60 s budget | **ACCEPTED (2026-09-18)**, implemented 2026-09-19 | The `190 + 2 × sectors` identity is gone. Ceiling 3,000 frames, hard fail at baseline + 50, warn at baseline + 10. Boot time is no longer a binding constraint; **resident RAM is**. Figures behind it are EMULATOR-MEASURED — see §7.1. |
| **23** | Answers to design-4.6 §10 | **ACCEPTED (2026-09-19)**, §10.1 now **SUPERSEDED by decisions B and C** | §10.1 levels from disk, window rejected → **superseded**: the window IS opened (B) and carries code/data, while the disk carries per-level DATA (C). §10.3 answered by 22. §10.4 piecewise-linear paths. §10.5 column choice at admission, no angled projectiles. §10.6 spacing scales, counts do not, ceilings never. §10.7 SWARM ceiling 3, format allows 4. §10.2 and §10.8 remain **OPEN**. |

### 5.2 The four decisions of 2026-09-19

All four are gate/trace decisions taken while regenerating
`docs/runtime-wall-trace.json`. All four are implemented, in `scripts/` only,
with no production byte changed. They are recorded here because each one
established a standing rule.

| # | Decision | Consequence |
| --- | --- | --- |
| 19-a | The `PRIOR` clause accepts **both** `$00` and `$10` | `$10` is correct: the pickup renderer sets GTIA fifth-player mode on purpose and releases it. No trace column separates the two, so the clause cannot be narrower. |
| 19-b | The two `pickup_draw_calls` clauses are **repointed** to `pickup_pmg_rows` | Root cause: commit `04ae0a6` silently rebound three pickup trace PCs from renderers to PMG routines in one hunk, making `pickup_draw_calls === 0` unsatisfiable by construction for eight days. **Standing rule: a commit that repoints a trace PC must say so in its message and must re-verify every gate that reads that PC.** |
| 19-c | The screenshot clause is **derived, not repinned** | The window is computed from the trace (`left = 2 * (pickup_hposm0 - 64)`, colour resolved from `colpf3` through each screenshot's own PLTE) with the `>= 40` / `< 40` thresholds unchanged. It is deliberately the only gate that measures the framebuffer rather than memory counters, because those two have been measured diverging. |
| 19-d | A session that produces **no CSV** is a **HARD** failure, never an accumulated clause failure | Corrupt or absent data stops the run; a failing clause does not. `run()` and `parseCsv` sit outside the session `try`. Stage 2 must not blur the two. |

### 5.3 The lettered decisions of 2026-09-20

| Letter | Decision | Status | Consequence |
| --- | --- | --- | --- |
| **A** | The ATR must boot without OPTION | Implemented, `OWNER-SMOKE CANDIDATE` | Recorded in the repo (STATUS, architecture.md, memory-map.md, hardware-testing.md). Transport 182 → 183 sectors. `$A000-$BFFF` becomes unconditionally RAM. Unproven on hardware. |
| **B** | Open the window | **Recorded here for the first time** | `$A000-$BFFF` is usable RAM and is used. Supersedes decision 23 §10.1's rejection of variant A and `reguly-projektu.txt` rule 11's "BASIC RAM is not the default answer". The ~350-450 B 4.6 placement deficit stops being a blocker. |
| **C** | Code containers are not built now | **Recorded here for the first time** | With the window open, all variant handlers fit resident with no swapping. The loader carries **DATA per level, not code**. The seam is prepared inside 4.6 (§3.2) so swapping later is bounded. Rationale: the gate set is blind to the container failure family (§3.3). |
| **D** | The hardware measurement is deferred | **Recorded here for the first time** | Every boot-time and per-sector figure in this project stays EMULATOR-MEASURED. §7 is where a future session learns not to spend those numbers as headroom. |

### 5.4 ADRs

| ADR | Status |
| --- | --- |
| ADR-001 portable toolchain | Accepted, in force. |
| ADR-002 gameplay screen | Accepted, in force. |
| ADR-003 loader screen (mixed ANTIC F/E bitmap) | Accepted, in force. The between-levels loader screen of §6 is a **second, different** loader display and does not change ADR-003. |
| ADR-004 one resident gameplay program, no disk I/O between levels | **SUPERSEDED** by decision 23 §10.1 and confirmed by decisions B and C. Its own reconsideration clause is satisfied: the measured report is design-4.6 §7.3 (placement deficit) plus §3.6 here (hull art per level). |

---

## 6. Content target and the loader screen

Both exist only in the owner's conversation and nowhere in the repository until
this document. Recorded as owner requirements, not as agent proposals.

### 6.1 The content target

- **Eight levels.**
- **A different boss on each.**
- **Capital ships that get LONGER on later levels AND look different.** This is
  the requirement that puts fresh hull art on the disk rather than in the
  window: MEASURED, one hull variant is **1,253 B**
  (248 B glyphs + 1,005 B packed map and metadata). Eight of them is roughly
  10 KB. That does not fit the window alongside anything else and never fits
  resident — **which is why the sector reader is in scope rather than
  optional.**
- **At least today's enemy count plus swarms.** Today, MEASURED: four
  archetypes, 2 Heavy on `P1`/`P2` + 1 Light slot. The 4.6 target is
  2 Heavy + up to 4 Light, with SWARM shipping a ceiling of 3 (decision 23
  §10.7).
- **Two or three distinct appearances for swarm enemies.**
- **Two or three wave shapes.**
- **Room left over for improvements.**
- **The owner's standard: someone who knows Atari should finish it and say
  "wow".**

### 6.2 The loader screen — part of the reader, not an extra

When a level is read between levels, a display must exist, because
**the OS VBI rewrites `DMACTL`, the display list, colours, `CHBASE` and
`PMBASE` from its shadows during SIO**. The reader therefore needs a
loader-mode display state whether or not anything is shown in it. Given that it
needs one, it shows this:

- **A randomly chosen line from a pool of 8-16 short ENGLISH texts.**
- **An animation stepped one frame per sector read — not a progress bar.**

**Why an animation and not a bar.** An animation reads well at *any* duration.
That matters because the real per-sector rate on hardware is **unmeasured**
(decision D, §7). A progress bar promises a proportion it cannot keep if the
rate is wrong; an animation promises nothing and still says "alive". And uneven
stepping doubles as a diagnostic: a visibly hesitating animation is a slow
sector on a real drive, visible to the owner without any instrumentation.

**The texts must be resident before the read starts, because nothing can be
read while reading.** ESTIMATE: ~640 B for 16 lines (16 × 40 columns, the full
screen width; shorter lines cost proportionally less). That is a resident cost
of the reader and must be budgeted with it, not after it.

### 6.3 Why certain decisions were made — reasoning the records omit

The records state these as outcomes. The reasoning is the part a future session
needs and the part that was missing.

- **The Bomber moved to hue 8 (`$88`, blue).** Not a palette preference.
  `$24` and `$44` are **the same luminance in adjacent hues**, and at that
  luminance adjacent hues blend on a CRT. Two enemies whose masks were already
  the same family — full-width shoulders, converging V, identical three-row
  spine tail — became indistinguishable in motion. Changing hue *and* keeping
  the luminance identical would have repeated the mistake; hue 8 with an
  HP-driven luminance ramp separates them on both axes.
- **The HP colour ramp was chosen over a fixed colour** because it also
  supplies the **non-lethal Heavy hit feedback that STATUS lists as a gap**. A
  fixed colour would have solved only the identity problem; the ramp solves
  identity and feedback with the same bytes, uses existing state (`ENEMY_HP_n`)
  and needs no new per-slot state and no ASM change. MEASURED cost: +8 cycles
  in `update_enemy`.
- **The catamaran silhouette was chosen over a barge and a hammer** because at
  the Bomber's roughly **3:1 aspect, any shape converging downward reads as a
  wing** — which was the original complaint, that the Bomber read as a bigger
  Raider. A barge and a hammer both converge. A catamaran — two hulls joined by
  a bridge, twin prongs instead of a single spine — does not converge at all,
  so it cannot read as a wing at any aspect. MEASURED gates it passes:
  `connectedComponents` 1, Hamming distance to the Raider 44 and to the Talon
  76, `occupiedArea` 72 against a 66 floor.

### 6.4 The working method

Recorded so a future session inherits it rather than rediscovering it.

- **One task per fresh session.**
- **Planning on the strongest model, bounded implementation on a medium one.**
- **Repo facts override the plan.** The plan is a hypothesis; the build output
  is evidence.
- **STOP rather than improvise.** A blocker is a result, not a failure.
- **A test that does not fail on the unfixed build proves nothing.** Every gate
  change ships with its negative control. (Decision A's negative control: the
  pre-fix source rebuilt against the new eight-session gate fails exactly
  `atr-a5-basic`.)
- **A commit that changes a segment's size states the resulting free tail** —
  in the commit message and in the memory map.
- **A commit that repoints a trace PC says so and re-verifies the gates that
  read it.**

**What this method caught, this week:** four stale gate pins; one incomplete
ownership model (trace term 4e's fourth writer); two CSV columns silently
parsed as strings; one segment assert guarding 675 bytes of somebody else's
memory; and one real defect the gates were right about.

---

## 7. What is EMULATOR-MEASURED only, and therefore provisional

**Decision D defers the hardware measurement.** This section exists so that a
future session does not spend these numbers as headroom. Everything here was
measured in Atari800 7.1.2 PAL/XL and **nowhere else**.

### 7.1 The boot-time figures behind decision 22

| Figure | Value | Status |
| --- | ---: | --- |
| ATR menu at the accepted checkpoint | 554 frames = 11.08 s | EMULATOR-MEASURED |
| XEX menu at the accepted checkpoint | 392 frames | EMULATOR-MEASURED |
| Streaming cost | 2 PAL frames per occupied 128 B sector | EMULATOR-MEASURED, **and see the anomaly below** |
| Headroom to the 60 s ceiling | 2,446 frames = 1,223 sectors ≈ 153 KB | DERIVED from the above |
| Full-disk menu arrival | ~1,630 frames ≈ 32.6 s | DERIVED |

**The "exactly +2 frames per sector" rule already has a measured exception.**
Decision A grew the transport from 182 to **183** sectors and the ATR menu
frame **did not move** — still 554 on both BASIC-off sessions. The rule is
frame-quantised, not linear, and it was calibrated over a 177→182 range on one
emulator. Treat it as an approximation with ±1 sector of slop, not an identity.

**Why none of it is hardware headroom.** SIO timing on a real 65XE through
SIO2SD depends on the device, the cable, the drive emulation's sector gap and
the OS's own SIO retry behaviour — none of which Atari800 models as the
hardware does. The 2,446-frame headroom is the emulator's opinion of a budget
the owner set in seconds. **It may be generous or it may be optimistic; it has
never been checked.** The between-levels reader (§4.3) is the first thing that
will depend on it directly, and its per-sector rate on hardware is precisely
the number that is unmeasured — which is why §6.2 designs a loader display that
does not care.

### 7.2 The ATR boot contract (decision A)

The whole of decision A is EMULATOR-MEASURED. The SIO2SD checks that would
promote it, none of which have been run:

1. the ATR boots to the main menu with **BASIC enabled and nothing held**;
2. the ATR still boots with **OPTION held**;
3. the XEX still runs in both cases;
4. **RESET during gameplay does not bring the BASIC ROM back** — this is what
   the `BASICF` write is for, and it is the part an emulator proves least well;
5. load time is unchanged in practice.

Until 1-4 pass on hardware, the ATR boot contract is proven in Atari800 only —
and with it, so is the guarantee that `$A000-$BFFF` is RAM, on which decision B
and every plan in §3 and §4 rests.

### 7.3 Everything else in this category

- **All PAL timing.** Worst fence margin 1,464 cycles, 0 distinct miss events
  across 69 (and 72 on the decision A build) audited replays, ~137,000 traced
  frames, the native stale-body gate's 0 stale rows across 134,880 frames.
  All Atari800. The NMOS-6502 harness figures (`scripts/measure-*`) are a
  second *software* model, not hardware.
- **The DMA-off procedure cost table** in `build/manifest.json`
  (`runtimeTiming.cpuDmaOff`), and the `estimatedAdditive.cycles` figure of
  27,926, which the manifest itself labels "diagnostic estimate only; not a
  measured PAL frame or physical headroom".
- **The OS's occupation of the top of the window** (§2.5) — not even
  emulator-measured; ESTIMATE only.

---

## 8. Disagreements found

Every place a document contradicts another document or the repo. The measured
value is given; nothing is silently picked.

### 8.1 memory-map.md — stale segment rows

The "Linked segments" table (memory-map.md §"Linked segments") is explicitly a
`41ace65` snapshot and the "BSS and high relocated runtime" table repeats it.
Both are wrong at this HEAD in ways that matter:

| Row as written | Measured at HEAD |
| --- | --- |
| `$8C7D-$8C94` 24 B `EnemyArchetype` table, "Raider + Light Wingman records" | `$8C7D-$8CAE` **50 B**, four records + a 2 B schedule table |
| `$8C95-$8F69` 725 B C sector/lifecycle/Light | `HYBRID_C_EXT` `$8CAF-$8EE1` **563 B** |
| `$8F6A-$8FEE` 133 B `LIGHT_CODE` | `LIGHT_CODE` `$8EE2-$8FAC` **203 B**, plus `HEAVY_CODE` `$8FAD-$8FEC` **64 B** (absent from the table entirely) |
| `$8FEF-$8FFF` 17 B free extension tail | `$8FED-$8FFF` **19 B** |
| `$9100-$9D51` 3,154 B ENTITY_CODE; `$9D52-$9D5D` 12 B free | `$9100-$9D5C` **3,165 B**; **1 B** free (`$9D5D`) |
| `$9D73-$9D74` 2 B "free ENTITY_CODE reservation tail" | 2 B, but it is the gap between `DIRECTOR_C_PRE` and `LEVEL1_DATA`, not an ENTITY_CODE tail |
| `$8100-$810B` 12 B Light record; `$810C-$810F` 4 B unowned | `HYBRID_LIGHT_STATE` is **`$8100-$810F`, 16 B**; nothing is unowned there |
| `$8119-$813F` 39 B unowned | `HYBRID_ENCOUNTER_STATE` `$8119-$811A` and `HYBRID_HEAVY_STATE` `$811B-$8125` occupy 13 B of it; real free is **`$8126-$813F`, 26 B** |
| `$5CF7-$5E05` 271 B free starfield tail | `STARFIELD` now ends `$5D93`; real free is **`$5D94-$5E05`, 114 B** |
| `$7F05-$7F0F` 11 B "unassigned after cold staging" | Inside the arena's 215 B free tail `$7E39-$7F0F`. **Double-counted** if both rows are summed. |
| `$8600-$8601` near-star state (BSS table) vs `$85FE-$8601` 4 B `STAR_NEAR_SCREEN_HI` (accepted-placement section) | The two sections of the same file disagree by 2 B. Not resolvable from the maps (the near-star bytes are hand-placed BSS, not a linker segment). **Unresolved — needs a source read or an owner answer.** |

The file's own "Segment free tails at the current checkpoint" section **is**
correct at this HEAD and matches the measurement exactly. The stale rows are in
the older sections above it, which the file says are overridden — but which a
reader hits first.

### 8.2 The 45 B → 1 B `ENTITY_CODE` tail

memory-map.md §"Accepted placement since `41ace65`" states
"`$9D31-$9D5D` 45 B free" and §4.4b states "ENTITY_CODE free tail 45 → 13 B".
The measured tail at this HEAD is **1 B**. Both are historical rows that were
correct when written; neither is marked as superseded at the point of reading.
**This is the pair that cost the work.**

### 8.3 STATUS.md — internal contradiction about the outstanding candidate

`docs/STATUS.md` §"Current task" opens with "Owner decision A … is an
`OWNER-SMOKE CANDIDATE`" and closes the same paragraph with "**No
`OWNER-SMOKE CANDIDATE` is outstanding.**" The second sentence is a leftover
from before decision A. **Measured/correct: exactly one candidate is
outstanding — decision A.**

### 8.4 STATUS.md — residency figures 3 B stale

STATUS's "CPU / RAM baseline" table gives simultaneous residency **20,128 B**
and safe residency remaining **2,059 B**, under a note saying the byte columns
are re-measured at HEAD. MEASURED at this HEAD: **20,131 B** and **2,056 B**
(`build/manifest.json`, `encounterDirector.*`). The table also gives linked
runtime 17,521 B, which **is** correct.

### 8.5 `plan-realizacji.md` §7 and `reguly-projektu.txt` §11-12 vs decisions 23, B and C

Both documents list, as *rejected directions not to revisit*:

> "BASIC RAM, loader changes i runtime disk I/O jako obejście"

Owner decision 23 §10.1 (2026-09-19) adopted **runtime disk I/O** between
levels. Owner decisions B and C (2026-09-20) adopt **BASIC RAM** and a
**loader change**. All three rejected directions are now the agreed path.

**This is not a contradiction to resolve silently — it is the largest
divergence in the document set.** The rule text was written when those were
placement shortcuts proposed instead of doing the engineering. They are now
owner decisions taken with the engineering done. `plan-realizacji.md` §7 and
`reguly-projektu.txt` §11-12 need an owner-approved edit; this document does
not have the standing to make it.

### 8.6 `plan-realizacji.md` §4 item 7 and decision 21 item 7 vs the content target

Both say **"kampania 16 poziomów jako dane"** — a 16-level campaign. The
owner's content target (§6.1) is **eight levels**. design-4.6 §6 is also built
on eight. **Measured/authoritative: eight.** The "16" appears to be an older
figure that survived into decision 21's text.

### 8.7 `plan-realizacji.md` §3 and §4.5c — superseded per-candidate figures

§3 states the accepted checkpoint as `0a90c1c` with "najgorszy margines fence
450 cykli, arena 617/832 B". §4.5c states "arena 392/832 B … 440 B wolne",
"ogon `HYBRID_C_EXT` 28 B", "180 sektorów transportu, menu ATR 550 przy
terminie 550". MEASURED at this HEAD: accepted checkpoint **`0002d84`**, worst
fence margin **1,464**, arena **617/832 B with 215 B free**, `HYBRID_C_EXT`
composite tail **19 B**, transport **183 sectors**. The 550/550 deadline
figures are from the superseded formula (decision 22) and state a limit that no
longer exists.

### 8.8 `game-design.md` — Interceptor section contradicts its own heading

The heading reads "**OWNER-ACCEPTED** (roadmap 4.4)"; the first paragraph under
it reads "It is implemented and awaits owner smoke; the values below are the
candidate's, not yet accepted." **Correct: owner-accepted**, owner smoke PASS
2026-09-18 under `0a90c1c`.

### 8.9 design-4.6-data-architecture.md §7.4 and §10.1

- **§7.4 is void as a risk**, per decision 22 — STATUS already says so, the
  design file still states the risk in its own voice.
- **§10.1's answer is now superseded twice.** Decision 23 chose variant B and
  rejected variant A (the window). Decisions B and C take **both**: the window
  is opened *and* the disk carries per-level data. The design file's variants
  A/B/C no longer describe the choice that was made.
- **§7.4's "538 free sectors"** — MEASURED at this HEAD: **537**
  (`transportCapacity.remainingAtrSectors`). Decision A's extra sector.

### 8.10 `build/manifest.json` — mislabelled measurement

`runtimeCodeBudget.measurement` reads "linked CODE + STARFIELD + BROADSIDE +
A2_KERNEL + ENTITY_CODE bytes". The value 17,521 is the sum of those five plus
`PICKUP_CODE` (773 B). The number is right and matches memory-map.md's own
six-segment formula; **the manifest's label is wrong**.

### 8.11 The `capacity-window-watch` tooling is not a gate

memory-map.md and STATUS describe "the native write-watch
(`scripts/capacity-window-watch.mjs`) passed on XEX and ATR" in a way that
reads as a standing gate. MEASURED: the string `capacity-window-watch` appears
nowhere in `package.json`, `scripts/build.mjs`, `tests/` or
`scripts/runtime-wall-trace.mjs`. It is a manually invoked proof tool that ran
once per relevant step. This matters for §3.3: the project does not have a
standing write-watch, it has a write-watch it can run.

---

## 9. Where to go from here

| Need | Source |
| --- | --- |
| This picture, pinned to a HEAD | **this file** |
| What is true right now, defect by defect | [STATUS.md](STATUS.md) |
| Exact addresses at a named checkpoint | [memory-map.md](memory-map.md) §"Segment free tails at the current checkpoint" |
| The active roadmap's full item text | [plan-realizacji.md](plan-realizacji.md) §4 |
| Why a decision was made | [owner-decisions-2026-09-11.md](owner-decisions-2026-09-11.md), [decisions/](decisions/), §6.3 here |
| The 4.6 record design in full | [design-4.6-data-architecture.md](design-4.6-data-architecture.md) |
| Evidence for any measured claim | [diagnostics/](diagnostics/) |
| How the project is developed | [reguly-projektu.txt](reguly-projektu.txt), [../AGENTS.md](../AGENTS.md), §6.4 here |

**Next task, unchanged by this session:** owner smoke and the SIO2SD checks for
owner decision A (§7.2), then roadmap item 4.4, the population budget
measurement.
