import fs from'node:fs';import path from'node:path';import zlib from'node:zlib';import crypto from'node:crypto';import assert from'node:assert/strict';
import{auditSession}from'./pal-timing-audit.mjs';import{parseViceLabels}from'./runtime-cycles.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'docs/diagnostics/spike-nacelles/p5'),read=n=>JSON.parse(fs.readFileSync(n)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function rows(n){const[h,...r]=zlib.gunzipSync(fs.readFileSync(path.join(out,n))).toString().trim().split('\n').map(x=>x.split(','));return r.map(v=>Object.fromEntries(h.map((k,i)=>[k,isNaN(+v[i])?v[i]:+v[i]])));}
const stage=(r,n)=>r[`profile_clock${n}`]-r[`profile_clock${n-1}`],max=r=>r.reduce((a,b)=>!a||b.wall_cycles>a.wall_cycles?b:a,null),mean=r=>r.reduce((s,x)=>s+x.wall_cycles,0)/r.length;
function half(source,d){for(let s of[96,208,320])if(source>=s&&source<s+48)return[1,2,3+d,3+d,2,1][Math.floor((source-s)/8)];return 0;}
function contact(r,phase){let top=(r.player_y-8)>>3,count=(((r.player_y-8)&7)+14>>3)+1;let h=Math.max(...Array.from({length:count},(_,i)=>half(phase-top-i,r.difficulty)));if(!h)return false;let x=r.player_x;let target=phase<190||phase>=302?92:152;if(r._route==='contact'&&phase>=80&&phase<139)target=124;x+=x<target?2:x>target?-2:0;return x<128+h*4&&x+7>=128-h*4;}
const report={baseline:'19b1464',flagOffAtrSha:sha(fs.readFileSync(path.join(root,'dist/void-strike-65.atr'))),difficulties:[]};assert.equal(report.flagOffAtrSha,'410652973ed76f0033f0fbff84c17a484104f95ff97cbcc1d9eff9e6cb996ae7');
for(const [d,name]of['easy','medium','hard'].entries()){
 const item={difficulty:d,name,variants:{}};let lookup={};
 for(const variant of['main','off','islands']){
  let v={routes:{}};
  for(const route of['flight','contact']){
   const id=`${variant}-${name}-${route}`,r=rows(`${id}.csv.gz`),side=rows(`${id}-islands.csv.gz`);r.forEach(x=>x._route=route);lookup[`${variant}-${route}`]=r;
   assert.equal(r.length,2300);assert.equal(side.length,2300);
   const audit=auditSession(id,r);assert.ok(audit.passed,`${id} PAL gate`);assert.equal(audit.rows_over_target,0);
   assert.ok(r.every(x=>x.missed_frames===0&&x.extra_vbi_boundaries===0&&x.dli_sequence_violations===0));assert.ok(side.every(x=>x.corrupt_cells===0));
   const cap=r.filter(x=>x.director_sector===1),active=r.filter(x=>x.sector_state<6),islands=r.filter(x=>side[x.frame].island_cells>0);
   const edge=variant==='islands'?active.filter(x=>stage(x,14)>200&&contact(x,side[x.frame].phase)):[],damaging=islands.filter(x=>x.player_health-x.player_health_after===2&&[100,104,108,112,116,132,136,140,144,148].includes(x.player_x_after));
   const ordinary=islands.filter(x=>x.player_lifecycle===0&&x.player_health===x.player_health_after&&!contact(x,side[x.frame].phase));
   const switches=active.filter(x=>r[x.frame+1]&&r[x.frame+1].corridor_phase!==x.corridor_phase);
   const shots=islands.filter(x=>side[x.frame].player_shots>0);
   const pick=x=>x?{frame:x.frame,wall:x.wall_cycles,contactStageWall:stage(x,14),state:x.sector_state,phase:side[x.frame].phase,x:x.player_x,xAfter:x.player_x_after,health:x.player_health,healthAfter:x.player_health_after}:null;
   const entry=r.findIndex(x=>x.sector_state===0);assert.ok(entry>=0);let carry=0;while(entry+carry<r.length&&(r[entry+carry].entity_active_mask&1))carry++;
   const directorEntry=r.findIndex(x=>x.director_sector===1);let earlyCarry=0;while(directorEntry+earlyCarry<r.length&&(r[directorEntry+earlyCarry].entity_active_mask&1))earlyCarry++;
   if(variant==='islands')assert.ok(islands.every(x=>(x.entity_active_mask&1)===0&&x.pickup_state!==2&&[0,1,2,3].every(i=>x[`light_state${i}`]===0)),'entity/Light/pickup inside island stage');
   v.routes[route]={audit,capital:{frames:cap.length,maximum:pick(max(cap)),average:mean(cap)},hullActive:{maximum:pick(max(active)),average:mean(active)},ordinary:pick(max(ordinary)),edge:pick(max(edge)),damaging:pick(max(damaging)),rowSwitch:pick(max(switches)),playerShotCrossing:pick(max(shots)),carry:{hullEntryFrame:r[entry].frame,framesAfterHullEntry:carry,directorEntryFrame:r[directorEntry].frame,framesAfterDirectorEntry:earlyCarry,firstIslandFrame:side.find(x=>x.island_cells>0)?.frame??null},coverage:{islandFrames:islands.length,playerShotFrames:shots.length,enemyShotCellFrames:side.reduce((s,x)=>s+x.enemy_shots,0),shellCellFrames:side.reduce((s,x)=>s+x.shells,0),checkedBackgroundCells:side.reduce((s,x)=>s+x.checked_cells,0),corruptBackgroundCells:side.reduce((s,x)=>s+x.corrupt_cells,0)}};
  }item.variants[variant]=v;
 }
 for(const route of['flight','contact']){
  const a=item.variants.main.routes[route],b=item.variants.off.routes[route],p=item.variants.islands.routes[route];
  p.delta={capitalPeakVsMain:p.capital.maximum.wall-a.capital.maximum.wall,capitalMeanVsMain:p.capital.average-a.capital.average,capitalPeakVsOff:p.capital.maximum.wall-b.capital.maximum.wall,capitalMeanVsOff:p.capital.average-b.capital.average};
  b.delta={capitalPeakVsMain:b.capital.maximum.wall-a.capital.maximum.wall,capitalMeanVsMain:b.capital.average-a.capital.average};
  for(const field of['hullActive','ordinary','edge','damaging','rowSwitch','playerShotCrossing']){
   let peak=field==='hullActive'?p[field].maximum:p[field];if(peak){peak.mainSameFrame=lookup[`main-${route}`][peak.frame].wall_cycles;peak.deltaVsMainSameFrame=peak.wall-peak.mainSameFrame;peak.offSameFrame=lookup[`off-${route}`][peak.frame].wall_cycles;peak.deltaVsOffSameFrame=peak.wall-peak.offSameFrame;}
  }
 }report.difficulties.push(item);
}
const dir=path.join(root,'build/spike-nacelles-p5'),m=read(path.join(dir,'manifest.json')),base=read(path.join(root,'build/manifest.json')),p1=read(path.join(root,'build/spike-nacelles-p1/manifest.json')),l=parseViceLabels(fs.readFileSync(path.join(dir,'void-strike-65.lbl'),'utf8'));
report.bytes={residentCodeDelta:-9,capitalCode:l.get('spike_nacelles_code_end')-l.get('spike_nacelles_start'),data:l.get('spike_nacelles_data_end')-l.get('spike_nacelles_code_end'),state:l.get('spike_nacelles_end')-l.get('spike_nacelles_data_end'),windowTotal:l.get('spike_nacelles_end')-l.get('spike_nacelles_start'),netResidency:l.get('spike_nacelles_end')-l.get('spike_nacelles_start')-9,windowFree:0xb8fb-l.get('spike_nacelles_end'),transportDelta:m.transportCapacity.totalTransportBytes-base.transportCapacity.totalTransportBytes,transportDeltaVsP1:m.transportCapacity.totalTransportBytes-p1.transportCapacity.totalTransportBytes,rendererCopyEliminated:191,trampoline:8};
report.atr={path:path.join(dir,'void-strike-65.atr'),sha256:sha(fs.readFileSync(path.join(dir,'void-strike-65.atr')))};
for(const g of read(path.join(out,'gifs.json')))assert.equal(g.atrSha256,report.atr.sha256);
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(report,null,2)+'\n');
for(const x of report.difficulties){console.log(x.name);for(const v of['main','off','islands']){let r=x.variants[v].routes.flight;console.log(v,JSON.stringify({capitalPeak:r.capital.maximum.wall,capitalAverage:r.capital.average,activePeak:r.hullActive.maximum,ordinary:r.ordinary,carry:r.carry,delta:r.delta}));}console.log('island contact',JSON.stringify(x.variants.islands.routes.contact));}console.log(report.bytes,report.atr);
