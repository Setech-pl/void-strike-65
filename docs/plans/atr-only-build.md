# Plan — the game ships as the ATR only; the XEX is removed as a product

**Session 2026-09-30.** Branch `feat/atr-only-build` from `main` `e39f2ec`
(`docs(status): roadmap 4.6 step 3 - level 2, an owner-smoke candidate`); the
only other worktree was a temporary detached `../dark-fighter-baseline` at
`main`, used to measure `main` and removed before the session ended. Every
figure is **MEASURED** on `main` `e39f2ec` or on this branch, as labelled,
unless it says ESTIMATE.

---

## 1. Owner decisions (2026-09-30)

0. **The XEX is not released; only the ATR ships.** The repository held no such
   decision before this session — `docs/plans/director-4.6.md` §11 item 7 still
   said "XEX campaign STILL OPEN". This decision closes that item.
1. **Sessions.** Every wall-trace session without a medium switches to the ATR.
   Where a session already has an ATR twin, the XEX half is deleted. XEX-only
   sessions are renamed `-xex-` → `-atr-`; the recorded-failure renames that
   follow are approved in advance by name (§5). After the switch: a renamed
   session that failed on the XEX and passes on the ATR is named as
   disappeared; one that passed on the XEX and fails on the ATR is a STOP.
   `integrityCollections >= 10` is never lowered — if the ATR sessions alone
   fall below 10 the count is restored with ATR runs (class (a): the scenario
   moves, not the clause). Node-side harness defaults move from `"xex"` to
   `"atr"`. A test that flips from recorded failure to pass is named as
   disappeared; one that flips from pass to fail is a STOP. XEX-vs-ATR parity
   tests and parity clauses are deleted with the XEX, each named.
2. **`dist/void-strike-65-0.1.1.zip` is deleted.** A release package is made at
   release time, from the ATR.
3. **Player-facing documents move to the ATR**: README and README.pl (the
   developer path launches `play:atr`), `docs/windows-quick-start.md`. The
   showcase images stay as they are and are not recaptured.
4. **Contract documents move to the ATR**: `AGENTS.md`,
   `docs/reguly-projektu.txt`, and every build/testing document.
5. **`boot_stage2_xex_entry` stays.** The ATR must stay byte-identical (§3).
6. **The stale trace emulator** gets a small fail-fast check with a test (§8).

---

## 2. The baseline — `main` `e39f2ec` reproduces its own evidence

The in-folder `build/atari800-trace` binary was built on **22 Sep**, but
`scripts/atari800-wall-trace.h` changed on 28 and 29 Sep (`035cedb`,
`800322b`). Run with that binary, `main`'s trace produced two unrecorded clause
failures (`weapon-pickup-contact-2-hunt-fire4`, `weapon-pickup-overlap-2-hunt-fire5`,
"changed GTIA priority…") and aborted with "Atari800 did not render a visible
Rapid Fire capsule". Rebuilt with `--prepare` from `main`'s header, the same
`main` reproduces its committed evidence exactly:

| Figure | committed | re-measured on `main` |
| --- | ---: | ---: |
| worst line-238 fence margin | 788 | **788** (`director-complete-2-natural-sweep-fire0`) |
| DMA-on maximum / physical headroom | 31,626 / 3,942 | **31,626 / 3,942** |
| behavioural clause failures | 40 | **40**, the same names |
| `determinism.replay_fingerprint_sha256` | `5fcb0680…` | identical |
| PAL audit | 0 distinct misses | **0 across 73 replays** (default 65 + 8 mode-gated) |
| `npm test` (default build) | 865 / 754 / 108 / 3 | **865 / 754 / 108 / 3**, exactly the 108 recorded names |

**Wall-clock of the full trace set on `main`**, M-series laptop: default pass
**1,098 s**, mode-gated passes 278 s (`--raider-formation-only` 11,
`--raider-sector-only` 16, `--debris-gate-only` 179, `--raider-remnant-only`
72), standalone audit included: **1,380 s**.

---

## 3. The ATR does not depend on the XEX

`makeAtr` (`scripts/build.mjs:2558` on `main`) takes the transport payload and
the level images; the XEX was assembled beside it by `makeXexSegments`
(`:2539`) from the same pieces. **No XEX step is an intermediate of the ATR**, so
nothing is kept "as an intermediate": the XEX assembly, its manifest fields and
its format helpers go.

