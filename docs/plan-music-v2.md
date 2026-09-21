# Plan — music v2: menu "sketch B" and gameplay "GRA-2"

Planning session 2026-09-22 on `main` at `dc5a914`. Nothing here is
implemented. The owner approved both compositions by ear from
`assets/music/v2-drafts/MENU-B-z-pliku.mp3` and `GRA-2-z-pliku.mp3`, which
`build_v2.py` rendered **from** `menu-theme.v2.json` and
`gameplay-theme.v2.json`. The per-frame POKEY register stream those two JSON
files imply, as the reference renderer interprets them, is the specification.
The encoding may change; the music may not.

Preconditions, verified this session: worktree clean at `dc5a914`; `npm test`
on the **default** build runs to completion — 744 tests, 631 pass, 110 fail,
the release-gate and evidence-binding tests pass (recorded-failure list
unchanged, `timing_and_dli_passed`); the drafts are committed at `dc5a914`.

Labels: **MEASURED** = read from the build, the manifest, the evidence or the
draft JSON; **PROTOTYPE** = measured on a throw-away ca65 build of the v2
players run in the repo's NMOS harness against a JS oracle of the renderer's
rules (appendix A); **ESTIMATE** = instruction counting or reasoning.

---

## 0. What is true today (MEASURED)

| Item | Value | Source |
| --- | --- | --- |
| Menu player code | 216 B, `music_player_start..end`, `STARFIELD` `$58D1-$59A8` | `build/manifest.json` `menuMusic.runtimeCodeBytes`, `.lbl` |
| Menu data | 513 B, `music_data_start..end` `$5A87-$5C87` | manifest |
| Gameplay player code | 222 B, `$59A9-$5A86`, plus a 4 B self-modified read tail `game_music_read_token_tail` at `$9D21` in `ENTITY_CODE` | manifest, `.lbl` |
| Gameplay data | 124 B, `$5C88-$5D03` | manifest |
| Music state | 12 B at `$4ED9` (`MUSIC_ACTIVE` … `GAME_MUSIC_ENABLED`), inside a block asserted `<= $5000` with **0 B** slack before the TOP SCORES records | `src/main.s:289-342` |
| `music_tick_gameplay` | min **42**, max **246** cycles | manifest `gameplayMusic.normalFrameCycles` / `worstRowFrameCycles` |
| `STARFIELD` run image | 2,198 B of a 2,348 B reservation; real neighbour `HUD_BOOSTER_BACKING` `$5E06`; free tail **140 B** (`$5D7A-$5E05`) | manifest, plan-4.6-placement §2 fragment 3 |
| `STARFIELD` packed | **1,785 B**; correction gate 1,804 (**19 B** left), hard gate 1,825 (**40 B** left); staging streams A/B margins 44 / 91 B | manifest `starfieldRuntime.packedTotalGate` |
| Worst fence margin, current evidence | **1,985** cycles, `director-complete-2-natural-sweep-fire0` frame 6629 (pre-wait 23,280); next 2,981 / 3,737 / 3,868 | `build/runtime-wall-trace/pal-timing-audit.json`, 64 sessions, 0 miss events |
| SFX ownership | shot: `AUDF1/AUDC1`, `fire_timer` `$32..$38` (7 frames); hit: `AUDF2/AUDC2`, `hit_timer` 14 frames; engine bed: ch3 `$68/$22` continuous; capital explosion: ch4, `CAPITAL_EXPLOSION_SOUND_AUDCTL = 0` | `src/main.s` `play_player_fighter_projectile_sound`, `play_hit_sound`, `update_sound`, `build/capital-hulls.inc` |
| Preemption today | ch1 music suppressed while `fire_timer != 0`, ch2 while `hit_timer != 0` (`music_restore_gameplay_channels`) | `src/main.s:6100-6135` |
| Free below `$A000` after the Heavy break-up | pickup stream fill 236 → ~172 B, arena tail 114 B (C), everything else < 25 B | plan-4.6-placement §2, §7.5, §8 |
| Boot transport | **11 of 11** DFMC chunk slots used; the frame-300 loader checkpoint has 3 frames of margin and one extra boot sector trips it | manifest `transportCapacity`, STATUS "Owner decision B" |
| Level image | 2 sectors, an inert pattern nothing reads; 8-byte header checked by `sector_reader_validate`; XEX-only block at `$A600`, ATR read at START GAME (7 frames on ATR); `LEVEL_BUFFER` 32 sectors | `scripts/build.mjs buildLevelImage`, STATUS "Roadmap 4.3" |
| Zero page | `ZEROPAGE` `$80-$9F`, reader `$A0-$A1`; **`$A2-$FF` claimed by no link** | `cfg/*.cfg`, memory-map |

Draft facts (MEASURED from the JSON):

* Menu: 43 pitches (38 pure B2..C6, chromatic and contiguous, 5 buzz), 5
  instruments, 3 drums, 8 patterns × 16 rows × 4 channels, 6 frames/row,
  768 frames/loop. Per channel the 16-row columns deduplicate to **5 / 2 / 8 /
  5** distinct columns.
