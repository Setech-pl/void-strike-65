# VOID STRIKE 65 — CURRENT STATUS

Last update: 2026-10-05 (fix/boss-readability: owner decision M - the player's shots drawn in the band up to the cell that stops them, the stripped skeleton that does not block, the boss-sector stray-glyph artifact fixed, gun-3 behind one plate; owner decision N - the open bay reads open, every plate in reach)

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

> **Memory map:** the generated block at the top of [memory-map.md](memory-map.md) (`npm run memory-map`, checked by `tests/memory-map-generated.test.mjs`) is the build's own `$0000-$FFFF` map, with phases, unclaimed ranges, reservation tails and per-segment contents; it overrides every hand-written row.

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

**The roadmap 4.6 step-2 data-driven Director is `OWNER-ACCEPTED`** (owner
smoke PASS **2026-09-29**, on XEX `3c0aaea1…` / ATR `0d0d9ba9…`; section
"Roadmap 4.6 step 2 — the Director reads the level image" below). The Director's
schedule is the level image now, six named schedulers are retired, level 1 is
authored to the row step 2 measured, and transport FALLS — boot **107** unmoved,
total 209 → **208** sectors, initial block 13,652 → **13,634 B**. Its evidence
is regenerated and bound, and the default build links against it.

**The roadmap 4.6 step-1 JSON level compiler is `OWNER-ACCEPTED` too** (owner
smoke PASS **2026-09-23**, before it was merged; section "Roadmap 4.6 step 1 —
the JSON level compiler" below). Levels are authored JSON now and the level image
grows 8 → 13 sectors to carry the three LevelDef pages; at step 1 **the runtime
read none of them yet**, and every gate was unmoved — worst fence margin **991**,
DMA-on maximum **31,349**, boot **107** sectors, ATR menu **603** with all three
warn frames intact. Step 2 above is what made the runtime read the image, and it
supersedes those four figures.

**Owner decision, 2026-09-30: the game ships as the ATR only; the XEX is not
released.** Section "ATR-only build" below.

**Licensing (2026-10-01):** code and engineering docs MIT ([LICENSE](../LICENSE)); game content and the ATR as a whole CC BY-NC-SA 4.0 ([LICENSE-ASSETS](../LICENSE-ASSETS)); the names and logos are reserved; tools, AI-generated and unknown-origin images in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md); `package.json` `(MIT AND CC-BY-NC-SA-4.0)`.

**Resource budget to 1.0 (2026-10-01, `OWNER REVIEW CANDIDATE`, planning only, no artifact byte changed):** [plans/budget-1.0.md](plans/budget-1.0.md) — the inventory, what M2–M9 each spend, the first shortfall (the `$AE00` window at M5, the boss), the priced levers and the owner decisions with their latest milestone.

**Road to 1.0 — order synced (2026-10-02, `docs/plan-realizacji-sync`, docs only, `OWNER REVIEW CANDIDATE`):** [plan-realizacji.md](plan-realizacji.md) §0 records the owner's order of 2026-10-02 — showcase (next task, not yet done, includes recapturing the screenshots from the ATR) → Heavy break-up rotate gate (built) → M5 boss → M4 campaign loop → M3 + M3-H → M6 → M7 → M8 → M9; M5 before M4 supersedes the order in [plans/m3-waves-heavy.md](plans/m3-waves-heavy.md) §6.3.

**Showcase from the ATR — done (2026-10-02, `docs/showcase-atr`, media and scripts only, `OWNER REVIEW CANDIDATE`):** [plans/showcase-atr.md](plans/showcase-atr.md). The README opens with a 14-s gameplay GIF of level 1 recorded from the ATR (`npm run showcase:gif`, 384,732 B) and a PAL timing chart of the worst fence margin and the DMA-on maximum at 14 cited milestones (`npm run showcase:chart`); all nine gallery frames are recaptured from the ATR (`npm run showcase -- --capture`), so `chore/showcase-recapture` is done and the recorded `github-showcase` failure is cleared ([recorded-test-failures.json](recorded-test-failures.json)). The Blockade Breaker concept art is a README link now (owner decision 2026-10-02, the 4 MB README image budget). ATR and boot image byte-identical to `main` `c0d13c9`.

**Contact scenario redesign — done (2026-10-02, `chore/contact-scenario-redesign`, harness and evidence only, `OWNER REVIEW CANDIDATE`):** [plans/contact-scenario-redesign.md](plans/contact-scenario-redesign.md). The recorded contact failures hid four stacked faults — scenarios ending before level 1's capital sector (a), a capture oracle still requiring the P0/P3 pair retired in `800322b`, a 32-frame capture window leaking into a 16-frame clause, and a hitbox clause in the coordinates production left in `4753399` (all b). Recorded clause failures 3 → **1**: both `capital-contact-*` sessions pass; new session `lower-playfield-allied-contact-atr-hard` gates the lower-row contact raster; `lower-playfield-hostile-contact-atr-hard` stays recorded (a) until M5 (owner decision Q1). Worst fence margin 1,439 and DMA-on maximum 31,133 unmoved; `npm test` 910 tests (+2); ATR and boot image byte-identical to `main` `c59e28a`.

**M5 — the loading platform (M5a) and the boss (M5b) — plan (2026-10-03, `docs/plan-m5`, `OWNER REVIEW CANDIDATE`, planning only, no artifact byte changed):** [plans/m5-loading-boss.md](plans/m5-loading-boss.md). Owner decisions of 2026-10-02 recorded: M5 = M5a (code overlays loaded from disk at transitions, a fast SIO loader with automatic fallback) then M5b (the boss on it); `v0.2.1` is the checkpoint before the loading rework, `v0.3.0` ships after the whole of M5. The boss becomes an **overlay** in the capital-phase code's range (3,795 B of `BROADSIDE` run only while a hull is on screen) and costs the window ~170 B of hooks instead of 1,368: re-priced in the new order the window ends M6 at −38 B budgeted before any lever (was −1,238). Three probe measurements on the binding replay: one HSCROL band row above the fence −90 of margin (the budget's 72 was an instruction count), a third DLI −174, the one-Light boss frame clears GO only with the world scroll stopped in the boss sector (owner question Q1). Six sessions, the wish list (items 14–25) priced with nine recommended, owner questions Q1–Q17. **Amended 2026-10-03 with the owner's decisions on the level-summary screen** (plan §1.3, §4.8): the transition becomes a stats screen in the region's look with the region's music, loading behind it at standard speed (post-boss transition 37 sectors ≈ 2.8 s emulator MEASURED rate, ~5.6 s on a 1050-class drive ESTIMATE, against a recommended 3-s minimum display); its code lives in the splash RAM `$0500` read once per session, its art is read first; the stat counters cost the window 44 B and the initial block 0 B by design (the shots-fired hook is Q13); the letter grade and the per-level best (one save record with the high-score table, direct-SIO write) are priced with it; the fast loader becomes an optional later session. **Every owner question is answered (plan §1.4, 2026-10-03):** the boss sector stops the world scroll, 8-row band, restore variant (b), the frontend overlay deferred, speech dropped, the shots counter as a per-frame window scan (+60 cycles on every frame; the initial block keeps its room for M6's hooks), the personal best with the summary session under disk-write safety rules, the wish list accepted as recommended. End of the road (M5 → M4 → M3 → M6 with the accepted items): window −610 B budgeted / −364 expected before levers; the four remaining levers (`STARFIELD` tail 309, arena 95, pins 15, `LEVEL_BUFFER` 16 → 15 at 128) give 547, so −63 budgeted / +183 expected; the attract mode (240) gives way first if the measured figures are short at M6. Initial block after M6: 1 … 19 B to STOP. ATR and boot image byte-identical to `main` `7ccd57e`.

**M5a-S1 — overlay slot A, the capital vector table and the run read — built (2026-10-03, `feat/overlay-slot`, `OWNER-SMOKE CANDIDATE`)** (section "M5a-S1 — overlay slot A" below; plan [plans/m5-loading-boss.md](plans/m5-loading-boss.md) §4.9). The capital phase's code is contiguous in `BROADSIDE` and its first 2,048 B are slot A; every resident call into the capital group goes through a 12-entry table in the window; the sector reader reads named runs at `$A006` and restores slot A at START GAME after an overlay (restore variant (b), forced in the boot smoke); the AI pool is four lines from `assets/`. No visible change and gameplay frame-identical to `main` in all 61 trace CSVs. Owner decision 2026-10-03: the table's measured cost (worst fence margin 1,439 → **1,391**) is accepted, this session's floor 1,350; Probe B (+207 for +42 B of window) is recorded as a reserve lever. Initial block 13,621 B and transport 107 / 102 / 209 unchanged; ATR `84c7af52…`.

**M5b boss redesign — plan (2026-10-04, `docs/plan-m5-boss-combat`, `OWNER REVIEW CANDIDATE`, planning only, no artifact byte changed):** [plans/m5-loading-boss.md](plans/m5-loading-boss.md) §5.13 (owner decisions A–G in §1.6): the layered fight of [boss-concepts.md](boss-concepts.md) and the S3 core boss as a second style from one engine as data (cover groups, damage stages, sparks, band flash, hit tick, pulse and salvo fire through the hostile pool, nozzles, emitter slots by tier, the last-weapon defeat rule); MEASURED on a probe build: slot A cannot grow and cannot hold the engine with the lasers, so the C controller moves to a slot C in the low-RAM claim `$0C00-$18FF` with a region charset of its own; the worst probe boss frame (stand-in lasers, pulses, no escort) 7,339 over GO, DMA-on 29,305; sessions S4a-i / S4a-ii / S4b / S5 replace S4 / S5; owner questions Q-B1–Q-B8 (the region → style mapping, the art format, HP per kind, the hit sound, the low-RAM claim, the native pin 3,500 → 7,000, absorbed hits, the entry length). ATR and boot image byte-identical to `main` `d586228`.

**Region 1 as the layered fortress, the fight's feedback and fire — built (2026-10-05, `feat/boss-fortress-r1`, `OWNER-SMOKE CANDIDATE`)** (section "The fortress session" below; plan §5.15): owner decisions H–K after the S4a-i smoke (plan §1.6) and the owner's answers to the Phase A design (§5.15.6). Level 1's boss is the layered fortress **Blockade Breaker** — ten plates as the hull's face, four pulse cannons recessed behind them (one in an open bay, firing from the first frame), the emitter slot capped until the lasers; the S4a-i core boss stays in the engine as the Bastion fixture. Every hit reads (spark or deflection, one-frame band flash, channel-3 tick, high-contrast stages); a destroyed module disappears (owner decision L after the smoke: background below the hull, a plain cavity inside it, no rim); the boss fires pulse shots through the hostile pool; nozzles at both ends; one module drawn a frame; S4a-ii's scope included. Worst fence margin 1,370 and DMA-on maximum 31,237 unchanged; boss frames 12,523 / 28,457; the fights 36.9 / 47.1 / 71.1 s (EASY / MEDIUM / HARD, bot), lives lost 0 / 0 / 0; the entry 48 sectors, 184 host frames (EMULATOR); initial block, window, reader, `$0500` 0 B; ATR `af0180b3…`.

**M5b-S4a-i — the layered boss engine — built (2026-10-04, `feat/boss-engine`, `OWNER-SMOKE CANDIDATE`)** (section "M5b-S4a-i" below; plan §5.14): the owner's answers Q-B1–Q-B8 recorded (plan §1.6); level 1's boss is the S3 core boss rebuilt as style 2 in the layered engine (cover group, four damage stages, the defeat on the last weapon, armour optional, HP ×¾ / ×1 / ×5⁄4); the controller in slot C `$1000`, the band in its own charset at `$0C00` (the claim `$0C00-$18FF`, Q-B5); PNG drafts converted by `scripts/boss-assets.mjs` v2 and previewed by `npm run boss:preview`; region 1's art agent-drawn (decision G). Worst fence margin 1,370 and DMA-on maximum 31,237 unchanged; boss frames 13,493 / 28,079; the entry 38 sectors, 146 host frames (EMULATOR); initial block, window, reader, `$0500` 0 B; ATR `82113495…`.

**M3 wave paths and M3-H Heavy package — plan (2026-10-02, `OWNER REVIEW CANDIDATE`, planning only, no artifact byte changed):** [plans/m3-waves-heavy.md](plans/m3-waves-heavy.md) — native measurements (a held Raider saves 485 cycles; the decided descent rule returns 467 per frame with two Raiders live), the two Raider kinds and the damaged look, and three implementation sessions. Owner decisions taken 2026-10-02 (its §8.1): the sessions wait until after M4 and M5, and the rotate-gate fix for Heavy break-ups (its §9) is a standalone task that runs before M4 — **built, owner-smoked, merged and released as `v0.2.1` (`OWNER-ACCEPTED`)** (section "Heavy break-up rotate gate" below): worst fence margin 788 → **1,439**.