`boot_stage2_xex_entry` is not a build step but **14 B of code inside the boot
image**: `$2338-$2345` (`src/main.s:12376`), segment `BOOT_STAGE2` (runs at
`$21C1`, 1,337 B), which rides **inside the initial block** right behind the
resident prefix. Nothing jumps to it once the XEX is gone. Removing it moves the
ATR, so it stays for a later reclaim task (owner decision 5). The ATR and the
boot image stay byte-identical to `main`: ATR `abe3b181…`, boot `9e5c5d6f…`.

---

## 4. Inventory

`file:line` is on `main` `e39f2ec`.

| Item | file:line | What it does | Proposal | Risk |
| --- | --- | --- | --- | --- |
| XEX assembly | `scripts/build.mjs:2515-2557` | `makeXexSegments` over the initial block, BROADSIDE, pickup, Director code, Light kernel, reader and the XEX-only level block; `INITAD` record | remove | none: the ATR is built from other inputs (§3) |
| manifest XEX fields | `scripts/build.mjs:2908-2909`, `:3008`, `:3034-3036`, `:3099`, `:3147`, `:3183-3188`, `:3941` | `xexEntryAddress/Offset`, `xexInitAd`, `xexBlocks`, `xexFile`, `xexStagingCompression`, XEX landing texts, `artifacts["void-strike-65.xex"]` | remove | the manifest changes (it is not under the byte-identity gate) |
| artifact write | `scripts/build.mjs:4051`, `:4065` | writes `dist/void-strike-65.xex` and prints its size | remove | none |
| format helpers | `scripts/formats.mjs:52-100` | `makeXex`, `makeXexSegments`, `parseXex` | remove | no consumer left |
| build validation | `scripts/formats.mjs:180`, `:373-513` | reads the XEX, checks its segments | remove the XEX checks; keep the carrier-independent ones (collision module in the pickup stream, Light kernel window meet, reader address, ATR level-1 run) | a check lost with the XEX — mitigated by keeping every non-XEX invariant |
| evidence binding | `scripts/runtime-evidence.mjs:6`, `:26-30`, `:53-57` | binds boot, XEX, ATR; `artifact` (compat) is the XEX | remove XEX; re-point `artifact` to the ATR | the binding changes shape: evidence must be regenerated |
| harness loader | `scripts/runtime-image.mjs:125-133` | installs the XEX segments into harness memory | remove; default artifact `"atr"` | harness results could differ by medium — measured, §6 |
| harness defaults | `scripts/weapon-pickup-runtime.mjs`, `debris-destruction-runtime.mjs`, `pairshot-stale-runtime.mjs`, `raider-projectile-persistence-runtime.mjs`, `player-fire-audio-trace.mjs`, `pairshot-proof.mjs` | `artifact = "xex"` | re-point to ATR | as above |
| parity helpers | `debris-destruction-runtime.mjs:1146-1162`, `weapon-pickup-runtime.mjs:2387`, `:2458` | XEX-vs-ATR equality | remove | none |
| previews | `scripts/preview.mjs:448-475`, `:3966-4700`, `:6250-6300`, `:6817-6840` | XEX/ATR parity previews and CSVs | re-point to ATR, drop the XEX rows | preview PNG labels change |
| showcase | `scripts/github-showcase.mjs:408-443`, `:521-534` | binds the XEX; `--capture` sources are XEX frames | re-point binding and capture sources to the ATR; committed images unchanged | none (images not recaptured) |
| launcher | `scripts/artifact-launch.mjs:9`, `:56`, `:64-70`, `:84-98`, `:107`; `package.json:38` | `play:xex` | remove | none |
| verify / clean / package | `scripts/verify-build.mjs:25`, `scripts/clean.mjs:25`, `scripts/package-release.mjs:26` | read or list the XEX | remove | none |
| `dist/` | `dist/void-strike-65.xex`, `dist/void-strike-65-0.1.1.zip` | the published XEX; a stale release zip frozen at `4062c13` carrying a 21,399-B XEX | delete both (owner decision 2) | none |
| wall trace — medium default | `scripts/runtime-wall-trace.mjs:1720`, `:3206` | a session without `medium` runs the XEX: **47 of the 65 default replays** | switch to the ATR | figures move — measured, §6 |
| wall trace — twins | `:392-393`, `:406`, `:503`, `:535`, `:541`, `:555` | XEX halves of early-enemy, memory-integrity, pickup-fence, engine, engine-restart, broadside-transient | delete | the integrity count halves — restored, §7 |
| wall trace — XEX-only | `:216-297`, `:418-429`, `:451`, `:535`, `:568-588` | pairshot, pairshot-stale, raider-remnant, raider-first-writer, player-pairshot-speed/-reentry, booster-admission, pmg-lab, two-pmg-raiders, raider-sector, capital-player XEX-1, pickup-fence XEX-1, broadside-transient XEX-1, lower-playfield | switch to the ATR, `-xex-` → `-atr-` | recorded failure renamed, §5 |
| parity clauses | `:6041-6059`, `:6103-6105`, `:6187-6201` | engine screenshot parity, restart parity, integrity state parity | delete | 12 recorded failures go with them |
| boot smoke | `:1791`, `:1895-1924`, `:2052-2261` | 8 sessions, 4 of them XEX; XEX RUNAD and resident-skip clauses | ATR only: 4 sessions | none for the ATR |
| menu raster | `:2509-2511` | 8 sessions, 4 of them XEX | ATR only: 4 sessions | none |
| boot deadline | `docs/boot-deadline-baseline.json:8-9` | `xex_loader_frames`, `xex_menu_frames` | remove | none |
| diagnostic scripts | `capacity-window-watch.mjs:224-228`, `capital-speed-clock-verify-native.mjs:225`, `gameplay-speed-tuning-native.mjs:161`, `master-pal-clock-native.mjs:146`, `booster-admission-diagnostic.mjs:9`, `:307`, `raider-first-writer-analysis.mjs:11`, `:224`, `player-pairshot-*-analysis.mjs` | read the XEX or `-xex-` CSVs | re-point to the ATR | not in any gate |
| `--level=N` / `level:play` | `scripts/build.mjs:187-230`, `:1906-1911` | review variant wrote an XEX and an ATR into `build/level-N-sM/` | ATR only (falls out of the build change) | none: the owner smokes the variant's ATR |

