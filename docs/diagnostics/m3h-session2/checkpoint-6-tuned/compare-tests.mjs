import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parseTestLog} from '../../../../scripts/reconcile-failures.mjs';
const baseline=JSON.parse(fs.readFileSync('docs/diagnostics/m3h-session2/checkpoint-6-final-tests-ab.json'));
const main=execFileSync('git',['rev-parse','main'],{encoding:'utf8'}).trim();
if(main!==baseline.main)throw Error('Main advanced: regenerate the baseline inventory');
execFileSync('git',['diff','--quiet',baseline.provenance.sourceCommit+'..main','--','src','scripts','tests','cfg','assets','package.json','package-lock.json']);
const log=process.argv[2]??'.cache/m3h-session2-tune/logs/npm-test.log';
const task=parseTestLog(fs.readFileSync(log,'utf8'));
if(!task.hasFailingSection||!task.totals.tests)throw Error('Full suite is not complete');
const key=r=>JSON.stringify([r.file,r.test,r.first_failing_assertion,r.message]);
const before=new Map(baseline.A.map(r=>[key(r),r])),after=new Map(task.failures.map(r=>[key(r),r]));
const A=task.failures.filter(r=>before.has(key(r))),rawB=task.failures.filter(r=>!before.has(key(r))),C=baseline.A.filter(r=>!after.has(key(r)));
const corrections=[
  {test:'the art outside the boss band: build/level-payload.bin is the pinned bytes',
    reason:'Owner 2026-10-31 changes only payload byte 178, armour colour $46 -> $68; re-pin its art hash.'},
  {test:'levels:check runs the validator alone and the build compiles the authored file',
    reason:'The selected authored filename is now a local variable so the shortcut can clone/override its data; assert the equivalent selection and compile path.'},
];
const correctedLog=fs.readFileSync('.cache/m3h-session2-tune/logs/corrected-cases.log','utf8');
if(parseTestLog(correctedLog).totals.fail!==0)throw Error('Corrections did not pass');
for(const c of corrections)if(!rawB.some(r=>r.test===c.test)||!correctedLog.includes('✔ '+c.test))throw Error('Unproven correction '+c.test);
const B=rawB.filter(r=>!corrections.some(c=>c.test===r.test));
const optionalTests=["the boss entry's loads leave async receive off (debug route --level=1:sector=6, real SIO)",
  'the built ATR boots through real SIO to gameplay, BASIC on and off (scripts/sio-boot-repro.mjs)',
  'a debug-route replay leaves the default evidence byte-identical'];
const optionalLog=fs.readFileSync('.cache/m3h-session2-tune/logs/optional-checks.log','utf8');
if(parseTestLog(optionalLog).totals.fail!==0)throw Error('Optional checks did not pass');
for(const n of optionalTests)if(!optionalLog.includes('✔ '+n))throw Error('Missing optional case '+n);
const auditedTotals={...task.totals,pass:task.totals.pass+corrections.length+optionalTests.length,
  fail:task.totals.fail-corrections.length,skipped:task.totals.skipped-optionalTests.length};
const result={main,baselineProvenance:baseline.provenance,
  note:'Reused previously verified complete main failure inventory; current main and all its test inputs remain identical. One new full task suite.',
  raw:{totals:task.totals,counts:{A:A.length,B:rawB.length,C:C.length},B:rawB},
  corrections,unskippedOnFocusedRerun:optionalTests,
  audited:{totals:auditedTotals,counts:{A:A.length,B:B.length,C:C.length}},A,B,C};
fs.writeFileSync(new URL('tests-ab.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({raw:result.raw.totals,audited:result.audited},null,2));
if(B.length)process.exitCode=1;
