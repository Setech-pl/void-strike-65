# Plan — Light multiplicity: several character-rendered Lights at once, standalone Light waves

Planning session on `main` at `ac0d023`, worktree clean, `build/` linked from the
same HEAD (manifest 2026-09-20 21:56). **Plan only. Nothing implemented.** This
file exists so that the implementation session has a plan *in the repository*;
the previous plan lived only in a chat session and the implementer found nothing.

Every figure is labelled **MEASURED** (read this session from `build/manifest.json`,
the `.lbl`/`.map` files, the source, or the NMOS harness run this session),
**ESTIMATE** (derived) or **BRIEF** (a figure the owner's brief quotes from the
costing session, which is not in the repository — see project memory: the
population and Light-multiplicity costing reports exist only in chat).

---

## 0. Summary and the decision the owner must take first

**Goal.** Replace the single Light slot with four SoA slots (ceiling 3 shipped,
owner decision 23 §10.7), so `SPACE/SWARM` sectors can hold several Lights at
once and Interceptors can fly as a standalone wave instead of only as a Heavy
escort. Three ASM prerequisites come with it: the backing resolver keyed by
screen address instead of glyph code, the glyph install hoisted from every frame
to admission, and the one-expensive-event-per-frame token that keeps a kill and
a volley from landing on the same frame.

**The one thing this plan cannot decide.** The new Light C (~760 B ESTIMATE)
and the grown Light ASM (~590 B ESTIMATE) do not fit any resident tail: after
the old Light C leaves the extension area, the largest reusable holes are the
extension tail (~388 B) and the arena (187 B), 575 B in two pieces. The only
compliant home is a **1,536-B code window at `$B600-$BBFF`** carved from the
level buffer, which shrinks from 44 to 32 sectors (4,096 B, still 2× the
~2 KB per-level payload of design-4.6 / project-overview §3.6). `STATUS.md`
already records that shrinking the level buffer is an owner decision.
**§3 states the placement under that decision; §3.4 gives the alternatives;
§7 makes GO conditional on it.** Do not start implementation without it.

**Second gate, before the token is written and the ceiling is fixed: a native
measurement** (§4.3, the checkpoint after §6 step 3). The
harness figures the brief quotes are confirmed MEASURED this session
(one Light 412 mean / 1,771 max pre-fence cycles), but the only native/harness
pair the repo holds for a Light event is the contact kill: **+3,009 native
against +1,359 harness, a factor of 2.2.** At that factor three Lights plus one
deferred breakup land ~750 cycles *over* the brief's ~3,100 Heavy-free margin;
at a DMA-only factor of ~1.6 they land ~300 under it; and the margin itself
sits between the brief's 3,100 (BRIEF) and the 4,900-5,400 that Option D's
numbers imply (ESTIMATE). Only a native trace with three live Lights settles
this, and no replay in the repository has more than one Light. The plan's
provisional swarm wave produces them naturally in every replay once the slots
exist; the measurement runs on the first multi-slot build, before the token and
the shipped ceiling are committed.

---

## 1. Repo facts verified this session — and where the brief is wrong

| Claim in the brief | Verified state |
| --- | --- |
| The limit is one Light: 16 scalars, two glyph codes, code = slot index in the resolver, one backing pair, one screen pointer | **True.** `src/c/lifecycle.c` declares 16 scalars in `HYBRID_LIGHT_STATE` `$8100-$810F` (MEASURED, `encounter-director.lbl`). `light-wingman.s:26` `LIGHT_GLYPH = 120`, cells 120/121; `light_cell_resolve` (STARFIELD tail `$5D45-$5D63`) does `lsr` on the code and picks `LIGHT_BACKING0/1`; `light_publish` uses one `LIGHT_SCREEN_LO/HI`. `hybrid-c-architecture.md` still states `LIGHT_ACTIVE_MAX = 1` and `tests/source-contracts.test.mjs:173` asserts that string. |
| The Light C is small ("~170 B" in design-4.6 §7.3) | **Wrong by 2×.** MEASURED from the `.lbl`: `_enemy_c_light_tick` `$8D71-$8E66` = **246 B**; `_enemy_c_light_hit` plus the statics `light_reload`, `encounter_light_schedule_advance`, `encounter_light_admit` `$8E67-$8EE1` = **123 B**; **369 B of the 563-B `HYBRID_C_EXT`.** The rest is `lifecycle_c_init` 54, `retire_member` 24, `apply_pending_damage` 105, `recycle` 11. |
| Two unowned RAM windows for slot state, ~52 B | **One is 9 B, not 26.** `$8126-$813F` = 26 B (MEASURED: `__HYBRID_HEAVY_STATE_RAM_LAST__ = $8126`, `GAMEPLAY_RING_SCREEN = $8140`). `$85E6-$85EE` = **9 B** (`PREPARED_HULL_SECTOR` ends `$85E5`, `CORRIDOR_PHASE_HI` at `$85EF`; `memory-map.md` corrected this on 2026-09-20; design-4.6 §3.2 still says 26). Total 35 B, in two non-contiguous pieces. A better home exists: **`$7FC4-$7FFF`, 60 B**, unassigned in the link maps and in `memory-map.md:821` (display list B ends `$7FC3`, `ENTITY_STATE` starts `$8000`; `main.s:371` asserts `PLAYFIELD_DLIST_END <= $8000`). Needs the native write-watch proof the arena got (§5.6). |
| Free glyph codes 122-125 | **True.** Glyphs 120-125 are the retired phased pickup bank (`main.s:735-737`, asserts at `:790-795`). No runtime path renders or installs codes 122-125; `copy_charset` rebuilds all 256 glyphs from `charset_data` at each new game, so an appearance installed at runtime must be re-installed after `start_gameplay` (the current code re-installs every frame, which is why nothing tracks this yet). The only other mention is `DFTRACE_PICKUP_GLYPH_BASE 120` in `scripts/atari800-wall-trace.h:23`; the executor must check what the tracer classifies with it before the native gates run with codes 122-125 on screen. |
| Backing resolver by screen address ~20-30 B; hoist returns ~255 cycles | Resolver: plausible (the debris resolver `resolve_effect_backing_below_interactive_debris` is 31 B and does exactly this for one address). Hoist: **~265 cycles ESTIMATE from instruction timing** (16 × `lda abs,y / sta abs,x / dey / dex / bpl` = 256 + setup). Consistent with the census: `light_update` mean 300 with the Light alive ~40 % of frames. **The resolver is in `STARFIELD`**, whose packed size is 13 B over its correction gate (STATUS, open decision); it cannot grow there. It moves. |
| One Light ~412 pre-fence, kill frame up to 1,771 | **MEASURED this session**, `scripts/measure-population-cost-deltas.mjs` on the HEAD build (HARD, 700 frames, n = 282 Light-alive frames): pre-fence min 381 / **mean 412** / **max 1,771**; whole frame mean 706 / max 1,778. Debris 79 mean; 2nd Heavy member 837 mean; both members 1,677 mean / 2,375 max. Routine census (`measure-routine-call-costs.mjs`): `light_update` 300 mean / 1,219 max, `light_publish` 504 / 768, `_enemy_c_light_tick` 56 / 184, `handle_collisions` 838 / 2,251, `integration_update_enemy` 1,483 / 2,665. |
| Heavy-free SWARM margin ~3,100 | **BRIEF only.** Native MEASURED at HEAD: worst margin **1,464** with two Bombers live (`raider-remnant-rapid-xex-hard` row 1945); Bomber pair standing cost 3,418-3,894 wall cycles after Option D. Removing the pair therefore implies 4,900-5,400 of margin on that row (ESTIMATE); the brief's 3,100 presumably includes debris, a capsule and one Light. Native Light contact kill: **+3,009** (STATUS, root cause of the two 4.5d misses). |
| All firing variety is data | **True.** `EnemyArchetype` carries `burst_count × burst_interval × post_burst[3] × weapon_class`; the Wingman and Interceptor differ by record only; the tick reads `LIGHT_FIELD(...)`. |
| Reader `$A000-$A5FF` with 70 B free; level buffer `$A600-$BBFF` | **True** (`manifest.sectorReader`: 1,466 / 1,536 B, 70 free; `levelBuffer` 5,632 B = 44 sectors; `sector-reader.s:123` `MAX_LEVEL_SECTORS = 44`). `cfg/encounter-director.cfg` still declares `BASIC_WINDOW_RAM` at `$A000` (empty; `build.mjs:1707` throws if it ever holds data, because it would land on the reader). |
| Resident tails BROADSIDE 3, ENTITY_CODE 1, arena ~200 | MEASURED: `HYBRID_C_EXT` tail 19, `ENTITY_CODE` 1, A2 19, pickup fill 7, sector window 18 (248-B window, 230 used), **arena 645 / 832, 187 free**, `DIRECTOR_ABI` 0, `DIRECTOR_C_CODE` 2 (`director_c_request` alone is 162 B, `$9E13-$9EB4`), BROADSIDE 3. Transport **195 sectors, 9 DFMC records = `MAX_CHUNKS`** (`chunk-loader.mjs:11`) — a tenth record needs the cap raised (8 → 9 cost exactly 16 B of stage-2, design-4.6 §4). Boot baseline: XEX 135/392, ATR 319/576, warn +10, fail +50 (`docs/boot-deadline-baseline.json`). |
| `npm test` | **Red at HEAD, pre-existing** (STATUS "Known open defects": the wall-trace binding mismatch aborts `build --quiet` before any test runs). Focused test files only; A/B every failure against a clean export before calling it a regression. |

