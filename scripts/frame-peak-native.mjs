// Reuse capital-slalom-native's twelve routes and runtime-wall-trace timer.
// Adds a host-only PC profile and end-of-frame state hashes; no guest writes.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {stateMask} from './frame-peak-state.mjs';
const name=process.argv[2];
if(!['main','fixed'].includes(name))throw Error('Choose main or fixed');
const emulator='build/frame-peak-atari800',out=`build/frame-peak-${name}`;
if(fs.lstatSync(emulator).isSymbolicLink())throw Error('Refuse shared emulator');
fs.mkdirSync(out,{recursive:true});
fs.copyFileSync('scripts/frame-peak-observer.h',`${emulator}/src/frame-peak-observer.h`);
const cpuPath=`${emulator}/src/cpu.c`;let cpu=fs.readFileSync(cpuPath,'utf8');
if(!cpu.includes('#include "frame-peak-observer.h"'))cpu=cpu.replace('#include "voidstrike65_trace.h"','#include "voidstrike65_trace.h"\n#include "frame-peak-observer.h"');
if(!cpu.includes('cc_before(GET_PC())'))cpu=cpu.replace('DFTrace_Observe(GET_PC(), A, X, Y, S);','DFTrace_Observe(GET_PC(), A, X, Y, S);\n\t\tcc_before(GET_PC());');
if(!cpu.includes('\n\t\tcc_after();'))cpu=cpu.replace('\n#ifdef MONITOR_PROFILE\n\t\t{\n\t\t\tint cyc','\n\t\tcc_after();\n#ifdef MONITOR_PROFILE\n\t\t{\n\t\t\tint cyc');
if(!cpu.includes('cc_after();'))throw Error('Atari800 execution anchor changed');
fs.writeFileSync(cpuPath,cpu);
const jobs=[];
for(const length of [480,960])for(let difficulty=0;difficulty<3;difficulty++)for(const brake of [false,true])jobs.push({id:`l2-${length}-${difficulty}-${brake?'brake':'flight'}`,length,difficulty,brake,dir:`build/frame-peak-${name}-${length}`,artifacts:length===480?'build/level-1-s1':'build/l2-capital-960'});
jobs.push({id:'campaign-2-brake',difficulty:2,brake:true,dir:`build/frame-peak-${name}-campaign`,campaign:true});
for(const dir of new Set(jobs.map(j=>j.dir))) {
 const {mask,...schema}=stateMask(dir);
 fs.writeFileSync(`${dir}/frame-state-mask.bin`,mask);
 fs.writeFileSync(`${dir}/frame-state-schema.json`,JSON.stringify(schema,null,2)+'\n');
}
const records=[];let stopped=false;
function collect(job) {
 const traces=`${job.artifacts??'build'}/runtime-wall-trace`;
 fs.mkdirSync(`${job.dir}/runtime-wall-trace`,{recursive:true});
 for(const file of fs.readdirSync(traces).filter(f=>f.startsWith(job.id)&&fs.statSync(`${traces}/${f}`).isFile()))fs.copyFileSync(`${traces}/${file}`,`${job.dir}/runtime-wall-trace/${file}`);
}
async function run(job,prepare=false) {
 const fd=fs.openSync(`${out}/${job.id}.log`,'w');
 const args=[...(job.campaign?['--import','./scripts/island-edge-build-redirect.mjs']:[]),'scripts/runtime-wall-trace.mjs',...(prepare?['--prepare']:[]),`--atari800-source=${emulator}`,...(job.campaign?['--skip-boot-smoke']:[`--artifacts=${job.artifacts}`]),`--only-session=${job.id}`,'--smoke-frames=10000',`--smoke-difficulty=${job.difficulty}`];
 const env={...process.env,VS65_L2_SESSION:job.id,VS65_L2_POLICY:job.brake?'l2-matrix-brake':'l2-matrix',DFTRACE_L2_BOSS_FRAMES:'120',DFTRACE_HOLD_PLAYER_LIVES:'3',DFTRACE_L2_OUTPUT:`${out}/${job.id}-clock.csv`,DFTRACE_L2_WORLD_ACC:'0x87',DFTRACE_L2_HULL_ACC:'0x4e71',DFTRACE_L2_LIFETIME:`${out}/${job.id}-lifetime.jsonl`,DFTRACE_SECTOR_CLOCK_OUTPUT:`${out}/${job.id}-director.csv`,VS65_FRAME_PROFILE:path.resolve(`${out}/${job.id}-profile.csv`),VS65_FRAME_STATES:path.resolve(`${out}/${job.id}-states.csv`),VS65_FRAME_STATE_MASK:path.resolve(`${job.dir}/frame-state-mask.bin`)};
 env.ISLAND_EDGE_ARTIFACTS='build/frame-peak-campaign';
 const code=await new Promise((resolve,reject)=>{const c=spawn(process.execPath,args,{stdio:['ignore',fd,fd],env});c.on('error',reject);c.on('exit',resolve);});fs.closeSync(fd);
 collect(job);
 records.push({...job,code});fs.writeFileSync(`${out}/runs.json`,JSON.stringify(records,null,2)+'\n');
 console.log(name,job.id,code===0?'PASS':'STOP');
 if(code){stopped=true;process.exitCode=1;}
}
if(process.argv.includes('--resume'))for(let i=jobs.length-1;i>=0;i--) {
 const job=jobs[i],traces=`${job.artifacts??'build'}/runtime-wall-trace`,report=`${traces}/${job.id}-focused-run.json`,states=`${out}/${job.id}-states.csv`;
 if(fs.existsSync(report)&&fs.existsSync(states)&&JSON.parse(fs.readFileSync(report)).passed) {
  const frames=fs.readFileSync(`${traces}/${job.id}.csv`,'utf8').trim().split('\n').length-1;
  if(fs.readFileSync(states,'utf8').trim().split('\n').length-1!==frames)continue;
  collect(job);records.push({...job,code:0});jobs.splice(i,1);
 }
}
fs.writeFileSync(`${out}/runs.json`,JSON.stringify(records,null,2)+'\n');
if(!jobs.length)process.exit();
await run(jobs.shift(),true);
await Promise.all(Array.from({length:3},async()=>{while(jobs.length&&!stopped)await run(jobs.shift());}));
