# Note for the banner task: region 4's band after `feat/boss-region-4`

Owner request (decision AL point 3's rule, applied to region 4): the R4 banner
and the in-game band must read as the same ship. The band departs from the
banner in these points - the silhouette the banner should echo:

- **One continuous deck** along the top, end to end (band row 0, columns
  14-49), its corners cut (the octagon). Everything hangs from it; it never
  breaks.
- **The void core** at the centre (columns 30-32, rows 1-3): round, a black
  void inside a bright rim and a magenta glow ring - as the banner, but three
  cells wide and hung *under* the deck, not breaking it.
- **The core's lens** directly under the core (belt row, 30-32): the core
  fires its own beam down from it. The banner has no lens.
- **Two laser cannons hugging the core** (27-29 and 34-36): region 1's
  projector towers. The banner's two blocks of eight square modules become,
  each side, three pulse guns (square turrets) and the cannon.
- **The salvo spires** against the hull's ends (12-13 and 50-51), twin
  needles, no longer free-standing beside the hull as in the banner (no gap,
  no gantry: nothing floats once a spire falls).
- **A one-row armour belt** under the weapons; nothing below it.
- **The gravity column** (a white S-wave from the band down, under the core)
  is a sprite (missile M0), not band art; a banner may hint at it as a faint
  vertical line under the core.

Source of truth: `assets/graphics/boss-regions/region-4/` (`band.png`,
`modules.json`) and `npm run boss:preview -- --region=4`. Plan:
[../../plans/s5-boss-regions.md](../../plans/s5-boss-regions.md) §6.4; journal §AQ.
