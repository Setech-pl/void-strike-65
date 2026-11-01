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
with only existing clear/row-cadence state gaps, overlap is not yet needed; final
report must confirm that result and price its alternative. No overlap code
or new frame scan is introduced here.

## Stage b — four free Lights retained

Swarm ceiling table3→4, matching compiler clamp and timeline slot model; no
other class cap changes. Existing4-slot C arrays, renderer loops/backings and
slot limit already support4. Three appearance pairs suffice because instances
of the same look share a pair; no fourth distinct look is promised. Admission
continues refusing any unsafe glyph replacement. No new code/state bytes in
any home:1863/2437/1457 and free57/374/79 unchanged. Counts rise to24 opening
and32 pilot Lights, at16-frame spacing. Level1 still authors a ceiling of3.

Focused linked checks78 PASS/1 optional SKIP, plus25/1 updated path cases,
including four real admissions, shared glyph pair, four independent slots,
one token/four-shot pulse and no duplicate pulse. Both E/M/H no-fire/instant-
kill timelines admit every group with2–3-frame arm gaps and152-HPOS coverage.
Native stress deliberately holds four eligible path Lights at firing height
with every-frame lateral movement and a combined tracking section. It is
stronger than the preliminary wide-path fixture (30468 peak/432 four-Light
frames). Final2200-frame stress peaks**32184**,684 above31500 target and384
below32568 hard gate;39 frames over target, no misses/DLI/deadline anomaly.
Four-shot bursts are observed; see [coverage](b-four-native.json). This is a
report-only target overrun, not an excuse to suppress volley or retain3.

## Stage c — bounded overlap priced, not implemented

Clear-field state gaps are2–3 frames, but next-wave entry still has a visible
cue: stage-b body-Y16 proxy intervals are up to30 frames at the hidden fan
and9–10 on ordinary entry. Checkpoint5 corrects this measurement to the real
renderer Y24 top: up to34 and13–14 frames, respectively; see the final
[linked results](../linked-timelines.json). Neither is zero visible pause.

A throwaway no-new-scan C sizing probe reuses each existing path tick to
aggregate terminal eligibility, rather than adding another four-slot walk.
The decision also fences the next WaveDef to the same sector, Light class,
path mode and no afterCleared requirement, preventing early Heavy/capital or
boss admission. Its helper alone compiles**88 B +1 B state**: content would be
**1952/1920,32 B over**, before caller/guard/aggregation code. The helper alone
also exceeds the79-B usable L2 tail by9 B. Exact link failure is retained in
[c-overlap-price.log](c-overlap-price.log); this was an isolated export, never
production code. No claim that every possible optimization is impossible.

Options/prices (additional glue/CPU are ESTIMATE, helper size MEASURED):

- Retain clear lock and data cues:0 B/0 cycles; no new scan; chosen. Dense
  four-Light batches continue immediately at the existing row cadence, with a
  short readable entry cue before the next opposing pair.
- No-new-scan cached eligibility:≥89 content B plus about16–24 resident guard/
  caller B,12–24 B tick aggregation and8–16 L2 B to filter mixed-wave volley
  snapshots. Approximately180–320 instruction cycles/frame for four live
  paths, plus80–160 per handoff. Does not fit content or L2 as one helper;
  splitting/compaction would require a separate placement/timing iteration
  against only344 cycles of final E/M/H hard-gate headroom. Not implemented.
- Inspect four slots when spent:estimated70–110 policy B +16–24 guard/caller B,
  250–500 cycles on waiting frames. Adds a per-frame scan, explicitly excluded
  by the owner. Not implemented.

No overlap reserve was consumed and no new lifetime state introduced.
Checkpoint5 now merges current main and verifies the combined candidate.
