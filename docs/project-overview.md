# VOID STRIKE 65 — consolidated project overview

**Pinned to HEAD `c31b2208e9ae85678c02a20ed2e11a3ef4b38cfa` (`c31b220`), branch
`wip/4.5d-gate-fail`, worktree clean. Written 2026-09-20.**

> **Reconciliation pass, 2026-09-20 (HEAD `ac71df7`, this file's own commit
> plus the reconciliation commit).** The owner settled the game's concept.
> Owner decisions **E-R** are recorded in
> [owner-decisions-2026-09-11.md](owner-decisions-2026-09-11.md), section
> "Decyzje literowe 2026-09-20", together with A-D which had lived only in §5.3
> of this file. Every disagreement in §8 below is now marked **RESOLVED** with
> where it was corrected, or **STANDING** with why. Two figures in this file
> were themselves wrong and are corrected in place: the near-star row in §2.1,
> and the §2.5 ESTIMATE, which is now MEASURED.

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
| *(gameplay ring + row tables + publication/prepared-row state)* | `$8140-$85E5` | 1,190 | `$85EF` `CORRIDOR_PHASE_HI` | **9** (`$85E6-$85EE`) |
| *(corridor phase + hull draw row)* | `$85EF-$85F1` | 3 | `$85F2` near-star state | 0 |
| *(near-star state — hand-placed BSS, 4 × 4 B)* | `$85F2-$8601` | 16 | `$8602` `HYBRID_C_SECTOR` | 0 |
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

MEASURED total of the gaps above: **578 B**, in fifteen fragments, the largest
being the arena's 215 B and the starfield reservation's 114 B. Plus **6 B** at
`$4FFA-$4FFF` in the fixed low block. (Corrected 2026-09-20 from 593 B: the
gap before the near-star state is 9 B, not 24 — see §8.1's near-star row, now
settled from the source.) Nothing in that list is a contiguous
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

> **Corrected 2026-09-20.** The manifest's `runtimeCodeBudget.measurement`
> string named five segments while the value 17,521 is the sum of **six** —
> `PICKUP_CODE` was included and unnamed. `scripts/build.mjs:2375` now names
> all six. MEASURED: 4,469 + 2,224 + 6,653 + 237 + 3,165 + 773 = 17,521, and
> the expression at `scripts/build.mjs:1623-1624` sums exactly those six. The
> number never moved and the XEX is byte-identical across the change.

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

**What the OS occupies above `$BC20` — MEASURED 2026-09-20.** This was the
one ESTIMATE in this file that nothing in the repository measured. It is now
measured, and the answer has two halves, the second of which nobody was
looking for.

The boot-smoke observer (`scripts/atari800-wall-trace.h`) now records
`SDLSTL`/`SDLSTH` (`$0230`), `MEMTOP` (`$02E5`) and `RAMTOP` (`$6A`) in every
snapshot, alongside the display list, `CHBASE`, `PMBASE`, `DMACTL` and `NMIEN`
it already took. Eight cold sessions, **8/8 pass**.
**EMULATOR-MEASURED**, Atari800 7.1.2 PAL/XL:

| BASIC at coldstart | `RAMTOP` | `MEMTOP` | `SDLSTL`/`SDLSTH` | OS screen | Usable window |
| --- | ---: | ---: | ---: | --- | ---: |
| **disabled** (`-nobasic`), XEX and ATR | `$C0` | `$BC1F` | `$BC20` | `$BC20-$BFFF`, 992 B | `$A000-$BC1F` = **7,200 B** |
| **enabled** (`-basic`), XEX and ATR | `$A0` | `$9C1F` | `$9C20` | `$9C20-$9FFF`, 992 B | all `$A000-$BFFF` = 8,192 B |

Identical on both media and both cold RAM fills (`$A5`, `$5A`), and constant
across the frame-250, 300, 3050 and 3300 snapshots. The frame-1 snapshot reads
zero on all eight sessions: the OS has not initialised those cells that early,
so frame 1 is the wrong frame to read them at — a finding worth keeping, since
frame 1 is where this measurement was expected to land.

**The number to plan against is `$A000-$BC1F` = 7,200 B**, not 8,192 B. A
machine cold-started without BASIC has the OS screen at the top of the window,
and the game does not get to choose how the player powers the machine on. The
owner's ESTIMATE — roughly 992 B of OS screen at the top — was exactly right
for that case.

**The half nobody was looking for.** Cold-started **with** BASIC enabled, the
OS sets `RAMTOP = $A0` and puts its screen at `$9C20-$9FFF` — **not in the
window at all, but inside the game's own resident RAM**. MEASURED, that range
holds the `ENTITY_CODE` tail (`$9C20-$9D5C`), `DIRECTOR_C_PRE`, `LEVEL1_DATA`
and `DIRECTOR_C_CODE` (`$9E13-$9FF7`): 992 B of live C Director code and data.
`disable_basic_rom` unmaps the ROM but **does not move the OS's shadows** —
`RAMTOP`, `MEMTOP` and `SDLSTL`/`SDLSTH` stay wherever coldstart put them.