* Gameplay: 2 instruments (`BASS_G` on ch1, `LEAD_G` on ch2, one per channel),
  16 patterns, 1,536 frames/loop; ch1 uses **10** pitches, ch2 **9**; columns
  deduplicate to **6 / 16**.
* Every buzz divider satisfies the poly4 rule (§5).
* Peak summed volume: menu **41**, gameplay **14** (§4).

---

## 1. Player design and placement

### 1.1 Encoding (format v2 as compiled — the JSON stays the owner's format)

The JSON is kept exactly as the drafts define it (pitch table, instruments
with envelope and arp, drum macros, 16-row patterns). The converter compiles
it to this runtime form:

**Shared, menu-resident**

* `pitches[]` — 43 dividers, 1 B each. Distortion is an instrument property,
  so the table is dividers only.
* *macro page* (≤ 255 B, one page): envelopes as volume bytes with **bit 7 on
  the last entry** ("hold here"); arps as index offsets with bit 7 on the last
  entry ("wrap to start"); drums as `(AUDC, AUDF)` pairs with a `$00`
  terminator. Identical envelopes/arps are stored once.
* instrument records, 3 B each: `[AUDC base ($A0/$C0/$80, or $00 = drum),
  macro offset, arp offset]`.

**Menu patterns** — per-channel 16-row *columns*, 1 B per row:
`$00` HOLD, `$01` REST, else `select(2 bits) << 6 | (pitch index + 2)`;
`select` picks one of up to four instruments from the channel's base
(`chan_base[ch] + select`), which is how 8 instruments and 43 pitches fit one
byte. Drum tokens carry pitch field `2` so a drum with `select = 0` is not
`$00` (found by the prototype diff — appendix A). Columns are deduplicated;
the sequence is 8 bars × 4 column ids; column pointers are a lo/hi pair per
column.

**Gameplay patterns** — nibble-packed as today: two rows per byte, `0` HOLD,
`1` REST, `2..15` → a **per-channel 14-entry divider map** (10 + 9 entries
used). Columns are 8 B, deduplicated, addressed as `columns + id*8` with a
1-byte offset (176 B total, no pointer table). The sequence is two 16-byte
rows of column offsets. Envelopes: 7 + 5 B with the hold bit. **Gameplay needs
no pitch table at all** — this answers the brief's "shorter pitch table for
gameplay" option: it is 19 B of dividers, not a table.

Equivalence rules the tests enforce (they are the renderer's, restated):
a new token resets the envelope age and arp phase; HOLD keeps advancing them;
REST silences (AUDC `$00`) and forgets the voice; a volume of 0 publishes
AUDC **`$00`**, not `distortion | 0` (the prototype first wrote `$A0` — the
same silence, a different byte; the stream is the spec, so `$00`); AUDF is
don't-care while AUDC is `$00`.

### 1.2 Sizes (PROTOTYPE unless marked)

| | today (MEASURED) | v2 | Δ |
| --- | ---: | ---: | ---: |
| Menu player code | 216 | **358** | +142 |
| Menu data | 513 | **514** | +1 |
| Menu state | 6 (shared counters) | 3 counters + 24 voice state + 2 scratch = **29** BSS, **10** ZP (4 column pointers + a scratch pair) | +23 BSS, +10 ZP |
| Gameplay player code | 222 + 4 (ENTITY_CODE tail) | **286** (no tail: 1-byte column offsets replace the self-modified pointer) | +60 |
| Gameplay data | 124 | **248** (239 with the two divider maps trimmed to 10 + 9) | +124 |
| Gameplay state | 4 cached AUDF/AUDC + 2 B self-modified operand | 2 column offsets + 2 × (divider, age) = **6** | 0 |

The prototypes are un-tuned first drafts (appendix A); the implementation may
land 20-40 B under these figures, never over them by design.

### 1.3 Where it lives — the constraint

Both players and both data blocks live in `STARFIELD` today. Keeping both
there means **+331 B raw** (+142 +1 +60 +124, plus 4 B leaving `ENTITY_CODE`)
against a run tail of 140 B and a packed gate with **19 B** (correction) /
**40 B** (hard) of headroom. The packed gate, not the run tail, is the wall:
code packs at roughly 95 %, so even the gameplay data alone (+124 B) does
not fit. **Nothing below `$A000` fits the gameplay v2 player + data as one
piece either**: the largest fragment after the Heavy break-up is ~172 B
(pickup stream fill) and the arena tail (114 B) is C's. The exact shortfall is
**534 B contiguous (286 code + 248 data) against 172 B**.

Cheaper-music options do not close it (ESTIMATE): "envelope only on the lead"
saves ~30 B of code and 7 B of data; a shorter pitch table is already zero
bytes; moving only the *data* to the level payload leaves `STARFIELD` at
+83 B raw (+142 +1 +60 −124 +4), over the hard gate. So the honest answer to
the brief's question is: **the gameplay v2 player does not fit below `$A000`
without moving something, and the cheapest honest move is the one the owner
suggested — the level payload — applied to the gameplay player and its data
together.**

### 1.4 Recommended placement — G1

| Piece | Home | Effect |
| --- | --- | --- |
| **Gameplay player code + data (534 B)** | the **level image**, at `$A608` right after the reader's 8-byte header: a frozen 2-entry vector table (`start`, `tick`) then code, then data. Its own ca65 link (like the reader and the Light kernel), built after main so it can import `fire_timer`, `hit_timer`, `PLAYER_LIFECYCLE`, `MUSIC_*`, `sound_enabled`, `GAME_MUSIC_ENABLED` through a generated ABI include; main reaches it only through the two fixed vectors, the way START GAME reaches the reader at `$A000` | level image 2 → **7 sectors** (music occupies sectors 1-5; header byte 7, reserved today, records the first LevelDef sector = 6). XEX-only block grows ~640 B, **no boot cost**. ATR START GAME read +5 sectors ≈ **+19 frames** (~0.4 s, plan-4.3's 3.8 frames/sector). **0 boot-transport sectors, 0 chunk slots, frame-300 checkpoint untouched.** Below `$A000`: `STARFIELD` −346 B raw, `ENTITY_CODE` tail 1 → 5 B |
| **Menu player + data (872 B)** | `STARFIELD`, in place | net **−203 B raw** once gameplay leaves (+143 −346); run tail 140 → ~343 B; packed gate margin grows (the exact packed figure is a build output) |
| Menu voice state (24 B + 2) | the unowned BSS gap `$548A-$54E3` (fragment 2, 90 B) — no transport, no neighbour | −26 B of a gap nobody owns |
| Menu column pointers (8 B) + scratch (2) | zero page `$A2-$AB`, claimed by no link at HEAD (memory-map row to add). Fallback if the owner prefers no new ZP: four self-modified `lda $FFFF,y` sites, +16 B code, 0 ZP | |
| Gameplay state (6 B) | the same 12-B block at `$4ED9`, byte-neutral (`GAME_MUSIC_CH1_FREQUENCY..CH2_CONTROL` become divider/age pairs, `MUSIC_TOKEN` becomes a column offset pair with one spare byte) | 0 |
| The Heavy break-up's fragments (stream fill 236 B, arena 114 B) | **untouched** | the music takes 0 B from them |

