# Owner final tuning, stage a — data-only candidate

Owner reports checkpoint4 mechanics OK, but too sparse/narrow/avoidable. This
commit reauthors level2 only, leaving Heavy WaveDefs, level1, all runtime
code/state and homes unchanged: content1863/free57, window2437/usable free374,
L2 1457/usable free79 (+256 protected). The opening now has18 free Lights
instead of9; the four-step pilot24 instead of10. All seven pilot WaveDefs
use row0 and16-frame spacing. Existing clear lock remains the only chain gate.

Left52/right200/centre124 entries, wide128–152 HPOS sweeps at every-frame
cadence, hidden mirrored fan to visible opposite edges, crossing paths and
quiet readable bottom/upward exits replace short single-file shapes. Tracking
retains a slower readable period; only pressure uses combined volley/column.
No opposing unavoidable continuous-fire wall is authored.6 deduplicated paths
fit the unchanged96-B payload. Enemy AI, weapons, HP and scores unchanged.

Linked C integration tests run both opening/pilot on E/M/H with no kills and
immediate kills: every group admits, visible span152 HPOS, no overlap, next
wave arms within1–4 frames of field clear (next legal row tick). Fast kills
add zero authored row wait. Native no-fire pilot1500 frames,30630 peak,
24 admissions, completes release and advances sector4→5 with no timing anomaly.
[Native report](a-native.json), [linked per-route results](a-linked-timeline.json).
Focused compiler/chain15 PASS; path24 PASS/1 optional SKIP. Owner mechanics OK
is recorded without promoting this new tuning to owner acceptance.

Stage b next measures4 free Lights as a separate bounded commit. Stage c:
with only existing clear/row-cadence gaps, overlap is not yet needed; final
report must confirm that result and price its alternative. No overlap code
or new frame scan is introduced here.
