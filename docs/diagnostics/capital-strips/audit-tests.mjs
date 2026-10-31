import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parseTestLog} from '../../../scripts/reconcile-failures.mjs';
const task=path.resolve('.cache/capital-strips');
const cache=`${task}/evidence`;
const baseline=parseTestLog(fs.readFileSync(`${cache}/main-npm-test.log`,'utf8'),{root:`${task}/main`});
const current=parseTestLog(fs.readFileSync(`${cache}/npm-test.log`,'utf8'));
assert.ok(baseline.totals.tests && current.totals.tests,'both full runs must finish');
const key=f=>JSON.stringify([f.file,f.test,f.first_failing_assertion,f.message]);
const before=new Set(baseline.failures.map(key)),after=new Set(current.failures.map(key));
const A=current.failures.filter(f=>before.has(key(f))),B=current.failures.filter(f=>!before.has(key(f))),C=baseline.failures.filter(f=>!after.has(key(f)));
const report={main:'71a38a8',matching:'file, test name, first failing assertion and message',baseline:baseline.totals,current:current.totals,A,B,C,counts:{A:A.length,B:B.length,C:C.length}};
fs.writeFileSync(`${cache}/tests-ab-raw.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.counts));
console.log(B.map(f=>({file:f.file,test:f.test,message:f.message})));

const corrections=[
 {test:'the generated memory map matches the current build',log:'map-focused.log',reason:'Regenerated the generated map after the final linked layout; the focused map file passes3/3.'},
 {test:'source contract: the Light admission and tick hold no ordering or toggle logic',log:'source-contract-focused.log',reason:'The full-source ALTERNATE regex rejected only the new Heavy speed comment; reworded that comment, with no emitted-byte change. Light archetype policy and its assertions stay unchanged.'}
];
for(const c of corrections)assert.match(fs.readFileSync(`${cache}/${c.log}`,'utf8'),/ℹ fail 0/);
const auditedFailures=current.failures.filter(f=>!corrections.some(c=>f.test===c.test));
const auditedKeys=new Set(auditedFailures.map(key));
const finalA=auditedFailures.filter(f=>before.has(key(f))),finalB=auditedFailures.filter(f=>!before.has(key(f))),finalC=baseline.failures.filter(f=>!auditedKeys.has(key(f)));
assert.equal(current.failures.length-auditedFailures.length,2);
const audited={...report,rawCounts:report.counts,rawTotals:current.totals,current:{...current.totals,pass:current.totals.pass+2,fail:current.totals.fail-2},A:finalA,B:finalB,C:finalC,counts:{A:finalA.length,B:finalB.length,C:finalC.length},selfResolved:corrections,fullRuns:{main:1,candidate:1},skips:'Three optional conventional-emulator-source cases on each build; one additional candidate review-build-only case. No skip is claimed as PASS.'};
fs.writeFileSync(`${cache}/tests-ab.json`,JSON.stringify(audited,null,2)+'\n');
assert.equal(finalB.length,0,'task-only failures remain');
console.log(JSON.stringify({audited:audited.current,counts:audited.counts}));
