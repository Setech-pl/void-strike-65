// DIAGNOSTIC ONLY: real exit paths, explicit GAME OVER/terminal-state seeds.
// Exact frame/PAL/image gates remain fatal; no release evidence is written.
import fs from 'node:fs';import {spawn}from'node:child_process';
const out='build/l2-audit-exits';fs.mkdirSync(out,{recursive:true});
const jobs=[480,960].flatMap(length=>['quit','game-over','level-end','reset'].map(kind=>({length,kind})));
const results=[];let stopped=false;
async function run({length,kind}){
 const id=`l2-exit-${length}-${kind}`,dir=length===480?'level-1-s1':'l2-capital-960';
 const file=`${out}/${id}.jsonl`,fd=fs.openSync(`${out}/${id}.log`,'w');
 const env={...process.env,VS65_L2_SESSION:id,VS65_L2_POLICY:'l2-matrix-brake',DFTRACE_L2_EXIT:kind,
   DFTRACE_HOLD_PLAYER_LIVES:'3',DFTRACE_L2_LIFETIME:file};delete env.DFTRACE_L2_BOSS_FRAMES;
 const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['scripts/runtime-wall-trace.mjs',
   '--atari800-source=build/atari800-trace',`--artifacts=build/${dir}`,`--only-session=${id}`,
   '--smoke-frames=2400','--smoke-difficulty=2'],{stdio:['ignore',fd,fd],env});p.on('error',reject);p.on('exit',resolve);});fs.closeSync(fd);
 if(code!==0){stopped=true;throw Error(`${id}: native STOP, ${code}; see ${out}/${id}.log`);}
 const events=fs.readFileSync(file,'utf8').trim().split('\n').map(JSON.parse);
 const counts=Object.fromEntries(['checked_l2_init','boot_ready_disarmed','capital_death_valid','respawn',
   'game_over','stale_access','exit_fixture'].map(k=>[k,events.filter(e=>e.event===k).length]));
 if(counts.stale_access||counts.exit_fixture!==1||counts.checked_l2_init<2||
   (kind==='reset'&&counts.boot_ready_disarmed<2)||(kind==='game-over'&&!counts.game_over)||
   (['quit','level-end'].includes(kind)&&!events.some(e=>e.event==='exit'&&e.path===({quit:3,'level-end':4})[kind])))
   {stopped=true;throw Error(`${id}: exit coverage STOP ${JSON.stringify(counts)}`);}
 const r={rows:length,path:kind,counts,diagnostic_only:true};results.push(r);
 fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(r));
}
await Promise.all(Array.from({length:2},async()=>{while(jobs.length&&!stopped)await run(jobs.shift());}));
