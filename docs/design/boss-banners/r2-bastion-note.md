# Note for the banner task: the Bastion's band after `feat/boss-region-2` (region 4 since `feat/boss-order-scale`)

## Which banner shows at which region (`feat/boss-order-scale`)

The owner's decision AX 1 (2026-10-16) put the bosses in the order easiest to
hardest; the order is data (`assets/graphics/boss-regions/order.json`,
`[1, 4, 3, 2]`). A banner belongs to its boss, not to a region number - the
`bitmaps/rN-<name>` files keep the names they were drawn under:

| region (levels) | boss | banner (`bitmaps/`) | note |
| --- | --- | --- | --- |
| 1 (1-3) | Blockade Breaker | `r1-blockade-breaker-160x64` | `r1-twin-lasers-note.md` |
| 2 (4-6) | Void Citadel | `r4-void-citadel-160x64` | `r4-void-citadel-note.md` |
| 3 (7-9) | Siege Spine | `r3-siege-spine-160x64` | - |
| 4 (10-12) | Bastion | `r2-bastion-160x64` | this note |

The banner task should read the boss of a region from the built disk
(`build/manifest.json` `boss.order` / `boss.regions[k].name`), not assume
region k = `rk`.

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
  cannon always in view - since `feat/boss-art` (the owner's looks of
  2026-10-16) a pointed armoured spire hung from the track: a mounting plate,
  an armour plate, two fins pointing down, narrowing into a long barrel with
  a squared muzzle brake at its foot (light steel while locked; amber plate,
  barrel ring and muzzle once open) - and under it, between the cannon and
  the player, its **armour**: the gate's bars, in the gate's row.
- **Two gun rails running off the screen**, left and right: a lattice girder
  under the track from beyond the screen edge to a striped buffer (a steel
  post, diagonal hazard stripes facing the bay, a rounded buffer head with an
  amber pad), three pod turrets hanging from it (the outermost off screen).
  Destroying the front turret slides the whole rail inward and opens that
  side's bay; the second slide covers the cannon on that side. **Since
  `feat/boss-order-scale` the rail ends in an L** (decision AX 5, the owner's
  choices of 2026-10-16): the pods three columns apart, the rail travels 6
  columns, and a two-cell armoured foot reaches inward along the armour row
  from the buffer - the second slide puts the foot in front of the cannon,
  which turns back to locked steel. A banner may show the foot under the
  buffer. A banner may
  show the rails long and cropped by the frame - their outer part is "beyond
  the edge" in the game too. Between each rail's buffer and its bay, a dashed
  guide track (where the rail will go).
- The band is **still**; the rails' slides are its only motion.
- Colours (`feat/boss-art`, a palette per band row): pale steel faces, a
  military olive-green trim drawing every outline and shadow edge (`$D6` on
  the track down to `$D2`), hazard amber `$28`, olive bulk `$E2` on the track
  and behind the gate, red in the middle rows (the hazard stripes, the pods'
  lamps, the core's lower two thirds: the core from orange to red).

## The boss entries' headroom

The banner task's expected cost is **~25 host frames** against the boss
entry's limit - **300** host frames since decision AV (2026-10-16; 280 by
decision AM before), raised so that the banner fits. MEASURED on each
region's route after `feat/boss-order-scale` (the order, and the Bastion's L:
its rail code in slots C and D, +2 sectors at every boss entry, decision AX
12; STATUS):

| region | boss | entry, host frames (sectors) | headroom under 300 |
| --- | --- | ---: | ---: |
| R1 | Blockade Breaker | 257 (67) | 43 |
| R2 | Void Citadel | 272 (71) | 28 |
| R3 | Siege Spine | 268 (70) | 32 |
| R4 | Bastion | 271 (71) | 29 |

Every region leaves the ~25 the banner needs - R2 with the least, 3 frames
over. (After `feat/boss-art`: 249 / 264 / 260 / 264 - R2 was the Bastion then,
R4 the Citadel.)

Source of truth: `assets/graphics/boss-regions/region-2/` (`band.png`,
`open.png`, `emitter.png`, `modules.json`), drawn by `scripts/boss-r2-art.mjs`;
`npm run boss:preview -- --region=2` redraws the band.
