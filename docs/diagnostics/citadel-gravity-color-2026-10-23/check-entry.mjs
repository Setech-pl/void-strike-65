import fs from 'node:fs';
import assert from 'node:assert/strict';
import {slotFWriteClause} from '../../../scripts/trace-clause-observers.mjs';
const base='build/boss-region-2-level-1-s6/';
const dir=base+'runtime-wall-trace/';
const labels=file=>new Map(fs.readFileSync(base+file,'utf8').split('\n').flatMap(l=>{
 const m=/^al ([0-9a-f]+) \.(\S+)$/i.exec(l);return m?[[m[2],parseInt(m[1],16)]]:[];
}));
const main=labels('void-strike-65.lbl'),boss=labels('boss.lbl');
const manifest=JSON.parse(fs.readFileSync(base+'manifest.json'));
const watch=JSON.parse(fs.readFileSync(dir+'observer-smoke-watch.json'));
const field=[['gravity_hooks','gravity_state','gravity_state','gravity_init']].map(([a,b,c,d])=>({codeStart:boss.get(a),codeEnd:boss.get(b),stateStart:boss.get(c),stateEnd:boss.get(d)}));
for(const [offset,operand] of [[7,1],[12,2]]) {
 const pc=boss.get('gravity_init')+offset,address=boss.get('gravity_hooks')+operand;
 field.push({codeStart:pc,codeEnd:pc+1,stateStart:address,stateEnd:address+1});
 const w=watch.slot_f.writers.find(w=>w.pc===pc);
 assert.equal(w.count,1);assert.equal(w.first_frame,w.last_frame);
 assert.equal(w.min_address,address);assert.equal(w.max_address,address);
}
const clause=slotFWriteClause([{...watch,session:'observer-smoke',bossEntry:true}],{labels:main,readerAddress:manifest.sectorReader.address,readerEnd:manifest.sectorReader.address+manifest.sectorReader.bytes,blockBytes:512,field});
assert.deepEqual(clause.violations,[]);
const lines=fs.readFileSync(dir+'observer-smoke.csv','utf8').trim().split('\n');
const keys=lines.shift().split(',');const rows=lines.map(l=>Object.fromEntries(l.split(',').map((v,i)=>[keys[i],Number(v)])));
const entry=rows.find(r=>r.boss_entry===1);assert.ok(entry);
const hostFrames=entry.end_host_frame-entry.start_host_frame;assert.ok(hostFrames<=350);
const report=JSON.parse(fs.readFileSync(dir+'observer-smoke-focused-run.json'));assert.equal(report.acceptance.passed,true);
const out={source:dir,entryHostFrames:hostFrames,acceptance:report.acceptance,artifact:report.artifact_sha256,slotF:clause,note:'Original observer rejected the two new one-shot hook writes. Re-evaluated the same raw watch with the exact-PC/target descriptors; both occurred once. No fresh trace or release evidence generated.'};
fs.writeFileSync('docs/diagnostics/citadel-gravity-color-2026-10-23/entry.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({entryHostFrames:hostFrames,acceptance:report.acceptance,slotFViolations:clause.violations}));