Nothing breaks today, and the measurement says why: `NMIEN = $80` from frame
250 onward in every session, so the **OS VBI NMI is disabled** and the game
owns the display outright. But this is precisely the hazard §6.2 is built
around. If the between-levels reader returns to OS SIO and revives the OS VBI,
that VBI restores the display-list pointer from `SDLSTL`/`SDLSTH` — and on a
BASIC-enabled cold boot it points at `$9C20`, into Director code. Not into the
window.

**Carry into roadmap 4.3:** the loader-mode display state must **set the OS
shadows to its own values before handing control to SIO**, not merely restore
the hardware registers afterwards. Recorded as a measurement, not a design.

> **RESOLVED 2026-09-20 — the requirement is void, and the hazard never
> arises.** It was conditional on "if the between-levels reader returns to OS
> SIO", and under owner decision W it does not: the reader built in roadmap 4.3
> is direct SIO. It calls no OS routine, takes no vector and never revives the
> OS VBI, so `SDLSTL`/`SDLSTH`, `MEMTOP` and `RAMTOP` are never consulted by
> anything. The implemented reader writes none of them. The measurement above
> stands as a measurement; only the carried requirement is withdrawn. See
> `plan-4.3-sector-reader.md` §5 and `diagnostics/sio-protocol-facts.md`.

Evidence: `build/runtime-wall-trace/boot-smoke/report.json`, per-session
`snapshots[].sdlst` / `.memtop` / `.ramtop`. Still EMULATOR-MEASURED: decision
R item 4 keeps it in the technical-debt register for that reason.

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
owner's model. **MEASURED 2026-09-20 (§2.5): plan against `$A000-$BC1F` =
7,200 B.** On a machine cold-started without BASIC the OS screen occupies
`$BC20-$BFFF`; on one cold-started with BASIC the whole 8,192 B is free but the
OS screen lands at `$9C20-$9FFF`, inside resident Director memory instead. The
game cannot choose which, so 7,200 B is the planning figure and the `$9C20`
case is a constraint on the reader, not on the window.

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
together** — which does not fit the window alongside anything else and never
fits resident. That is why the between-levels sector reader is **in scope, not
optional**.

**Updated by owner decisions E and F, 2026-09-20.** The campaign is **sixteen
levels**, not eight — and capital variety is **parametric, not per-level art**.
Four distinct segment-art sets; length in segments, turret density and maximum
gondola protrusion are three independent parameters, four steps each, layered
on a chosen art set. One hull variant per level, so the player feels he is
flying through a new region each level, but the art behind it is one of four.

**Disk budget, MEASURED:** 537 free ATR sectors = 68,736 B. **Four** art sets
at 1,253 B ≈ 40 sectors, plus per-level parameters. Sixteen *independent* art
sets would have been ≈ 160 sectors — still affordable on disk, but decision F
buys it back for content instead. The disk is not the constraint either way;
decision F is what keeps it that way as the campaign doubled.

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
| 4.9 | **The campaign** — level complete, next level, **sixteen** levels as data (decision E) | 21 §7, content target §6.1, E, F, J, K, L, M | 4.3, 4.7, 4.8 | — |

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
A resident **direct-SIO** reader (**~250-350 B, ESTIMATE**) plus a
loader-mode display state, plus the loader screen of §6. **Supersedes
ADR-004.**

> **SUPERSEDED 2026-09-20 — owner decision W.** This section previously read
> "a resident `SIOV` reader (~80-120 B, ESTIMATE, design-4.6 §10.1 B)". That
> was the wrong reader *and* the wrong estimate. The reader drives the SIO
> protocol on the POKEY/PIA registers itself and never calls `SIOV` (`$E459`),
> because the game has run with `sei` set, with `NMIEN` never enabling the VBI,
> and with nothing but the game writing `DLISTL`/`DLISTH`, `CHBASE`, `PMBASE`
> or the colour registers since start. The OS route would have to unwind all
> three invariants and re-establish them, with a display-shadow exposure window
> on both sides of the call; direct SIO unwinds none of them. Implemented from
> the protocol specification (Altirra Hardware Reference Manual ch. 9), not
> from vendor GPL-2 code, so `AGENTS.md` rule 13 is not strained. The ~130-230 B
> difference has to be planned for in the resident budget. Needs hardware validation on real SIO2SD; decision D defers that
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

**Owner decision N (2026-09-20): a PERMANENT weapon booster.** Collecting it
raises the player's weapon level by one, up to five; collecting the same
booster again raises it another level. The level sets **both projectile damage
and projectile colour**, so the colour tells the player his current strength
with no HUD. Dying costs **one** level, not all of them. The other boosters
keep working as they do today. Architecturally this is **one variable, "booster
level 0-5"**, from which damage and the active `weapon_class` follow.

The owner asked for two repo checks before this is planned. Both were answered
at this HEAD:

- **Does any existing booster already modify damage?** **No.** MEASURED: the
  player-shot damage is a hardcoded `lda #$01` at `src/main.s:3892` feeding
  `queue_enemy_damage`; the routine's only other callers are player-enemy
  contact (1) and capital fire (`CAPITAL_DAMAGE_UNITS`). Rapid Fire changes
  cadence, Spread changes count, Shield absorbs player damage. So the booster
  level can be the sole source of that number — there is no second source to
  turn it from a number into a system.
