// Focused Phase-B matrix only; exact frame count and PAL gates stay fatal.
import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';
const jobs=[];
for(const length of [480,960])for(let difficulty=0;difficulty<3;difficulty++)for(const brake of [false,true]){
 const id=`l2-${length}-${difficulty}-${brake?'brake':'flight'}`;
 jobs.push({id,length,difficulty,brake,dir:length===480?'build/level-1-s1':'build/l2-capital-960'});
}
const out='build/l2-native-matrix';fs.mkdirSync(out,{recursive:true});
let stopped=false;const records=[];
async function run(job,prepare=false){
 const log=fs.openSync(`${out}/${job.id}.log`,'w');
 const args=['scripts/runtime-wall-trace.mjs',...(prepare?['--prepare']:[]),'--atari800-source=build/atari800-trace',`--artifacts=${job.dir}`,`--only-session=${job.id}`,'--smoke-frames=8000',`--smoke-difficulty=${job.difficulty}`];
 const code=await new Promise((resolve,reject)=>{const c=spawn(process.execPath,args,{stdio:['ignore',log,log],env:{...process.env,VS65_L2_SESSION:job.id,VS65_L2_POLICY:job.brake?'l2-matrix-brake':'l2-matrix',DFTRACE_L2_BOSS_FRAMES:'120',DFTRACE_HOLD_PLAYER_LIVES:'3',DFTRACE_L2_OUTPUT:`${out}/${job.id}-clock.csv`,DFTRACE_L2_WORLD_ACC:'0x87',DFTRACE_L2_HULL_ACC:'0x4e71',DFTRACE_L2_LIFETIME:`${out}/${job.id}-lifetime.jsonl`,DFTRACE_SECTOR_CLOCK_OUTPUT:`${out}/${job.id}-director.csv`}});c.on('error',reject);c.on('exit',resolve);});fs.closeSync(log);
 const record={...job,code};records.push(record);fs.writeFileSync(`${out}/runs.json`,JSON.stringify(records,null,2)+'\n');console.log(job.id,code===0?'PASS':'STOP');
 if(code!==0){stopped=true;throw Error(`${job.id}: STOP; see ${out}/${job.id}.log`);}
}
await run(jobs.shift(),true);
await Promise.all(Array.from({length:3},async()=>{while(jobs.length&&!stopped)await run(jobs.shift());}));
