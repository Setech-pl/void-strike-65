// Audit raw logs without rewriting them; focused repairs are explicit evidence.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parseTestLog,reconcileTests} from '../../../scripts/reconcile-failures.mjs';
const read=(p,root=process.cwd())=>parseTestLog(fs.readFileSync(p,'utf8'),{root});
const mainRaw=read('docs/diagnostics/m3-tune/main-test.log'),taskRaw=read('docs/diagnostics/m3-tune/candidate-test.log',path.resolve('.cache/m3-tune/work'));
assert.ok(mainRaw.totals.tests&&taskRaw.totals.tests,'both full runs completed');
const mainFocused=read('docs/diagnostics/m3-tune/main-focused-correction.log'),taskFocused=read('docs/diagnostics/m3-tune/final-focused.log');
assert.equal(mainFocused.totals.fail,0);assert.equal(taskFocused.totals.fail,0);
const exposure=[
 'M3 timeline exposes late no-fire completion and distinguishes unmodeled Heavy lifetime',
 'M3 denser pilot spans both sides and hands off at the next available row tick',
 'M3 mirrored centre fan descends from opposite sides before crossing'];
const stale='documentation keeps the current Heavy/Light PMG contract';
const main=mainRaw.failures.filter(f=>!exposure.includes(f.test));
const taskStale=[
 'levels:check runs the validator alone and the build compiles the authored file',
 'T12: level-02.json compiles and differs from level 1 in sector count, waves and masks',
 'step 3: the Director reads level 2 - six sectors, the capital on row 1,120, four Lights in a swarm sector, complete after sector 6'];
const expectationFocused=read('docs/diagnostics/m3-tune/stale-expectations-focused.log');assert.equal(expectationFocused.totals.fail,0);
const task=taskRaw.failures.filter(f=>f.test!==stale&&!taskStale.includes(f.test));
const key=f=>`${f.file} > ${f.test}`,signature=f=>`${f.first_failing_assertion} > ${f.message}`;
const a=new Map(main.map(f=>[key(f),f])),b=new Map(task.map(f=>[key(f),f]));
const A=[],B=[],C=[];
for(const [k,f]of b){if(a.has(k)&&signature(a.get(k))===signature(f))A.push(f);else B.push({task:f,main:a.get(k)??null});}
for(const [k,f]of a)if(!b.has(k))C.push(f);
const canonical=JSON.parse(fs.readFileSync('docs/recorded-test-failures.json')).failures;
const reconciliation=reconcileTests(task,canonical);
const report={baseline:'eaae85a',method:'One full npm test per source revision. File+test name+first assertion+first message matched exactly. Raw logs preserved. Three baseline cases were exposed to a brief data edit; entire affected files rerun on restored main (30 PASS/1 SKIP). Four stale expectations (existing ceiling4, normal sector lengths in two checks, and host compiler selection) were corrected and the full affected file passes inside final focused run (77 PASS/2 SKIP). Task parser receives its own source root, preserving test-file first-assertion selection and exact messages. Host variant manifest correction separately rerun through build-variants and wall-trace/frame routes plus native pilots. No second full suite.',mainRaw:{totals:mainRaw.totals,failures:mainRaw.failures},taskRaw:{totals:taskRaw.totals,failures:taskRaw.failures},corrections:{taskStaleExpectations:taskRaw.failures.filter(f=>taskStale.includes(f.test)),expectationFocused:expectationFocused.totals,baselineExposure:mainRaw.failures.filter(f=>exposure.includes(f.test)),baselineFocused:mainFocused.totals,staleExpectation:{test:stale,justification:'The existing M3 swarm ceiling and hybrid architecture document already say4, and the owner explicitly requires preserving4; the old regex expected3.',rawTaskFailure:taskRaw.failures.find(f=>f.test===stale)??null},finalFocused:taskFocused.totals},auditedABC:{A:A.length,B:B.length,C:C.length},A,B,C,canonicalReconciliation:reconciliation};
fs.writeFileSync('docs/diagnostics/m3-tune/tests-ab.json',JSON.stringify(report,null,2)+'\n');
console.log(report.auditedABC);assert.equal(B.length,0,'no task-only failures');assert.equal(reconciliation.added.length,0);assert.equal(reconciliation.moved.length,0);
