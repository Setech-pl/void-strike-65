# Checkpoint 6 — stronger Heavy visual data

2026-10-31, branch `codex/m3h-session2`, tuning baseline `2d4ef8c`.
**OWNER-SMOKE CANDIDATE.** The owner confirmed the mechanisms work, but asked
for stronger visuals. This candidate changes existing data, host validation
and the shortcut's compiled wave flag. It adds no gameplay/rendering mechanism,
runtime instruction, state byte, PMG layer or publication path.

**Previews.** These are source-derived previews from the same generated masks
used by the linked publisher, at Atari800 PAL colours and native PMG widths.
They are labelled as previews, not emulator captures.

- [Armoured Raider and Bomber: intact / stage 1 / stage 2](damage-stages.png)
- [Assault and previous/tuned armoured colours](raider-comparison.png)
- [Armour damage, previous versus tuned](armour-damage-comparison.png)
- [Bomber damage and colours, previous versus tuned](bomber-comparison.png)

Rebuild with `node docs/diagnostics/m3h-session2/checkpoint-6-tuned/previews.mjs`.
The ordinary `scripts/heavy-damage-preview.mjs` and `heavy-look-preview.mjs`
also use the new data. Editable source remains
[`enemy-roster.json`](../../../../assets/graphics/enemy-roster.json).

**Damage.** Both bodies have 72 lit bitmap pixels intact. Stage 1 removes
**15** (20.8%); stage 2 removes **19 total**, including stage 1 (26.4%). The
remaining counts are 72 → 57 → 53. Stage 2 is independently cumulative, so
a hit which skips the first threshold still produces the complete later
shape. This is 15/19 total per stage, not 15 plus another 19.

Each stage uses the same three `[row, clearMask]` pairs as before; H13 remains
24 bytes. The masks make one connected notch through three adjacent rows
on the left wing/side. They alter the outer outline, leave each occupied row
nonempty and keep the rear/tail intact. No scattered single-pixel damage was
added. Native raster pixels removed are **60/76** for the double-width Raider
and **120/152** for the quad-width Bomber, before preview enlargement.

| Shape | Stage 1 pairs, hexadecimal masks | Stage 2 cumulative pairs |
| --- | --- | --- |
| Armoured Raider | `(2,F8) (3,D8) (4,FC)` | `(2,FE) (3,DA) (4,FE)` |
| Bomber | `(4,F8) (5,FC) (6,D8)` | `(4,FE) (5,FE) (6,DA)` |

Rows are zero-based. Only the host validator's old prohibition on edge erosion
was replaced: empty masks, nonexistent bits, duplicate/out-of-range rows,
complete row erasure and noncumulative stages still fail. Runtime stamping is
unchanged. Collision bounds, HP thresholds, movement and weapons are unchanged.
MEDIUM armour still starts at 2 HP and jumps directly to stage 2 on its first
surviving hit; HARD starts at 3 HP and can show both stages.

**Colours.** Armoured Raider is now **violet `$68`**, with its plated body;
assault keeps its original body and `$44`. The compiler default and level 2's
explicit payload override both change. Bomber HP1..5 uses the existing six-byte
lookup: **`$28/$C6/$C8/$C8/$C8`**, with the HP0 sentinel retained. Thus a
1-HP Bomber becomes orange-red, while 2 HP stays darker green.

| HP | Cruise | Hit flash | Charge | Flash while charging |
| ---: | --- | --- | --- | --- |
| 1 | `$28` | `$2C` | `$2C` | `$2C` |
| 2 | `$C6` | `$CA` | `$CA` | `$CA` |
| 3–5 | `$C8` | `$CC` | `$CC` | `$CC` |

Flash retains priority over charge; the two +4 effects never add together.
Compile-time safety and linked tests keep base luminance ≤8, effect luminance
≤12 and every effect inside its selected hue. No new runtime hue branch was
needed: only the existing lookup's HP1 byte changes.

