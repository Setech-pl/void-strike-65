# Main-menu twinkling stars — resident space costing (BLOCKED)

Date: 2026-09-22. Branch `feat/menu-stars`, from `main` at `1fa7e7e`.
Status: `BLOCKED_RESIDENT_SPACE`. No production source was changed; the
worktree is clean and `dist/void-strike-65.xex` is still
`9d401b21d5404eaedf2fdc5e8773394d2460958ec0dcf99d3616c19e58ce3906`.

The design below is complete and buildable in every respect except that the
bytes it needs do not exist in any reservation this task is allowed to use.
It is recorded so the owner's decision has a costing to point at and so a later
session does not re-derive it.

---

## 1. The design that was costed

Mockup "A", full owner spec: 46 stars, 60 % white / 40 % steel `$84`, one third
twinkling on a 12-frame `bright -> dim -> off -> dim -> bright` cycle with
per-star phase, fixed positions from a build-time seed.

### Display list — the seven lines that would change

`main_menu_display_list` (src/main.s:7042) currently spends 51 bytes and 216
scanlines. Seven `$70` blank lines become `$44` ANTIC 4 LMS rows. A blank-8 line
and an ANTIC 4 row are both 8 scanlines, so **the scanline total does not move**;
only the DL grows, by 2 bytes per converted line.

| DL line (current) | Becomes | Star row | Clearance kept |
| --- | --- | --- | --- |
| 1st `$70` (above title) | `$44 SCREEN+340` | full width, cols 0-39 | — |
| 2nd `$70` (above title) | `$44 SCREEN+380` | full width, cols 0-39 | 3rd `$70` stays blank, above the title |
| 2nd of the four `$70` after EXIT | `$44 SCREEN+420` | full width | 1st stays blank, under EXIT |
| 3rd of those four | `$44 SCREEN+460` | full width | |
| 4th of those four | `$44 SCREEN+500` | full width | |
| 2nd `$70` after the hint | `$44 SCREEN+540` | full width | 1st stays blank, under the hint |
| 3rd `$70` after the hint | `$44 SCREEN+580` | full width | 4th stays blank |

Five rows that already exist carry the side stars and need **no** DL change:
`SCREEN+20` and `SCREEN+140` (the blue bars, bar at cols 7-32) and `SCREEN+60` /
`SCREEN+100` (the fighter, cols 18-20) at cols 0-5 and 34-39; and the existing
blank `$C4` DLI row `SCREEN+260` at cols 0-5 and 32-39 (the hint below it runs
cols 7-30). Every allowed cell keeps at least one empty character cell from
text, bar and fighter.

Screen RAM: the seven new rows are `SCREEN+340..+619` = `$4154-$426B`, inside the
frontend's own `$4050-$43FF` and already covered by `clear_screen`
(`$4000-$43FF`, src/main.s:3529) — which is what makes "Options and back
restores the stars" free: `render_frontend_state` redraws the menu scene on
every entry.

### Glyphs

Frontend charset codes **64-127 are free** (MEASURED: `fontRowsHex` fills 1-43,
`extendedGlyphsHex` is exactly 16 glyphs at base 48, so 48-63 ends the used
range; `copy_frontend_charset` clears all 1 KB first). ANTIC 4 takes codes
0-127, so eight codes 64-71 carry four one-pixel dot positions x two tones:
64-67 = bit pair `01` = `COLPF0` `$0E` white, 68-71 = bit pair `11` = `COLPF2`
`$84` steel. Dim glyph = bright glyph `| $04`.

### The one compromise in the look

`set_frontend_standard_palette` fixes the whole menu to four playfield colours —
`$0E` white, `$1E` amber (title), `$84` steel, `KAWASAKI_GREEN` (active option) —
and the brief rules out a new DLI, so there is no fifth register for a "dim
white". The twinkling third is therefore drawn from the **white** stars and its
dim step is the menu's own steel `$84` (luminance 4 against luminance 14), with
`off` as the blank glyph. Steel stars are all steady. Overall tone mix is
unaffected: 60 / 40 still holds across all 46.

---

## 2. MEASURED cost

| Item | Bytes | Where it must live |
| --- | ---: | --- |
| Star table, 46 x {lo, hi, attr} | 138 | loadable data |
| Twinkle cycle table (12) + shape build table (12) | 24 | loadable data |
| `menu_star_tick` | 78 | loadable code |
| `draw_menu_stars` | 31 | loadable code |
| star-glyph build, appended to `copy_frontend_charset` | 20 | loadable code |
| display list, 7 x 2 | 14 | `RODATA` (MAIN) |
| `jsr menu_star_tick` in the frontend loop | 3 | `CODE` (MAIN) |
| `menu_star_frame` | 1 | BSS |
| **Total loadable** | **308** | |

