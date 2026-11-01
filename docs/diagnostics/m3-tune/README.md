# M3 tuning — OWNER-SMOKE CANDIDATE

[Po polsku](README.pl.md)

Tempo is authored into each ATR. **Set the matching difficulty in OPTIONS**: EASY, NORMAL or HARD. Changing the menu alone does not replace motion tempo. Start with pilot-normal, then compare EASY and HARD. Pilot covers four groups; level-2 starts the full level; volley is a separate, deliberately fast four-Light/volley stress route.

Check readable wide sweeps, opposite-side arrivals, immediate groups after clearing and comfortable aiming. EASY should feel clearly calmer; NORMAL is slower than preceding M3; HARD retains the previous tempo. Player shots gain one raster line above and below the Light hit area; silhouettes stay unchanged. Only the owner records smoke acceptance.

| ATR | SHA-256 |
| --- | --- |
| pilot-easy.atr | `2b4a088cc188020e114e4cdc3f3a8a90d795087189d566de1717f207b4db32ce` |
| level-2-easy.atr | `3ce16b854574327faf663910edfa69beb12eb4c26944b1477b54ead424d59a69` |
| pilot-normal.atr | `525e600b57ae175531cdeb76e8219220b0a9de09cea72fb02a33b15b83917ce1` |
| level-2-normal.atr | `4848711f9d1bbd93c810eb233156163380abb79865c7be26bd07fdc861253c03` |
| pilot-hard.atr | `d2f9818c54cff3a2e2182a76b756e432c22b0a85b57492fb3acd5faf90b1d0d9` |
| level-2-hard.atr | `a978a2ba6510ca48e1865dd2e78d027def5994b7916257b5d70182334a0d20db` |
| volley.atr | `a8f3c9f11ae72f1dd18f306c0e0a4605fbd864709bcd059425250506fdc2e48c` |

Launch (one line per ATR):

```sh
atari800 -xl -nobasic -pal /Users/marcinkrzetowski/Projects/dark-fighter-m3-tune/build/play/m3-tune/pilot-easy.atr
atari800 -xl -nobasic -pal /Users/marcinkrzetowski/Projects/dark-fighter-m3-tune/build/play/m3-tune/level-2-easy.atr
atari800 -xl -nobasic -pal /Users/marcinkrzetowski/Projects/dark-fighter-m3-tune/build/play/m3-tune/pilot-normal.atr
atari800 -xl -nobasic -pal /Users/marcinkrzetowski/Projects/dark-fighter-m3-tune/build/play/m3-tune/level-2-normal.atr
atari800 -xl -nobasic -pal /Users/marcinkrzetowski/Projects/dark-fighter-m3-tune/build/play/m3-tune/pilot-hard.atr
atari800 -xl -nobasic -pal /Users/marcinkrzetowski/Projects/dark-fighter-m3-tune/build/play/m3-tune/level-2-hard.atr
atari800 -xl -nobasic -pal /Users/marcinkrzetowski/Projects/dark-fighter-m3-tune/build/play/m3-tune/volley.atr
```

Rebuild: `node scripts/build-m3-tune-play.mjs`. Technical results: [report](report.md).