What stays on purpose: `boot_stage2_xex_entry` (§3); the frozen historical
measurements quoted in `docs/STATUS.md`, `docs/memory-map.md`, `docs/diagnostics/`
and `docs/history/`; `docs/project-overview.md`, a snapshot pinned to `c31b220`;
`docs/capital-player-collision-trace.json`, dated evidence of an earlier build
that no gate reads.

---

## 5. Sessions, and the recorded failures they carry

**Deleted, the ATR twin stays:** `early-enemy-xex-{0,1,2}-cold-hunt-fire4`,
`memory-integrity-xex-2-evasive-fire4`, `memory-integrity-xex-2-hunt-fire5`,
`engine-xex-{a5,5a}-{0,1,2}-{immediate,delayed}` (12),
`engine-restart-xex-a5`, `broadside-transient-xex-2-broadside-proof`,
`pickup-fence-xex-2-hunt`; boot smoke `xex-{a5,5a}[-basic]` (4); menu raster
`xex-{00,a5,5a,ff}` (4).

**Renamed `-xex-` → `-atr-`:** `pairshot-*`, `pairshot-stale-*`,
`raider-remnant-*`, `raider-first-writer-*`, `player-pairshot-speed-*`,
`player-pairshot-reentry-*` (3 each), `booster-admission-reentry-{1..5}`,
`two-pmg-raiders`, `raider-sector`, `lower-playfield`,
`lower-playfield-hostile-contact`, `capital-player-xex-1-*` (8),
`pickup-fence-xex-1-hunt`, `broadside-transient-xex-1-neutral`.
`pmg-lab-*` keeps its ids and switches medium.

**Switched to the ATR, ids unchanged:** every session with no medium — the ten
baseline replays, `targeted-2-sweep-fire4`, `cadence-{0,1,2}`, `flash`,
`debris-effects`, `weapon-pickup-2-hunt-fire4`, `weapon-pickup-spread-0`,
`director-complete-{0,1,2}`, the traversal, contact and overlap replays,
`capital-muzzle-ring`, `capital-contact-{allied,hostile}-medium` and the
debris-gate replays.

**Added:** `memory-integrity-atr-2-hunt-fire6` (§7).

Recorded clause failures (40 on `main`), mapped by name:

| Recorded on `main` | After the switch |
| --- | --- |
| `engine-xex-*` "first DLI did not select byte three of the active A2 list" (12) | **removed** with the 12 XEX engine sessions |
| `engine-xex-*` "screenshot sequence differs between XEX and ATR" (12) | **removed** with the parity clause |
| `lower-playfield-hostile-contact-xex-hard` "did not capture 16 consecutive contact rasters" | **renamed** `lower-playfield-hostile-contact-atr-hard`, same message (owner-approved) |
| `engine-atr-*` byte-three DLI (12), `capital-contact-{allied,hostile}-medium` (2), `weapon-pickup-2-hunt-fire4` booster release (1) | unchanged |