Frame order that the design depends on (MEASURED, `main.s:2535-2599` and
`:3009-3022`): `integration_update_enemy` (Heavy admission / member loop) →
`handle_collisions` (player PairShots scan `light_shot` per projectile, `:3908`)
→ `entity_effects_update_with_light` = `light_update` (effects update, then the
C Light tick, emission, glyph install, contact test) → effect/debris renders →
`profile_after_sector` → `publish_fighter_projectile_overlays` waits for VCOUNT
`$77` → PairShot erase → `light_publish` (Light erase, debris publish, Light
render) → pickup PMG → PairShot render → near stars. The Light is therefore
erased and re-rendered only in the post-playfield window, and everything that
captures a cell holding a Light code mid-frame (effects at 25 Hz, debris
capture in the window) goes through `light_backing` / `light_cell_resolve_sanitized`.

---

## 2. Design

### 2.1 Slot state — structure of arrays, four slots, what is derived and dropped

`LIGHT_SLOT_COUNT = 4` (the format the owner allowed), `LIGHT_CEILING_SWARM = 3`
(shipped), `LIGHT_CEILING_ELITE = 1`, `LIGHT_CEILING_CAPITAL = 0` — resident C
constants copied into one C-owned policy byte each at `lifecycle_c_init`, so a
harness test can poke a ceiling of 4 without a build flag (§5.2).

Per-slot arrays (12 × 4 = **48 B**), C-owned unless marked ASM:

| Array | Owner | Meaning |
| --- | --- | --- |
| `light_state[4]` | C | 0 inactive · 1 ACTIVE_ESCORT (follows Heavy slot 0) · 2 ACTIVE_FREE (pass-through) · 3 BREAKUP_PENDING (erased, scored, waiting for the token) |
| `light_hp[4]` | C | record `hit_points` at admission |
| `light_x[4]`, `light_y[4]` | C | as today, per slot |
| `light_fire_timer[4]`, `light_burst_left[4]` | C | cadence, per slot |
| `light_archetype[4]` | C | byte offset into `enemy_archetypes` (12 / 24); ASM scores with `ldx light_archetype,y` |
| `light_code[4]` | C decides, ASM reads | the slot's left screen code: `(120 + 2k) | $80`, k = appearance pair 0-2 |
| `light_screen_lo[4]`, `light_screen_hi[4]` | ASM | published address; `hi = 0` means not on screen |
| `light_backing0[4]`, `light_backing1[4]` | ASM | lower backing of the two cells |

Shared scalars (**12 B**): `light_slot` (the slot ASM is ticking; the C index),
`light_scratch`, `light_slot_save`, `light_target_x` (per-tick scratch),
`light_token`, `light_token_frame`, `light_token_budget` (policy byte, 1),
`light_appearance_installed[3]` (archetype offset installed in code pair k, or
`$FF`), `light_wave_lock`, `light_wave_remaining`, `light_wave_timer`
(§2.4), plus the ceiling policy bytes (3).

Derived and **dropped**: `light_leaderless` (now the state value),
`light_post_burst_slot` (one add: `archetype + DIFFICULTY_SETTING` at reload),
a Light live count (a four-byte scan in C, ~40 cycles, only at admission),
an appearance index (derivable from `light_code`).

**[C3] REOPENED 2026-09-21, owner instruction after step 2 — RESOLVED at step
3: the scan is kept, owner-accepted.** Three reasons, in order of weight.
(a) **It cannot desync.** A counter would be a second source of truth across
five transition sites — admission, the `LIGHT_RETIRE_Y` retire, the
fighter-only capital retire, the lethal hit, and `lifecycle_c_init` — one of
which, `BREAKUP_PENDING`, does not exist until step 4.
(b) **A desync would be silent.** The harness tests poke `light_state`
directly to force re-admission; against a counter they would drift rather than
fail, and the symptom in the game — a slot that quietly stops being
admittable — is invisible until someone counts Lights on screen.
(c) **It is not on a hot path.** The wave stepper gates its admission
*attempt* on `light_wave_timer`, so the scan runs at most once per 32-64
frames during a wave plus once per Heavy formation: a few per second, not per
frame.
**The counter stays the named mitigation**: if M1 shows the admission frame
binding, it is costed alongside the token before the ceiling is touched.

Placement: the 12 arrays at **`$7FC4-$7FF3`** (48 of the 60 unassigned bytes;
12 B left), the shared scalars in the retired **`$8100-$810F`** (16 B, 0-4 B
left). The two small unowned windows `$8126-$813F` and `$85E6-$85EE` stay
untouched for 4.6's Director state (design-4.6 §3.1 wants 6 B). Both ranges are
BSS that `lifecycle_c_init` clears at gameplay init; `$8100-$81F9` is the
boot-only GLUE hold, which is fine for the same reason it is fine today.

cc65 shape: the arrays are plain globals indexed by the static `light_slot`, so
every access is `ldy _light_slot ; lda _light_x,y` — no runtime pointer, no
`ptr1` helper, C stack stays 0 (the `source-contracts` audit must still pass).
Arithmetic in place on an indexed lvalue builds a pointer; the tick must load
to a scalar, compute, store (the pattern `lifecycle.c` already documents for
the Heavy scalars).

### 2.2 ASM: the slot loop, the hoisted install, the screen-address resolver

**One loop, in ASM, the `heavy_member_update` pattern.** `light_update` becomes
`for slot in 0..3: stx light_slot ; jsr ENEMY_LIGHT_TICK ; act on A ; contact
test`. The C tick body is single-slot (it reads `light_slot`), which is what
keeps its size near today's. The tick's return byte is exclusive:

