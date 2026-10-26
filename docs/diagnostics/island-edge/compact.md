# Island contact raster sweep

MEASURED. Overlap is maximum common opaque width on any matching scanline, in hires pixels. Zero means no common solid pixel. HPOS advances two hires pixels; ANTIC 4 pixels also span two hires pixels. World scrolling publishes whole character rows; alignment is the eight relative sprite/glyph scanline phases.

| Design | Colour | Difficulty | Region | Alignment | Mismatch overlap / engine hit / count | Minimum overlap on hit | Maximum overlap on miss |
| --- | --- | --- | --- | ---: | --- | ---: | ---: |