- **Do player projectile classes share the `HOSTILE_WEAPON_VISUAL_COUNT <= 9`
  limit?** **No — they have their own bank.** MEASURED
  (`build/fighter-weapons.inc`): `PLAYER_FIGHTER_PROJECTILE_GLYPH_BASE = 11`,
  `STRIDE = 9`, `COUNT = 36` (four looks × nine phases). The `<= 9` assert at
  `src/main.s:797` bounds the *hostile* bank at base 90 only. The player's
  ceiling is `src/main.s:792`, `BASE + COUNT <= CAPITAL_HULL_GLYPH_BASE = 59`.
  **Five looks = 45 glyphs, codes 11-55, fits with three codes to spare.** A
  sixth would not.

**What stays open, and it is the part the decision depends on: colour.**
`art-direction.md` binds every object with *"a local object must not change the
global palette in a way that recolours other objects"*. Player projectiles are
ANTIC 4 cells in shared playfield registers, all yellow `$1E` today. So "a
colour per booster level" is not free: either five levels fit inside pixel
values already assigned to playfield registers, or a different mechanism is
needed. Settle this **before** planning N, because the colour carries the whole
signal to the player.

### 4.7 4.7 Boss
Designed **data-driven** — phases, movement pattern, fire pattern, HP and weak
points as data — so that later bosses are records, not implementations. This is
a decision to make when *planning* 4.7, not after it. One boss foundation
first: modules, one gun, a victory condition. Nova Missile is designed together
with boss lifecycle and boss HULL, never as an ordinary drop.

**Owner decision H (2026-09-20): one mechanic, many appearances.** A single
boss controller; each boss is a record describing module layout, weapon
placement and count, and weak points, built from the repeating-module approach
already agreed for the capital. **Boss weapons reuse the existing
`weapon_class` records** — Bomber, Interceptor and Raider shells —
deliberately, to save code for the booster work. With sixteen levels and a boss
on each (decision E), this is what keeps sixteen bosses from meaning sixteen
new projectile families.

**Owner decision I (2026-09-20): the boss laser.** A line drawn **at once**
from the gun down to the bottom of the screen — *not* an unfolding beam; the
owner's earlier "unfolding" was shorthand and is withdrawn, which is what makes
this far cheaper than a variable-length object. It lasts one second. It is
telegraphed by the gun visibly heating, with sound, for about two seconds, so
the player must move out of the column. It destroys everything in its path; the
owner accepts that as a requirement, on the assessment that a fixed column and
row range is cheaper than ordinary collision because there is no movement to
track. **That assessment is an owner ESTIMATE and is not measured** — cost it
when planning 4.7. Count per level: one on levels 1-4, two on 5-9, four on
10-16, to be tuned during balancing.

### 4.8 4.8a Capital geometry
Deeper, uneven gondolas at varying heights, variable corridor width, bigger
debris; River Raid-style spatial flying. **Data plus a collision check, not a
new subsystem.** This is also where hull variants stop being parameters and
become the per-level art of §3.6.

### 4.9 The campaign
Level complete, next level, **sixteen** levels as data, polish. A boss ends
every level, and the easiest difficulty must be beatable by anyone (decision
E). Capital variety is parametric (F). Lives: three plus one after each odd
level from 3 (K). Level select from the furthest level reached, RAM-only, reset
by a difficulty change, with the menu showing what is available (L). High
scores stay RAM-only (M). Difficulty scales reload and spacing **and** damage
(J).

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

All of A-R, and U, are now recorded in
[owner-decisions-2026-09-11.md](owner-decisions-2026-09-11.md), section
"Decyzje literowe 2026-09-20", in the journal's usual Polish. A-D lived only in
this table until 2026-09-20.

