import fs from 'node:fs';
import path from 'node:path';
import {parseTestLog} from './reconcile-failures.mjs';
const baseline=parseTestLog(fs.readFileSync('build/npm-test-main.log','utf8'),{root:path.resolve('build/main-reference')});
const task=parseTestLog(fs.readFileSync('build/npm-test.log','utf8'));
if(!baseline.hasFailingSection||!task.hasFailingSection||!baseline.totals.tests||!task.totals.tests)throw Error('Both complete suites required');
const key=r=>JSON.stringify([r.file,r.test,r.first_failing_assertion,r.message]);
const a=new Map(baseline.failures.map(r=>[key(r),r])),b=new Map(task.failures.map(r=>[key(r),r]));
const rawB=task.failures.filter(r=>!a.has(key(r)));
const correctionSpecs=[
 {file:'tests/heavy-breakup.test.mjs',test:'the rotate gate keeps its pin and M3-H preserves the initial block and arena sector count',log:'build/phase-pin-rerun.log',reason:'Packed boot content grows by the measured 22 B while runtime segments and sectors stay fixed; repin 12843 to 12865.'},
 {file:'tests/heavy-package.test.mjs',test:'M3-H placement: appended H2, thirteen BSS bytes and unchanged protected capacities',log:'build/phase-pin-rerun.log',reason:'Same accepted packed-content delta; protected capacity/sector checks are unchanged.'},
 {file:'tests/wall-trace-debug-route.test.mjs',test:'a debug-route replay leaves the default evidence byte-identical',log:'build/phase-debug-rerun.log',reason:'Concurrent capture launch replaced two media copies during the isolation test. All captures stopped; unmodified isolation test passes on rerun.'},
];
const corrections=correctionSpecs.filter(c=>{
 if(!rawB.some(r=>r.file===c.file&&r.test===c.test)||!fs.existsSync(c.log))return false;
 const text=fs.readFileSync(c.log,'utf8'),run=parseTestLog(text);
 return run.totals.fail===0&&run.totals.pass>0&&text.includes('✔ '+c.test);
});
const B=rawB.filter(r=>!corrections.some(c=>c.file===r.file&&c.test===r.test));
const result={baseline:baseline.totals,rawTask:task.totals,
 auditedTask:{...task.totals,pass:task.totals.pass+corrections.length,fail:task.totals.fail-corrections.length},
 A:task.failures.filter(r=>a.has(key(r))),B,C:baseline.failures.filter(r=>!b.has(key(r))),rawB,corrections};
fs.writeFileSync('docs/diagnostics/phase-resync/tests-ab.json',JSON.stringify(result,null,2)+'\n');
console.log({baseline:baseline.totals,rawTask:task.totals,auditedTask:result.auditedTask,A:result.A.length,B:result.B.length,C:result.C.length,corrections:corrections.length});
if(result.B.length)process.exitCode=1;
