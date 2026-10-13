# Note for the banner task: region 1's band after `feat/boss-r1-twin-lasers`

Owner request (2026-10-13): the R1 banner and the in-game band must read as the
same ship (decision AL point 3's rule, applied to region 1). The band changed after
the banners in this folder were drawn. The silhouette the banner should echo:

- **A continuous deck (the hull spine)** along the top of the ship, end to end
  (band row 0, columns 7-56, between the two engine nozzles). Everything hangs
  from it. It is hull, not a module: it never breaks.
- **Two laser cannons**, symmetric about the centre: left at band columns 21-23,
  right at 41-43. Each is the projector tower of `emitter.png`: a stepped tower,
  a mast, a round lens at the bottom.
- **Pulse guns** between and beyond them, all hanging from the deck by short
  struts: one in the central slot (31-33), one in the open bay (26-28), two near
  the right cannon (38-40 and 44-46), one at each far end (12-14 and 50-52).
- **A thin armour belt** under the weapons: one row of plates (row 4), not the
  old tall plates. Seen from below, the deck, the hanging weapons and the belt
  read as three layers.
- Nothing below the belt: band rows 5-7 are empty and the display list ends the
  band under row 4.

Source of truth: `assets/graphics/boss-regions/region-1/` (`band.png`,
`modules.json`) and `npm run boss:preview -- --region=1`. Plan:
[../../plans/boss-r1-twin-lasers.md](../../plans/boss-r1-twin-lasers.md); journal §AP.