**Shortcut only.** `--level=2:sector=5` clones the authored level and marks its
first wave armoured. It changes one wave-flag bit, `$0A → $2A`. The sector-entry
debug byte is the only other difference from the ordinary level-2 image.
Campaign wave kinds, rows, counts, spacing and later waves stay exact; the
committed campaign level's only edit is its requested armour colour.

The delivered shortcut's native MEDIUM replay shows intact armour at
**0.68 seconds** after gameplay starts, comfortably inside 15 seconds:
[native frame](native-armour-intact.png). Real collision damage later produces
the new outline: [native damaged armour](native-armour-first-hit.png).
These armour frames are from formations 1 and 2 respectively, not a claimed
same-member before/after sequence. The three Bomber frames are the same member
of formation 7: [4 HP](native-bomber-full.png) at32.62s,
[2 HP](native-bomber-hp2.png) at33.80s,
[1 HP orange-red](native-bomber-hp1.png) at34.56s.

The native capture runs the exact delivered Heavy ATR, `HEAVY_DAMAGE_REVIEW=0`,
default MEDIUM, real SIO, using joystick/fire only. It injects no HP, lives,
wave, PMG, code or phase state. The requested shortcut schedule is compiled
into the media, not forced by the observer. The read-only media copy's SHA is
checked after the replay. [Launch/provenance](native-launch.json),
[events and published body bytes](native-events.json).

**Bytes and cycles.** Compared with the linked baseline at `2d4ef8c`:

| Resource | Before → after | Delta |
| --- | --- | ---: |
| Resident hybrid window | 2,290 → 2,290 B | 0 B; **+222 B for the session**, 28 B below the 250-B ceiling |
| Arena / Director net | 830 /324 → 830 /324 B | 0 B |
| Checked content home | 1,029 /1,920 → 1,029 /1,920 B | 0 B; H13 remains24 B |
| L2 used / capacity | 1,290 /1,792 → 1,290 /1,792 B | 0 B |
| Decoded extension / packed record 5 | 875 /750 → 875 /750 B | 0 B;7 sectors |
| Packed window record 8 | 1,878 → 1,878 B | 0 B;15 sectors |
| Occupied transport sectors | 213 → 213 | 0 |
| Content load | 15 sectors,265–279 | 0 additional bytes/sectors/reads |
| New reserved RAM | 0 | 0 |

No segment or reservation grows. The window differs only at its HP1 table
datum; checked home differs only inside the existing 24-byte mask table.
Two L2 checksum-immediate values change to match the new checked content;
their instructions and timing stay the same. Arena, Director, resident main
and BROADSIDE images compare byte-for-byte identical.

**36 identical before/after linked NMOS scenarios all measure a 0-cycle
delta**: admission, row tick, idle retry, body draw, single/dual first stamps,
later stamps, and Bomber cruise/charge/flash/flash-while-charging at every HP.
First dual stamps remain1,928 Raider /2,050 Bomber instruction cycles;
later dual stamps1,506 /1,628. These fixture costs exclude ANTIC DMA.
Ordinary frame work, row-tick work and stamping add **0 cycles**. No new
physical SIO2SD load-time measurement is claimed; transport/load count is
unchanged. [Measurements and exact changed offsets](measurements.json).

**Current native quick checks, PAL with DMA on:**

| Registered route | Frames | Worst frame | Misses / extra VBI / DLI errors / shifted rows |
| --- | ---: | ---: | --- |
| capital Spread NORMAL | 1,800 | **30,465 cycles** | 0 /0 /0 /0 |
| capital-960 NORMAL | 3,967 | **31,153 cycles** | 0 /0 /0 /0 |

Both peaks equal the pre-tuning checkpoint6 results. Worst hard-gate margin
is **1,415 cycles** below32,568; target margin347 below31,500. Stale L2/world-hull
anomalies are zero; the 960 route's boss entry is325 host frames. The quick
captures' ATR hashes match the delivered campaign and capital-960 media.
[Full summaries and delivery hashes](delivery.json).

**Validation and audit.** Normal gated builds PASS for default campaign,
level2, Heavy shortcut and capital-960. Runtime release evidence remains pending;
this is not release certification. Focused gameplay checks:50 PASS /0 FAIL /
1 review-only SKIP. Actual level2 and Heavy images each pass23 /0 /1. Separate
shortcut checks prove source nonmutation and exactly one changed wave flag.

