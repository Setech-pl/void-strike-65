# Test debt part 2

Worktree only: codex/test-debt, HEAD b6bf627; current main 4e84bc4. Both trees are 66ee6e04b70b87a8ff510c4ebd7d8bc0fe53271e. Git merge failed writing ORIG_HEAD.lock in linked metadata; content was already identical. No merge or task commits are claimed.

The 119 former unknown unit failures are grouped below, together with the already known preview defect (120 total). All 120 reproduced in the focused baseline: 0 pass / 120 fail. The previous full baseline at this identical game tree is 1528 pass / 120 fail / 4 skip.

Raw full after: 1625 PASS / 18 FAIL / 4 SKIP. Seven §BR expectations were corrected (7 appear in the saved full-run failing section), and the complete runtime timing/trace/binding files were rerun (35 PASS, zero FAIL), audited after: **1632 PASS / 11 FAIL / 4 SKIP**, 1647 tests. This is not a release-ready result.

| Group | Root cause | Fix class | Before unit | After unit | Representative first change |
| --- | --- | --- | ---: | ---: | --- |
| G1: Linked layout and source ownership snapshots | Assertions pin pre-L1/L2/M3-H byte counts, table offsets or inline owners although accepted code/data now occupies different linked records. | stale expectation | 36 | 0 | 0285cd5 |
| G2: M6 compact HUD and lance-lock contract | Tests read old HUD columns/glyph rows or require launching into an empty column; M6 compact fields and §BO intentionally replaced those contracts. | stale expectation / obsolete | 15 | 1 | b79f667 |
| G3: Checked-load and late-publication fixtures | installRuntimeSegments now performs checked level/L2 setup, warming the level cache; boss late publication also requires a scanline and retains write hooks. | harness | 10 | 0 | 0285cd5 |
| G4: Ordinary booster fixture admits LIFE | The ordinary Rapid/Spread/Shield harness starts with a fresh LIFE latch, so its first expected booster becomes LIFE and runBurst sees state=0. | harness | 14 | 0 | b2261c9 |
| G5: Finite-capital and Heavy policy contracts | Fixtures assume 480-coordinate tables, frozen frame parity, small capital debris, no pre-capital clear fence or unchanged M3-H timelines; accepted policies changed all of these. | stale expectation / harness / obsolete | 25 | 1 | d7b764c |
| G6: Replaced inline boss-death path | The old inline chain/return-to-fighter cleanup and memory-writer inventory predate the accepted checked disk/DLI death engine. | obsolete / stale expectation | 4 | 0 | e97244c |
| G7: Historical evidence and release-bound artifacts | Committed traces, boot/menu captures, curve measurements, media and package evidence describe older ATRs; a normal pending build deliberately supplies no fresh DMA-on measurements. | needs milestone release trace | 8 | 8 | 12d35c1 |
| G9: Normal pending evidence treated as measured | Legacy unit expectations copy historical DMA-on measurements into a normal pending manifest, contrary to accepted §BR. | stale expectation | 7 | 0 | 12d35c1 |
| G8: Preview canvas clipping (known tool defect) | The static preview allocates 24×8 rows while the fighter initial Y moved beyond that canvas; changing player_shape therefore leaves the image unchanged. | real defect (tool) | 1 | 1 | effe71c |

G7 additionally carries **32 recorded native assertions**, split into boss completion (8), pickup (5), contact coverage (4), capture/restart (14), and DLI (1). Their after status is **pending milestone reproduction**, not 32 newly measured failures or passes. The ledger's first observations already reproduced on 5053697; their actual introduction is not established by the old snapshots.

## Bisection and limits

Binary bisects execute candidate builds and an unchanged sample harness: LIFE resolves to b2261c9; the collision oracle resolves to 5bc8d51. Source bisects execute an isolated exact source assertion or an equivalent scalar contract, avoiding unnecessary full builds; each method is distinguished in groups.json and the retained logs. A source-contract first change is not claimed as a historical all-suite failure count. Members share the helper/contract; unrelated secondary assertions are not assigned the sample's commit without proof.

The preview visibility predicate resolves to effe71c: initial player Y minus PMG top is outside the fixed 192-pixel canvas. Checked setup begins at 0285cd5; the late frontend chain at c77ebba; the replaced death target at e97244c; Heavy descent at d7b764c; the two-frame fence at a4e1197; and §BO no-target waiting at d165927.

## Changes and expectation audit