Why the level payload is safe for code: the window is unconditionally RAM
since owner decision A; the XEX `INITAD` record that unmaps BASIC before a
block lands at `$A000+` already exists for the level-1 block; the level buffer
is rewritten only by `sector_reader_load`, which already requires audio to be
silent — so `music_stop_gameplay` before the read and `music_start_gameplay`
after it are the contract (4.9's level boundary inherits it); nothing else
writes `$A600-$B5FF`; the boot smoke already compares the buffer against
`build/level-1.bin` byte for byte, so the music block is gate-covered for
free. The call sites (`main_loop` in `BROADSIDE`, `resume_gameplay_audio`,
`start_gameplay` in `CODE`) reference two constants, not `$A000`/`$BFFF`
literals, so the `ENTITY_CODE` window tests are unaffected.

What it costs 4.6: the per-level image starts LevelDef at sector 6, leaving
**27 sectors (3,456 B)** of the 32-sector buffer; if 4.6's LevelDef ever
needs more, the music block moves to a "level 0" record read once at START
GAME. It also means every level carries 640 B of music on the ATR (12 levels
= 60 of 515 free sectors) — and, as a side effect, **per-level themes become
possible** later at no player cost.

### 1.5 Alternatives, for the record

* **G2 — a window record under plan-4.6 option (a)** (buffer 32 → 16
  sectors, `$AE00-$B5FF` freed): the gameplay music would share the 2,048 B
  with the 4.6 Director. Costs a 12th chunk slot (`MAX_CHUNKS` 11 → 12, +16 B
  `BOOT_STAGE2`, five copier operands move), ~5 boot sectors, the frame-300
  re-base and ~+10 ATR menu frames; couples the music to an owner decision
  4.6 has not taken. Only if the owner rejects code in the level payload.
* **G3 — scatter below `$A000`**: player split across the stream fill and the
  arena, data in a third fragment. Plan-4.6 §5 already names this failure
  mode ("placement churn"); not recommended.
* **G4 — the v1 gameplay theme kept**, only the menu replaced: fits
  `STARFIELD` (+143 B raw is over the 19/40 B packed gate too — so even G4
  needs the gameplay data to leave). Not a real option.

### 1.6 Menu and gameplay stay separate players

They do today and should: the menu tick handles 4 voices with arps and drums
and is not fence-bound; the gameplay tick is 2 voices, no arps, no drums,
and every byte of it is fence-relevant. A shared player would carry the
menu's generality into the gameplay frame for nothing.

---

## 2. Per-frame cycle cost

**Gameplay** (`music_tick_gameplay`, PROTOTYPE, worst case over a full loop
with both voices live):

| Path | today (MEASURED) | v2 | Δ worst |
| --- | ---: | ---: | ---: |
| envelope frame (5 of 6) | 42 | **122-147** | +105 |
| row frame (1 of 6), including bar advance and sequence wrap | 246 | **322** | +76 |
| row frame with the lead preempted | — | 298 | |
| dying (both voices muted, ages still advance) | — | 136 | |

The worst honest delta on any single frame is **+280** (a frame that pays 42
today and 322 tomorrow). Against the binding row — 1,985 at
`director-complete-2-natural-sweep-fire0` frame 6629 — the worst margin after
the change lies in **[1,705, 1,909]** depending on which tick path that frame
happens to be on; the next rows (2,981 / 3,737 / 3,868) stay above 2,700.
Nothing moves toward 500. The implementation session records the real figure
from the regenerated audit (§8), and `runtime-cycles.mjs` re-measures the
tick's min/max into the manifest as it does today.

The cost is bounded by construction: one nibble read per channel per row,
no loops over rows, fixed-width columns; the row frame does at most two
`gm_apply` calls and one `gm_load_bar`. The
`GAME_MUSIC_EVENTS_PER_TICK_LIMIT = 1` assert generalises to "one column byte
read per channel per row".

**Menu** (`music_tick`, PROTOTYPE): row frame **1,128** worst (four token
applies plus a bar load), other frames **338-470**. There is no fence in the
frontend; the tick runs right after `wait_frame`, ~10 scanlines of CPU before
the input poll and far above the footer DLI. Stated, not gated.

---

## 3. SFX preemption — bass keeps playing

Owner proposal: in gameplay the shot and hit SFX preempt **only the lead
(ch2)**; the bass (ch1) keeps playing; the SFX envelopes stay intact; the
lead resumes the music after the SFX.

The shot SFX is written to **POKEY channel 1** today, so "the bass keeps
playing under the shot" forces one decision the owner has to take: **where
the shot SFX goes**.

| | S1 — literal owner proposal | S3 — shot on ch4 |
| --- | --- | --- |
| Shot SFX | moves to `AUDF2/AUDC2` (with the hit) | moves to `AUDF4/AUDC4` (with the capital-hull explosion; `CAPITAL_EXPLOSION_SOUND_AUDCTL = 0`, so no clock conflict) |
| Lead preempted by | `fire_timer \| hit_timer` | `hit_timer` only |
| Bass preempted by | nothing | nothing |
| New interaction | **shot and hit now share a channel.** `update_sound` writes fire then hit each frame, so while both timers run the hit is heard and the shot's remaining frames are masked; the shot's tail resumes if it outlives the hit. The SFX envelopes are intact against the *music*, but not against each other — this is the one thing the literal proposal changes that the owner may not have intended | shots are inaudible during a capital explosion (rare, long, its own event); no shot/hit masking; the lead only ever stops for hits |
| Code | register addresses in `play_player_fighter_projectile_sound`, `update_sound`, `resume_gameplay_audio`, `music_stop_gameplay`, `pause_silence_audio`; the tick's mask becomes `fire_timer \| hit_timer` on ch2 and nothing on ch1 (**−6 B, −8 cycles** vs today's two-timer test, ESTIMATE) | same moves plus a priority test against `CAPITAL_EXPLOSION_SOUND_TIMER` in `update_sound` (~10 B, ESTIMATE) |
| `player-fire-audio.test.mjs` | re-targets its trace to `AUDF2`; the "$33..$38 complete" property holds only when no hit overlaps — the test keeps its no-hit scenario and gains a documented overlap case | re-targets to `AUDF4`; the property holds outside capital explosions |

