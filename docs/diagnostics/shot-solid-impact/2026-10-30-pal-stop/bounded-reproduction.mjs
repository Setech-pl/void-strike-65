import fs from 'node:fs';
import {spawn} from 'node:child_process';
const out='build/shot-solid-impact/continuation/b2';fs.mkdirSync(out,{recursive:true});
const jobs=[];
for(const revision of ['main','baseline'])for(const difficulty of [0,1])for(const mode of [0,3,4,5])
 jobs.push({revision,difficulty,mode,id:`l2-b2-${revision}-${difficulty}-${mode}`,dir:`build/frame-peak-${revision}-campaign`});
const results=[];
async function run(job,prepare=false){
 const fd=fs.openSync(`${out}/${job.id}.log`,'w');
 const args=['scripts/runtime-wall-trace.mjs',...(prepare?['--prepare']:[]),'--atari800-source=build/atari800-trace',`--artifacts=${job.dir}`,`--only-session=${job.id}`,'--smoke-frames=1800',`--smoke-difficulty=${job.difficulty}`];
 const env={...process.env,VS65_L2_SESSION:job.id,VS65_L2_POLICY:'l2-b2-owner',VS65_B2_MODE:String(job.mode),VS65_B2_DUMP:`${out}/${job.id}.bin`,DFTRACE_HOLD_PLAYER_LIVES:'4'};
 const code=await new Promise((resolve,reject)=>{const c=spawn(process.execPath,args,{stdio:['ignore',fd,fd],env});c.on('error',reject);c.on('exit',resolve);});fs.closeSync(fd);
 results.push({...job,code});fs.writeFileSync(`${out}/runs.json`,JSON.stringify(results,null,2)+'\n');
 console.log(job.id,code);if(code)throw Error(`${job.id}: wrapper failed; STOP`);
}
await run(jobs.shift(),true);
fs.writeFileSync(`${out}/prepared`,'Private emulator prepared\n');
await Promise.all(Array.from({length:3},async()=>{while(jobs.length)await run(jobs.shift());}));
