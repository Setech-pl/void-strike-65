import fs from 'node:fs';import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p));
const proof=read('docs/diagnostics/capital-slalom/proof.json'),bytes=read('docs/diagnostics/capital-slalom/bytes.json'),contact=read('docs/diagnostics/capital-slalom/contact.json');
const before=read('build/slalom-native-main/results.json'),after=read('build/slalom-native-fixed/results.json');
assert.equal(before.length,12);assert.equal(after.length,12);assert.equal(contact.mismatches,0);assert.equal(proof.status,'PASS');
assert.equal(read('docs/diagnostics/capital-slalom/space-comparison.json').identical,true);
for(const r of [...before,...after]){assert.ok(r.peak<=32568&&r.bossEntryFrames<=350);for(const k of ['misses','extraVbi','dliErrors','shifted','staleL2Events','clockMismatches'])assert.equal(r[k],0);}
const artifacts=read('build/play/slalom/builds.json');assert.equal(artifacts.length,4);
for(const length of [480,960])assert.ok(after.filter(r=>r.length===length).every(r=>r.artifact===artifacts.find(a=>a.name===`capital-${length}`).sha256));
const lengths=[288,352,416,480,960],selected=proof.results.filter(r=>lengths.includes(r.hullRows));
const seq=['| Hull rows | Island index (1-based) | Side | Default centre cell / HPOS | Tight centre cell / HPOS | Local rows (inclusive) |','| --- | --- | --- | --- | --- | --- |'];
for(const n of lengths){const normal=selected.find(r=>r.pattern==='slalom'&&r.hullRows===n),tight=selected.find(r=>r.pattern==='slalom-tight'&&r.hullRows===n);for(const [i,s]of normal.spans.entries()){const t=tight.spans[i];seq.push(`| ${n} | ${i+1} | ${s.side} | ${s.centreCell} / ${s.centreHpos} | ${t.centreCell} / ${t.centreHpos} | ${s.start}–${s.end-1} |`);}}
const pt=['| Pattern | Rows | Difficulty | Minimum total travel HPOS | Largest witness shift HPOS / shortest window rows | Minimum largest passage HPOS | Speed margin |','| --- | --- | --- | ---: | --- | ---: | ---: |',...selected.map(r=>`| ${r.pattern==='slalom'?'Offset':'Tight'} | ${r.hullRows} | ${r.difficulty} | ${r.minimumTravelHpos} | ${r.maximumAnyWindowShiftHpos} / ${r.shortestWindowForMaximumShiftRows} | ${r.minimumLargestChannelHpos} | ${r.speedMargin}× |`)];
const rows=before.map(b=>({before:b,after:after.find(a=>a.id===b.id)})).sort((a,b)=>a.before.length-b.before.length||a.before.difficulty-b.before.difficulty||Number(a.before.brake)-Number(b.before.brake));
const nt=['| Rows | Difficulty | Route | Capital peak | Full-route max | Frames >31,500 | Minimum fighter fence | Boss entry frames |','| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |',...rows.map(({before:b,after:a})=>`| ${b.length} | ${['EASY','MEDIUM','HARD'][b.difficulty]} | ${b.brake?'brake/contact':'flight/contact'} | ${b.capitalPeak} → ${a.capitalPeak} | ${b.peak} → ${a.peak} | ${b.targetOverruns} → ${a.targetOverruns} | ${b.fenceMargin} → ${a.fenceMargin} | ${b.bossEntryFrames} → ${a.bossEntryFrames} |`)];
const atr=['| Absolute ATR path | SHA-256 | Description | Launch |','| --- | --- | --- | --- |',...artifacts.map(r=>`| ${r.path} | ${r.sha256} | ${r.description} | \`${r.launch}\` |`)];
const max=Math.max(...after.map(r=>r.peak)),cap=Math.max(...after.map(r=>r.capitalPeak)),target=after.reduce((s,r)=>s+r.targetOverruns,0),fence=Math.min(...after.map(r=>r.fenceMargin));
const section=`OWNER SMOKE CANDIDATE

# Continuation completed — 2026-10-26

The owner resolved the centre-first blocker by allowing left/right starts below
328 rows and defining the straight-flight criterion as a **16-HPOS ship plus
4 HPOS margin**. Both patterns now pass at **all 85 legal lengths**, including
288; no length is excluded. Normal builds and computed gates pass. Owner smoke
and real-hardware acceptance remain pending. No merge, push, tag or release.

Preflight: correct worktree and branch, clean tree, log
\`3609f02 [codex] Record short-hull centre-first slalom gate blocker\`.
Baseline main is \`bf4d410\` (§BY). Runtime implementation is \`e2bd1ff\`;
subsequent changes are tests, diagnostics and documentation. All commands ran
inside this worktree. The private emulator is \`build/slalom-atari800\`, copied
with links dereferenced and reconfigured locally. Owner symlinks were only read.

## Sequence and representation

**Offset Weave** is the default; **Tight Weave** is the sole harder variant.
Below 328 rows the sequence is left/right. From 328 rows it starts centre,
then alternates left/right; it never places two islands on one row. The complete
runtime lookup remains 120 bytes. There is no Director RNG.

${seq.join('\n')}

Cell coordinates use screen cell zero at HPOS 48. X is the recipe's **centre**,
not its left edge. Universal source row = local row + 960 − hull length.
Recipes cycle 01/03/05 and colours alternate allied/enemy. Maximum plate widths
remain EASY/MEDIUM/HARD **24/32/40 HPOS**; no new glyph or collision shape.

For every length 288–320: first 96, height 24, spacing 88. For 328–424:
first 64, height 24, spacing 88. For 432–960: first 96, height 48, spacing 112.
Every clear gap is at least 64 rows and the final 64 rows are clean. The compiler
rejects unknown fields/enums and manual placement overrides on slalom patterns.
Legacy salvage remains supported. See [authoring](../level-authoring.md).

Tight Weave moves side islands inward from ±20 to ±16 HPOS. An exhaustive
four-HPOS-grid check rejects offsets 0/4/8/12: they retain a straight 20-HPOS
edge band. Thus ±16 is the most inward passing translation with the unchanged
art/widths and sequence. Its EASY side-plate passage is 48 HPOS versus 52 for
the default; neck rows necessarily have wider passages. “As narrow as allowed”
does not mean an artificial 20-HPOS corridor at every row: fixed island widths
cannot produce that. [Tightness enumeration](../diagnostics/capital-slalom/tightness.json).

## Byte ledger and execution cost

All figures below are **MEASURED**, except the explicitly labelled arithmetic
contingency. No resident/shared runtime or \`src/main.s\` change was made.

| Item | Main | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Linked L2 contents | ${bytes.mainBytes} B | ${bytes.candidateBytes} B | +${bytes.deltaBytes} B |
| Slack below unchanged 1,536-B gate | 344 B | ${bytes.remainingBytes} B | −58 B |
| Untouched post-1.0 reserve | 256 B | 256 B | 0 |
| Runtime lookup | 120 B | 120 B | 0 |
| Level image | 2,048 B | 2,048 B | 0 |
| Resident/shared source changes | 0 B | 0 B | 0 |
| Boot/chunk occupied sectors | 211 | 211 | 0 |

L2 ends at $1DE1 inclusive. The new helper is 54 B and scratch is 3 B; the
pixel motif compare grows 1 B. The prefix grows 11 B absorbed by existing
alignment padding. Recipe tables and all C function addresses stay fixed.
An initial inline link measured 1,452 B; moving the same helper after the
existing C/cold tail recovered 202 B, resulting in 1,250 B. No reserved space
or gate was changed. The helper call/return adds 12 CPU cycles per occupied
interval versus the inline trial, included in the contact/native measurements.
[Linked ledger](../diagnostics/capital-slalom/bytes.json).

Two-times the measured net addition is **116 B** (arithmetic contingency,
not a second measurement), still within the original 344-B slack. No GUESS
was needed for the delivered byte count. Header bytes $AD03–$AD07 encode the
placement magnitude/table; lookup tag bits 6..7 select it. This is not data-only:
ASM L2 applies the data offset to interval and both motif selectors, and widens
its existing broad reject. High-level C, damage, lifecycle, brake and warning
policy are unchanged. The exact §BY pixel-contact algorithm is unchanged.

Bounded linked contact sweep maximum: **${contact.maxCpu} CPU cycles**, DMA off,
not a frame-time estimate. No VBI/DLI work is added. **SPACE: all 720 complete-loop
fixtures are identical, CPU delta 0**. The reserve, C ABI, protected areas,
PAL hard gate 32,568, target 31,500 and boss-entry limit 350 are unchanged.

## Host proof

[Full results](../diagnostics/capital-slalom/proof.json): **${proof.cases.toLocaleString('en-US')}
row/alignment/difficulty cases**, both patterns, every multiple of eight in
288..960. The model uses the complete solid interval (conservative relative to
real glyph holes), all 15 ship scanlines and all eight fine alignments, inside
the guaranteed [84,172) hull corridor. A 20-HPOS envelope encloses the visible
16-HPOS ship with the required 4 HPOS margin. The eight alignment domains are
intersected before path finding, so the witness is valid across fine changes.

Passability uses that conservative envelope. Absence of straight bands is
also checked independently against **actual published glyph pixels**, for
all recipe/colour pairs on both sides, both offsets and all difficulties;
this avoids using an over-approximation to claim a nonexistent straight route.
The shifted exact-contact oracle executes **${contact.total.toLocaleString('en-US')}
cases**, all designs/colours/difficulties, eight fine alignments and plate/neck
transitions: **zero false positives and zero missed contacts**.

Minimum travel is an exact host dynamic-programming result on the actual even-HPOS joystick
grid. A second search constrained to at most two HPOS per world row finds
the **same minimum total travel**. The largest shift/window columns describe
that minimum-travel witness, not a claim that every optimal path has identical
window timing. Per-window maxima at 1/8/16/32/64/112 rows are in the JSON.

${pt.join('\n')}

The world advances 16/40, 18/40 and 20/40 character rows per frame on E/M/H;
ship lateral speed is 2 HPOS/frame. The witness needs at most two HPOS per row:
average required speed ≤0.8/0.9/1.0 HPOS/frame. Even the fastest row cadence
leaves at least two host gameplay frames between row advances, so the bound
is **1 HPOS/frame and 2× margin on every difficulty**. EASY meets the
required 2× margin. Braking only increases time available. These are sufficient
witness-speed bounds, not measurements of an optimal minimum speed.

**EASY is geometrically clearable without firing**; no proof step removes an
island or assumes a weapon. Avoiding hostile fire still requires owner play.
A deliberate distinction: the approved criterion removes straight **20-HPOS**
bands. It does not rule out every zero-margin 16-HPOS slit. On EASY the short
default has a 16-HPOS central slit; Tight Weave has 16-HPOS outer slits. These
fail the required extra clearance, but a pixel-perfect straight flight without
that margin is not claimed impossible. No proof threshold was weakened.

## Native comparison

Fresh main → candidate, native Atari800 PAL, DMA on. Same 12 diagnostic routes,
including host-held lives exactly as on main; these are not release evidence.

${nt.join('\n')}

Every route on both builds: **missed frames / extra VBI / DLI errors / shifted
rows / stale L2 / world-hull mismatch = 0 / 0 / 0 / 0 / 0 / 0**. Candidate capital
peak ${cap}; full-route max ${max}; hard-gate margin ${32568-max}; frames above
target ${target}; global minimum fighter fence ${fence}. Every route reaches
phase 968 and boss entry stays within 350 host frames. Both trace reconciliations
PASS with zero NEW/MOVED failures. [Comparison](../diagnostics/capital-slalom/native/comparison.json).

Raw baseline captures are retained in build/slalom-main-480 and
build/slalom-main-960; candidate captures in build/level-1-s1 and
build/l2-capital-960. Clock/lifetime files are in build/slalom-native-{main,fixed}.
The private observer binary was prepared on main and reused for candidate
runs; each session loads its own symbols and checked ownership images.

## Builds, tests and ATRs

Normal builds pass with the expected stale release-evidence WARNING; release
build would fail until its separate evidence refresh. No release build,
full npm test or boss stress was run. Focused suite **11/11 PASS**, shifted
contact **zero mismatches**, host proof **PASS**, memory-map check **PASS**.
Logs are retained under [logs](../diagnostics/capital-slalom/logs/).

Paths, SHA-256, descriptions and launch commands were printed immediately after
each normal build and recorded in [play.md](../diagnostics/capital-slalom/play.md).
All four images allow difficulty selection in OPTIONS. Direct 480/960 default
hashes match all six corresponding native runs. Tight Weave uses a documented
build-time level-data substitution through the normal compiler and gates; its
image is retained in build/slalom-tight-480. The 12-route matrix covers the
default; both variants have host/raster/contact coverage.

${atr.join('\n')}

## Owner smoke and deviations

- No straight 20-HPOS band works; assess the disclosed zero-margin slits separately.
- EASY is clearable without firing and weaving feels fair.
- Island edges still hurt; wait **more than five seconds after respawn**.
- Brake and the 35-frame bottom warning are unchanged.
- Verify 65XE/SIO2SD timing on real hardware.

The speed proof was tightened during review from a one-HPOS mathematical grid
to the actual two-HPOS joystick grid. The final proof retains the same minimum
travel and reports a conservative 2× margin, superseding the earlier 4× update.

The initial SPACE fixture attempt lacked the dist-output redirection and
rejected a baseline ATR/manifest mismatch before execution. Rerunning with the
same normal-build routing produced the measured 720/720 comparison. An early
inline L2 assembly required local branch-range repair; no gate was weakened.
Both are diagnostic/setup iterations, not hidden runtime failures.

Phase 1's centre-first blocker is superseded by the owner's short-hull decision.
No hull length was stopped. No shared-code change, mine, bonus, dock, contact-rule
change, STATUS update or next-roadmap work was introduced. Player documentation
was updated in English and Polish; engineering documentation remains English.

**Owner questions / recommendation:** smoke Offset Weave first, then compare
Tight Weave on EASY. The current approved 20-HPOS criterion passes. If the intent
later becomes blocking every exact-width 16-HPOS line as well, treat that as a
new requirement; narrow art and the 288-row two-island limit need a new proof.
No further technical approval is needed for this candidate's present scope.

NEXT TASK: owner smoke; only the owner accepts and merges with --no-ff.

---

`;
const audit='docs/audits/2026-10-26-capital-slalom.md';const old=fs.readFileSync(audit,'utf8');
assert.ok(old.startsWith('BLOCKED_CENTRE_FIRST_ALL_LENGTHS'),'Avoid duplicating continuation');
fs.writeFileSync(audit,section+old);
fs.mkdirSync('docs/diagnostics/capital-slalom/native',{recursive:true});
fs.writeFileSync('docs/diagnostics/capital-slalom/native/comparison.json',JSON.stringify({measurement:'MEASURED Atari800 PAL, DMA on',rows},null,2)+'\n');
fs.writeFileSync('docs/diagnostics/capital-slalom/native/comparison.md',nt.join('\n')+'\n');
const play='docs/diagnostics/capital-slalom/play.md';fs.writeFileSync(play,fs.readFileSync(play,'utf8').replace('VALIDATION PENDING — normal builds, not yet a smoke candidate.','OWNER SMOKE CANDIDATE — normal builds and focused checks pass; owner smoke pending.'));
console.log('Audit written; OWNER SMOKE CANDIDATE.');
