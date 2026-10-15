# Note for the banner task: region 2's band after `feat/boss-region-2`

Owner request (decision AL point 3's rule, applied to region 2): the R2 banner
and the in-game band must read as the same ship. The Bastion as built (S5-5,
the owner's design of 2026-10-14 and his choice of 2026-10-15, N-C with W2;
plan `s5-boss-regions` §6.5, journal §AT) departs from the README's §3 shape
and its mockup (`mockups/r2-bastion-boss-band-mockup.png`) in these points -
the silhouette the banner should show:

- **One overhead track** along the top, from screen edge to screen edge (band
  row 0): olive bulk under a steel beam, a rivet every other column.
  Everything hangs from it.
- **The hangar at the centre, slim:** a one-cell cap on the track, the
  **core** - an amber reactor rod in a steel frame - under it, and the
  **hangar doors** under the core (one cell): barred grey-and-olive armour
  while locked, amber hazard chevrons once open. No sphere: a wide hub left a
  safe corridor between the cannons' beams (Phase A, measured).
- **Two laser cannons hugging the hangar**, one each side: region 1's
  projector towers, narrowed to two cells.
- **Two gun rails running off the screen**, left and right: a lattice girder
  under the track from beyond the screen edge to a hazard-striped front
  buffer, three turrets hanging from it (the outermost partly off screen).
  Destroying the front turret slides the whole rail inward; the second slide
  covers the cannon on that side. A banner may show the rails long and
  cropped by the frame - their outer part is "beyond the edge" in the game
  too.
- No four spars on two heights, no guns beyond the 40 columns waiting for a
  drift: the band is **still**; the rails' slides are its only motion.
- Colours: pale and mid steel, hazard amber `$28`, olive bulk `$E2`.

## The boss entry's headroom

Region 2's boss entry is **253 host frames** (66 sectors, MEASURED on the
region 2 route) against the limit **280** (decision AM): **27 frames left**
for the banner task's expected **~25** - it fits, with 2 frames to spare (R1
31, R3 24, R4 19 - STATUS).

Source of truth: `assets/graphics/boss-regions/region-2/` (`band.png`,
`open.png`, `modules.json`), drawn by `scripts/boss-r2-art.mjs`; the
geometry diagram and a careless fight's sequence: `build/play/s5-5-r2-w2-geometry.png`,
`build/play/s5-5-r2-w2-sequence.png` (not committed; the art script and
`npm run boss:preview -- --region=2` redraw the band).
