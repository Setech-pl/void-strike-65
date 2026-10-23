// Package the measured shake candidate; generated ATR/media stay under build/.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const diag='docs/diagnostics/boss-death-shake-2026-10-23',root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(n,v)=>fs.writeFileSync(`${diag}/${n}`,JSON.stringify(v,null,2)+'\n');
const before=JSON.parse(execFileSync('git',['show','77c3104:dist/void-strike-65-manifest.json'],{encoding:'utf8'})),after=read('build/manifest.json');
const variants=['level-1-s6','boss-region-2-level-1-s6','boss-region-3-level-1-s6','boss-region-4-level-1-s6'];
const parse=p=>fs.readFileSync(p,'utf8').trim().split('\n').filter(l=>l.startsWith('{')).map(JSON.parse);
const proof=read('build/play/boss-death-breakup/shake-native/proof.json');
for(const region of proof.regions){
  if(region.cases.length!==24 || region.comparedFrames!==4200)throw Error('incomplete native matrix');
  region.nominal=parse(`build/boss-death-shake-r${region.region}-nominal.log`);
  const t=region.nominal.find(x=>'peakDmaOn'in x),end=region.nominal.find(x=>x.restartedLevel);
  if(!t||!end||end.misses||end.hudErrors||end.shipErrors||end.dliErrors)throw Error('nominal failed');
  region.peakPreFence=Math.max(region.peakPreFence,t.peakPreFence);region.peakDmaOn=Math.max(region.peakDmaOn,t.peakDmaOn);region.minimumFence=Math.min(region.minimumFence,t.minimumFence);
  if(region.peakPreFence>24300||region.peakDmaOn>31500||region.minimumFence<500)throw Error('timing gate');
}
write('native.json',proof);
const jobs=[['campaign','build','dist/void-strike-65.atr'],...variants.map((d,i)=>[['r1-breaker','r2-citadel','r3-spine','r4-bastion'][i],`build/${d}`])];
const artifacts=jobs.map(([name,buildDirectory,source=`${buildDirectory}/void-strike-65.atr`])=>{
  const data=fs.readFileSync(source),sha256=crypto.createHash('sha256').update(data).digest('hex');
  const output=path.join(root,'build/play/boss-death-breakup',`boss-death-b-shake-${name}-${sha256.slice(0,12)}.atr`);fs.copyFileSync(source,output);
  return{name,path:output,source,bytes:data.length,sha256,launch:`atari800 -xl -pal -nobasic ${output}`};
});write('candidate.json',{status:'OWNER-SMOKE CANDIDATE',date:'2026-10-23',branch:'codex/boss-death-breakup',artifacts});
const fight=variants.map(d=>{
  const old=`build/boss-death-shake-baseline/${d}`,now=`build/${d}`;
  const same=['resident-runtime.bin','entity-code-runtime.bin','pickup-code-runtime.bin','starfield-runtime.bin','a2-kernel-runtime.bin','sector-reader.bin','overlay-boss-slot-c.bin','overlay-boss-slot-d.bin','overlay-boss-slot-e.bin','overlay-boss-install.bin'];
  for(const f of same)if(!fs.readFileSync(`${old}/${f}`).equals(fs.readFileSync(`${now}/${f}`)))throw Error(`fight changed ${d}/${f}`);
  const changes=f=>{let a=fs.readFileSync(`${old}/${f}`),b=fs.readFileSync(`${now}/${f}`),indices=[];if(a.length!==b.length)throw Error('length change');for(let i=0;i<a.length;i++)if(a[i]!==b[i])indices.push(i);return indices};
  const a=changes('overlay-boss-code.bin'),boot=changes('boss-death-boot.bin');
  if(a.some(x=>![613,615].includes(x))||boot.some(x=>![125,143,145].includes(x)))throw Error('read code changed beyond generated count/folds');
  return{variant:d,byteIdentical:same,bossAColdBootstrapFoldOffsets:a,bootstrapSectorCountAndFoldOperandOffsets:boot};
});write('fight-read-parity.json',fight);
function disk(m){let used=new Set();const add=(s,n)=>{for(let i=s;i<s+n;i++)used.add(i)};add(1,m.transportCapacity.totalTransportSectors);for(const r of [...m.sectorReader.levels,...m.overlays.runs,...m.boss.runs,m.levelSummary.code,...m.levelSummary.art.runs])add(r.startSector,r.sectors);add(598,2);return{total:1040,placed:used.size,free:1040-used.size,breakup:m.boss.death.diskSectors,reservationFree:32-m.boss.death.diskSectors};}
write('disk.json',{before:disk(before),after:disk(after)});
write('resources.json',{before:{engine:1948,engineDisk:2048,bootstrap:157,bootstrapDisk:512,state:13,scratchSpan:301},after:{engine:after.boss.death.codeBytes,engineDisk:2560,engineFree:after.boss.death.codeFree,bootstrap:157,bootstrapDisk:512,state:23,scratchSpan:480,scratchHighWater:'$4DE0',scratchAboveHighWater:96,activeList:92,blankRow:64},unchanged:{wingBuffer:512,scratchCapacity:576,install:after.boss.install.bytes,installFree:after.boss.install.freeBytes,residentDelta:0,windowDelta:0}});
console.log(JSON.stringify({regions:proof.regions.map(({cases,nominal,...r})=>r),disk:disk(after),artifacts},null,2));
