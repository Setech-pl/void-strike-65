# M3 checkpoint3 — BLOCKED_CONTENT_BYTES

Historical first draft (2026-10-31). The2026-11-01 same-home compaction
reduces the blocker to83 B; [current report](compact/report.md).

Owner smoke of checkpoint2 `742b80e` **PASSED**. This is now the accepted
baseline. The owner authorized3 (fire envelopes),4 (chains/pilot) and C-skin
as its own commit, with an explicit STOP if3/4 overflow content before any
relocation. Git writes work. Only this worktree was used.

The first complete C draft of3 hit that byte gate. **Required2,124 B against
1,920 B:204 B over**. This is a measured failure of this draft, not proof that
all possible C implementations are too large. No code was moved to L2/window,
no capacity/assert was enlarged, and no accepted fire mode was dropped.
The draft is preserved as [unverified experimental patch data](attempt.json)
and production sources were restored byte-for-byte to accepted742b80e.
Checkpoint3 is not implemented/delivered;4 and C-skin were not started.

## Exact measurement

Fresh normal build of742b80e passes; content1,800, window2,384, L2 1,290 B.
Draft: shared ready-only snapshot at64-frame opportunities, one existing event
token, a frame-stamped membership mask, late-admission clearing, segment hold-
fire, inclusive±4 HPOS column check and combined mode. WaveDef bits6/7 are
contextual only for path Lights; no-path/escort loops retain their meaning.
All new runtime code/data were assigned CONTENT_CODE/DATA. These policies
were compiled/assembled, **not run or behaviorally certified**.

| Resource | Accepted2 | Draft3 requirement | Delta |
| --- | ---: | ---: | ---: |
| Content code | 1,753 B | 2,071 B | +318 B |
| Content data/table | 46 B | 52 B | +6 B |
| Content header | 1 B | 1 B | 0 |
| Content total /1,920 | 1,800 B | **2,124 B** | **+324 B** |
| Window /2,811 usable | 2,384 B | 2,384 B (unchanged segments) | 0 |
| L2 /1,536 usable | 1,290 B | 1,290 B (unchanged segments) | 0 |

The normal link reports `CONTENT_CODE` alone over by152 B, then fails
`Content home overflow`. Adding initialized data52 B gives the complete
**204-B** shortfall; required end-exclusive would be `$19CC`, beyond `$1900`.
No overflow image was linked or run. Existing L2 remains untouched.

Exact size proof uses ca65's listing of the generated lifecycle module,
without linking elsewhere: CONTENT_CODE grows `$3C3→$501` (318 B); its
CONTENT_DATA `$11→$17` (6 B). Unchanged other objects contribute790 code B
and29 data B, plus1 header B: `1+790+1281+29+23=2124`.
New helpers: column28 B, volley preparation185 B; reset+10, escort clear+14,
path tick+81 B. [Machine-readable accounting](bytes.json),
[normal-build byte failure](build-failure.log). Existing96-B level payload,
DFMC layout and all memory reservations were not enlarged.

The full M3 content budget1,855 B is already exceeded by269 B in this draft;
physical fit needs204 B recovered, not merely a rebase of that estimate.

## Bounded alternatives from plan §3

All three need an owner choice before further implementation. No alternative
has been implemented or measured as a final fit.

| Option | Player-visible behavior | Bytes /homes | CPU /limitations /risk |
| --- | --- | --- | --- |
| **A — compact/deduplicate C in the same home (recommended)** | Retain all Q5A fire modes and chains/pilot scope | Recover **at least204 B** from this draft; content≤1,920. Minimum recovery leaves0 B free; window2,384 and L2 1,290 unchanged. C-skin still obeys its separate64-B floor/L2 rule | Compaction may reduce repeated tests/calls; actual CPU change unknown. Preserve C ownership, ready snapshot/token/pool semantics and phase guards. Fit is unproven; do not promise204 B before compiling |
| **B — authorize fighter-only policy in guarded L2** | Retain all modes; new cross-home ABI/guard work | Column+volley helper bodies total **213 B** measured. Arithmetic only: content**1,911** (9 free), L2**1,503** (33 usable free), before extra guard/ABI bytes. C-skin32–48 B would consume that remainder;48 would exceed usable L2 by**15 B** even before additional guard cost | Extra guard/call cost must be measured; no native timing claim. Needs further code savings/placement pricing for4/C-skin, existing256-B protected L2 reserve stays protected. This is not a compiled relocation fit |
| **C — split optional modes into an owner-reviewed follow-up** | Deliver segment hold-fire+column first; volley and combined explicitly deferred | **ESTIMATE** content1,840–1,860 B (40–60 new column code B), window/L2 unchanged; no pulse state. C-skin still conditional | Column roughly30–70 CPU/eligible member, not measured. Removes group-snapshot/emission peaks in the interim. Changes accepted V1 scope; cannot be selected silently |

Draft CPU was not measured because the link failed. For pricing only,
column30–70 CPU/eligible member and four-slot snapshot roughly700–1,100 per
64-frame opening are ESTIMATES, before ordinary emission80–160/shot and
ongoing projectile work. Do not add those estimates to old route maxima.
A legal fit must then measure the actual3-Light path/volley frame and both
registered quick routes before committing checkpoint3 as a candidate.

C-skin's placement is **not decided**: compiled3/4 do not exist. Conditional
L2 approval for C-skin does not authorize moving the fire evaluator now.
Per-level skins remain the accepted policy. B-shot, independent hues, Bomber
skins and Bomber shot re-skin stay DEFER. Chains/pilot remain authorized but
blocked behind3, not silently dropped.

## Validation and handoff

Baseline normal computed gates PASS; draft normal build FAIL at the mandatory
byte gate. Generated C passed the build's software-stack/scratch check and
assembled; standalone size measurement uses the same generated C. No full
npm suite, native quick frame or3-Light volley run follows this hard stop.
There is **no fresh quick/volley maximum** and no checkpoint4 play ATR.
Checkpoint2's historical quick worst31,156 /path review31,663 and its A120/
B0/C0 audit remain reference evidence only; the owner has now smoked2 PASS.

Only acceptance/blocker documentation and diagnostic evidence are committed.
`build/play/m3/checkpoint-2/` is preserved. **NEXT TASK: owner resource/scope
choice A/B/C; STOP.** No relocation, further checkpoint, merge, push or release.

## Cleanup

[Evidence](cleanup.json): own task cache180K→48K, whole worktree
`.cache`2.3M→2.1M; generated `build`5.6M→672K. Disk free before/after
`df -h /System/Volumes/Data`:411Gi/411Gi. Existing checkpoint2 play ATRs,
prior task caches and worktree node_modules remain intact. Generated assembly,
measurement script and own build outputs were removed; only logs/JSON remain
in the task cache. No emulator/server/browser/port was started; all own build/
measurement processes finished. Retained proof is below200MB.