| Letter | Decision | Status | Consequence |
| --- | --- | --- | --- |
| **A** | The ATR must boot without OPTION | Implemented, `OWNER-SMOKE CANDIDATE` | Recorded in the repo (STATUS, architecture.md, memory-map.md, hardware-testing.md). Transport 182 → 183 sectors. `$A000-$BFFF` becomes unconditionally RAM. Unproven on hardware. |
| **B** | Open the window | **Recorded here for the first time** | `$A000-$BFFF` is usable RAM and is used. Supersedes decision 23 §10.1's rejection of variant A and `reguly-projektu.txt` rule 11's "BASIC RAM is not the default answer". The ~350-450 B 4.6 placement deficit stops being a blocker. |
| **C** | Code containers are not built now | **Recorded here for the first time** | With the window open, all variant handlers fit resident with no swapping. The loader carries **DATA per level, not code**. The seam is prepared inside 4.6 (§3.2) so swapping later is bounded. Rationale: the gate set is blind to the container failure family (§3.3). |
| **D** | The hardware measurement is deferred | Now in the journal | Every boot-time and per-sector figure in this project stays EMULATOR-MEASURED. §7 is where a future session learns not to spend those numbers as headroom. Its technical-debt register is decision R. |
| **E** | **Sixteen levels, not eight**; a boss ends every level; the easiest difficulty beatable by anyone | Recorded 2026-09-20 | Supersedes design-4.6 §6 and §6.1 below. `plan-realizacji.md` §4 item 7 and decision 21 item 7 ("16 poziomów") were **right all along**. |
| **F** | Capital variety is **parametric**, not per-level art | Recorded 2026-09-20 | Four segment-art sets; length, turret density and maximum gondola protrusion are independent 4-step parameters. One hull variant per level. ≈ 4 × 1,253 B on disk, not 16 sets. |
| **G** | Capital turrets stay **non-destructible** | Recorded 2026-09-20 | Confirms backlog 4.8b. Turrets are not objects (no HP, no slot state, not a collision target) and the player-shot scan is already the most expensive item in collisions. |
| **H** | Boss: **one mechanic, many appearances** | Recorded 2026-09-20 | One controller; each boss a record (module layout, weapon placement and count, weak points). Boss weapons reuse existing `weapon_class` records, to save code for the boosters. |
| **I** | The **boss laser** | Recorded 2026-09-20 | Drawn at once, gun to bottom of screen — the earlier "unfolding beam" is **withdrawn**. One second, telegraphed by ~2 s of visible gun heating with sound. Destroys everything in its path. 1 / 2 / 4 per level on 1-4 / 5-9 / 10-16. Cost assessment is an owner ESTIMATE. |
| **J** | Difficulty scales reload and spacing **and** damage | Recorded 2026-09-20 | Player-dealt, player-taken, contact and boss damage. Revised from the owner's initial damage-only proposal: with damage alone EASY and HARD differ only in how fast the player dies. |
| **K** | **Lives**: three, plus one after each odd level from 3 | Recorded 2026-09-20 | Levels 3, 5, 7, 9, 11, 13, 15 — seven extra across the campaign. |
| **L** | **Level select** from the furthest level reached | Recorded 2026-09-20 | RAM only, lost at power-off; a difficulty change in the menu resets it to level 1; the menu shows which levels are available. |
| **M** | **High scores**: RAM only, no disk write | Recorded 2026-09-20 | Confirms today's behaviour (`game-design.md`: ten packed-BCD entries in RAM, cleared by a cold program start). Disk save goes to the backlog. |
| **N** | **PERMANENT weapon booster**, level 0-5 | Recorded 2026-09-20 | One variable; the level sets damage and replaces a HUD. Death costs one level. Both repo checks **ANSWERED** (§4.6). How the level is signalled is decision **U**. |
| **O** | **Loader screen**: one random line of 8-16 English texts + an animation stepped per sector read | Recorded 2026-09-20 | Spoken by the fighter's onboard AI — cynical, seen too much; winks at Hitchhiker's, Star Wars, Avengers and BSG without quoting them. Texts written later. ~640 B resident before the read starts. |
| **P** | **End screen** | Recorded 2026-09-20 | Eventually an animation in the top third plus a text scroll below — a separate sub-project, a loaded sector, not resident. A simple message suffices for now. |
| **Q** | **The project rules are superseded, explicitly** | Recorded 2026-09-20 | `plan-realizacji.md` §7 and `reguly-projektu.txt` §11 keep their entries, marked SUPERSEDED with the superseding decision and why the ground changed. See §8.5. |
| **R** | **Hardware measurements deferred — risk OWNER-ACCEPTED 2026-09-20** | Recorded 2026-09-20 | A **five**-item technical-debt register, each with what it invalidates. Item 4 (what the OS holds above `$BC20`) was measured in this session; the register keeps it because the measurement is emulator-only. Item 5 (ATR sector interleave) was added 2026-09-20. |
| **U** | **Booster level is signalled by SHAPE and SOUND** | Recorded 2026-09-20 | A thicker or doubled bolt per level (the player glyph bank has three spare codes, §4.6) and a different firing sound per level (parameters on the existing POKEY firing channel). The two act at different moments — shape when the player watches his shot, sound when he does not — so they reinforce rather than duplicate and neither may later be dropped as redundant. Colour was conditional on one repo check; the check was run at `95eac61` and **colour is REJECTED**: `COLPF2` is also the debris breakup's yellow phase, three allied capital-hull glyphs and the capital explosion core. Five levels stand; three may read more clearly if sound discrimination proves weak — settled during balancing. |

### 5.4 ADRs

| ADR | Status |
| --- | --- |
| ADR-001 portable toolchain | Accepted, in force. |
| ADR-002 gameplay screen | Accepted, in force. |
| ADR-003 loader screen (mixed ANTIC F/E bitmap) | Accepted, in force. The between-levels loader screen of §6 is a **second, different** loader display and does not change ADR-003. |
| ADR-004 one resident gameplay program, no disk I/O between levels | **SUPERSEDED** by decision 23 §10.1 and confirmed by decisions B and C. Its own reconsideration clause is satisfied: the measured report is design-4.6 §7.3 (placement deficit) plus §3.6 here (hull art per level). |

---

## 6. Content target and the loader screen

Both were recorded here first, from the owner's conversation. Since
2026-09-20 they are owner decisions E, F, O and P in the journal.

### 6.1 The content target

