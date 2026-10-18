# Boss loading-screen banners and the Bastion shape — owner design input

> **Status (2026-10-18, `feat/boss-banners`, owner decision AY): superseded as the look of the bosses.** The pictures
> and screens in this folder (`bitmaps/`, `screens/`, `mockups/`) show the bosses as they were drawn on 2026-10-11 —
> the castle-era Breaker, the Citadel's sixteen square modules, the oval Spine, the four-spar Bastion — and the
> region numbers before decision AX 1 (here R2 is the Bastion and R4 the Citadel; on the disk region 2 is the Citadel
> and region 4 the Bastion). **They are not the banners the game shows.** The shipped banners are redrawn from the
> bosses as they are now: the 160 × 64 pictures in `assets/graphics/boss-banners/` (`banners.json` names each boss's,
> `scripts/boss-banner-art.mjs` draws them), the screens from `node scripts/boss-banner-preview.mjs`
> (`build/boss-banners/`), the design and the measurements in `docs/plans/boss-banners.md`. What still holds from
> here: the decisions (variant A title, one mode F banner per boss, white on black, the banner loading first). The
> notes `r1-twin-lasers-note.md`, `r2-bastion-note.md` and `r4-void-citadel-note.md` describe how the bands changed
> since, which the new pictures follow. The entry limit is 350 host frames (decision AY; this README's 280 / 300 are
> history).

Made with the owner on 2026-10-11 outside the repo. This is **design input**, not built code. Where this folder and the repo
disagree on a technical fact (display list, band size, colours, font, loader), the repo wins and the session reports the
difference.

## Owner decisions (2026-10-11)

1. **Boss loading-screen title, variant A**, per region, from region data:
   - line 1: `WARNING` (large, laser red)
   - line 2: the boss name: `BLOCKADE BREAKER` (R1), `BASTION` (R2), `SIEGE SPINE` (R3), `VOID CITADEL` (R4)
   - line 3: `INCOMING`
   - The four names are final.
   - The title alone (on today's screen) belongs to `fix/boss-polish`. It must not live in the initial block (29 B left) or
     in the slot F table (R1 at its 110 B limit). If it cannot fit elsewhere, STOP.
2. **Banner art** (a separate task after S5-5, before v0.3.0):
   - One banner per boss type, in the top third of the screen: mode F, 64 lines, a 160×64 picture centred, empty sides.
   - The title (decision 1) and the loader bar sit underneath.
   - **Monochrome white on black** was chosen; the region-coloured gradient variant was rejected (see `mockups/`).
   - The banner is loaded **first**, so the player watches it while the rest of the boss loads under it. For that, the
     owner allows the boss-entry limit to rise from 250 to **about 280 frames** - **300** since decision AV
     (2026-10-16): the standing limit, so the banner fits (headroom per region in `r2-bastion-note.md`).
   - The pictures here are the owner-approved direction. The session may clean them up pixel by pixel but keeps the
     silhouettes.
3. **Bastion (R2) shape for S5-5**, chosen to fit the current boss mechanics (see `mockups/r2-bastion-boss-band-mockup.png`):
   - a central sphere hub with the **core** inside;
   - **hangar doors** under the hub act as the armour plate over the core (the core cannot be hit until the doors fall);
   - **four horizontal lattice spars**, two per side: the upper pair is longer, with outer laser guns G1/G4 at the ends; the
     lower pair is shorter, with inner guns G2/G3;
   - every gun fires the existing vertical laser beam down;
   - fight order: guns → doors → core;
   - the outer guns sit beyond the 40 visible columns and come into view as the band slides;
   - the hangar is decoration only: the escort still comes from the Director (escort-flow, decision §AI).
   - The mockup's 48 × 5 character band is an assumption. S5-5 reads the real band size from the repo and keeps the layout:
     hub centred, guns on two heights, empty columns between the spars.
   - The banner and the in-game band must read as the same ship.

## Files (2026-10-11; superseded looks, kept as the design history)

- `bitmaps/rN-<name>-160x64.png`: native 1-bit pictures, the exact pixels.
- `bitmaps/rN-<name>-160x64.bin`: the same pictures, 1,280 B each, mode F bytes, row-major, 20 bytes per line, MSB = leftmost
  pixel, set bit = foreground.
- `screens/RN-loading-screen-mono-3x.png`: whole-screen previews at 3× scale (banner, title, loader bar at 5/12).
- `mockups/r2-bastion-boss-band-mockup.png`: Bastion in the boss band (mode 4 schematic, G = gun, P = doors/plate, C = core).
- `mockups/rejected-colour-vs-mono-v1.png`: the first round, colour vs mono. It shows the rejected castle Bastion.
- `src/`: the Python (Pillow + numpy) that drew everything; `python3 compose.py` regenerates `R?-mono.png`, and
  `python3 band.py` regenerates the Bastion mockup.

## Estimates to verify (made outside the repo)

| Item | Estimate |
|---|---|
| Picture, raw | 1,280 B each |
| Picture, LZSS (a generic LZSS, not the repo's) | R1 ~720, R2 ~570, R3 ~800, R4 ~780 B, about 5–7 sectors |
| Extra boss-entry time | ~+25 frames if the banner loads first |
| RAM while loading | about 2–2.5 KB for a 64-line mode F band (less with a narrow 256-px playfield) |
| Colours | white on black; the title uses `$46` for WARNING (laser red), magenta for the name, white for INCOMING |

The font in the previews is a stand-in: use the game's own font. The palette in the previews is an approximation of PAL.
