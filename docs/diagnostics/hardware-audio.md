# Hardware audio — channels 3 and 4 are silent on a real POKEY (2026-10-10)

`fix/hardware-audio`, Phase A: diagnosis and probe builds only. No committed
`src/` or `dist/` change. Raised by the owner's real-hardware smoke of
2026-10-10 on ATR `b99fb418…` (Atari 65XE PAL, SIO2SD, monitor speaker):

- the game boots and plays fully (menu, loading, play, capital, boss entry);
- **menu:** only the percussion of the menu music is heard; the melody is
  silent;
- **play:** the gameplay music is heard, but no sound effects (shots,
  explosions);
- Atari800 plays every voice and effect, with and without its SIO patch;
- other games sound normal on the same machine.

**Status: DIAGNOSIS — OWNER HARDWARE TEST NEEDED.**

Unless marked ESTIMATE, figures are MEASURED in Atari800 7.1.2 on the 64 KB
machine (`-xl -pal`) or read from the source and the XL OS ROM (`ATARIXL.ROM`,
`BB01R2`, the one in `build/atari800-pinned.cfg`). Atari800 does not model the
effect diagnosed here (§3), so whether a channel is audible on hardware is a
PREDICTION until the owner's test.

---

## 0. Step 0 record

| Item | Value |
| --- | --- |
| `main` at branch cut | `88626d0`, clean; it contains `fix/hardware-boot` (`d8cb4e5`, `f822763`, `88626d0`) |
| worktrees | one, the primary checkout |
| `dist/void-strike-65.atr` | `b99fb418de94db1b0ad5b5b4468ba767fb96e8d9f00c74ad8371120b7cf0dae3` |
| `dist/void-strike-65-boot.bin` | `ce3d4adf5a0546ff2e46f46e8f1d57bc5ef832077383faef23e85fd3ce71bd10` |
| branch | `fix/hardware-audio` |

---

## 1. Root cause

**SKCTL holds `$13` from the first OS disk read until power-off. Bit 4 of
`$13` is POKEY's asynchronous receive mode, which on a real POKEY holds timers
3 and 4 in reset while no start bit arrives. So channels 3 and 4 make no sound
in any mode except volume-only.** Atari800 does not model the hold, so it plays
them.

From the Altirra Hardware Reference Manual (2026-01-02 edition, ch. 5,
"Asynchronous receive mode"):

> Since asynchronous mode holds timers 3 and 4 in reset while waiting for a
> start bit, those timers are stopped entirely when no data is being received.
> This means that leaving async mode enabled effectively disables channels 3+4
> for all audio except volume-only mode. Therefore, bit 4 of SKCTL should be
> cleared before attempting to use those channels for audio.

Its footnote 25 reads the Atari Hardware Manual's (II.26) "the start bit resets
channels 3+4" the same way. Atari BASIC's `SOUND` statement writes `SKCTL = $03`
and `AUDCTL = $00` before it plays, for the same reason.

Where `$13` comes from:

1. **The OS.** SIO's receive enable at `$EC40` in the XL OS is `LDA #$07 / AND
   SSKCTL / ORA #$10 / STA SSKCTL / STA SKCTL / STA SKRES`, followed by `LDA
   #$28 / STA AUDCTL`. With the OS's power-on `SSKCTL = $03` (`$E966`-`$E96D`) this
   leaves `$13` after every read (`STA SKCTL` at `$EC4A`, `STA AUDCTL` at `$EC5D`). The OS never sets it back. Stage 2 reads 106
   sectors through `SIOV`, and the takeover at `start`
   (`src/main.s:1252`) clears `AUDCTL` but never touches SKCTL.
2. **The game's own reader.** `sector_reader_quiesce`
   (`src/hybrid/sector-reader.s:1102-1110`) ends every load with
   `SKCTL_REST = $13` (`:113`). Every exit of the reader goes through it,
   including the failure paths (`:599`, `:625`, `:394`) and the summary's save
   write (`src/hybrid/level-summary.s:724`, `:728`). So START GAME, the boss
   entry, the summary and every later return to the menu all leave `$13`.

No code in the game writes any other SKCTL value at rest. The comment at
`src/boot-splash.s:343` ("SKCTL keeps the OS's $03") is wrong once the OS has
read a sector.