**Superseded in one figure and sharpened in another, 2026-09-20.**

- **Sixteen levels** (owner decision **E**). The "eight" that stood here until
  2026-09-20 is withdrawn. Sixteen gives the player time to enjoy the game and
  the designer room to introduce something new at a measured pace.
- **A boss ends every level**, and the boss is one controller with a record per
  boss (decision **H**), not sixteen implementations.
- **The easiest difficulty is to be beatable by anyone** (decision **E**).
- **Capital ships that get LONGER on later levels AND look different** — but
  **parametrically** (decision **F**), not as sixteen sets of art. Four
  segment-art sets; length in segments, turret density and maximum gondola
  protrusion are three independent parameters, four steps each, layered on a
  chosen set. One hull variant per level, so each level reads as a new region.
  MEASURED, one hull variant is **1,253 B** (248 B glyphs + 1,005 B packed map
  and metadata); **four** sets ≈ 40 ATR sectors. Per-level payload still does
  not fit resident — **the sector reader stays in scope rather than optional**
  — but decision F is why doubling the campaign did not double the art budget.
- **At least today's enemy count plus swarms.** Today, MEASURED: four
  archetypes, 2 Heavy on `P1`/`P2` + 1 Light slot. The 4.6 target is
  2 Heavy + up to 4 Light, with SWARM shipping a ceiling of 3 (decision 23
  §10.7).
- **Two or three distinct appearances for swarm enemies.**
- **Two or three wave shapes.**
- **Room left over for improvements.**
- **The owner's standard: someone who knows Atari should finish it and say
  "wow".**

Player progression, added 2026-09-20: lives three plus one after each odd level
from 3 (decision **K**); level select from the furthest level reached, RAM-only
(**L**); high scores RAM-only (**M**); difficulty scaling reload, spacing
**and** damage (**J**); a permanent weapon booster, level 0-5, whose level sets
damage and replaces a HUD (**N**), signalled by **shape and sound** — a
thicker or doubled bolt plus a different firing sound per level — with colour
rejected because `COLPF2` is shared with the debris breakup, three allied
capital-hull glyphs and the capital explosion core (**U**).

### 6.2 The loader screen — part of the reader, not an extra

**Owner decision O (2026-09-20)** confirms everything in this section and adds
the voice: the texts are spoken by the fighter's **onboard AI** — cynical,
having seen too much — winking at The Hitchhiker's Guide, Star Wars, Avengers
and Battlestar Galactica **without quoting them**: a situation that evokes the
reference, never the reference itself. The texts are written in a later
session. **Owner decision P** covers the end screen: eventually an animation in
the top third at full width with a text scroll below, a separate sub-project at
the end, possibly demoscene-grade, and a loaded sector rather than resident; a
simple message suffices for now, and the scroll text is written at the end of
the process, when there is something true to say about it.

When a level is read between levels, a display must exist, because
**a loader-mode display must set the OS shadows — `SDLSTL`/`SDLSTH`, `RAMTOP`,
`MEMTOP` — and not merely restore the hardware registers afterwards**: the OS
left its own screen at `$9C20`, inside resident game RAM (§2.5). The reader
therefore needs a loader-mode display state whether or not anything is shown in
it. Given that it needs one, it shows this:

> **CORRECTION 2026-09-20 — the requirement stands, its stated reason did
> not.** This paragraph used to say the OS VBI rewrites `DMACTL`, the display
> list, the colours, `CHBASE` and `PMBASE` from its shadows **during** SIO. It
> does not: OS SIO sets `CRITIC`, which suppresses VBI stage 2 for the whole
> call (*Mapping the Atari*, location 66 `$42`; corroborated by HiassofT's
> OS-SIO replacement, which sets `CRITIC` as its third instruction after
> `SEI`). The real exposure is a window on either side of the call — between
> re-enabling the VBI and SIO setting `CRITIC`, and again after SIO clears it.
> A plan written from the old reason would guard the wrong window. See
> design-4.6 §3 and owner decision W, under which the reader is direct SIO and
> never takes the OS path at all.

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

**"Exactly +2 PAL frames per sector" is NOT an identity. Do not state it as
one.** Two measured facts, both at this HEAD:

1. Decision A grew the transport from 182 to **183** sectors and the ATR menu
   frame **did not move** — still 554 on both BASIC-off sessions.
2. Re-measured 2026-09-20 across all eight boot-smoke sessions: with the
   **same** 183 sectors, the ATR menu arrives at **554** frames cold-started
   without BASIC and at **538** with BASIC enabled; XEX at **392** and **383**
   respectively. A 16-frame spread on the ATR — eight sectors' worth by the
   rule — from a variable that has nothing to do with sector count, because
   coldstart with BASIC sets `RAMTOP = $A0` and gives the OS less memory to
   clear (§2.5).

