# Note for the banner task: region 2's band after `feat/boss-region-2`

Owner request (decision AL point 3's rule, applied to region 2): the R2 banner
and the in-game band must read as the same ship. The Bastion as built (S5-5,
the owner's design of 2026-10-14, his choice "B - the window" and his looks of
2026-10-15; plan `s5-boss-regions` §6.5, journal §AT, §AU) departs from the
README's §3 shape and its mockup (`mockups/r2-bastion-boss-band-mockup.png`)
in these points - the silhouette the banner should show:

- **One overhead track** along the top, from screen edge to screen edge (band
  row 0): olive bulk under a steel beam, a rivet in every column. Everything
  hangs from it.
- **The dome hub with the sphere core at the centre:** a round hangar five
  cells wide (olive bulk, a steel rim, rivets), the track running behind it;
  inside it the **core**, a round amber reactor with a white eye and a shine -
  the brightest thing on the ship; at its foot the **gate** (the doors), one
  barred glyph wide three cells: grey bars while locked, amber hazard stripes
  once open.
- **Two armoured cannon bays beside the dome**, one each side: the whole laser
  cannon always in view - a stepped spire pointing up at the track, a belt,
  the arch of its legs round the lens at its foot (grey unlit steel while
  locked, lit amber once open) - and under it, between the cannon and the
  player, its **armour**: the gate's bars, in the gate's row.
- **Two gun rails running off the screen**, left and right: a lattice girder
  under the track from beyond the screen edge to a striped buffer (a steel
  post, diagonal hazard stripes facing the bay, a rounded buffer head with an
  amber pad), three pod turrets hanging from it (the outermost off screen).
  Destroying the front turret slides the whole rail inward and opens that
  side's bay; the second slide covers the cannon on that side. A banner may
  show the rails long and cropped by the frame - their outer part is "beyond
  the edge" in the game too. Between each rail's buffer and its bay, a dashed
  guide track (where the rail will go).
- The band is **still**; the rails' slides are its only motion.
- Colours: pale and mid steel, hazard amber `$28`, olive bulk `$E2`.

## The boss entries' headroom

The banner task's expected cost is **~25 host frames** against the boss
entry's limit **280** (decision AM). MEASURED on each region's route (STATUS):

| region | entry, host frames (sectors) | headroom |
| --- | ---: | ---: |
| R1 Blockade Breaker | 249 (65) | 31 |
| R2 Bastion | 256 (67: its charset six sectors since the owner's look at `3b5a8ea`) | 24 |
| R3 Siege Spine | 256 (67) | 24 |
| R4 Void Citadel | 261 (68) | 19 |

R2, R3 and R4 are under the ~25: the owner's call (2026-10-15) - the banner
task absorbs the lost headroom across R2-R4 (the owner's standing rule: a boss
may spend sectors on its quality within the hard gates).

Source of truth: `assets/graphics/boss-regions/region-2/` (`band.png`,
`open.png`, `emitter.png`, `modules.json`), drawn by `scripts/boss-r2-art.mjs`;
`npm run boss:preview -- --region=2` redraws the band.
