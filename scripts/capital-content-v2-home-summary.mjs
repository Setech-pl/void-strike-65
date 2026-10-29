import fs from 'node:fs';
import {csv,sha,read} from './frame-peak-results.mjs';
const root='build/evidence/capital-content-v2',out='docs/diagnostics/capital-content-v2';
const result={measurement:'MEASURED native CPU byte/word reads, opcode/operand fetches and CPU byte writes; not DMA or patched-host-SIO writes',regions:[],scope:'Four seeded terminal boss fixtures exercise real entry, fight, death, summary, menu and next load; direct 480 EASY flight separately exercises SPACE/capital/death/respawn. Exit coverage pending.',bindings:[]};
for(let region=1;region<=4;region++){
 const file=`${root}/boss${region}/r${region}.jsonl`;
 const records=fs.readFileSync(file,'utf8').trim().split('\n').map(JSON.parse);
 const home=`${root}/home-boss${region}.csv`;
 const totals={};for(const r of csv(home)){const phase=r.game===0?'boot':r.boss?'boss-owned':'other';const k=`${phase}:${r.write?'writes':'reads'}`;totals[k]=(totals[k]??0)+1;}
 result.regions.push({region,records,totals});
 for(const p of [file,home,`${file}.lifetime.jsonl`])result.bindings.push({file:p,sha256:sha(p)});
}
const baseline=read(`${root}/baseline/results.json`);
result.nativeGate={routes:baseline.results.length,peak:Math.max(...baseline.results.map(r=>r.peak)),capitalPeak:Math.max(...baseline.results.map(r=>r.capitalPeak)),minimumFence:Math.min(...baseline.results.map(r=>r.fence)),allPassed:baseline.results.every(r=>r.passed)};
fs.writeFileSync(`${out}/home-progress.json`,JSON.stringify(result,null,2)+'\n');