Only test files and the host diagnostic pickup harness changed. No src/, cfg/, asset, build algorithm, native clause predicate, timing threshold or canonical runtime measurement changed. The booster harness sets the once-per-level LIFE latch only to isolate ordinary booster cycles; LIFE-specific fixtures remain independent. Cold START GAME fixtures invalidate the level magic after setup, so real level reads and corrupt-image rejection run again. Late boss publication is given its scanline and retains write hooks.

Exact snapshot changes, each with a one-line accepted-change justification, and all manual old/new expectation hunks are in [expectation-audit.json](expectation-audit.json). No measured hash was substituted. The five-byte lance reserve remains an inequality protecting at least five bytes.

Retired cases have explicit source comments and replacement coverage: blanket no-armour rule → heavy-package profiles; inline boss chain / pre-takeover win cleanup → boss-death checked teardown and 175 ticks; fixed no-steering side lanes → slalom proof plus fatal pixel-mask sweep; old natural-capital scene requiring small debris → current BROADSIDE lifecycle/raster tests and registered native routes. §BO's no-target test was rewritten rather than removed.

## Remaining and new failures

Every remaining member retains its before/after first assertion, first message, failing helper and required artifact in [groups.json](groups.json). Native assertions keep their exact session/message and original evidence links. Runtime and tool discrepancies are described separately in [defects.md](defects.md); no production fixes are included.

Unexpected failures outside the original set or explicit replacements: **0**. See groups.json for the raw list; any full-run harness self-resolution is recorded separately below.

## Delivery

Git writes remain sandbox-blocked; the owner must merge main to record ancestry and commit. Suggested logical chunks: ordinary-booster/cold-load fixtures; accepted layout/HUD/policy expectations and obsolete cases; grouped debt registry/report. No push, merge acceptance, owner smoke or release certification is inferred. CPU/RAM/residency delta of the game: zero; no production source changed.

## Exact assertion audit

By name and first assertion/message against the reproduced baseline: **9 unchanged failing tuples, 2 moved predicates, 109 cleared, zero new failing names**. The two moves are explicit in [tuple-audit.json](tuple-audit.json): corrected level-layout expectations reach historical boot evidence; the corrected independent raster premise reaches the NMOS collision mismatch, also reproduced on main by binary comparison. Audited A/B/C by baseline case: **A11/B0/C109**; no first-assertion move is hidden as an exact match. Remaining registry reconciliation: **11 matched / 0 added / 0 moved / 0 disappeared**.

The raw full run is retained unchanged; final §BR policy checks ran across all 35 runtime timing/trace/binding tests. Strict release rejection of stale evidence remains covered. A final non-win laser-cleanup fixture check passed 1/1 after removing an unused temporary branch. No second green full run is claimed.

Complete bisect commands/probe sources/logs are preserved in [bisection.json](bisection.json), with a separate runtime/content/tool [defect write-up](defects.md). The native observations' introduction commits cannot be derived from stale recorded captures; 5053697 is a reproduced baseline, not an invented first-bad revision.

Final edits after verification only clarify test descriptions and remove an unused loop tuple; the affected suppression fixture passed 1/1 again.

## Cleanup and artifact

Before cleanup (`du -sh`): task `.cache/test-debt-part2` **42M**; entire worktree `.cache` **43M**. After cleanup: task **684K**; worktree `.cache` **1.6M**. Diagnostic directory was **444K** before this final note. Only final test/build/bisect/reconciliation logs remain in the task cache. Both private comparison repositories, temporary scripts, copied fixtures and temporary test roots were removed. The other task cache and worktree node_modules were left intact. No persistent browser, server or emulator was started; all owned test/comparison commands finished.

`df -h /System/Volumes/Data` before and after cleanup: **926Gi total / 515Gi used / 387Gi available (58%)**. Retained task evidence is well below 200 MB. Standard worktree build outputs already existed before this task and were retained; the private comparison builds were removed.

Unchanged normal-build ATR: `build/play/test-debt-part2/void-strike-65.atr`; SHA-256 **e777080b16f95c29d0da9fff16f0f444c3790a91ef87e4fac178c3908a24ef3a**, matching part 1. Distribution files were restored to their initial tracked bytes. No src/, cfg/, assets/ or dist/ diff remains. No new PAL timing or real-hardware smoke is claimed; identical game bytes imply zero game CPU/RAM/residency delta.

Accepted contract references justify the expectation changes; pinning the merged main snapshot does not promote any pending owner-smoke candidate. The canonical trace and all 32 native predicate records remain unchanged. `git diff --check` passes. Branch/HEAD remain **codex/test-debt / b6bf627**; current main remains **4e84bc4**, with the same tree. The owner must record the ancestry merge and logical task commits because sandbox metadata writes are blocked.