The rule is **frame-quantised, not linear**, it was calibrated over a single
177→182 range on one emulator, and the BASIC state alone moves it further than
several sectors would. Treat it as an approximation for sizing a budget, never
as an arithmetic that predicts a frame. The committed baselines in
`boot-deadline-baseline.json` (XEX 392, ATR 554) are the BASIC-off figures and
the gate's fail band is ±50 frames, which absorbs this comfortably — but a plan
that converts sectors to frames by multiplying by two is wrong by construction.

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
- **The OS's occupation of the top of the window** (§2.5) — **now
  EMULATOR-MEASURED** as of 2026-09-20, no longer ESTIMATE. It stays in this
  section, and in decision R's register as item 4, because Atari800 is not a
  65XE: `RAMTOP`, `MEMTOP` and the display-list shadows are OS behaviour the
  emulator models from the same ROM, but the OS revision in a given machine and
  what a SIO2SD's own boot leaves behind are not covered by it.

### 7.4 The technical-debt register (owner decision R)

**OWNER-ACCEPTED RISK, 2026-09-20.** The owner accepts, today, that the
hardware measurements are deferred. Each entry says what it invalidates if it
goes wrong. Five entries; item 5 was added 2026-09-20.

| # | Debt | What it invalidates |
| --- | --- | --- |
| 1 | **RESET during gameplay may re-map the BASIC ROM over `$A000-$BFFF`.** The `BASICF = $01` write is what should prevent it, and it is the part an emulator proves least well. | **Decision B stands entirely on it.** If RESET brings the ROM back mid-game, the window stops being RAM during play and everything stored there is gone. |
| 2 | **The real per-sector read rate** — the emulator's SIO is patched. | The inter-level pause, and how much content fits on disk inside an acceptable wait. Decision O is designed not to care; the rest of the content plan (E, F) does. |
| 3 | **The ATR boot-without-OPTION fix is emulator-proven only.** | Decision A, and through it the unconditional window (B) and every item in §4 on real hardware. |
| 4 | **What the OS occupies above `$BC20`** was unmeasured, so the window might have been smaller than 8 KB. | **Measured 2026-09-20 (§2.5): `$A000-$BC1F`, 7,200 B usable, plus the `$9C20` finding.** The entry stays because the measurement is Atari800-only. |
| 5 | **The ATR's sector interleave is not a documented property of the build.** Added 2026-09-20, OWNER-ACCEPTED. Sectors are laid out logically ordered. | Nothing on SIO2SD or in emulation, where interleave is meaningless. On a **real 1050** reading logically-ordered sectors the drive "blows a rev" between sectors and reads at roughly **half speed — ~208 ms per sector instead of ~104**. That doubles every load figure derived from disk on real hardware, including the inter-level pause of §6 and, through it, how much content fits inside an acceptable wait. The owner will verify on a CA2001 once he has a monitor for it, and notes that in practice almost everyone will run this on an emulator or SIO2SD. |

---

## 8. Disagreements found

Every place a document contradicts another document or the repo. The measured
value is given; nothing is silently picked.

> **Resolution pass, 2026-09-20.** All eleven are addressed. Each subsection
> below carries a **RESOLVED** line naming where the correction was made, or a
> **STANDING** line saying why it was not. Two of them — §8.3 and §8.8 — had
> already been corrected in their own files before this pass and are marked as
> such. Two figures in **this** file turned out to be wrong and are corrected
> in §2.1 and §2.2.

### 8.1 memory-map.md — stale segment rows

**RESOLVED 2026-09-20.** Every row below is now marked `[SUPERSEDED …]` or
`[CLARIFIED …]` **inline, in `memory-map.md`, at the point a reader hits it**,
and the file gained a "Superseded rows — the measured values, in one place"
section directly under its top warning. The near-star row is settled from the
source; see §8.1a.

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
| `$8600-$8601` near-star state (BSS table) vs `$85FE-$8601` 4 B `STAR_NEAR_SCREEN_HI` (accepted-placement section) | **RESOLVED from the source 2026-09-20 — see §8.1a. Both rows understate it: the near-star state is `$85F2-$8601`, 16 B.** |

The file's own "Segment free tails at the current checkpoint" section **is**
correct at this HEAD and matches the measurement exactly. The stale rows are in
the older sections above it, which the file says are overridden — but which a
reader hits first. That is why the 2026-09-20 pass marked them inline rather
than only listing them here.

### 8.1a The near-star state — settled from the source

`memory-map.md` disagreed with itself by 2 B and neither figure could be
resolved from a link map, because the near-star records are **hand-placed BSS,
not a linker segment**. Settled by reading the address chain and confirming it
against the label file. **MEASURED:**

| Symbol | Source | Address |
| --- | --- | ---: |
| `STAR_NEAR_ROW` | `src/main.s:228` (`= HULL_DRAW_ROW_HI+$01`) | `$85F2-$85F5` |
| `STAR_NEAR_COLUMN` | `src/main.s:229` | `$85F6-$85F9` |
| `STAR_NEAR_SCREEN_LO` | `src/main.s:230` | `$85FA-$85FD` |
| `STAR_NEAR_SCREEN_HI` | `src/main.s:231` | `$85FE-$8601` |
| `STAR_NEAR_STATE_END` | `src/main.s:232` | `$8602` |

