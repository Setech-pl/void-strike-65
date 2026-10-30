# M3-H checkpoint 4 — generated damage variant C

OWNER-SMOKE CANDIDATE; no runtime damage publication yet. The source holds
three row/clear-mask pairs per stage for armour and Bomber. Masks preserve
outer silhouette/occupied rows, clear only existing pixels and are cumulative.
The compiler checks level-specific Heavy look overrides against the same masks.

[Preview](checkpoint-4-variant-c.png): armour above Bomber; columns intact,
stage 1, stage 2. This is source-derived PMG art, not a native raster.
Rebuild with `node scripts/heavy-damage-preview.mjs <output.png>`.

Normal gated build PASS; focused roster/look/mask checks **22/22 PASS**.
A linked NMOS fixture reads the actual home table bytes and applies them to
each H16 body, byte-exact against the source preview. Invalid masks are rejected.
H12 will exercise the production publisher rather than this test-only loop.

H13 is **24 B in checked home**, now **636/1,920 B**. Window remains 2,159 B;
arena 830 B; all DFMC sector counts unchanged. The checked content run remains
15 sectors: **313,556 linked CPU cycles, added 0 cycles/0 reads** versus
checkpoint 2. Synthetic serial-drive fixture, not physical loading wall time.
No new row-tick/frame path calls the table, so damage-feature CPU is zero here.

[Exact measurements and ATR hash](checkpoint-4.json). Play:
`build/play/m3h-session2/checkpoint-4/campaign.atr`.
