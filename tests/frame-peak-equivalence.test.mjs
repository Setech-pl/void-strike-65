import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import zlib from 'node:zlib';
import {compareRoute,nextConsumedToken} from '../scripts/frame-peak-compare.mjs';
import {stateMask,stateHash} from '../scripts/frame-peak-state.mjs';
function fixture({miss=null,tokenExtra=0,damage=false,slower=false,campaign=false}={}) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'frame-peak-'));
 const info=[];
 for(const side of ['before','after']) {
  const dir=path.join(root,side);fs.mkdirSync(`${dir}/runtime-wall-trace`,{recursive:true});
  for(const name of fs.readdirSync('build').filter(n=>n.endsWith('.map')||n==='void-strike-65.lbl'))
   fs.copyFileSync(`build/${name}`,`${dir}/${name}`);
  const schema=stateMask(dir),rows=[],states=['frame,fnv1a64,logical_fnv1a64,physical,consumed'],snapshots=[];
  let previousPhysical,previousConsumed;
  for(let frame=0;frame<4;frame++) {
   const before=side==='before',lost=before&&miss!==null&&frame>miss?1:0;
   const base=(100+frame+lost)*35568,start=base+2060,missed=before&&frame===miss;
   const m=new Uint8Array(65536),physical=100+frame+(before&&miss!==null&&frame>=miss?1:0)+(before?0:tokenExtra),
    consumed=frame===0?100:nextConsumedToken(previousPhysical,previousConsumed);
   previousPhysical=physical;previousConsumed=consumed;
   m[schema.tokens[0].address]=physical;m[schema.tokens[1].address]=consumed;
   if(!before&&damage)m[0x4e5d]=1;
   states.push([frame,stateHash(m,schema.mask),stateHash(m,schema.logicalMask),physical,consumed].join(','));
   snapshots.push(Buffer.from([...schema.mask.keys()].filter(i=>schema.mask[i]).map(i=>m[i])));
   rows.push({frame,sector_state:frame===1?2:7,boss_state:0,boss_entry:0,
    start_clock:start,start_scanline:18,start_cycle:8,start_host_frame:100+frame+lost,
    end_host_frame:100+frame+lost+(missed?1:0),next_start_host_frame:101+frame+lost+(missed?1:0),
    wall_cycles:missed?63846:31000+(!before&&slower?1:0),
    profile_clock19:base+24000,profile_publication_begin:frame===1?0:base+27364+(missed?35568:0),
    missed_frames:missed?1:0,extra_vbi_boundaries:0,dli_sequence_violations:0});
  }
  const keys=Object.keys(rows[0]);fs.writeFileSync(`${dir}/runtime-wall-trace/fixture.csv`,
   [keys.join(','),...rows.map(r=>keys.map(k=>r[k]).join(','))].join('\n')+'\n');
  fs.writeFileSync(`${dir}/fixture-states.csv`,states.join('\n')+'\n');
  fs.writeFileSync(`${dir}/fixture-snapshots.bin.gz`,zlib.gzipSync(Buffer.concat(snapshots)));
  info.push({id:'fixture',dir,campaign});
 }
 return {run:()=>compareRoute(info[0],info[1],info[0].dir,info[1].dir),close:()=>fs.rmSync(root,{recursive:true,force:true})};
}
test('equivalence: exact full state passes; only the measured entry loss permits token differences',()=>{
 for(const [options,differences]of [[{},0],[{miss:0,campaign:true},4]]) {
  const f=fixture(options);try{const result=f.run();assert.equal(result.physicalTokenDifferences.length,differences);
   assert.ok(result.maskedRamIdentical&&result.logicalHashesIdentical);}finally{f.close();}
 }
});
test('master token model consumes pending boundaries and waits only when caught up',()=>{
 assert.equal(nextConsumedToken(103,102),103);
 assert.equal(nextConsumedToken(105,105),106);
 assert.equal(nextConsumedToken(255,255),0);
});
test('equivalence: HP, unexplained clock tokens, non-entry exceptions and SPACE cost increases are fatal',()=>{
 for(const [options,message]of [[{damage:true},/logical mismatch/],[{tokenExtra:1},/unexpected physical/],
  [{miss:2,campaign:true},/non-entry timing exception/],[{slower:true},/SPACE \+1/]]) {
  const f=fixture(options);try{assert.throws(f.run,message);}finally{f.close();}
 }
});