Each table is `STAR_NEAR_CAPACITY` bytes, and `STAR_NEAR_CAPACITY = 4`,
generated into `build/starfield.inc:7` from `near.population` by
`scripts/starfield.mjs:110`. `build/void-strike-65.lbl` gives `$85F2`, `$85F6`,
`$85FA`, `$85FE` for the four tables, confirming the stride independently.
`HULL_DRAW_ROW_HI = $85F1` in the same label file.

**The answer: `$85F2-$8601`, 16 B, four 4-byte tables.** The source is not
ambiguous.

Both of `memory-map.md`'s rows were wrong about the extent and neither was
wrong about what it named: `$85FE-$8601` is `STAR_NEAR_SCREEN_HI` exactly, and
`$8600-$8601` is the last two bytes of it. The file's `$85EF-$85FF` "17 B
unowned" row is wrong outright: `CORRIDOR_PHASE_HI`, `HULL_DRAW_ROW_LO`/`HI`
and the near-star tables own all of it.

**This corrected a figure in this document too.** §2.1's row gave the gap
before the near-star state as 24 B (`$85E6-$85FD`), derived from the wrong
start address. The real gap is **9 B (`$85E6-$85EE`)**, and §2.2's total falls
from 593 B to **578 B**. Both are corrected above.

`STAR_NEAR_STATE_END` is bounded by `.assert STAR_NEAR_STATE_END <=
RESIDENT_WINDOW` (`src/main.s:741`) with `RESIDENT_WINDOW = $8602`
(`src/main.s:727`): the state ends **exactly** where the resident window
begins, with zero slack. Anything that raises `STAR_NEAR_CAPACITY` moves
`HYBRID_C_SECTOR`.

### 8.2 The 45 B → 1 B `ENTITY_CODE` tail

**RESOLVED 2026-09-20.** Both statements now carry an inline `[SUPERSEDED …]`
marker in `memory-map.md` — the 45 B row in *Accepted placement since
`41ace65`* and the 13 B row in the 4.4c section — so neither can be read as
capacity without seeing the measured 1 B beside it.

memory-map.md §"Accepted placement since `41ace65`" states
"`$9D31-$9D5D` 45 B free" and §4.4b states "ENTITY_CODE free tail 45 → 13 B".
The measured tail at this HEAD is **1 B**. Both are historical rows that were
correct when written; neither is marked as superseded at the point of reading.
**This is the pair that cost the work.**

### 8.3 STATUS.md — internal contradiction about the outstanding candidate

**ALREADY RESOLVED, before this pass.** `STATUS.md` §"Current task" now reads
"Exactly one `OWNER-SMOKE CANDIDATE` is outstanding: owner decision A", and
states explicitly that the old sentence was a leftover, corrected 2026-09-20.
Verified at HEAD; no further edit needed.

`docs/STATUS.md` §"Current task" opens with "Owner decision A … is an
`OWNER-SMOKE CANDIDATE`" and closes the same paragraph with "**No
`OWNER-SMOKE CANDIDATE` is outstanding.**" The second sentence is a leftover
from before decision A. **Measured/correct: exactly one candidate is
outstanding — decision A.**

### 8.4 STATUS.md — residency figures 3 B stale

**RESOLVED 2026-09-20.** `STATUS.md`'s CPU / RAM baseline table now reads
**20,131 B** and **2,056 B**, matching `build/manifest.json`
(`encounterDirector.simultaneousResidencyBytes` / `.safeResidencyBytes`).
Linked runtime 17,521 B was already correct.

STATUS's "CPU / RAM baseline" table gives simultaneous residency **20,128 B**
and safe residency remaining **2,059 B**, under a note saying the byte columns
are re-measured at HEAD. MEASURED at this HEAD: **20,131 B** and **2,056 B**
(`build/manifest.json`, `encounterDirector.*`). The table also gives linked
runtime 17,521 B, which **is** correct.

### 8.5 `plan-realizacji.md` §7 and `reguly-projektu.txt` §11-12 vs decisions 23, B and C

**RESOLVED 2026-09-20 by owner decision Q — the owner made the edit this
document said it lacked the standing to make.** Both entries are **kept** and
marked `SUPERSEDED`, each naming the superseding decision and one line on why
the ground changed. `reguly-projektu.txt` went to version 3.2 for it. Note the
precise location: the "BASIC RAM, loader changes i runtime disk I/O" entry is
in `plan-realizacji.md` **§7** and `reguly-projektu.txt` **§11**;
`reguly-projektu.txt` §12 is a different list and contains none of the three —
it was checked and none of its entries conflicts with the current path.
Decision Q.1 lists the eight further contradictions found in the wider review.

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

**RESOLVED 2026-09-20 — and it resolved the other way.** Owner decision E:
**sixteen levels**. `plan-realizacji.md` §4 item 7 and decision 21 item 7 were
right; the eight-level content target in §6.1 above and in design-4.6 §6 was
the stale figure. Corrected in §6.1 here, in design-4.6 §6, and confirmed in
`plan-realizacji.md` §4 item 7.

Both say **"kampania 16 poziomów jako dane"** — a 16-level campaign. The
owner's content target (§6.1) is **eight levels**. design-4.6 §6 is also built
on eight. **Measured/authoritative: eight.** The "16" appears to be an older
figure that survived into decision 21's text.

