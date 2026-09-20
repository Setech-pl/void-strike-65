# VS65 WORKFLOW — PAL / HARDWARE VERIFY

Use for:

- raster changes;
- ANTIC/PMG changes;
- VBI/DLI;
- backing/publication architecture;
- milestone acceptance;
- release gates;
- suspected timing regression.

Do NOT use this full workflow after every ordinary C gameplay change.

## Verify

- production target: 31,200 cycles;
- hard gate: 32,568 cycles;
- physical PAL: 35,568 cycles;
- missed frames;
- extra VBI;
- DLI anomalies;
- raster correctness;
- relevant placement/residency.

For A/B comparisons use the SAME deterministic replay.

Do not compare maxima from unrelated scenarios as if they were equivalent.

Update diagnostics and `docs/STATUS.md` only after an accepted result.