**Recommendation:** S1 is the owner's words and the smallest change; S3 is
offered because it is the only way to keep *every* SFX envelope intact.
Owner question Q-S1 below.

"The lead resumes the music after the SFX" is free in v2: the transport and
the envelope ages advance every frame whether or not the register write is
suppressed (prototype: `gm_frame` runs on both voices, the write to `AUDC2`
is skipped while a timer is live), so on the first frame after the timers
clear, ch2 publishes the note the score is on, at the envelope position it
would have reached. Test (c) asserts exactly that.

---

## 4. Summed volume — not rescaled, owner's call

The v1 README rule "summed POKEY volume ≤ 13" belonged to the cinematic mix.
MEASURED from the drafts, per frame, music only:

| | peak sum | frames above 13 |
| --- | ---: | ---: |
| Menu, sketch B | **41** (kick 13 + bass 11 + lead 11 + arp 6) | 410 of 768 |
| Gameplay, GRA-2 | **14** (bass 7 + lead 7) | 8 of 1,536 |

Gameplay in play adds the engine bed (2) and SFX (shot `$A8`, hit `$88`:
volume 8 each, on the lead's channel under S1): worst simultaneous **bass 7 +
SFX 8 + engine 2 = 17**, plus the capital explosion when one plays. POKEY's
output is non-linear as the sum rises, which is why the old rule existed;
whether sketch B's 41 sounds like a drum hit or like clipping is a listening
judgement. **Nothing is rescaled in this plan.** The converter reports the
peak sum per theme in the manifest and the README; owner question Q-V1.
Gameplay balance against SFX is tuned in owner smoke, as the brief says.

---

## 5. Buzz bass — verified on paper, to be verified by ear

Distortion `$C` is the 4-bit poly; its period is 15 clocks, so a divider
whose `(N+1)` is a multiple of 3 or 5 aliases into a lower-order pattern and
sounds like noise. MEASURED from the draft:

| id | N | N+1 | mod 3 | mod 5 | cents |
| --- | ---: | ---: | ---: | ---: | ---: |
| C2~ | 63 | 64 | 1 | 4 | +15 |
| E2~ | 51 | 52 | 1 | 2 | −26 |
| F2~ | 48 | 49 | 1 | 4 | −23 |
| G2~ | 42 | 43 | 1 | 3 | +4 |
| A2~ | 37 | 38 | 2 | 3 | +18 |
| KICK sweep | 42, 57, 76, 91, 102 | 43, 58, 77, 92, 103 | 1, 1, 2, 2, 1 | 3, 3, 2, 2, 3 | — |

All ten pass. The rule becomes a **converter validation** ("every `$C`
divider, in pitches and drum macros, has `(N+1)` not divisible by 3 or 5") so
a future edit cannot regress it silently. E2~/F2~ at ~25 cents flat are
accepted unless the emulator says otherwise. The emulator check is a step of
the menu implementation session: run the menu in Atari800 with sound, listen
to the bass line and the kick, and record the verdict in the session report;
the register-stream tests prove the *bytes*, only ears prove the *tone*. Real
hardware remains the final word (rule 11) and belongs to owner smoke.

---

## 6. Tests — each red on the current build

All three use the repo's tooling: the converter's JS player model, and the
NMOS harness (`scripts/nmos6502.mjs` via
`scripts/weapon-pickup-runtime.mjs initialiseRuntime`) with a write hook on
`$D200-$D208`, the pattern `player-fire-audio-trace.mjs` already uses.

**(a) `tests/music-v2-stream.test.mjs` — the build's stream equals the
renderer's.** An *oracle* module (`scripts/music-oracle.mjs`, a ~40-line
port of the renderer's loop in `build_v2.py`: envelope index
`min(age, len−1)`, arp `age % len`, drum frame `age`, REST/HOLD semantics)
turns a v2 JSON into per-frame `(AUDF, AUDC)` per channel. The test compiles
both JSONs with the new converter, runs the JS player model over the compiled
bytes for one full loop plus one row (768 + 6 and 1,536 + 6 frames, so the
wrap is covered) and asserts equality with the oracle, AUDF ignored while
AUDC is `$00`. **Red today** because the tree's `assets/music/*.json` are
format 1 and the test requires `formatVersion === 2`. The same file pins the
owner-approved music the way v1 did: SHA-256 of each JSON and of its oracle
stream, so retuning needs fresh acceptance.

**(b) `tests/music-v2-runtime.test.mjs` — the binary plays that stream.**
Loads the built XEX into the harness, calls `music_start_menu` then
`music_tick` for 774 frames, reduces each frame's writes to the final register
state and compares with the oracle; then `music_start_gameplay` (through the
level-block vector) and `music_tick_gameplay` for 1,542 frames with
`fire_timer = hit_timer = 0`, `PLAYER_LIFECYCLE` alive, `sound_enabled = 1`.
**Red today**: the current players emit the v1 streams.

**(c) same file — bass never preempted, lead resumes.** Runs gameplay with the
real SFX routines: `update_sound` each frame as `main_loop` does, a
`play_player_fighter_projectile_sound` at frames 30 and 200, a
`play_hit_sound` at frame 100 (overlapping the second shot under S1). Asserts:
ch1's register state equals the oracle's ch1 on **every** frame; while either
timer is live there is **no music write** to ch2; the SFX register sequence
on its channel is byte-identical to a run with music off (envelope intact);
from the first frame after both timers reach 0, ch2 equals the oracle's ch2
(lead resumes). **Red today**: ch1 is preempted while `fire_timer` runs.

Converter validation tests (unit, in `tests/music-v2.test.mjs`): the buzz
rule (§5); pure block chromatic and contiguous; ≤ 4 instruments per channel
and ≤ 14 pitches per gameplay channel; the drum token rule; macro page ≤ 255
B; every envelope non-empty; the `channels[].preemptedBy` text must match the
decided SFX policy; peak volume sum reported; `reservedSfxChannels` 3 and 4
unchanged. `runtime-evidence-binding.test.mjs` stays in every focused set.

The existing `menu-music.test.mjs` and `gameplay-music.test.mjs` pin the v1
source SHAs, byte counts (216/513/6, 124/5) and the v1 token rules; they are
replaced by the files above, not edited around.

---

## 7. Build, assets, documentation

* **Converter:** one module `scripts/music.mjs` (validate + compile both
  themes, render the ca65 includes and the level-block data, export the JS
  player models and the oracle for tests) **replaces** `menu-music.mjs` and
  `gameplay-music.mjs`; both formats-1 modules and their includes go. The
  manifest keeps `menuMusic` / `gameplayMusic` with the new byte counts, the
  peak volume sums and the level-block address.
* **Gameplay music link:** `src/gameplay-music.s` + `cfg/gameplay-music.cfg`
  (`start = $A608`), built after main like the Light kernel, its bytes
  spliced into `buildLevelImage` after the header; header byte 7 = first
  LevelDef sector; `level-1.bin` and the XEX-only block follow automatically.
  Main gets `build/gameplay-music-abi.inc` (the two vector constants).
* **Assets:** `menu-theme.v2.json` → `assets/music/menu-theme.json`,
  `gameplay-theme.v2.json` → `assets/music/gameplay-theme.json` (git mv, so
  the approved bytes keep their history). `build_v2.py`'s *renderer* half and
  `pokey_synth.py` become `assets/music/preview/render.py` (+ `pokey_synth.py`):
  `python3 assets/music/preview/render.py assets/music/menu-theme.json out.wav`
  is how the owner auditions an edit; it reads the JSON and never writes one.
  The *composition* half of `build_v2.py` and `gameplay.py` are provenance —
  kept as `assets/music/preview/sketches/` with a `--write` guard, or deleted;
  owner question Q-A1. The two MP3s are reproducible from the JSON by the
  renderer; delete after the move unless the owner wants them kept as the
  acceptance record (Q-A1).
* **`assets/music/README.md`** rewritten for v2: the JSON schema (pitches,
  instruments, drums, patterns, sequence), the compiled encoding (§1.1), the
  validation rules (§5, §6), the preview command, the placement (menu in
  `STARFIELD`, gameplay in the level block), the SFX policy, the peak-sum
  figures and the sentence that replaces the ≤ 13 rule. Engineering document:
  English only.
* **`docs/memory-map.md`:** `STARFIELD` size and tail, `ENTITY_CODE` tail,
  the level-buffer layout (`$A600` header, `$A608` music vectors/code/data,
  first LevelDef sector), the BSS gap `$548A` rows, zero page `$A2-$AB`.
  `docs/STATUS.md` current-state rows. `plan-4.6-placement.md` gets a note
  that LevelDef starts at sector 6.
* **Not touched:** `docs/how-to-play*.md` (the music is not a player-facing
  rule change).

---

## 8. Evidence

Each implementation commit changes the artifacts, so each regenerates the
runtime evidence as its own change:

```
npm run build:candidate
npm run runtime:wall-trace -- --atari800-source=build/atari800-trace
   (the default 64 sessions, plus --raider-formation-only, --raider-sector-only,
    --debris-gate-only, --raider-remnant-only: 72 replays, and the boot smoke)
npm run build
npm test
```

`docs/recorded-gate-failures.json` is **not edited**; the default build
refuses to link if a failure appears or disappears, which is the check. The
boot smoke's two things to watch: the menu can play 4 voices on every
frontend frame (no gate, but the smoke observes the menu), and on the ATR the
START GAME read grows by ~19 frames — the smoke reads the level image back at
its observation frame and must still see it; if it observes too early, the
observation is re-based in the same commit with the reason stated, as
`boot-deadline-baseline.json` prescribes for deliberate transport growth.
The PAL audit's worst margin is reported against 1,985 (§2).

---

## 9. Owner questions

> **ANSWERED 2026-09-22.** The owner's answers are recorded in
> `owner-decisions-2026-09-11.md` §AB and repeated at each question below.
> Q-Z1 and Q-A1 are unanswered and belong to the menu session; this session
> (§10 step 2a) needed neither.


* **Q-S1 (must answer before the gameplay session): where does the shot SFX
  go?** S1 — onto channel 2 with the hit, as your proposal reads; while a
  shot and a hit overlap the hit is heard. Or S3 — onto channel 4 with the
  capital explosion; every envelope stays intact and the lead stops only for
  hits, shots are silent during a capital explosion. *Recommended: S1 as
  written, unless you want the shot never masked.*
  **ANSWER: S3.** The shot moves to channel 4 with the capital-hull
  explosion, so channel 1 (bass) is never preempted and channel 2 (lead) only
  by the hit. **Condition:** session 2b must verify that
  `CAPITAL_EXPLOSION_SOUND_AUDCTL` does not change the shot's sound while
  both are active; if it does, STOP and report — the fallback is S1.
  Belongs to session 2b; this session changed no SFX routing.
* **Q-V1: the summed volume.** Sketch B peaks at 41 (410 of 768 frames above
  the old 13). Judge it in the emulator when the menu candidate lands; the
  plan does not rescale. If it clips, the choices are per-instrument volume
  edits in the JSON (music change, re-auditioned through the renderer) — not
  a player change.
  **ANSWER: no rescale.** Sketch B stays at peak sum 41; the owner judges it
  in the emulator. Gameplay levels stay as drafted (~60 %) and are tuned in
  owner smoke.
* **Q-P1: code in the level payload (G1).** The gameplay player executes from
  `$A608` inside the per-level image, 640 B per level on the ATR, and 4.6's
  LevelDef starts at sector 6 with 27 sectors left. Yes/no. If no, G2 (window
  record, coupled to plan-4.6 option (a)) is the alternative, with its boot
  costs.
  **ANSWER: ACCEPTED, G1.** Consequence recorded, not implemented: the
  per-level payload grows by the music (~534 B at v2), so the pending owner
  decision **Q-1** (`LEVEL_BUFFER` 16 vs 24 sectors, `plan-4.6-placement.md`)
  must be re-costed with it — the owner leans to 24. Also recorded:
  **per-level music becomes possible later** (one theme per region), not in
  scope now.
* **Q-Z1: 10 bytes of zero page at `$A2`** for the menu's column pointers, or
  16 B of self-modified code instead. *Recommended: zero page.*
* **Q-A1: the sketch generators and the MP3s** — keep as provenance under
  `assets/music/preview/sketches/`, or delete (the renderer reproduces the
  audio from the JSON). *Recommended: keep the Python, delete the MP3s.*

None of these changes what the owner hears except Q-V1, and Q-V1 changes it
only if the owner decides so.

---

## 10. Effort

> **PROGRESS 2026-09-22 — step 2a is DONE, as `OWNER-SMOKE CANDIDATE`.**
> The order below was inverted for the reason §1.3 already gives: menu v2
> alone is +143 B raw against a packed gate with 19 B (correction) / 40 B
> (hard) of headroom, so **the move has to come first** or an intermediate
> commit breaks the gate. The landed order is therefore
> **2a → menu v2 → 2b**. What 2a landed:
>
> * the v1 gameplay player and its score moved into the level image behind
>   three frozen vectors at `$A608`; the POKEY write stream is byte-identical
>   over a full loop plus one row (`tests/gameplay-music-placement.test.mjs`);
> * the level image grew 2 → 7 sectors — sized for the **v2** player, so
>   session 2b moves no sectors and pays no further transport cost;
> * `STARFIELD` −346 B raw / −280 B packed, **reserved for the starfield
>   expansion** by owner decision (see `memory-map.md`, *Music v2 §1.4*);
> * two deliberate deviations from §1.4, both recorded there: the vector
>   table is **three** entries, not two (`music_restore_gameplay_channels` is
>   a real call site in `resume_gameplay_audio`), and the four-byte
>   self-modified read tail **stays in `ENTITY_CODE`**, because the boot
>   smoke checksums the level buffer during gameplay and a self-modifying
>   block would fail it. `ENTITY_CODE`'s tail therefore stays 1 B, not 5.
>
> Still to do: the menu session (§10.1), then 2b (the v2 gameplay player, the
> Q-S1 channel move and its AUDCTL condition, tests (a)/(b)/(c)).

Two implementation sessions, in this order — **agreed, with one split
inside the second**:

1. **Menu session.** Converter + validation + oracle + README + asset moves;
   the v2 menu player in `STARFIELD`; menu halves of tests (a) and (b); the
   v1 test files retired; memory-map/STATUS; evidence regeneration; emulator
   listening check of the buzz bass and the kick (§5). One session.
2. **Gameplay session**, as two commits:
   2a. *placement first, music unchanged*: the **existing v1** gameplay player
   and data move into the level block behind the two vectors; the level image
   grows to 7 sectors; boot smoke and PAL audit regenerated; music
   byte-identical (test (b)'s gameplay half is written against the v1 stream
   for this commit and rewritten in 2b). This isolates the only
   hardware-adjacent change — a new executing block in the window and a
   transport change — from the music.
   2b. the v2 gameplay player and data in the block, the SFX channel move
   (Q-S1), the preemption rule, tests (a)/(b)/(c) for gameplay,
   `player-fire-audio.test.mjs` re-targeted, evidence regenerated.
   One session if Q-S1 and Q-P1 are answered before it starts; the 2a/2b split
   is what lets it stop cleanly at a checkpoint if it is not.

Both sessions end as `OWNER-SMOKE CANDIDATE`; nothing here is accepted until
the owner has heard it on the emulator and, for the level-block placement, on
SIO2SD.

---

## Appendix A — the prototype (PROTOTYPE evidence, not committed code)

Method: a JS encoder implementing §1.1 over the draft JSONs (it reports the
byte counts in §1.2); two ca65 sources assembled and linked with the repo's
WASM `ca65`/`ld65` (`romdev-toolchain-cc65`) at `$6000`; each tick run once
per frame in `scripts/nmos6502.mjs` with a write hook on `$D200-$D208`; the
final register state per frame compared with the oracle (§6a) for one full
loop of each theme. Result: **0 mismatches** over 768 menu frames and 1,536
gameplay frames; with `fire_timer` set, 2 writes to ch1 and 0 to ch2; with
`PLAYER_LIFECYCLE = PLAYER_DYING`, exactly `AUDC1 = 0`, `AUDC2 = 0`.

Two findings the diff produced, both now encoding rules (§1.1): a volume-0
envelope tail must publish `$00`; a drum token needs a non-zero pitch field.
One harness fact: `scripts/nmos6502.mjs` does not implement `ROL A` (`$2A`);
the players must not use it (the prototype uses `LSR` runs).

### A.1 Gameplay tick, as measured (286 B with its 24-B start)

```
music_tick_gameplay:
    dec MUSIC_ROW_TIMER
    bne gm_publish
    lda #GM_FRAMES_PER_ROW
    sta MUSIC_ROW_TIMER
    lda MUSIC_PATTERN_ROW
    lsr                          ; A = row/2, C = odd row
    php
    pha
    clc
    adc GM_COL                   ; ch1 column offset (id*8)
    tax
    pla
    clc
    adc GM_COL+1                 ; ch2 column offset
    tay
    lda gm_columns,x             ; ch1 packed byte, even row in the low nibble
    plp
    bcc @even
    lsr
    lsr
    lsr
    lsr
    sta gm_tok1+1
    lda gm_columns,y
    lsr
    lsr
    lsr
    lsr
    jmp @apply
@even:
    sta gm_tok1+1
    lda gm_columns,y
@apply:
    and #$0F
    ldx #$02
    jsr gm_apply                 ; lead
gm_tok1:
    lda #$00                     ; self-modified: ch1 token
    and #$0F
    ldx #$00
    jsr gm_apply                 ; bass
    inc MUSIC_PATTERN_ROW
    lda MUSIC_PATTERN_ROW
    cmp #16
    bcc gm_publish
    lda #$00
    sta MUSIC_PATTERN_ROW
    inc MUSIC_SEQUENCE_INDEX
    lda MUSIC_SEQUENCE_INDEX
    cmp #GM_SEQ_LEN
    bcc :+
    lda #$00
    sta MUSIC_SEQUENCE_INDEX
:
    jsr gm_load_bar
gm_publish:
    lda PLAYER_LIFECYCLE
    cmp #PLAYER_DYING
    beq gm_mute
    ldx #$00
    jsr gm_frame                 ; bass: never preempted
    sta AUDC1
    lda GM_DIV
    sta AUDF1
    ldx #$02
    jsr gm_frame                 ; lead: preempted by either SFX (S1)
    ldy fire_timer
    bne @done
    ldy hit_timer
    bne @done
    sta AUDC2
    lda GM_DIV2
    sta AUDF2
@done:
    rts
gm_mute:                         ; ages keep advancing through death
    ldx #$00
    jsr gm_frame
    lda #$00
    sta AUDC1
    ldx #$02
    jsr gm_frame
    ldy fire_timer
    bne @done
    ldy hit_timer
    bne @done
    lda #$00
    sta AUDC2
@done:
    rts

; A = token (0 HOLD, 1 REST, 2..15 note), X = channel state offset (0/2)
gm_apply:
    tay
    beq @done
    cpy #$01
    bne @note
    lda #$FF
    sta GM_AGE,x                 ; $FF = resting
    rts
@note:
    cpx #$00
    bne @ch2
    lda gm_map_ch1-2,y
    jmp @store
@ch2:
    lda gm_map_ch2-2,y
@store:
    sta GM_DIV,x
    lda #$00
    sta GM_AGE,x
@done:
    rts

; X = channel state offset. A -> AUDC ($00 while resting or at volume 0).
gm_frame:
    ldy GM_AGE,x
    bmi @rest
    cpx #$00
    bne @lead
    lda gm_env_ch1,y
    jmp @got
@lead:
    lda gm_env_ch2,y
@got:
    bmi @hold                    ; bit 7: last entry, hold
    inc GM_AGE,x
@hold:
    and #$0F
    beq @rest                    ; volume 0 publishes $00, as the renderer does
    ora #$A0
    rts
@rest:
    lda #$00
    rts

gm_load_bar:
    ldx MUSIC_SEQUENCE_INDEX
    lda gm_seq_ch1,x
    sta GM_COL
    lda gm_seq_ch2,x
    sta GM_COL+1
    rts
```

State: `GM_COL` (2), `GM_DIV`/`GM_AGE`/`GM_DIV2`/`GM_AGE2` (4). Data:
`gm_columns` (176), `gm_seq_ch1`/`gm_seq_ch2` (32), `gm_map_ch1`/`gm_map_ch2`
(2 × 14, trimmable to 10 + 9), `gm_env_ch1`/`gm_env_ch2` (7 + 5).

### A.2 Menu tick, shape (358 B with its 24-B start)

Per row: for each of four channels read `(column_ptr),y` with Y = row, apply
(HOLD: nothing; REST: voice off; note: `base = (tok & $3F) − 2`, `instr =
chan_base[ch] + (tok >> 6)`, copy the 3-byte record into the voice's
`AUDC base / env pos / arp pos`, remember the arp start). Per frame, per
channel: drum (`AUDC base = 0`): publish the next `(AUDC, AUDF)` pair or
silence at the terminator; melodic: volume from the envelope (advance until
the hold bit; 0 → `$00`), pitch = `pitches[base + arp[pos]]`, arp advances
and wraps on its bit-7 entry; publish `AUDF1,y`/`AUDC1,y` with Y = 2·ch.
State per voice: `AUDC base, base pitch, env pos, arp pos, arp start, on`
(24 B) plus a 2-B scratch; four column pointers in zero page.
