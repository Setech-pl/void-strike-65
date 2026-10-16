# Graphics outside the boss band, 2026-10-09 → 2026-10-16

**Branch:** `fix/gfx-regression` from `main` `e660d0b` (feat/boss-art merged,
fast-forward 2026-10-16 13:00).
**Owner request (2026-10-16):** the Interceptor, the capital ships and maybe
other elements look worse than a few days ago. Agent sessions made every
change and committed it, so the answer comes from git, not from guessing.

**THEN** = `343d55e` — main at the end of 2026-10-09 (feat/boss-finale
merged 20:00), before fix/hardware-boot, fix/hardware-audio, boss-r1-tuning
and the escort-flow merge (decision AI, `ef1924d`). Its ATR rebuilt from a
detached worktree reproduces the committed `70063213…` exactly.
**NOW** = `e660d0b`, ATR `33b1acb3…`.

## Result

**No change to graphics outside the boss band was accidental.** None of the
art or palette data changed. Every visible difference is either a recorded
owner decision or a timing jitter of about one scanline. The jitter comes
from new gameplay cycles, not from any graphics byte. Nothing was restored,
because nothing qualified. `tests/gfx-pins.test.mjs` now pins what was
audited.

## Method (all MEASURED)

1. **Generated data.** Built THEN and NOW from detached worktrees and compared
   every `build/` output. These are byte-identical: `enemy-roster.inc`
   (every sprite and Light glyph), `capital-hulls.inc`,
   `hull-style-R1..R4.bin`, `level-hull-block.bin`, `entity-effects.inc`
   (effects, debris, explosions), `fighter-weapons.inc` (player, shots, HUD
   constants), `starfield.inc`, `frontend-h31.inc`, `loader-screen.inc`,
   `loader-display-list.inc`, `menu-stars.inc`, `level-payload.bin` (the
   level looks), `level-summary-art-1.bin`, `boot-splash.bin`,
   `overlay-capital-slot-a.bin` (the capital code, turrets, muzzles, rings,
   damage stages) and `boss-restore.inc`. No asset source outside
   `assets/graphics/boss-regions/` changed except `level-summary.json`
   (row 6 of the table).
2. **Main link.** The `main.lst` diff with addresses ignored shows one
   graphics change, the HUD's spent HULL quarter (row 1). The other changes
   are SKCTL, DSTATS, the boss entry's head and moved vector operands.
3. **Light glyphs.** The 32 bytes at `light_glyph` (Wingman + Interceptor)
   are identical.
4. **Register writes.** `PRIOR`, `GPRIOR`, `COLPM*`, `COLBK`, `CHBASE` and
   `DLISTL` stores are unchanged in number across `src/`. The only new
   `COLPF1`, `COLPF3` and `VDSLST` stores are boss-art's row switches
   (`boss_pal_frame`, `boss_pal_dli`), and those stay inside the band (5).
5. **Runtime, full level 1.** Atari800 replayed
   `director-complete-1-natural-sweep-fire0` (MEDIUM, sweep bot, to the
   summary, through the boss) with a screenshot of every frame, using THEN's
   harness on THEN and NOW's on NOW. Frames 0-2,090 cover the opening,
   Raiders, Bombers, capsules, debris, the whole capital sector with
   broadsides, and the swarm up to its first Interceptor. They are
   pixel-identical except 12 single frames (row 9). After frame 2,091 the two
   replays diverge only because the Interceptor flies differently (row 3).
   Contact sheets of the swarm and the boss sector show the same Interceptor,
   Wingman, shots, stars and ring under the band. The README GIF (700 frames,
   capsule → BROADSIDE) differs only in the HUD's HULL cells.
6. **The band's end on all four routes (6502 harness).** After the row
   switches, phase 1 of `boss_dli` writes `CHBASE` = `>CHARSET`, `COLPF0` $0E,
   the level's allied steel in `COLPF1`, `COLPF2` $AE and `COLPF3` $46, and
   leaves `VDSLST` = `boss_dli`. The ring under the band gets exactly the
   gameplay DLI's charset and colours.
7. **Hull maps.** Boss slot E grew over the Hostile hull map at
   `$4D20-$4E0E`. `start_gameplay` rebuilds both maps at every level start
   (`hull_maps_built`), and the trace counts `hull_map_stale_draws` = 0.
   Slot F's region code (`$526E-$53FE`) sits in the HUD charset's codes
   78-127, which the HUD never shows (`tests/slot-f.test.mjs`).

