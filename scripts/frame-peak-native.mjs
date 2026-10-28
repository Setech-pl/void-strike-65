// Permanent fifteen-route PAL test gate, reusing runtime-wall-trace's timer.
// Source snapshots isolate baseline/candidate inputs; no primary checkout writes.
import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {stateMask} from './frame-peak-state.mjs';
import {capitalEntrySessions} from './frame-peak-routes.mjs';
const name=process.argv[2];
if(!['main','baseline','fixed','ab'].includes(name))throw Error('Choose main, baseline, ab or fixed');
const emulator=process.argv.find(a=>a.startsWith('--emulator='))?.slice(11)??'build/frame-peak-atari800';
const out=process.argv.find(a=>a.startsWith('--output='))?.slice(9)??`build/frame-peak-${name}`;
const baseline=name==='baseline'||name==='main';
if(fs.lstatSync(emulator).isSymbolicLink())throw Error('Refuse shared emulator');
fs.mkdirSync(out,{recursive:true});
const snapshot=process.argv.find(a=>a.startsWith('--snapshot='))?.split('=')[1];
if(snapshot)for(const kind of ['480','960','campaign']) {
 const dest=`build/frame-peak-${name}-${kind}`;
 if(snapshot==='current') {
  const source=kind==='480'?'build/level-1-s1':kind==='960'?'build/l2-capital-960':null;
  if(source)fs.cpSync(source,dest,{recursive:true});
  else {
   fs.mkdirSync(dest,{recursive:true});
   for(const root of ['build','build/frame-peak-campaign'])
    for(const f of fs.readdirSync(root))if(fs.statSync(`${root}/${f}`).isFile())fs.copyFileSync(`${root}/${f}`,`${dest}/${f}`);
  }
 } else fs.cpSync(`build/frame-peak-${snapshot}-${kind}`,dest,{recursive:true});
}
fs.copyFileSync('scripts/frame-peak-observer.h',`${emulator}/src/frame-peak-observer.h`);
const cpuPath=`${emulator}/src/cpu.c`;let cpu=fs.readFileSync(cpuPath,'utf8');
if(!cpu.includes('#include "frame-peak-observer.h"'))cpu=cpu.replace('#include "voidstrike65_trace.h"','#include "voidstrike65_trace.h"\n#include "frame-peak-observer.h"');
if(!cpu.includes('cc_before(GET_PC())'))cpu=cpu.replace('DFTrace_Observe(GET_PC(), A, X, Y, S);','DFTrace_Observe(GET_PC(), A, X, Y, S);\n\t\tcc_before(GET_PC());');
if(!cpu.includes('\n\t\tcc_after();'))cpu=cpu.replace('\n#ifdef MONITOR_PROFILE\n\t\t{\n\t\t\tint cyc','\n\t\tcc_after();\n#ifdef MONITOR_PROFILE\n\t\t{\n\t\t\tint cyc');
if(!cpu.includes('cc_after();'))throw Error('Atari800 execution anchor changed');
fs.writeFileSync(cpuPath,cpu);
let jobs=[];
for(const length of [480,960])for(let difficulty=0;difficulty<3;difficulty++)for(const brake of [false,true])jobs.push({id:`l2-${length}-${difficulty}-${brake?'brake':'flight'}`,length,difficulty,brake,dir:`build/frame-peak-${name}-${length}`});
for(const session of capitalEntrySessions)jobs.push({id:session.id,difficulty:session.difficulty,brake:session.policy.endsWith('brake'),dir:`build/frame-peak-${name}-campaign`,campaign:true});
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7);
if(only)jobs=jobs.filter(j=>j.id===only||only==='campaign'&&j.campaign);
for(const dir of new Set(jobs.map(j=>j.dir))) {
 execFileSync(process.execPath,['scripts/l2-observer-images.mjs',dir],{stdio:'ignore'});
 const {mask,logicalMask,...schema}=stateMask(dir);
 fs.writeFileSync(`${dir}/frame-state-mask.bin`,Buffer.concat([mask,logicalMask]));
 fs.writeFileSync(`${dir}/frame-state-schema.json`,JSON.stringify(schema,null,2)+'\n');
}
const records=[];
async function run(job,prepare=false) {
 const fd=fs.openSync(`${out}/${job.id}.log`,'w');
 const args=['scripts/runtime-wall-trace.mjs',...(prepare?['--prepare']:[]),`--atari800-source=${emulator}`,`--artifacts=${job.dir}`,`--only-session=${job.id}`,
  ...(job.campaign?['--capital-entry-only']:['--smoke-frames=10000',`--smoke-difficulty=${job.difficulty}`])];
 const schema=JSON.parse(fs.readFileSync(`${job.dir}/frame-state-schema.json`));
 const env={...process.env,VS65_L2_SESSION:job.id,VS65_L2_POLICY:job.brake?'l2-matrix-brake':'l2-matrix',DFTRACE_L2_BOSS_FRAMES:'120',DFTRACE_HOLD_PLAYER_LIVES:'3',DFTRACE_L2_OUTPUT:`${out}/${job.id}-clock.csv`,DFTRACE_L2_WORLD_ACC:'0x87',DFTRACE_L2_HULL_ACC:'0x4e71',DFTRACE_L2_LIFETIME:`${out}/${job.id}-lifetime.jsonl`,DFTRACE_SECTOR_CLOCK_OUTPUT:`${out}/${job.id}-director.csv`,VS65_FRAME_PROFILE:path.resolve(`${out}/${job.id}-profile.csv`),VS65_FRAME_STATES:path.resolve(`${out}/${job.id}-states.csv`),VS65_FRAME_STATE_MASK:path.resolve(`${job.dir}/frame-state-mask.bin`),VS65_FRAME_PHYSICAL:String(schema.tokens[0].address),VS65_FRAME_CONSUMED:String(schema.tokens[1].address),VS65_FRAME_SNAPSHOTS:path.resolve(`${out}/${job.id}-snapshots.bin.gz`)};
 const code=await new Promise((resolve,reject)=>{const c=spawn(process.execPath,args,{stdio:['ignore',fd,fd],env});c.on('error',reject);c.on('exit',resolve);});fs.closeSync(fd);
 if(job.campaign)for(const suffix of ['clock.csv','lifetime.jsonl']) {
  const source=`${job.dir}/runtime-wall-trace/${job.id}-${suffix}`;
  if(fs.existsSync(source))fs.copyFileSync(source,`${out}/${job.id}-${suffix}`);
 }
 records.push({...job,code});fs.writeFileSync(`${out}/runs.json`,JSON.stringify(records,null,2)+'\n');
 console.log(name,job.id,code===0?'PASS':baseline?'BASELINE FAILURE':'FAIL');
 if(code&&!baseline)process.exitCode=1;
}
await run(jobs.shift(),!process.argv.includes('--no-prepare'));
await Promise.all(Array.from({length:3},async()=>{while(jobs.length)await run(jobs.shift());}));
// The registered test gate validates the actual captures, not stale report pins.
if(process.argv.includes('--gate')) {
 const c=spawn(process.execPath,['scripts/frame-peak-results.mjs',out,'--require-routes'],{stdio:'inherit'});
 const code=await new Promise(resolve=>c.on('exit',resolve));if(code)process.exitCode=1;
}
