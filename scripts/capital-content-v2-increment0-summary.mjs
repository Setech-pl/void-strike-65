// Amendment 6: fail closed before publishing any increment 0 play image.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {csv,read,sha} from './frame-peak-results.mjs';
const root='build/evidence/capital-content-v2/amendment6';
const cpuRoot='build/evidence/capital-content-v2/increment0';
const verified=`${root}/native-verified`;
if(process.argv.includes('--collect')){
 // Keep the initial captures intact. Campaign's initial snapshot pairing was
 // rejected before guest execution; use its corrected, separately saved runs.
 const runs=[...read(`${root}/native/runs.json`).filter(r=>!r.campaign),
  ...read(`${root}/campaign/runs.json`)];
 assert.equal(runs.length,15);assert.ok(runs.every(r=>r.code===0));
 fs.mkdirSync(verified,{recursive:true});
 for(const run of runs){
  const source=run.campaign?`${root}/campaign`:`${root}/native`;
  for(const suffix of ['clock.csv','lifetime.jsonl','profile.csv','states.csv'])
   fs.copyFileSync(`${source}/${run.id}-${suffix}`,`${verified}/${run.id}-${suffix}`);
 }
 fs.writeFileSync(`${verified}/runs.json`,JSON.stringify(runs,null,2)+'\n');
 execFileSync(process.execPath,['scripts/frame-peak-results.mjs',verified,'--require-routes','--capital-budget=31200'],{stdio:'inherit'});
}
const native=read(`${verified}/results.json`), exits=read(`${root}/exits/results.json`);
assert.equal(native.results.length,15);assert.ok(native.results.every(r=>r.passed));
assert.equal(exits.length,8);
const before=read(`${cpuRoot}/amendment6-baseline-cpu.json`).records;
const rows=read(`${cpuRoot}/amendment6-cpu.json`).records.map((r,i)=>{
 assert.equal(r.row,before[i].row);return {...r,baselineCpu:before[i].cycles,delta:r.cycles-before[i].cycles};
});
assert.equal(rows.length,9);assert.ok(rows.every(r=>r.delta<=60));
assert.equal(rows.find(r=>r.row===136).departure,1);
const manifest=read('build/cc2-i0-a6-campaign/manifest.json');
const baseline=read('build/cc2-baseline-campaign/manifest.json');
const placements=m=>Object.fromEntries(m.encounterDirector.director.placements.map(p=>[p.name,p.bytes]));
const p=placements(manifest), b=placements(baseline);
assert.equal(p.high,324);assert.ok(p.high<=b.high);
assert.equal(p['hybrid-window'],b['hybrid-window']+3);assert.equal(p.arena,b.arena);
const stress=fs.readFileSync(`${cpuRoot}/amendment6-stress.log`,'utf8');
assert.equal(stress,fs.readFileSync('build/evidence/capital-content-v2/amendment5/stress-cc2-baseline-campaign.log','utf8'));
const boot=read('build/runtime-wall-trace/boot-smoke/report.json');assert.ok(boot.passed);
const frontend=Math.max(...boot.sessions.map(s=>s.milestones.frontend_poll));assert.ok(frontend<=1402);
const bosses=[1,2,3,4].map(region=>{
 const records=fs.readFileSync(`${root}/boss${region}/r${region}.jsonl`,'utf8').trim().split('\n').map(JSON.parse);
 assert.ok(records.find(r=>r.entryFrames<=350));
 const end=records.find(r=>r.restartedLevel);assert.ok(end?.returnedToMenu&&end.summary);
 for(const k of ['misses','hudErrors','shipErrors','dliErrors','readImageErrors','sioFailures','readDliErrors'])assert.equal(end[k],0);
 return {region,records};
});
const home=[];
for(const file of [...native.results.map(r=>`${root}/native/${r.id}-home.csv`),
 ...exits.map(r=>`${root}/exits/l2-exit-${r.rows}-${r.path}.csv`),
 ...bosses.map(r=>`${root}/home-r${r.region}.csv`)]){
 const counts={file,accesses:0,contentFetches:0,bossOwnedFetches:0,invalidContentFetches:0};
 for await(const line of readline.createInterface({input:fs.createReadStream(file)})){
  if(line.startsWith('host,'))continue;
  const [,pc,address,write,game,,boss,valid]=line.split(',').map(Number);counts.accesses++;
  if(!write&&address===pc&&pc>=0x1180&&pc<0x1900){
   if(boss)counts.bossOwnedFetches++;
   else{counts.contentFetches++;if(!valid||game!==6)counts.invalidContentFetches++;}
  }
 }
 assert.ok(counts.accesses>0);assert.equal(counts.invalidContentFetches,0,file);home.push(counts);
}
assert.equal(home.length,27);assert.ok(home.some(r=>r.contentFetches>0));assert.ok(home.some(r=>r.bossOwnedFetches>0));
function entry(raw){
 const admission=raw.findIndex(r=>r.director_sector===1);
 const capital=raw.findIndex(r=>r.sector_state<7);
 assert.ok(admission>0&&capital>=admission);
 const last=raw.slice(0,admission).findLast(r=>r.enemy_live_count>0||r.enemy_state!==0);
 assert.ok(last,'natural route must exercise a live Heavy');
 // Compare the same authored endpoint, including any wait moved before the
 // Director transition. Level 1's pre-capital SPACE sector is 272 rows.
 const tail=raw.find(r=>r.director_sector===0&&r.sector_row===271);
 assert.ok(tail);
 return {admissionFrame:raw[admission].active_gameplay_frame,
  capitalFrame:raw[capital].active_gameplay_frame,lastHeavyFrame:last.active_gameplay_frame,
  emptyFramesBeforeAdmission:raw[admission].active_gameplay_frame-last.active_gameplay_frame-1,
  postAdmissionDrainFrames:raw[capital].active_gameplay_frame-raw[admission].active_gameplay_frame,
  finalAuthoredRowToCapitalFrames:raw[capital].active_gameplay_frame-tail.active_gameplay_frame};
}
const heavy=native.results.filter(r=>r.campaign).map(run=>{
 const raw=csv(`${run.dir}/runtime-wall-trace/${run.id}.csv`),current=entry(raw);
 assert.ok(current.emptyFramesBeforeAdmission>=2,`${run.id}: Heavy-free window`);
 assert.equal(raw.find(r=>r.director_sector===1).enemy_live_count,0);
 assert.equal(raw.find(r=>r.director_sector===1).enemy_state,0);
 return {id:run.id,...current};
});
assert.equal(heavy.length,3);
let withoutAudio=0;
for(const run of native.results)for(const r of csv(`${run.dir}/runtime-wall-trace/${run.id}.csv`))
 if(!r.boss_entry&&!r.boss_state&&r.sector_state<7)
  withoutAudio=Math.max(withoutAudio,r.wall_cycles-(r.profile_clock21-r.profile_clock20));