**Sixteen `OWNER-SMOKE CANDIDATE`s are outstanding: the M5a-S1 overlay slot**
(section "M5a-S1 — overlay slot A" below; no visible change by design, the
loader screen now draws one of four AI lines), **the all-or-nothing Spread
volley** (section "Spread volley — all-or-nothing" below; a Spread volley that
began with fewer than three free shot slots held the pool full of lone side
shots with no shot sound until Spread expired; reachable in the default level 1
ATR, typically Spread right after Rapid with fire held), **the ATR-only build** (section
"ATR-only build" below; no player-visible change: the ATR and the boot image are
byte-identical to `main` `e39f2ec`), **the pickup boost colour**
(section "Pickup boost colour — the capsule is one `PLAYER3` image in gold `$1C`"
below; the capsule leaves the GTIA fifth player and `COLPF3` for `PLAYER3` and a
dedicated `COLPM3`, so a booster mark can never wear an enemy's colour again; the
colour itself is owner-decided gold `$1C` from the 2026-09-29 hardware smoke, and
every gate moved the right way — worst fence margin 727 → **788**, DMA-on maximum
31,670 → **31,626**, ATR menu 602 → **601**, XEX 29,355 → **29,332 B**), **the
splash cassette sound and the level-loading line** (section "Splash cassette sound — the second
record is an octave down" below; the middle of the three imitated data records
drops an octave and the level loading screen reads **ENGAGING ENEMY SECTOR**
instead of `LOADING SECTOR`; **zero transport bytes for the sound** — it was
spent out of the blob's own 512-B pad — and every gate unmoved), **the Bomber
hull colour**
(section "Bomber hull colour — green" below; the Bomber leaves hue 8 for hue C,
`HULL_COLOUR_BOMBER` `$88` → **`$C8`**, because `$88` was the same byte as the
allied steel and a hostile Heavy read as friendly; **zero bytes, zero cycles**,
every gate byte-for-byte unmoved), **the capital hull set v1 step
2** (section "Capital hull set v1 — step 2" below; the enemy hull style and the
allied steel become level data, the allied steel's release default becomes the
brighter `$88` the owner chose at the step-1 smoke, and every gate is unmoved —
worst fence margin **991**, DMA-on maximum **31,349**, boot **107** sectors,
ATR menu **603** with all three warn frames intact), **the main-menu star sky**
(section "Main-menu star sky (owner decision A′)" below; sixteen twinkling stars
behind the MAIN MENU, and the one thing the owner should read before accepting
it is that it spends the boot sector the hull merge freed — boot 106 → 107,
total transport 207 → 209, ATR milestones +2/+2 to a delta of +7/+7 inside the
+10 warn band), **the capital hull set v1 step
1, now carrying the v2 FULL MASS art** (section "Capital hull set v1 — step 1"
below; the owner rejected the v1 look on hardware — a black deck interior left
the hull reading as a thin ribbon — so the hull is redrawn as full mass to the
screen edge with grooves and seams cut into it; allied hull and enemy style R1
replace the H4.2 C INDUSTRIAL pair, 74-replay PAL audit PASS with the worst
fence margin **979**, unmoved, boot smoke 8/8, boot 107 → 106 sectors, and a
full-suite failure list identical to `ded0687`), **the Heavy break-up** (section
"Heavy break-up — both archetypes" below; it closes the backlog item "HEAVY
DESTRUCTION EFFECT", and it costs the worst fence margin 1,985 → **979**, which
the owner should read before accepting it — three compliant alternatives are
tabulated there), **the debris reward** (section "Debris reward" below;
`DEBRIS_SCORE` `$05` → `$25` and a debris shot kill now counts toward the
weapon capsule), **the ADR-003
boot splash —
cassette sound, fade, SPACE/FIRE skip and the allied-blue ship** (section
"ADR-003 boot splash" below; it raises the opt-in initial-block ceiling 105 →
107 sectors, which moves the ATR milestones +4/+4 inside the warn band and is
the one owner-visible envelope change in it), **the roadmap 4.6 ring-rotate
token gate** (section "Roadmap 4.6 — the ring-rotate token gate" below;
72-replay PAL audit PASS with the worst fence margin 552 → 2,981, boot smoke
8/8, full-suite failure list identical to `4cd3024`), **owner decision A, the
ATR boot fix** (section "Owner decision A" below) — it changes the boot contract,
so it also needs a real-hardware smoke this session could not run —
**owner decision B, the open BASIC window**, and **the main-menu title colour
run** (sections below).

### Splash cassette sound — the second record is an octave down, and the level loading line (`OWNER-SMOKE CANDIDATE`, 2026-09-23)

Two owner requests of 2026-09-23, on two **different** screens.

**1. The splash (the start-up screen with the ship): the three data blocks no
longer sound identical.** The leader tone is unchanged and so are records one
and three. The **middle** record is now `DATA_LOW` — the **same pure tone with
its divider doubled**, one octave down.

| | mark | space |
| --- | ---: | ---: |
| `DATA` (records 1 and 3) | AUDF 5 → 5,278 Hz | AUDF 7 → 3,959 Hz |
| `DATA_LOW` (record 2) | AUDF **11** → **2,639 Hz** | AUDF **15** → **1,979 Hz** |

The owner preferred the octave over a second waveform if both cost the same,
"because it reads as a different kind of block rather than as a glitch". **The
buzz rule does not block it:** the "(N + 1) not divisible by 3 or 5" rule
governs **poly-4 / buzz** dividers, and this channel is `AUDC_BASE = $A0`, a
**pure tone**, so the rule does not bind. (Stated because mark 11 gives
`N + 1 = 12`, divisible by 3 — forbidden on a buzz channel, irrelevant here.)
The sound contract is [plan-boot-splash-cassette.md](plan-boot-splash-cassette.md)
§2.3.1, updated to match what ships; the segment is data in
`assets/audio/boot-splash.json`, so the owner retunes it without a code change.

**2. The level loading screen reads `ENGAGING ENEMY SECTOR`.** Was
`LOADING SECTOR`. MEASURED fit before the change: 21 characters on the 40-column
ANTIC 2 line, every character inside the frontend glyph contract
(`A-Z 0-9 space - . / :`), and the sector reader had **70 free bytes** for a
7-byte string. It is written through its own row constant, `LOADER_ENGAGING_ROW`
at column 9, because `LOADER_STATUS_ROW`'s column 12 centres the 16-character
`DISK READ FAILED` line it shares and would have left the longer string three
columns right of centre. The failure screen is untouched.

**Cost — MEASURED, and the sound cost nothing to transport.** `src/boot-splash.s`
pads itself to a fixed `SPLASH_BLOB_BYTES` (`$0200`) window, so the transported
blob is 512 B whatever the code inside it weighs. The octave test is **+11 B of
blob code spent out of that pad**: code **499 → 510 B, pad 13 → 2 B free, blob
still 512 B**. `DATA_LOW` numbers 3, above `DATA`'s 2, so `splash_segment_load`
admits both with the `cmp` it already had, `bne` → `bcc` — no extra byte. The
loading string is **+7 B** in the sector reader (free tail **70 → 63 B**), which
does not change its chunk's sector count.

| | `6e05644` | delivered |
| --- | ---: | ---: |
| initial block content / ceiling | 13,652 / 13,684 (32 B) | **13,652 / 13,684 (32 B)**, unmoved |
| boot / extension / total sectors | 107 / 102 / 209 | **107 / 102 / 209**, unmoved |
| splash blob code / window | 499 / 512 B | **510 / 512 B** (2 B pad left) |
| sector reader free tail | 70 B | **63 B** |
| XEX / ATR bytes | 28,383 / 92,176 | **28,390** / **92,176** |

**This closes backlog item 2 of "Splash initial-block reclaim, and then the
cassette-sound variation", and corrects its reasoning.** That entry deferred the
sound because "any real byte added to splash code costs a boot sector". True of
the **initial block**; not true of the **blob**, whose window is fixed and still
had 13 B of pad. Item 1 (packing the blob and `A2_KERNEL`) is untouched and
still worth doing.

**What the owner checks.** On the **splash**: the middle of the three bursts of
data chatter should sit an octave lower — same texture, lower pitch — with the
leader tone and the first and third bursts unchanged. On the **level loading
screen**: the line under the title should read `ENGAGING ENEMY SECTOR`, centred.

### Bomber hull colour — green (`OWNER-SMOKE CANDIDATE`, 2026-09-23)

The owner's smoke of 2026-09-23 rejected the Bomber as blue. The cause was not
a near miss: `HULL_COLOUR_BOMBER` was **`$88`**, which is the **same byte** as
`GAMEPLAY_COLPF1`, the allied steel. That register carries the allied capital
hull body, the Light steel arms and the `PULSE`/`LASER`/`BOMBER` shell trails,
so in capital sectors a hostile Heavy wore the allied hull's own colour and in
fighter sectors it wore the colour of the shots aimed at it.

**What changed.** One constant. `BOMBER_HULL_HUE` `$80` → **`$C0`**,
`HULL_COLOUR_BOMBER` now derived as `BOMBER_HULL_HUE | $08` = **`$C8`**
([../src/c/lifecycle.c](../src/c/lifecycle.c)). The ramp shape, the charge
`+4`, the flash `+6`, the compile-time overflow assertion (renamed
`bomber_hull_ramp_must_stay_inside_its_hue`) and the recycle path that restores
`HULL_COLOUR_RAIDER` `$44` for the capital broadside missiles M1/M2 are all
untouched.

| HP | base | + charge (+4) | + flash (+6) |
| ---: | ---: | ---: | ---: |
| 4 | `$C8` | `$CC` | `$CE` |
| 3 | `$C6` | `$CA` | `$CC` |
| 2 | `$C4` | `$C8` | `$CA` |
| 1 | `$C2` | `$C6` | `$C8` |

**Why green and not the owner's red fallback.** Gameplay uses **no hue C at
all** — white `$0E`, allied steel hue 8, allied faction amber `$1E`, hostile
burgundy `$44`/`$46` — so green is the only hue that separates from steel,
burgundy and amber at once. Red does not: `$40 | $08` = `$48` ramps through
**`$44` at 2 HP, byte-identical to the Raider**, which is the very collision
4.5d moved the Bomber to fix. The frontend and loader greens (`$D8`, `$D0`) are
hue D, on screens gameplay never shares. The red build exists anyway so the
owner can check that on hardware: `npm run bomber:hull:red` →
`build/bomber-hull-red/` (review variant, never `dist/`, no gate consults it).
Green is the default and needs no flag: `npm run build` → `dist/`.

**Cost: zero.** `heavy_hull_colour` is already per-archetype C data that the
veneer copies to COLPM1/COLPM2 (`heavy_publish_hull_colour`,
[../src/hybrid/c-asm-abi.s](../src/hybrid/c-asm-abi.s)), so no new DLI, no new
register, no new per-slot byte, no new code path. Every transport number is
byte-for-byte what it was.

**Gates — the DEFAULT build.** XEX
`2327efb28cff393816095a7db570947efa6cda41c1d8a57aa4bc2f3e76b9944c` (28,383 B),
ATR `1f7d465449f1adf6f1f5bdb80af6951ceb7f7dd0fe2c5f71cd0710162a69c341`
(92,176 B), boot
`a9a259db3a103f6c6a09a570aa682f818946c4012c6a3d4125a7f9732ab01243`.

| | `95ffffa` | delivered |
| --- | ---: | ---: |
| worst fence margin (GO ≥ 500) | 991 | **991** |
| DMA-on maximum | 31,349 | **31,349** |
| physical headroom | 4,219 | **4,219** |
| rows over the 31,200 target | 4 + 3 | **4 + 3** |
| recorded clause failures | 40 | **40**, same names, 0 new, 0 disappeared |
| initial block content / ceiling | 13,652 / 13,684 | **13,652 / 13,684** (32 B) |
| boot / extension / total sectors | 107 / 102 / 209 | **107 / 102 / 209** |
| XEX / ATR bytes | 28,383 / 92,176 | **28,383 / 92,176** |
| ATR menu deadline | 603 (+7, 3 warn frames left) | **603**, unmoved |

**PAL audit — 74 replays, 0 distinct miss events, 0 rows over the hard gate, 0
deadline overruns, 0 missed frames.** Worst frame still
`director-complete-2-natural-sweep-fire0` at **991**; the two replays over the
31,200 target are still `director-complete-1-natural-sweep-fire0` (4 rows) and
`raider-remnant-rapid-xex-hard` (3). **Boot smoke 8/8**, milestones unmoved:
XEX 135/392, ATR 346/603.

Evidence re-recorded because the artifact SHAs moved (the constant is in the
binary): `build:candidate` → `runtime:wall-trace
--atari800-source=build/atari800-trace` → `build`, one unbroken default run.
`docs/media` is regenerated and **committed** this time rather than restored —
the committed manifest on `95ffffa` still named a 21,399-byte XEX that no
longer exists, which is why the showcase sheets disagreed with `dist/`.

**Tests.** `npm test` on the **default** build. One new assertion, which is the
cheap check the tree did not have: `tests/heavy-bomber.test.mjs` now reads the
Bomber hue out of `src/c/lifecycle.c` and the allied steel out of `src/main.s`
and `scripts/build.mjs`, and fails the moment a hostile hull and the player's
own side share a hue again. Pinning the enemy hue against the *other enemy* was
never enough.

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

## Boss readability — shots up to the boss, the skeleton that does not block — `OWNER-SMOKE CANDIDATE` (2026-10-05)

Plan and as-built record: [plans/m5-loading-boss.md](plans/m5-loading-boss.md)
§5.16 (decision M and its refinements M1, M2 in §1.6; Phase A §5.16.1-5.16.5,
as built §5.16.6; decision N §5.16.7). Branch `fix/boss-readability` from `main` `a55d2a5`. Smoke:
[hardware-testing.md](hardware-testing.md) §16.

**What changed.** The player's shots are **drawn inside the boss band up to
the cell that stops them** (option a): per column a stop line - the front
module's bottom row, else the hull's own stop row, else open sky - kept with
the column map; on its way a shot is drawn in blank cells in **light steel**
(the band colour closest to the playfield shot's pale yellow; an exact match is
not possible) and passes behind anything drawn; past the band's top it is
removed (so no shot glyph appears in the region's charset on the divider row).
**Hull art below the hull line stops nothing** (decision M; `hullRows` 4 for
region 1); the thin strip under a recessed cannon is passed behind (M1). **A
boss-sector defect is fixed**: a hull hit in the frames after a plate's kill
used to place its deflection on the dead plate's still-drawn cell, and the
ring wrote the broken-plate glyph back after the plate was erased - a stray
fragment hanging under the hull for the rest of the fight (plan §5.16.1); the
deflection now lands on the hull's own stop cell. Region 1's drafts: girders
end one row under the hull line, the bay's wall strips are gone, **plate-e
spans all of gun-3's columns** (36-40, 10 HP; plate-f 41-42, 6 HP), so every
cannon's cover is what stands in front of each of its columns. **The capital
sector**: no stray bytes there (14 shot-over-shell crossings in a 1,800-frame
trace unwind exactly); the shot's opaque cell hiding half a shell for a frame
or two is known and accepted (decision M2). **Decision N, after the owner's
smoke** (§5.16.7): the open-bay cannon (gun-2) sat in a bay of its own three
columns with plates touching it - the bay is now columns 25-29, a clear column
each side (gun-1 moved to 22-24, plate-c 21-24, plate-b 17-20, plate-d 30-34);
the two far-left plates "surviving" were the engine's reach, not its collision
(every plate dies to its hit points in every column; a player shot starts at
the fighter's centre, so the cowl plates under the engine housings were in
reach at 8-23 of the band's 64 positions) - **the cowl plates are removed**,
the least-reachable armour column is now plate-a's at 24 of 64. Data only.

| | `main` `a55d2a5` | this branch | source |
| --- | ---: | ---: | --- |
| worst line-238 fence margin | 1,370 (`2-evasive-fire3` f287) | **1,370** (the ten worst rows `main`'s, value for value) | fence scan of the replay CSVs (`scripts/pal-timing-audit.mjs` samples), boss and boss-entry rows apart, 0 miss events |
| boss frames: worst fence margin / DMA-on | 12,523 / 28,457 (11,958 frames) | **11,653 / 28,691** over 11,979 boss frames (GO 500, gate 32,568) | same |
| boss per-frame work, native (limit 7,000) | 6,676 (fortress), 5,289 (core boss) | **6,678** (fortress, five hits a frame; 6,876 before decision N's smaller layout), **5,516** (core boss) | `tests/boss-fortress.test.mjs`, `tests/boss-runtime.test.mjs` |
| DMA-on maximum | 31,237 (`director-complete-2` f5797) | **31,237** (same row) | `docs/runtime-wall-trace.json` |
| behavioural clause failures | 1 (`lower-playfield-hostile-contact-atr-hard`) | **1**, the same | [recorded-gate-failures.json](recorded-gate-failures.json) |
| gameplay against `main` | — | **63 of 63 replay files identical** on 331 gameplay columns frame by frame up to the boss entry | trace CSVs of both builds |
| the fights, EASY / MEDIUM / HARD (bot, held lives) | 1,847 / 2,353 / 3,557 frames (36.9 / 47.1 / 71.1 s); hits 2 / 3 / 7; lives lost 0 | **2,010 / 2,711 / 3,307 frames (40.2 / 54.2 / 66.1 s)**; hits **1 / 6 / 3**; lives lost **0 / 0 / 0** | same |
| boss entry (EMULATOR) | 48 sectors, 184 host frames (3.7 s) | **49 sectors, 188 host frames (3.8 s)** | same |
| `npm test` (default build) | 1,056 / 1,055 / 1 | **1,074 / 1,073 / 1**: `preview` (recorded) | [recorded-test-failures.json](recorded-test-failures.json) |
| initial block / boot sectors | 13,621 B / 107 | **13,621 B / 107** | `build/manifest.json` |
| extension / total transport sectors | 104 / 211 | **104 / 211** | same |
| ATR menu frame (baseline 596) | 550 (BASIC 541) | **550** (BASIC 541) | boot smoke |
| `$AE00` window free | 1,316 | **1,316** | `residentCapacity.basicWindow` |
| slot A (boss) | 1,963 of 2,048 B | **1,995** (53 free, 16 sectors) | `build/boss.lbl`, manifest `boss` |
| slot C `$1000-$17FF` | 1,748 of 2,048 B (13 sectors) | **2,003** (code + rodata + ASM 1,782, 14 sectors; BSS 221) | same |
| install run / scratch page | 346 of 384 B / 237 of 256 B | **346 / 249** | same |
| slot B | 768 B | **768 B** | same |
| region 1 charset at `$0C00` | 938 B, 109 of 128 codes, 8 sectors | **994 B, 112 of 128 codes, 8 sectors** (the region run 16 of 16) | manifest `boss.regions` |
| `$0500` summary module / sector reader | 115 free / 29 free | **unchanged** | manifest |
| low RAM | `$0C00-$18FF` the boss's claim; `$1900-$1FFF` unclaimed | **unchanged** | generated memory map |
| disk | 528–559; region 1 632–647 | **528–560** (code 16, install 3, slot C 14); region 1 632–647 | `build/manifest.json` |
| ATR SHA-256 | `af0180b356ec33bf…` | **`de4bb4f09407e3a7c328a40c2b11026069b12d887c4c5bb22425dc28a5a8223b`** | `dist/` |
| boot SHA-256 | `b84ab9dbd4355ae8…` | **`b84ab9dbd4355ae86644b8bd98cdfd3959e76e273a2a81d7554f4e12f64d7ce2`** (unchanged) | `dist/` |

Debug-route ATRs (`build/<variant>/`, never `dist/`): level 1's boss sector
`build/level-1-s4/void-strike-65.atr` `1f8718b179f8e2a1…`; its capital sector
`build/level-1-s1/void-strike-65.atr` `c96ec5a54822ca61…`.

**Read before accepting.** The stress pin reads 6,678 of 7,000 (the owner's
note: reviewed in S4b against the boss-frame margins, which are above 11,000).
**Slot A has 53 B, slot C 45 B, the scratch page 7 B left**: S4b's lasers
still need the next once-per-entry ASM out of slot A first (plan §5.15.7 item
9). In the band a shot is light steel, not the playfield's pale yellow (answer
2). The fight's lengths moved (EASY +3.3 s: shots now fly to their stop cell;
MEDIUM +7.1 s after decision N's layout; HARD −5 s: gun-3 needs one plate). The
cowl plates under the engine housings are gone (decision N: out of reach). Region 1's art stays the agent-drawn
placeholder (decision G). **Smoke on copies** (§12).

**NEXT TASK:** the owner's smoke (`hardware-testing.md` §16); then S4b
(`feat/boss-lasers`), not started.

## The fortress session — region 1 as the layered fortress, the fight's feedback and fire — `OWNER-SMOKE CANDIDATE` (2026-10-05)

Plan and as-built record: [plans/m5-loading-boss.md](plans/m5-loading-boss.md)
§5.15 (decisions H–K in §1.6, the Phase A answers in §5.15.6, as built
§5.15.7). Branch `feat/boss-fortress-r1` from `main` `f88b7cb`. Smoke:
[hardware-testing.md](hardware-testing.md) §15.

**What changed.** Region 1's boss is the layered fortress **Blockade Breaker**
(decision H): fifteen modules — ten armour plates of nine sizes up to 6 × 4
that make up the hull's lower face, four pulse cannons recessed behind them
(`gun-2` in an open bay fires from the first frame; `gun-3` sits behind two
plates), the emitter slot capped until the lasers (S4b). The boss falls with its
last cannon; armour may stand. The S4a-i core boss stays in the engine as
`assets/graphics/boss-regions/bastion/` (style-2 fixture, a later region's boss
at S5). Every hit reads (decision J): a spark on a damaging hit, a deflection on
a hull or covered hit, the band's one-frame flash, three distinct channel-3
ticks with the engine bed back after two frames; cracked plates darken with
black fractures, broken ones are torn with amber edges, and **a destroyed
module disappears** (owner decision L after the smoke, plan §5.15.8): its rows
below the hull become band background, its rows inside the hull a plain dark
cavity, no rim — the cannon a fallen plate exposes shows whole. The boss fires (decision I): PULSE
shots through the shared hostile pool from each exposed cannon's centre, one
countdown, a muzzle flash; salvo launchers (S5's region 4) fire three on three
frames. Nozzles at both ends animate and go dark at the defeat (decision K).
The module limit stays 16 (owner answer: option A) with a one-module-a-frame
draw queue and the exposure check a frame after a kill; `boss_prepare` moved
into slot C. **A defect the trace found was fixed here**: the player's damage
cooldown froze in the boss sector (plan §5.15.7 item 1).

| | `main` `f88b7cb` | this branch | source |
| --- | ---: | ---: | --- |
| worst line-238 fence margin | 1,370 (`2-evasive-fire3` f287) | **1,370** (the ten worst rows are `main`'s, value for value) | fence scan of the replay CSVs (`scripts/pal-timing-audit.mjs`), boss-entry and boss rows apart, 0 miss events |
| boss frames: worst fence margin / DMA-on | 13,493 / 28,079 (13,076 frames) | **12,523 / 28,457** over 11,958 boss frames (GO 500, gate 32,568; decision L moved it by 2) | same |
| boss per-frame work, native (limit Q-B6: 7,000) | 5,021 | **6,676** worst (the fortress, five shots a frame); 5,289 (core-boss drive) | `tests/boss-fortress.test.mjs`, `tests/boss-runtime.test.mjs` |
| DMA-on maximum | 31,237 (`director-complete-2` f5797) | **31,237** (same row) | `docs/runtime-wall-trace.json` |
| DLI per host frame / sequence violations | 2, 3 in the boss sector / 0 | **unchanged** | same |
| behavioural clause failures | 1 (`lower-playfield-hostile-contact-atr-hard`) | **1**, the same | [recorded-gate-failures.json](recorded-gate-failures.json) |
| gameplay against `main` | — | **63 of 63 replay files identical** on 326 gameplay columns frame by frame up to the boss entry | trace CSVs of both builds |
| the fights, EASY / MEDIUM / HARD (bot, held lives) | 2,353 / 2,871 / 3,682 frames, no boss fire | **1,847 / 2,353 / 3,557 frames (36.9 / 47.1 / 71.1 s)**; hits taken 2 / 3 / 7, lives lost 0 / 0 / 0 | `docs/runtime-wall-trace.json`, trace CSVs |
| boss entry (EMULATOR) | 38 sectors, 146 host frames (2.9 s) | **48 sectors, 184 host frames (3.7 s)** in every replay | same |
| `npm test` (default build) | 1,034 / 1,033 / 1 | **1,056 / 1,055 / 1**: `preview` (recorded) | [recorded-test-failures.json](recorded-test-failures.json) |
| initial block / boot sectors | 13,621 B / 107 | **13,621 B / 107** | `build/manifest.json` |
| extension / total transport sectors | 104 / 211 | **104 / 211** | same |
| ATR menu frame (baseline 596) | 550 (BASIC 541) | **550** (BASIC 541) | boot smoke |
| `$AE00` window free | 1,316 | **1,316** | `residentCapacity.basicWindow` |
| slot A (boss) | 1,033 of 2,048 B (9 sectors) | **1,963 of 2,048 B** (85 free, 16 sectors) | `build/boss.lbl`, manifest `boss` |
| slot C `$1000-$17FF` | 1,448 of 2,048 B (11 sectors) | **1,748 of 2,048 B** (code + rodata + `boss_prepare` 1,607, 13 sectors; BSS 141) | same |
| install run / scratch page | 346 of 384 B / 152 of 256 B | **346 of 384 B / 237 of 256 B** | same |
| slot B | 768 B | **768 B** | same |
| region 1 charset at `$0C00` | 840 B, 98 of 128 codes, 7 sectors | **938 B, 109 of 128 codes, 8 sectors** (the region run 16 of 16; decision L freed the five rim glyphs) | manifest `boss.regions` |
| `$0500` summary module | 1,677 B, 115 free | **unchanged** | `levelSummary.code` |
| sector reader | 1,507 / 29 free | **unchanged** (its directory's boss-code count byte 9 → 16) | `sectorReader` |
| low RAM | `$0C00-$18FF` the boss's claim; `$1900-$1FFF` unclaimed | **unchanged** | generated memory map |
| disk | 528–557; region 1 632–646 | **528–559** (code 16, install 3, slot C 13); **region 1 632–647** | `build/manifest.json` |
| ATR SHA-256 | `821134954c4608a8…` | **`af0180b356ec33bf9ec425a74e3f294f7a9dc8f41c35624c28f4cbe4fe423601`** | `dist/` |
| boot SHA-256 | `640249a7a75234f1…` | **`b84ab9dbd4355ae86644b8bd98cdfd3959e76e273a2a81d7554f4e12f64d7ce2`** | `dist/` |

**Read before accepting.** The art is the owner-approved agent-drawn
placeholder (decision G; provenance in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md));
hit points (cannons 14, plates 6 / 8 / 10 by size), reloads and the bonus are
placeholders (M8). **The bot loses no life**: a PULSE hit costs 1 of the
player's 10 health units, a resident rule — more threat for the bot needs ~3×
the fire rate or a different damage rule, an owner question (plan §5.15.7
item 8). **Slot A has 85 B left**: S4b needs the head's region reads or the
queue's merge out of slot A first (item 9). The stress pin reads 6,676 of
7,000 native cycles on a drive no real fire produces (item 7). The entry is
10 sectors longer than S4a-i's (the owner's CA-drive stopwatch decides the fast
loader, Q-B8). Region 1 has no escort Light (owner answer). **Smoke on copies**
(§12).

**NEXT TASK:** superseded by `fix/boss-readability` above (owner decision M
after the merged fortress's smoke).

## M5b-S4a-i — the layered boss engine, slot C and the region charset — `OWNER-SMOKE CANDIDATE` (2026-10-04)

Plan and as-built record: [plans/m5-loading-boss.md](plans/m5-loading-boss.md)
§5.13–5.14 (owner decisions A–G, answers Q-B1–Q-B8 in §1.6). Branch
`feat/boss-engine` from `main` `4121ffd`. Smoke:
[hardware-testing.md](hardware-testing.md) §14.

**What changed.** Level 1's boss is S3's core boss rebuilt in the **layered
engine** as style 2 (Q-B1): two pulse guns and the tier's emitter cover the
core (a cover group, decision F); two armour plates; every module cracks, breaks
and is gone (a bay) in turn (decision C); the core opens when its cover group
falls; the boss is defeated by its **last weapon**, armour left standing
(decision A); hit points per difficulty ×¾ / ×1 / ×5⁄4 from `boss_def` (Q-B3);
covered and hull hits absorbed, not counted for accuracy (Q-B7). The engine is
data: up to 16 modules, geometric or explicit covers, emitter slots by laser
tier (the rest capped armour), one fire countdown (policy only: the shots are
S4a-ii's). It lives in **slot C** (`$1000`, the C) and slot A (the ASM); the
band is drawn in the **region's own charset at `$0C00`** (CHBASE switched by the
band's DLI); the boss claims **`$0C00-$18FF`** (Q-B5). The art is **PNG drafts**
(Q-B2) under `assets/graphics/boss-regions/region-1/`, converted by
`scripts/boss-assets.mjs` v2, previewed by `npm run boss:preview`; region 1's
are **agent-drawn placeholders** (decision G). Every boss run is sized to its
contents (Q-B8).

| | `main` `4121ffd` | this branch | source |
| --- | ---: | ---: | --- |
| worst line-238 fence margin | 1,370 (`2-evasive-fire3` f287) | **1,370** (the ten worst rows are `main`'s, value for value) | standalone fence scan of the 51 default replay CSVs, boss-entry rows set aside, 0 miss events |
| boss frames: worst fence margin / DMA-on | 16,089 / 28,008 (11,171 frames) | **13,493 / 28,079** over 13,076 boss frames (GO 500, gate 32,568) | same |
| boss per-frame work, native (limit Q-B6: 7,000) | 2,760 (limit 3,500) | **5,021** worst, DLIs included | `tests/boss-runtime.test.mjs` |
| DMA-on maximum | 31,237 (`director-complete-2` f5797) | **31,237** (same row) | `docs/runtime-wall-trace.json` |
| DLI per host frame / sequence violations | 2, 3 in the boss sector / 0 | **2, 3 in the boss sector / 0** | same |
| behavioural clause failures | 1 (`lower-playfield-hostile-contact-atr-hard`) | **1**, the same | [recorded-gate-failures.json](recorded-gate-failures.json) |
| gameplay against `main` | — | **51 of 51 replay files identical** on 369 gameplay columns frame by frame up to the boss entry | trace CSVs of both trees |
| the fights, EASY / MEDIUM / HARD (bot, held lives) | 2,626 / 2,871 / 2,629 frames | **2,353 / 2,871 / 3,682** (×¾ / ×1 / ×5⁄4 HP); the chain 6 → **8** blasts | `docs/runtime-wall-trace.json` |
| boss entry (EMULATOR) | 28 sectors, 108 host frames (2.2 s) | **38 sectors, 146 host frames (2.9 s)** in every replay | same |
| `npm test` (default build) | 1,003 / 1,002 / 1 | **1,034 / 1,033 / 1**: `preview` (recorded) | [recorded-test-failures.json](recorded-test-failures.json) |
| initial block / boot sectors | 13,621 B / 107 | **13,621 B / 107** | `build/manifest.json` |
| extension / total transport sectors | 104 / 211 | **104 / 211** | same |
| ATR menu frame (baseline 596) | 550 (BASIC 541) | **550** (BASIC 541) | boot smoke |
| `$AE00` window free | 1,316 | **1,316** | `residentCapacity.basicWindow` |
| slot A (boss) | 1,297 of 2,048 B (16 sectors read) | **1,033 of 2,048 B** (9 sectors read) | `build/boss.lbl`, manifest `boss` |
| slot C `$1000-$17FF` | — | **1,448 of 2,048 B** (code + rodata 1,329, 11 sectors; BSS 119 behind it) | same |
| install run / scratch page | 343 of 384 B / — | **346 of 384 B / 152 of 256 B** | same |
| slot B | 704 B (band 512, tables 128, column map 64) | **768 B** (band 512, tables 256; the column map moved to scratch) | same |
| region 1 charset at `$0C00` | — (31 glyphs over codes 59-89) | **840 B, 98 of 128 codes, 7 sectors** | manifest `boss.regions` |
| `$0500` summary module | 1,677 B, 115 free, 14 sectors | **unchanged** | `levelSummary.code` |
| sector reader | 1,507 / 29 free (record: 8 B before another sector) | **unchanged** (its directory's boss-code count byte 16 → 9) | `sectorReader` |
| low RAM | `$0C00-$1FFF` unclaimed, measured-free (5,120 B) | **`$0C00-$18FF` the boss's claim; `$1900-$1FFF` unclaimed (1,792 B)** | generated memory map |
| disk | boss 528–555; 556–583 reserved | **528–557** (code 9, install 3, slot C 11); **region 1 632–646**; 648–695 reserved | `build/manifest.json` |
| ATR SHA-256 | `8300ba01…` | **`821134954c4608a8f73527f65b49d0b8e6c9e184213232773249d58e42b7f6da`** | `dist/` |
| boot SHA-256 | `4ba68124…` | **`640249a7a75234f1c559e61965b4e6b8326d2f87d9a1b9879dd7a147fd4142e2`** | `dist/` |

**Read before accepting.** The region-1 art is an agent-drawn placeholder
(decision G; provenance in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md));
the owner retouches the PNGs and checks them with `npm run boss:preview`. A hit
still shows no spark or flash and the guns do not fire yet — that is S4a-ii. The
entry is 10 sectors longer (38, ~0.7 s more in the emulator); the owner's CA
drive stopwatch decides whether the optional fast loader comes back (Q-B8). The
`$0C00-$18FF` claim is EMULATOR-only evidence until the 65XE smoke, as `$0500`.
The `director-complete-*` clause was re-pointed to the engine's phases, class
(a) (fight → chain → hold; no other state). **Smoke on copies** (§12).

**NEXT TASK:** superseded by the fortress session above (owner decisions H–K;
S4a-ii's scope built there).

## M5b-S3 — the boss band, its phases and the boss entry — `OWNER-SMOKE CANDIDATE` (2026-10-04)

Plan and as-built record: [plans/m5-loading-boss.md](plans/m5-loading-boss.md)
§5.12 (owner answers Q1, Q2, Q-S1–Q-S6, decisions 9 and 32, correction 9).
Branch `feat/boss-band` from `main` `ce464eb`. Smoke:
[hardware-testing.md](hardware-testing.md) §13.

**What changed.** Level 1 gains a fifth sector, its **boss** (sectors 1-4
unchanged). When the row clock enters it and the playfield drains, the screen
shows **`WARNING` / `BOSS APPROACHING`**, the boss theme starts under it
(decision 32), and 28 sectors land behind it: region 1's glyphs and theme,
the boss code into overlay slot A, a once-only install run, the band. Then the
world stops (Q1), an **8-row band** with HSCROL/LMS motion sits under the
divider with its own palette (the **third DLI**, boss sector only), and the
player fights **three guns, then the core**; the core's death sets off six
blasts with flashes and the band shaking, and hands off to the level-end
summary with the **boss bonus** (2,000, placeholder) and the **fight's time**.
A game that ends inside the boss sector leaves nothing behind: START GAME
restores slot A and every patched setting (Q-S4).

**Also in this session (owner-approved):** the summary's dotted row now steps
as decision O designed (it was solid dashes since 4.3: the space branch never
ran); the cfg overlap at `$8776` (and a second at `$8C7D-$8C7F`) is gone and a
test fails on any undeclared overlap between cfg memory areas; the manifest's
STARFIELD reservation is the cfg's 2,348 B.

| | `main` `ce464eb` | this branch | source |
| --- | ---: | ---: | --- |
| worst line-238 fence margin | 1,378 (`2-evasive-fire3` f287) | **1,370** (same row; the ten worst rows are the same rows, each 8–32 lower) | standalone fence scan of the 51 default replay CSVs, 0 miss events |
| boss frames: worst fence margin / DMA-on | — | **16,089 / 28,008** over 11,171 boss frames (GO 500, gate 32,568) | same |
| boss per-frame work, native (limit 3,500) | — | **2,760** worst, DLIs included | `tests/boss-runtime.test.mjs` |
| DMA-on maximum | 31,268 (`director-complete-2` f5797) | **31,237** (same row) | `docs/runtime-wall-trace.json` |
| DLI per host frame / sequence violations | 2 / 0 | **2**, **3 in the boss sector** / **0** | same |
| behavioural clause failures | 1 (`lower-playfield-hostile-contact-atr-hard`) | **1**, the same | [recorded-gate-failures.json](recorded-gate-failures.json) |
| gameplay against `main` | — | **51 of 51 replay files identical** on 42 gameplay columns frame by frame up to the boss sector | trace CSVs of both trees |
| `npm test` (default build) | 964 / 963 / 1 | **1,003 / 1,002 / 1**: `preview` (recorded) | [recorded-test-failures.json](recorded-test-failures.json) |
| initial block / boot sectors | 13,621 B / 107 | **13,621 B / 107** | `build/manifest.json` |
| extension / total transport sectors | 102 / 209 | **104 / 211** (window and pickup records +1 each, the plan's figure) | same |
| ATR menu frame (baseline 596) | 547 (BASIC 538) | **550** (BASIC 541) | boot smoke |
| `$AE00` window free | 1,444 | **1,316** (−128; plan ~157) | `residentCapacity.basicWindow` |
| slot A (boss) | — | **1,297 of 2,048 B** (751 free); install run **343 of 384 B** | `build/boss.lbl` |
| `$0500` summary module | 1,598 B, 194 free, 13 sectors | **1,677 B, 115 free, 14 sectors** (Q-S4 restore, 70 B) | `levelSummary.code` |
| sector reader | 1,507 / 29 free | **unchanged** | `sectorReader` |
| disk | levels, restore 512–527, summary 584–627 | **+28**: boss 528–555; 556–583 for regions 2–4 | `build/manifest.json` |
| boss entry (EMULATOR) | — | **28 sectors, 108 host frames (2.2 s)** in every replay | `docs/runtime-wall-trace.json` |
| ATR SHA-256 | `cbbafe93…` | **`8300ba01f4000b7172759783fb86241134900f2eadd17111bc9e58a41657d2a9`** | `dist/` |
| boot SHA-256 | `fdc7af70…` | **`4ba68124ed2336fa7dd7d3d1be491357d45ea41f8994a8c21cc0a3503e263b53`** | `dist/` |

**Read before accepting.** The boss's art, theme, hit points and bonus are
placeholders (owner work, M8). A non-lethal hit on a gun or the core shows no
flash — only a kill shows (wreck look, sound, score). The `$0500` module is
one sector longer (read once per session). The `director-complete-*` replays
now fight the boss (budget 15,000 frames); their ending clause and the
summary's clock and score clauses were re-pointed to the boss, class (a), and
the trace learned the boss DLI, the boss-entry frame and a boss-state column
(correction 10). Lasers (S4) and regions 2–4 (S5) are not built; a level 4+
boss would fail at its region read today. **Smoke on copies** (§12).

**NEXT TASK:** superseded by M5b-S4a-i above (the boss redesign, plan §5.13).

## M5a-S2 — the level-summary screen — `OWNER-SMOKE CANDIDATE` (2026-10-03)

Plan and as-built record: [plans/m5-loading-boss.md](plans/m5-loading-boss.md)
§4.8, §4.10. Branch `feat/level-summary` from `main` `f349c80` (M5a-S1 merged).
Memory: [memory-map.md](memory-map.md) "M5a-S2". Smoke:
[hardware-testing.md](hardware-testing.md) §12.

**What changed.** START GAME and the level's end pass the **level-summary
screen** (decisions 26–28, Q13–Q17): at START GAME the title, the level's best
and an empty panel while the region's art, the capital restore, the save
record and the level (tail first) load behind it; at the level's end — 50
frames after the terminal COMPLETE, a trigger the repo did not have — score,
kills, accuracy, time, lives lost, bonus and the S/A/B/C grade on the first
frame, then the art, and the save record read, updated, written to **sector
599 only** and read back (Q16; a write-protected disk is skipped silently).
The screen stays up 150 frames and FIRE counts only after the reads (Q15);
the finished level's music ticks through the reads. Until M4, FIRE returns to
the menu and the score goes into TOP SCORES. The stats are counted by hooks
in the sector reader behind fixed vectors `$A00C-$A01B`, reached by
operand-only re-points; the shot count is the per-frame scan (Q13), after the
line-238 fence on fighter frames.

**Owner decision 2026-10-03.** The `$0500` module MEASURED 1,359 B (+~110 B
write path) against the plan's 480-B estimate; the owner gave it
**`$0500-$0BFF`**, read once per session. `$0700-$1FFF` is claimed by no link
and was MEASURED never written after `start` in the emulator
([diagnostics/low-ram-0700-1fff-2026-10-03.md](diagnostics/low-ram-0700-1fff-2026-10-03.md));
`$0700-$0BFF` is now claimed (cfg, memory map, a test), **`$0C00-$1FFF`
(5,120 B) stays an unclaimed lever for M3/M6, not used**. The real-hardware
proof is a smoke item: the summary after several games and a GAME OVER on the
65XE.

**Owner review 2026-10-03 (the smoke of `caf8c93f` passed), applied.**
(1) The START GAME clause relaxed to `display + 149` in `df78be6` compensated
for the observer, which dated a summary's first frame one frame late; the
observer now dates it by scanline and the clause is back to `display + 150`.
Checking it found a game-side off-by-one too — the first disk wait after the
summary came on counted that frame's edge twice, so PRESS FIRE was drawn after
149 shown frames (FIRE was still read only from frame 150) — fixed: every
START summary now reads FIRE from `display + 151`. (2) START GAME keeps the old
loader's identity: `ENGAGING ENEMY SECTOR` on top (the level number joins it
in M4) and one of the four AI lines under the empty panel; the level-end
summary is unchanged. A session's first START GAME shows that top line alone,
same place and luminance, while the module loads, instead of the near-empty
title screen. (3) Plan §5.6: once the boss exists the time grade counts the
boss fight only.

| | `main` `f349c80` | this branch | source |
| --- | ---: | ---: | --- |
| worst line-238 fence margin | 1,391 (`2-evasive-fire3` f287) | **1,378** (same row; unchanged by the owner review, and the ten worst rows with it) | standalone fence scan of the replay CSVs (59 after the review: 51 default + 8 mode-gated), 0 miss events |
| DMA-on maximum | 31,117 (`director-complete-2` f5797) | **31,268** (same row): over the 31,200 target by 68, under the 32,568 gate | same; `docs/runtime-wall-trace.json` |
| DLI per host frame / sequence violations | 2 / 0 | **2 / 0** | `docs/runtime-wall-trace.json` |
| behavioural clause failures | 1 (`lower-playfield-hostile-contact-atr-hard`) | **1**, the same | [recorded-gate-failures.json](recorded-gate-failures.json) |
| gameplay against `main` | — | **61 of 61 replay files identical** (40 gameplay columns frame by frame; the debris-gate files aligned by gameplay frame); the three `director-complete` replays identical up to their level-end summary | trace CSVs of both trees |
| `npm test` (default build) | 921 tests | **964 / 963 / 1**: `preview` (recorded). After the owner review the first full run failed 6: `preview`, three bindings to the new ATR (menu raster, showcase ×2, regenerated by their own tools) and two transport pins (total ≤ 209 and = 209), cleared by moving the dotted-row step into the module, not by re-pinning; this is the run after | [recorded-test-failures.json](recorded-test-failures.json) |
| initial block / boot sectors | 13,621 B / 107 | **13,621 B / 107** | `build/manifest.json` |
| extension / total transport sectors | 102 / 209 | **102 / 209** | same |
| ATR menu frame (baseline 596) | 547 | **547** (BASIC 538) | boot smoke |
| menu raster (4 cold fills, three games each) | pass | **pass**; after a game the menu charset carries the summary glyphs in codes 72–95, which no frontend screen names (the audit expects them exactly) | [menu-raster-trace.json](menu-raster-trace.json) |
| `$AE00` window free | 1,444 | **1,444** | `residentCapacity.basicWindow` |
| `HYBRID_C_ARENA` free | 35 | **35** | `residentCapacity.arena` |
| sector reader used / free | 1,498 / 38 | **1,507 / 29**; but record 10 holds 1,507 of 1,515 B (12 sectors): **8 B** before the reader buys a transport sector | `sectorReader` |
| summary module | — | **1,598 B at `$0500`**, 194 free of `$0500-$0BFF`, 13 sectors | `levelSummary.code` |
| zero page | `$AC-$FF` unclaimed | **`$AC-$B5`** the stat block | `level-summary-abi.inc` |
| disk | levels from 320, restore 512–527 | **+42**: module 584–596, save record 599 (shipped empty), art 600–627 | `levelSummary` |
| START GAME (EMULATOR) | 49 frames, loader screen | first of a session: the interim top line for **52** frames, then the summary; reads done **76** later; `PRESS FIRE` after **150** shown frames, FIRE read from **+151**; later START GAMEs: summary in 1 frame, 8 sectors | boot smoke, replays |
| ATR SHA-256 | `84c7af52…` | **`cbbafe93737f8840862cade4c64e8e6b4813f382d30bfa2e749d811461fa67c4`** (smoked `caf8c93f…` before the review) | `dist/` |
| boot SHA-256 | `8a9f4795…` | **`fdc7af705332623f1e20e0459f91e418570b8ae6b44af72abf5ce485a7a56786`** | `dist/` |

**Read before accepting.** The level's clock is scroll-bound (3:10 / 2:47 /
2:33 on EASY / MEDIUM / HARD in the `director-complete` replays), so the time
tier mostly follows the difficulty — an M8 tuning note. The grade thresholds
are placeholders; BONUS reads `00000` until M8 and M5b. The sector reader's
limit is its transport record, not its RAM: 8 B before record 10 buys a
sector (the review's interim screen did once; the dotted-row step moved into
the module to win it back). The failure screen's text is now luminance $A
(the reader's shared publish). The dotted row's step never drew a space
(`lda #CH_FRONT_SPACE` / `bne` with `CH_FRONT_SPACE` = 0) since 4.3 — **fixed
in M5b-S3** (owner-approved), see above.
The late publication window (debris, Light) now starts about a scanline later
on fighter frames — the shot scan runs ahead of it; every visibility clause
passes. **The ATR now writes to its own disk: smoke on copies.**

**NEXT TASK:** the owner's smoke of the review changes (`hardware-testing.md`
§12, the items marked as changed; on copies of the ATR and the floppy); then
M5b-S3 (`feat/boss-band`), not started.

## M5a-S1 — overlay slot A — `OWNER-SMOKE CANDIDATE` (2026-10-03)

Plan and as-built record: [plans/m5-loading-boss.md](plans/m5-loading-boss.md)
§4.9. Branch `feat/overlay-slot` from `main` `18234da`. Memory:
[memory-map.md](memory-map.md) "M5a-S1".

**What changed.** The player damage gate and HUD (248 B) move ahead of
`update_broadside`, so the capital code runs contiguous; **slot A** is its
first 2,048 B, `$6DE8-$75E7`, code only. The 12 calls into the capital group
from outside it go through **`CAPITAL_VECTOR_*`**, 3-byte `jmp`s appended to
the Light kernel's vector block (`$B368`). The sector reader gains
**`sector_reader_read_run` at `$A006`** (owner Q11; the 4.9 drain vector moves
to `$A009`), an 8-entry overlay directory, a slot-A-overlaid flag and the
capital table image; at START GAME, after an overlay, it reads the capital
restore run (sectors 512–527, the resident slot bytes) and puts the table
back before the level (restore variant (b), Q6). A failed read reaches the
failure screen with the flag still set; gameplay never runs a partial slot.
The AI pool is 4 lines (Q3), creative text in
`assets/text/loader-ai-lines.json`.

**Owner decision 2026-10-03.** The plain table cost the binding row −48 of
fence margin, under the brief's STOP at 1,400; the owner kept it as planned
and set the session floor at 1,350. Probe B, measured and not taken: zero-timer
fast paths in four table entries, +207 (1,391 → 1,598) for +42 B of window.
Repo deviations recorded in the plan: 12 entry points, not 20 (table 36 B,
not 60 → 72); the capital table image lives in the reader, because slot A's
head would need 60 B of `BROADSIDE`, which has 3.

| | `main` `18234da` | this branch | source |
| --- | ---: | ---: | --- |
| worst line-238 fence margin | 1,439 (`2-evasive-fire3` f287) | **1,391** (same row) | standalone PAL audit, 49 + 8 replays on each tree, 0 miss events |
| DMA-on maximum | 31,133 | **31,117** (`director-complete-2-natural-sweep-fire0`) | same |
| DLI per host frame / sequence violations | 2 / 0 | **2 / 0** | `docs/runtime-wall-trace.json` |
| behavioural clause failures | 1 (`lower-playfield-hostile-contact-atr-hard`) | **1**, the same | [recorded-gate-failures.json](recorded-gate-failures.json) |
| gameplay against `main` | — | **61 of 61 trace CSVs identical** on 30 gameplay columns, frame for frame (score, lives, health, capsules, enemies, Director RNG) | trace CSVs of both trees |
| `npm test` (default build) | 910 tests | **921** (+11 new); one full run failed 4: `preview` (recorded) and three bindings to the new ATR (menu raster, showcase ×2), regenerated by their own tools in `acc4754`, after which only `preview` fails | [recorded-test-failures.json](recorded-test-failures.json) |
| initial block / boot sectors | 13,621 B / 107 | **13,621 B / 107** | `build/manifest.json` |
| extension / total transport sectors | 102 / 209 | **102 / 209** | same |
| ATR menu frame (baseline 596) | 547 | **547** | boot smoke |
| `BROADSIDE` used / free (record 1 packed) | 6,653 / 3 (5,517) | **6,653 / 3 (5,494)**, 44 sectors | same |
| `$AE00` window used / free | 2,104 / 1,480 | **2,140 / 1,444** | `residentCapacity.basicWindow` |
| sector reader used / free | 1,473 / 63 | **1,498 / 38**, 12 sectors | `sectorReader` |
| disk | levels from 320 | **+16**: the capital restore run, sectors 512–527 | `overlays.runs` |
| START GAME level read / capital restore | 49 frames / — | **49 / 60 frames** (13 / 16 sectors, 0 retries), EMULATOR | boot smoke, forced-restore session |
| boot smoke | 4 + RESET | **4 + RESET + forced restore**, slot A and the table byte-verified after START GAME on every session | same |
| ATR SHA-256 | `f127d7a4…` | **`84c7af5299788c61644c75f4a53aaa4436ec26197b1f55443f4b0ad1a9eadc2b`** | `dist/` |
| boot SHA-256 | `1daed1be…` | **`8a9f479552e3364db2f970349e3e286652128d7a0042f3eb53fae73c8d42fdcf`** | `dist/` |

**Read before accepting.** The README gameplay GIF was regenerated: 3 of its
700 frames differ from `main`'s by 8–16 pixels on one scanline (a Bomber hull
and the gold capsule, PMG writes racing the beam a line later because the
frame's work runs ~50 cycles later). Gameplay is identical. Hardware smoke
items: plan §8, row M5a-S1.

**NEXT TASK:** see M5a-S2 above.

## Heavy break-up rotate gate — **OWNER-ACCEPTED** (owner smoke PASS, merged, released as `v0.2.1`; built 2026-10-02)

Plan and as-built record: [plans/m3-waves-heavy.md](plans/m3-waves-heavy.md)
§9 and §9.5. Branch `fix/heavy-breakup-rotate-gate` from `main` `e3bd098`.

**What was wrong.** A Heavy break-up is a deferrable consumer of the
one-expensive-event token and should never land on a ring-rotate frame, but
the claim runs inside `handle_collisions`, before `update_starfield` decides
whether the frame rotates, so the rotate marker it tested always named an
earlier frame. 389 of the 902 Heavy kills in the evidence run put their
break-up on a rotate frame, including the game's worst fence row.

**What changed.** `world_rotate_due` (17 B, the head of the `BROADSIDE` zero
pin `hull_sequence_reserve`; label, length and every later address unchanged)
makes `update_starfield`'s own sum early; `enemy_c_heavy_breakup_claim` (+7 B,
arena) parks the break-up when the frame will rotate, without spending the
token, and the existing ungated retry lands it on the next frame, which never
rotates. Kill, score, sound and the `COLBK` flash stay on the kill frame.

| | `main` `e3bd098` | this branch | source |
| --- | ---: | ---: | --- |
| worst line-238 fence margin | 788 (`director-complete-2` f5815, Raider kill, rotate) | **1,439** (`2-evasive-fire3` f287, Heavy spawn, rotate) | standalone PAL audit, 48 + 8 replays, 0 miss events |
| Heavy kills with the break-up on a rotate frame | 389 of 902 | **0** of 902 | `scripts/measure-breakup-rotate-frames.mjs` |
| worst rotate-frame Heavy kill row | 788 | **3,459** (`raider-remnant-rapid-atr-hard` f123) | same |
| DMA-on maximum / physical headroom | 31,133 / 4,435 | **31,133 / 4,435** | `docs/runtime-wall-trace.json` |
| DLI per host frame / sequence violations | 2 / 0 | **2 / 0** | same, `gate.memory_integrity` |
| behavioural clause failures | 3 | **3**, the same contact sessions | [recorded-gate-failures.json](recorded-gate-failures.json) |
| `npm test` (default build): tests / pass / fail | 897 / 894 / 3 | **906 / 904 / 2**, one full run | `npm test`; [recorded-test-failures.json](recorded-test-failures.json) |
| initial block / boot sectors | 13,621 B / 107 | **13,621 B / 107** | `build/manifest.json` |
| extension / total transport sectors | 102 / 209 | **102 / 209** | same |
| `BROADSIDE` packed (record 1) | 5,502 of 5,611 | **5,517 of 5,611**, 44 sectors | same |
| ATR menu frame (baseline 596) | 547 | **547** | boot smoke |
| `$AE00` window used / free | 2,104 / 1,480 | **2,104 / 1,480** | `residentCapacity.basicWindow` |
| `HYBRID_C_ARENA` used / free (record 7 packed) | 790 / 42 (712) | **797 / 35 (719)**, 6 sectors | `residentCapacity.arena` |
| `BROADSIDE` zero pins | 136 B | **119 B** (103 + the 16-B codebook reserve) | `build/void-strike-65.lbl` |
| ATR SHA-256 | `04943660…` | **`f127d7a48674c7b2cdf103d3808b4145938a8d687586b82e83b3bcb651f33cd1`** | `dist/` |
| boot SHA-256 | `c303c33f…` | **`1daed1be86e54b1e3195228aa3b05f20d2501a87efc5403ca0638b60e943bd33`** | `dist/` |
| level 2 worst margin / maximum (diagnostic) | 1,615 / 31,140 | **1,615 / 31,140**, same frames; 0 rotate-frame break-ups; elite-sector minima up to +2,352 | [diagnostics/level-2-timing-2026-09-30.md](diagnostics/level-2-timing-2026-09-30.md) |

**Read before accepting — gameplay is not byte-for-byte `main`'s.** Scores,
Heavy kill frames, capsule sequences and lives are frame-exact against `main`
in all 56 replays, but `player_health` differs in 4. `LIGHT_TOKEN_BUDGET` is 1;
on `main` a rotate-frame break-up spent the frame's token and a Light's fire
or admission claim later that frame was refused, while now the parked claim
leaves the token unspent (as §9 specified), so that Light acts one frame
earlier and the hostile-shot timeline shifts. Owner decision 2026-10-02: keep
the token unspent.

**Tests.** RED on `main`, GREEN here (`tests/heavy-breakup.test.mjs`): a
Raider and a Bomber killed on a rotate frame park their break-up in the
production frame order and it lands on the next frame; `world_rotate_due`
agrees with `update_starfield` over 400 frames on each difficulty; a denied
claim leaves the token unspent; the size pins. Controls: a non-rotate kill
still spawns on the kill frame. Cycle pins: `resolve_enemy_damage` on a
rotate-frame contact kill ≤ 850 (804 / 836), the retry ≤ 520. §9's 850 was set
from `scripts/measure-heavy-member-costs.mjs`, whose kill source 1 is
`DAMAGE_PLAYER_CONTACT` (its comment said projectile; fixed); a shot kill is
32 cycles dearer (836 / 868) and is pinned structurally instead
(`heavy_spawn_breakup` does not run on its frame).

**Re-pointed, each with its reason in the test:** `heavy-breakup` (killNow and
the fragment-contact test put the accumulator on a non-rotate frame; the
hand-set-marker test is kept and says so), `hybrid-c-arena` (arena bytes,
record 7 packed), `capital-hull-extension` (the zero pin starts after the
routine), `hybrid-lifecycle` (the claim's call list gains
`_asm_world_rotate_due`; still five token claim sites).

**Recorded test failures:** `github-showcase` (D) and `preview` (C) fail as
recorded. `runtime-wall-trace` "ten heaviest frames…" (D) **passes by
coincidence**: the JS cycle model re-picked its reference frames and one now
falls in the trace's ten heaviest; its cause is untouched, so it stays
recorded and annotated (owner decision 2026-10-02). 0 new.

**Owed by the owner.** The smoke: Raider and Bomber kills still break up into
fragments, on the hit or one frame after; no missing or doubled fragments;
score, kill sound and flash unchanged; no stutter when a kill coincides with
the scrolling.

## Roadmap 4.6 step 5 — the payload: Light looks, weapon looks, a sky per sector — **OWNER-ACCEPTED** (released as `v0.2.0`; built 2026-10-01)

Plan, placement, data and the as-built record:
[plans/director-4.6.md](plans/director-4.6.md) §8.3. Branch
`feat/director-step-5-payload` from `main` `f3e3660`. Priced as budget-1.0 M2
without the nebula (owner: sky variant S2 only).

**What the player sees.**

* **A sky per sector** (budget variant S2): the near-star pixel value, patched
  into the star publish operand on the frame the Director enters a sector -
  white `COLPF0`, the allied steel `COLPF1` or yellow `COLPF2`; no palette
  register is touched. One rule for both levels: capital sector steel, last
  sector yellow, every other sector white. Level 1: white, steel, white,
  yellow. Level 2: white, white, steel, white, white, yellow.
* **Light appearance variants** (decision AD): a wave's `wave_flags` bits 0-1
  pick the archetype's art or one of three 16-B payload looks; a Heavy wave's
  look re-skins its Light escort. Behaviour, HP, fire and score stay the
  archetype's. Level 1: one wave - sector 3's last (row 576), its Wingman
  escorts wear `flight-lead` (white wingtips and nose). Level 2: `hunter`
  (Interceptor recolour), `escort` (Wingman with a steel inner edge),
  `lancer` (Interceptor re-glyph, a kite-shaped dart).
* **Hostile weapon looks**, level 2 only: `PULSE` a staggered twin pulse,
  `LASER` a broken beam, laid over the defaults at level start. `BOMBER`
  keeps its shell. Level 1's fire is unchanged.
* Level 1's waves, rows, counts and timing are unchanged. `how-to-play` EN/PL
  say that a re-skinned enemy is still its type and that the star colour only
  marks the sector.

**How.** Pairs are keyed on the look they were admitted for
(`light_pair_key[3]`), so the tick's per-frame compare keeps its 24 cycles;
`light_pair_for_record` changes two operands and stays 124 B;
`encounter_light_admit` moves to the window so the full extension record 5
shrinks; the weapon looks are a tail of `build_hostile_weapon_glyphs` (arena);
the sky is `_asm_publish_star_pixel` (arena), called from `enter_sector` only,
writing an address `src/main.s` asserts at link time. Five bytes of RAM,
`HYBRID_LIGHT_LOOK` `$812E-$8132`.

| | `main` `f3e3660` | this branch | source |
| --- | ---: | ---: | --- |
| worst line-238 fence margin | 785 (`director-complete-2` f5815) | **788**, same row and frame | standalone PAL audit, 48 + 8 replays, 0 miss events, 0 rows over 31,200 |
| DMA-on maximum / physical headroom | 31,121 / 4,447 | **31,133 / 4,435** | `docs/runtime-wall-trace.json` |
| DLI per host frame / sequence violations | 2 / 0 | **2 / 0** | same, `gate.memory_integrity` |
| behavioural clause failures | 3 | **3**, the same contact sessions | [recorded-gate-failures.json](recorded-gate-failures.json) |
| mode-gated: formation / sector / remnant / debris | PASS / PASS / PASS / FAIL (1 blank) | **PASS / PASS / PASS / FAIL**, the same blank, identical summary | mode-gated reports |
| `npm test` (default build) | 885 / 882 / 3 | **897 tests**; one full run 891 pass / 6 fail, of which 3 recorded; the 3 new were repaired after it (below) and pass in focused re-runs | `npm test`; [recorded-test-failures.json](recorded-test-failures.json) |
| initial block / boot sectors | 13,621 B / 107 | **13,621 B / 107** | `build/manifest.json` |
| extension / total transport sectors | 101 / 208 | **102 / 209** (record 8, the window C half, 8 → 9) | same |
| ATR menu frame (baseline 596) | 546 | **547** (−49) | boot smoke |
| `$AE00` window used / free | 1,991 / 1,593 | **2,104 / 1,480** | `residentCapacity.basicWindow` |
| `HYBRID_C_ARENA` used / free | 718 / 114 | **790 / 42** | `residentCapacity.arena` |
| `HYBRID_C_EXT` composite / record 5 packed | 874 / 747 of 747 | **860 / 735 of 747** | `directorCodeRuntimes` |
| `DIRECTOR_RAM` | 602 / 645 | **602 / 645** | map |
| ATR SHA-256 | `af2e47b6…` | **`04943660e05a380678c4bf6197810588f81772b8be3b9eca049c2da7f86386e8`** | `dist/` |
| boot SHA-256 | `06d2f256…` | **`c303c33f347280520f4c466e2889f6d849aa3b126c439de3cefe0d62165d8427`** | `dist/` |
| level 2 worst margin / maximum (diagnostic) | 1,607 / 31,205 (step 4) | **1,615 / 31,140** | [diagnostics/level-2-timing-2026-09-30.md](diagnostics/level-2-timing-2026-09-30.md) |

**No standing per-frame cost**, MEASURED natively on both builds: escort
Wingman, free Wingman, Interceptor pursuit, Light publish and shot scan, the
cell resolver and the Bomber member update are equal to or cheaper than
`main`. Two layout effects that first added a cycle each were found that way
and fixed (plan §8.3).

**Tests the step re-pointed, each with its reason in the test:** size pins in
`basic-window-capacity`, `level-buffer-16`, `hybrid-c-arena`,
`hybrid-lifecycle`, `light-interceptor`, `fighter-weapons` (the builder's
bytes) and `level-compiler` (the payload page is no longer zero);
`effects-stagger` (resolver peak 1,071 → 1,068); `light-multiplicity` (its
negative control now constructs the install that `main`'s Wingman/Interceptor
pair ping-pong supplied by accident - threshold unchanged); two source slices
in `light-interceptor`. **Harness repaired, class (b):** the colour-lifecycle
trace in `scripts/weapon-pickup-runtime.mjs` read hostile slot 10, past the
5 + 5 pool, i.e. an arena code byte; it now reads slot 5 and passes on `main`
and here. `docs/menu-raster-trace.json` regenerated for the new ATR (masked
raster still `cfc72f31…`).

**Recorded test failures, unchanged by name:** `github-showcase` (D),
`preview` (C), `runtime-wall-trace` "ten heaviest frames…" (D). 0 new,
0 disappeared.

**Budget consequence.** The arena's free tail fell 114 → 42 B, so the
decision-19 lever (`sector_c_update_capital_phase` into the arena for one menu
frame) no longer fits; with the menu at −49 it is not needed now.

**Owed by the owner.** The smoke: the sky changing at sector boundaries on
levels 1 and 2; the `flight-lead` escorts in level 1's sector 3; the three
Light looks and the two weapon looks on level 2; nothing else changed.

## trace-clause-repairs — recorded clauses 16 → 3, recorded tests 5 → 3 — `OWNER REVIEW CANDIDATE` (2026-10-01)

Plan, measurements and the per-item table:
[plans/trace-clause-repairs.md](plans/trace-clause-repairs.md). Branch
`fix/trace-clause-repairs` from `main` `72f8bf6`.

**Why.** The recorded-failures review classified the 16 recorded clause
failures as 3 stale scenarios and 13 observer errors. Before v0.1.0 the trace
gates must say what the game does.

**What changed.** The trace harness, its emulator header and tests only. **No
source, cfg or build-script change; the ATR and the boot image are
byte-identical to `main`**, so no hardware smoke is owed.

* **Observers count what the clauses state** (thresholds and meanings
  unchanged; predicates in `scripts/trace-clause-observers.mjs`, RED → GREEN
  unit tests): the first-DLI selection is also seen in the wait after a frame's
  end hook (12 engine clauses: 150 of 150 frames select byte three); the
  booster release counts erases that zero the plane, not the publication's
  empty re-entry; the traversal clause reads the pickup's own slot bit; the
  remnant gate counts kill requests, so one Spread fan killing both Raiders in
  one frame is two explosions. Four additive CSV columns
  (`engine_playfield_select_idle_*`, `pickup_erase_writes`).
* **Scenario:** `raider-sector-atr-hard` 1,800 → 2,400 frames (the sector
  returns to OPEN at 1,954).
* **New clause:** every accepted shot starts the fire sound (`fire_timer` `$33`
  at the end hook, `fire_sfx` on the next frame) — 7,598 accepted-shot frames
  in the default run, 0 violations.

**Owner decisions of 2026-10-01** (plan §5): **Q1** the remnant gate's kill floor
is 50 on the 3 × 3,000 replays (100 was unreachable: 63 measured, 90 even at
3 × 6,000); **Q2** a full Raider formation is `RAIDER_SLOT_COUNT` = 2, read from
`src/c/lifecycle.c` (the clauses asked for 3); **Q3** the three contact-raster
sessions stay recorded as (a) until `chore/contact-scenario-redesign`; **Q4** the
menu raster audit is star-aware and the menu raster is pinned with the star
cells masked, `cfc72f31…`, **accepted by the owner** on ATR `af2e47b6…`;
evidence regenerations commit the binding hashes in
`dist/void-strike-65-manifest.json` and `docs/media/manifest.json` (no artifact
or image byte changes).

| | `main` `72f8bf6` | this branch | source |
| --- | ---: | ---: | --- |
| worst line-238 fence margin | 785 (`director-complete-2` f5815) | **785**, same row and frame | PAL audit, 48 + 8 mode-gated replays, 0 miss events, 0 rows over 32,568 |
| DMA-on maximum / physical headroom | 31,121 / 4,447 | **31,121 / 4,447** | `docs/runtime-wall-trace.json` |
| DLI per host frame / sequence violations | 2 / 0 | **2 / 0** | same |
| behavioural clause failures | 16 | **3** | [recorded-gate-failures.json](recorded-gate-failures.json) |
| `npm test` (default build): tests / pass / fail / todo | 873 / 868 / 5 / 0 | **885 / 882 / 3 / 0** | one full run; 12 new tests |
| recorded test failures | 5 | **3** | [recorded-test-failures.json](recorded-test-failures.json) |
| `--raider-sector-only` / remnant gate / `--raider-formation-only` | FAIL / FAIL / PASS | **PASS / PASS / PASS** | mode-gated reports |
| debris visibility gate | FAIL, 1 blank (death-frame blink) | **FAIL, the same 1 blank**, summaries identical | owner-accepted low-severity issue |
| `docs/menu-raster-trace.json` | 2026-09-20, XEX + old ATR | **4 ATR sessions, 40 checkpoints, star-aware** | `--menu-raster-only` |
| ATR / boot SHA-256 | `af2e47b6…` / `06d2f256…` | **identical** | `dist/` |

**The recorded clause failures, all class (a), stale scenario:**
`capital-contact-allied-medium` (sector at 774, no mode-1 contact captured, the
passive player loses two lives first), `capital-contact-hostile-medium` (the
sector never opens with the passive player at x 84),
`lower-playfield-hostile-contact-atr-hard` (HARD hostile shells stop at Y 180,
under the policy's 191; on MEDIUM they stop at 156).

**The recorded test failures:** `github-showcase` (D, XEX-era captures,
`chore/showcase-recapture`), `preview` (C, a tool defect,
`chore/preview-29-rows`), `runtime-wall-trace` "ten heaviest frames…" (D, the
cycle model is a build script, `chore/cycle-model-pairshot`).

**The review's findings, checked.** Every observer finding was right. Three
scenario findings were incomplete: extending `--raider-sector-only` exposed the
three-Raider clause (Q2), the contact sessions need a redesign rather than a
budget (Q3), and the remnant floor was unreachable by length alone (Q1).

**Owed by the owner.** A review of the plan and of the two recorded files.

## recorded-failures-review — the recorded test set falls from 105 to 5 — `OWNER REVIEW CANDIDATE` (2026-10-01)

Review, evidence and the Phase B record:
[diagnostics/recorded-failures-review-2026-10.md](diagnostics/recorded-failures-review-2026-10.md).
Branch `fix/recorded-failures-review` from `main` `9694ca9`.

**Why.** Three recorded test failures had failed on a stale pin before their
behavioural assertions ran, which hid the SPREAD livelock for two weeks. This
task read every recorded failure: 105 tests, 3 todo tests and 16 trace clauses.

**What it found.** No recorded failure hides a second player-visible defect.
Of the 105 tests, 33 were stale pins, 41 checked behaviour that had been
deliberately changed, 30 were the test's own harness or a stale evidence file,
and 1 is a defect of a development tool. Of the 16 recorded clauses, 3 are
stale scenarios, 13 are observer or clause errors and none is a runtime
defect; the clauses and the trace harness are unchanged (follow-up list in the
review, §8).

**What changed.** Tests and one test harness only
(`scripts/weapon-pickup-runtime.mjs`, which the build does not import and
whose changed functions the wall trace never calls; static evidence in the
review, §10.5). **No source, cfg, build script, wall-trace harness, `dist/` or
`docs/media/` change; the ATR and the boot image are byte-identical to `main`**,
so every gate figure of the section below stands and no hardware smoke is owed.

| | `main` `9694ca9` | this branch | source |
| --- | ---: | ---: | --- |
| `npm test` (default build): tests / pass / fail / todo | 891 / 783 / 105 / 3 | **873 / 868 / 5 / 0** | one full run on each |
| recorded test failures | 105 | **5** | [recorded-test-failures.json](recorded-test-failures.json) |
| tests retired (owner-approved, each with its reason) | | 18 (16 recorded failures, 2 todo) | review §10.6 |
| new failing names | | **0** | reconciliation by name, review §10.2 |
| recorded clause failures | 16 | **16**, unchanged | [recorded-gate-failures.json](recorded-gate-failures.json) |
| ATR SHA-256 | `af2e47b6…` | **`af2e47b6…`**, identical | `dist/` |
| boot SHA-256 | `06d2f256…` | **`06d2f256…`**, identical | `dist/` |

**The recorded test failures, by class** (the file carries each one's first
failing assertion and the task that would clear it). *Superseded by
trace-clause-repairs above: the two `menu-raster` rows have left the set, which
is now 3.*

| Class | Test | Reason |
| --- | --- | --- |
| D | `github-showcase` "showcase manifest binds every image to the current packed release" | the showcase gameplay frames are XEX-era captures |
| D | `menu-raster` "native menu raster is exact for the ATR and four cold RAM fills" | `docs/menu-raster-trace.json` dates from 2026-09-20 and still describes XEX sessions and an older ATR |
| D | `menu-raster` "menu evidence preserves the audited boot streams and independent charsets" | the same stale file |
| D | `runtime-wall-trace` "ten heaviest frames retain exact clock positions, VBI IDs and state" | the JS cycle model in `scripts/runtime-cycles.mjs` still models the retired 10 + 9 shot pool |
| C | `preview` "preview consumes the canonical charset, screen, PMG, and palette source" | `scripts/preview.mjs` draws 24 of the 29 playfield rows; a tool defect, not in the ATR |

**The recorded set is one file now.** It replaces the list that had to be
combined from Appendix A of `plans/hull-set-v1.md`, its renames and the
removals noted in this file. A full default-build `npm test` must fail exactly
the tests in it.

**Transport limits now have a test on the built image.**
`tests/layout-d1.test.mjs` "transport limits in force…" holds the STOP rule
(107 boot sectors, initial block ≤ 13,652 B) and, new, the capacity of every
extension record (`sectors × 128 − 21` B). The frozen Layout D.2 budget it
replaces and the frontend H3.1 code budget are retired (owner decision B15).

**Owner decisions of 2026-10-01** (review §10.1): the current gun layouts are
accepted and the shared-row limit is today's 5 / 8 / 9 (B12); **the debris
death-frame blink is owner-accepted as a known low-severity issue, with no
task for now**; the preview clipping becomes the follow-up
`chore/preview-29-rows`.

**One visible side effect, outside the game.** `npm run preview` uses the fixed
harness: the Rapid Fire preview, which threw, runs again, and the Spread
preview shows the full three-shot fan. The four diagnostic CLIs that use the
harness start from the same fixed image if re-run; their committed outputs
were not regenerated.

**Follow-ups proposed** (`chore/menu-raster-regeneration` and the clause-side
fixes of review §8 were done by trace-clause-repairs, above): `chore/preview-29-rows`,
`chore/menu-raster-regeneration` (until it runs, no committed evidence shows
the menu raster of an ATR built after 2026-09-20), `chore/showcase-recapture`,
`chore/cycle-model-pairshot`, and the clause-side fixes of review §8.

**Owed by the owner.** A read of the review and of
`docs/recorded-test-failures.json`. No smoke: the game bytes did not change.

## boot-loading-blank-screen — no garbage before the splash — `OWNER-SMOKE CANDIDATE` (2026-10-01)

Plan and measurements: [plans/boot-loading-blank-screen.md](plans/boot-loading-blank-screen.md).
Branch `fix/boot-loading-blank-screen` from `main` `55cc361`.

**The defect (pre-existing).** With BASIC enabled at the OS cold start — every
default 65XE boot, and every RESET — the player saw 65 frames (1.3 s) of
changing characters and a coloured line before the splash. Stage 2 loads
records 162/171/204 into `$9B40-$9FCE` while the OS VBI still displays its
screen-editor list at `$9C20`. `-nobasic` was clean because its OS screen is at
`$BC20`. **RESET is an OS cold start, not a warm start through `DOSVEC`**:
`COLDST` stays `$FF` because the boot never returns to the OS (owner decision A),
so RESET re-boots the disk to the splash, loader and menu, and with OPTION up
the OS maps BASIC — the same garbage. Not changed here; recorded because the
boot smoke used to call the warm start "checked through `DOSVEC`".

**The fix.** `boot_stage2_atr_entry`, after `copy_boot_splash_blob`:
`stx SDMCTL` (X = 0), `lda COLOR2`, `sta COLOR4` — ANTIC DMA off and the whole
screen in the OS blue from the next vertical blank, before the first SIO read.
Every path now goes black → OS blue screen (while the OS loads the initial
block) → plain blue → splash. 9 B of `BOOT_STAGE2`, no frame code.

**Gates — the DEFAULT build.** ATR
`af2e47b62c315ddf9ed05cab44842d8921bcb8c561b9cc2dcf103f1b1e8b31b7`, boot
`06d2f25665a17c0858c92245f257d6d339858149a5ed4679919d120d6eb4d80a`.

| | `main` `55cc361` | this branch | source |
| --- | ---: | ---: | --- |
| frames before the splash showing characters (BASIC / `-nobasic` / RESET) | 65 / 0 / 65 | **0 / 0 / 0** | boot smoke `blank_windows` |
| worst line-238 fence margin | 785 (`director-complete-2` f5815) | **785**, same row and frame | PAL audit, 48 + 8 mode-gated replays |
| DMA-on maximum / physical headroom | 31,121 / 4,447 | **31,121 / 4,447** | `docs/runtime-wall-trace.json` |
| distinct miss events / rows over 32,568 | 0 / 0 | **0 / 0** | PAL audit |
| DLI per host frame / sequence violations | 2 / 0 | **2 / 0** | `docs/runtime-wall-trace.json` |
| behavioural clause failures | 16 | **16**, the same by session and message | `docs/recorded-gate-failures.json` |
| boot smoke / ATR start / loader / menu (delta) | 4/4 / 284 / 341 / 598 (+2) | **4 cold + 1 RESET / 232 / 289 / 546 (−50)** | default trace run; `main` re-measured with the new harness |
| the same, BASIC enabled | 256 / 313 / 570 | **223 / 280 / 537** | same |
| boot / extension / total sectors | 107 / 101 / 208 | **107 / 101 / 208** | `build/manifest.json` |
| initial block content / ceiling (STOP line 13,652) | 13,612 / 13,684 | **13,621** / 13,684 | same |
| `BOOT_STAGE2` | 1,323 B, `$21C1-$26EB` | **1,332 B, `$21C1-$26F4`** | `build/void-strike-65.map` |
| packed starfield → pickup cold staging margin | 152 B | **143 B** | `build/manifest.json` |
| `ENTITY_CODE` free tail / `HYBRID_C_ARENA` free | 26 / 114 B | **26 / 114 B** | same |
| `$AE00` window used / free | 1,991 / 1,593 | **1,991 / 1,593** | same |
| `DIRECTOR_RAM` used / capacity | 602 / 645 | **602 / 645** | `build/encounter-director.map` |
| `npm test` (default build): tests / pass / fail / todo | 887 / 779 / 105 / 3 | **891 / 783 / 105 / 3**, the same 105 by name | `main` from boot-xex-reclaim; re-run this session in a detached worktree: 106 failures, the extra one (`--artifacts refuses anything that is not build/level-N-sM`) an artefact of the worktree's own path `../dark-fighter-baseline` |

**Why the boot is 33-52 frames faster (MEASURED).** The OS screen's ANTIC DMA
no longer steals cycles from the stage-2 CRC and decode. The ATR menu delta
against `docs/boot-deadline-baseline.json` (596) is now −50; the baseline is
not re-recorded (it gates growth; re-basing it is an owner call). Boot-time
only: gameplay rows are the same rows at the same gameplay frames, 52 host
frames earlier. The CRC per-bit loop moves +9 B and stays in page `$25`
(2 B to spare), now held by two link-time `.assert`s.

**Mode-gated gates**, unchanged from `main`'s recorded state:
`--raider-formation-only` passes; `--raider-sector-only` fails with "did not
return to post-sector OPEN"; the remnant gate still reports 63 kills and 62
explosions; the debris visibility gate keeps its one known blank (1 of 990
capital frames), the life at host frames 4451-4487.

**Tests.** New: `tests/boot-loading-blank-screen.test.mjs` (4; three RED on
`main`, the fourth the CRC guard). The boot smoke checks every frame from
power-on (and from the frame after RESET) to the splash in every session, and
has a RESET session (`atr-a5-reset`, reported as `boot_smoke.reset_sessions`);
`--prepare` patches Atari800's `atari.c` so the observer can raise the
warm-start key. Re-pointed: `tests/boot-xex-reclaim.test.mjs` — the call-order
pattern includes the three blanking instructions, and the `BOOT_STAGE2` /
initial-block ceilings carry the 9 B; the reclaimed 14 B are still asserted.

**Owed by the owner.** A smoke of the default ATR (`npm run play:atr`,
SHA-256 `af2e47b6…`) and a BASIC-enabled cold boot
(`atari800 -xe -pal -basic <absolute .atr path>`): no characters before the
splash, BASIC on and off; F5 during play: no garbage before the splash comes
back; the splash with its cassette sound, the loader, the menu and the start of
level 1 unchanged. On SIO2SD: boot once normally and once holding OPTION. The
screen during loading is now plain blue edge to edge (the border too) instead of
the OS's blue box; if black is preferred, it is the same change minus 6 B.

## boot-xex-reclaim — the retired XEX entry leaves the initial block — `OWNER-SMOKE CANDIDATE` (2026-10-01)

Plan and measurements: [plans/boot-xex-reclaim.md](plans/boot-xex-reclaim.md).
Branch `feat/boot-xex-reclaim` from `main` `97344ad`. It closes the follow-up in
[plans/atr-only-build.md](plans/atr-only-build.md) §11 and supersedes that
plan's owner decision 5 ("the ATR stays byte-identical"); nothing else of it is
reopened.

**What changed.** `boot_stage2_xex_entry` (14 B, `$2338-$2345`, `BOOT_STAGE2`)
and its export are removed. Nothing had called it since the XEX was retired.
`boot_stage2_atr_entry` is the only stage-2 entry. The audit found no other dead
XEX code: the `$02` chunk-complete token, `disable_basic_rom`,
`copy_boot_splash_blob` and the sector reader's resident skip are all live on the
ATR, and no `RUNAD`/`INITAD` handling was left. `BOOT_STAGE2` rides raw in the
initial block, so the block returns exactly 14 B. **Every runtime image is
byte-identical to `main`**, and the ATR differs only in boot sectors 1-107. In the
fixed `$01A3` prefix (same size, same instructions) six operand bytes follow
the moved region by −14: `start`'s `jmp boot_stage2_error` and the five
`boot_stage_streams` source addresses.

**Gates — the DEFAULT build.** ATR
`1c3ad1b37149cb1c51b19bb356698ff663df17747eac0762feae7be6ea9b3314`, boot
`549387abf385562cf3a7ca7cbfef8d5885709add9a5e6bb20cee006034ac366e`.

| | `main` `97344ad` | this branch | source |
| --- | ---: | ---: | --- |
| worst line-238 fence margin | 785 (`director-complete-2` f5815) | **785**, same row and frame | PAL audit, 56 replays |
| DMA-on maximum / physical headroom | 31,121 / 4,447 | **31,121 / 4,447** | `docs/runtime-wall-trace.json` |
| distinct miss events / rows over 32,568 | 0 / 0 | **0 / 0** | PAL audit |
| DLI per host frame / sequence violations | 2 / 0 | **2 / 0** | `docs/runtime-wall-trace.json` |
| behavioural clause failures | 16 | **16**, the same by session and message | `docs/recorded-gate-failures.json` |
| boot smoke / ATR start / loader / menu (delta) | 4/4 / 288 / 345 / 602 (+6) | **4/4 / 284 / 341 / 598 (+2)** | default trace run; `main` re-measured in a detached worktree |
| the same, BASIC enabled | 259 / 316 / 573 | **256 / 313 / 570** | same |
| boot / extension / total sectors | 107 / 101 / 208 | **107 / 101 / 208** | `build/manifest.json` |
| initial block content / ceiling (STOP line 13,652) | 13,626 / 13,684 | **13,612** / 13,684 | same |
| `BOOT_STAGE2` | 1,337 B, `$21C1-$26F9` | **1,323 B, `$21C1-$26EB`** | `build/void-strike-65.map` |
| packed starfield → pickup cold staging margin | 138 B | **152 B** | `build/manifest.json` |
| `ENTITY_CODE` free tail / `HYBRID_C_ARENA` free | 26 / 114 B | **26 / 114 B** | same |
| `$AE00` window used / free | 1,991 / 1,593 | **1,991 / 1,593** | same |
| `DIRECTOR_RAM` used / capacity | 602 / 645 | **602 / 645** | `build/encounter-director.map` |
| `npm test` (default build): tests / pass / fail / todo | 883 / 775 / 105 / 3 | **887 / 779 / 105 / 3**, the same 105 by name | full run on each |

**Why the ATR boots 3-4 frames sooner (MEASURED cause, cycle count ESTIMATE).**
`boot_stage2_crc16` also moved 14 B. On `main` its per-bit `bne` at `$2600`
crossed into page `$25`, costing one cycle on each of the 7 taken branches per
byte. Now it sits at `$25F2` and stays in page `$25`. The once-per-byte length
`bne` (`$25FD` → `$2602`) crosses instead. Over the 12,928 B of CRC'd chunks
that is about −77,000 cycles, all before `start`. Every gameplay
figure in the trace is the same frame four host frames earlier (537 leaves move
by exactly −4 frames / −142,272 cycles; nothing else changed). Boot-time only:
nothing in a gameplay frame moved.

**Mode-gated gates**, unchanged from `main`'s recorded state:
`--raider-formation-only` passes; `--raider-sector-only` fails with "did not
return to post-sector OPEN"; the remnant gate still reports 63 kills and 62
explosions; the debris visibility gate still has the one known blank in
`debris-gate-capital-muzzle-ring-2-sweep-fire4` (1 of 990 capital frames, the
life at host frames 4503-4539, four frames earlier than `main`'s 4519 like
everything else).

**Tests.** New: `tests/boot-xex-reclaim.test.mjs` (4; three RED on `main`, the
fourth a prefix guard). Re-pointed: `tests/broadside-fire.test.mjs` "packed
resident broadside image round-trips …" used `boot_stage2_xex_entry` only as
the END delimiter of `boot_stage2_atr_entry`; it now ends at
`copy_boot_splash_blob`, with the pattern unchanged, and it passes. The header
comment of `tests/atr-only-build.test.mjs` no longer cites owner decision 5.

**Owed by the owner.** A hardware smoke of the default ATR (`npm run play:atr`,
SHA-256 `1c3ad1b3…`). Cold boot without OPTION, BASIC on and off; the splash
with its cassette sound; the loader; the menu; the start of level 1; RESET warm
start back into the game. The boot smoke has no RESET session; it checks the
warm-start entry only as `DOSVEC = start`.

## Spread volley — all-or-nothing — `OWNER-SMOKE CANDIDATE` (2026-10-01)

Plan and measurements: [plans/spread-volley-fix.md](plans/spread-volley-fix.md).
Diagnosis: [diagnostics/spread-debug-route-2026-09-30.md](diagnostics/spread-debug-route-2026-09-30.md).
Branch `fix/spread-volley-livelock` from `main` `1c3da14`.

**The defect.** The Spread volley placed its left and right shots first and kept
them, and only the centre decided whether the fire event counted. A volley that
began with fewer than three of the five active slots free, while fire was held,
filled every freed slot with a lone side shot. The centre never fitted, the
burst never advanced and the shot sound never started, until Spread expired.
In the default evidence it hit four replays, all of them Spread taken during or
right after a Rapid burst.

**Owner decision (2026-09-30): the volley is all-or-nothing.** It is admitted
only with three free slots; then left, centre and right are placed in one frame,
the burst advances and the sound starts. Otherwise nothing is placed and the one
pending fire event is retried next frame. The follow-up, offsets, drift,
duration and sound are unchanged. Also corrected in `docs/game-design.md`: the
capsule counter counts every Heavy (Raider or Bomber) and every debris
destroyed by a player shot, one shared counter, capsule on the third (code
unchanged).

**Gates — the DEFAULT build.** ATR
`3bab2e15a2200d22e00f7581ef02bceedd361035e1941f048edb8c0fbf6ae869`, boot
`3cf380ec16098e8c6673a80e0f99893aa7667a3d3da9f5a375cba77a06890327`.

| | `main` `1c3da14` | this branch | source |
| --- | ---: | ---: | --- |
| worst line-238 fence margin | 788 | **785** (same row, `director-complete-2` f5815) | PAL audit, 56 replays |
| DMA-on maximum / physical headroom | 31,626 / 3,942 | **31,121 / 4,447** | `docs/runtime-wall-trace.json` |
| distinct miss events / rows over 32,568 | 0 / 0 | **0 / 0** | PAL audit |
| DLI per host frame / sequence violations | 2 / 0 | **2 / 0** | `docs/runtime-wall-trace.json` |
| behavioural clause failures | 16 | **16**, the same by session and message | `docs/recorded-gate-failures.json` |
| boot smoke / ATR loader / ATR menu (delta) | 4/4 / 345 / 602 (+6) | **4/4 / 345 / 602 (+6)** | default trace run |
| boot / extension / total sectors | 107 / 101 / 208 | **107 / 101 / 208** | `build/manifest.json` |
| initial block content (owner cap) | 13,626 | **13,626** (13,626) | same |
| extension record 2 (pickup + `HYBRID_C_SECTOR`) | 1,120 B, 9 sectors | **1,128 B, 9 sectors** | same |
| `PICKUP_CODE` used / free tail before `$8B67` | 934 / 75 | **944 / 65** | `build/void-strike-65.map` |
| `CODE` / `RODATA` start | 4,478 / `$317E` | **4,478 / `$317E`** | same |
| `$AE00` window used / free | 1,991 / 1,593 | **1,991 / 1,593** | `build/manifest.json` |
| `DIRECTOR_RAM` used / capacity | 602 / 645 | **602 / 645** | `build/encounter-director.map` |
| `npm test` (default build): tests / pass / fail / todo | 880 / 768 / 109 / 3, then 108 recorded after step 4's one re-point | **883 / 774 / 106 / 3**, then **105** after one owner-approved re-pin | the recorded set below |

**Where the bytes went.** `MAIN` is full and its LZ image is the capped initial
block, so the two side allocations moved to the end of `PICKUP_CODE`
(`player_fighter_spread_volley_sides`, 10 B). The free-slot count lives in a
reordered, size-neutral fire path in `CODE`; 3 B of never-executed pad keep
`play_player_fighter_projectile_sound` at `$2D65`. The Director link,
`BROADSIDE`, `ENTITY_CODE` and the sector reader are byte-identical to `main`.

**Cycles** (native, all 32 occupancy patterns): an admitted volley costs
**+46 … +70**, a blocked one **−208 … −298**, the follow-up −4. The
controller's worst volley-due frame goes 516 → 562. The DMA-on maximum falls
because `main`'s five heaviest frames were all inside the stuck Spread window
of `director-complete-0` (f8619-f8654).

**The four replay windows** (plan §8.5): shot-sound frames per Spread
activation go 6 → **154**, 7 → **79**, 11 → **113** and 3 → **153**. The left /
centre / right counts go from 59/0/2, 51/0/5, 71/1/2 and 113/0/29 to
13/25/13, 6/12/6, 9/19/9 and 13/25/13.

**Mode-gated gates.** `--raider-sector-only` ("did not return to post-sector
OPEN") and the remnant gate (63 kills, 62 explosions) fail identically on `main`.
**The debris visibility gate fails on this branch and passes on `main`**:
`debris-gate-capital-muzzle-ring-2-sweep-fire4` has 1 blank of 990 capital
frames, at host frame 4519. That replay diverges from `main` at game frame
2660, once the Spread volleys fire, and host frame 4518 is the player's final
death. This is the known debris death-frame blink (below), reached by a
different replay. **Owner decision (2026-10-01): pre-existing; the clause is
unchanged.**

**Tests.** New: `tests/spread-volley-admission.test.mjs` (3; the crowded-pool and
no-catch-up tests are RED on `main`). Three recorded failures re-pinned to the
build and now pass, leaving the recorded set:
* "one Spread emission is an unambiguous three-projectile fan";
* "Spread respects the six-projectile active budget and admits centre before an
  atomic side pair", **renamed** "Spread respects the five-projectile active
  budget and admits its volley whole or not at all";
* "the configured 28-frame Spread cooldown avoids catch-up at the active limit".

They had failed at their first assertion on stale pins and stale harness
scenarios, which hid this defect. The full run had one new name,
`light-interceptor.test.mjs` "placement contract: …" (the `PICKUP_CODE` tail pin
75 → 65). It was re-recorded with the owner's approval and passes. **The
recorded test failure set is now 105**: the 108 less those three.
(Superseded 2026-10-01: the recorded set is
[recorded-test-failures.json](recorded-test-failures.json), 5 tests.)

**Owed by the owner.** A hardware smoke of the default ATR (`npm run play:atr`,
SHA-256 `3bab2e15…`). Collect Rapid, then Spread while holding fire. Every
volley should be a full left/centre/right fan with the shot sound. Spread from
an empty screen should behave as before, with its single centre follow-up.
After a crowded moment there should be no burst of catch-up fire.

## Roadmap 4.6 step 4 — the capital hull length is level data — **OWNER-ACCEPTED** (released as `v0.2.0`; built 2026-09-30)

Plan: [plans/director-4.6.md](plans/director-4.6.md) §8 step 4, §8.2, owner
decision §11 item 18 (2026-09-30). Branch `feat/director-step-4-hull-length`
from `main` `a930ba0`.

**What changed.** Each level's capital hull length is in its HullGeometry page
(`$AC00`), and the capital code reads the page. The two resolvers take the
module sequences from `$AC08`/`$AC44`, and the phase machine takes the phase
starts from `$AC02`. The 120 resident `BROADSIDE` sequence bytes are a zero pin.
**Level 1 keeps 480 rows. Level 2 flies 352.** One length serves all three
difficulties.
* **Right-aligned** (owner, placement A): a short hull occupies rows
  `480 − L … 479`, and capital entry starts the row clock at `480 − L`. The prow
  taper, the prow collision and the DRAIN mapping stay on the rows they always
  used, so none of them changed.
* **Turrets keep today's density per row** (owner): EASY / MEDIUM / HARD
  **7 / 10 / 14** on level 2's 352 rows, against 10 / 15 / 20 on 480. Density
  steps 0-2 are refused by the compiler until defined.
* **Visible difference found while building A:** the enemy hull trails the
  allied one by 8 rows. No hull module is blank, so on a short hull those 8 rows
  draw the engine module: level 2's enemy engine block is 8 rows longer, and
  its tail lines up with the allied tail. This is a smoke point.

**The wall-trace harness takes a debug-route build** (phase 0):
`--artifacts=build/level-N-sM` runs one focused replay. Its inputs and outputs
stay inside that directory, and it cannot write `docs/`. Its figures are
diagnostic only. Level 2's figures before and after are in
[diagnostics/level-2-timing-2026-09-30.md](diagnostics/level-2-timing-2026-09-30.md):
worst fence margin **1,607 → 1,607**, DMA-on maximum **31,132 → 31,205**, 0 miss
events, capital traversal **1,355 / 1,228 / 1,085 → 1,035 / 921 / 829** frames.

**Gates — the DEFAULT build** (level 1 only). ATR
`43e0495eaac757084da26eb07a17c7a5b5b7d1dac9dedbcd3acd0da41c07a063`, boot
`be71fcae97133e63b509ff3888ed5c2dd2b0ef84f340c57903ea1a9f65c6de09`.

| | `main` `a930ba0` | this branch | source |
| --- | ---: | ---: | --- |
| worst line-238 fence margin | 788 | **788** (same replay and frame, `director-complete-2` f5815) | PAL audit, 56 replays |
| DMA-on maximum / physical headroom | 31,626 / 3,942 | **31,626 / 3,942** | `docs/runtime-wall-trace.json` |
| distinct miss events / rows over 32,568 | 0 / 0 | **0 / 0** | PAL audit |
| behavioural clause failures | 16 | **16**, the same by session and message; 0 new, 0 gone | `docs/recorded-gate-failures.json` |
| boot smoke | 4 / 4 | **4 / 4** | default trace run |
| ATR menu frame / delta | 601 / +5 | **602 / +6** (inside the ≤ +7 rule) | same |
| boot / extension / total sectors | 107 / 101 / 208 | **107 / 101 / 208** | `build/manifest.json` |
| initial block content / ceiling | 13,626 / 13,684 | **13,626** / 13,684 (owner cap 13,626) | same |
| extension record 1 (`BROADSIDE`), packed | 5,583 | **5,502** (−81; 44 sectors) | same |
| `HYBRID_C_SECTOR` | 187 / 248 | **215 / 248** (extension record 2, 9 sectors) | `build/encounter-director.map` |
| `$AE00` window used / free | 1,991 / 1,593 | **1,991 / 1,593** | `build/manifest.json` |
| `DIRECTOR_RAM` used / capacity | 602 / 645 | **602 / 645** | `build/encounter-director.map` |
| capital phase machine, worst case | 104 cycles | **104 cycles** (mean 74 → 80) | native harness, rows 0-519 |
| `npm test` (default build) | 868 / 757 / 108 / 3 | **880 / 768 / 109 / 3**, then **108** after one re-point | the recorded 108: 0 new, 0 disappeared |

**The initial block did not shrink, and could not.** The plan expected the
sequences' 120 B to come out of the initial block. `BROADSIDE` ships in extension
record 1, so the refund lands there: −81 packed B, no sector. The owner accepted
this with a condition: step 4 must not grow the initial block. It does not.
Everything step 4 adds is in extension records.

**The ATR menu frame moved by one** (601 → 602). No sector count changed.
**Cause, MEASURED 2026-09-30** (boot smoke on `main` `a930ba0` in a detached
worktree and on this branch with the same emulator, plus native cycle counts of
the boot sequence in each tree):
* `start` is frame 288 on both, and loader → menu is 257 frames on both. Only
  `show_loader` moves, 344 → 345. The BASIC-enabled sessions (loader 316, menu
  573) do not move.
* `start` → `show_loader` runs with NMI and DMA off, and it is **+2,791 cycles**
  (1,866,322 → 1,869,113). `stage_boot_streams` is +1,265 and
  `unpack_weapon_pickup_phase_runtime` is +1,526. Every other routine is
  cycle-identical, including `unpack_resident_runtime`, the BROADSIDE record
  that got 81 packed B smaller.
* The one staged stream that grew is the pickup/collision record (extension
  record 2, `$8C80` → `$4801`), 1,097 → 1,120 B. Its second LZ stream is
  `HYBRID_C_SECTOR`, 187 → 215 B. `main` reached `show_loader` fewer than 2,791
  cycles before a frame boundary, and this branch crosses it.
* **Candidate fix, NOT implemented, awaiting the owner:** place
  `sector_c_update_capital_phase` (98 B) in `HYBRID_C_ARENA` with a `code-name`
  pragma, where plan §2.4 first put it. The arena record lands in place before
  `start`. A throwaway build measured menu **601**, loader 344,
  start → loader 1,858,168 cycles, arena record 6 sectors (730 packed), all
  sector counts unchanged, initial block 13,626 B.
* **Its costs:** the arena falls from 114 B free to **16 B**, which is the room
  later Heavy C would use, and the evidence would need regenerating again.
* **Owner decision 19 (2026-09-30): not taken.** The menu frame stays 602
  (+6), and the arena move is kept in reserve for when the delta reaches +7
  ([plans/director-4.6.md](plans/director-4.6.md) §11 item 19).

**`HYBRID_C_SECTOR`, +28 B.** It lives in the Director link at `$8602-$86D8`
and travels as the second LZ stream of extension record 2 (start sector 152,
9 sectors), outside the 107-sector initial block. The initial block's 13,626 B
are unchanged in size. Of its 15 changed byte values, the ones identified are
`pickup_packed_size` (1,097 → 1,120) and record 2's entry and CRC in
`boot_chunk_manifest`. The +28 B splits into two parts:
* `sector_c_update_first_capital`, 47 → 55 B (**+8**): the row-clock store,
  under the ~15 B estimated for it.
* `sector_c_update_capital_phase`, 78 → 98 B (**+20**): the phase-start read.
  Plan §2.4 costs this separately at +25-40 B, and it was not part of the ~15 B.

So the "13 B over" is the phase machine, which that estimate never covered.

**The 108 test failures, by name.** The full default-build run's 109 names,
minus the re-pointed flagship test, equal the recorded set exactly: 0 extra and
0 missing. The recorded set is Appendix A of
[plans/hull-set-v1.md](plans/hull-set-v1.md) with its 11 ATR-only renames
applied, less "showcase and asset sheets regenerate without ignored capture
files", which disappeared at `c04156a`. The four test files that commits after
the full run could affect (`flagship-sector`, `github-showcase`,
`source-contracts`, `branding`) were re-run at HEAD and fail with the same four
recorded names, and nothing else. (Superseded 2026-10-01: the recorded set is
[recorded-test-failures.json](recorded-test-failures.json); Appendix A is a
pointer to it.)

**Tests.** New: T7, `tests/hull-length.test.mjs` (7, RED 7/7 on `main`), and
`tests/wall-trace-debug-route.test.mjs` (5, RED on `main`). Five were
re-pointed, each because step 4 did what it pinned the absence of:
* the `HYBRID_C_SECTOR` byte pin (187 → 215);
* step 2's "the geometry page still waits";
* T12's level 2 hull rows (480 → 352);
* the ATR's seeded layout bytes, now read from level 1's run;
* the flagship test's sequence read, now from the geometry page.

The last was the one new name in the full run's 109. It passed after the
re-point, and the suite was not re-run in full.

**Owed by the owner.** A hardware smoke of level 1 (`npm run play:atr`, which
should be unchanged) and of level 2 through the debug route (the 352-row hull,
its turrets and the enemy's 8-row engine lead-in). The checklist is in the
session report.

## ATR-only build — the XEX is removed as a product — `OWNER-SMOKE CANDIDATE` (2026-09-30)

Plan and measurements: [plans/atr-only-build.md](plans/atr-only-build.md). Branch
`feat/atr-only-build` from `main` `e39f2ec`. **Owner decision (2026-09-30): the
XEX is not released; only the ATR ships.** It closes
[plans/director-4.6.md](plans/director-4.6.md) §11 item 7.

**What changed.** The build, every review variant (including the `--level=N`
debug route behind `level:play`) and `dist/` publish the ATR, the boot image and
the manifest, and nothing else. `play:xex`, the XEX format helpers, the XEX
manifest fields, the XEX evidence binding and the stale
`dist/void-strike-65-0.1.1.zip` are gone. Every wall-trace replay boots the ATR.
Sessions with no medium switched and keep their ids; XEX halves with an ATR twin
are deleted; XEX-only sessions are renamed `-xex-` → `-atr-`. The XEX-vs-ATR
parity clauses and parity tests are deleted. `boot_stage2_xex_entry` stays in the
boot image: **14 B, `$2338-$2345`, segment `BOOT_STAGE2`, inside the initial
block**. Removing it would move the ATR, so it waits for its own reclaim task
(done 2026-10-01: boot-xex-reclaim, above).

**Gates — the DEFAULT build.** ATR
`abe3b1819ed23ec74b23b31260adf3317519dd99caa0a757f1a6c4e15b3e80b4` (92,176 B) and
boot `9e5c5d6f73704963d20be5516e15da4ee5c287b30a362a347019180afcddd349`
(26,624 B), **byte-identical to `main`**.

| | `main` `e39f2ec` | this branch | source now |
| --- | ---: | ---: | --- |
| worst line-238 fence margin | 788 (`director-complete-2`, XEX replay) | **788** (same replay, ATR) | PAL audit, 56 replays |
| DMA-on maximum / physical headroom | 31,626 / 3,942 (`director-complete-0`, XEX) | **31,626 / 3,942** (same replay, ATR) | `docs/runtime-wall-trace.json` |
| distinct miss events / rows over 32,568 | 0 / 0 over 73 replays | **0 / 0** over 56 ATR replays | PAL audit |
| DLIs per host frame / sequence violations | 2 / 0 | **2 / 0** | same |
| default replays / ordered frames | 65 / 108,180 | **48 / 94,680** | same |
| integrity booster cycles (`>= 10`) | 10 (5 XEX + 5 ATR) | **11** (5 + 6, all ATR) | same |
| behavioural clause failures | 40 | **16**: 24 removed with their XEX sessions, 1 renamed | `docs/recorded-gate-failures.json` |
| boot smoke | 8 / 8 | **4 / 4** (ATR only) | same |
| ATR menu frame / delta | 601 / +5 | **601 / +5** | same |
| boot / extension / total sectors | 107 / 101 / 208 | **107 / 101 / 208** | `build/manifest.json` |
| initial block content / ceiling | 13,626 / 13,684 | **13,626 / 13,684** | same |
| `npm test` (default build) | 865 / 754 / 108 / 3 | **868 / 757 / 108 / 3** | the 108: 0 new, 0 disappeared, 11 renamed |
| full trace set, wall-clock | 1,380 s | **1,918 s** | §"Trace wall-clock" below |

Every figure above that moved, moved because of the switch itself: sessions were
counted twice or removed. No worst figure moved. The ATR probe of `main`'s own
code (plan §6) gives the same worst fence margin and maximum on 73 of 73 replays.

**The integrity count, restored the owner's way (class (a)).** The ATR
integrity replays alone collect 5 booster cycles; the XEX twin had supplied the
other 5. `memory-integrity-atr-2-hunt-fire6` is added: fire delay 5 → 6, 6
collections, worst margin 2,409. The clause is unchanged. One node-side test had
the same shape. "more than 5000 Raider kills…" summed 2,500 XEX and 2,500 ATR
kills; the ATR now runs the matrix's own 5,000.

**Recorded clause failures, by name.** Removed with their XEX sessions:
`engine-xex-{a5,5a}-{0,1,2}-{immediate,delayed}` "first DLI did not select byte
three of the active A2 list" (12), and the same 12 sessions' "screenshot sequence
differs between XEX and ATR" (12). Renamed:
`lower-playfield-hostile-contact-xex-hard` → `lower-playfield-hostile-contact-atr-hard`,
same message, same cause.

**Tests.** 4 deleted, each a pure XEX-vs-ATR comparison or an XEX-format check.
The list with reasons is in plan §9; none of them was a recorded failure. New
and GREEN: `tests/atr-only-build.test.mjs` (4, RED 4/4 on `main`) and
`tests/atari800-trace-freshness.test.mjs` (3). The 11 recorded failures that lost
their XEX half fail under their new names with the same first error as on `main`.
The rename list is appended to Appendix A of
[plans/hull-set-v1.md](plans/hull-set-v1.md).

**Trace wall-clock.** `main`: 1,380 s (default pass 1,098 s, mode-gated passes
278 s). This branch: **1,918 s**. The default pass took 913 s (48 replays instead
of 65); the mode-gated passes were `--raider-formation-only` 12,
`--raider-sector-only` 19, `--debris-gate-only` **888** and
`--raider-remnant-only` 82. The debris gate took 888 s against 179 s on `main`
for the same three replays, with identical timing figures. The cause was not
investigated; this is a measured wall-clock figure, not a claim that the ATR is
slower.

**Found on the way, pre-existing, not caused here.**
- The in-folder trace emulator was stale (built 22 Sep, header changed
  28/29 Sep). `main`'s own trace aborted with it; rebuilt with `--prepare`,
  `main` reproduces its evidence exactly. The trace now refuses a stale
  emulator (`scripts/atari800-trace-freshness.mjs`).
- `--menu-raster-only` throws "… 0:3 differs from the generated frontend asset" on
  its first session, `xex-00` on `main` and `atr-00` here, so
  `docs/menu-raster-trace.json` cannot be regenerated. It stays as committed,
  and its test stays a recorded failure.
- `npm run verify` refuses with "Runtime wall trace failed its current gate" on
  `main` and here, because `gate.passed` is false while recorded failures exist.

**Owed by the owner.** A smoke of the ATR (`npm run play:atr`), to confirm
nothing player-visible moved. The bytes say it cannot have.

## Roadmap 4.6 step 3 — level 2 — **OWNER-ACCEPTED** (released as `v0.2.0`; built 2026-09-30)

Plan: [plans/director-4.6.md](plans/director-4.6.md) §8 step 3, §8.1, owner
decisions §11 items 15-17 (2026-09-30). Branch `feat/director-step-3-level-2`
from `main` `138689e`.

**What changed.** `assets/levels/level-02.json`, as the owner approved it on
the draft `bb3feeb`. It has six sectors against level 1's four: swarm, elite
(Bombers only), capital, swarm, elite, elite. It has 19 waves, seven of them
Light waves where level 1 has none. It opens on three live Lights and no Heavy.
The capital is on authored row **1,120** (level 1: 272), so it arrives at frame
2,800 / 2,489 / 2,240 on EASY / MEDIUM / HARD. Sector 4 is three Interceptor
waves of 8 at spacing 20; the 16-frame floor is left for later levels. Debris
is 1 in every sector. Region R1: enemy hull style R1, allied steel `$88`.
**Level 2 is not in the default build**: it is reached with the debug route
only, which step 3 made work for any level but 1 (`scripts/build.mjs` read the
level image back with a hard-coded id 1 and threw). The route has plan §7's npm
script now: `npm run level:play -- --level=2[:sector=M]`.

**Gates — the DEFAULT build is byte-identical to `main`.** XEX `bb5ec363…`
(29,332 B), ATR `abe3b181…`, boot image `9e5c5d6f…` and the manifest
`7bce3627…` equal `main` `138689e`. So `docs/runtime-wall-trace.json` still
binds, it was **not** regenerated (it would change only its path strings), and
every figure below is unmoved:

| | `main` `138689e` | this branch | source |
| --- | ---: | ---: | --- |
| worst line-238 fence margin | 788 | **788** | STATUS (pickup boost colour); artifacts identical |
| DMA-on maximum / physical headroom | 31,626 / 3,942 | **31,626 / 3,942** | `docs/runtime-wall-trace.json` `gate`, unchanged |
| behavioural clause failures | 40 | **40** | `docs/recorded-gate-failures.json`, unchanged |
| boot smoke | 8 / 8 | **8 / 8** | `--boot-smoke-only`, this branch |
| ATR / XEX menu frame | 601 (+5) / 392 (+0) | **601 (+5) / 392 (+0)** | same run |
| boot / extension / total sectors | 107 / 101 / 208 | **107 / 101 / 208** | `build/manifest.json` |
| initial block content / ceiling | 13,626 / 13,684 | **13,626 / 13,684** | same |
| `$AE00` window used / free | 1,991 / 1,593 | **1,991 / 1,593** | same |
| `DIRECTOR_RAM` used / capacity | 602 / 645 | **602 / 645** | same |
| `npm test` (default build) | 860 / 749 / 108 / 3 | **865 / 754 / 108 / 3** | the 108 recorded names: **0 new, 0 disappeared** |

The +5 tests are all new and all pass: T12 in `tests/level-compiler.test.mjs`
and four in `tests/level-two.test.mjs`. No existing test was re-pointed.

**Level 2's timing** was measured at step 4, once the wall-trace harness could
take a debug-route build: worst fence margin 1,607, DMA-on maximum 31,132 on the
480-row hull. See the step 4 section above.

**The level timeline probe had two observer defects**, both invisible to level
1 because level 1 authors no Light wave. It never ran the Light wave stepper.
It also lost a member admitted into a slot the probe had just retired.
Both are fixed in `scripts/level-timeline.mjs`; level 1's probe output is
unchanged on all three difficulties. The probe also sized level 2: every sector
spends its waves inside itself on every difficulty (figures in the level file's
notes). Sector 4's last member admits on row **316 of 768** on EASY, so a
player on EASY flies about **22 s** of sector 4 with no new wave — a smoke
point, not a defect.

**Owed:** the owner's smoke of level 2 through the debug route (length is judged
there; plan §11 item 15 says sector 6 is what gets cut), and of the default
build to confirm level 1 plays unchanged.

## Pickup boost colour — the capsule is one `PLAYER3` image in gold `$1C` — `OWNER-SMOKE CANDIDATE` (2026-09-29)

Branch `feat/pickup-boost-colour` from `main` `2c4c193`. Plan
[plans/pickup-colour.md](plans/pickup-colour.md), **Option 2 variant 2a**, owner
decisions of 2026-09-28 (items 1-9) and 2026-09-29 (the colour, items 10-12) in
its §7. Measurements:
[diagnostics/pickup-boost-colour-2026-09-29.md](diagnostics/pickup-boost-colour-2026-09-29.md).

**What changed.** The booster capsule wore `$46` — the enemy accent the Light
Wingman's wing, the Interceptor's rotor pods and the enemy capital mass are drawn
in — because as the GTIA fifth player (`PRIOR $10`, missiles `M0-M3`) its only
possible colour register was `COLPF3`. It is **one `PLAYER3` image** now and
**`COLPM3` is dedicated to it in `OPEN`**, so no palette choice is needed to stop
a pickup reading as an enemy: it has its own register. `PRIOR` is `$00` for the
whole of gameplay, the ship publishes `P0` alone (its amber `P3` plume reached no
pixel — every plume bit lay under a hull bit), the shield pulse writes `COLPM0`
only, and `COLPM3` reverts to `$28` in every capital state for the broadside
missile `M3` and the player explosion.

**The colour is GOLD `$1C`** — decided by the owner on **2026-09-29** after the
hardware smoke of three review builds (gold `$1C` `abe3b181…`, cyan `$AC`
`939cd2cc…`, orange `$2C` `5a5f0c6f…`). `--pickup-colour=1C|AC|2C` stays in the
build for a later comparison; no gate consults a variant. Named to players in
`how-to-play` EN **and** PL together (owner decision V).

### Gates — the DEFAULT build

| | `main` `2c4c193` | this branch | rule |
| --- | ---: | ---: | --- |
| worst line-238 fence margin | 727 | **788** | GO >= 500 |
| DMA-on maximum | 31,670 | **31,626** | target 31,200 / hard 32,568 |
| frames over the hard gate | 0 | **0** | 0 |
| physical headroom | 3,898 | **3,942** | — |
| deadline overruns / missed frames | 0 / 0 | **0 / 0** | 0 |
| DLIs per host frame / sequence violations | 2 / 0 | **2 / 0** | the two-DLI frame is unchanged |
| replay sessions | 65 / 65 | **65 / 65** | complete |
| `determinism.ordered_frames` | 108,180 | **108,180** | — |
| behavioural clause failures | 40 | **40** | name by name against `recorded-gate-failures.json`: **0 new, 0 disappeared** |
| boot smoke | 8 / 8 at 3,300 frames | **8 / 8** | PASS |
| boot / extension / total sectors | 107 / 101 / 208 | **107 / 101 / 208** | no new boot sector |
| initial block content / ceiling | 13,634 / 13,684 | **13,626 / 13,684** | not above the baseline content |
| ATR menu frame / delta | 602 / +6 | **601 / +5** | delta not above +7 |
| XEX menu frame / delta | 392 / +0 | **392 / +0** | — |
| XEX bytes | 29,355 | **29,332** | — |

Everything that moved, moved the right way. One recorded gate failure was
**RENAMED** with the clause it names ("…from the missile plane…" → "…from its PMG
plane…") in `docs/recorded-gate-failures.json`: same session, same frames, same
cause — neither a new failure nor a disappeared one.

| Artifact | SHA-256 | bytes |
| --- | --- | ---: |
| `dist/void-strike-65.xex` | `bb5ec363e4910f7a47e4cb1071658f36098bc1f6b13a8705da5b80ad67b5cad4` | 29,332 |
| `dist/void-strike-65.atr` | `abe3b1819ed23ec74b23b31260adf3317519dd99caa0a757f1a6c4e15b3e80b4` | 92,176 |
| `dist/void-strike-65-boot.bin` | `9e5c5d6f73704963d20be5516e15da4ee5c287b30a362a347019180afcddd349` | 26,624 |

### Bytes — both segments that moved SHRANK

| | `main` `2c4c193` | this branch |
| --- | ---: | ---: |
| `ENTITY_CODE` | 3,161 B, free tail 5 B | **3,140 B**, free tail **26 B** |
| `PICKUP_CODE` | 960 B, stream fill 49 B | **934 B**, stream fill **75 B** |
| `ENTITY_CODE` staging margin | 25 B | **38 B** |
| `$AE00` window used / free | 1,991 / 1,593 | **1,991 / 1,593** |

`CODE` (`$2000-$317D`) and `RODATA` (`$317E-$3FFF`) are byte-identical in size
and no segment start moved: the `MAIN` bytes the change returns went into
`LOADER_SPLASH_CODE_SLACK` (56 → **57**) and
`white_starfield_broadside_abi_pad` (`.res 0` → **`.res 1`**), which is what keeps
`free_broadside_slot` on its fixed `$76A7` integration ABI.

### Tests — the DEFAULT build

`npm test`: **860 tests, 749 pass, 108 fail, 3 todo**, against the default-build
baseline of **852 / 741 / 108 / 3** measured on `main` `2c4c193` in this session's
detached worktree. **+8 tests, all passing** (`tests/pickup-boost-colour.test.mjs`
and the re-pointed pickup raster file), and the failures are **exactly the 108
recorded names — 0 new, 0 disappeared**.

The 108 are Appendix A of [plans/hull-set-v1.md](plans/hull-set-v1.md) minus
`showcase and asset sheets regenerate without ignored capture files`, as the
"Full-suite failure baseline" section below already records. A **candidate**
build fails **113**: the five extra are the ones the default target itself clears
by filling in the measured manifest fields `--candidate` leaves `null`
(`runtime-wall-trace` Spread Shot / debris visual polish / destructible debris,
`runtime-timing` "measured DMA-on fields …", `enemy-roster` "compile-time review
harness …"). **The default-build figure is the baseline; a `--candidate` A/B is
not.**

**Twenty test re-points**, each following the behaviour change it names: the
three of `800322b` and `9a6d70c` (the capsule's plane and bit order, the art
direction's own words, the shield pulse), the twelve of `c150ab6`, the **four
`broadside-fire` `P3` pins** (the `HPOSP3` mirrors dropped from `read_input`,
`respawn_player` and the hull-contact clamp, and `SIZEP3` returned to the
capsule's one-clock size after the explosion — the PMG oracle in that file loses
its "`P0`/`P3` must share one width and one HPOS" assertions with the half they
compared against), and the evidence key
`maximum_simultaneous_missile_blocks` → `maximum_simultaneous_plane_blocks`. One
genuine **harness defect** was found and fixed with them:
`ENEMY_PROFILE_SCORE_BCD` (`$8117`) is never published by the isolation
harnesses, so five score assertions in four files were reading a leftover
boot-staging byte that happened to normalise to the roster's score in decimal
mode. The observer now publishes the authored score
(`publishEnemyProfileScore`); every expectation holds byte-for-byte, now for the
right reason.

### The one clause this change had to re-point, and why

The post-loop **smooth-sequence** gate compared a 16x16 raster window
**byte-for-byte** frame to frame, which asserts that nothing crosses the box
rather than that the capsule is intact. That held only while the object crossing
it shared the capsule's colour: the player's shots are `GAMEPLAY_COLPF2` `$1E`
and the capsule is `COLPM3` `$1C`. MEASURED: the capsule was complete on all
sixteen captured frames (216 px, +2 scanlines a frame, fixed column) while four
of them carried shot pixels inside the silhouette, and the gate threw
`0/0`. It reads the capsule's own register now, exactly as the contact clause
does, and a **complete** silhouette must fill 16 scanlines and all 8 colour
clocks — the raster half of `pickup_plane_rows === 16 && pickup_plane_union ===
255`. It is **stricter** than what it replaces: against a fixture that blanks a
2x2 hole in one captured frame, byte-identity accepts a smaller window at 188 px
and the shipped clause rejects it. Full measurement and both fixtures in §6 of
the diagnostics file.

### What the owner still owes this branch

An owner smoke of the **default** build (`hardware-testing.md` §6-§7): the
capsule's gold against a Wingman's wing, an Interceptor's pods, a Raider and a
Bomber hull, against the player's own yellow shots and against a star; the ship
unchanged; the shield pulse; the player explosion's outer ring in open space and
in a capital sector, where `COLPM3` must go back to `$28`.

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

## Roadmap 4.6 step 2 — the Director reads the level image — `OWNER-ACCEPTED` (owner smoke 2026-09-29)

Plan: [plans/director-4.6.md](plans/director-4.6.md) §2.2, §4, §8 step 2.
Branch `feat/director-level-data` from `main` `28bd1e7`.

**What changed.** `LEVEL1_DATA` is gone — thirteen phase arrays, five event
arrays, 158 B of level 1 compiled into the runtime, and the machinery that
walked them. `src/c/director.c` declares the LevelDef core page as the
structure of arrays it is, one C object per column, in a bss segment the link
config places at `$AA00` with `file = ""`; no byte is emitted into any
artifact and no transport byte is spent, because the sector reader already
fills the level buffer from the level image on both media.
`scripts/level-compiler.mjs` generates both halves of the contract
(`build/level-def.h` for the reader, `build/level-def.inc` for the ABI) and
`src/hybrid/c-asm-abi.s` asserts at LINK time that all seventeen arrays landed
on the offsets the compiler writes.

The row clock drives it: a row-in-sector counter ends a SPACE sector at its
authored length (**R4**) and arms WaveDefs at their authored rows (**R2**); a
Heavy request is answered from the armed wave plus the sector's caps and
archetype mask (**R3**), clamped by the runtime's own subtype ceilings; a Light
wave is handed to the window's stepper. `min(requested, ceiling)` is computed
in one place and the Light class calls it.

**Retired.** The Heavy smoke scheduler and its counter; the Light escort
schedule, its entry-column cycle and its per-difficulty spacing table;
`--force-light-population`; `FIRST_CAPITAL_FRAME` — a CAPITAL sector raises
`CAPITAL_DUE` when the row clock enters it, and the entry still waits for
`sector_c_drain_clear`; and in ASM the provisional Interceptor request wrapper
and its phase selector, which forced a phase policy before asking and would now
force a different SECTOR's caps.

**Level 1, authored to what step 2 measured.** Sector 1 runs **272 rows**: the
capital became due at active gameplay frame 600, the MEDIUM world row there is
**270** (600 × 9/20), and 272 is the nearest 8-row module boundary — and the
row the capital actually admits on. The traversal is **542 rows** on all three
difficulties, so the sectors behind it run **2,896 rows** in all and the level
ends at row **3,710** against 3,712, the two rows the module grid cannot
express. Seed `$6D` keeps all three RNG streams. Spacing 24 is the Heavy class
floor, so the kernel's admission retry still paces the stream. Under owner
decision 8 (below) those 2,896 rows are split **856 + 2,040** rather than
1,448 + 1,448; the total, and therefore the capital row and the level-complete
row, are unchanged.

**Transport — MEASURED, and it FELL.** Owner decision 6's rule is "no new boot
sector, initial block content not above 13,652 B, ATR menu delta not above +7".

| | `28bd1e7` | delivered |
| --- | ---: | ---: |
| boot / extension / total sectors | 107 / 102 / 209 | **107 / 101 / 208** |
| initial block content / ceiling | 13,652 / 13,684 | **13,634 / 13,684** |
| free ATR sectors | 511 | **512** |
| `DIRECTOR_RAM` used / capacity | 643 / 645 | **602 / 645** (43 B tail) |
| code window used / free | 1,509 / 2,075 | **1,991 / 1,593** |

Three of those figures are **re-measured in this session and corrected** from
what the step-2 report carried: the extension is **101** sectors, not 100 (boot
107 + extension 101 = the 208 total both agree on); the ATR keeps **512** free
sectors, not 513; and `DIRECTOR_RAM` holds **602** of its 645 B — a **43-B**
tail, not 54 — measured from `build/encounter-director.map`
(`DIRECTOR_C_RODATA` `$9D75-$9D88` plus `DIRECTOR_C_CODE` `$9D89-$9FCE`) against
`cfg/encounter-director.cfg`'s `start = $9D75, size = $0285`. No runtime byte
moved for this: the build is the same build, the accounting was wrong.

The Director's cold half — sector entry, the wave arm, the ceilings, the
archetype mask and the release veneer — lives in the `$AE00` window, which is
what Q-1 made the room for; `DIRECTOR_RAM` keeps only what its predecessor's
bytes already paid for in the initial block (plan §3.3).

**The reproduction gate, MEASURED.** `scripts/level-timeline.mjs` drives the
real runtime image through a reduced main loop with one fixed kill policy;
`diagnostics/level-1-baseline-timeline-probe.json` is the pre-change timeline
and `diagnostics/level-1-baseline-timeline.json` the native replay it was
cross-checked against.

| MEDIUM | before | after |
| --- | ---: | ---: |
| capital admits | frame 605, row 272 | **frame 606, row 272** |
| level complete | frame 8,249 | **frame 8,249** |
| Heavy formations in 9,000 frames | 109 | **109** |
| first four formations | frames 1, 64, 129, 192 | **1, 64, 127, 190** |
| HARD level complete | frame 7,424 | **frame 7,424** |

**What could NOT be reproduced, and the owner should read it before smoking.**
The retired scheduler alternated Raider and Bomber on **every** admission. A
WaveDef names ONE archetype and the core page holds 20 waves, so 41 alternating
formations cannot be written as 41 waves; level 1 alternates in **blocks**
instead — four Raiders, four Bombers, six and six after the capital. The
repository always described that alternation as smoke scheduling and not a
gameplay contract, which is why the density and the cadence were reproduced and
the order was not. Two further consequences of the row clock (owner decision 3)
are visible and intended: the capital arrives **later on EASY** (frame 681 for
600) and **earlier on HARD** (545 for 601), because the row is now the same on
all three difficulties and the frame is not.

**The owner smoked that and sent it back — level 1 is re-authored in DATA**
(decided by the owner, **2026-09-28, after hardware smoke** of the candidate
below; plan [plans/director-4.6.md](plans/director-4.6.md) §11 item 8). On
hardware (`atari800 -xe -pal -nobasic`) the finding was: after the capital
Raiders appear, and the level then ends with four consecutive Bomber waves and
nothing else, where `main` `28bd1e7` alternated Raider and Bomber throughout.
The decision:

* level 1 is re-authored so **Raider and Bomber waves alternate across the
  whole level**, within the page's **20 waves**. **No Director code, compiler
  or format change** is made for this — it is a data edit to
  `assets/levels/level-01.json`;
* the retired scheduler's **per-formation** alternation is **not** reproduced
  exactly: **per-wave alternation is the accepted equivalent**;
* **backlog idea, not implemented:** a **"mixed wave" bit** in `WaveDef`, so
  that consecutive formations inside one wave alternate between two
  archetypes — for a later level that needs alternation *inside* a wave.

The block order described in the paragraph above is therefore **superseded as
authored data** while its *cause* stands: one `WaveDef` still names one
archetype, and the core page still holds twenty of them.

**What was delivered, MEASURED.** All twenty waves now alternate
R,B,R,B,… with no repeat anywhere — **including across the sector boundary**,
which is exactly what the first authoring got wrong. The Director arms one wave
at a time and a sector entry restarts the cursor, so a wave list the row clock
cuts short is abandoned where the cut falls; when the cut falls *before* a
sector's LAST wave, the next sector's first wave can repeat the archetype the
player just saw. That is how a list which alternates on paper played **twelve
consecutive Raider formations on HARD and twelve consecutive Bombers on EASY**.
The two post-capital sectors are therefore sized for the cut: **856 rows**
carrying 5 waves (every difficulty reaches the last of them, so the cut can
only fall inside it) and **2,040 rows** — one byte of modules, the format's
maximum — carrying the other 13, as the LAST sector, whose cut has no successor.

| 9,000 frames, `scripts/level-timeline.mjs` | EASY | MEDIUM | HARD |
| --- | ---: | ---: | ---: |
| Heavy formations, pre-step-2 baseline | 99 | 109 | 122 |
| Heavy formations at `68b5968` | 100 | 109 | 116 |
| **Heavy formations delivered** | **100** | **109** | **116** |
| longest run of one archetype at `68b5968` | 12 | 9 | 12 |
| **longest run delivered** | **6** | **6** | **6** |

**Six is the floor the format allows at this density**, and the owner should
know the trade before asking for less: one `WaveDef` names one archetype and
the page holds twenty of them, so 116 formations cannot give a run shorter than
six. A run of **two** would cost **63 %** of the level's Heavy density (20
waves × 2 = 40 formations). Per-formation alternation needs the backlog "mixed
wave" bit and nothing else. HARD's 116 against the baseline's 122 is the same
arithmetic seen from the other side: HARD's row clock leaves room for about
122, and buying those six would mean wave counts of seven — a run of seven on
every difficulty. The alternation was taken first, as decision 8 asks.

Sector 1 is left exactly as step 2 authored it, 4 + 4 formations on rows 0 and
88. Raising it to 5 + 5 puts the pre-capital count back on the ten `28bd1e7`
measured — it was measured, and it works — but it also moves the third kill and
with it the first weapon capsule, which three native pickup replays script
themselves around: `weapon-pickup-contact-2-hunt-fire4` fails a clause with it
and passes without it. The alternation does not need it, and the level's own
Heavy counts come out *closer* to the baseline without it.

**Gates — MEASURED on the candidate build carrying owner decision 8.** PAL
timing audit: **65 replays, 0 distinct miss events, 0 frames over the hard
gate**. Boot smoke **8/8**; ATR menu **602**, delta **+6** against the +7 the
owner asked not to exceed; `gameplay_init` 3,102 unmoved. Transport unchanged
from the step-2 candidate: initial block **13,634 / 13,652**, 107 boot sectors,
208 total.
[diagnostics/level-order-pal-audit-2026-09-28.json](diagnostics/level-order-pal-audit-2026-09-28.json).

| PAL gate | `28bd1e7` | step 2 (`68b5968`) | delivered | Gate |
| --- | ---: | ---: | ---: | --- |
| worst line-238 fence margin | 991 | 1,264 | **727** | GO ≥ 500 |
| DMA-on maximum | 31,349 | 31,089 | **31,670** | target 31,200 / hard 32,568 |
| frames over the 31,200 target | ≥ 1 | 0 | **9** | not a gate; the hard gate is 32,568 |
| frames over the hard gate | 0 | 0 | **0** | 0 |
| physical headroom | 4,219 | — | **3,898** | — |

**Two of those moved the wrong way and the owner should see them stated
plainly.** Both come from the same replay family — the three natural
level-completion replays, which are the only ones that play a whole level:

* the worst fence margin is **727** on `director-complete-2-natural-sweep-fire0`
  (HARD). It is still GO by 227 cycles, but it is 264 below the 991 the plan
  §0.1 recorded as the budget ceiling. The next-thinnest margin in the set is
  1,264;
* the DMA-on maximum is **31,670** on `director-complete-0-natural-sweep-fire0`
  (EASY) frame 8,654, with **9 frames over the 31,200 target** on that replay
  and none anywhere else. The frame is a fighter frame with **ten player
  projectiles**, one live Heavy member and both entity slots busy (a debris and
  a pickup) — a Spread-shot frame, not a Director frame. `28bd1e7`'s own
  maximum, 31,349, was already over the target; the hard gate has 898 cycles of
  room left.

**The evidence blocker — blockers 1 and 2 are FIXED; three more are now
visible, and one further clause failure is repaired.**
`docs/runtime-wall-trace.json` is **still not regenerated**. Every step of the
chain below is measured rather than guessed at, and the run now reaches the
**post-loop pickup/booster clauses** before it stops.

*Blocker 1, the weapon-pickup traversal clause — FIXED.*
`scripts/runtime-wall-trace.mjs:5298`, *"Native pickup did not remain one
logical slot and one whole 16-row missile capsule"*. The step-2 note reasoned
from "the same session passes when run alone"; **that premise was an artefact
of the harness** — `--only-session` writes a focused report and *returns*
about a hundred lines before the clause, so a lone run never evaluates it. The
session's own CSV, written by that "passing" run, already violated the clause
on **26 of its 108 ACTIVE frames**. The failing conjunct is
`entity_active_mask === 2`, whose bit 0 is the **debris** slot: the capsule was
intact on 108/108 frames (16 missile rows, union `$FF`, one draw call) and a
debris was simply alive beside it. Class **(a)**, a stale scenario, exactly as
step 2 called it: repaired by re-scripting the session's fire delay 4 → **8**,
which puts the traversal inside the debris-clear window 125-252 with 18 frames
of lead and 2 of trail. **The clause is untouched.** Full measurement, and the
fire-delay sweep behind the choice, in
[diagnostics/pickup-traversal-clause-2026-09-28.md](diagnostics/pickup-traversal-clause-2026-09-28.md).

*Blocker 2, `BLOCKED_STALE_CLAUSE_BOSS_HANDOFF` — `OWNER_DECISION_REQUIRED`.*
With blocker 1 gone the run reaches **65/65 sessions** and throws at
`scripts/runtime-wall-trace.mjs:5723`-`:5729`: *"director-complete-0-natural-sweep-fire0
did not execute BOSS_HANDOFF -> DRAIN -> COMPLETE"*. The clause requires the
**last `director_try_event` of the replay** to sit exactly one frame before
DRAIN — which was the retired phase machine's `BOSS_HANDOFF` event. **Step 2
retired it**: the level now ends inside `director_c_world_row_tick`, which
calls `advance_sector()` without calling `director_try_event`. MEASURED delta
**156 / 365 / 321** on the step-2 level data and **899 / 352 / 381** on the
re-authored one: it fails on both authorings and on all three difficulties, so
it is **inherited from step 2, not introduced by decision 8** — step 2 never
saw it because its run aborted at blocker 1 first. No re-script can repair it;
the mechanism it measures is gone. Everything the clause's *message* names is
true on all three replays (DRAIN, then COMPLETE on the next frame, COMPLETE
terminal, a natural BROADSIDE observed). Three compliant alternatives, with the
recommendation, in
[diagnostics/boss-handoff-clause-2026-09-28.md](diagnostics/boss-handoff-clause-2026-09-28.md).

**DECIDED — the clause is re-pointed, alternative 1** (decided by the owner,
**2026-09-28**; plan [plans/director-4.6.md](plans/director-4.6.md) §11 item 9).
The clause is re-pointed at the mechanism step 2 introduced: **trace/test code
only, no runtime byte**. It is a gate changing because game behaviour changed,
not a gate relaxed — the level-end sequence stays measured, in the terms that
now exist. Alternatives 2 (give the runtime the event back) and 3 (record the
three replays as accepted failures) are REJECTED.

**DECIDED — the new PAL figures are the recorded ones** (decided by the owner,
**2026-09-28**; §11 item 10). Worst fence margin **727** and DMA-on maximum
**31,670** replace **991** and **31,349** as the project's recorded figures.
They come from a **new load coincidence in the natural level-complete run** —
Spread, ten player projectiles, one live Heavy, a debris and a pickup — and
**not from new code**. The plan §4 step-2 tolerance ("+100 cycles on any replay
row" against 991) is **superseded for step 2 only** and stands for steps 3-7,
now measured against 727. **GO ≥ 500** and the **32,568** hard gate are
unchanged and both hold, by **227** and **898** cycles. **This narrows the
budget for the remaining 4.6 steps and for 4.8c**: steps 3-7 have 227 cycles of
fence margin on the thinnest row instead of 491, and 4.8c would be paid out of
the same 227. A step needing more STOPs with its exact cycle requirement rather
than re-basing these figures again.

*Blocker 2 — DONE, and it discriminates.* Owner decision 9's alternative 1 is
implemented in `scripts/runtime-wall-trace.mjs` and
`tests/runtime-wall-trace.test.mjs`: **trace/test code only, no runtime byte**.
The clause now measures the mechanism that ends a level — the **last sector's
row clock** (bit 20, a `director_world_row_tick` PC hit) sits on the frame
before DRAIN, with the Director in its last sector and never leaving it; DRAIN
happens **exactly once** after that tick; COMPLETE follows on the next frame;
COMPLETE is terminal. The single DRAIN frame is also what separates the level's
end from the capital sector's own DRAIN/COMPLETE pair, which lasts **70 / 62 /
56** frames in the same three replays. `boss_handoff_frame` becomes
`level_end_row_tick_frame` and gains `level_end_sector`, so the published
evidence is named for what it measures.
**Discrimination, MEASURED.** It PASSES on all three natural director-complete
replays (EASY row clock 9,517 → DRAIN 9,518 → COMPLETE 9,519; MEDIUM 8,493 →
8,494 → 8,495; HARD 7,731 → 7,732 → 7,733, all in sector 3 of 4, terminal to
frame 10,499). It FAILS, with its own message, on **four** mutations of the
EASY replay's own CSV: the level-ending row tick removed, the level never
completing, DRAIN spanning two frames, and the level ending outside the last
sector. One consequence to read plainly: **until the evidence is regenerated
the re-pointed test is red**, because the committed evidence still publishes
`boss_handoff_frame` — `tests/runtime-wall-trace.test.mjs` goes 10 → **11**
failing against it, and the eleventh is that test. The test and the evidence
move together.

*Blockers 3, 4 and 5 — the pickup/booster family, `OWNER_DECISION_REQUIRED`.*
With blocker 2 re-pointed the run reaches the post-loop pickup/booster clauses
and stops at `scripts/runtime-wall-trace.mjs:6108` — *"Long XEX/ATR traces
completed only 8/10 weapon-booster cycles"* — with two more standing behind it:
`:6116`, the OPTION pause test never arms, and `:6308`, *"Pending weapon pickup
became visible or interactive"*. **One cause for all three:** step 2 moved the
Heavy cadence, which moved the kills, which moved the weapon capsules, and each
of these clauses is scripted around a capsule arriving at a particular moment.
MEASURED against the committed `28bd1e7` evidence — which records
`pickup_rf_cycles` **10**, the pause armed on the two `evasive` integrity
sessions, and 40 behavioural failures equal to the recorded 40:

* the two `hunt` integrity sessions now collect **4** capsules each and the
  `evasive` pair **0**, so the run has **8** where the clause asks 10. The fifth
  capsule is not missing but **late**: its third qualifying kill lands on frame
  **3,943** and it goes ACTIVE on **3,974**, **25 frames** before the session's
  4,000-frame window closes;
* the observer arms the pause test only while the **Spread booster** is active,
  and the flag sits on the `evasive` pair — which now never collects at all, so
  its booster state never leaves 0 and `pause_test_completed` is **0 on both
  media**. The `hunt` pair does reach that state, on frame **2,537**;
* **181 of 514** pending rows read `pickup_missile_rows` 2-10 with union
  **`$30`/`$3C`** — bits 4-7, the **fighter's own missiles** — because the
  observer counts the whole `$3B00` missile-plane page, all four missiles, while
  the capsule is the GTIA fifth player across all four (union `$FF`). The
  pickup's own slot bit is clear on **all 514**.

Two are class **(a)**, one class **(b)**; **none is a runtime defect**. Three
compliant alternatives each, with the recommendation and the grouped question:
[diagnostics/pickup-booster-clauses-2026-09-28.md](diagnostics/pickup-booster-clauses-2026-09-28.md).

**DECIDED — the recommended alternative in each of the three** (decided by the
owner, **2026-09-28**; plan [plans/director-4.6.md](plans/director-4.6.md) §11
item 12), under one rule: **a class (a) clause is never touched, only its
scenario moves; a class (b) clause's condition is never touched either, the
observer behind it is corrected to count what the clause is about.**

* `:6108`, class (a) — the `hunt` half of the `memory-integrity-160s` factory
  is **re-scripted** to a fire delay at which the fifth collection falls inside
  the 4,000-frame window. Clause, threshold of ten and the XEX/ATR parity
  clause beside it untouched.
* `:6116`, class (a) — `pauseTest` moves **back to the `hunt` pair**, where the
  Spread booster the arming condition names is actually reached. Clause, arming
  condition and coverage untouched; the same repair the factory's own
  2026-09-22 comment records in the other direction.
* `:6308`, class (b) — the **observer** is corrected, not the clause.
  `dftrace_measure_pickup_missiles` counts every non-zero byte of the whole
  256-row `$3B00` page, all four missiles, while `pickup_missile_rows` is named
  for and read as the capsule. It is re-pointed at **the capsule's own rows** —
  the `WEAPON_PICKUP_HEIGHT_SCANLINES` window the runtime publishes at
  `ENTITY_SCREEN_LO/HI + WEAPON_PICKUP_SLOT`, exactly the rows
  `clear_fighter_pickup_pmg` clears. The clause's condition stays byte-for-byte
  as written. Every row of all three 16-row silhouettes is non-zero with union
  `$FF`, so the corrected counter still reads **16 / `$FF` / one block** for an
  intact capsule and the six other clauses pinning those values are unaffected
  by construction.

Rejected in every case: lengthening the 160-second sessions (it breaks the
16,000-frame pin and four published figures), arming the pause on both pairs,
and recording any of the three (each needs an `invariant` →
`recordClauseFailure` clause change anyway and each leaves real coverage
unmeasured). **Standing authorisation, this session only:** further
pickup/booster-family clauses whose cause is step 2's moved capsule cadence are
classified, repaired under the same two rules, recorded here and in the
diagnostics file, and the run continues — but a class **(c)** clause, a clause
outside the family, more than **three** further clauses, a fence margin below
**727**, a DMA-on maximum above **31,670** or a failure outside the recorded 40
each STOP the session. No clause is weakened, skipped or re-ordered around.

**Known fragility — recorded, not fixed** (owner, **2026-09-28**; §11 item 13).
The pickup scenarios pass only at specific fire delays — **8** for the
traversal, **5 or 48** for the overlap — so any future change to the debris or
capsule cadence moves them again. The durable repair is the **pickup-colour**
task (`docs/plans/pickup-colour.md`, Option 2a, the capsule on **P3**; that plan
document does not exist yet): with the capsule off the shared missile plane the
pickup observer is re-pointed from the missile plane to **PLAYER3**, and robust
scenarios replace delay-tuned ones. Item 11's `entity_active_mask === 2`
conjunct in the traversal clause hands over with it.

**Behavioural clause failures, name by name — RECONCILED.** MEASURED on a full
from-scratch run of all **65** replays against the reproduced candidate
(boot smoke 8/8 first, then 0 distinct miss events across 65 replays): the run
accumulates **39** failures and **every one of them is in
`docs/recorded-gate-failures.json` — 0 unrecorded**. The overlap failure is
**gone**, which is the re-script working. The **40th** recorded failure,
`weapon-pickup-2-hunt-fire4` *"Booster release did not clear the capsule from
the missile plane in the release frame"*, sits **behind** the abort at `:6108`
and is not reached. Driving the same 65 CSVs through the analysis with those
three aborts **observed instead of thrown** — a diagnostic, not a gate change,
and not committed — the total is **exactly the 40, name for name: 0 new, 0
disappeared**, and the three clauses above are the only things between the run
and its report. That diagnostic also re-derives **DMA-on maximum 31,670** and
**physical headroom 3,898** from the fresh CSVs, unchanged.

*The fourth failure in that family is REPAIRED here, class (a).*
`weapon-pickup-overlap-2-hunt-fire4` — *"final raster contains a cut capsule or
stale post-collection footprint"*, the one the step-2 report listed as not among
the recorded 40. Decoding its fifteen captures: the capsule is 216 COLPF3 pixels
at y 176-191, and from capture 09 a **second** COLPF3 run appears at **y 0-6**
— a fighter missile at the top of the screen, in the column the capsule happens
to occupy. On the last three captures only that run is left (46, 46, 0), and the
capsule is gone from the raster; the trace agrees, reading 0 missile rows, union
0 and a clear slot bit from the collection frame on. **Nothing is cut and
nothing is stale** — capsule and shots share COLPF3 and the missile plane. Of
fifteen fire delays swept, only **5** and 48 pass every clause of the session
(ten of the others collect twice inside 1,300 frames; 4, 6 and 8 leave 46-56
pixels). The session is re-scripted to **5** — the smallest change from the
authored 4 — and renamed `weapon-pickup-overlap-2-hunt-fire5`. **The clause is
untouched.**

**STEP 2 IS CLOSED (2026-09-29).** All five blockers are decided and repaired,
the evidence is regenerated from a full from-scratch run and the default build
links against it.

**The evidence.** `docs/runtime-wall-trace.json` is the output of a complete
`build:candidate` → `runtime:wall-trace` → `build` chain: `evidence.status`
complete, **65 / 65** sessions, `determinism.ordered_frames` **108,180**, boot
smoke **8 / 8** at 3,300 frames, and behavioural clause failures **40** —
reconciled **name by name** against `docs/recorded-gate-failures.json`, **0 new,
0 disappeared**. `npm run build` on the **DEFAULT** target links and binds;
`tests/runtime-evidence-binding.test.mjs` is **2 / 2 green** against the
committed pair.

| Artifact | SHA-256 | bytes |
| --- | --- | ---: |
| `dist/void-strike-65.xex` | `3c0aaea19026abbf699fdbef5cc8d25ce8beb63b16d4596b5b28a933b71e614e` | 29,355 |
| `dist/void-strike-65.atr` | `0d0d9ba9e2333fb2f4edc7370cbc3dc19411a97eec0df7aca9f97fcb56b3138c` | 92,176 |
| `dist/void-strike-65-boot.bin` | `c65819977080b4d642e99fa05b77d0fa1717cd6a843204b575cf2c72e86fef04` | 26,624 |

**Tests.** `npm test` on the **default** build: **852 tests, 741 pass, 108 fail,
3 todo**. The failures are **exactly 108 of the 109** names of
`docs/plans/hull-set-v1.md` Appendix A — **0 new**, and **one disappeared**:
`showcase and asset sheets regenerate without ignored capture files` now
**passes**, because `docs/media/manifest.json` is regenerated against the
current `dist/` rather than restored. So the default-build baseline moves from
**836 / 725 / 108 / 3** to **852 / 741 / 108 / 3**, with the recorded failure set
**108** names rather than 109.

**One failure fell outside that set and is repaired here** — see the parallax
cadence decision below.

**Variant builds no longer share `build/` with the default build** (owner
decision, 2026-09-28). A review variant used to write its artifacts into
`build/<variant>/` but every intermediate it generated — the level images, the
`.inc` files, the maps, the labels, `build/manifest.json` — straight into
`build/`, on top of the default build's. MEASURED instance: `--level=1:sector=2`
left `build/level-1.bin` carrying `debug_start_sector = 2`, and
`tests/level-compiler.test.mjs` T2 failed against it whenever the suite ran them
in that order. The variant's directory is now the **build directory itself**, and
`tests/build-variants.test.mjs` T8 pins that not one byte of the default build's
`build/` moves.

**DECIDED — the introductory parallax cadence conjunct is RE-POINTED,
alternative 1** (decided by the owner, **2026-09-29**; plan
[plans/director-4.6.md](plans/director-4.6.md) §11 item 14;
[diagnostics/parallax-cadence-debris-clause-2026-09-29.md](diagnostics/parallax-cadence-debris-clause-2026-09-29.md)).
The one failure outside the recorded set was `every difficulty preserves exact
introductory parallax cadence before debris admission`
(`tests/runtime-wall-trace.test.mjs`), green at `28bd1e7`. Its stale conjunct was
`full_debris_flight_frames === []` on all three difficulties — the measurement
window held **no debris at all**. **The cause is step 2 working as intended:**
the Director now reads level 1 sector 1's authored `hazards.debris: 1` — a field
**unchanged since `28bd1e7`** — and admits it on sector entry at active gameplay
frame **32**, in a session that never fires (MEASURED: spawn at frame 31 on all
three difficulties, `entity_y` 16, both Heavy members alive, from the run's own
CSVs). **The owner smoked this exact candidate, with debris in the opening
seconds, and accepts it**, so the premise is gone for good.

The conjunct is re-pointed at the clause's own subject, measured through the
debris layer: a flight's `seconds × measured_rows_per_second.debris` is the
**distance** crossed, which is the **28-row gameplay band** (224 scanlines / 8 —
MEASURED as 28 distinct `entity_y` values, 16 to 232 in 8-scanline steps) on
**every** difficulty while the rate is not, so the lengths fall strictly as the
rate rises: **116 / 104-105 / 94** frames at 12 / 13.5 / 15 rows per second. The
one-row tolerance is derived from frame-granularity sampling at both ends, not
fitted. The cadence half of the clause — the three sessions and their
`fire_delay` 4,000 — is **unchanged**, and the test is renamed to say what it now
measures. **Trace/test code only, no runtime byte.** It discriminates: three
mutations of the report — a 60-frame flight, HARD given the EASY length, and EASY
given the HARD rate *and* length — each fail, the last on the ordering conjunct
alone, while the real report passes on all three difficulties. Alternatives 2 (a
harness-only debris-free sector) and 3 (record it as an accepted failure) are
REJECTED.

**Tests re-pointed off the retired symbols** (owner decision, 2026-09-28, item
1). Ten files asserted on the six schedulers step 2 retired. Nine are
**re-pointed** at the mechanism that replaced them — the armed WaveDef's own
bytes, `heavy_archetype_offset` and `heavy_escort_offset` (with `NO_ESCORT`
`$FF`), the two halves of `director_c_light_ceiling()`, and the `CAPITAL_DUE`
flag the row clock raises in place of the retired `FIRST_CAPITAL_FRAME` gate —
and the schedule *positions* 0/1 become archetype **byte offsets** 0/36 wherever
a test named a formation. Two assertions in `tests/heavy-bomber.test.mjs` are
**retired rather than re-pointed**, because T10 requires the smoke scheduler and
its two-entry escort table to be gone and there is no schedule left to be
temporary data; the placement contract they shared a test with keeps its own
test. The automatic Raider/Bomber and Wingman/Interceptor **rotations** are not
reproduced either: which archetype a wave names is authored level data now,
pinned in `tests/level-one-equivalence.test.mjs`.

**What the owner checks on hardware.** Level 1 should open with a Raider
formation and its Wingman escort, exactly as before; from then on **Raiders and
Bombers should alternate the whole way through — before the capital, after it,
and to the level's end** — in blocks of at most six, with no stretch of one
archetype longer than that anywhere. The capital should arrive at about the
same moment on MEDIUM and visibly later on EASY, as decision 3 intends, and the
level should end where it did.

## Roadmap 4.6 step 1 — the JSON level compiler — `OWNER-ACCEPTED` (owner smoke 2026-09-23)

Branch `feat/level-compiler` from `main` at `2577352` (step 0, `LEVEL_BUFFER`
16 sectors). Step 1 of [plans/director-4.6.md](plans/director-4.6.md) §8, under
the owner decisions of 2026-09-23 in that plan's §11 (JSON authoring source,
Q-1 = 16 sectors, capital start on an authored row, four hull lengths, capital
Light ceiling restricted).

> This section records **step 1 as it was smoked**. Step 2 above is accepted on
> top of it and supersedes every figure here that it moved — the runtime reads
> the image now, and the transport and PAL figures are step 2's.

**Levels are authored data now.** `assets/levels/level-01.json` is the source;
`scripts/level-compiler.mjs` validates it against the caps the runtime can
honour and compiles it into the three pages of plan §2, and the level image
carries them. [level-authoring.md](level-authoring.md) is the vocabulary;
`npm run levels:check` is the validator alone (under a second, no build) and
`npm run levels:preview -- 1` prints the level as a table.

**The runtime reads nothing new.** The Director still runs on `LEVEL1_DATA`,
the hull resolvers still read the resident `BROADSIDE` sequences, and the
capital phase thresholds are still constants. Those consumers are steps 2, 4
and 5. The format is frozen at this step so no later step changes the image
layout. `tests/level-compiler.test.mjs` pins that nothing in `src/` reads
`$AA00`-`$AC7F` yet.

**What travels.** The level image grows **8 → 13 sectors** (1,024 → 1,664 B):
LevelDef core `$AA00` (256 B), LevelDef payload `$AB00` (256 B, zeroed until
steps 5-6) and HullGeometry `$AC00` (128 B — 480 rows, phase starts 4/14/46/56,
and the two 60-byte module sequences byte-for-byte as `BROADSIDE` assembles
them). 13 of 16 buffer sectors; `$AC80-$ADFF` stays spare. The XEX-only block
at `$A600` grows by the same **640 B** (28,390 → 29,030 B); on the ATR the
level run is sectors 320-332 and the START GAME read grows five sectors.

**Reproduction gate.** Sectors 1-8 of the image are byte-identical to the image
that shipped at `2577352` apart from header bytes 4-6, which state the image's
own length (sector count 8 → 13, payload length 1,016 → 1,656). Byte 7 stays
**9**. Pinned as a SHA-256 over bytes 0-3 and 7-1023 in
`tests/level-compiler.test.mjs`; the music and hull blocks are additionally
compared against `build/gameplay-music.bin` and `build/level-hull-block.bin`.

### Gates — the DEFAULT build

`dist/void-strike-65.xex` 29,030 B
`0b8cd967ce16b22885c79dcba77e6e04ba51842d75ed88c49374c045586debba`;
`dist/void-strike-65.atr` 92,176 B
`b479f2437a7c887a400b6c8fa3c1753a4e611516e19f4e6706b3a40bb00a2f94`;
`dist/void-strike-65-boot.bin` 26,752 B
`ae4f574df1776803610e8750cd7b834a83f1616b9dbaabdb40480b4a63cdc0c2`.
Evidence regenerated and `final-bound` to those artifacts.

| Gate | Before (`2577352`) | After | Source |
| --- | ---: | ---: | --- |
| worst fence margin (GO ≥ 500) | 991 | **991** | PAL audit, `director-complete-2-natural-sweep-fire0`; 65 replays, 65 PASS, 0 deadline overruns, 0 missed frames |
| DMA-on maximum (target 31,200 / hard 32,568) | 31,349 | **31,349** | `runtime-wall-trace.json` `gate.measured_wall_cycles_dma_on` |
| physical headroom | 4,219 | **4,219** | same file |
| boot / extension / total transport sectors | 107 / 102 / 209 | **107 / 102 / 209** | `build/manifest.json` |
| initial block content vs ceiling | 13,652 / 13,684 | **13,652 / 13,684** | manifest `initialBootContentBytes` |
| ATR menu frame / delta / warn frames left | 603 / +7 / 3 | **603 / +7 / 3** | boot smoke 8/8 PASS; ATR loader 346 and start 288 also unmoved |
| `HYBRID_C_WINDOW` free tail | 2,075 B at `$AE00` | **2,075 B at `$AE00`** | manifest `residentCapacity.basicWindow` |
| free ATR sectors | 511 | **511** | manifest `remainingAtrSectors` |
| level image | 8 sectors / 1,024 B | **13 sectors / 1,664 B** | the one figure plan §8 step 1 names for this step |
| ATR START GAME read | 30 frames / 8 command frames | **49 / 13** | boot smoke; ~3.8 frames a sector, behind the loader screen and after the menu milestone |

**No resident byte moved.** `dist/void-strike-65-boot.bin` is the same 26,752 B
and differs in 14 bytes: the reader directory's sector count for level 1
(`40 01 08` → `40 01 0d`) and the packing and checksum bytes that follow from
it. The only boot-smoke milestone that moves is `gameplay_init` 3,083 → 3,102
(`main_loop` 3,086 → 3,105) — the +19 frames of the longer START GAME read,
which happens behind the loader screen, after the menu deadline, and is
outside every gate.

**The PAL clause failures are the recorded set, A/B'd:** 40 before, 40 after,
0 added, 0 disappeared.

### Tests

`npm test` on the default build. `tests/level-compiler.test.mjs` is new (7
tests: T1 the validator, T2 the image and the geometry page, the reproduction
gate, the authored level 1, the tooling pins, and "step 1 leaves the runtime
reading nothing new"). Re-pinned with their reason in the test:
`level-buffer-16.test.mjs` and `level-hull-block.test.mjs` (8 → 13 sectors),
`gameplay-music-placement.test.mjs` (8 → 13, byte 7 now points at a page that
exists, and the START GAME frame bound 7+32 → 7+44).

### Deviations from the plan, reported

1. **The core page magic is `$51`, not `$56 | 1`.** Plan §2.2 writes the byte
   as "`$56 | format nibble`", which a bitwise OR cannot express: `$56`'s low
   nibble is already 6, so `$56 | 2` would equal `$56`. The magic takes the
   **high** nibble of `$56` (`V`) and the format the low one — `$51` for
   format 1. Fail-closed still works and the format is still distinguishable.
2. **The reproduction gate excludes header bytes 4-6.** The brief asks for the
   unchanged pages to be byte-identical; bytes 4-6 are the sector count and
   payload length, which state the image's own size and must move when it
   grows from 8 to 13 sectors. Every other byte of sectors 1-8 is identical,
   and the test pins exactly that.
3. **The capital sector's row in `level-01.json` is provisional.** Today's
   capital arrives on `FIRST_CAPITAL_FRAME = 600`, a frame gate with no row.
   Plan §11 item 3 puts the capital on an authored row and measures the
   MEDIUM row reached at frame 600 **at step 2**; this file authors a
   structurally faithful placeholder (four sectors summing to the 3,712 rows at
   which `LEVEL1_DATA` completes the level) and step 2 re-authors the row.
4. **A hull length other than 480 rows is rejected, not compiled.**
   `compileCapitalHulls` grows its length and density parameters at plan step
   4; until then the compiler validates the four authored lengths and emits the
   hull the asset compiles, with a message that names step 4.

---

## Capital hull set v1 — step 2 (level hull styles) — OWNER-SMOKE CANDIDATE (2026-09-23)

Branch `feat/hull-level-styles` from `main` at `b49bb96`. Step 2 of
[plans/hull-set-v1.md](plans/hull-set-v1.md), under the owner decisions of
2026-09-22/23 recorded in that plan's §13. **The enemy hull style and the
allied hull colour are level data now.**

**What travels.** The region's 280-byte hull block — enemy packed map (160 B),
codebook (16 B), the seven surface glyphs for charset codes 70-76 (56 B) and
the 32 per-row collision boundaries — rides in the level image at sector 6,
`$A880-$A997`, with the level's allied `GAMEPLAY_COLPF1` as byte 2. One
resident routine, `publish_level_hull_style` (31 B), publishes it at gameplay
start on the loader screen: 56 bytes to `$4630-$4667`, 32 into
`enemy_collision_boundaries`, one into the gameplay DLI's immediate operand,
then it tail-jumps into the unpack, whose enemy half now reads the block.
**MEASURED cost at level start ≈ 1,250 cycles**, outside every visible-frame
budget. **In-frame cost is zero by construction**: the DLI still executes
`lda #imm`, and no other instruction changed.

**Region and colour.** `hullStyleIdForLevel` divides the campaign into four
equal regions — `1 + floor((level − 1) × 4 / LEVEL_MAX_ID)` — so the mapping is
parametric, not hardcoded. The campaign length is `LEVEL_MAX_ID = 16`
(`scripts/build.mjs`, `src/hybrid/sector-reader.s`, asserted against the level
directory; owner decision E says the same). **One document disagrees**:
`docs/how-to-play.md` §"What is in the build" still says "The twelve-level
campaign" — stale player-facing text from before decision E, read by no code.
The allied steel is `$88` for the first half of the campaign and `$84` for the
second; **`$88` is the release default now** and the value the previews render.
The final darker step (`$84` or `$86`) is an owner decision at this step's
smoke. `COLPF1` also colours enemy accents, hostile projectile trails and the
Light steel arms, which is the accepted point of the change.

**Zero resident bytes, and MEASURED zero address moves.** The retired enemy
packed map keeps its 160 `RODATA` bytes in place — the routine at `$3770` plus
`hull_level_publish_slack`, 129 B at `$378F-$380F` — and the retired codebook
keeps its 16 `BROADSIDE` bytes as `enemy_hull_codebook_reserve` at `$68AB`.
A/B against a clean build of `b49bb96`: **1,528 linked labels in both links, 0
moved**; the only differences are the two retired labels and the new ones.
Deleting either slack slides every later address and has cost the heaviest
frame 17 cycles before.

**Envelope.** The initial block **shrank** 13,682 → **13,652 B** of its
13,696 B envelope (160 B of map pack worse than 31 B of code and 129 zeros), so
the headroom against the 13,684 B ceiling goes 2 → 32 B. **Boot stays 107
sectors**, extension 102, total transport **209** — unchanged, so
`boot-deadline-baseline.json` is not re-recorded. Level 1 grows **7 → 8
sectors** and header byte 7 goes **6 → 9**; the two inert pattern sectors the
image carried are consumed and one sector is added, none of it boot transport.
The XEX grows 28,255 → 28,383 B; the ATR is unchanged at 92,176 B.

### Gates — the DEFAULT build

XEX `dffc73ea1dcac8a3bf846ab995daca30bce72c73d1c6d0d33abc3db9e2a2a7fa`
(28,383 B), ATR `5f0cad436a0f41844a6475c107dc254f55cda61f1c0e99b2e1f57083b2465851`
(92,176 B), boot `193dc36dcd05acff7bb59ff3bf5595a7033f847d79917a5cb4f88a77d3e3662c`.

| | `b49bb96` | delivered |
| --- | ---: | ---: |
| worst fence margin (GO ≥ 500) | 991 | **991** |
| DMA-on maximum | 31,349 | **31,349** |
| physical headroom | 4,219 | **4,219** |
| rows over the 31,200 target | 4 + 3 | **4 + 3** |
| recorded clause failures | 40 | **40**, same names, 0 new, 0 disappeared |
| initial block content / envelope | 13,682 / 13,696 | **13,652 / 13,696** |
| boot / extension / total sectors | 107 / 102 / 209 | **107 / 102 / 209** |
| ATR menu deadline | 603 (+7, 3 warn frames left) | **603**, unmoved |
| level-1 image | 7 sectors | **8 sectors** |

**PAL audit — 74 replays, 0 distinct miss events, 0 rows over the hard gate, 0
deadline overruns, 0 missed frames.** The worst frame is still
`director-complete-2-natural-sweep-fire0` at **991**; the two replays over the
31,200 target are `director-complete-1-natural-sweep-fire0` (4 rows) and
`raider-remnant-rapid-xex-hard` (3), exactly as before. Evidence regenerated in
one unbroken default run (`build:candidate` → `runtime:wall-trace
--atari800-source=build/atari800-trace` → `build`);
`tests/runtime-evidence-binding.test.mjs` and
`tests/release-gate-semantics.test.mjs` 9/9 green.

**Boot smoke 8/8**, every milestone unmoved: XEX 135/392, ATR 346/603. The ATR
START GAME read grows to **8 command frames and 30 load frames** (was 7 and 26)
— after the menu, on the loader screen, gated by nothing.

**Tests.** `npm test` on the **default** build: **820 tests, 709 pass, 108
fail, 3 todo**, plus the documented `docs/media` regeneration failure that
passes only on a second consecutive run. Counted with it the failures are
exactly the **109** names of the plan's Appendix A — **0 new, 0 disappeared**.
`820 − 811 = 9` new tests, all in `tests/level-hull-block.test.mjs`, **all nine
red at `b49bb96`**: the block in the image and header byte 7, the region
mapping read from `LEVEL_MAX_ID`, the per-level colour byte, the block's glyphs
against `hull-set-v2.json`, the 14 surface codes (compile-time and after
publication), the publication executed on the 6502, a second region publishing
different glyphs/boundaries/steel, the 8-sector START GAME read and the
`--hull-style` review variant. Six existing pins are re-pinned with their reason
in the test: the LevelDef sector arithmetic and the START GAME read
(`gameplay-music-placement`), the block's reserved header field and the steel
constant (`hull-set-v1`), the resident enemy map/codebook and the strip render
(`capital-hulls`), and the gameplay palette row plus the strip SHA (`preview`).

**One harness fix the suite found**, in `scripts/weapon-pickup-runtime.mjs`:
the runtime harness placed the level image only where the XEX happens to carry
it as a block. The ATR reads it over SIO before `start_gameplay` runs, so a
harness that starts after that read must place it for both media; without it
the ATR path unpacked the enemy hull from cold RAM and the Spread hull traces
diverged between media for a reason the hardware does not have.

**Q-1 (`LEVEL_BUFFER` 16 vs 24 sectors) — unchanged, and now MEASURED.** The
per-level hull demand is **3 sectors** (280 B used of 384). A level is
therefore header + music 5 + hull 3 = **8 sectors today**, and with 4.6's
LevelDef pages (2 + 2, ESTIMATE) **12 sectors** worst case. Sixteen sectors
leave 4, twenty-four leave 12. **The hull set does not force the 24-sector
answer**; Q-1 stays a music/4.6 question.

**Seeing all four regions before the campaign exists.** `npm run hull:style:R1`
… `R4` (`node scripts/build.mjs --hull-style=Rn`) bake one region — its style
*and* its half's allied steel — into level 1. They are review variants:
artifacts go to `build/hull-style-Rn/`, never `dist/`, runtime measurement is
skipped and no gate consults them. The default build is R1 with `$88`, as
level 1 is in region one.

**What the owner should look at in smoke:**

1. **R1 in the default build** must look exactly like the step-1 candidate —
   this step moves the art, it does not change it.
2. **Each region's enemy style**, one build at a time: `build/hull-style-R2`,
   `R3`, `R4`. R2, R3 and R4 still show one emplacement per 32-row texture
   (the §12 decision, revisited in step 3).
3. **The allied steel in both halves**: `$88` in R1/R2 and `$84` in R3/R4, and
   whether the darker half should ship `$84` or `$86`.
4. **Readability in the darker half.** `COLPF1` is shared, so `$84` also dims
   the enemy `wacc` accents, the hostile `PULSE`/`LASER`/`BOMBER` projectile
   trails and the Light steel arms against black. The trails are the ones to
   watch: they are thin and they are the warning the player reacts to.

## Capital hull set v1 — step 1 (art v2, FULL MASS) — OWNER-SMOKE CANDIDATE (2026-09-22)

Branch `feat/hull-v2-generator` from `main` at `ded0687`. Step 1 of
[plans/hull-set-v1.md](plans/hull-set-v1.md): the owner-approved hull art
replaces the accepted H4.2 C INDUSTRIAL allied/enemy pair. **The runtime is
untouched.**

**The art is now v2.** The owner ran the step-1 smoke on hardware and rejected
the v1 look: the deck interior was black, so the hull read as a thin ribbon
floating in space rather than reaching the screen edge, and the v1 frame line
and rib appeared as detached vertical lines that look like display artefacts.
**Owner decision, 2026-09-22: the hull is FULL MASS out to the screen edge,
with texture cut into the mass as grooves and seams.**
`assets/graphics/hull-drafts/hull-set-v2.json` (preview
`set-MASS-sheet.png`) is the source of truth and
`scripts/hull-set-import.mjs` now reads it; `hull-set-v1.json` stays in Git as
the superseded draft and the provenance of the rejected smoke. **The hull
profile, the turret positions and count, the colour registers, the chamfer
collision convention, the code layout inside 59-89 and every address are
unchanged from v1** — only the pixels and the map cells behind the wall move. The resident path still carries one allied map and one enemy map,
`build/capital-hulls.inc` emits byte-identical constants, and **every linked
segment keeps its address and size** — `CODE $2000-$317D`, `RODATA
$317E-$3FFF`, `STARFIELD $54E4-$5CA9`, `BROADSIDE $5E10-$780C`, `PICKUP_CODE
$8776-$8B0D`. Only data bytes changed, so `docs/memory-map.md` has nothing to
re-record (no reserved address, segment or range moved).

`assets/graphics/capital-hulls.json` is `formatVersion 2`: one allied hull and
four enemy styles by region, compiled into four level hull sets (allied ∪ style
*n*). The enemy art and map are authored in allied orientation and mirrored at
compile time. `scripts/hull-set-import.mjs` converts the reviewed draft
`assets/graphics/hull-drafts/hull-set-v2.json` into that asset and `--check`
asserts the committed asset is exactly what the draft produces, so the art
cannot drift by hand. **v2 draws no blank cell**, so the v1 shared `deck` glyph
is gone: the allied hull owns all seven of codes 59-65 (`solid`, `wall`, `wacc`,
`ch_in`, `ch_out`, `groove`, `seam`) and each style owns its own 70-76. Per-level
surface codes are **13 / 14 / 13 / 14** for R1-R4 (7 allied + 6/7/6/7 enemy),
equal to the draft's own `totalWithAllied` counts and inside decision AA's
14-code budget. The generator keeps its `faction: "shared"` rule for anything
that declares one; no shipped glyph does.
`packedDataBytes` is 1,005, unchanged. The four 280-byte per-style hull blocks
are emitted to `build/hull-style-R{1..4}.bin`; nothing loads them yet — that is
step 2.

**Owner decisions of 2026-09-22** are recorded in
[plans/hull-set-v1.md](plans/hull-set-v1.md) §12. The one that changes what the
owner will see: decisions 3/4 (move the recessed muzzles onto the projection
column) and decision 5 (one active turret module per side, no decorative
turrets) are only jointly satisfiable with **one turret per style**, because
under a single turret module a second muzzle row makes the generator substitute
the disabled module for whichever module contains it — hiding the emplacement
*and* deleting an eighth of that style's texture. R2, R3 and R4 therefore show
one emplacement per 32-row texture instead of the two on `set-B-sheet.png`.
Those three styles are `DEFERRED` until after the allied + R1 smoke, so step 3
can revisit it at no cost to steps 1-2.

The contour rules relax to the one hard band `5 <= depth <= 8` (decision 6). The
v1 transition count, the two-to-eight run-length window and the "use all four
depths" rule were generator-only statistics; the runtime reads per-row boundary
tables and never inspects them. The approved drafts draw one-row 45-degree
chamfers and runs up to 13.

### Gates — the DEFAULT build

XEX `9ea9dbfa870d511b154132b3be7906fe4d52b916480278037a7c924460c953b9`
(28,047 B), ATR `4622beb15b3f728d24905e8eeeeac2c3a9be003ea5be1ca62fa91e4c10c6079d`
(92,176 B). **The link map is identical to the branch head in every segment —
0 byte deltas, 0 address moves — and `packedDataBytes` is still 1,005.** The
only envelope movement is a SHRINK in transport: solid mass packs better than a
hull drawn around a black interior, so the initial block's content falls
13,559 → 13,556 B and its LZ streams give a sector back — **boot 107 → 106
sectors**, total transport 208 → 207, XEX payload 26,624 → 26,496 B, XEX file
28,175 → 28,047 B. The resident staging end moves `$9AC3` → `$9AC0` (3 B of
extra margin) and the BROADSIDE runtime packs 5,590 → 5,596 B. ATR size
unchanged. `docs/boot-deadline-baseline.json` is **not** re-recorded: its rule
is about deliberate growth, and boot smoke measures XEX unmoved at 135/392 with
ATR 343/600 → 344/601, inside the ±10 warn band.

**PAL timing audit — the full set, 74 replays, 0 distinct miss events, 0 rows
over the hard gate, 0 deadline overruns, 0 missed frames.** Boot smoke **8/8**. The evidence was regenerated
once as this branch's own change — `build:candidate` → `runtime:wall-trace
--atari800-source=build/atari800-trace` → `build`, one unbroken default run.
Recorded clause failures **40, 0 new and 0 disappeared**;
`gate.timing_and_dli_passed` true; `gate.passed` false on this branch and on
`ded0687` alike, which is the recorded-failure state, not a regression.
`tests/runtime-evidence-binding.test.mjs` green.

**The worst fence margin is 979 cycles**, unmoved, at
`director-complete-2-natural-sweep-fire0` — the same replay, the same number the
v1 art measured. The measured DMA-on maximum is **31,351** and the physical
headroom **4,217**, both identical to the v1 art; rows over the 31,200 target
are **7** across the whole set (4 on `director-complete-1-natural-sweep-fire0`,
3 on `raider-remnant-rapid-xex-hard`), `>hard` is 0 everywhere. **The v2 art
moves the runtime evidence by nothing at all.** Against the committed evidence
of `ded0687` the heaviest frame had **moved between replays** rather than
growing anywhere it binds:

| replay | `ded0687` max wall | branch max wall | rows over the 31,200 target |
| --- | ---: | ---: | --- |
| `debris-effects-2-sweep-fire4` | 31,216 | **30,957** | 2 → **0** |
| `capital-muzzle-ring-2-sweep-fire4` | 31,216 | **30,957** | 2 → **0** |
| `director-complete-0-natural-sweep-fire0` | 31,164 | 31,164 | 0 → 0 |
| `director-complete-1-natural-sweep-fire0` | ≤ 31,164 | **31,351** | 0 → **4** |
| `raider-remnant-rapid-xex-hard` | — | 31,226 | 2 → **3** |
| `raider-remnant-spread-xex-hard` | — | 30,571 | 1 → **0** |
| `debris-gate-capital-muzzle-ring-2-sweep-fire4` | — | 30,957 | 2 → **0** |

Measured DMA-on maximum **31,216 → 31,351** (+135), physical headroom
**4,352 → 4,217** — both against the accepted checkpoint, and both unmoved by
the v2 art. Rows over the **31,200 target** across the whole set go
**9 → 7** against the figures recorded for the accepted checkpoint; `>hard` is
**0** on every one of the 73 replays, as is `missed_frames`. This is the
second-order effect the plan's §9 predicted and bounded:
`broadside_hits_opposite_hull` scans from the corridor edge outward until the
first hull cell, so a different contour moves where the heavy frames land. No
code executes a different instruction.

The debris visibility gate's single post-capital blank on
`debris-gate-0-neutral-fire0` is the documented pre-existing failure and is
unchanged (1 blank / 1 disappearance; the other two debris replays are 0 / 0).

**Full-suite failure list identical to `ded0687`.** `npm test` on the **default**
build: **800 tests, 689 pass, 108 fail, 3 todo**, plus the documented
`docs/media` regeneration failure, which passes only on a second consecutive run
because the first run already rewrote the tracked media — restore `docs/media`
and it fails as it does on the baseline. Counted with it, the failures are
exactly the **109** names of the plan's Appendix A: **0 new, 0 disappeared**.
`800 − 792 = 8` new tests, all passing: seven in `tests/hull-set-v1.test.mjs`
and the shared-glyph rule in `tests/capital-hulls.test.mjs`. Twelve existing
tests carry re-pins, each with its reason in the test; the v2 art re-pinned six
of them again — the surface pixel census, the ANTIC 2 prototype glyph names and
count (**20 → 21**: nothing is shared any more, and R1 leaves one of its seven
per-level slots unused), the H4 `capitalGlyphs` stream SHA, the capital-hulls
strip preview SHA, the allied-map glyph names used by the corrupt-definition
paths, and the transport sector pin in `tests/starfield.test.mjs`
(**107 → 106**, the deliberate shrink above).

**Allied steel: `$84` in the default build** (owner decision 1). A non-default
review variant `--allied-steel=88|8A` (`npm run steel:88`) defines
`GAMEPLAY_COLPF1_OVERRIDE`, writes to `build/allied-steel-<v>/` and never to
`dist/`, skips runtime measurement and is consulted by no gate. The $88 build for
side-by-side smoke is `build/allied-steel-88/void-strike-65.xex`.

**What the owner should look at in smoke:** first, whether the hull now reads as
mass reaching the screen edge rather than a floating ribbon, and whether the
grooves and seams read as texture cut into it rather than as display artefacts —
that is the whole point of v2. Then the allied hull on the left and enemy style
R1 on the right; turret fire from both sides; and player contact on the
chamfers, where the `ch_in` cell counts as hull (decision 7) and collision
therefore sits at that cell's outer edge.

**One thing in the v2 draft fought the generator, on two cells.** The generator
stamps the standard emplacement at segment rows 8/9/10 and closes each ring row
on the style's own `wall` glyph (owner decision: "turret positions and profile
come from the generator"). The draft draws `wacc` at column 7 of allied row 10
and of R4 row 12; the stamp replaces both with `wall`. Two accent cells, inside
the emplacement, on two hulls. Everything else in the draft compiled exactly as
authored, and every shipped glyph matches `hull-set-v2.json` byte for byte.

## Main-menu star sky (owner decision A′) — `OWNER-SMOKE CANDIDATE` (2026-09-23)

> **Second pass, 2026-09-23 — the slower twinkle.** The first owner smoke
> accepted the sky and rejected its speed. The twinkle now advances one cycle
> step every fourth menu frame, so a full pass takes 48 frames instead of 12.
> The section below still describes the candidate; the changed numbers and what
> to look at are in "Slower twinkle" at the end of it.

**Sixteen stars behind the MAIN MENU.** Mockup A's full seven-row layout, both
tones, the twinkle and the side stars, cut from 31 stars to 16. Positions,
tones, phases and dot shapes are chosen once at build time from the seed in
`assets/graphics/frontend-h31.json`, so the sky is identical on every boot and
reproducible from Git; the runtime only walks the emitted arrays. Seven blank-8
(`$70`) display-list lines become ANTIC 4 LMS rows, which is scanline-neutral —
the menu still totals **216 scanlines** and still has exactly **one DLI**. Five
rows that already existed carry the side stars with no display-list change at
all. Only the MAIN MENU gets stars; OPTIONS, TOP SCORES, GAME OVER and PAUSE are
untouched, and `clear_screen` already covers `$4000-$43FF`, so the OPTIONS
round-trip restores the sky for free.

Two accepted hardware compromises, pinned in `tests/menu-stars.test.mjs` so a
later session does not "fix" them into a regression: a twinkling star's dim step
is the menu's own steel `$84`, not a dim white (all four playfield registers are
spent and the brief rules out a second DLI), so the twinkling third is drawn
from the **white** stars and steel stars stay steady; and the eight star glyphs
are frontend charset codes **64-71**, which ANTIC 4 reaches and ANTIC 6/7 cannot.

**Why sixteen.** The earlier costing
([menu-stars-resident-space.md](diagnostics/menu-stars-resident-space.md) §4)
priced this feature in **address space** and concluded "0 new boot sectors".
That was wrong, and the measurement is in
[menu-stars-alternative-a-boot-sectors.md](diagnostics/menu-stars-alternative-a-boot-sectors.md):
boot sectors are paid in **packed** bytes, a reserved tail is free only while it
holds zeros, and star coordinates are incompressible. Mockup A as drawn costs
boot 106 → **108**; the display-list change with **no stars at all** already
overruns 106. The owner lifted the budget by exactly one sector — boot may reach
107, not 108, and `validateInitialBlockCapacity`'s ceiling stays **107** — on
the ground that the tree shipped at 107 sectors until the hull v2 art freed that
sector by accident. **16 stars is the largest sky inside that ceiling**: 13,681
content bytes against 13,684.

**Transport and placement.** MEASURED on the delivered build.

| | `73108dc` | delivered |
| --- | ---: | ---: |
| `initialBootContentBytes` / envelope | 13,556 / 12 | **13,681 / 15** |
| boot sectors | 106 | **107** (ceiling 107, unchanged) |
| extension sectors | 101 | **102** |
| total transport sectors | 207 | **209** |
| `STARFIELD` raw / packed | 1,990 / 1,701 | **2,039 / 1,749** |
| `PICKUP_CODE` stream fill | 89 B | **5 B** |
| `ENTITY_CODE` → BROADSIDE staging margin | 84 B | **7 B** |

`MAIN` is byte-identical in size and **no pinned `CODE`/`RODATA` address moves**:
the display-list growth and the one-shot star draw fit inside alignment padding
that was already there, and the splash slack was not spent. The extension sector
is the 84 bytes of fixed tick code, cycle table and frame counter in
`PICKUP_CODE`, which rides an extension chunk; that cost does not scale with the
star count. **The 7-byte `ENTITY_CODE` → BROADSIDE staging margin is now the
scarcest number in the transport** — it is measured against the packed
`STARFIELD` stream, so the next thing added there hits it, and the 16-byte
staging stream A margin, long before the 76 B left to the packed hard gate.
`memory-map.md` carries the reservation arithmetic.

**Boot smoke 8/8 at 106 and again at 107**, both on the in-repo Atari800.

| milestone | committed baseline | at 106 | at 107 | delta |
| --- | ---: | ---: | ---: | --- |
| `xex_loader_frames` | 135 | 135 | **135** | +0 |
| `xex_menu_frames` | 392 | 392 | **392** | +0 |
| `atr_loader_frames` | 339 | 344 | **346** | **+7**, warn band +10 |
| `atr_menu_frames` | 596 | 601 | **603** | **+7**, warn band +10 |

XEX does not move — it is one load. The ATR pays ~1 frame per transport sector
and the feature adds two. Against the 3,000-frame absolute ceiling the ATR menu
uses 603; against the delta gate **3 frames of warn margin** and 43 of fail
margin remain. The old hard-coded frame-300 loader checkpoint no longer exists;
since 2026-09-20 the loader observation point follows the measured milestone and
the loader has its own baseline row. `docs/boot-deadline-baseline.json` is
**NOT** re-recorded: the repo applies that rule as *re-record when the band is
being moved, not while the measurement is still inside it* (the ADR-003 splash
grew 103 → 107 at +4/+4 without re-recording, and the hull v2 shrink likewise),
and re-recording here would silently absorb the +5 of drift those commits left
standing — which is the drift the delta gate exists to show.

**PAL audit — 67 replays, 0 distinct miss events, 0 rows over the hard gate, 0
deadline overruns, 0 missed frames.** Gameplay did not move, and what did move
moved the right way:

| | `73108dc` | delivered |
| --- | ---: | ---: |
| worst fence margin (GO ≥ 500) | 979 | **991** |
| DMA-on maximum | 31,351 | **31,349** |
| physical headroom | 4,217 | **4,219** |
| rows over the 31,200 target | 4 | **4** |
| behavioural clause failures | 40 | **40**, same names, 0 new, 0 disappeared |

The worst frame is still `director-complete-2-natural-sweep-fire0`. The 2-12
cycle improvements are not a gameplay change: the sky's 49 bytes sit at the head
of `STARFIELD`, so the gameplay code after them shifts by 49 bytes and a handful
of indexed accesses land on the cheap side of a page boundary.

**Tests.** `npm test` on the **default** build: **809 tests, 697 pass, 109 fail,
3 todo**. The 109 names are exactly the plan Appendix A list — **0 new, 0
disappeared**. `809 − 800 = 9` new tests, all passing, all in
`tests/menu-stars.test.mjs`, which executes the linked artifact on the 6502
simulator: the star table, the one-shot draw, the twelve-frame twinkle, the tick
write-set, the OPTIONS round-trip, the charset glyphs, the display list and the
"only the MAIN MENU gets stars" guard. Five existing pins were re-recorded with
their reason in the test: boot sectors 106 → 107 (`starfield`), the menu layout
(`frontend`), the `STARFIELD` reservation (`gameplay-music-placement`), the
`PICKUP_CODE` fill (`light-interceptor`) and the `ENTITY_CODE` staging margin
(`light-wingman`). All six fail at `aac0435` and pass here.

**What the owner should look at in smoke:** the star count and how the sky
spreads (16 is deliberately thin — it is what one boot sector buys); the twinkle
rhythm — bright, dim, off over a twelve-step cycle, each star on its own phase,
so nothing should blink in unison; the two tones — white stars and steel stars,
with twinkling ones dimming to steel rather than to a dim white; the menu layout
after the display-list change — title, items, both blue bars, the fighter and the
hint must sit exactly where they did; and the OPTIONS round-trip — enter OPTIONS
mid-twinkle and come back, and the sky must be there, whole.

### Slower twinkle (owner smoke feedback, 2026-09-23)

*"The sky is right, but the twinkle is too fast."* One cycle step per frame made
a whole pass 12 frames — 0.24 s — which reads as a flicker. A step now holds for
**four** frames, so the cycle is **48 frames, 0.96 s** on PAL: bright 24, dim 16,
off 8. The twelve-step shape and the per-star phase spread are unchanged; only
the clock is slower.

**It is a frame divider, not a longer table.** A 48-entry cycle table is 36 more
packed bytes, and the two windows that could pay hold 7 B (`ENTITY_CODE` →
BROADSIDE staging) and 5 B (`PICKUP_CODE` fill). The divider costs neither a
table nor a second counter byte: `menu_star_frame` itself counts `0..47` and the
cycle index is that counter shifted right twice, with each star's phase offset
emitted pre-multiplied by four. In the source that is **two `LSR`s and two
constants**.

| | star sky as smoked | slower twinkle |
| --- | ---: | ---: |
| `initialBootContentBytes` / envelope | 13,681 / 15 | **13,682 / 14** (ceiling 13,684) |
| boot / extension / total transport sectors | 107 / 102 / 209 | **107 / 102 / 209** |
| `STARFIELD` raw / packed | 2,039 / 1,749 | **2,039 / 1,750** |
| packed hard-gate margin | 76 B | **75 B** |
| staging stream margins A / B | 16 / 155 B | **16 / 154 B** |
| `PICKUP_CODE` stream fill | 5 B | **3 B** |
| `ENTITY_CODE` → BROADSIDE staging margin | 7 B | **7 B**, unmoved |

`validateInitialBlockCapacity` is **not touched** and its ceiling stays 107
sectors. The one packed byte the change costs is not code at all: the phase array
still holds one byte per twinkling star, but the offsets are now multiples of
four and pack one byte worse.

**Boot smoke 8/8** on the in-repo Atari800, every milestone **unmoved**: XEX
135/392 (+0/+0), ATR **346/603** (+7/+7 against the committed baseline), so the
ATR menu keeps all **3 frames of warn margin** and 43 of fail margin. `+0` warn
frames lost against the limit of 1 the brief allowed.
`docs/boot-deadline-baseline.json` is not re-recorded, for the reason above.

**PAL audit — 65 traced replays, 0 distinct miss events, 0 rows over the hard
gate, 0 deadline overruns, 0 missed frames.** Every gameplay number is
**byte-identical** to the sky's own evidence, which is what a frontend-only
change should produce: worst fence margin **991**
(`director-complete-2-natural-sweep-fire0`), DMA-on maximum **31,349**, physical
headroom **4,219**, rows over the 31,200 target **4**, behavioural clause
failures **40**, same names, 0 new and 0 disappeared. Outside the fence
altogether — the tick runs in the frontend loop, which has no cycle fence — the
tick now also costs **+4 cycles per twinkling star** for the two `LSR`s, ~20
cycles per menu frame.

**Tests.** `npm test` on the **default** build: **811 tests, 700 pass, 108 fail,
3 todo**, plus the documented `docs/media` regeneration failure, which passes
only on a second consecutive run because the first run already rewrote the
tracked media — restore `docs/media` and `showcase and asset sheets regenerate
without ignored capture files` fails as it does on the baseline, which was
re-checked here. Counted with it the failures are exactly the **109** names of
the plan's Appendix A: **0 new, 0 disappeared**. `811 − 809 = 2` new tests, both
passing. The
two new tests are in `tests/menu-stars.test.mjs`: the divider itself (the
counter wraps at 48 and not 12, every held value is a whole number of four-frame
steps, the timeline is periodic over 48 frames and not over 12, and the per-star
phase spread survives) and the steel-twinkle review variant. Four existing
tests there were moved to the new cadence, and two pins were re-recorded with
their reason in the test: the `PICKUP_CODE` fill 5 → 3 B (`light-interceptor`)
and the `STARFIELD` packed size 1,749 → 1,750 B (`gameplay-music-placement`).
All six fail at `70adce6` and pass here.

**A review variant, not a default change: `npm run menu:steel-twinkle`.** Today
only white stars twinkle, because the twinkle *dims to steel* and steel has
nothing left to dim to. The variant gives the steel stars the same share of
twinklers using the cycle's existing **off** step — steel → off → steel — so
5 white twinklers become 5 white + 2 steel. It needs **no runtime code**: the
tick ORs the dim bit into a glyph that already carries it, which is a no-op, and
`$80` blanks any glyph. Like every review variant it writes
`build/menu-steel-twinkle/` and never `dist/`, runtime measurement is skipped and
no gate consults it. **The default build keeps today's behaviour: white stars
twinkle, steel stars stay steady.**

**What the owner compares in this smoke:** the new twinkle rhythm — is a
48-frame pass the right speed, or still wrong in either direction — and, between
the default build and `build/menu-steel-twinkle/`, whether steel stars twinkling
through the off step adds life or reads as noise.

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

## Heavy break-up — both archetypes — `OWNER-SMOKE CANDIDATE` (2026-09-22)

Branch `feat/kill-rewards` from `main` at `8a4fb1b`.
`docs/plan-4.6-placement.md` §7.4 **variant 2**, extended from the Bomber alone
to **both** Heavy archetypes (Raider and Bomber). Closes the backlog item
"HEAVY DESTRUCTION EFFECT".

**What was true before, and why it was not a regression.** §7.1 MEASURED it:
`render_shared_fighter_explosions` reads
`FIGHTER_EXPLOSION_TIMER + FIGHTER_EXPLOSION_PLAYER_FIGHTER_SLOT` only, so the
six-phase PMG explosion was **never drawn for the enemy slot**; the 24-frame
`FIGHTER_EXPLOSION_TIMER + ENEMY_SLOT` was a lifecycle hold, not an animation;
the only feedback was the four-frame `COLBK` flash. "Vanishes in a flash" was
the literal implementation, long-standing, not a regression.

**What it is now.** A dying Heavy member publishes one core plus four fragments
into the existing five-slot collisionless effect pool, placed from a
**per-archetype offset table across the hull footprint** instead of the +4/+4
point cluster `spawn_breakup_effects_at` hard-codes for debris. **No new art,
no new object type, no new pool, no new renderer:** the existing debris core
glyph (110), the existing fragment glyphs (118-119), the existing stagger
renderer, the existing 30-frame fragment / 5-frame core lifetimes.

**One implementation, two tables.** `heavy_breakup_offset_index` selects by
`ENEMY_ARCHETYPE`; a third Heavy shape needs a table row, not a code path.
The Raider (16 HPOS × 14 scanlines) gets the smaller spread, the Bomber
(32 HPOS × 16, eight cells of silhouette) the larger: corners at cells 0 and 6
with the core at cell 3.

**Scheduling.** A **DEFERRABLE** consumer of the one-expensive-event token —
the fifth claim site and the third deferrable one — claiming through
`light_take_deferrable_token`, so the **ring-rotate gate applies with no new
gate code**. The enqueue costs 0 new bytes:
`begin_enemy_fighter_explosion_tail` already writes
`FIGHTER_EXPLOSION_X/Y + ENEMY_SLOT` from the live hull position on the kill
frame. **The forcing rule** is `heavy_breakup_pending` at `$8128` plus an
**ungated** second attempt at `integration_update_enemy`, which bounds the
delay at **two frames** with no counter and no deadline compare — the same
shape as the Light's `BREAKUP_PENDING` branch.

**Not gated, on either return:** the kill, its score, its sound and the COLBK
flash. `resolve_enemy_damage` does all four on the kill frame whichever way
the claim answers.

**Collisionless** (owner decision Q-2, plan §7.6). Contact damage lives in
`entity_collide_player`, which walks the **interactive** entity pool
(`ENTITY_*`); the fragments are in the `EFFECT_*` pool, which no collision path
reads. A dying Heavy's fragments cannot hurt the player.

**Where the retry hook went, and why not where the plan said.** Plan §7.3 put
the ungated second attempt inside `update_enemy`. `update_enemy` is in
`BROADSIDE`, whose free tail is **3 B**, and the smallest inline form of the
retry is 8; it overflowed by 10 on the first attempt. It went instead to
`integration_update_enemy` in `CODE`, which is `update_enemy`'s only caller and
has **already established that a Heavy exists** before it asks. That is
strictly better than the plan's site for the audit: on a Light-swarm frame —
where every binding row of the whole replay set is — `ENEMY_ACTIVE` is zero,
the existing early branch is taken and the break-up costs **0 cycles**. The
test itself lives in `PICKUP_CODE`, so the resident site spends three bytes of
`jsr` and the seven-byte `integration_update_enemy_pad` gives them back: every
later `CODE` entry keeps the address it had.

### Bytes (MEASURED at the candidate)

| Piece | Home | Bytes | Tail after |
| --- | --- | ---: | ---: |
| `heavy_death_feedback` `$8A7B`, `heavy_breakup_retry` `$8A84`, `heavy_spawn_breakup` `$8A8A`, `heavy_breakup_offset_index` `$8ADE`, `heavy_breakup_offsets` `$8AE1-$8AF4` | pickup stream fill `PICKUP_CODE` | **122** | 236 → **114 B** |
| `enemy_c_heavy_breakup_claim` | `HYBRID_C_ARENA` | **26** | 114 → **88 B** (744 / 832) |
| `heavy_breakup_pending` | `HYBRID_HEAVY_BREAKUP` `$8128`, own segment, named ld65 asserts | **1** | unowned gap 24 → **23 B** (`$8129-$813F`) |
| `lifecycle_c_init`'s clear | `HYBRID_C_EXT` composite | **3** | 880 → **883 B**, extension-window tail 19 → **16 B** |
| `jsr heavy_breakup_retry` | resident `CODE` | **+3, −3** | `integration_update_enemy_pad` 7 → **4 B**; **net 0** |

`HYBRID_C_WINDOW` is **unchanged at 801 B**: dropping `static` from
`light_take_deferrable_token` so the arena can call it costs nothing, because
the gate was already a real function with two callers. Code window tail still
**27 B**, `BROADSIDE` tail still **3 B**, `ENTITY_CODE` tail still **5 B**.

**Re-cost against the plan's Bomber-only ~90 B.** The plan costed variant 2 at
~90 B for the Bomber alone. The delta to **149 B** is: the second archetype's
offset table and the 3-byte index (**+13**); a standalone five-cell fill loop
rather than a flag inside `spawn_breakup_effects_at`, chosen so the **debris
hot path is not touched at all** (**+~35**); and the retry's indirection
through `PICKUP_CODE` to keep the resident segment size-neutral.

### Cycles

| Where | Cost |
| --- | --- |
| Kill frame | **+~20** — the claim and its branch, on a frame that already pays score, sound, erase and `HITCLR` |
| Spawn frame | **~1,100** MEASURED-ESTIMATE, against the 1,063 `light_spawn_breakup` costs through the same call chain; the delta is the two extra indexed loads per cell |
| Each of the **30 frames** the fragments then live | the full five-slot pool walk — `entity_effects_erase`, `update_transient_effects`, `entity_effects_render`. **Not free.** See the correction below |
| Every frame with a Heavy alive, nothing pending | **+19** — `jsr`/`rts` plus one load and one branch |
| Every frame with **no** Heavy | **0** — the existing `ENEMY_ACTIVE` gate at `integration_update_enemy` is taken first |

**CORRECTION to plan §7.4's "+0 new per frame while the fragments live."** That
figure is right about the **peak** and wrong about these replays. It reasoned
that the pool walk "is already represented in the binding set by
`debris-effects-2-sweep-fire4`" — true of a frame that already carries a debris
cluster, because the pool holds one break-up and the second wipes the first.
But on a frame where the pool was **empty**, a Heavy break-up makes the walk
happen where it did not, for 30 frames after **every** Heavy death. That is
what the audit measured, and it is the dominant term, not the spawn frame.

**Where the cost lands, MEASURED.** The admission rule holds — **Heavy and
swarm never coexist**, so no Heavy break-up can occur on a Light-swarm frame —
but that is not what protects the binding row here, because the binding row is
not a swarm row. Traced on `director-complete-2-natural-sweep-fire0`, the worst
row of the whole set: a Heavy dies at **frame 6,604** (`enemy_explosion_timer`
24, effect mask `$1F`, count 5), its fragments live their 30 frames through
**6,628**, and **frame 6,629** — the sector-completion frame, which already
does the most pre-fence work of the replay — now also erases four fragment
cells before the pool expires. That is the −1,006 cycles below.

### Tests

`tests/heavy-breakup.test.mjs`, eight tests, all **A/B'd RED** against a clean
build of the tree without the change:

| test | proves |
| --- | --- |
| a Raider / a Bomber kill breaks the hull up into its own fragment spread | the five cells land at that archetype's table offsets from the captured anchor, with the existing glyphs |
| a Raider / a Bomber kill reaches its fragments within two frames | the bound, under the shipped token budget and whatever the scroll cadence is doing |
| the two archetypes differ only by their spread, and the Bomber's is wider | one implementation, two tables; each spread crosses at least three character cells |
| a rotate-frame kill defers, and the deferred break-up lands on the very next frame | the rotate gate, then the forcing rule with the budget poked to zero — which refuses every gated claim there is |
| the kill frame keeps its score, its sound and its COLBK flash | measured on the DEFERRING frame, the one that could lose them |
| no break-up fragment can ever damage the player | owner decision Q-2, with a full cluster sitting on the player for eight frames |

**Two frozen pins re-recorded deliberately**, both the tripwires that exist to
make a new token consumer get reviewed, and the owner reviewed this one:
`tests/hybrid-lifecycle.test.mjs`'s `_light_take_token` call-site list (four
sites → **five**, two deferrable → **three**) and the extension composite
(880 → **883 B**). `scripts/runtime-cycles.mjs`'s own replay invariant was
**inverted**: a Raider death must now either spawn its break-up or defer it,
where it previously had to leave the pool untouched.

### Gates — the branch as a whole (both commits)

The two commits were gated together at the end of the branch, on the **default**
build. XEX `9d401b21d5404eaedf2fdc5e8773394d2460958ec0dcf99d3616c19e58ce3906`,
ATR `aab9fec5148252faad97d43adf9b12d468043190325504177f2b718f72a97c52`.

**PAL timing audit — the full set, 73 replays (65 in the default run + 8
mode-gated), 0 distinct miss events, 0 rows over the hard gate.** Boot smoke
**8/8**. Measured DMA-on maximum **31,216** cycles, physical headroom **4,352**,
deadline overruns **0**, missed frames **0**.

**The worst fence margin is 1,985 → 979 cycles**, and the whole drop is the
Heavy break-up's standing cost. Every row below is A/B'd against a clean build
of `main` at `8a4fb1b` in its own worktree, same emulator, same procedure:

| replay | `main` margin | branch margin | delta | rows over the 31,200 target |
| --- | ---: | ---: | ---: | --- |
| `director-complete-2-natural-sweep-fire0` f6,629 | 1,985 | **979** | **−1,006** | 0 → 0 |
| `debris-effects-2-sweep-fire4` f4,189 | 3,737 | **1,381** | **−2,356** | 0 → **2** |
| `director-complete-1-natural-sweep-fire0` f3,457 | 2,985 | **1,837** | **−1,148** | 0 → 0 |
| `2-evasive-fire1` f31 | 4,945 | 2,040 | −2,905 | 0 → 0 |
| `capital-muzzle-ring-2-sweep-fire4` | 4,835 | 2,769 | −2,066 | 0 → **2** |

Those three "rows over target" figures are rows over the **31,200-cycle
target**, not over the **32,568 hard gate**: `>hard` is **0** on every one of
the 73 replays, as is `missed_frames`. Rows over target are not new to the set
(`raider-remnant-rapid` 2, `raider-remnant-spread` 1 and
`debris-gate-capital-muzzle-ring` 2 are all unchanged from `main`).

**This is a real cost and the owner should see the levers.** The work is
delivered as specified — variant 2, both archetypes, the owner's fragment
lifetime — and these are the compliant alternatives if 979 is too little slack:

| option | player-visible effect | cost | risk |
| --- | --- | --- | --- |
| **A — ship as is** | the break-up the owner asked for | 0 further bytes | worst margin 979 of the line-238 fence, 0 miss events across 73 replays |
| **B — shorten the Heavy fragment lifetime** 30 → 15 frames | the break-up is half as long; the 24-frame COLBK/lifecycle hold then outlasts it | **~2 B** — one immediate operand, a Heavy-only timer constant instead of the shared `EFFECT_DEBRIS_FRAGMENT_TIMER_LOAD` | halves the standing window, which is the dominant term; nothing else changes |
| **C — four cells instead of five**, dropping the core | no centre flash, corners only | ~10 B and a shorter table | ~20 % of the standing cost; weakens the read the owner asked for |

**Release gate green on the default build.** The runtime evidence was
regenerated once, at the end of the branch, as this branch's own change —
`build:candidate` → `runtime:wall-trace` → `build`, one unbroken default run,
**65/65 sessions**. The recorded-failure list is **exactly identical**: 40
recorded, **0 new and 0 disappeared**, `gate.timing_and_dli_passed` true.
`tests/runtime-evidence-binding.test.mjs` green.

### What the native harness needed, and why — four changes, no assertion weakened

Both features changed things the native gate observes, and the owner's rule for
behavioural blockers (2026-09-21) was applied to each: MEASURE the class first,
then handle it only as that class allows.

**1. The hull-transient ownership model gained a FIFTH writer (a narrowing).**
`capital-muzzle-ring-2-sweep-fire4` frames 3,811-3,812 failed "observed a stale
muzzle/flash code or invalid derived pointer": muzzle 1's cell held `$F7`, the
inverse fragment glyph `EFFECT_FRAGMENT_GLYPH_BASE|$80` that the dark fade
uses. A break-up cell standing on a tracked muzzle is the **same shape as
writer 4**, the live fighter projectile — the slot saves the covered cell into
`EFFECT_BACKING0` before it draws and returns it when the cell expires, so the
muzzle glyph is occluded for those frames, not lost — and the model simply did
not know about it, exactly as it did not know about writer 3 (the launch flash)
before. `dftrace_effect_occludes` in `scripts/atari800-wall-trace.h` emits
`muzzle{N}_effect` as presence, never history: 1 only while some effect slot's
OWN published screen pointer still equals that muzzle pointer **and** the cell
still holds an effect-bank glyph. The assertion is unchanged.

**2. A weapon-pickup coverage session was ADDED (class (a), stale scenario).**
Making a debris shot kill a qualified kill moved the capsule cadence, which is
what it was for. MEASURED: on a clean `main` build the difficulty-2 showcase
replay collected RAPID, SPREAD and SHIELD; on this branch a debris kill
completes the count ~100 frames earlier, that SPREAD capsule spawns at frame
1,956 and **the player dies at frame 1,963 before reaching it**, so the
three-step rotation never lands a Spread booster and the Spread Shot screenshot
clause stopped being satisfiable. Running the same replay longer does not help:
it reaches GAME OVER, MEASURED over 7,000 frames. So the set gains
`weapon-pickup-spread-0-hunt-fire4` — the same replay on EASY, where all three
booster states do appear — under its **own** trace kind, so every other
weapon-pickup clause still reads exactly the rows and exactly the captures the
difficulty-2 session produced before. The audited default run is 64 → **65**
sessions.

**3. The OPTION pause test moved from the `hunt` memory-integrity pair to the
`evasive` pair (class (a)).** The emulator arms that test only while the Spread
booster is active. MEASURED on this build: the `hunt` pair reaches booster
states 3 and 5 only, the `evasive` pair holds state 4 for 621 frames. The
assertion, the arming condition and the coverage it names are untouched; only
which replay of the same pair carries it changed. It now completes: pickup
timer frozen 450 → 450, engine timer 1 → 1, engine phase 0 → 0, 27 host frames.

**4. `spreadVolleyRows` reads the union instead of one replay (class (b), wrong
selection).** The predicate is unchanged; only the row set it reads is —
exactly the shape of the `activeCapsuleDuringBooster` correction already in that
file. It now reads the same `pickupModeRows` union the booster-mode coverage
clause beside it already read, plus the session added in (2). It still fails if
no replay anywhere executes a three-projectile Spread volley.

**Not one assertion was loosened, deleted or re-pinned to pass.**

**What the older Raider traces still cover.** `tests/entity-effects.test.mjs`'s
three `executeInterceptorBreakupTrace` tests keep passing, and truthfully: that
harness drives `update_enemy` directly rather than through
`integration_update_enemy`, and never runs `lifecycle_c_init`, so the token
budget is zero and the kill frame always defers. They therefore still prove the
**deferring half** — that the kill frame publishes nothing into the pool,
leaves an unrelated debris break-up alone, and costs no more than it did. The
spawning half, the bound and the geometry are `tests/heavy-breakup.test.mjs`.
A note in that file says so.

---

## Debris reward — `OWNER-SMOKE CANDIDATE` (2026-09-22)

Branch `feat/kill-rewards`, second commit. **Owner decision 2026-09-22:**
debris is hard to hit and tough, and that stays; the reward goes up.

**The score.** `DEBRIS_SCORE` `$05` → **`$25`** — twenty-five points, packed
BCD, difficulty-independent — **for a shot kill and a ram kill alike**. That
half needed no new code: the existing owner rule (2026-09-18) already routes
both player-caused destructions through one `add_debris_score`, so raising the
constant raises both. Debris now sits between the Interceptor (21) and the
Bomber (50) in the scoring table, which is what "hard to hit and tough" is
worth. The `.assert` and both `how-to-play` tables (EN and PL) carry the new
value.

**The capsule.** A debris **SHOT** kill now counts toward the weapon-pickup
capsule exactly like a qualified enemy kill; a **RAM** kill does not. The count
lives on the shot path, in the new `debris_shot_reward` (`PICKUP_CODE`,
`$8A84`, **25 B**), which `entity_debris_destroyed` reaches in place of its
direct `jsr add_debris_score` — so the resident `CODE` segment is size-neutral
and `debris_contact_destroyed` is untouched, which is exactly what makes a ram
kill not count. The one-capsule-at-a-time rule is the same idle-slot test
`resolve_enemy_damage` makes before its own call.

**The position.** A debris kill that completes the count spawns the capsule at
the **debris**. The spawn used to read `FIGHTER_EXPLOSION_X + ENEMY_SLOT` — the
Heavy's kill snapshot, which a debris kill never writes, so the capsule would
have landed wherever the last enemy died. It could not simply be made to write
that snapshot either: a Heavy break-up parked in `HEAVY_BREAKUP_PENDING` would
then spawn its fragments at the debris. So the debris entry passes its own X
and joins the enemy path at **`weapon_pickup_spawn_capsule_at`**, a new label
and nothing else — **zero bytes in `ENTITY_CODE`**, whose free tail is 1 B.
Everything after the counter is therefore shared: the `+4` centring (debris is
two cells wide, so that is its exact centre), the corridor clamp, the type
rotation and the pending timer. Only the four-instruction counter test is
repeated.

`weapon_pickup_count_incomplete` is a global label for a mechanical reason: the
new `weapon_pickup_spawn_capsule_at` above it fences the cheap `@locals` the
branch used to share with its exit.

**Nothing else changed.** Debris HP (three PlayerFighter hits), spawn rates,
contact damage and the one-capsule-at-a-time rule are all untouched, and
`tests/debris-score.test.mjs` pins that explicitly.

### Bytes

| Piece | Home | Bytes |
| --- | --- | ---: |
| `debris_shot_reward` `$8A84` | pickup stream fill `PICKUP_CODE` | **25** (tail 114 → **89 B**) |
| `weapon_pickup_spawn_capsule_at` `$9827` | `ENTITY_CODE` | **0** — a label; the segment's 5-B tail is untouched |
| `weapon_pickup_count_incomplete` `$9863` | `ENTITY_CODE` | **0** — a renamed label |
| `entity_debris_destroyed`'s retargeted `jsr` | resident `CODE` | **0** |

**Cycles.** MEASURED-ESTIMATE **~30** on a frame that has no capsule pending,
and only on the frame a shot destroys debris — a frame that already runs the
effect spawn, the Director release and the score add.

### Tests

`tests/debris-score.test.mjs`, six new tests plus four re-recorded ones. A/B'd
against a clean build of the tree without the change: **9 of 11 red there, 11
of 11 green here**.

| test | proves |
| --- | --- |
| a debris shot kill adds 25 points | the constant, through the executed path |
| a debris ram kill adds the same 25 points | the 2026-09-18 owner rule still holds at the new value |
| a debris SHOT kill counts toward the capsule and a RAM kill does not | the asymmetry the owner asked for |
| a debris kill that completes the count spawns the capsule at the debris X | the position, and that the Heavy kill snapshot stays untouched |
| the capsule is clamped into the entity corridor at both edges | the clamp is the enemy path's, unchanged, at both ends |
| nothing else about debris changed | HP, the non-lethal hit, and the one-capsule-at-a-time rule |

**Gates.** Both commits were gated together at the end of the branch: see
§"Gates — the branch as a whole" under "Heavy break-up" above. The capsule
cadence change is the reason three of the four native-harness scenario changes
recorded there were needed; none of them weakened an assertion.

**Four pins re-recorded deliberately, with the owner decision as the reason and
no other:** `DEBRIS_SCORE = $05` → `$25` in the source-shape assertion, the two
executed-trace score totals (`$0747` → `$0767`), and the `entity_debris_destroyed`
call-graph shape (`jsr add_debris_score` → `jsr debris_shot_reward`, with
`debris_shot_reward: jsr add_debris_score` pinned in its place, so
`add_debris_score` still has exactly two call sites).

---

## ADR-003 boot splash — cassette sound, fade, skip, blue ship — `OWNER-SMOKE CANDIDATE` (2026-09-22)

Branch `feat/splash-cassette` from `main` at `2b1f69b`.
`docs/plan-boot-splash-cassette.md` implemented in full. **The hold is
unchanged: 250 complete PAL frames, no I/O, `LOADER_DURATION_FRAMES = 250`, the
same one-decrement-per-frame counter the boot smoke's countdown proof reads.**

**What the splash now does.** POKEY channel 1 imitates a 600-baud Atari cassette
load, switching **per bit** on a VCOUNT-timed 12-cell frame (26 scanlines per
cell = exactly 600 baud), mark `AUDF1 = 5` / space `AUDF1 = 7`, bytes framed
start-0 / 8 data LSB-first / stop-1 behind two `$55` sync bytes. Over the last
75 frames one fraction fades both the volume (10 → 2 on frame 250, never to
silence) and the luminance of all six splash colour bytes, the two DLI zones
included, keeping every hue and reaching luminance 0 on frame 250. SPACE or FIRE
skips, read straight from `TRIG0` / `SKSTAT`+`KBCODE`, edge-triggered so an
input held from frame 1 never skips, taking the same exit path as frame 250 and
then waiting for release so the press cannot reach the menu. The capital ship is
allied blue `$8A`/`$80` — changed at the source in `loader-bitmap.json`, bitmap
bytes and packed size unchanged.

**Placement — MEASURED, and the one thing the plan did not foresee.** The blob
is **499 B** of code, tables and variables in a 512-B boot-only window at
`$0500-$06FF`, copied there by **both** stage-2 entries immediately after
`disable_basic_rom`. **Zero resident bytes.** Moving the hold loop and `loader_dli` out of MAIN freed exactly **56 B** of CODE. That slack is deliberately held as padding (`LOADER_SPLASH_CODE_SLACK`) rather than closed: letting it close slides every later CODE and RODATA address 56 bytes down, which changes which indexed reads cross a page and cost the heaviest gameplay frame 17 cycles (MEASURED 31,200 → 31,217, worst fence margin 1,985 → 1,959) for no gain. Pinned, CODE is `$117E` and RODATA starts at `$317E` exactly as before, and `build/broadside-runtime.bin` and `build/entity-code-runtime.bin` come out **byte-identical** to the previous build — only the loader area of the resident image differs (81 bytes). The 56 B stay available to whatever needs them next, against a re-measured baseline. The packed resident
suffix still shrinks (6,687 → 6,657 B), so the `$9B40` margin is not spent.

The blob rides at the **tail** of the initial block, behind every packed source,
so the measured addresses of the packed resident, starfield, A2 and ENTITY
streams — and the 91-byte margin the packed starfield keeps below the pickup
cold staging at `$4801` — do not move. Its two `lda abs,x` copy operands are
patched by `scripts/build.mjs` the way the other packed-source reads already
are.

Plan §6.5 assumed the bytes would fit. They did not: `scripts/chunk-loader.mjs`
caps the opt-in initial block at 105 sectors / 13,440 B, and at 13,102 B of
content plus a 12-B envelope only **326 B** were free — **186 B short**. Every
compliant alternative (a DFMC record to `$0500`, the `$A980` tail the owner
excluded) costs the same four sectors of SIO read, so the ceiling was raised
**105 → 107 sectors** and the cost measured rather than estimated:

| | baseline | now | band |
| --- | ---: | ---: | --- |
| initial block | 103 sectors | **107** | — |
| `xex_loader_frames` | 135 | **135** | +0 |
| `xex_menu_frames` | 392 | **392** | +0 |
| `atr_loader_frames` | 339 | **343** | +4, inside the +10 warn band |
| `atr_menu_frames` | 596 | **600** | +4, inside the +10 warn band |

`docs/boot-deadline-baseline.json` is **not** re-recorded. This envelope change
is owner-visible and is the one item of this candidate that is not purely a
consequence of the plan as written.

**Intactness proof.** The boot smoke checksums `$0500-$06FF` at the `start`
milestone against `build/boot-splash.bin`, and the blob's immutable tables and
code (`$0515-$06FF`) again at both loader milestones — so the ATR chunk load,
`unpack_resident_runtime` and every publisher that runs between them are proved
not to have written into the range. The variables at `$0500-$0514` are excluded
because the hold mutates them itself.

**Sound as data.** `assets/audio/boot-splash.json` → `scripts/boot-splash-assets.mjs`
→ `build/boot-splash.inc`. The generator asserts that the segment frames sum to
250, that the fade ends on the last hold frame, that the end volume is not
silence and that a `DATA` segment is long enough for its two sync bytes. The
owner retunes by ear by editing that file and rebuilding; no code change is
needed for any value in it. Growth axis: 2 B per segment, 13 B of window left.

**The intactness gate is proved red.** With a single injected
`lda #$FF / sta $0600` in `unpack_loader_bitmap` — one byte inside the range,
written between the copy and the hold — the boot smoke fails with
`xex-a5 splash blob at $515 changed to 2806190798 by frame 138`. Reverted.

**Evidence.** Boot smoke 8/8 on both media with the new splash gate (intactness,
per-bit AUDF1 switching, non-increasing volume to 2, allied-blue ship at the
second DLI, `AUDC1 = 0` at the teardown). `tests/boot-splash.test.mjs` 7/7 on
the JS `Nmos6502` with the blob installed at `$0500`, a cycle-derived VCOUNT and
both DLIs fired per frame; five of them verified red against `2b1f69b` first.
`tests/loader-screen.test.mjs` rebaselined for the blue ship and the DLI's
RAM-loaded colours; `tests/transport-enabler.test.mjs` rebaselined for the
107-sector ceiling. Every other frozen address is unchanged, the layout pin
above being why.

**Correction to the plan.** §8.2 asked for `AUDC1 = 0` on the first frontend
frame. Music v2 gives the menu theme POKEY channel 1 inside that same frame, so
that observation is not about the splash; the gate is taken at the teardown
instead — the instant the hold has blanked the display and no frontend code has
run. The frontend value is still reported, as an observation.

**Not done.** Plan §8.4's four native `--splash-skip-only` sessions (XEX/ATR ×
FIRE/SPACE with injected input) are **not** implemented. The skip is covered by
`tests/boot-splash.test.mjs` on the JS core — press, release, held-from-frame-1,
teardown ordering and the no-leak contract — and by a source-contract check on
`enter_frontend_state` / `frontend_input_poll`, but it has **no native
observation**. Owner smoke on real input is the first place a skip runs on
hardware.

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

- **Follow-up (licensing, 2026-10-01):** `scripts/package-release.mjs` builds the release zip without `LICENSE`, `LICENSE-ASSETS` and `THIRD_PARTY_NOTICES.md`; the zip should include all three. GitHub releases ship the ATR alone, with both licences linked from the release notes.

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
  [diagnostics/stage-2b2n-hostile-shot-emitter-independence.json](diagnostics/stage-2b2n-hostile-shot-emitter-independence.json).
  Seen again 2026-10-01 on the Spread-volley candidate:
  `debris-gate-capital-muzzle-ring-2-sweep-fire4`, 1 blank at host frame 4519,
  the frame after the player's final death. The replay is divergent, and no
  first-writer proof was made (owner: pre-existing). **Owner-accepted as a
  known low-severity issue, 2026-10-01** (recorded failures review §6 C1 and
  §10.1): one frame, during the player's own explosion; it stays recorded and
  no task is open;
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
loop / 16-level campaign data (**twelve** since owner decision AC, 2026-09-22).

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

> **SUPERSEDED IN PART, 2026-09-22 (owner decision).** `DEBRIS_SCORE` is now
> **`$25`**, twenty-five points, and a debris SHOT kill counts toward the
> weapon-pickup capsule. See "Debris reward" below. The mechanism, the
> placement and the "contact awards what a shot awards" rule below are all
> still exactly true; only the constant and the capsule count changed.

- **Request.** Destroying interactive debris awarded nothing; it must award a
  single difficulty-independent `DEBRIS_SCORE = $05`. Debris is an obstacle,
  not an enemy: the value stays an order below the Bomber's `$50` so clearing
  debris cannot compete with killing enemies. *(The value was raised to `$25`
  on 2026-09-22; the reasoning is in "Debris reward" below.)*
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

**The pickup boost colour is implemented, gated and awaiting the owner's smoke of
the DEFAULT build** (section "Pickup boost colour — the capsule is one `PLAYER3`
image in gold `$1C`" above; branch `feat/pickup-boost-colour`, not merged and not
pushed). The capsule owns `COLPM3` in `OPEN`, the colour is the owner's gold
`$1C` from the 2026-09-29 hardware smoke of three review builds, and every gate
moved the right way or not at all. What it still owes is the owner's smoke
checklist in `hardware-testing.md` §6-§7.

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

**Music v2 — step 2a (the placement move) is implemented and is an
`OWNER-SMOKE CANDIDATE`; see its section below. The rest is still planned.**
[plan-music-v2.md](plan-music-v2.md) costs the owner-approved menu "sketch B"
and gameplay "GRA-2" drafts (`assets/music/v2-drafts/`): prototype-measured
players (gameplay tick worst 322 cycles against the 1,985 binding margin), the
placement that fits — the gameplay player and data in the level image at
`$A608`, the menu in `STARFIELD` — the SFX channel decision it needs (Q-S1),
the summed-volume question (Q-V1) and the tests that must go red first. Two
implementation sessions, menu then gameplay; five owner questions in its §9.
Three of the five are **answered** (2026-09-22, `owner-decisions-2026-09-11.md`
§AB): Q-P1 ACCEPTED (the gameplay player in the level image), Q-S1 = **S3**
(the shot SFX moves to channel 4, with the AUDCTL condition session 2b must
verify), Q-V1 = no rescale. Q-Z1 and Q-A1 belong to the menu session.

**OPTIONS difficulty names (2026-09-22).** The menu now reads ROOKIE /
PILOT / ACE, easiest first, as `how-to-play.md` has said since decision V; the
internal `DIFFICULTY_EASY/MEDIUM/HARD` symbols and their order are unchanged.
Eighteen table bytes in `ENTITY_CODE`, size-neutral, boot layout identical
(13,201 B initial content, 104 boot sectors, 205 transport sectors); the
runtime evidence was regenerated for the new artifacts with the recorded-
failure list unchanged. `tests/difficulty-labels.test.mjs` decodes the shipped
bytes. `OWNER-SMOKE CANDIDATE` (look at the OPTIONS row).

**NEXT TASK.** Music v2 is complete and both themes are awaiting owner smoke.
Nothing in the music plan is outstanding except the owner's ear. The queue
below is what it was before the music work started:

1. Owner smoke of the Light multiplicity candidate.
2. **The rotate-frame token gate** — costed, GO recommended, ~1,000 cycles of
   margin on the binding frames, with the two-frame bound already designed
   (`plan-light-multiplicity.md` §4.6). It is the cheapest margin left.
3. **Roadmap 4.6**, which must open by setting an explicit per-frame cycle
   budget in its own plan, against the measured worst margin at the
   checkpoint it branches from — not against the historical margins in this
   file. See §4.4 of the same plan.

Also still open and now costable: **Q-1** (`LEVEL_BUFFER` 16 vs 24 sectors,
`plan-4.6-placement.md`). The per-level payload's music is now measured at
**512 B** in 5 sectors, not the ~534 B the plan estimated; the owner leans to
24 sectors.

Unchanged and still owed: owner smoke of the Light multiplicity candidate,
then the first of these two, in this order:

1. **The rotate-frame token gate** — costed, GO recommended, ~1,000 cycles of
   margin on the binding frames, with the two-frame bound already designed
   (`plan-light-multiplicity.md` §4.6). It is the cheapest margin left.
2. **Roadmap 4.6 itself**, which must open by setting an explicit per-frame
   cycle budget in its own plan, against the measured worst margin at the
   checkpoint it branches from — not against the historical margins in this
   file. See §4.4 of the same plan.

## Music v2 step 10.2 — the GAMEPLAY theme is GRA-2 — `OWNER-SMOKE CANDIDATE` (2026-09-22)

**MUSIC V2 IS COMPLETE.** Both themes are format 2, both compile through one
module, and the gameplay theme the owner approved by ear now plays from the
level image. This is the second and last commit that changes what the owner
hears.

What changed, in one line each:

* **The score.** "GRA-2": 2 voices, 16 bars × 16 rows at 6 frames a row — a
  **30.72 s** loop, the same length as v1 "Contact Line", which it replaces.
  10 pitches on the bass, 9 on the lead, both pure tones with per-frame volume
  envelopes.
* **The player.** 222 → **262 B** of code (the plan estimated 286), 138 →
  **241 B** of score, all inside the 632 B the 2a move reserved: **512 B used,
  120 B free**, and the level image stays at **7 sectors** — no transport
  change at all.
* **The converter.** `scripts/gameplay-music.mjs` is folded into
  `scripts/music.mjs` and deleted, and with it the frozen copy of the v1 menu
  divider table that menu v2 had to leave behind. The gameplay theme carries
  no pitch table: it shares the menu's, and only the dividers it plays are
  compiled into its block.
* **The assets.** `gameplay-theme.v2.json` → `assets/music/gameplay-theme.json`.
  `v2-drafts/` now holds only the two MP3s the owner approved by ear.

**A different encoding from the menu's, on purpose** (plan §1.1). The menu has
four voices with arpeggios and drums and runs in the frontend, where there is
no fence. The gameplay tick is two voices, no arpeggio, no drum, and every
byte of it is fence-relevant — so a row token is a **nibble**, a 16-row column
is **8 bytes**, and it is reached as `gm_columns + id * 8` through a one-byte
offset. No pointer table, no pitch table, one column byte read per channel per
row, no loop over rows. 22 deduplicated columns, two 16-byte sequences, a 10-
and a 9-entry divider map, two envelopes and two AUDC bases: **241 B**.

**Owner answer Q-S1 landed** (`owner-decisions-2026-09-11.md` §AB.2). The
Player Fighter shot SFX moved from POKEY channel 1 to channel 4:

| Channel | Owner | Preempted by |
| --- | --- | --- |
| 1 | music bass | **nothing** |
| 2 | music lead | the hit SFX |
| 3 | engine bed | — |
| 4 | the shot **and** the capital-hull explosion | the explosion outranks the shot |

The lead resumes the score **in place** because the envelope cursors advance
every frame whether or not the register write is suppressed. The two owners of
channel 4 need no arbitration state: `update_sound` writes the shot first and
the explosion second, so the explosion simply wins while its timer runs, and
the shot re-asserts its control byte every frame so it takes the channel back
the moment the explosion ends. The policy is written into
`gameplay-theme.json` itself and the converter refuses any other wording, so
the asset and the player cannot drift apart.

**The Q-S1 condition is MEASURED, not assumed.** The owner made the move
conditional on the capital explosion's AUDCTL not changing the shot's sound,
with a STOP and a fallback to channel 2 if it did. Measured from the running
binary's POKEY write stream: the music and the shot write AUDCTL **not at
all**, and the explosion writes **only 0** — the value gameplay already runs
at (64 kHz clock, no 16-bit pairing, no high-pass). The shot's divider
therefore means exactly the same thing during an explosion as outside one.
**The fallback does not apply.** `tests/music-v2-runtime.test.mjs` holds the
measurement and also pins `CAPITAL_EXPLOSION_SOUND_AUDCTL = 0`, so a later
hull-audio edit cannot change the answer quietly.

**Three tests, all red on `988d5fd` by construction:**

* `tests/music-v2-stream.test.mjs` — plan test (a). The compiled gameplay
  bytes replay the **oracle's** stream for 1,542 frames (a full loop plus one
  row, so the wrap is covered). Source and stream pinned by SHA-256.
* `tests/music-v2-runtime.test.mjs` — plan test (b). The **shipped XEX** in
  the NMOS harness, through the level-image vector, 1,542 ticks: the binary's
  per-frame register state equals the oracle's, **0 differences**, and no
  write reaches AUDCTL or channels 3 and 4.
* same file — plan test (c). With `play_player_fighter_projectile_sound` at
  frames 30 and 200 and `play_hit_sound` at frame 100, in `main_loop`'s own
  order (`update_sound`, then the tick): **channel 1 equals the oracle on
  every frame**; while the hit runs channel 2 carries `$88` and not the music;
  from the first frame after it clears channel 2 is the oracle's again, at the
  envelope position the score reached; and the shot's `$33..$38` phase appears
  on channel 4. A fourth test runs the shot with the music on and with it off
  and asserts the two channel-4 register sequences are **identical** — the SFX
  envelope is intact.

**`tests/player-fire-audio.test.mjs` re-targeted to channel 4.** Every
assertion is the one it always was, with `AUDF1`/`AUDC1` replaced by
`AUDF4`/`AUDC4`: the phase still lives in RAM, the write-only register is
still never read back, the `$33..$38` sequence is still complete and never
restarted, and `scripts/player-fire-audio-trace.mjs` follows the shot to its
new registers. Two assertions are **new**, because the channel is now shared:
the shot must not touch channel 1 anywhere, and `@capital_silent` must not cut
a live shot. One harness fix was forced by the move: the trace never zeroed
`CAPITAL_EXPLOSION_SOUND_TIMER`, which did not matter while the two SFX were
on different channels; left at the cold fill it indexes the explosion's
frequency table far past its end and masks every shot. `silence_audio` zeroes
it on the real startup path, so the harness now does too.

**`tests/gameplay-music.test.mjs` rewritten for v2.** The v1 encoding pins are
replaced by test (a); everything else is re-targeted and kept — the transport,
the GAME MUSIC option, the ON/OFF watchdog, the death path, the call sites,
and the SFX ownership. The placement test's "byte-identical to the v1 player"
half is replaced by test (b); its placement, vector and transport assertions
are untouched.

**Measured, against `988d5fd`:**

| | before | after |
| --- | ---: | ---: |
| gameplay player code | 222 B | **262 B** (plan estimated 286) |
| gameplay score | 138 B | **241 B** |
| level-image block | 369 of 632 B | **512 of 632 B**, 120 B free |
| level image | 7 sectors | **7 sectors**, unchanged |
| gameplay state | 6 B at `$4EDD` | **6 B at `$4EDD`**, byte-neutral |
| `ENTITY_CODE` | 3,165 B, 1 B free tail | **3,161 B, 5 B free tail** |
| `music_tick_gameplay` min / max | 41 / 246 cycles | **118 / 336** |
| worst fence margin | 1,977 | **1,985** |
| measured DMA-on maximum | 31,081 | **31,200** (physical headroom 4,368) |
| `STARFIELD` raw / packed | 1,990 / 1,701 B | **1,990 / 1,701 B**, untouched |
| boot transport | 204 sectors | **204 sectors**, initial block 103 |

**The tick got dearer and the margin got better.** The plan costed a worst
case of +280 cycles on a single frame and asked for a flag below 1,700. The
measured tick is +77 on an ordinary frame and +90 on a row frame, and the
worst fence margin **rose 8 cycles to 1,985** — the binding frame
(`director-complete-2-natural-sweep-fire0` f6629) is not a row frame, and v2's
row frame is cheaper than v1's because the nibble encoding replaced a
self-modified pointer load. The next binding rows are **2,985**
(`director-complete-1-natural-sweep-fire0` f3631) and **3,737**
(`debris-effects-2-sweep-fire4` f4189). Nothing moves toward 1,700.

**Reserved: starfield expansion — unchanged.** Owner decision AB.4. This
session spent **none** of it: the gameplay music lives in the level image, not
in `STARFIELD`.

| | reserved |
| --- | ---: |
| `STARFIELD` free run tail | **348 B raw** |
| margin to the 1,804 B correction gate | **103 B packed** |
| margin to the 1,825 B hard gate | 124 B |
| staging stream margins A / B | 16 / 203 B |

**Gates (MEASURED this session).**

* Default build links and the **release gate is green**: no unrecorded gate
  failure, `timing_and_dli_passed = true`, `docs/recorded-gate-failures.json`
  unedited, the recorded-failure list **exactly the same 40 entries**.
* Runtime evidence regenerated as this commit's own change: 64 sessions,
  **0 distinct miss events**, 0 rows over the hard gate, every session PASS.
* Boot smoke **8/8**, `--atari800-source=build/atari800-trace`. Milestones
  unmoved: XEX loader 135 / menu 391, ATR loader 339 / menu 595; the level
  image verifies byte-exact at `$A600` on every session, 7 command frames, 26
  load frames, 0 wire retries. `boot-deadline-baseline.json` is **not**
  re-recorded.
* `npm test` on the default build: 771 tests, **0 new failures** against the
  `988d5fd` list. Four pins re-recorded deliberately in the same commit, each
  with its reason in the test, and all four are the same four bytes: deleting
  the v1 player's self-modified read tail at `$9D21` shrank `ENTITY_CODE` —
  `light-interceptor.test.mjs` code bytes 3,165 → 3,161, free tail 1 → 5,
  `light_glyph` `$9D2B` → `$9D27`, `light_interceptor_glyph` `$9D3B` →
  `$9D37`, and `light-wingman.test.mjs` staging margin 77 → 81. A fifth,
  `pause.test.mjs`, dropped its `fire_timer` test of `music_stop_gameplay` for
  the stronger assertion that the shot is not on channel 1 at all.
* Still red exactly as at baseline, and **not** touched:
  `player-fire-audio.test.mjs`'s SPREAD cadence histogram
  (`{12: 62, 28: 187}` pinned, `{12: 149, 28: 150}` measured). That pin was
  already stale at `988d5fd`, it is about weapon cadence and not audio, and
  re-recording it is not this session's work. Its audio assertions, which this
  session did re-target, pass.

**Two things the code does that the plan did not say.**

1. `music_restore_gameplay_channels` is now just `jmp gm_publish`. v1 cached
   an AUDF/AUDC pair because it only wrote POKEY on a row boundary, so without
   the cache an unpause could leave the voices silent for five frames. v2
   publishes every frame, so restoring is one publication brought forward; it
   costs one frame of envelope cursor per unpause and no state at all.
2. The `$39 → $3F` ABI pad before `free_broadside_slot`. `music_stop_gameplay`
   lost the six bytes of its `fire_timer` test when the shot left channel 1,
   which would have moved the fixed `$76A7` integration release target. That
   pad exists to absorb exactly this; nothing executes in it.

**What the owner must smoke.** The gameplay theme itself, on the XEX and the
ATR, and on SIO2SD where the level read is real hardware: that GRA-2 is what
they approved; that the bass really does keep the pulse through shots and
hits; that the shot on channel 4 still reads as the same shot; and that the
music sits under the SFX at the drafted ~60 % rather than fighting them. If
the balance is wrong, the fix is per-instrument volume edits in
`gameplay-theme.json`, re-auditioned through `preview/render.py` — not a
player change.

## Music v2 step 10.1 — the MENU theme is sketch B — `OWNER-SMOKE CANDIDATE` (2026-09-22)

**The menu sounds different now.** This is the first commit of the music work
that changes what the owner hears. `assets/music/menu-theme.json` is the
owner-approved **sketch B** draft, in **format 2**, and the menu player in
`STARFIELD` is a new per-frame renderer that plays it.

What changed, in one line each:

* **The score.** 43 pitches (38 chromatic pure B2-C6 plus 5 poly-4 buzz bass),
  5 instruments with volume envelopes and arpeggios, 3 drums, 8 bars × 16 rows
  × 4 channels at 6 frames a row — a **15.36 s** loop. The v1 "Fleet in
  Shadow" cinematic mix is gone.
* **The player.** v1 wrote POKEY once every eight frames. v2 publishes four
  voices **every frontend frame**, advancing each voice's envelope, arpeggio
  or drum macro. 216 → **353 B** of code, 513 → **514 B** of data.
* **The converter.** `scripts/menu-music.mjs` is replaced by
  `scripts/music.mjs` (validate, compile, render the include, model the
  player) plus `scripts/music-oracle.mjs`, an independent port of the
  reference renderer's rules. `scripts/gameplay-music.mjs` stays until 2b.
* **The assets.** `menu-theme.v2.json` → `assets/music/menu-theme.json`;
  the renderer is `assets/music/preview/render.py` (reads a theme, writes a
  WAV, never writes a JSON); the sketch generators are provenance under
  `preview/sketches/` behind a `--write` guard;
  `assets/music/README.md` rewritten for v2.

**Three tests, all red on `307bcd1` by construction** (the tree's menu theme
was format 1 and the binary carried the v1 player):

* `tests/music-v2-stream.test.mjs` — plan test (a). The converter's model over
  the **compiled bytes** equals the **oracle's** stream for 774 frames (a full
  loop plus one row, so the wrap is covered), AUDF ignored while AUDC is `$00`.
  Pins the approved music by SHA-256 of the source and of its stream.
* `tests/music-v2-runtime.test.mjs` — plan test (b). The **shipped XEX** is
  loaded into the NMOS harness, `music_start_menu` then `music_tick` 774
  times, every POKEY write trapped: the binary's per-frame register state
  equals the oracle's, **0 differences**, and the tick touches nothing above
  `$D207` — no AUDCTL, no channels it does not own.
* `tests/music-v2.test.mjs` — the converter's validation rules, each exercised
  by mutating the committed theme: the poly-4 buzz rule, the chromatic pure
  block, four instruments per channel, terminal silence, drum volumes, the
  255-byte macro page, `audctl = 0`, arpeggio reach, and the drum-token bias.

**`tests/menu-music.test.mjs` is retired.** Where each of its assertions went:

| v1 assertion | now |
| --- | --- |
| deterministic compile, byte counts, manifest agreement | `music-v2-stream.test.mjs`, test 1 |
| approved source and POKEY trace SHA-256 | `music-v2-stream.test.mjs`, test 3 — against the v2 source and the oracle stream |
| start / stop / restart reset the transport and the registers | `music-v2-stream.test.mjs` (model) and `music-v2-runtime.test.mjs` (binary) |
| the tick advances on exact PAL row boundaries without drift | `music-v2-stream.test.mjs`, last test — and the frame-exact stream comparison over a whole loop would catch any drift anyway |
| the call sites: starts in the main menu, stops before gameplay | `music-v2-runtime.test.mjs`, last test, carried verbatim |
| `music_stop` clears AUDF1-4 / AUDC1-4 / AUDCTL through `silence_audio` | same test, plus the behavioural check in `music-v2-runtime.test.mjs` |
| **"summed volume ≤ 13", the gated drone** | **no longer applies.** That rule and that instrument belonged to the v1 cinematic mix. Owner decision AB, Q-V1 declines a rescale: sketch B peaks at **41** and the owner judges it in the emulator. The peak is reported in the manifest and asserted, not capped |
| **the channel mask leaves channels free for SFX** | **no longer applies.** The v2 menu owns all four voices unconditionally; `MUSIC_CHANNEL_MASK` is the gameplay player's alone now. The "writes only AUDF1-4/AUDC1-4" test is the property that survived |

**One forced change outside the menu.** The v1 gameplay score indexed
`music_frequency_table` **inside the menu data** (`frequencySource:
"menu-theme"`). The menu's table is now 43 format-2 dividers, so
`scripts/gameplay-music.mjs` carries a frozen copy of the sixteen v1 dividers
and emits the leading 14 into its own block as `game_music_frequency_table`.
**Superseded by step 2b below**, which replaced the v1 score entirely and
deleted that module and its frozen table.
The gameplay data grows 124 → **138 B** inside the level image (263 B still
free there) and its POKEY stream is **unchanged, byte for byte** —
`tests/gameplay-music-placement.test.mjs` still proves it over a full loop.
`music_frequency_table` is no longer exported from main. Step 2b deletes all
of it.

**Measured, against `307bcd1`:**

| | before | after |
| --- | ---: | ---: |
| menu player code | 216 B | **353 B** (plan estimated 358) |
| menu score | 513 B | **514 B** |
| menu state | 6 B | **4 B** counters + **20 B** BSS (`$548A-$549D`) + **10 B** zero page (`$00A2-$00AB`) |
| `STARFIELD` raw | 1,852 B | **1,990 B** (+138; the plan costed +143) |
| `STARFIELD` free run tail | 486 B | **348 B** |
| `STARFIELD` packed | 1,505 B | **1,701 B** (+196) |
| margin to the 1,804 B correction gate | 299 B | **103 B** |
| margin to the 1,825 B hard gate | 320 B | **124 B** |
| staging stream margins A / B | 44 / 371 B | **16 / 203 B** |
| boot transport | 203 sectors | **204 sectors**; initial block 102 → **103** |
| level image | 7 sectors | **7 sectors**, unchanged |
| worst fence margin | 1,977 | **1,977**, unchanged |
| menu tick cost | ~46 / ~300 cycles | **383-492** ordinary frame, **515-920** row frame (peak = bar load) |

**Reserved: starfield expansion — what is left.** Owner decision AB.4. Menu v2
spent 138 B raw / 196 B packed of the room 2a freed. **Still reserved and
untouchable: 348 B raw, 103 B packed** against the correction gate (124 B
against the hard gate). The packed figure is the binding one — the v2 score is
pitch and column tables, which pack worse than code. Staging stream A is now
at **16 B** of its 960-byte window, and that, not the gate, is what a further
raw growth in the first 1,017 bytes of `STARFIELD` would break first.

**Gates (MEASURED this session).**

* Default build links and the **release gate is green**: no unrecorded gate
  failure, `timing_and_dli_passed = true`, `docs/recorded-gate-failures.json`
  unedited, the recorded-failure list **exactly the same 40 entries**.
* Runtime evidence regenerated as this commit's own change: 64 sessions,
  **0 distinct miss events**, 0 rows over the hard gate, every session PASS.
  Worst fence margin **1,977** (`director-complete-2-natural-sweep-fire0`
  f6629, pre-wait 23,272) — **unchanged**, as it must be: the menu has no
  fence. The next binding rows are **2,981**
  (`director-complete-1-natural-sweep-fire0` f3631) and **3,742**
  (`debris-effects-2-sweep-fire4` f4189), both unchanged. Measured DMA-on
  maximum 31,081, physical headroom 4,487.
* Boot smoke **8/8**, `--atari800-source=build/atari800-trace`. Milestones
  unmoved from 2a: XEX loader 135 / menu 391, ATR loader 339 / menu 595, level
  image byte-exact at `$A600` on every session, 7 command frames, 0 wire
  retries. `boot-deadline-baseline.json` is **not** re-recorded.
* `npm test` on the default build: 764 tests, **109 failures, 0 new** against
  the `307bcd1` list; one that was red there now passes (`showcase and asset
  sheets regenerate without ignored capture files`). One pin re-recorded
  deliberately in the same commit with the reason in the test:
  `tests/starfield.test.mjs` initial boot sectors 102 → 103.

**The listening check (plan §5) is only half done — the owner owes the other
half.** What was verified: every `$C` divider in the theme now passes the
poly-4 rule as a **converter validation**, and the rule is exercised by a test
that breaks the theme deliberately. Measured periods, all full 15 (a periodic
tone, not noise):

| id | N | N+1 | poly-4 period | f | cents |
| --- | ---: | ---: | ---: | ---: | ---: |
| C2~ | 63 | 64 | 15 | 65.98 Hz | +15 |
| E2~ | 51 | 52 | 15 | 81.20 Hz | −26 |
| F2~ | 48 | 49 | 15 | 86.17 Hz | −23 |
| G2~ | 42 | 43 | 15 | 98.20 Hz | +4 |
| A2~ | 37 | 38 | 15 | 111.12 Hz | +18 |
| KICK | 42, 57, 76, 91, 102 | — | 15 each | 98.2 → 41.0 Hz | sweep |

**No divider misbehaves and nothing was retuned.** What was **not** done: an
actual by-ear pass in Atari800. The emulator's audio could not be captured
headlessly on this machine — SDL's disk audio driver writes one buffer and
stalls, and Atari800's own audio recorder is started from the UI. So the
"does 41 sound like a drum hit or like clipping" question (Q-V1) and the ear
test of the bass and the kick are **both owner smoke**, through
`npm run play:xex`. The owner can also audition the composition away from the
hardware with
`python3 assets/music/preview/render.py assets/music/menu-theme.json out.wav`.

**Defaults applied where the owner has not answered**, both to be confirmed:

* **Q-Z1 — zero page, as the plan recommends.** The four column pointers and a
  scratch pair are 10 bytes of equates at `$00A2`, the first free zero page
  above `READER_ZP`, guarded by `.assert __ZP_LAST__ <= $A0`. The alternative
  was four self-modified `lda $FFFF,y` sites at +16 B of code.
* **Q-A1 — the Python sketches kept as provenance**, under
  `assets/music/preview/sketches/`, behind a `--write` guard. **The MP3s were
  NOT deleted**, which is a deliberate deviation from the recommended default:
  `MENU-B-z-pliku.mp3` is the recording the owner approved by ear and the
  reference for the smoke that has not happened yet, and `GRA-2-z-pliku.mp3`
  belongs to 2b. Delete them when the owner has accepted what the hardware
  plays.

**What the owner must smoke.** The menu theme, on the XEX and on the ATR: that
sketch B is what they approved, that the buzz bass and the kick are tones and
not noise on real POKEY, and whether a peak summed volume of 41 sounds like a
mix or like clipping. If it clips, the fix is per-instrument volume edits in
`menu-theme.json`, re-auditioned through `render.py` — not a player change.

## Music v2 step 2a — the gameplay player moves into the level image — `OWNER-SMOKE CANDIDATE` (2026-09-22)

Owner answer **Q-P1 ACCEPTED** (`owner-decisions-2026-09-11.md` §AB,
`plan-music-v2.md` §1.4 placement G1). The gameplay music player and its score
left `STARFIELD` and became the fifth independent link,
`src/hybrid/gameplay-music.s` + `cfg/gameplay-music.cfg`, spliced into every
level image behind the reader's eight-byte header and executing from `$A608`.

**This commit changes nothing the owner hears.** It is a pure move: the v1
score, encoding, tick and POKEY write stream are unchanged.
`tests/gameplay-music-placement.test.mjs` proves it by running the moved
player through its vector in the NMOS harness for a full loop plus one row
(1,542 frames) and comparing the final `AUDF1/AUDC1/AUDF2/AUDC2` state of
every frame with the committed v1 JS player model — 0 differences, and no
write ever reaches `AUDCTL` or channels 3 and 4.

**Why this came before menu v2.** `plan-music-v2.md` §10 ordered the menu
first; §1.3 of the same plan shows why that order cannot hold — menu v2 alone
is +143 B raw against a packed gate with 19 B of correction-gate headroom, so
an intermediate menu-first commit would break the gate. The landed order is
**2a → menu v2 → 2b**.

**Measured, against `278199a`:**

| | before | after |
| --- | ---: | ---: |
| `STARFIELD` raw | 2,198 B | **1,852 B** (−346) |
| `STARFIELD` free run tail | 140 B | **486 B** |
| `STARFIELD` packed | 1,785 B | **1,505 B** (−280) |
| margin to the 1,804 B correction gate | 19 B | **299 B** |
| margin to the 1,825 B hard gate | 40 B | **320 B** |
| staging stream margins A / B | 44 / 91 B | **44 / 371 B** |
| boot transport | 205 sectors | **203 sectors**; initial block 104 → **102** |
| level 1 image | 2 sectors (256 B) | **7 sectors (896 B)** |
| ATR START GAME read | 7 frames, 2 command frames | **26 frames, 7 command frames** (+19, exactly as planned) |
| `music_tick_gameplay` min / max | 42 / 246 cycles | **41 / 246** (the min path lost a page-crossing branch penalty) |
| worst fence margin | 1,985 | **1,977** (`director-complete-2-natural-sweep-fire0` f6629, pre-wait 23,272) |
| `ENTITY_CODE` free tail | 1 B | **1 B** (unchanged, deliberately — see below) |
| music state `$4ED9-$4EE9` | 17 B | **17 B**, byte-neutral |

**Reserved: starfield expansion.** Owner decision 2026-09-22 — the room
`STARFIELD` gained (346 B raw / 280 B packed) is reserved for the roadmap's
"STARFIELD PER SECTOR" work (conditional thickening in
`generate_starfield_row`, per-sector star colour) and is not available to
anything else in the music sessions. **Superseded by the menu v2 section
above**, which spent 138 B raw / 196 B packed of it and leaves **348 B raw /
103 B packed** — quote that section's figures, not these.

**Two deliberate deviations from plan §1.4**, both recorded in
`memory-map.md` and `plan-music-v2.md`:

1. The vector table is **three** entries (`START`, `TICK`, `RESTORE`), not
   two: `resume_gameplay_audio` really does call
   `music_restore_gameplay_channels`, so a two-entry table would have meant
   inventing a behaviour change inside a pure move.
2. The four-byte self-modified read tail `game_music_read_token_tail`
   **stays in `ENTITY_CODE`** at `$9D21`. The boot smoke checksums the whole
   level buffer at its gameplay snapshot (frame 3300, after
   `start_gameplay`), so a block that modified itself would fail that
   comparison. The block is strictly read-only at runtime; `ENTITY_CODE`'s
   tail stays 1 B rather than the 5 B the plan predicted.

**Gates (MEASURED this session).**

* Default build links and the **release gate is green**: no unrecorded gate
  failure, `timing_and_dli_passed = true`, `docs/recorded-gate-failures.json`
  unedited.
* Runtime evidence regenerated as this commit's own change: 64 sessions,
  **0 distinct miss events**, every session PASS. Worst fence margin **1,977**
  (`director-complete-2-natural-sweep-fire0` f6629); next binding rows
  **2,981** (`director-complete-1-natural-sweep-fire0` f3631) and **3,742**
  (`debris-effects-2-sweep-fire4` f4189). Measured DMA-on maximum 31,081,
  physical headroom 4,487.
* Boot smoke **8/8**, `--atari800-source=build/atari800-trace`. The level
  image is verified byte-exact at `$A600` on every session, 0 wire retries.
  Milestones move −1 frame (XEX menu 392 → 391, ATR menu 596 → 595): a
  shrink, inside the ±10 warn band, so `boot-deadline-baseline.json` is
  **not** re-recorded — its rule is about deliberate growth.
* The four mode-gated native replays were A/B'd against a clean `278199a`
  build: `--raider-formation-only` PASS; `--raider-sector-only`,
  `--raider-remnant-only` and `--debris-gate-only` fail **identically** before
  and after (same message, same session, same single blank frame in
  `debris-gate-0-neutral-fire0`). **0 new.**
* `npm test` on the default build: **0 new failures** against the `278199a`
  list, and one that was red there now passes (`assembly preserves SFX
  ownership, lifecycle, and GAME MUSIC persistence`). One pin re-recorded
  deliberately in the same commit, with the reason in the test:
  `tests/starfield.test.mjs` initial boot sectors 104 → 102.

**What it costs roadmap 4.6.** LevelDef starts at image sector **6** (header
byte 7, previously reserved and zero, now records it), leaving **27 sectors /
3,456 B** of the 32-sector buffer. The reservation inside the image is sized
for the **v2** player (632 B, 355 used, 277 free), so session 2b moves no
sectors and pays no further transport cost. The owner's recorded consequence:
pending decision **Q-1** (`LEVEL_BUFFER` 16 vs 24 sectors,
`plan-4.6-placement.md`) must be re-costed with the per-level music — the
owner leans to 24.

**What the owner must smoke.** That gameplay music still sounds exactly as it
did, on the XEX and — because the player now arrives over SIO — on the ATR,
including a START GAME that takes about 0.4 s longer, and on SIO2SD, where
the level read is real hardware.

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
   **4.8c enemy traffic in the capital corridor** is the backlog item next to
   it (recorded 2026-09-22): Lights share the corridor with the player, and
   because transients publish only to `CH_SPACE` the hull, gondola and turret
   always win priority. Minimum scope, owner-approved — free-cell placement
   and a lateral clamp, **no avoidance AI and no enemy-vs-hull collision**.
   Described in `project-overview.md` §4.8 and `plan-realizacji.md` §5.
7. **Level complete / next level**; **12-level campaign as data**; polish.
   **Owner decision AC (2026-09-22): TWELVE levels**, a boss on each, easiest
   difficulty beatable by anyone — superseding decision E's sixteen, which is
   withdrawn as the 1.0 target and kept only as a possible post-1.0 extension.
   The eight-level content target that appeared in `project-overview.md` §6.1
   and design-4.6 §6 stays withdrawn. Twelve is **four regions of three**
   (1-3, 4-6, 7-9, 10-12), one enemy hull style per region, so all four styles
   are used in 1.0.

## Owner decisions E-W (2026-09-20) — the game concept is settled

**Recorded, not implemented.** No gameplay, renderer, engine or build behaviour
changed for these. Full text, with rationale, in the decision journal:
[owner-decisions-2026-09-11.md](owner-decisions-2026-09-11.md), section
"Decyzje literowe 2026-09-20". A-D were moved into the same section from
`project-overview.md` §5.3.

| Letter | Decision |
| --- | --- |
| **E** | ~~**Sixteen levels**, not eight~~ — **SUPERSEDED in its number by AC (2026-09-22): 1.0 ships TWELVE levels**; sixteen is withdrawn as the 1.0 target and kept only as a possible post-1.0 extension. E's other clauses survive under AC: **a boss ends every level; the easiest difficulty beatable by anyone.** The eight-level content target stays withdrawn. |
| **F** | Capital variety is **parametric**: four segment-art sets, with length in segments, turret density and maximum gondola protrusion as three independent 4-step parameters. One hull variant per level. ≈ 4 × 1,253 B on disk instead of one art set per level. (Assumptions changed by **AA**: one allied hull for the whole game, four *enemy* styles by region. Regions are three levels each under **AC**.) |
| **G** | Capital turrets stay **non-destructible**. Confirms backlog 4.8b. |
| **H** | Boss: **one controller, a record per boss** (module layout, weapon placement and count, weak points). Boss weapons reuse existing `weapon_class` records, to save code for the boosters. |
| **I** | **Boss laser**: drawn at once from gun to bottom of screen — the earlier "unfolding beam" is withdrawn. One second, telegraphed by ~2 s of visible gun heating with sound, destroys everything in its path. 1 / 2 / 4 per level on ~~1-4 / 5-9 / 10-16~~ → **1-4 / 5-8 / 9-12, rescaled by AC (2026-09-22)** to the twelve-level campaign. Cost assessment is an owner ESTIMATE, to be costed at 4.7. |
| **J** | Difficulty scales the existing reload/spacing scaling **and** damage: player-dealt, player-taken, contact and boss. |
| **K** | Lives: three at start, **+1 after each odd level from 3**. The rule is unchanged; the enumeration follows the campaign length, so under **AC** it is **3, 5, 7, 9, 11 — five extra, eight in all**, not the seven (ten in all) that sixteen levels gave. A shorter campaign carrying less reserve is intended — owner confirmed 2026-09-23. |
| **L** | Level select from the furthest level reached. RAM only; a difficulty change in the menu resets it to level 1; the menu shows which levels are available. |
| **M** | High scores: **RAM only, no disk write.** Confirms today's behaviour. |
| **N** | **Permanent weapon booster**, level 0-5. One variable; the level sets damage; death costs one level. Both repo checks **ANSWERED** (below). Colour no longer carries the signal — see **U**. |
| **O** | **Loader screen**: a random line from 8-16 short English texts spoken by the fighter's cynical onboard AI, plus an animation stepped one frame per sector read — not a progress bar. Texts (~640 B for 16 lines) resident before the read starts. Written in a later session. |
| **P** | **End screen**: eventually an animation in the top third at full width plus a text scroll below — a separate sub-project, a loaded sector, not resident. A simple message suffices for now. |
| **Q** | **The project rules are explicitly superseded.** `plan-realizacji.md` §7 and `reguly-projektu.txt` §11 keep their "BASIC RAM, loader changes, runtime disk I/O" entries, marked SUPERSEDED with the superseding decision and why the ground changed. `reguly-projektu.txt` is now version 3.2. |
| **R** | **Hardware measurements deferred — risk OWNER-ACCEPTED 2026-09-20.** Register below. |
| **W** | **The between-levels reader uses DIRECT SIO, not the OS `SIOV`.** Supersedes the "resident `SIOV` reader (~80-120 B)" of decision 23 §10.1 and `project-overview.md` §4.3, which named the wrong reader *and* the wrong estimate: direct SIO is **~250-350 B** (ESTIMATE). The game has run with `sei` set, with `NMIEN` never enabling the VBI, and with nothing but the game writing `DLISTL`/`DLISTH`, `CHBASE`, `PMBASE` or the colour registers since start; the OS route would have to unwind all three and re-establish them, with a display-shadow exposure window on both sides of the call. Direct SIO unwinds none of them — no OS vector is ever taken. Implemented from the protocol specification (Altirra Hardware Reference Manual ch. 9), not vendor GPL-2 code, so `AGENTS.md` rule 13 is not strained. **IMPLEMENTED 2026-09-20 by roadmap 4.3** (section above). The ESTIMATE was low: the core measured **682 B**, the whole module 1,466 B with its display and texts. Three register values in the plan built on this decision were wrong and were corrected against the manual before any code was written — see the 4.3 section and `diagnostics/sio-register-probe-2026-09-20.json`. |
| **U** | **Booster level is signalled by SHAPE and SOUND**, not colour. A thicker/doubled bolt per level (the player glyph bank has three spare codes) plus a different firing sound per level (parameters on an existing POKEY channel). The two act at different moments and reinforce rather than duplicate, so neither may later be dropped as redundant. Colour was conditional on one check, the check was run, and **colour is REJECTED**: `COLPF2` is shared (below). Five levels stand; three may read more clearly if sound discrimination proves weak — settled during balancing. |

### Campaign decisions 2026-09-22 — AC (twelve levels) and AD (enemy variants)

**Recorded, not implemented.** No gameplay, renderer, engine or build behaviour
changed. Full text in the journal:
[owner-decisions-2026-09-11.md](owner-decisions-2026-09-11.md), sections AC and
AD.

| Letter | Decision |
| --- | --- |
| **AC** | **Version 1.0 ships TWELVE levels.** Sixteen is withdrawn as the 1.0 target and kept only as a possible **post-1.0 extension**; decision **E** is superseded in its number and keeps its history. The campaign is **four regions of three levels — R1 1-3, R2 4-6, R3 7-9, R4 10-12** — so **all four enemy hull styles are used in 1.0**. This narrows decision **AA** item 2's regions (were 1-4, 5-8, 9-12, 13-16); the rest of AA stands. The **allied** hull colour changes at the halfway point: levels **1-6** the brighter steel **`$88`** (chosen at the hull step-1 smoke), levels **7-12** a darker step — **`$84` or `$86`**, picked at a later smoke. **The enemy colour is unchanged.** Decision **I**'s boss lasers rescale to **1 / 2 / 4 on levels 1-4 / 5-8 / 9-12**. A boss still ends every level and the easiest difficulty stays beatable by anyone. Decision **K**'s enumeration follows the rule to **3, 5, 7, 9, 11 — five extra, eight lives in all** (owner-confirmed 2026-09-23). |
| **AD** | **A per-level enemy "variant" is a RE-SKINNED existing archetype, never a new one.** "Defender" and anything like it is an `appearance[3]` Light bitmap, optionally a `weapon_glyph[2]` projectile look, plus path, cadence and subtype ceiling — **all level data, no new archetype code**. A variant behaves **exactly** like its archetype; **differing behaviour is a separate roadmap item with its own budget**. Rationale: level files may repaint and re-arrange, never add behaviour (4.6 data architecture). |

**`LEVEL_MAX_ID` stays 16 — owner decision, 2026-09-23.** The code indexes
sixteen and **the data delivers twelve**: `LEVEL_MAX_ID = 16`
(`src/hybrid/sector-reader.s:131`), the `16 * 3 B = 48 B` directory assertion
(`:903`) and the generator (`scripts/build.mjs:622`) are **unchanged**. Nothing
breaks — the four surplus directory entries simply carry a zero `count`, which
`sector_reader_lookup` already rejects without touching SIO, exactly as it
rejects a level absent from the disk today.

Trimming to twelve would free **12 B resident** and **recompute the evidence**
(runtime evidence, boot baseline). It is therefore **a minor memory reclaim in
the backlog — to be taken when bytes run short**, not opportunistically.
`plan-4.3-sector-reader.md` §9 keeps its figures because they describe code
that stays. Carried in `plan-realizacji.md` §5 and the journal backlog; **not**
added to STATUS §Backlog, which unmerged `caab79d` is editing.

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

- ~~HEAVY DESTRUCTION EFFECT~~ — **CLOSED 2026-09-22**, implemented as
  plan-4.6-placement.md §7.4 **variant 2** for **both** Heavy archetypes. See
  "Heavy break-up" below.

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
- **The weapon-pickup traversal clause should measure the pickup's own slot**
  (recorded **2026-09-28**, MEASURED, deferred by the owner at 4.6 step 2's
  closure; plan [plans/director-4.6.md](plans/director-4.6.md) §11 item 11).
  The step-2 blocker was repaired by re-scripting
  `weapon-pickup-traversal-2-observe-*` from fire delay 4 to **8**, and **8 is
  the only value of the fifteen swept with no violation**. The repair is
  therefore **fragile**: the traversal needs 108 frames, level 1 sector 1's
  debris-clear window is 128, so **20 frames is the whole slack the replay has**
  and any future change to that debris cadence moves it again. The durable fix
  is a clause that **distinguishes the debris slot from the pickup's logical
  slot**: `entity_active_mask === 2` is a surviving character-era conjunct
  measuring the whole entity plane, so a debris admitted beside an **intact**
  capsule reads as a broken capsule. Re-pointing it at the pickup's own slot bit
  — `(mask & 2) !== 0`, which the smooth-sequence gate already uses — would make
  the clause say what its message says and cost nothing it currently catches.
  Full measurement and the fire-delay sweep:
  [diagnostics/pickup-traversal-clause-2026-09-28.md](diagnostics/pickup-traversal-clause-2026-09-28.md).
  **STILL OPEN after the pickup-colour task, and confirmed by it** (owner
  decision, **2026-09-29**, plan [plans/pickup-colour.md](plans/pickup-colour.md)
  §7 item 10). Re-measured on `PLAYER3` at fire delays 4, 5, 6 and 8: the
  capsule's own three conjuncts hold on **108/108 frames at every delay**, and
  `entity_active_mask === 2` is the only one that ever fails — 26 frames at delay
  4, 27 at 5, 0 at 8. **The clause was not changed there**; the session stays at
  fire delay 8 and this item is the follow-up, with the measurement in
  [diagnostics/pickup-boost-colour-2026-09-29.md](diagnostics/pickup-boost-colour-2026-09-29.md)
  §2.2.

- **The pickup replays are delay-tuned, and the durable fix is the pickup
  colour task** (recorded **2026-09-28**, MEASURED, deferred by the owner at
  4.6 step 2's closure; plan [plans/director-4.6.md](plans/director-4.6.md) §11
  item 13). The entry above is one half of this. Both pickup scenarios pass
  only at specific fire delays — **8** for the traversal (1 of 15 swept), **5
  or 48** for the overlap (2 of 15) — and the `memory-integrity-160s` `hunt`
  pair joins them at step 2's closure. The cause is shared: the capsule is the
  GTIA **fifth player** on the same `$3B00` missile plane and the same COLPF3
  as the fighter's own shots, so a shot fired up the capsule's column reads as
  the capsule in both the raster and the trace, and only a delay that keeps
  them apart passes. The durable repair is the **pickup-colour** task
  (`docs/plans/pickup-colour.md`, **Option 2a — the capsule on P3**; that plan
  document does not exist in the repo yet). Moving the capsule onto its own
  player lets the pickup observer be re-pointed from the missile plane to
  **PLAYER3**, after which the scenarios no longer need tuned delays. The
  observer correction taken at step 2's closure (the capsule's own published
  window instead of the whole page) removes the trace-side half of the
  confusion; the raster-side half needs the separate plane. Measurements:
  [diagnostics/pickup-booster-clauses-2026-09-28.md](diagnostics/pickup-booster-clauses-2026-09-28.md).
  **HALF CLOSED, 2026-09-29, by the pickup-colour task** (plan
  [plans/pickup-colour.md](plans/pickup-colour.md) §7 items 10-11; that plan
  document exists now). With the capsule on `PLAYER3` in its own `COLPM3`,
  `weapon-pickup-overlap` and `weapon-pickup-contact` pass at **all four** swept
  delays (4, 5, 6, 8) — the 46 contaminating pixels were a player shot counted as
  capsule pixels, and nothing else in fighter space writes `COLPM3`, so the
  contamination is not reduced but impossible. The two that remain are
  **Director-cadence** properties, measured rather than assumed and both accepted
  by the owner as such: the traversal needs its 108 ACTIVE frames inside a
  debris-clear window (the entry above), and the `hunt` booster-cycle clause needs
  10 collections inside a fixed 4,000-frame window — **8 at delay 4, 10 / 12 / 10
  at 5 / 6 / 8**, with XEX/ATR parity at every delay. The same task also had to
  re-point the **smooth-sequence** gate, which compared a raster window
  byte-for-byte and so depended on the capsule and the shots sharing a register;
  measurements in §6 of
  [diagnostics/pickup-boost-colour-2026-09-29.md](diagnostics/pickup-boost-colour-2026-09-29.md).

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

- **Splash initial-block reclaim, and then the cassette-sound variation**
  (recorded 2026-09-23). **Two items that must be done in this order**, because
  the second only fits once the first has freed bytes.
  1. **Pack the splash blob and `A2_KERNEL`.** Both travel **unpacked** today:
     the splash blob (`bootSplashRuntime`) 512 B raw → **473 B** packed, and
     `A2_KERNEL` (237 B used in a 256 B `fill = yes` region) 256 B raw →
     **218 B** packed — about **77 B** recovered in the initial block. MEASURED
     with the tree's own `LZ-10/5` packer;
     [diagnostics/menu-stars-alternative-a-boot-sectors.md](diagnostics/menu-stars-alternative-a-boot-sectors.md)
     §6.1. Both need a **decoder at a point in boot where none runs today**, and
     that decoder — where it lives, what it costs, and that it runs before the
     blobs are used — **is the real content of the task**, not the packing.
  2. ~~**Vary the cassette loading sound on the splash.**~~ — **CLOSED
     2026-09-23**, and it did **not** need step 1. See "Splash cassette sound —
     the second record is an octave down" below and
     [plan-boot-splash-cassette.md](plan-boot-splash-cassette.md) §2.3.1.
  **Why item 2 did not have to wait, corrected 2026-09-23.** This entry
  deferred the sound on the reasoning that "any real byte added to splash code
  costs a boot sector". That is true of bytes added to the **initial block**,
  but **not** of bytes added to the **blob**: `src/boot-splash.s` pads itself to
  a fixed `SPLASH_BLOB_BYTES` (`$0200`) window, so the transported blob is 512 B
  whatever the code inside it weighs, and MEASURED at `6e05644` that window
  still had **13 B of pad** (code 499 B). The octave cost **11 B** of it.
  The initial-block figure quoted above was also stale: MEASURED at `6e05644`,
  `initialBootContentBytes` is **13,652**, so the headroom is **32 B**, not 2 B.
  **Item 1 stands and is untouched** — but see the cheaper reclaim named in the
  silhouette entry below, which does not need a new decoder at all.

- **Splash silhouette replacement** (owner, 2026-09-23). The splash ship is to
  be redrawn so the game carries **its own** silhouette, built from the capital
  hulls' visual language — **mass, chamfers, grooves**. **Owner's reason,
  recorded as his:** the current ship reads as the hull of a well-known
  television fleet rather than as this game's own. (That fleet's name is in the
  retired-vocabulary list `tests/branding.test.mjs` enforces over tracked
  content, so it is described here rather than written.) **The silhouette will
  be chosen from owner-approved previews before any session replaces it** — no
  session picks the shape.
  **What it costs, MEASURED 2026-09-23 — and a correction to the brief that
  asked for this entry.** The brief described the splash picture as "a 512 B
  RAW bitmap at `$0500-$06FF`", from which it followed that a simpler drawing at
  the same size would save nothing. **The repository says otherwise, and the
  difference changes the task:**
  * `$0500-$06FF` / 512 B RAW is `bootSplashRuntime` — the **cassette sound,
    fade and skip CODE blob**, not the picture (`src/boot-splash.s`).
  * The **picture** is `assets/graphics/loader-bitmap.json` → 320x192 mixed
    ANTIC F/E, **7,680 B raw, already LZ-10/5 packed to 1,967 B**
    (`loaderScreen.packedBitmapBytes`), living at `loader_bitmap_lzss`
    **`$3833-$3FE2`, inside MAIN — that is, inside the initial block**.
  * A decoder **already runs at this boot point**: `unpack_loader_bitmap`
    (`src/main.s:3203`) calls the same bounded `broadside_unpack_command` the
    resident broadside block uses, immediately before `show_loader`.
  **So a simpler drawing DOES pay, today, with no new decoder** — a flatter,
  grooved silhouette compresses better under the packer already in the path, and
  every byte it saves is an **initial-block** byte. Fewer image lines saves as
  well, and the two compound rather than being independent. This also makes the
  silhouette work a **cheaper reclaim route than backlog item 1 above** (packing
  the blob and `A2_KERNEL` for ~77 B, which does need a decoder where none runs).
  **Unmeasured until a shape exists:** how much a given drawing actually packs
  to. Cost is a property of the art, so it is measured per preview, not
  estimated here.

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
  assertion (`bomber_hull_ramp_must_stay_inside_its_hue`) now proves it.

  > **Superseded 2026-09-23.** Hue 8 is gone: `$88` is the same byte as the
  > allied steel. The hue is now C (green), `HULL_COLOUR_BOMBER` `$C8`. See
  > "Bomber hull colour — green" in the checkpoint above. The ramp shape, the
  > charge/flash steps and the assertion are unchanged; only the hue moved.
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
