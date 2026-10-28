// Compact Amendment 5 evidence. Raw native traces remain uncommitted in build/.
import fs from 'node:fs';
import readline from 'node:readline';
import crypto from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {csv} from './frame-peak-results.mjs';
const root='build/evidence/capital-content-v2/amendment5';
const out='docs/diagnostics/capital-content-v2';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const native=read(`${root}/native/results.json`),exits=read(`${root}/exits/results.json`);
assert.equal(native.results.length,15);assert.ok(native.results.every(r=>r.passed));assert.equal(exits.length,8);
const homes=[];
const files=[...native.results.map(r=>`${root}/native/${r.id}-home.csv`),
 ...exits.map(r=>`${root}/exits/l2-exit-${r.rows}-${r.path}.csv`),
 ...[1,2,3,4].map(r=>`${root}/home-r${r}.csv`)];
for(const file of files){
 const counts={file,accesses:0,contentFetches:0,bossOwnedFetches:0,invalidContentFetches:0,bootAccesses:0};
 const lines=readline.createInterface({input:fs.createReadStream(file)});
 for await(const line of lines){if(line.startsWith('host,'))continue;
  const [host,pc,address,write,game,sector,boss,valid]=line.split(',').map(Number);
  counts.accesses++;if(game===0)counts.bootAccesses++;
  if(!write&&address===pc&&pc>=0x1180&&pc<0x1900){
   if(boss)counts.bossOwnedFetches++;
   else{counts.contentFetches++;if(!valid||game!==6)counts.invalidContentFetches++;}
  }
 }
 assert.equal(counts.invalidContentFetches,0,file);homes.push(counts);
}
assert.ok(homes.some(h=>h.contentFetches>0));assert.ok(homes.some(h=>h.bossOwnedFetches>0));
const boot=read('build/cc2-a5-campaign/runtime-wall-trace/boot-smoke/report.json');assert.ok(boot.passed);
const loads=native.results.flatMap(r=>fs.readFileSync(`${root}/native/${r.id}-lifetime.jsonl`,'utf8').trim().split('\n').map(JSON.parse).filter(x=>x.event==='content_loaded'));
const a=read('build/evidence/capital-content-v2/platform-space-before.json').records,b=read(`${root}/space.json`).records;
assert.equal(a.length,720);assert.equal(b.length,720);
for(let i=0;i<a.length;i++)for(const k of ['difficulty','x','accumulator','activeCpu','predictorCpu','predictorResult'])assert.equal(a[i][k],b[i][k]);
const before=fs.readFileSync(`${root}/stress-cc2-baseline-campaign.log`,'utf8'),after=fs.readFileSync(`${root}/stress-cc2-a5-campaign.log`,'utf8');assert.equal(before,after);
let worstCapitalWithoutAudio=0;
for(const run of native.results)for(const r of csv(`${run.dir}/runtime-wall-trace/${run.id}.csv`))
 if(!r.boss_entry&&!r.boss_state&&r.sector_state<7)
  worstCapitalWithoutAudio=Math.max(worstCapitalWithoutAudio,r.wall_cycles-(r.profile_clock21-r.profile_clock20));
assert.ok(worstCapitalWithoutAudio+1187<=31200,'Composed capital retains300 wall-cycle safety');
const result={composedCapital:{withoutAudio:worstCapitalWithoutAudio,audio:1187,total:worstCapitalWithoutAudio+1187,limit:31200},status:'platform verification passed; owner smoke pending; uncommitted',measurement:'Native PAL wall unless explicitly CPU-only',
 native:{routes:15,frames:native.results.reduce((s,r)=>s+r.frames,0),peak:Math.max(...native.results.map(r=>r.peak)),capitalPeak:Math.max(...native.results.map(r=>r.capitalPeak)),minimumFence:Math.min(...native.results.map(r=>r.fence)),rows:native.results},
 boot:{passed:true,cold:boot.sessions.map(s=>({id:s.id,milestones:s.milestones})),reset:boot.reset_sessions.length,compatibility:boot.compatibility_sessions.length,forcedRestore:boot.overlay.forced_restore_sessions.length},
 load:{runs:loads.length,maxHostFrames:Math.max(...loads.map(x=>x.host_frames)),maxWallCycles:Math.max(...loads.map(x=>x.wall_cycles))},
 space:{fixtures:720,cpuDelta:0},stress:{comparison:'NMOS6502 CPU-only; off and lost lance; all five compositions',delta:0,rows:after.trim().split('\n')},
 home:{observer:'host-only CPU accesses; opcode fetch count identified by address==pc, boss-owned image distinguished from content',guestObserverBytes:0,invalidContentExecutions:0,rows:homes},exits,
 bosses:[1,2,3,4].map(region=>({region,records:fs.readFileSync(`${root}/boss${region}/r${region}.jsonl`,'utf8').trim().split('\n').map(JSON.parse)}))};
const play='build/play/capital-content-v2/1';fs.mkdirSync(play,{recursive:true});
result.delivery=[['campaign','cc2-a5-campaign','Campaign level1, capital480; checked content platform only'],
 ['capital-480','level-1-s1','Direct capital480; difficulty selectable in OPTIONS'],
 ['capital-960','l2-capital-960','Direct capital960; difficulty selectable in OPTIONS']].map(([name,dir,description])=>{
 const target=path.resolve(play,`${name}.atr`),source=`build/${dir}/void-strike-65.atr`;
 fs.copyFileSync(source,target);const sha256=crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
 return {path:target,sha256,description,command:`atari800 -xl -pal -nobasic ${target}`};
});
fs.writeFileSync(`${out}/amendment5-platform.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({frames:result.native.frames,peak:result.native.peak,capital:result.native.capitalPeak,fence:result.native.minimumFence,homeInvalid:0,load:result.load}));