## Element by element

| # | Element | What changed | Commit | Class | Action |
|---|---|---|---|---|---|
| 1 | HUD HULL | a spent quarter is `CH_SPACE` (was `CH_HUD_HULL_DAMAGED`, the cracked plate) | `fd42a9f` / `f9dd63b` fix/boss-polish | INTENDED — owner request 2026-10-12 (plan boss-polish §0 item 2: "HULL quarters should vanish too") | kept, pinned |
| 2 | Interceptor hit flash | a survived hit draws its 2 cells with bit 7 clear for 3 frames: the PF3 pods ($46) show PF2 ($AE) | `4990829` feat/interceptor-armour | INTENDED — decision AN 1 (F1; blink F2 rejected) | kept, pinned |
| 3 | Interceptor flight | standoff 7 rows above the player, slot rows 2 apart, 2 top-hold loops, dive 4 / climb 3 lines a frame, column tracked every 2nd frame to the ship's centre | `ef74ab0`, `07869e7`, `af43e56`, `f66ed04` | INTENDED — decisions AK (Q1-Q2, pt 10), AS (V1) | kept |
| 4 | Interceptor glyphs, explosion | none (glyph bytes, breakup effects, `light_destroyed` identical) | — | — | pinned |
| 5 | Capital ships (turrets, muzzles, rings, damage stages, engines, broadside), debris, Raiders, Bombers, player, shots, capsules, starfield, title, loader | none (data and code identical; frames identical) | — | — | pinned |
| 6 | Loading screen art, regions 2-4 | summary art `segmentRow` 10 / 16 / 22 → 4 (shows the gun rows 8-10) | `5f052cd` boss-r1-tuning | INTENDED — owner smoke 2026-10-09, decisions 2026-10-10 | kept |
| 7 | Boss loading screen | WARNING on row 5, then the boss's name and INCOMING | `f9dd63b` fix/boss-polish | INTENDED — decision AL 1 (variant A) | kept |
| 8 | First line under the band | the band-end DLI stores COLPF2 second (was fourth) | `09fc0f8` feat/boss-region-4 | INTENDED — decision AQ 4 ("COLPF2 jako pierwszy kolor") | kept |
| 9 | Single-frame timing | 12 of 2,091 identical-path frames differ: a Raider PMG row one line early or late (7 frames, both directions), a starfield point (2, both directions), a Bomber edge (1, NOW extra), and a breakup fragment absent in NOW for one frame (3, frames 413 / 559 / 561) | gameplay cycles of `ef74ab0`, `4990829`, `7aad754` | SIDE EFFECT of timing, not of graphics — MEASURED: the effect render starts +13 to +120 cycles later in those frames (frame 413: 12,216 → 12,336 cycles), so a fragment on the raster's current row shows one frame later; the PMG rows shift both ways | not restored: the effects render mid-frame against the raster by design (both THEN and NOW); restoring THEN's timing means taking the Interceptor's code out; within every gate |

## Proposals for INTENDED items that may look worse

- **Interceptor hover (3).** The Light is drawn on the character grid, so a
  2-line move can show as an 8-line jump, and following the player's column
  every second frame reads as jitter. Proposal: a dead zone of one column on
  the X tracking (hold while the ship's centre is within 4 HPOS), which is
  what decision AS's rejected V2 bought for +14 B of the window.
- **Interceptor hit flash (2).** The pods turn the player's shot colour $AE,
  so they can read as a shot rather than a hit. Proposal: a 2-frame flash
  (pattern `%00110000`, 0 B) if the owner finds 3 frames too long; the colour
  cannot change without a register write, which decision AN 1 ruled out.
- **HUD HULL (1).** Proposal: none. It now matches BOOST, as the owner asked.
- **Regions 2-4 loading art (6), boss title (7), first line under the band
  (8).** Proposal: none; they look as decided.

## Pins (`tests/gfx-pins.test.mjs`, 27 tests)

The SHA-256 of the 17 generated art and palette outputs; the 32 Light glyph
bytes; the Light flash (bit 7 only, 3 frames, no colour register); the
gameplay DLI's charsets and palette by value and its instructions by source;
the HUD's spent HULL quarter; the boss link's colour, charset and DLI-vector
stores by routine; and, on all four routes, the band's end restoring the
gameplay charset and palette and handing `VDSLST` back to `boss_dli`.
Re-pin only with the owner decision that changes the art.
