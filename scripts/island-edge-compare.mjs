import fs from 'node:fs';import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p));
const before=read('build/island-edge-native-main/results.json'),after=read('build/island-edge-native-fixed/results.json');
assert.equal(before.length,12);assert.equal(after.length,12);
const rows=before.map(b=>{const a=after.find(r=>r.id===b.id);assert.ok(a);return {id:b.id,before:b,after:a};}).sort((a,b)=>a.before.length-b.before.length||a.before.difficulty-b.before.difficulty||Number(a.before.brake)-Number(b.before.brake));
const anomalies=['misses','extraVbi','dliErrors','shifted','staleL2Events','clockMismatches'];
for(const r of rows)for(const side of ['before','after']){for(const key of anomalies)assert.equal(r[side][key],0,`${r.id} ${side} ${key}`);assert.ok(r[side].peak<=32568);assert.ok(r[side].bossEntryFrames<=350);}
const table=['MEASURED native Atari800 PAL, DMA on. Each cell is main → fixed.','', '| Rows | Difficulty | Route | Capital peak | Full-route max | Frames >31,500 | Minimum fighter fence | Boss entry frames |','| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |',...rows.map(({before:b,after:a})=>`| ${b.length} | ${['EASY','MEDIUM','HARD'][b.difficulty]} | ${b.brake?'brake/contact':'flight/contact'} | ${b.capitalPeak} → ${a.capitalPeak} | ${b.peak} → ${a.peak} | ${b.targetOverruns} → ${a.targetOverruns} | ${b.fenceMargin} → ${a.fenceMargin} | ${b.bossEntryFrames} → ${a.bossEntryFrames} |`),'','Every route on both builds: missed frames / extra VBI / DLI errors / shifted rows / stale L2 / world-hull mismatches = **0 / 0 / 0 / 0 / 0 / 0**.',''];
fs.writeFileSync('docs/diagnostics/island-edge/native/comparison.md',table.join('\n'));
fs.writeFileSync('docs/diagnostics/island-edge/native/comparison.json',JSON.stringify({measurement:'MEASURED native Atari800 PAL',rows},null,2)+'\n');
console.log(table.join('\n'));