### 8.7 `plan-realizacji.md` §3 and §4.5c — superseded per-candidate figures

**RESOLVED 2026-09-20.** `plan-realizacji.md` §3 keeps the `0a90c1c` row as
history, marks its 450-cycle fence margin superseded, and gains the `0002d84`
row as the current accepted checkpoint with 1,464 cycles. §4.5c keeps its
candidate-time figures inside an explicit `SUPERSEDED` block beside the
measured ones (arena 617/832 B with 215 B free, composite `HYBRID_C_EXT` tail
19 B, transport 183 sectors, ATR menu 554 against a 3,000-frame ceiling). The
"550 przy terminie 550" pair is called out as coming from the formula decision
22 re-based.

§3 states the accepted checkpoint as `0a90c1c` with "najgorszy margines fence
450 cykli, arena 617/832 B". §4.5c states "arena 392/832 B … 440 B wolne",
"ogon `HYBRID_C_EXT` 28 B", "180 sektorów transportu, menu ATR 550 przy
terminie 550". MEASURED at this HEAD: accepted checkpoint **`0002d84`**, worst
fence margin **1,464**, arena **617/832 B with 215 B free**, `HYBRID_C_EXT`
composite tail **19 B**, transport **183 sectors**. The 550/550 deadline
figures are from the superseded formula (decision 22) and state a limit that no
longer exists.

### 8.8 `game-design.md` — Interceptor section contradicts its own heading

**ALREADY RESOLVED, before this pass.** `game-design.md` now reads
"Owner-accepted with the whole `0a90c1c` stack (owner smoke PASS 2026-09-18)"
and records that the contradicting sentence was corrected 2026-09-20. Verified
at HEAD.

The heading reads "**OWNER-ACCEPTED** (roadmap 4.4)"; the first paragraph under
it reads "It is implemented and awaits owner smoke; the values below are the
candidate's, not yet accepted." **Correct: owner-accepted**, owner smoke PASS
2026-09-18 under `0a90c1c`.

### 8.9 design-4.6-data-architecture.md §7.4 and §10.1

**RESOLVED 2026-09-20.** design-4.6 §6, §7.4 and §10.1 now each open with a
SUPERSEDED banner: §6's eight-level table is superseded by decision E
(sixteen), §7.4's boot-smoke risk is void per decision 22, §10.1's A/B/C
variants no longer describe the choice made (B **and** the window, decisions B
and C), and §7.4's "538 free sectors" is corrected to the measured **537**.

- **§7.4 is void as a risk**, per decision 22 — STATUS already says so, the
  design file still states the risk in its own voice.
- **§10.1's answer is now superseded twice.** Decision 23 chose variant B and
  rejected variant A (the window). Decisions B and C take **both**: the window
  is opened *and* the disk carries per-level data. The design file's variants
  A/B/C no longer describe the choice that was made.
- **§7.4's "538 free sectors"** — MEASURED at this HEAD: **537**
  (`transportCapacity.remainingAtrSectors`). Decision A's extra sector.

### 8.10 `build/manifest.json` — mislabelled measurement

**RESOLVED 2026-09-20.** `scripts/build.mjs:2375` now reads "linked CODE +
STARFIELD + BROADSIDE + A2_KERNEL + ENTITY_CODE + PICKUP_CODE bytes", matching
the six-term expression at `scripts/build.mjs:1623-1624`. The value 17,521 is
unchanged and `dist/void-strike-65.xex` is byte-identical
(`276433cd…`) across the change — it is a manifest label, not a build input.

`runtimeCodeBudget.measurement` reads "linked CODE + STARFIELD + BROADSIDE +
A2_KERNEL + ENTITY_CODE bytes". The value 17,521 is the sum of those five plus
`PICKUP_CODE` (773 B). The number is right and matches memory-map.md's own
six-segment formula; **the manifest's label is wrong**.

### 8.11 The `capacity-window-watch` tooling is not a gate

**RESOLVED 2026-09-20, and the correction goes further than the description.**
Re-verified independently at HEAD: the string `capacity-window-watch` appears
in `scripts/capacity-window-watch.mjs`, `scripts/atari800-capacity-watch.h`,
this file, `STATUS.md` and six diagnostics — and **nowhere** in
`package.json`, `scripts/build.mjs`, `scripts/runtime-wall-trace.mjs` or
`tests/`. `STATUS.md`'s descriptions now say "manually invoked proof tool, run
once per relevant step", not "gate".

**Where decision C's rationale relied on it, stated plainly.** §3.3 above
argues that code containers are not built now partly because "the one native
write-watch that exists proves the opposite invariant". That is true, but it
**reads stronger than it is**: it implies the project has a standing
write-watch pointed the wrong way, when in fact the project has no standing
write-watch at all — it has one it can choose to run. The correct form of the
argument is the weaker one: *no gate in the automated set watches a code region
for writes or for execution, and the one tool that could was never wired into
the gate set.* Decision C still holds on its own: the prerequisite it names —
a replay that crosses a level boundary — does not exist, because the game has
one level. That reason needs no tooling claim at all. Recorded as a correction
inside decision C in the journal.

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