---

## 6. The ATR probe — every figure by artifact (diagnostic, not evidence)

**Before the switch**, on `main`: **55 of the 73 audited replays ran the XEX** —
every session without a medium, plus the `-xex-` ones — and **18 the ATR**
(early-enemy, memory-integrity and engine halves). Every binding figure came
from an XEX replay: the worst fence margin **788** from
`director-complete-2-natural-sweep-fire0` and the DMA-on maximum **31,626**
(headroom 3,942) from `director-complete-0-natural-sweep-fire0`. The two DLIs
per host frame, 0 sequence violations and the ATR menu frame 601 were already
ATR-side (the menu frame was always the ATR boot smoke's).

**The probe**: `main`'s own trace code with one throwaway change — every
session boots `dist/void-strike-65.atr` from D1: — run in the detached `main`
worktree over the same 73 replays (default pass, the four mode-gated passes,
the standalone audit). Nothing of it was committed.

- **0 distinct miss events across 73 replays**, 0 rows over the hard gate.
- **Every replay's worst fence margin and maximum wall cycles are identical on
  the ATR**, 73 of 73. The worst margin stays **788** and the DMA-on maximum
  **31,626** — each on the same replay, now ATR.
- Frame by frame, `events`, `frame` and `gameplay_frame` are identical on all
  73 replays. `wall_cycles` differs on **55 of 143,980 frames**, every one of
  them **lower** on the ATR, by at most **19 cycles** (`2-sweep-fire0` frame 0,
  26,989 → 26,970). None of those frames is a replay's worst.
- **Clause failures**: the same 40 minus the 12 "screenshot sequence differs
  between XEX and ATR" (both halves now ATR), i.e. 28 — every other recorded
  failure fails on the ATR with its own message, including
  `lower-playfield-hostile-contact-xex-hard`. No clause that passed on the XEX
  failed on the ATR.
- `raider-sector-xex-hard` aborts with "did not return to post-sector OPEN" on
  the ATR exactly as on the XEX (pre-existing, not a recorded clause — its mode
  is not part of the evidence run); `--raider-remnant-only` reports
  `passed: false` on both media alike.

| Figure | `main` (source replay, medium) | ATR probe |
| --- | --- | --- |
| worst line-238 fence margin | 788 (`director-complete-2`, XEX) | **788** (same replay, ATR) |
| DMA-on maximum / physical headroom | 31,626 / 3,942 (`director-complete-0`, XEX) | **31,626 / 3,942** |
| distinct miss events / rows over 32,568 | 0 / 0 | **0 / 0** |
| DLIs per host frame / sequence violations | 2 / 0 (ATR and XEX) | **2 / 0** |
| ATR menu frame | 601 (ATR) | 601 (boot smoke unchanged) |

Per replay:

| replay (id on `main`) | medium on `main` | worst fence margin, `main` → ATR probe | maximum wall cycles, `main` → ATR probe |
| --- | --- | ---: | ---: |
| `1-evasive-fire3` | XEX | 3,176 → 3,176 | 30,895 → 30,895 |
| `2-evasive-fire1` | XEX | 1,853 → 1,853 | 30,169 → 30,169 |
| `2-evasive-fire3` | XEX | 1,574 → 1,574 | 30,411 → 30,411 |
| `2-evasive-fire7` | XEX | 1,816 → 1,816 | 30,909 → 30,909 |
| `2-neutral-fire0` | XEX | 2,583 → 2,583 | 30,085 → 30,085 |
| `2-sweep-fire0` | XEX | 2,615 → 2,615 | 30,315 → 30,315 |
| `2-sweep-fire2` | XEX | 3,513 → 3,513 | 30,358 → 30,358 |
| `2-sweep-fire4` | XEX | 3,239 → 3,239 | 30,329 → 30,329 |
| `2-sweep-fire5` | XEX | 2,443 → 2,443 | 30,313 → 30,313 |
| `2-sweep-fire6` | XEX | 2,496 → 2,496 | 30,309 → 30,309 |
| `cadence-0-sweep-nofire` | XEX | 7,915 → 7,915 | 29,537 → 29,537 |
| `cadence-1-sweep-nofire` | XEX | 6,513 → 6,513 | 29,548 → 29,548 |
| `cadence-2-sweep-nofire` | XEX | 7,591 → 7,591 | 29,500 → 29,500 |
| `capital-contact-allied-medium` | XEX | 3,349 → 3,349 | 29,400 → 29,400 |
| `capital-contact-hostile-medium` | XEX | 4,775 → 4,775 | 29,327 → 29,327 |
| `capital-muzzle-ring-2-sweep-fire4` | XEX | 2,429 → 2,429 | 30,901 → 30,901 |
| `debris-effects-2-sweep-fire4` | XEX | 2,429 → 2,429 | 30,901 → 30,901 |
| `debris-gate-0-evasive-fire3` | XEX | 3,086 → 3,086 | 30,388 → 30,388 |
| `debris-gate-0-neutral-fire0` | XEX | 3,170 → 3,170 | 30,194 → 30,194 |
| `debris-gate-capital-muzzle-ring-2-sweep-fire4` | XEX | 2,429 → 2,429 | 30,901 → 30,901 |
| `director-complete-0-natural-sweep-fire0` | XEX | 2,059 → 2,059 | 31,626 → 31,626 |
| `director-complete-1-natural-sweep-fire0` | XEX | 2,613 → 2,613 | 30,835 → 30,835 |
| `director-complete-2-natural-sweep-fire0` | XEX | 788 → 788 | 31,121 → 31,121 |
| `early-enemy-atr-0-cold-hunt-fire4` | ATR | 4,029 → 4,029 | 30,478 → 30,478 |
| `early-enemy-atr-1-cold-hunt-fire4` | ATR | 2,718 → 2,718 | 30,490 → 30,490 |
| `early-enemy-atr-2-cold-hunt-fire4` | ATR | 3,313 → 3,313 | 30,344 → 30,344 |
| `early-enemy-xex-0-cold-hunt-fire4` | XEX | 4,029 → 4,029 | 30,478 → 30,478 |
| `early-enemy-xex-1-cold-hunt-fire4` | XEX | 2,718 → 2,718 | 30,490 → 30,490 |
| `early-enemy-xex-2-cold-hunt-fire4` | XEX | 3,313 → 3,313 | 30,344 → 30,344 |
| `engine-atr-5a-0-delayed` | ATR | 10,529 → 10,529 | 29,524 → 29,524 |
| `engine-atr-5a-0-immediate` | ATR | 10,529 → 10,529 | 29,524 → 29,524 |
| `engine-atr-5a-1-delayed` | ATR | 10,391 → 10,391 | 29,513 → 29,513 |
| `engine-atr-5a-1-immediate` | ATR | 10,391 → 10,391 | 29,513 → 29,513 |
| `engine-atr-5a-2-delayed` | ATR | 10,157 → 10,157 | 29,398 → 29,398 |
| `engine-atr-5a-2-immediate` | ATR | 10,157 → 10,157 | 29,398 → 29,398 |
| `engine-atr-a5-0-delayed` | ATR | 10,529 → 10,529 | 29,524 → 29,524 |
| `engine-atr-a5-0-immediate` | ATR | 10,529 → 10,529 | 29,524 → 29,524 |
| `engine-atr-a5-1-delayed` | ATR | 10,391 → 10,391 | 29,513 → 29,513 |
| `engine-atr-a5-1-immediate` | ATR | 10,391 → 10,391 | 29,513 → 29,513 |
| `engine-atr-a5-2-delayed` | ATR | 10,157 → 10,157 | 29,398 → 29,398 |
| `engine-atr-a5-2-immediate` | ATR | 10,157 → 10,157 | 29,398 → 29,398 |
| `engine-restart-atr-a5` | ATR | 3,307 → 3,307 | 29,409 → 29,409 |
| `engine-restart-xex-a5` | XEX | 3,307 → 3,307 | 29,409 → 29,409 |
| `engine-xex-5a-0-delayed` | XEX | 10,529 → 10,529 | 29,524 → 29,524 |
| `engine-xex-5a-0-immediate` | XEX | 10,529 → 10,529 | 29,524 → 29,524 |
| `engine-xex-5a-1-delayed` | XEX | 10,391 → 10,391 | 29,513 → 29,513 |
| `engine-xex-5a-1-immediate` | XEX | 10,391 → 10,391 | 29,513 → 29,513 |
| `engine-xex-5a-2-delayed` | XEX | 10,157 → 10,157 | 29,398 → 29,398 |
| `engine-xex-5a-2-immediate` | XEX | 10,157 → 10,157 | 29,398 → 29,398 |
| `engine-xex-a5-0-delayed` | XEX | 10,529 → 10,529 | 29,524 → 29,524 |
| `engine-xex-a5-0-immediate` | XEX | 10,529 → 10,529 | 29,524 → 29,524 |
| `engine-xex-a5-1-delayed` | XEX | 10,391 → 10,391 | 29,513 → 29,513 |
| `engine-xex-a5-1-immediate` | XEX | 10,391 → 10,391 | 29,513 → 29,513 |
| `engine-xex-a5-2-delayed` | XEX | 10,157 → 10,157 | 29,398 → 29,398 |
| `engine-xex-a5-2-immediate` | XEX | 10,157 → 10,157 | 29,398 → 29,398 |
| `flash-2-neutral-nofire` | XEX | 3,307 → 3,307 | 29,409 → 29,409 |
| `lower-playfield-hostile-contact-xex-hard` | XEX | 3,307 → 3,307 | 29,409 → 29,409 |
| `lower-playfield-xex-hard` | XEX | 4,729 → 4,729 | 29,378 → 29,378 |
| `memory-integrity-atr-2-evasive-fire4` | ATR | 4,540 → 4,540 | 30,287 → 30,287 |
| `memory-integrity-atr-2-hunt-fire5` | ATR | 3,845 → 3,845 | 30,371 → 30,371 |
| `memory-integrity-xex-2-evasive-fire4` | XEX | 4,540 → 4,540 | 30,287 → 30,287 |
| `memory-integrity-xex-2-hunt-fire5` | XEX | 3,845 → 3,845 | 30,371 → 30,371 |
| `raider-remnant-normal-xex-hard` | XEX | 2,331 → 2,331 | 30,344 → 30,344 |
| `raider-remnant-rapid-xex-hard` | XEX | 2,155 → 2,155 | 30,918 → 30,918 |
| `raider-remnant-spread-xex-hard` | XEX | 3,081 → 3,081 | 30,959 → 30,959 |
| `raider-sector-xex-hard` | XEX | 3,313 → 3,313 | 30,344 → 30,344 |
| `targeted-2-sweep-fire4` | XEX | 3,239 → 3,239 | 30,329 → 30,329 |
| `two-pmg-raiders-xex-hard` | XEX | 3,911 → 3,911 | 30,356 → 30,356 |
| `weapon-pickup-2-hunt-fire4` | XEX | 3,313 → 3,313 | 30,344 → 30,344 |
| `weapon-pickup-contact-2-hunt-fire4` | XEX | 3,313 → 3,313 | 30,344 → 30,344 |
| `weapon-pickup-overlap-2-hunt-fire5` | XEX | 3,845 → 3,845 | 30,369 → 30,369 |
| `weapon-pickup-spread-0-hunt-fire4` | XEX | 4,029 → 4,029 | 30,478 → 30,478 |
| `weapon-pickup-traversal-2-observe-fire8` | XEX | 3,180 → 3,180 | 30,092 → 30,092 |

---

## 7. `integrityCollections >= 10` — restored with an ATR replay

MEASURED on `main`'s CSVs: the four integrity replays collect `atr-evasive` 0,
`atr-hunt-fire5` **5**, `xex-evasive` 0, `xex-hunt-fire5` **5**. The XEX twin
was the other half of the count, so the ATR replays alone reach **5 < 10**.
The clause is not lowered. Candidate ATR replays, MEASURED on this branch
(4,000 frames each, collections / worst fence margin):

| replay | collections | worst margin |
| --- | ---: | ---: |
| difficulty 2 `hunt` fire 3 | 2 | 3,542 |
| difficulty 2 `hunt` fire 4 | 4 | 3,313 |
| **difficulty 2 `hunt` fire 6** | **6** | 2,409 |
| difficulty 2 `hunt` fire 7 | 5 | 2,873 |
| difficulty 1 `hunt` fire 5 | 5 | 3,043 |
| difficulty 0 `hunt` fire 5 | 5 | 4,994 |

**`memory-integrity-atr-2-hunt-fire6`** is added: the smallest change from the
kept replay (fire delay 5 → 6) that restores the count with slack, 5 + 6 = 11.
It is a distinct replay, not a repeat, and it does not arm the pause test. The
integrity set becomes three ATR replays, 12,000 frames.

The same shape turned up in one node-side test: "more than 5000 Raider kills
leave no dead-generation character cells" summed 2,500 kills on the XEX and
2,500 on the ATR. The ATR now runs the matrix's own default of 5,000; the
`>= 5000` assertion is unchanged.

---

## 8. The stale trace emulator — a fail-fast check

`scripts/atari800-trace-freshness.mjs` (20 lines) refuses to trace when the
prepared `src/voidstrike65_trace.h` in the emulator tree differs from
`scripts/atari800-wall-trace.h`, or when the binary is older than that copy,
and says "rerun with --prepare". `scripts/runtime-wall-trace.mjs` calls it
right after checking that the binary exists; `tests/atari800-trace-freshness.test.mjs`
covers the accepted, stale-header and stale-binary cases. It would have caught
the 22 Sep binary of §2 before the first session.

---

## 9. Tests

A test covering ATR behaviour is never deleted. Deleted, each a pure
XEX-vs-ATR comparison or an XEX-format check:

| file | test | recorded failure? | why |
| --- | --- | --- | --- |
| `tests/weapon-pickup-shield.test.mjs` | XEX and ATR Shield state are byte-for-byte deterministic for cold $A5 and $5A | no (passed) | pure XEX-vs-ATR parity test |
| `tests/raider-projectile-ownership.test.mjs` | XEX and ATR execute identical emitter-independent kills | no (passed) | pure XEX-vs-ATR parity test |
| `tests/pairshot-stale-cell.test.mjs` | XEX and ATR agree on the bounded stale-cell matrix | no (passed) | pure XEX-vs-ATR parity test |
| `tests/formats.test.mjs` | XEX contains a payload segment and RUNAD | no (passed) | tested only the XEX segment layout; its three manifest-level window assertions moved into "the code window is declared, guarded and addressable by the build" |

Renamed with the XEX half removed (the recorded ones keep their status under
the new name):

| file | old name | new name | recorded failure? | what changed |
| --- | --- | --- | --- | --- |
| `tests/artifact-launch.test.mjs` | XEX uses the executable loader while ATR is mounted as D1 | the ATR is mounted as D1 and is the only public launch | no | XEX half deleted |
| `tests/artifact-launch.test.mjs` | the SELF TEST-producing ATR-as-XEX invocation is rejected | the SELF TEST-producing ATR-as-executable invocation is rejected | no | wording |
| `tests/weapon-pickup-rapid-fire.test.mjs` | release XEX and ATR execute 0→1→2→pending only for consumed PlayerFighter kills | the release ATR executes 0→1→2→pending only for consumed PlayerFighter kills | yes | XEX half and parity assertion deleted |
| `tests/weapon-pickup-rapid-fire.test.mjs` | packed XEX and ATR keep every implemented PlayerFighter lifecycle path yellow under cold RAM | the packed ATR keeps every implemented PlayerFighter lifecycle path yellow under cold RAM | yes | XEX half and parity assertion deleted |
| `tests/weapon-pickup-spread-shot.test.mjs` | release XEX and ATR execute the deterministic Rapid Spread Shield drop cycle | the release ATR executes the deterministic Rapid Spread Shield drop cycle | yes | XEX half and parity assertion deleted |
| `tests/entity-effects.test.mjs` | $A5 and $5A cold RAM are fully and identically initialised for XEX and ATR | $A5 and $5A cold RAM are fully initialised for the ATR | no | XEX half and parity assertion deleted |
| `tests/entity-effects.test.mjs` | Interceptor contact result is byte-identical after XEX and ATR cold boot | Interceptor contact result is exact after an ATR cold boot | yes | XEX half and parity assertion deleted |
| `tests/entity-effects.test.mjs` | executed XEX and ATR traces preserve the five-slot generic debris split | executed ATR traces preserve the five-slot generic debris split | no | XEX half and parity assertion deleted |
| `tests/entity-effects.test.mjs` | executed Raider destruction is character-free and XEX/ATR exact | executed Raider destruction is character-free and ATR exact | no | XEX half and parity assertion deleted |
| `tests/gameplay-music-placement.test.mjs` | the XEX publishes the linked block into the level buffer, ready to run | the level image puts the linked block into the level buffer, ready to run | no | XEX carrier gone; the ATR level image is placed as the reader leaves it |
| `tests/layout-d1.test.mjs` | XEX and ATR preserve full A2, GLUE lifecycle, ENTITY_CODE, DIRECTOR and guard | the ATR preserves full A2, GLUE lifecycle, ENTITY_CODE, DIRECTOR and guard | no | XEX half deleted |
| `tests/capital-hull-extension.test.mjs` | final XEX and ATR publish the exact seeded hull layout bytes | the final ATR publishes the exact seeded hull layout bytes | no | XEX half deleted |
| `tests/loader-screen.test.mjs` | packed XEX footer uses distinct bold glyphs made of full ANTIC E pixels | packed loader footer uses distinct bold glyphs made of full ANTIC E pixels | no | wording |
| `tests/loader-screen.test.mjs` | XEX and ATR use the current packed bitmap source | the ATR uses the current packed bitmap source | no | wording |
| `tests/preview.test.mjs` | destructible debris owner preview is an XEX/ATR-executed eight-frame breakup | destructible debris owner preview is an ATR-executed eight-frame breakup | yes | XEX rows deleted |
| `tests/preview.test.mjs` | Interceptor owner preview is the XEX/ATR-executed eight-frame local breakup | Interceptor owner preview is the ATR-executed eight-frame local breakup | yes | XEX rows deleted |
| `tests/preview.test.mjs` | Rapid Fire owner preview executes the packed XEX/ATR pickup lifecycle | Rapid Fire owner preview executes the packed ATR pickup lifecycle | yes | XEX rows deleted |
| `tests/preview.test.mjs` | projectile colour owner previews use identical packed XEX and ATR runtime frames | projectile colour owner preview uses the packed ATR runtime frames | no | XEX half and parity assertion deleted |
| `tests/preview.test.mjs` | burst-balance owner previews compare identical 80-frame XEX and ATR executions | burst-balance owner preview is a deterministic 80-frame ATR execution | yes | XEX half and parity assertion deleted |
| `tests/preview.test.mjs` | Spread Shot owner preview is deterministic executed XEX/ATR gameplay | Spread Shot owner preview is deterministic executed ATR gameplay | yes | XEX rows deleted |
| `tests/preview.test.mjs` | Spread Shot hull owner sequences execute identical XEX and ATR backing paths | Spread Shot hull owner sequences execute the ATR backing paths | no | XEX half and parity assertion deleted |
| `tests/runtime-wall-trace.test.mjs` | real Atari800 XEX/ATR cold boots reach visible gameplay inside the boot horizon | real Atari800 ATR cold boots reach visible gameplay inside the boot horizon | no | XEX boot-smoke sessions deleted |
| `tests/runtime-wall-trace.test.mjs` | wall trace covers legal short replays and 160-second XEX/ATR integrity runs | wall trace covers legal short replays and long ATR integrity runs | no | XEX integrity sessions deleted; ATR restoration replay added |
| `tests/runtime-wall-trace.test.mjs` | real XEX/ATR startup traces keep one atomic two-phase engine pulse | real ATR startup traces keep one atomic two-phase engine pulse | yes | XEX engine sessions and parity deleted |
| `tests/runtime-wall-trace.test.mjs` | XEX and ATR legal hunt traces have identical maxima and a reproducible fingerprint | the ATR legal hunt traces stay legal and have a reproducible fingerprint | no | XEX half and parity assertion deleted |
| `tests/runtime-evidence.test.mjs` | final evidence binds boot BIN, XEX and ATR exactly | final evidence binds boot BIN and ATR exactly | no | XEX binding deleted |
| `tests/runtime-evidence.test.mjs` | final evidence rejects partial traces and a stale compatibility XEX hash | final evidence rejects partial traces and a stale compatibility ATR hash | no | compatibility binding re-pointed to the ATR |
| `tests/menu-raster.test.mjs` | native menu raster is exact for XEX/ATR and four cold RAM fills | native menu raster is exact for the ATR and four cold RAM fills | yes | XEX sessions deleted |

The node-side helpers that only read the build's runtime segments
(`readXexBytes`, `xexBytes`, `xexBytesAt`) never touched the XEX; they are
renamed `readImageBytes` / `imageBytes` / `imageBytesAt`.

---

## 10. Documentation

Changed: `AGENTS.md` (distribution, definition of done, session-end report,
boot validation), `docs/reguly-projektu.txt`, `docs/agent-workflows/*`,
`docs/plan-realizacji.md` (platform line), `docs/hardware-testing.md`,
`docs/architecture.md`, `docs/hybrid-c-architecture.md`, `docs/memory-map.md`
(current-state rows; dated history untouched), `docs/plans/director-4.6.md`
§11 item 7, `docs/STATUS.md`; player-facing `README.md`, `README.pl.md` and
`docs/windows-quick-start.md` (English only, as before this session).

---

## 11. Follow-ups, not in this task

- Reclaim `boot_stage2_xex_entry` (14 B in the initial block). It moves the
  ATR, so it needs its own gate pass and owner smoke.
- `docs/capital-player-collision-trace.json` still names the XEX sessions of an
  earlier build; regenerate it the next time `--capital-player-collision-only`
  runs.
- Recapture the showcase gameplay images from the ATR if the owner wants their
  provenance to read ATR.