One full `npm test`: raw **1,505 PASS /139 FAIL /4 SKIP of1,648**, compared
against unchanged main `71a38a8` by file, test name, first assertion and message.
Raw comparison is A137/B2/C0. Both B cases are stale expectations of the
owner-requested changes and are corrected, with2/2 focused PASS:

- Payload art hash: re-pin only the requested armour colour byte178,
  `$46 → $68`; all other payload bytes remain exact.
- Compiler source-pattern assertion: the authored source filename now passes
  through a local variable for the shortcut override; check the equivalent
  authored-file selection and ordinary compile call.

Three optional checks skipped because their fixed `build/atari800-trace` path
was absent while this task used its own cache. After moving the private
emulator to that task-owned build path and removing optional frame/L2 observer
hooks from its separate SIO diagnostic copy, all three pass: real-SIO boot with
BASIC on/off, boss-entry audio quiescence, and debug-route evidence isolation.
The focused optional-check run is12 PASS /0 FAIL /0 SKIP.

**Audited result:1,510 PASS /137 shared FAIL /1 review-only SKIP;
A137/B0/C0.** These are raw full-run results plus the named focused corrections
and unskipped cases, not a second full suite. [Exact comparison](tests-ab.json).
Main's earlier complete failure inventory is reused only after checking its
runtime/test/build/asset inputs still equal the tested `96cbf6d` tree. Shared
debt is referenced in `docs/recorded-gate-failures.json`. Canonical release
reconciliation still fails against the legacy unit registry and old trace
predicates, also retaining the raw pre-correction assertions. No full native
matrix, home matrix, standalone native boss stress, release trace or strict
release was run.
The committed logs normalize trailing whitespace only; original raw output
remains in `.cache/m3h-session2-tune/logs/`. See [full run](npm-test.log),
[corrected expectations](corrected-cases.log), [optional checks](optional-checks.log)
and [legacy reconciliation](reconcile.log).

**Play media**, all133,136 bytes, under
`build/play/m3h-session2/checkpoint-6/`:

| File | SHA-256 |
| --- | --- |
| `campaign.atr` | `119bc32409ebcd91a583108974f079e13f708b0a6441f56e11ea19c8c4b2b50b` |
| `level-2.atr` | `686099b1c20af5ed8664a029cdb03caecb2c2f8e39921845e711fb54d362d51f` |
| `heavy-sector.atr` | `d4f2b14a4bdc93a0c0b2847d9310bae81046af8fa4ee69b2975dd4e95c5499d7` |
| `capital-960.atr` | `14180a79caa6fccff0362e9414f6fbd855893ce97f40277b5a3075e4bf42b1f4` |

For smoke, start the Heavy shortcut: violet armour is the opening wave, then
Bombers. Shoot enough to see the armour notch and the Bomber's 2-HP notch,
then its orange-red 1-HP stage. Use ordinary level2 to judge unchanged campaign
pacing. In MEDIUM the armour's first surviving hit shows stage2; the preview
also shows the stage1 used by HARD. Judge outline and colour readability in
motion, and confirm later formations start intact.

**Cleanup.** `du -sh` before → after: task cache
`.cache/m3h-session2-tune` **168M → 656K**; all worktree `.cache`
**170M → 2.9M**. The committed evidence bundle is below1 MB, well below200 MB.
`df -h /System/Volumes/Data`:926Gi total,524Gi used,**378Gi available**,59%.
Only final logs and JSON evidence remain in the task cache. Temporary builds,
baseline binaries, emulator sources/binaries, diagnostic media and working
previews were removed. The14 earlier play artifacts remain hash-identical;
the4 checkpoint6 disks were redelivered. Original tracked `dist/` was restored
byte-for-byte, and worktree `node_modules` retained. Task processes exited and
no task ports remain occupied. [Cleanup record](cleanup.json).

**NEXT: owner smoke of these tuned ATRs. STOP.** No owner acceptance, merge,
push, tag or release.
