import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const d=JSON.parse(fs.readFileSync('docs/diagnostics/capital-content-v2/merge-2026-10-28/baseline-comparison.json'));
const b=d.B.filter(f=>f.class==='B2');const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const args=['--test','--test-name-pattern=^(?:'+b.map(f=>esc(f.test)).join('|')+')$',...new Set(b.map(f=>f.file))];
const phase=process.argv[2]??'0',env={...process.env};if(phase!=='0')env.B2_DIAG_PHASE=phase;
const r=spawnSync('node',args,{cwd:'build/b2-root-cause/merge',env,encoding:'utf8',maxBuffer:20*1024*1024});
fs.writeFileSync('build/b2-root-cause/focused-phase-'+phase+'.log',r.stdout+r.stderr);console.log({phase,status:r.status,tail:r.stdout.slice(-250)});