**MEASURED** (`scripts/sio-boot-repro.mjs`, real SIO `-nopatch`, the STOP
line's last SKCTL / AUDCTL written; P0 is `main` plus a title label):

| Run | Stop | SKCTL | AUDCTL |
| --- | --- | --- | --- |
| P0, boot to the menu, BASIC off / on | `enter_main_menu` f1351 / f1342 | **`$13`** | `$00` |
| P0, START GAME, BASIC off | `main_loop` f1704 (level read from f1487) | **`$13`** | `$00` |
| P0, boot to the menu, SIO patch **on** | `enter_main_menu` | `$03` | `$00` |

With the SIO patch on, the OS's SIO code never runs, so the menu even has
`$03` in Atari800. After any read by the game's own reader the value is `$13`
regardless of the patch. In either case Atari800 does not hold the timers
(`build/atari800-trace/src/pokey.c`: SKCTL bits 0-1 gate only `RANDOM`; bits
4-6 drive the serial port alone).

---

## 2. Register inventory and state per phase

### 2.1 Every write, by file

| Register | Writes (file:line) |
| --- | --- |
| `SKCTL` | sector reader: `$23` transmit `sector-reader.s:732`; `$00` reset `:1053` (setup) and `:1084` (settle); `$33` receive `:1070`; **`$13` rest `:1107`** (quiesce). Summary save write: `$23` `level-summary.s:702`, then quiesce. OS: `$03` init `$E96D`; **`$13` receive enable `$EC4A`**; cassette two-tone `$EC34`; `$00` then `SSKCTL` `$EDA4`/`$EDAA` (outside the disk path). Nothing else in `src/`. |
| `SKRES` | `sector-reader.s:823`, `:1075`; OS `$EC4D`. |
| `AUDCTL` | `$00`: `start` `main.s:1252`; `silence_audio` `main.s:7281`; `pause_silence_audio` `:2989`; `play_capital_explosion_sound` `:9034` and `resume_gameplay_audio` `:3029` (constant `CAPITAL_EXPLOSION_SOUND_AUDCTL = 0`); level end `sector-reader.s:291`; quiesce `:1105`. `$28`: reader setup `sector-reader.s:1055`; OS `$EC5D` (during SIO). |
| `AUDF1`/`AUDC1` | menu music `main.s:6293`, `:6301`, `:6303` (indexed by channel, 1-4); gameplay music `gameplay-music.s:120`, `:122`; splash deck `boot-splash.s:148`, `:214`, `:217`, `:221`; `silence_audio` / `pause_silence_audio` / `music_stop_gameplay` `main.s:7273-7274`, `:2981-2982`, `:3052-3053`. |
| `AUDF2`/`AUDC2` | menu music (as above); gameplay music `gameplay-music.s:132`, `:134`; hit / kill SFX `main.s:7167`, `:7169`, `:7208-7213`, `:3014-3016`; silencers as above, `:3056-3057`. |
| `AUDF3`/`AUDC3` | menu music (as above); engine bed `main.s:2679`, `:2681`, `:2996-2998`; boss bed and tick `boss.s:780-782`, `:796-798`, `:2365-2367`, `:2533-2535`, `:3024-3026`; reader clock at volume 0 `sector-reader.s:1056`, `:1061`; level end `:289`; silencers. |
| `AUDF4`/`AUDC4` | menu music (as above); shot `main.s:4415`, `:4417`, `:7189-7202`, `:3002-3004`; capital-hull explosion `main.s:7221-7230`, `:3024-3026`; reader clock `sector-reader.s:1058`, `:1062`; level end `:290`; silencers. |

### 2.2 State in force, and what each channel carries

All voices run on the 64 kHz base clock (`AUDCTL = $00`); none uses volume-only
mode, high-pass filters, joined channels or 1.79 MHz.

| Phase | SKCTL | AUDCTL | ch1 | ch2 | ch3 | ch4 | Predicted on real POKEY |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Splash / loader (`boot-splash.s`) | `$13` (OS) | `$00` | the deck, pure `$A_` | — | — | — | heard |
| **Menu** (`music_tick`, `main.s:6173`) | **`$13`** | `$00` | bass, buzz `$C_` / pure `$A_` | drums: kick buzz `$C_`, snare and hat noise `$8_` | **lead melody, pure `$A_`** | **chord arpeggio, pure `$A_`** | ch1 and ch2 heard; **ch3 and ch4 silent** |
| START GAME load (reader) | `$00`/`$23`/`$33` → **`$13`** | `$28` → `$00` | — | — | clock, vol 0 | clock, vol 0 | — |
| **Play** | **`$13`** | `$00` | music bass, pure | music lead, pure; **hit / kill noise `$88`** | **engine bed `$22`** | **shot `$A8`; capital-hull explosion (table)** | music and the kill noise heard; **shots, engine, capital explosion silent** |
| Boss entry load, boss fight | **`$13`** | `$00` | boss theme | boss theme; kill noise | **boss bed, hit tick** | (shot) | theme heard; **bed, ticks, shots silent** |
| Level summary (incl. save write) | **`$13`** | `$00` | music | music | off (`sector-reader.s:289`) | off | heard |
| Back in the menu after a game | **`$13`** (reader) | `$00` | as menu | as menu | **lead** | **arp** | as the menu |

The owner reported "only the percussion" in the menu. The table predicts the
ch1 bass is heard as well. It is a low buzz root on the same beat as the
kick, so on a monitor speaker it can pass as part of the drums. P4 (§5)
separates the two. In play the table predicts the **enemy-kill / player-hit
noise on channel 2** is still heard. If the owner hears no kill noise either,
there is a second fault, and P4/P5 and P1 will show it.

---

## 3. Ranked candidates

| # | Candidate | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | **SKCTL bit 4 (async receive) left set: timers 3+4 held in reset** | **Explains every symptom.** | MEASURED `$13` at the menu and in play; the silent voices are exactly the ch3/ch4 ones in both phases; AHRM ch. 5; Atari800 does not model it. |
| 2 | SKCTL bits 0-1 = `00` (initialisation mode) | Ruled out | No rest state is `$00` (MEASURED `$13`); every reader exit runs quiesce after settle. Init mode would also freeze the 64 kHz clock for ch1/ch2, which are heard. |
| 3 | `AUDCTL` left by the OS or the reader (`$28`: ch3 at 1.79 MHz, ch3+4 joined) | Ruled out | MEASURED `$00` at the menu and in play (`start` and quiesce clear it). Atari800 models `AUDCTL` faithfully, so it cannot split emulator from hardware. |
| 4 | SKCTL two-tone (bit 3) or other serial bits | Ruled out | `$13` has bit 3 clear; only bit 4 is the problem. |
| 5 | AUDC values (volume-only, distortions, tiny AUDF at 1.79 MHz) | Ruled out | No voice uses volume-only or 1.79 MHz. The distortions in use (`$A`, `$C`, `$8`, `$2`) sound on ch1/ch2. |
| 6 | Write order or timing between phases | Ruled out | Every voice is republished every frame. The split follows the channel number, not the player or the phase. |

---

## 4. Accurate emulator

Not available here: no Wine, CrossOver or Altirra on this Mac. Installing Wine
would have touched the system outside the repository, so I did not try.
Altirra models the hold (the manual quoted in §1 is its author's), so
`build/play/audiop0.atr` under Altirra should reproduce the owner's symptom and
`audiop1.atr` should not. The owner can check this on a Windows host if one
is to hand.

---

## 5. Probes for the owner's real-hardware test

Each probe is `main` with one change, built by
`node scripts/build.mjs --audio-probe=Pn` (`scripts/audio-probe.mjs`). The
edits are applied in memory while the build reads its sources, so `src/`,
`assets/` and `dist/` are untouched (the default build is still `b99fb418…`).
Every probe replaces the menu title with **`AUDIO PROBE Pn`** (14 characters,
the same as `VOID STRIKE 65`, so no layout moves). Copies are in `build/play/`.

| Probe | File | SHA-256 | What changes | MEASURED SKCTL menu / play |
| --- | --- | --- | --- | --- |
| P0 | `audiop0.atr` | `276b987a…` | nothing (reference) | `$13` / `$13` |
| P1 | `audiop1.atr` | `69f64582…` | SKCTL `$03` once before the menu **and** the reader's rest value `$13` → `$03` (the expected fix) | `$03` / `$03` |
| P2 | `audiop2.atr` | `7db6dcc0…` | SKCTL `$03` once before the menu only | `$03` / `$13` |
| P3 | `audiop3.atr` | `d3116d6c…` | the reader's rest value `$03` only | `$13` / `$03` |
| P4 | `audiop4.atr` | `7e11d745…` | the menu music becomes a **channel test**; SKCTL as today | `$13` / `$13` |
| P5 | `audiop5.atr` | `d14c5222…` | the channel test with P1's two writes | `$03` / `$03` |

Full hashes: P0 `276b987a0415dbce0cceeaf33c8ec062ec956adb2a0bf10b72d006d96a6a29a1`,
P1 `69f64582917a4d480a40d9815d1c924c12b9b83f2d577f9ba310710ed4e4beca`,
P2 `7db6dcc0e439fe49d7380d26b93bd91692ab120463df93770a9796ed092d70a0`,
P3 `d3116d6c8aa0cfa487f786090a9ed2a8e1914bd92ce191cffec55731eb1dc7de`,
P4 `7e11d74551bab239d5167c156bec68b8c229f911cd1ac4e99276e991162abd0c`,
P5 `d14c5222f3a35248bb061b12674cf4967e83a412c4689f08a87505cf8540f705`.

All six boot to the menu and to `main_loop` under real SIO, BASIC off and on.
Boot frames are unchanged: P0-P3 reach the menu at f1351 and START GAME at
f1704. P4 and P5 are 4 frames earlier, because their menu theme packs one
boot sector smaller (106 against 107).

**The channel test (P4, P5).** The menu's eight bars each play one pure tone
(`LEAD` envelope, 64 kHz, `AUDCTL $00`) on one channel, in turn: **ch1 C4 →
ch2 E4 → ch3 G4 → ch4 C5**, a rising four-step climb, twice per loop. Each step
lasts about 1.7 s, then a 0.24-s gap, and the whole loop runs about 15.4 s. A
silent channel is a missing step in the climb.

### What to listen for

| Probe | Menu (first visit, after boot) | Play | Menu after a game (quit or GAME OVER) |
| --- | --- | --- | --- |
| P0 | drums and bass only, no melody (the reported fault) | music and the enemy-kill noise; **no shot, engine or capital-explosion sound** | as the first visit |
| **P1** | **full music: bass, drums, melody, arpeggio** | **shots, engine hum, capital-hull explosion**, the boss's hit ticks | full music |
| P2 | full music | **SFX silent again** (the START GAME load sets `$13`) | melody gone again |
| P3 | drums and bass only | **SFX heard** | **full music** |
| P4 | **two steps (C4, E4), then about 4 s of silence**, repeating | as P0 | as the first visit |
| P5 | **all four steps** | as P1 | all four steps |

P2 and P3 split the two sources of `$13`. P4 and P5 identify the channels
without relying on the music. If P1 sounds right, the diagnosis holds and
Phase B is the fix in §6.

### Launch notes (SIO2SD)

Copy each ATR to the SD card **under its own new name**, for example
`AUDIOP0.ATR` … `AUDIOP5.ATR`, so the SIO2SD never serves a cached older image.
Mount it as D1:, then power-cycle (OPTION held or not, either way). The menu
title names the probe that is running. The boot takes about 27-36 s to the
menu as before (hardware-testing §23). Suggested order: **P0, P1, P4, P5, then
P2 and P3**. P0 and P1 settle the question. The others confirm it and pin the
channel split.

In Atari800 every probe sounds the same as P1, because the emulator does not
hold the timers (`npm run play:atr` plays `dist/`; for a probe,
`atari800 -xl -pal -nopatch -nobasic "$PWD/build/play/audiop1.atr"`).

---

## 6. Expected fix (Phase B, after the owner's results)

| Change | Where | Bytes |
| --- | --- | --- |
| F1: `SKCTL_REST` `$13` → `$03` | `src/hybrid/sector-reader.s:113` | **0** (an operand). Every reader operation writes its own SKCTL (`$00`/`$23`/`$33`) before it uses the port, so the rest value is free; `$03` keeps keyboard scan and debounce. |
| F2: `lda #$03 / sta SKCTL` once after the OS's last `SIOV`, before the menu | the frontend initialisation before `jsr silence_audio` (`src/main.s:11625`), segment `ENTITY_CODE` | **+5 B** MEASURED on P1: `ENTITY_CODE` 3,156 → 3,161 (tail 10 → 5); initial block content 13,629 → 13,634 (envelope 67 → 62; **34 → 29 B to its STOP limit**); boot / chunks / total sectors 107 / 106 / 213 unchanged; boot frames unchanged. |

`start` cannot hold F2: its takeover prefix has 2 spare bytes (MEASURED, the
`.res` at `src/main.s:1588` goes negative with the 5 B there). A 3-B form (`sta SKCTL` after an
`lda #$03` already on the path) would save 2 B, but there is none in the
frontend initialisation. Phase B may look elsewhere. F1 alone fixes play, the
boss and the menu after a game. F2 alone fixes the first menu.

Phase B will also need:

- the comments at `src/boot-splash.s:343` and `src/hybrid/sector-reader.s:499`,
  `:881-883` corrected;
- a regression test, since Atari800 cannot hear the fault: `tests/hardware-boot.test.mjs`'s
  `--start-game` run asserts SKCTL bit 4 clear at `enter_main_menu` and
  `main_loop` (the STOP line now carries SKCTL);
- `npm run boot:smoke` on the default build, because F2 adds 5 B to the initial
  block and the ATR menu deadline has had no slack before;
- the runtime evidence regenerated (`build:candidate` → `runtime:wall-trace` →
  `build`).

---

## 7. Tools added

- `scripts/audio-probe.mjs` and `scripts/build.mjs --audio-probe=P0..P5`: the
  probes above, as a review variant (`build/audio-probe-Pn/`, never `dist/`,
  no runtime measurement, no gate).
- `scripts/atari800-sio-diag.h`: the STOP line carries the last SKCTL and
  AUDCTL written.
- `scripts/sio-boot-repro.mjs`: `--labels=<directory>` for a variant's labels,
  `--stop=frames` to run the whole frame budget (for a screenshot of the menu),
  and the SKCTL / AUDCTL of each stop in the console line and the report.
