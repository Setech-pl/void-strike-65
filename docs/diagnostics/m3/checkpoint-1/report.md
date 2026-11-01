# M3 checkpoint 1 — OWNER-SMOKE CANDIDATE

Main `4e84bc4` merged as `a6f3476`; documentation-only conflicts preserve
both sets. Git writes work. Owner policy: per-level looks, optional M7
regional presets, C-skin separately at4 with64-B content free-floor/L2
fallback. Only checkpoints1–2 are authorized now.

Checkpoint1 implements guarded content-home state, straight/finite path
records, successful-admission initialization, escort clearing and a resident
archetype fallback. C decides movement/fire/retirement; existing ASM renders.
The shared180-B wave-arm entry and Heavy metadata stay fixed. LEVEL_PATHS
aliases the existing96-B payload, without extra image/RAM capacity. No-path
Wingman and Interceptor decisions/positions/cadence/loops equal main for380
frames. Invalid-home entries perform no home reads; token/appearance priority
and existing Heavy departure remain unchanged.

| Home | Actual | Delta vs main | Full M3 plan budget for addition |
| --- | ---: | ---: | ---: |
| Content | 1,491/1,920 B (429 free) | +368 (356 code +12 state) | +732 B |
| Window | 2,384/2,811 usable B (427 free) | +82 | +224 B; target≤300 |
| L2 | 1,290 B;246 usable free,256 reserve | 0 | 0 |
| Arena /Director high | 830/324 B | 0/0 | 0/0 |

Initial content12,865 B unchanged; transport214 sectors (+1), window record16
(previous15). Content still15 sectors, no added content read. [Resources](resources.json).
C-skin is not implemented or placed before full M3 is compiled.

Normal computed gates PASS. Focused path +Heavy-package +generated-map set
**16/16 PASS**. Original wider focused set27 PASS/2 FAIL: one obsolete15-sector
Heavy-package pin corrected to M3's planned18-sector bound and passes rerun;
T13 star-writer assertion is shared main debt. No behavior gate was relaxed.
Task-wide full-suite A/B/C is completed after checkpoint2 against isolated main.

Native Atari800 PAL DMA on:

| Route | Frames | Worst cycles |
| --- | ---: | ---: |
| Spread NORMAL | 1,800 | 30,465 |
| capital-960 NORMAL | 3,967 | 31,156 |
| level2 debug index4 (Heavy sector; see correction below) | 600 | 30,832 |
| corrected straight route, index3, immutable149bb7f (measured during2) | 600 | 31,708 |

All focused reports pass, zero timing/phase/stale-access anomalies. Boss
entry325≤350. Worst31,156: hard margin1,412. Whole C path tick maximum528
cycles (includes appearance/fire decisions, no ASM render/DMA); no-path
hook costs70–71 per free Light. These component figures are report-only,
not comparisons to an identical old prototype without its fire tail.
[Native/CPU JSON](quick-960.json), [straight run](straight-native.json).
No full native/home matrix, release trace, strict release or boot gauntlet.

Checkpoint ATRs (baseline for the next checkpoint, not owner acceptance):

| `build/play/m3/checkpoint-1/` | SHA-256 |
| --- | --- |
| `campaign.atr` | `71cc98f080cb1f3eea041d953e0df31a06e314c0dd6c7eaaee88403343e71941` |
| `straight.atr` | `4e1c903da65e37f07783df11c5c52e6db593a9a66616f06790c1f37b1027c687` |

Verification finished before its commit; continue only to authorized2, then
stop for owner smoke. Final task audit records cleanup and full tests.

**Coverage correction during checkpoint2:** the CLI sector index is zero-based.
The600-frame route above started at human sector5, not the straight path in
sector4. Its timing is valid for that Heavy route but does not prove native
straight-path coverage. Linked straight tests were valid. Checkpoint2 repairs
the native fixture to start at index0 and explicitly checks live-Light
coverage; its report supersedes the original straight-route claim. The same
mistake in the first checkpoint2 diagnostic run was discarded, not counted.
The corrected600-frame run of immutable149bb7f has1,637 live Light slot-frames,
no misses/extra VBI/DLI/deadline failures, and31,708 maximum (208 above target,
860 below hard gate). [Corrected evidence](straight-native-corrected.json).
This supersedes the earlier31,156 whole-checkpoint worst figure; the two quick
route maxima themselves are unchanged.
