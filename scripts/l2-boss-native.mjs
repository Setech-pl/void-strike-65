// Short real-entry/native captures for the four authored boss regions.
import fs from 'node:fs';import{spawn}from'node:child_process';
const dirs=['level-1-s6','boss-region-2-level-1-s6','boss-region-3-level-1-s6','boss-region-4-level-1-s6'];
fs.mkdirSync('build/l2-boss-native',{recursive:true});
for(const[i,dir]of dirs.entries()){
 const id=`l2-boss-r${i+1}`,out=`build/l2-boss-native/${id}`,fd=fs.openSync(`${out}.log`,'w');
 const code=await new Promise((resolve,reject)=>{const c=spawn(process.execPath,['scripts/runtime-wall-trace.mjs','--atari800-source=build/atari800-trace',`--artifacts=build/${dir}`,`--only-session=${id}`,'--smoke-frames=1000','--smoke-difficulty=2'],{stdio:['ignore',fd,fd],env:{...process.env,VS65_L2_SESSION:id,VS65_L2_POLICY:'l2-matrix',DFTRACE_L2_BOSS_FRAMES:'120',DFTRACE_L2_LIFETIME:`${out}-lifetime.jsonl`,DFTRACE_HOLD_PLAYER_LIVES:'3'}});c.on('error',reject);c.on('exit',resolve);});fs.closeSync(fd);
 console.log(id,code===0?'PASS':'STOP');if(code!==0)throw Error(`${id} native STOP; see ${out}.log`);
}