`attr` packs shape (bits 0-1), tone (bit 2), twinkle (bit 3) and phase
(bits 4-7) into one byte, so 3 bytes per star is already the packed form; the
tick reaches the cell through `dst_ptr`, which nothing in the frontend loop
(`music_tick` included — it owns `$A2-$AB`) holds across a frame.

Cycles per menu frame, ESTIMATE from the instruction sequence: the tick walks
all 46 records, ~14 cycles for a steady record and ~60 for a twinkling one, so
**≈ 1,400 cycles/frame** — 4 % of the 35,568-cycle PAL frame, 15 stores.
It runs after `music_tick` and `set_frontend_standard_palette`, i.e. after
`wait_frame` leaves VCOUNT `$70` (scanline 226), past the 216-line menu display,
so no cell is written while ANTIC is fetching it. Gameplay is not touched, so
the worst fence margin (1,985) does not move.

## 3. Why it is blocked — MEASURED free space

From `build/void-strike-65.map` at `1fa7e7e`:

| Window | Free | Note |
| --- | ---: | --- |
| `MAIN` `$2000-$3FFF` (`CODE`+`RODATA`) | **0** | `RODATA` ends at `$3FFF` exactly. Probed: a 320-byte `.res` overflows MAIN by exactly 320 |
| `LOADER_SPLASH_CODE_SLACK` (src/main.s:3154) | 56 | inside MAIN; its own comment says "delete it deliberately, with a re-measured cycle baseline, when something needs the bytes" |
| `PICKUP_CODE` `$8B0E-$8B66` | 89 | window ends at the `$8B67` collision module; guarded by `.assert __PICKUP_CODE_RAM_LAST__ <= $8B67` |
| `A2_KERNEL` tail `$90ED-$90FF` | 19 | |
| Light/Heavy extension tail `$8FF0-$8FFF` | 16 | |
| `ENTITY_CODE` tail `$9D59-$9D5D` | 5 | ceiling `$9D5E` = `DIRECTOR_C_PRE` |
| `BROADSIDE` tail `$780D-$780F` | 3 | |
| **Usable total** | **188** | in six separate windows; the two that can hold a table are 89 and 56 |

Excluded by the brief: the `STARFIELD` free tail `$5D94-$5E05` (114 B), the
level buffer and the splash blob area. Excluded as unsafe: `$7810-$7BCF` (the
pause-screen backup, live during gameplay) and the `HYBRID_C_ARENA` free tail
`$7E39-$7F0F` (live during gameplay, so a post-Game-Over return to the menu
would find it clobbered).

**308 B needed, 188 B free, short by 120 B** — and the largest contiguous free
run is 89 B, which is less than the star table alone.

Scope reduction does not rescue it. Dropping the seven new rows entirely (stars
only in the five ANTIC 4 rows that already exist, ~24 stars, no DL change) still
costs 129 B of code + 12 + 12 tables + 72 B of table = **225 B** against the 145 B
that the two usable windows hold.

## 4. Three compliant alternatives for the owner

| # | Where the bytes come from | Player-visible result | Cost | Risk |
| --- | --- | --- | --- | --- |
| A | `LOADER_SPLASH_CODE_SLACK` 56 B + `PICKUP_CODE` 89 B + the `STARFIELD` free tail 114 B (**the brief forbids this one**) | ~30 stars, full layout incl. the new rows: 259 B available vs ~260 B needed at 30 stars | 0 new boot sectors; spends the gameplay starfield expansion reserve | Deleting the splash slack moves every later `CODE`/`RODATA` address, so the pinned-address tests and the runtime evidence all need re-recording with a re-measured cycle baseline |
| B | A new DFMC transport record into `$0400-$04FF` (256 B, page 4 — claimed by no link and absent from the memory map), plus the 56 B splash slack for the DL and the hook | ~34 stars, full layout | +2-3 boot sectors | Highest. `$0400-$047F` is the OS cassette buffer the disk boot reads sector 1 into, so the record must be proven to land after that; and per the ATR menu deadline (551 vs 550 at the 832-B arena) and the frame-300 boot-smoke checkpoint (3 frames of margin) an extra transport record is exactly what trips boot smoke |
| C | `LOADER_SPLASH_CODE_SLACK` 56 B + `PICKUP_CODE` 89 B only, with the feature cut to fit 145 B | ~8 twinkling stars in the `$C4` row and the two bar rows, one dot shape, one tone. Reads as a few specks, not a sky | 0 new boot sectors, no address moves outside the slack | Low, but it is not mockup "A" and probably not worth a commit |

The honest recommendation is **A with the owner lifting the STARFIELD
restriction**, or deferring the feature until something else frees resident
space. B is the only route that costs no existing reserve, and it is the one
most likely to fail boot smoke.
