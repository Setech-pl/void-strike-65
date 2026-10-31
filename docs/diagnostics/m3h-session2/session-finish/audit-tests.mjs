// Reproduce exact test-name + first-assertion A/B/C from the one full run.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parseTestLog} from '../../../../scripts/reconcile-failures.mjs';
const dir=new URL('./',import.meta.url);
const baseline=JSON.parse(fs.readFileSync(new URL('main-tests.json',dir)));
const branch=parseTestLog(fs.readFileSync(new URL('npm-test.log',dir),'utf8'));
const corrected='the generated memory map matches the current build';
assert.match(fs.readFileSync(new URL('memory-map-focused.log',dir),'utf8'),/pass 3[\s\S]*fail 0/);
assert.match(fs.readFileSync(new URL('optional-emulator-focused.log',dir),'utf8'),/pass 12[\s\S]*fail 0[\s\S]*skipped 0/);
const failures=branch.failures.filter(f=>f.test!==corrected);
assert.equal(branch.failures.length-failures.length,1);
const key=f=>JSON.stringify([f.file,f.test,f.first_failing_assertion,f.message]);
const before=new Set(baseline.failures.map(key)),after=new Set(failures.map(key));
const A=failures.filter(f=>before.has(key(f))),B=failures.filter(f=>!before.has(key(f))),C=baseline.failures.filter(f=>!after.has(key(f)));
const output={main:'71a38a8',mainMeasuredSource:'96cbf6d (production/test inputs identical to main)',matching:'file, test name, first failing assertion, first failing message',baselineTotals:baseline.totals,raw:branch.totals,audited:{tests:branch.totals.tests,pass:branch.totals.pass+4,fail:branch.totals.fail-1,skipped:branch.totals.skipped-3},selfResolved:[{test:corrected,reason:'Generated map still described the previous image; regenerated from the final normal build, focused 3/3 PASS.'},{test:'three optional emulator-source cases',reason:'Full suite had no build/atari800-trace; placed prepared source in that expected location and reran the affected three files:12/12 PASS,0 SKIP. Private SIO copy drops incompatible optional framepeak/L2 observers; wall-trace source stays instrumented.'}],A,B,C,counts:{A:A.length,B:B.length,C:C.length},remainingSkip:'H12 compile-time review-build-only case; production publisher is tested separately',fullRuns:1};
assert.equal(B.length,0,'task-only failures must be empty');
fs.writeFileSync(new URL('tests-ab.json',dir),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({raw:output.raw,audited:output.audited,counts:output.counts},null,2));
