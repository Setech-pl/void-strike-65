# Same-home M3 fire compaction — BLOCKED_CONTENT_BYTES

2026-11-01; branch `codex/m3-plan`, starting HEAD `4452d3c`.
Owner repeated continuation authorization for3/4 and the byte STOP condition.
The agent tried the previously recommended same-home C compaction within that
placement scope; no approval for L2 fire-policy relocation or splitting modes
was inferred. Git writes work. Checkpoint2 remains OWNER-ACCEPTED.

**Compacted draft requires2,003/1,920 B:83 B over.** It saves121 B against the
first draft2,124 B/204 over. This version still cannot be delivered; the
mandatory content fence rejected it. No home was enlarged, no fire mode was
dropped, no policy was moved to another home and no overflow image was run.
The attempted source is preserved in [attempt.json](attempt.json), then restored
to the accepted production baseline.4/C-skin were not started.

## Exact accounting

| Resource | Accepted2 | First3 draft | Compacted3 draft |
| --- | ---: | ---: | ---: |
| Content code | 1,753 | 2,071 | **1,946** |
| Content data/compiler reservations | 46 | 52 | **56** |
| Content header | 1 | 1 | **1** |
| Content total /1,920 | **1,800** | **2,124** | **2,003** |
| Window /2,811 usable | 2,384 | 2,384 | 2,384 |
| L2 /1,536 usable (+256 protected) | 1,290 | 1,290 | 1,290 |
| Arena /832 | 830 | 830 | 830 |

Baseline normal build PASS. Compacted normal build FAIL. The final link warns
`CONTENT_CODE` alone is27 B over, then fails `Content home overflow`. Complete
size includes56 B data:27+56=83 over, end-exclusive `$1953` beyond `$1900`.
The full M3 content budget1,855 is exceeded by148 B.

ca65 listing: lifecycle CONTENT_CODE `$3C3→$484` (963→1,156 B), with other
objects'790 unchanged code B; CONTENT_DATA `$11→$1B` (17→27 B), plus other
objects'29 B. Total `1+790+1156+29+27=2003`. Compared with the first draft,
code shrank125 B and compiler reservations added4 B: net121 B saved.
[Exact sizes/helper offsets](bytes.json), [normal link failure](build-failure.log).

Compaction shares player targeting/fire eligibility, uses one checked Y sum
for both vertical exits before publication, shares retirement, expresses
lateral steps with one legal-X range check, and preserves the mirror bit by
bounded relative-index arithmetic. Inactive path markers make old timers dead;
admission initializes each live timer. All Q5A modes,64-frame opportunities,
ready-member snapshot/token and late-admission mask clearing remain in the
draft. These changes were compiled/assembled, **not behaviorally verified**.

Two expressions initially generated forbidden ptr1/software-stack helpers;
scalar C intermediates repaired them before byte pricing. The first compact
link also exposed4 compiler-generated temporary words in the arena's default
read-only segment (not an authored lookup table). Only the M3 read-only segment
annotation was corrected to CONTENT_DATA to obtain complete intended-home
accounting. No gameplay edits or relocation followed that byte failure. The
subsequent measurement link above confirms the content-only blocker and
unchanged arena. No source-generated assembly was hand-edited.

## Updated §3 alternatives

None is implemented or a certified final fit.

| Option | Behavior | Bytes /homes | CPU and risk |
| --- | --- | --- | --- |
| **A — another C compaction pass in content** | Retain all accepted modes | Recover **≥83 B** more; at minimum recovery content1,920 leaves0 free. Window/L2 unchanged | Savings and CPU delta unproven. Keep C ownership and snapshot/phase semantics; do not weaken gates to fit |
| **B — authorize guarded L2 for volley preparation (recommended next scoped experiment)** | Retain all modes | The compacted snapshot helper body is **131 B** measured. Arithmetic before guards/ABI: content**1,872** (48 free); L2**1,421** (115 usable free). A48-B C-skin would leave**67 usable L2 B** before guard/integration overhead;256 reserve stays protected. Allow16–32 window B for guards/ABI as an ESTIMATE | New cross-home exports/ABI and the existing L2 validity guard need integration and measurement. C-skin is separately compiled/smoked later. These numbers are body-only arithmetic, not a relocated build or placement decision |
| **C — explicitly split volley/combined into a later checkpoint** | Keep segment permission and column first; volley/combined deferred | ESTIMATE content**1,780–1,820 B** using this compacted path core without pulse state/group logic; window/L2 unchanged | No compiled fit. Changes accepted V1 scope and requires owner approval; no silent deferral |

B's arithmetic clears the83-B shortfall while retaining all modes and leaving
room for the estimated C-skin helper. It still requires an owner placement
decision and a compiled/guarded/native proof. Conditional L2 approval for
C-skin does **not** authorize moving fire policy there now.

CPU is NOT MEASURED: no valid linked image exists. Approximate pricing only:
slot eligibility40–130 CPU/member, group snapshot500–1,000 per opportunity,
existing emission80–160/shot, plus ongoing projectile work; a new guarded
entry roughly20–50 instruction cycles. Common target calculation also adds
ordinary path work while common checks remove duplication. Do not add these
estimates to old wall peaks or claim a frame gate from them.

## Verification and stop

Fresh baseline normal gates PASS; draft fails the byte gate. C scratch-state
checks pass after the scalar repair, and generated C assembles. No full npm
suite, quick native or3-Light path/volley test follows the hard byte stop.
**No fresh quick maximum/volley maximum exists, and no checkpoint4 ATR exists.**
Accepted2's previous quick worst31,156/path review31,663 are historical only.
Its owner smoke PASS remains recorded. Production source/config/assets/dist
are byte-identical to task-start4452d3c; only documentation/evidence commit.
Existing checkpoint2 play ATRs are preserved.

**NEXT TASK: owner resource/scope decision A/B/C; STOP.** No relocation,
checkpoint4/C-skin work, merge, push or release is inferred.

## Cleanup

[Cleanup proof](cleanup.json): own task cache144K→136K; whole worktree
`.cache`2.3M→2.3M; generated `build`5.6M→672K. `df -h /System/Volumes/Data`
available431Gi before/after. Retained only measurement/build logs in the task
cache, plus committed diagnostic MD/JSON/failure log, below200MB. Prior task
caches, checkpoint2 play ATRs and worktree node_modules are untouched. All own
build/measurement processes finished; no emulator/server/browser/port started.