| A | Meaning | ASM performs |
| --- | --- | --- |
| 0 | nothing | — |
| 1-3 | fire: weapon_class | `allocate` a hostile PairShot from the slot's X/top (today's emit code, indexed by slot) |
| `$40` | install appearance | copy the 16-byte bitmap named by `light_archetype[slot]` into the glyph pair of `light_code[slot]` (today's install loop, moved here, run once) |
| `$80` | spawn breakup now | `spawn_breakup_effects_at` from the slot's X / top, then `light_state[slot] = 0` is C's (the tick already set it) |

`light_shot` (per player projectile) and the contact test loop the four slots
with a two-instruction reject on `light_state,x = 0`; both set `light_slot`
before `jsr ENEMY_LIGHT_HIT`. `light_destroyed` keeps score and sound; **it no
longer spawns the breakup** — C decides when (§2.5).

**Hoisted install.** The 16-byte copy runs on the admission frame only (return
`$40`), and only when C says the pair does not already hold that bitmap
(`light_appearance_installed[k] != archetype`). `lifecycle_c_init` resets the
three entries to `$FF` because `copy_charset` has just rebuilt glyphs 120-125.
Saving: ~265 cycles per live Light per frame (ESTIMATE, §1).

**Resolver by screen address.** `light_cell_resolve` (called from the effect
render capture and the debris capture, `main.s:10429`, `:10764` via the
operand-only hooks) keeps its glyph-range fast path — a cell not in
`$F8..$FD` exits in ~8 cycles as today — and only a cell that *does* hold a
Light code scans the four slots: `dst_ptr − screen[slot]` ∈ {0, 1} with
`screen_hi[slot] != 0` selects `backing0/1[slot]` (the 16-bit subtract the
debris resolver already uses, ~25 cycles per slot). X and Y preserved as
today (debris captures cell 1 with Y = 1). **Slot count and code count are now
independent**: two slots may publish the same code.

**`light_publish`.** Erase loop over slots (any order, see the proof), then
debris publish, then render loop over slots. The render capture adds the
address resolver to its chain (`pairshot → debris → other Light → effect`), so
a Light rendered over another Light's cell stores that Light's *lower*
backing, never its glyph.

**Proof that no frame can show a Light cell restored to the wrong content.**
Invariants: (I1) a slot's `(screen, backing, code)` triple is written only by
its render and cleared only by its erase, both inside the late window; (I2)
every other layer that captures a cell holding a Light code resolves it by
address to that slot's lower backing (effects, debris, and now Lights), the one
exception being PairShots, which are rendered *above* Lights and whose erase
runs *before* the Light erase in the same window (`main.s:3017` order), so a
Light code they restore is restored by the Light erase that follows; (I3) the
Light erase restores a cell only if the cell still holds *that slot's* code —
a lower layer that overwrote it owns it; (I4) a code pair's bitmap is rewritten
only when no slot has `screen_hi != 0` with that code (§2.3). Consider any cell
showing a Light code at any scanline. By I1 it was written by some slot's
render at that slot's recorded address, or by a PairShot restore of such a
cell. In the next window the PairShot erase (if any) runs first, then the Light
erase visits that slot: by I3 it restores the slot's backing, which by I2 is the
true lower content (never another Light's glyph, never a stale effect glyph);
the slot's `screen_hi` becomes 0. If the slot died pre-fence this frame, its
erase still runs (the erase keys on `screen_hi`, not on state), which is also
why the resolver keys on `screen_hi`. By I4 the bitmap under any code visible
during the frame is the one that was installed when the cell was written.
Erase order among slots does not matter: if slot B rendered over slot A's cell,
B's backing is A's lower backing (I2); erasing B first restores it and A's
erase skips (I3); erasing A first skips (the cell holds B's code) and B's erase
restores it. Two live slots never *both* believe they own one cell.

### 2.3 Appearance handling: codes per slot, bitmap rewrite at a wave boundary

Three appearance pairs: k = 0 → codes 120/121, 1 → 122/123, 2 → 124/125. C
allocates at admission:

1. if some pair k has `installed[k] == archetype` → use it (sharing; no install);
2. else if some pair k has no slot with `light_code == code(k)` **and**
   `screen_hi == 0` for every slot that last used it → take it, set
   `installed[k] = archetype`, return `$40` on the first tick (the rewrite);
3. else refuse the admission this frame (the wave stepper retries next frame;
   `wave_count` is a request, design-4.6 §2.3).

Rule 2's `screen_hi` clause is what stops a freshly freed pair from being
rewritten while its last user's cells are still on screen (the erase happens
in the late window of the kill frame; the next frame's tick sees `screen_hi
= 0`). With two archetypes and three pairs, rule 3 never fires today; it exists
so 4.6's per-level appearances cannot fight over a pair. **Two live slots never
share a pair with different bitmaps** because `installed[k]` is the pair's
single owner-of-record and rule 1 only shares an identical archetype. Backing
stores screen codes, not bitmaps, so a rewrite between non-overlapping waves
changes what a code *looks like* without invalidating any saved backing — the
same code restored later is the same code.

### 2.4 Persistence roles, the provisional standalone wave, mutual exclusion

**Roles.** State 1 (escort) follows Heavy slot 0 exactly as today's Wingman
formation branch; when the leader dies it becomes state 2 and drifts out —
today's "leaderless" behaviour, unchanged. State 2 (free) is pass-through: the
Interceptor pursuit or the Wingman drift, retire at `LIGHT_RETIRE_Y` or at a
sector change. Both rules are expressible per slot; 4.6's `WaveDef` decides
which a member gets. Nothing in this task adds a path evaluator.

**[C4] AMENDED 2026-09-21, implementation step 3, owner-approved.**

**This section said:** the provisional wave runs in every game, and the
existing deterministic replays "diverge after the first Heavy recycle and
contain swarms naturally (no state injection, per the natural-replay rule)".

**What went wrong.** That divergence is welcome in the native PAL replays and
fatal in the build. The in-build CPU-harness replay carries *reviewed coverage
clauses* — a live Interceptor, an active explosion, debris spawn / contact /
destruction, the full effects mask — and with the wave armed it no longer
reaches "final debris destruction" (`runtime-cycles.mjs:952`). PROVED to be
the wave and not a defect: disarming the arming in `enemy_c_recycle`, changing
nothing else, makes the whole build pass. The wave simply occupies frames, so
the scripted inputs stop lining up.

**What is being done instead.** The provisional wave is **measurement
scaffolding, not behaviour the game has today** — real waves arrive with 4.6's
Director and WaveDef records. So it is compiled out of the default build and
armed only by `node scripts/build.mjs --force-light-population`
(`LIGHT_FORCE_POPULATION`, the shape `ENEMY_REVIEW_HARNESS` already uses). The
default build lands the whole multi-slot machinery and runs **one Light exactly
as today**, so every replay and every coverage clause passes unchanged. §4.3's
native measurement runs on the forced-population build.

**Why not re-script the replay:** a gate changes when the game's behaviour
changes, not so that a change can pass. 4.6 re-scripts these replays
deliberately, when swarms become real behaviour.

**Provisional standalone wave — TEMPORARY, labelled like the Heavy smoke
scheduler, replaced by 4.6.** In C, inside the Light tick when `light_slot ==
0`: if `light_wave_remaining == 0` and a Heavy formation has just recycled
(`enemy_c_recycle` sets `light_wave_remaining = 3`, `light_wave_timer = 0`,
`light_wave_lock = 1`), admit one Interceptor into a free slot every
`spacing` frames (64 / 48 / 32 by difficulty, decision 23 §10.6 scales spacing
not counts), entry X cycling 92 / 124 / 156 (four-aligned, inside 48-200);
`light_wave_lock` clears when `remaining == 0` and no slot is in state 2 or 3.
Smoke sequence: Raider + Wingman escort → Interceptor swarm of 3 → Bomber pair
→ swarm → … Nothing in the lifecycle depends on this order.

**Heavy and swarm never coexist.** Two guards, both C decisions executed by
ASM: (a) `_asm_director_can_allocate` (`c-asm-abi.s:157`, 8 B) moves from
`DIRECTOR_ABI` to `HYBRID_ASM_ARENA` and gains `lda light_wave_lock ; bne deny`
(~+12 B); the ASM Heavy retry (`interceptor_admission_update` →
`provisional_interceptor_director_request` → `DIRECTOR_REQUEST`) is therefore
refused while a wave is live, with no change to `director_c_request` (which has
no room). (b) A wave never starts while `ENEMY_ACTIVE != 0`; the frame order
(Heavy admission before the Light tick) makes the same-frame race impossible.
**In a Heavy sector at most one extra Light**: while `ENEMY_ACTIVE != 0` the
ceiling is `LIGHT_CEILING_ELITE = 1` (the escort). **Lights never appear in
CAPITAL**: the existing fighter-only lifecycle (`CAPITAL_SECTOR_STATE !=
SECTOR_FIGHTER` retires every slot) and `sector_c_drain_clear` (which must now
scan four `screen_hi` bytes) are kept.

### 2.5 The one-expensive-event token

**Where.** C, `lifecycle.c`, three bytes: `light_token` (events left this
frame), `light_token_frame` (the `FRAME_COUNTER` value the token was reset
for), `light_token_budget` (policy, 1). Any consumer first does `if
(light_token_frame != FRAME_COUNTER) { token = budget; token_frame = FRAME_COUNTER; }`
— no frame-start hook and no ASM write are needed, and the kill path
(`handle_collisions`, which runs *before* the tick loop) and the tick share
one frame budget.

**Consumers**, each `if (token == 0) defer; else --token;`:

- a Light **breakup spawn** — `enemy_c_light_hit` lethal: if the token is
  free, state 0 and return 1 (ASM spawns now); otherwise state 3
  (BREAKUP_PENDING) and return 2 (ASM scores and sounds, spawns nothing). The
  tick spawns pending breakups on the first later frame with a free token
  (return `$80`, then state 0). The slot's own erase happens in the kill
  frame's window regardless — the cheap part;
- a Light **fire** — a slot whose reload expires on a spent frame fires next
  frame (the timer simply is not decremented past zero);
- an appearance **install** on an admission frame.

**[C3] ADDED 2026-09-21, owner instruction after step 2.** A fourth consumer:

- an **admission**. A slot admission that would land on a frame whose token is
  already spent slips one frame, which nobody sees, instead of stacking two
  expensive events. This is the exact pattern that broke the fence in 4.5d.

The reason it was not on the list: step 2 MEASURED the admission frame getting
*more* expensive, not less. The glyph install already ran on the admission
frame before the hoist, so that frame lost nothing and gained the new
admission bookkeeping — `light_ceiling()` and `light_live_count()` — for
**+72 worst-frame cycles** on `2-sweep-fire4` while every standing Light frame
fell by 234. At one slot the admission frame is already the binding frame in
that replay; at three, with a wave stepper admitting repeatedly, it is a
serious candidate for the worst frame and must be serialised like any other
expensive event.

**Ordering constraint, and why admission does NOT become a consumer at step 3.**
The token arrives at step 4 by design, because §4.3's GO/NO-GO measurement
(M1) runs at step 3 **without** it: the un-serialised kill frame is the
negative control the whole decision rests on. Adding the token — to admission
or to anything else — at step 3 would destroy that control. Step 3 therefore
routes every admission through one place so that step 4 can gate it in one
edit, and M1 reports the admission frame's cost un-serialised, which is what
makes the mitigation measurable.

Heavy explosions are not consumers: Heavy and swarms never coexist, and the
ELITE ceiling is one Light.

**What the player sees.** A Light disappears, scores and sounds on the frame it
dies; its fragments appear one frame later (two or three frames when several
Lights die together) — 20-60 ms at 50 Hz. A slot in state 3 is not admittable
until its breakup has spawned; the wave stepper is spacing-limited anyway.

**Why this is enough.** Today's kill frame is 1,771 harness cycles because
`light_destroyed` spawns five effect slots *and* the same frame renders the
first stagger group (`entity_effects_render` is pre-fence). Deferring the spawn
moves ~1,000 of the 1,359 out of the kill frame (ESTIMATE from the census:
`entity_effects_render` max 851, `spawn_breakup_effects_at` ~180, score ~110)
and serialises breakups to one per frame. This is the same shape as Option E
(the player death's PMG publication deferred by a frame), and it covers the
shape of the two 4.5d misses (a Light contact kill after the enemy update had
already run).

---

## 3. Placement — exactly where everything goes

### 3.1 New window record `HYBRID_C_WINDOW`, `$B600-$BBFF` (1,536 B)

Under the owner decision in §0 (level buffer 44 → 32 sectors):

| Item | Segment / address | Bytes |
| --- | --- | ---: |
| Light C: multi-slot tick, admission (escort + provisional wave), `light_hit`, reload, appearance allocation, token, deferred breakup, ceilings | `HYBRID_C_WINDOW` (cc65 `#pragma code-name`), `HYBRID_C_WINDOW_RODATA` | ~760 ESTIMATE (600-850) |
| Light ASM kernel: `light_update` loop, `light_shot`, `light_destroyed`, `light_publish`, `light_top`, install, address resolver, sanitised resolve | `HYBRID_ASM_WINDOW` (ca65, linked in the Director link like `HYBRID_ASM_ARENA`) — **[C1] SUPERSEDED → its own link after main, reached through a vector table at `$B600`** | ~590 ESTIMATE (229 + 136 + 31 moved, + 150-250 growth) |
| **Total / free tail** | | **~1,350 / ~190 B** (range 40-400) |

Mechanics the executor must do, all with precedent: re-base `BASIC_WINDOW_RAM`
in `cfg/encounter-director.cfg` to `$B600` size `$0600`, rename it
`HYBRID_C_WINDOW_RAM`, keep the `$BC1A` guard; update `scripts/build.mjs`
(`basicWindowAddress` `:126`, the checks at `:616-627`, the reader-collision
guard at `:1697-1708` becomes "window record must lie above the level buffer
end"); the record is the **tenth DFMC record** — `MAX_CHUNKS` 9 → 10 in
`scripts/chunk-loader.mjs:11` and `CHUNK_MAX_COUNT` in the stage-2 loader
(+16 B of stage-2 overlay, design-4.6 §4 measured the previous step); the XEX
block above `$A000` needs an INITAD record, which the build already emits for
the reader (project memory: RUNAD is too late). Reader: `MAX_LEVEL_SECTORS`
44 → 32 (`sector-reader.s:123`), `LEVEL_BUFFER_RAM` size `$1600` → `$1000` in
`cfg/sector-reader.cfg`, and the header validation that bounds the sector
count. `light_add_score` (17 B, BROADSIDE pad, absolute,X) stays; it takes X
= `light_archetype[slot]`.

Runtime safety of the window: unconditionally RAM (decision B plumbing,
`disable_basic_rom` at every stage-2 entry), never written by the reader once
the buffer bound is 32 sectors, written by nothing else (the write-watch in
§5.6 proves it, as it did for the arena).

#### [C1] AMENDED 2026-09-21, implementation step 1 (branch `experiment/light-multiplicity`, after `d07d80d`), owner-approved

The row above is left as approved and marked `SUPERSEDED` so the change is
visible rather than silent. The contract the implementation is built against is
the one below. The C half is **unchanged**: `HYBRID_C_WINDOW` /
`HYBRID_C_WINDOW_RODATA` in the Director link is correct and already plumbed by
step 0.

**This section said:** the Light ASM kernel goes into `HYBRID_ASM_WINDOW`,
"ca65, linked in the Director link like `HYBRID_ASM_ARENA`".

**Why that cannot work.** MEASURED from `scripts/build.mjs` at `d07d80d`, the
build links in this order: the **Director link** (`:1001`, which emits
`build/director-abi.inc`), then **`main.s`** assemble + link (`:1064`, which
emits `build/main-abi.inc`), then the **sector-reader link** (`:1311`). The
Director link is produced *before* `main.s` and can know no main address.

The `HYBRID_ASM_ARENA` precedent does not transfer, because that code reaches
main through exactly three fixed hardware/asset constants (`COLPM1`, `COLPM2`,
`CHARSET`). MEASURED from `src/hybrid/light-wingman.s`, the Light ASM needs
**13 main-link call targets** — `apply_player_damage`,
`clear_transient_effects`, `entity_debris_publish`, `entity_effects_update`,
`entity_player_fighter_projectile_target`,
`erase_fighter_projectile_overlays`, `light_add_score`, `play_hit_sound`,
`spawn_breakup_effects_at`, `update_score_display` and the three
`resolve_effect_backing_below_*` helpers — plus **12 main-link data symbols**
(`dst_ptr`, `PLAYFIELD_ROW_LO`/`HI`, `player_x`, `player_y`, the five
`FIGHTER_PROJECTILE_*` arrays, `STAR_NEAR_POINT`, `hud_booster_backing`). None
of those addresses exists when the Director link runs.

**What is being done instead (owner decision, 2026-09-21).** The Light ASM is
its **own link after main** — a new ca65 source with its own `cfg`, built by
`buildResidentModule` exactly as `src/hybrid/sector-reader.s` is — reaching the
main-link symbols above through a generated include in the shape of
`build/main-abi.inc`, and reached *by* `main.s` through a **fixed vector table
at the window base `$B600`**, the way `main.s` reaches the reader at `$A000`
(`SECTOR_READER_ENTRY` and friends). Window address, record shape and the
`$B600-$BBFF` destination are unchanged; only which link owns the object
changes, and the window stays **one 1,536-B pool allocated at link time**
across both halves.

**Why this and not a fixed byte split of the window** (the rejected option A:
Director C at `$B600-$B9FF`, main-link ASM at `$BA00-$BBFF`, no new link): a
fixed boundary has to be chosen against two ESTIMATEs, and estimates in this
window have been badly wrong before — plan-4.3 §1.5 `[C4]` costed the reader
core at 300-360 B and MEASURED 682 B. A boundary set wrong has to be moved,
which means re-linking both records and re-running the transport, boot and
write-watch gates. One pool has no boundary to get wrong.

**Cost of the change, accepted by the owner:** the vector table, ~15 B
(5 entries × 3 B) at `$B600`; one `jmp` on each of the hot
`light_publish` / `light_shot` / `light_update` entries, **+3 cycles per call,
≈ 9 cycles per frame ESTIMATE**; and one generated include carrying the 25
symbols above. The native three-Light measurement of §4.3 accounts for all of
it, because it measures the built kernel and not the plan's arithmetic.

**Consequences elsewhere in this plan.** §3.2's "`STARFIELD` tail −31 B
linked" and "`HYBRID_C_EXT` ~518 B tail" rows are unchanged — the ASM still
leaves those segments, only its destination link differs. §4.1's ASM rows gain
the ~15 B table. §6 step 1 gains the link itself as its first result (see the
`[C1]` note there). §5.6's write-watch of `$B600-$BBFF` is unchanged and now
covers both halves.

### 3.2 What is displaced, and the free tails afterwards

| Range / segment | Before (MEASURED) | After (ESTIMATE) |
| --- | ---: | ---: |
| `$7FC4-$7FFF` unassigned | 60 B free | 12 arrays 48 B; **12 B free** |
| `HYBRID_LIGHT_STATE` `$8100-$810F` | 16 B, 16 scalars | shared scalars 12-16 B; **0-4 B free** |
| `$8126-$813F`, `$85E6-$85EE` | 26 + 9 B unowned | **unchanged, reserved for 4.6 Director state** |
| `HYBRID_C_EXT` area `$8C7D-$8FFF` (899 B) | 880 used, **19 B tail** | −369 C, −130 `light_publish`/`light_top` (LIGHT_CODE keeps `entity_debris_publish` and the two debris helpers, 67 B), `HEAVY_CODE` unchanged; **~518 B tail** — the largest resident hole the project has had since 4.3 Stage 1, available to 4.6 |
| Extension record raw / packed | 880 / 787 B (limit 960 packed) | ~380 / ~350 B, 4 sectors fewer |
| `LIGHT_RESIDENT` `$8776-$885A` (pickup stream head) | 229 B | 229 B of stream fill (addresses of `PICKUP_CODE`/`COLLISION` fixed; reusable later); pickup record cold margin 117 → ~340 B |
| `STARFIELD` tail | resolver 31 B; packed 13 B over its correction gate | −31 B linked; packed drops by ~25 B, **which may close the open STARFIELD gate decision on its own** (verify) |
| `HYBRID_C_ARENA` | 645 / 832, 187 free | +~12 B (`_asm_director_can_allocate` with the wave lock); **~175 B free** |
| `DIRECTOR_ABI` `$8701-$8775` | 117, 0 free | −8 B; **8 B free** |
| `DIRECTOR_C_CODE`, `ENTITY_CODE`, BROADSIDE, A2, sector window | 2 / 1 / 3 / 19 / 18 | unchanged |
| Level buffer | `$A600-$BBFF`, 44 sectors | `$A600-$B5FF`, **32 sectors (4,096 B)** |
| Transport | 195 sectors, 9 records | +~10 (window, LZ ~1,150 B packed) − 4 (extension) − 2 (pickup) ≈ **+4 sectors, 10 records** |
| ATR boot milestones | loader 319 / menu 576 | ≈ +8-10 frames each (2 PAL frames per sector, +1 record header): inside the +50 fail band, past the +10 warn → **re-record `boot-deadline-baseline.json` deliberately in the same commit**, reason stated (standing rule) |
| XEX | 2 reader blocks | +1 block with INITAD; menu 392 expected unchanged (blocks precede the start milestone) |

Every size-changing commit states the resulting free tails in its message and
in the memory-map override table (standing rule, project memory).

### 3.3 Why not the arena, the extension tail, or the reader's 70 B

The new C alone (~760 B) exceeds the arena (187) and the post-move extension
hole (388) *each*, and a function cannot straddle two segments. Splitting C by
function (tick in EXT, everything else in the arena) needs the tick ≤ 372 B and
the rest ≤ 171 B — both at the bottom of the estimate ranges, both leaving
zero tails, and the ASM growth would then have no home at all. The reader's
70 B hold nothing useful. Deleting the two provisional schedulers buys 50-80 B
(design-4.6 §7.1) and does not change the picture.

### 3.4 Alternatives, per AGENTS.md rule 8

| | Player-visible | RAM / code | CPU | Limits, risk |
| --- | --- | --- | --- | --- |
| **A (recommended). 1,536-B window `$B600`, buffer 32 sectors, whole Light kernel in one place** | none | −12 sectors of level buffer; +4 transport sectors; +16 B stage-2; ~190 B window tail; ~518 B EXT tail | none | owner decision on the buffer; MAX_CHUNKS 10; boot baseline re-record; native write-watch of the window and `$7FC4` |
| **B. 1,024-B window `$B800`, buffer 36 sectors, C only; ASM growth stays below `$A000`** | none | window tail ~260 B; EXT after the C leaves: 388 − (229 moved in + ~200 growth) ≈ **−40 B: does not fit** unless `LIGHT_RESIDENT` stays in the pickup stream and only grows by ≤ 7 B, which it cannot | none | rejected on bytes; kept as the number that shows why A is 1,536 |
| **C. No window: split C across EXT + arena (§3.3)** | none | fits only if C ≤ 540 B in two pieces (ESTIMATE low end 600) and leaves 0-B tails; ASM growth has no home | none | `BLOCKED_PLACEMENT`: needs ~760 + ~200 B against 575 B in two holes — the exact byte requirement |

If the owner declines A, the result is `BLOCKED_PLACEMENT` with the figures in
row C; the smallest recovery is an owner decision on any code window at all in
the level buffer.

---

## 4. Byte and cycle budget

### 4.1 Bytes (ESTIMATE unless marked)

| Item | Bytes | Basis |
| --- | ---: | --- |
| C tick, SoA, single-slot body | ~370 | 246 MEASURED today × 1.5 for `ldy _light_slot` per access (~45 accesses × +3 B) |
| C admission (escort + wave) + reload + appearance allocation | ~200 | 123 MEASURED today + wave stepper ~50 + allocation ~30 |
| C token + deferred breakup + frame reset | ~50 | three consumers × ~12 B + reset ~15 |
| C ceilings + `sector_c_drain_clear` four-slot scan + init loop | ~60 | |
| C rodata (spacing[3], entry X[3], ceilings) | ~12 | |
| ASM: `light_update` slot loop, emission by slot, install, contact loop | 229 + ~90 | today's 229 MEASURED; loop control, `light_slot` marshalling, `bit`-less return dispatch |
| ASM: `light_publish` erase/render loops, resolver in the render chain | 130 + ~60 | |
| ASM: address resolver + sanitised entry | ~45 | replaces 31 |
| ASM: `_asm_director_can_allocate` with wave lock | ~20 | arena |
| ASM: vector table at `$B600` (§3.1 `[C1]`) | ~15 | 5 entries × 3 B; main.s reaches the kernel by constant, as it reaches the reader at `$A000` |
| Stage-2 `MAX_CHUNKS` 10 | 16 | MEASURED for the 8 → 9 step |
| BSS | 48 + 16 | §2.1 |

### 4.2 Cycles (harness units unless marked native)

| Quantity | Value | Label |
| --- | ---: | --- |
| One Light today, pre-fence, mean / max | 412 / 1,771 | MEASURED (this session, HARD) |
| Glyph install, per live Light per frame | ~265 | ESTIMATE, instruction timing |
| One Light after the hoist, standing | ~147 | 412 − 265 |
| Per additional live slot: empty-slot rejects in three loops | +10-20 | ESTIMATE |
| `light_shot` per live Light per active player shot (miss) | ~31 | ESTIMATE from the routine |
| Contact test per live Light | ~35 | ESTIMATE |
| Light fire (emission) | +150 | MEASURED at 4.4c (`light_update` 515 → 662) |
| Kill frame extra today (spawn + first stagger render + score + sound) | +1,359 | MEASURED (1,771 − 412) |
| Kill frame extra with the deferred breakup (erase happens in the window; score + sound remain) | ~+350 | ESTIMATE |
| Deferred breakup frame extra (spawn + first stagger render) | ~+1,000 | ESTIMATE |
| Native Light contact kill | +3,009 | MEASURED native (STATUS) — **factor 2.2 over the harness kill** |
| Native worst margin at HEAD, two Bombers live | 1,464 | MEASURED native |
| Native Heavy-free margin | ~3,100 / 4,900-5,400 | BRIEF / ESTIMATE from Option D's standing cost |

**Standing cost of a swarm, harness, three player shots in flight:**
3 Lights ≈ 3 × 147 + 3 × 45 (slot rejects + contact) + 3 × 3 × 31 (shot scans)
≈ **860**; 4 Lights ≈ **1,150**. Today's one Light: 412 (of which 265 is the
install). So three Lights after the hoist cost about twice what one costs today.

**Worst token-serialised frame** (standing + one breakup), converted at the two
factors, against the two margins:

| Lights | Harness worst | Native ×1.6 | Native ×2.2 | vs 3,100 (BRIEF) | vs 4,900 (ESTIMATE) |
| ---: | ---: | ---: | ---: | --- | --- |
| 3 | 860 + 1,000 = 1,860 | 2,980 | 4,090 | **+120 / −990** | +1,920 / +810 |
| 4 | 1,150 + 1,000 = 2,150 | 3,440 | 4,730 | −340 / −1,630 | +1,460 / +170 |
| 3, **no token** (breakup + 2 fires) | 2,160 | 3,460 | 4,750 | −360 / −1,650 | +1,440 / +150 |

Reading: with the brief's margin, three Lights pass only at the optimistic
factor and four never pass; with the Option-D-derived margin both pass with the
token and three pass even without it at the optimistic factor. **The margin
must be measured natively before the ceiling is trusted** (step 0). The
owner's ceiling of 3 with 4 unshipped is consistent with every cell of the
table; nothing here argues for raising it.

### 4.3 The native measurement this plan requires before the token and the ceiling

Extend the opt-in `DFTRACE_LIGHT_OUTPUT` (`atari800-wall-trace.h:4295`) to
emit the four slot states (today: one). A three-Light frame needs the
multi-slot loops, so the measurement runs on the **first multi-slot build
(§6 step 3, no token yet)**, on the two new swarm replays plus
`2-sweep-fire4`. From the audit CSV rows with three live Lights and no Heavy
read: (a) the pre-wait cycles of the standing rows (native standing cost of a
swarm), (b) the worst row that contains a kill — without the token this is the
unserialised worst case, i.e. the negative control measured natively —
(c) the native cost of the breakup alone (a kill row minus the standing rows
around it). Derive the token-frame worst as standing + breakup and its margin.
**[C5] ADDED 2026-09-21, owner instruction after M1.** **M2 must FORCE the
worst coincidence, not hope a replay produces it.** M1's margins grew with
Light count because the many-Light frames of those 9,300 frames fell in a
favourable raster phase — a property of that replay set, not of the game.
Nothing makes a replay put three Lights, a kill, an admission and a volley on
one frame. So M2's evidence is the **§5.2 harness kill-and-volley test at 3 and
4 Lights**, where that coincidence is constructed: the token must keep the
frame inside the fence, and the negative control (`light_token_budget` poked
to 4) must show the same frame overrunning without it. The native repeat of
§4.3 stays, as confirmation that nothing regressed, but it is not the proof.

**The ceiling is not raised on M1's four-Light figure.** M1 measured 8,301
margin at four live Lights on those replays; that is the same favourable-phase
artefact. If M2's forced coincidence also clears at four, record it as
evidence for a later owner decision — do not act on it.

**GO for ceiling 3** if that derived margin ≥ 500 cycles with debris and a
capsule live in the same replay set; then step 4 adds the token and the same
measurement is repeated to confirm (M2). **NO-GO** otherwise, with the
measured shortfall in cycles reported and the two mitigations costed: a
lighter Light breakup (core + two fragments; a second allocator entry in the
effect pool, which would live in the window since ENTITY_CODE has 1 B) or a
shipped ceiling of 2.

**[C3] ADDED 2026-09-21, owner instruction after step 2.** Report the
**admission frame's cost separately at 1, 3 and 4 live Lights**, alongside the
vector overhead below and on the same rows. Step 2 measured it rising +72 at
one slot while the standing cost fell 234, so at three Lights it is a real
candidate for the worst frame; the token (§2.5 `[C3]`) is its mitigation and
M1 must measure it un-serialised for that mitigation to be costed.

**[C2] ADDED 2026-09-21, owner instruction after step 1b.** Report the
**vector-table overhead separately at 1, 3 and 4 live Lights.** Step 1b
MEASURED +26 worst-frame pre-fence cycles for the five-entry table against the
~9 this plan's `[C1]` estimated, because `light_backing` and
`light_cell_resolve_sanitized` are entered **per captured cell**, not once per
frame — so the overhead scales with Light count and belongs in the table of
§4.2 as its own row, not folded into the standing cost.

**Order of mitigations if three Lights miss the fence by a small margin.**
Inlining the per-cell hot path — giving the two resolver hooks main-link
bodies again instead of calling through the vector — is the **first** thing to
try, before the lighter breakup and before lowering the ceiling. State what it
would recover in cycles at the measured Light count. Lowering the shipped
ceiling to 2 stays the owner's call and the last resort. The multi-slot machinery is needed under every outcome,
so nothing built up to step 3 is wasted by a NO-GO.

### 4.4 OWNER DECISION 2026-09-21 — the margin threshold, and what 4.6 inherits

**The ~1,000-cycle figure used through step 5 was a rule of thumb, not a
measured requirement, and it is withdrawn as a gate.** The requirements are:

* **zero distinct miss events** across the audited replay set, and
* the **500-cycle** derived GO threshold this plan states in §4.3.

With fix (a) in, both audited sessions clear 500 with zero misses —
`weapon-pickup-2-hunt-fire4` **951** and
`director-complete-1-natural-sweep-fire0` **896**. The owner therefore
**accepts the resulting worst margin as the deliberate cost of Light
multiplicity**, not as a defect to be chased with bytes 4.6 will need.

What that cost is, measured per function on both binding frames
(`docs/diagnostics/light-population-m1-2026-09-21.md`): `light_shot`'s SoA slot
loop, the lifecycle logic that moved from ASM into C, address-keyed backing
resolution, and the kernel's vector table. Those are the four slots, the
shared appearance pairs and the C/ASM boundary — the features themselves.
Several hundred cycles a frame is the price of swarms.

**What 4.6 inherits, and must act on before it implements anything.** The
worst margin is now materially thinner than 4.6's design assumed: the audited
worst fighter-row margin fell from **1,713 / 1,831** at `82c155b` to
**951 / 896**. 4.6 therefore starts from a smaller budget than the figures in
its own plan were written against.

> **4.6 must set an explicit per-frame cycle budget in its plan, before
> implementation begins**, derived from the measured worst margin at the
> checkpoint it branches from — not from the historical margins in `STATUS.md`.
> A 4.6 feature that costs a few hundred cycles on a dense frame is no longer
> free.

---

### 4.5 OWNER DECISION 2026-09-21 — effect scheduling, and the limits of the token

The token is already a minimal effect scheduler: a per-frame budget, pending
states, and an ordered set of consumers. A 1-2 frame delay is invisible, so
deferrable work can move off frames that are already expensive.

**It REDISTRIBUTES PEAKS. It does not create capacity.** It makes *burst*
effects affordable — explosions, breakups, flashes, admissions — and it does
nothing whatever for *standing* per-frame costs: parallax, a second star
layer, a static Andromeda. Every frame needs those, so there is no other frame
to move them to. Do not reach for the token when the cost is standing.

**Do not build a general scheduler.** Grow the token **one consumer at a time,
when a concrete effect needs it.** Every new consumer must:

* be **visual only** — no gameplay, no score, no collision effect;
* **capture its position at enqueue**, never read state that may have changed
  by the time it runs;
* have **at most two frames of delay** before it is forced or dropped.

The risk is the stale-state class this project has already paid for twice: the
respawn double image and the launch-flash orphan. Both were a deferred visual
reading state that had moved on. The three rules above exist because of them.

**Generalise only if five or more consumers show a clear pattern.** Until then
the token stays what it is — five named consumers and a one-frame budget.

### 4.6 ASSESS 2026-09-21 — deny the token to DEFERRABLE consumers on ring-rotate frames

Owner ASSESS. **Outcome: a costed follow-up with a GO recommendation, NOT
implemented in this task** — the compare is one compare and the saving is
large and MEASURED, but the bounded-delay confirmation the ASSESS made a
precondition **fails as the token stands today**.

**The hypothesis is confirmed on the real frames.** MEASURED, native, from the
instruction trace: **both binding frames are ring-rotate frames.**
`rotate_playfield_rows` runs on `weapon-pickup-2-hunt-fire4` row 1963 and on
`director-complete-1-natural-sweep-fire0` row 2557. Across the profiled window
1953-1965 the ring rotates on **every odd row** (the cadence is 2 or 3 frames
depending on scroll rate; it is 2 in this sector) — and 1963 is odd.

**The saving.** On row 1963 the frame's deferrable expensive event is
`light_spawn_breakup`, **1,063 cycles** inclusive, and it is claimed by the
**contact-kill path inside `light_update`**, which runs **after**
`update_starfield` and therefore after the rotate. A rotate-frame denial would
see the flag exactly and move those 1,063 cycles to frame 1964 — a non-rotate
frame whose pre-fence is 15,012, with ~9,000 cycles of headroom.
ESTIMATE: that row's margin **951 → ~2,014**, above the `82c155b` baseline.

**The cost, in the claim.** `_director_c_world_row_tick` is C and already runs
**exactly once per rotate**, inside `advance_starfield_layers`. One store there
(`light_rotate_frame = FRAME_COUNTER`, ~7 cycles per rotate frame) makes the
test in the claim a **single compare** — `light_rotate_frame == FRAME_COUNTER`,
~8-11 cycles per deferrable claim, a handful of times a frame. `ENTITY_FRAME_EVENTS`
cannot serve: `entity_effects_update` `lsr`s it, and `light_update` calls that
first, so the bit is gone before the tick asks.
**Bytes: 1 B of state with no home** — `HYBRID_LIGHT_STATE` is 16 of 16 and
`HYBRID_LIGHT_SLOTS` 60 of 60 — so it needs the same placement answer fix (a)
gave: the unowned `$8127-$813F`, 25 B.

**Which consumers must NOT be deferred.**

* **The lethal hit's score and sound.** They do not take the token today —
  `light_destroyed` scores and sounds unconditionally and only the *spawn* is
  gated — and they must not start. The player sees and hears the kill on the
  frame it lands.
* **The fire cadence.** A fire is gameplay, not a visual. Gating it on a raster
  condition makes hostile fire rate a function of the scroll cadence.
* **The admission.** A Light's entry rhythm is gameplay-visible; it became a
  token consumer for cost ([C3]), not because it is deferrable. Denying it on
  every rotate frame is an owner call, not a free win.

The deferrable set is therefore the **breakup spawn** and the **appearance
install**: visual-only, each already has a pending state, each already
tolerates a frame of delay. Both satisfy §4.5's three rules.

**What the forced-coincidence test shows.** MEASURED by watching
`rotate_playfield_rows` inside `tests/light-multiplicity.test.mjs`'s
constructed frame: **it is a rotate frame in all four arms** (3 and 4 Lights,
token and negative control), costing **1,473 cycles** on that frame, with
`spawn_breakup_effects_at` landing on the same frame. The test already builds
exactly the coincidence this ASSESS is about, which makes it the right home for
the new test — and it means the token's measured savings (513 at three Lights,
942 at four) were all measured **on a rotate frame**.

**STARVATION, and the forcing rule that answers it (owner, 2026-09-21).** The
rotate half is **confirmed**: rotate frames are never consecutive (MEASURED
above), so a denied deferrable event meets a non-rotate frame on the very next
frame. The "already spent" half is not answered by the token as it stands — a
pending breakup waits for "the first later frame with a free token", with no
counter and no bound, and a rotate gate makes denials strictly more frequent.

**The rule, and it is far cheaper than a wait counter.** Because rotate frames
are never consecutive, **the gate need only apply to an event's FIRST
attempt**. An event that has already been deferred once **ignores the rotate
gate on its next try**. That bounds the delay at **two frames by construction**,
with no counter, no comparison against N and no forcing branch: the second
attempt simply is not gated.

The state it needs is **one bit per slot** — "this event has been deferred
once" — and the slot already carries `BREAKUP_PENDING` as a distinct state
value, so a second pending value encodes it without a new byte and keeps the
kernel's "hittable" test the single compare it is today (plan §2.5 put
`BREAKUP_PENDING` highest for exactly that reason; a deferred-once value
placed beside it preserves the ordering).

**Estimated worth: ~1,000 cycles of margin on the binding frames** — the
`light_spawn_breakup` measurement above.

**To do it:** the compare, the marker store in `_director_c_world_row_tick`,
the 1-B placement for the rotate marker (the unowned `$8127-$813F`), the
second pending state value, a test in `light-multiplicity.test.mjs` that fails
without the gate (the constructed frame is already a rotate frame, so the
assertions are that the spawn does not land on it, and that it does land on
the next frame whatever that frame is), and a re-run of the full replay audit,
since it changes which frame work lands on.

**NOT implemented in this session** (owner instruction, 2026-09-21).

---

## 5. Gates

Validate in proportion (AGENTS.md): the focused files on every step, the full
sets at the end. `npm test` is red at HEAD before this task (§1); every failure
name is A/B'd against a clean export of `ac0d023` before it is called a
regression.

### 5.1 PAL timing audit — full replay set, 0 distinct miss events

All 69 replays per the recorded procedure (project memory: the default run
through its pre-existing abort, the `--only-session` list, and the two
mode-gated replays under `--raider-formation-only` and `--raider-sector-only`,
plus `--debris-gate-only` and `--raider-remnant-only`). **Coverage clause,
new:** the audit run must show ≥ 200 fighter-OPEN rows with three live Lights
and ≥ 5 rows in which a Light dies while two others are live (read from the
extended `DFTRACE_LIGHT_OUTPUT` columns joined on the frame), otherwise the gate
is vacuous and FAILS as `COVERAGE`. Because the provisional wave runs in every
game, the existing deterministic replays diverge after the first Heavy recycle
and contain swarms naturally (no state injection, per the natural-replay rule
in project memory); two new sessions are added for density:
`swarm-2-hunt-fire4` (6,000 frames, HARD, hunt policy so the player sits
under the swarm and kills often) and `swarm-0-neutral-fire0` (9,000 frames,
EASY, reaches the capital and returns). Report worst margin per replay and the
binding row, as STATUS does today. Native stale-body gate: 0 rows.

### 5.2 Harness test — three and four Lights through a kill-and-volley frame

New `tests/light-multiplicity.test.mjs`, the population harness shape
(`installRuntimeSegments` + `Nmos6502`, drive `main_loop_active →
profile_after_sector` as `scripts/measure-population-harness.mjs` does). Set-up:
`director_init`, poke `light_ceiling_swarm` to 3 (then 4), admit N Interceptors
through the admission entry (not by poking arrays), advance until all are in
the fire band with `fire_timer` 0, place one player PairShot on slot 1's cells.
Assertions on the frame: slot 1 dies (scored, `state` 0 or 3), **exactly one
expensive event executed** (count breakup spawns via `EFFECT_ACTIVE_MASK`
transitions and fires via new hostile `FIGHTER_PROJECTILE_ACTIVE` entries —
sum = 1), the other fires happen on the following frames in slot order, the
pending breakup spawns on the next frame; pre-fence cycles of the frame ≤ the
same state with one Light + 1,000 (harness units). Repeat with N = 4.

**Negative control:** the same state with `light_token_budget` poked to 4:
≥ 3 expensive events on the frame and pre-fence cycles ≥ the token frame +
900. That proves the token, not chance, is what serialises the frame; the
native audit (§5.1) proves the fence.

### 5.3 A test that fails on today's build and passes on the new one

In the same file: admit a Raider formation with its Wingman escort
(`enemy_spawn_raiders`), then admit one wave Interceptor through the
admission entry; after `light_publish`, assert **two live Lights with two
distinct screen addresses and two distinct codes**, and that the resolver
returns each slot's own backing for each of the four cells. On `ac0d023` the
second admission is refused (`light_state` stays the one Wingman) and the
symbol set does not exist: the test fails there for the right reason.

### 5.4 Rendering proof tests

`light-wingman.test.mjs` "late publication" test generalised: two overlapping
Lights, erase in both orders, the cell ends as the lower backing (the I2/I3
argument of §2.2 as a test). Install test: the bitmap is written on the
admission frame only; a second Interceptor admission writes nothing; a
Wingman admission after the Interceptor pair is taken rewrites pair 1 only
when `screen_hi` of the previous user is 0.

### 5.5 Focused test set and rebaselines

Run: `light-wingman`, `light-interceptor`, `light-multiplicity` (new),
`hybrid-lifecycle`, `hybrid-c-arena`, `source-contracts`, `enemy-combat`,
`chunk-loader`, `sector-reader`, `layout-d1`, `starfield-staging-streams`,
`transport-layout-regression`, `formats`, `pal-timing-audit`, `runtime-timing`,
`focused-pal-acceptance`, `heavy-bomber`, `debris-score`, `entity-effects`.
Expected rebaselines, each with the reason in the file: `source-contracts`
(`LIGHT_ACTIVE_MAX = 1` → the new capacity text), `light-interceptor`
(single-writer contract → per-slot arrays; provisional schedule replaced by the
wave stepper), `light-wingman` (placement, every-frame install), `hybrid-lifecycle`
(extension 880 B), `hybrid-c-arena` (arena size), `chunk-loader` (`MAX_CHUNKS`
10), `sector-reader` (buffer 32 sectors), the transport/layout files (record
topology), `boot-deadline-baseline.json`.

### 5.6 Native gates

Boot smoke 8/8 on both media with the re-recorded baseline; the reader's
level-image compare and command-frame counts unchanged (XEX 0, ATR 2).
**Write-watch** across boot, gameplay, a capital sector, death, pause/quit on
`$7FC4-$7FFF` (no writes during gameplay except by the Light code), on
`$B600-$BBFF` (byte-exact to the window image, 0 foreign writes) and on
`$A600-$B5FF` (the reader writes only the read image). Debris visibility gate
on the natural replays: no new blank/partial rows (the one pre-existing
death-frame blink stays). cc65 audit: C stack 0, no runtime helpers.

---

## 6. Implementation order — one primary result per step, each buildable

0. **Owner decision** on the level buffer (44 → 32 sectors) recorded in the
   decision journal; `MAX_CHUNKS` 10 and the empty `HYBRID_C_WINDOW` record
   plumbed (build, cfg, reader bound, baseline re-record). Checkpoint: boot
   smoke 8/8, write-watch, XEX byte-identical below `$A000`.
1. **State and resolver, single slot still.** SoA arrays at `$7FC4`, shared
   scalars at `$8100`; the address resolver replaces `light_cell_resolve`;
   `light_publish`/`light_update`/`light_shot` index slot 0. Behaviour-neutral:
   `2-sweep-fire4` replays to identical numbers. Checkpoint: rendering tests.

   **[C1] AMENDED 2026-09-21** (see §3.1 `[C1]`). The step splits in three
   commits, because the resolver cannot move until the kernel has a home and
   the kernel's home is now a link that does not exist yet:
   **1a** the SoA arrays and shared scalars alone — single-slot,
   behaviour-neutral and ASM-neutral, since at one slot `LIGHT_X` simply
   becomes the base of `light_x[]`;
   **1b** the fourth link: the Light ASM moved verbatim out of `LIGHT_CODE`,
   `LIGHT_RESIDENT` and the `STARFIELD` tail into `$B600-$BBFF`, with the
   vector table and the generated include, no behaviour change. This is the
   commit that pays the tenth DFMC record, so it re-records
   `boot-deadline-baseline.json` and re-runs boot smoke and the write-watch;
   **1c** the address resolver, now able to grow in the window.
2. **Hoisted install + ceilings + `_asm_director_can_allocate` move**, still
   one physical slot. Checkpoint: rendering tests (§5.4 install cases), the
   Light delta re-measured in the harness (expect ~147 mean, down from 412).
3. **Multi-slot loops** in ASM, the SoA tick in C, the provisional wave;
   ceiling 3, no token. Checkpoint: §5.3-§5.4 tests, focused set, then the
   **§4.3 native measurement (M1)** on the first build in which swarm frames
   exist. **GO/NO-GO here.**
4. **Token and deferred breakup.** Checkpoint: §5.2 with the negative control;
   §4.3 repeated (M2) to confirm the derived margin.
5. **Full gates** (§5.1, §5.5, §5.6), documentation (STATUS, memory-map,
   hybrid-c-architecture, design-4.6 §3.2 correction, decision journal,
   plan-4.3 buffer note), `OWNER-SMOKE CANDIDATE` report: branch, HEAD, XEX and
   ATR SHA-256, CPU delta (worst margin before/after, binding row), residency
   delta with the three metrics separate, every free tail from §3.2 as measured,
   tests, known remaining issues, NEXT TASK.

Cycle cost is recorded at steps 1-4 with `measure-population-cost-deltas.mjs`
(extended to poke each slot) and `measure-routine-call-costs.mjs`, so the
harness numbers in §4.2 are re-measured rather than carried.

---

## 7. Risks, STOP conditions, GO / NO-GO

**Risks.**

- *Native margin smaller than the brief assumes* (§4.2): the ceiling of 3 is
  not measured-safe until step 0. Mitigations costed in §4.3.
- *cc65 codegen for indexed lvalues* builds `ptr1` pointers for in-place
  arithmetic; the tick must keep the load-compute-store discipline or the
  helper audit fails and the size estimate is off by a third.
- *The `light_shot` scan* adds ~31 cycles per live Light per player shot to
  `handle_collisions`, already the second-largest pre-fence routine (838 mean /
  2,251 max). Included in §4.2; if the native step-0 rows show `collisions`
  dominating, gate the scan on a live-count byte (1 B, +8 cycles).
- *Register pressure in ASM*: `light_shot` runs with X = projectile slot and
  `light_update` with X = glyph index today; slot loops need `light_slot_save`
  discipline. Bugs here show as wrong slot scored — the harness test asserts
  which slot died.
- *Code reuse glitch* if rule 2's `screen_hi` clause is skipped: one frame of a
  dead Light's cells showing the new bitmap. Covered by §5.4.
- *`DFTRACE_PICKUP_GLYPH_BASE 120`* in the tracer may classify codes 122-125 as
  pickup cells in some gate; check before the native runs.
- *Transport*: window record LZ ratio unknown until linked; if it packs worse
  than ~1,300 B, +2 sectors more. Boot band has 40 frames of slack after the
  expected +10.
- *`npm test` red at HEAD*: the A/B rule, not a risk of this task, but the cost
  of forgetting it is a false regression report.

**STOP conditions** (report, do not work around):

- window contents > 1,536 B, or any segment's free tail negative (build refuses);
- extension packed > 960 B (it should shrink; if it grows, the move failed);
- the §4.3 derived token-frame margin < 500 with three live Lights → NO-GO,
  report the shortfall, do not fix the shipped ceiling at 3;
- any distinct miss event in §5.1, any stale-body row, any COVERAGE failure;
- write-watch shows a gameplay write to `$7FC4-$7FFF` or `$B600-$BBFF` by
  anything but the Light code;
- boot milestone > baseline + 50, or XEX below `$A000` not byte-identical at step 0;
- a failing test name not in the clean-export A/B set;
- C stack ≠ 0 or a cc65 runtime helper linked;
- the reader's level compare or command-frame counts change.

**GO** when: the owner approves alternative A (or names another window) **and**
the §4.3 measurement derives a token-frame margin ≥ 500 with three live Lights.
**NO-GO** otherwise; the deliverable is then the measurement and
`BLOCKED_PLACEMENT` / `BLOCKED_PAL_MARGIN` with the exact figures.

---

## 8. Executor prompt (Opus, Medium)

```text
Implement docs/plan-light-multiplicity.md on a branch from main (ac0d023).
Start with the mandatory session-start commands and docs/STATUS.md; then read
only the plan, src/c/lifecycle.c, src/hybrid/light-wingman.s,
src/hybrid/c-asm-abi.s, cfg/encounter-director.cfg, cfg/sector-reader.cfg and
the build.mjs lines the plan names. Do not reload the roadmap or design docs.

Confirm in your first message that the owner decision in plan §0 (level buffer
44 -> 32 sectors) is recorded in docs/owner-decisions-2026-09-11.md; if it is
not, STOP with OWNER_DECISION_REQUIRED and do nothing else.

Follow §6 step by step; each step is one commit that builds, with the free
tails of every segment it changed stated in the commit message. Step 3 ends
with the §4.3 native measurement: post the three numbers and the GO/NO-GO
before writing step 4. Label figures MEASURED or ESTIMATE; never carry a number
from the plan into STATUS without re-measuring it. Run the focused tests of
§5.5 per step and the full gates of §5.1/§5.6 only at step 5; A/B every test
failure against a clean export of ac0d023 before calling it a regression
(npm test is red at HEAD by a pre-existing binding mismatch).

STOP on any condition in §7 and report it with the exact byte or cycle figure.
Do not touch .claude/, do not push, do not present the result as accepted: the
end state is OWNER-SMOKE CANDIDATE with the report shape of §6 step 5.
```