assert.ok(withoutAudio+1187<=31200,'Composed capital retains 300-cycle safety');
const easyBaseline=entry(csv('build/cc2-baseline-campaign/runtime-wall-trace/campaign-0-flight.csv'));
const easy=heavy.find(r=>r.id==='campaign-0-flight');
assert.ok(easy.postAdmissionDrainFrames<easyBaseline.postAdmissionDrainFrames,'EASY drain must decrease');
assert.ok(easy.finalAuthoredRowToCapitalFrames<easyBaseline.finalAuthoredRowToCapitalFrames,'EASY total tail must decrease');
const report={status:'all increment 0 gates PASS; uncommitted, awaiting owner smoke',baseline:'5053697',
 measurement:'NMOS6502 CPU for row/stress; native PAL wall timing and active gameplay frames otherwise',
 rowCpu:{gate:60,toleratedMaximum:63,option:1,savingAgainstStoppedAttempt:16,rows},
 resources:{directorHigh:p.high,directorBaseline:b.high,directorDelta:p.high-b.high,window:p['hybrid-window'],windowDelta:3,arenaDelta:0,home:manifest.contentModule},
 native,composedCapital:{withoutAudio,audio:1187,total:withoutAudio+1187,limit:31200},home,bosses,exits,boot:{passed:true,frontend,report:'build/runtime-wall-trace/boot-smoke/report.json'},
 stress:stress.trim().split('\n'),heavy,easyDrain:{baseline:easyBaseline,current:easy},delivery:[]};
const files=[...home.map(r=>r.file),`${verified}/results.json`,`${root}/native/runs.json`,`${root}/campaign/runs.json`,`${root}/exits/results.json`,
 `${cpuRoot}/amendment6-cpu.json`,`${cpuRoot}/amendment6-baseline-cpu.json`,`${cpuRoot}/amendment6-tests.log`,
 `${cpuRoot}/amendment6-stress.log`,'build/runtime-wall-trace/boot-smoke/report.json',
 ...native.results.map(r=>`${r.dir}/runtime-wall-trace/${r.id}.csv`),
 ...bosses.map(r=>`${root}/boss${r.region}/r${r.region}.jsonl`)];
for(const dir of ['cc2-baseline-campaign','cc2-i0-a6-campaign','level-1-s1','l2-capital-960'])
 for(const name of ['manifest.json','void-strike-65.atr'])files.push(`build/${dir}/${name}`);
report.bindings=files.map(file=>({file,sha256:sha(file)}));
if(process.argv.includes('--deliver')){
 const play='build/play/capital-content-v2/0';fs.mkdirSync(play,{recursive:true});
 for(const [name,dir]of [['campaign','cc2-i0-a6-campaign'],['capital-480','level-1-s1'],['capital-960','l2-capital-960']]){
  const source=`build/${dir}/void-strike-65.atr`,target=path.resolve(play,`${name}.atr`);
  fs.copyFileSync(source,target);report.delivery.push({path:target,sha256:sha(target)});
 }
}
fs.writeFileSync('docs/diagnostics/capital-content-v2/amendment6-increment0.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({native:15,home:27,frontend,heavy,easyDrain:report.easyDrain,delivery:report.delivery}));
