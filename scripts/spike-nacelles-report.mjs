import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {auditSession} from './pal-timing-audit.mjs';
import {parseViceLabels} from './runtime-cycles.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'docs/diagnostics/spike-nacelles');
function rows(file) {
 const [head,...data]=zlib.gunzipSync(fs.readFileSync(path.join(out,file))).toString().trim().split('\n').map(l=>l.split(','));
 return data.map(v=>Object.fromEntries(head.map((k,i)=>[k,Number.isNaN(+v[i])?v[i]:+v[i]])));
}
const read=p=>JSON.parse(fs.readFileSync(p));const max=(r,f)=>r.reduce((a,b)=>!a||f(b)>f(a)?b:a,null);
const cap=r=>r.sector_state<6,sector=r=>r.director_sector===1;
const stage=(r,i)=>r[`profile_clock${i}`]-r[`profile_clock${i-1}`];
const fields=r=>({frame:r.frame,wall:r.wall_cycles,state:r.sector_state,phaseLow:r.corridor_phase,
 x:r.player_x,xAfter:r.player_x_after,health:r.player_health,healthAfter:r.player_health_after,
 worldWall:stage(r,13),contactWall:stage(r,14)});
const baseline={flight:rows('main-flight-medium.csv.gz'),contact:rows('main-contact-medium.csv.gz')};
const report={baseline:'19b146437ba10ecc64716d3d58b52355fdf29fa3',baselineAtr:'410652973ed76f0033f0fbff84c17a484104f95ff97cbcc1d9eff9e6cb996ae7',routes:{},patterns:[]};
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'dist/void-strike-65.atr'))).digest('hex'),report.baselineAtr,'flag-off campaign changed');
for(const route of ['flight','contact']) report.routes[route]={policy:route==='flight'?'sweep':'nacelle-contact',baseline:auditSession(`main-${route}`,baseline[route])};
for(let p=1;p<=3;p++) {
 const dir=path.join(root,`build/spike-nacelles-p${p}`),m=read(path.join(dir,'manifest.json'));
 const l=parseViceLabels(fs.readFileSync(path.join(dir,'void-strike-65.lbl'),'utf8'));
 const baselineLabels=parseViceLabels(fs.readFileSync(path.join(root,'build/void-strike-65.lbl'),'utf8'));
 for(const [name,address] of baselineLabels) if(l.has(name)&&!name.startsWith('__')&&!name.startsWith('@')) assert.equal(l.get(name),address,`common routine moved: ${name}`);
 const item={pattern:p,channel:read(path.join(dir,'nacelle-correctness.json')).difficulties,routes:{}};
 for(const route of ['flight','contact']) {
  const r=rows(`p${p}-${route}-medium.csv.gz`),b=baseline[route];
  assert.equal(r.length,2100);const audit=auditSession(`p${p}-${route}`,r);assert.ok(audit.passed);assert.equal(audit.rows_over_target,0);
  assert.ok(r.every(x=>x.missed_frames===0&&x.extra_vbi_boundaries===0&&x.dli_sequence_violations===0));
  const rr=r.filter(cap),br=b.filter(cap),sr=r.filter(sector),bs=b.filter(sector);
  const switches=rr.filter(x=>r[x.frame+1]&&r[x.frame+1].corridor_phase!==x.corridor_phase);
  const edge=rr.filter(x=>stage(x,14)>200);
  const hits=rr.filter(x=>x.player_health-x.player_health_after===2&&[88,92,156,160].includes(x.player_x_after));
  function peak(v,baseFilter) {let x=max(v,x=>x.wall_cycles);if(!x)return null;const a=b.find(t=>t.frame===x.frame);const bm=max(baseFilter,x=>x.wall_cycles);return {...fields(x),mainSameFrame:a.wall_cycles,deltaSameFrame:x.wall_cycles-a.wall_cycles,mainRoutePeak:bm?.wall_cycles,deltaPeaks:bm?x.wall_cycles-bm.wall_cycles:null,stageAttribution:Array.from({length:22},(_,i)=>({stage:i,spike:i?stage(x,i):x.profile_clock0-x.start_clock,main:i?stage(a,i):a.profile_clock0-a.start_clock})).map(v=>({...v,delta:v.spike-v.main}))};}
  item.routes[route]={audit,capitalSector:peak(sr,bs),activeHull:peak(rr,br),edge:peak(edge,b.filter(x=>cap(x)&&stage(x,14)>200)),damage:peak(hits,b.filter(cap)),rowSwitch:peak(switches,br),hullDamageEvents:hits.map(fields)};
  const peakRow=max(rr,x=>x.wall_cycles),a=b[peakRow.frame];
  item.routes[route].activePeakStageDelta=Array.from({length:22},(_,i)=>({stage:i,spike: i?stage(peakRow,i):peakRow.profile_clock0-peakRow.start_clock,main:i?stage(a,i):a.profile_clock0-a.start_clock})).map(v=>({...v,delta:v.spike-v.main}));
 }
 const base=read(path.join(root,'build/manifest.json'));
 const raw=fs.readFileSync(path.join(dir,'void-strike-65.atr'));
 const hash=crypto.createHash('sha256').update(raw).digest('hex');
 const gif=read(path.join(out,'gif-flight.json')).find(x=>x.pattern===p);assert.equal(hash,gif.atrSha256,'native/capture ATR changed');
 item.bytes={residentSegmentDelta:0,physicalResidentDelta:l.get('spike_nacelles_end')-l.get('spike_nacelles_start'),capitalCode:l.get('spike_nacelles_code_end')-l.get('spike_nacelles_start'),descriptors:l.get('spike_nacelles_data_end')-l.get('spike_nacelles_code_end'),scratch:5,strips:128,total:l.get('spike_nacelles_end')-l.get('spike_nacelles_start'),freePermitted:0xb8fb-l.get('spike_nacelles_end'),windowPackedDelta:m.residentCapacity.basicWindow.transport.packedBytes-base.residentCapacity.basicWindow.transport.packedBytes,transportBytesDelta:m.transportCapacity.totalTransportBytes-base.transportCapacity.totalTransportBytes,transportSectorsDelta:m.transportCapacity.totalTransportSectors-base.transportCapacity.totalTransportSectors};
 item.computedCpu={main:base.runtimeTiming.cpuDmaOff.heaviestMainLoopCycles,spike:m.runtimeTiming.cpuDmaOff.heaviestMainLoopCycles};item.atr={path:path.join(dir,'void-strike-65.atr'),sha256:hash};
 report.patterns.push(item);
}
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(report,null,2)+'\n');
for(const p of report.patterns){console.log('P'+p.pattern,p.channel.map(x=>x.minChannelCells).join('/'),p.bytes);for(const [n,r]of Object.entries(p.routes))console.log(n,JSON.stringify({sector:r.capitalSector,active:r.activeHull,edge:r.edge,damage:r.damage,rowSwitch:r.rowSwitch,fence:r.audit.worst_fence_margin_cycles}));}
