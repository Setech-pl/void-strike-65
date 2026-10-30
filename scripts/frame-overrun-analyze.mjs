// Analyze native forced-miss captures. No gate relaxation.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {auditSession} from './pal-timing-audit.mjs';
const root=process.env.VS65_OVERRUN_EVIDENCE??'build/phase-resync/cases';
const text=file=>fs.existsSync(file)?fs.readFileSync(file,'utf8'):
 zlib.gunzipSync(fs.readFileSync(file+'.gz')).toString();
const csv=file=>{const [header,...lines]=text(file).trim().split('\n');
 const keys=header.split(',');return lines.map(line=>Object.fromEntries(line.split(',')
  .map((v,i)=>[keys[i],/^-?\d+$/.test(v)?Number(v):v])));};
const read=file=>JSON.parse(text(file));
const count=(rows,key)=>rows.reduce((s,r)=>s+(r[key]??0),0);
const max=(rows,key)=>Math.max(0,...rows.map(r=>r[key]??0));
const range=values=>values.length?[Math.min(...values),Math.max(...values)]:null;
const modal=a=>[...new Set(a)].sort((x,y)=>a.filter(v=>v===y).length-a.filter(v=>v===x).length)[0];
const kind=r=>r.boss_state?'boss':r.sector_state<7?'capital':'space';
const logicFields=['player_x','player_y','player_lifecycle','score_lo','score_hi',
 'gameplay_frame','entity_active','entity_y','enemy_projectiles','player_fighter_projectiles',
 'corridor_phase','engine_vscroll','engine_a2_head','boss_state','boss_finale',
 'fire_accept_calls','player_burst_state','player_burst_remaining','player_burst_timer'];
const results=[];
for(const scene of ['space','capital','boss','hud-music']) {
 const control=`${root}/${scene}-control`;
 const baseline=csv(`${control}/trace.csv`),bs=csv(`${control}/states.csv`);
 const starts=Object.fromEntries(['space','capital','boss'].map(k=>[k,
  modal(baseline.filter(r=>!r.boss_entry&&kind(r)===k).map(r=>r.start_scanline))]));
 for(const mode of ['control','single','repeat'])for(const forced of mode==='control'?[false]:[false,true]) {
  const id=`${scene}-${mode}${forced?'-forced':''}`,dir=`${root}/${id}`;
  if(!fs.existsSync(`${dir}/provenance.json`))continue;
  const provenance=read(`${dir}/provenance.json`);
  assert.equal(provenance.video.physicalFrames,575,id+' physical recording truncated');
  const events=text(`${dir}/events.jsonl`).trim().split('\n').map(JSON.parse);
  const window=events.find(e=>e.event==='window'),injections=events.filter(e=>e.event==='injection');
  assert.equal(injections.length,mode==='control'?0:mode==='single'?1:20,id+' injection count');
  if(mode==='repeat')assert.deepEqual(injections.slice(1).map((e,i)=>e.host-injections[i].host),
   Array(19).fill(25),id+' physical injection cadence');
  for(const e of injections) {
   assert.ok(e.restored,id+' code not restored');assert.equal(e.extra_cpu_cycles,1500);
   assert.equal(e.cpu_cycles,e.jmps*3);
   if(!forced)assert.equal(e.cpu_cycles,1500);
   else assert.ok(e.pad_end>=e.deadline&&e.end>e.deadline,id+' deadline not crossed');
  }
  const raw=csv(`${dir}/trace.csv`),rows=raw.filter(r=>!r.boss_entry);
  const selected=rows.filter(r=>r.start_host_frame>=window.host&&r.start_host_frame<window.end_host);
  const life=text(`${dir}/lifetime.jsonl`).trim().split('\n').map(JSON.parse);
  const clocks=csv(`${dir}/clock.csv`);
  const states=csv(`${dir}/states.csv`),baseStates=new Map(bs.map(r=>[r.frame,r]));
  const stateChanges=states.filter(r=>baseStates.has(r.frame)&&
    r.logical_fnv1a64!==baseStates.get(r.frame).logical_fnv1a64);
  const fieldChanges={};let firstLogic=null;
  const bm=new Map(baseline.map(r=>[r.frame,r]));
  for(const r of rows) {
   const b=bm.get(r.frame);if(!b)continue;
   for(const k of logicFields)if(k in r&&r[k]!==b[k]) {
    fieldChanges[k]=(fieldChanges[k]??0)+1;
    firstLogic??={frame:r.frame,field:k,control:b[k],observed:r[k]};
   }
  }
  const intervals=selected.slice(1).map((r,i)=>r.update_sound_clock-selected[i].update_sound_clock);
  const audit=auditSession(id,rows);
  const phys=csv(`${dir}/physical-frames.csv`);
  assert.equal(phys.length,575,id+' physical frame log incomplete');
  assert.ok(phys.every((r,i)=>r.host===window.host+i),id+' physical frames dropped');
  // Compare exact native RGB, not lossy MP4 pixels. Optional after raw cleanup.
  const rawFile=`build/frame-overrun/${id}/frames.rgb`,baseFile=`build/frame-overrun/${scene}-control/frames.rgb`;
  let raster=null;
  if(fs.existsSync(rawFile)&&fs.existsSync(baseFile)) {
   const a=fs.readFileSync(rawFile),b=fs.readFileSync(baseFile),size=384*240*3;
   const different=[];let pixelMax=0,first=null;
   const refs=new Map(),lags={},unmatched=[];
   const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
   for(let f=0;f<575;f++) {
    const h=hash(b.subarray(f*size,(f+1)*size));
    if(!refs.has(h))refs.set(h,[]);refs.get(h).push(f);
   }
   for(let f=0;f<575;f++) {
    const matches=refs.get(hash(a.subarray(f*size,(f+1)*size)));
    if(!matches)unmatched.push(f);
    else {const lag=matches.map(q=>f-q).sort((x,y)=>Math.abs(x)-Math.abs(y))[0];
     lags[lag]=(lags[lag]??0)+1;}
    if(a.subarray(f*size,(f+1)*size).equals(b.subarray(f*size,(f+1)*size)))continue;
    let pixels=0,x1=384,y1=240,x2=0,y2=0;
    for(let i=0;i<size;i+=3)if(a[f*size+i]!==b[f*size+i]||a[f*size+i+1]!==b[f*size+i+1]||a[f*size+i+2]!==b[f*size+i+2]) {
     const p=i/3,x=p%384,y=Math.floor(p/384);pixels++;x1=Math.min(x1,x);x2=Math.max(x2,x);y1=Math.min(y1,y);y2=Math.max(y2,y);
    }
    different.push(f);pixelMax=Math.max(pixelMax,pixels);first??={videoFrame:f,pixels,bbox:[x1,y1,x2,y2]};
   }
   raster={differentPhysicalRasters:different.length,first,maximumDifferentPixels:pixelMax,
    // Exact matches to ANY control frame account for a harmless repeated/
    // delayed image. Remaining frames contain actual mixed raster content.
    unmatchedControlRasters:unmatched.length,unmatchedPhysicalFrames:unmatched,firstUnmatched:unmatched[0]??null,exactMatchLagHistogram:lags};
  }
  const result={id,scene,mode,forced,window,injections,physicalFrames:575,
   sampledRows:selected.length,peakWall:max(selected,'wall_cycles'),
   missedFrames:count(selected,'missed_frames'),extraVbi:count(selected,'extra_vbi_boundaries'),
   dliViolations:max(selected,'dli_sequence_violations'),
   startScanlines:[...new Set(selected.map(r=>r.start_scanline))].sort((a,b)=>a-b),
   baselinePhaseShiftedRows:selected.filter(r=>Math.abs(r.start_scanline-starts[kind(r)])>8).length,
   staleL2:life.filter(e=>['stale_access','resident_entry','rate_read','partial_l2_execution'].includes(e.event)).length,
   worldHullMismatches:clocks.filter(r=>r.state<7&&r.world!==r.hull).length,
   audioCalls:[...new Set(selected.map(r=>r.update_sound_calls))],audioIntervalCycles:range(intervals),
   audioIntervalMs:range(intervals.map(v=>v/(35568*49.8607597)*1000)),
   logicFieldChanges:fieldChanges,firstLogicDifference:firstLogic,
   logicalSnapshotChanges:stateChanges.length,firstSnapshotChange:stateChanges[0]?.frame??null,
   raster,audit,provenance};
  fs.writeFileSync(`${dir}/analysis.json`,JSON.stringify(result,null,2)+'\n');results.push(result);
 }
}
fs.writeFileSync(`${root}/summary.json`,JSON.stringify(results,null,2)+'\n');
console.table(results.map(r=>({case:r.id,events:r.injections.length,wall:r.peakWall,
 missed:r.missedFrames,VBI:r.extraVbi,DLI:r.dliViolations,shift:r.baselinePhaseShiftedRows,
 stale:r.staleL2,logic:Object.keys(r.logicFieldChanges).length,
 RGB:r.raster?.differentPhysicalRasters,audio:r.audioIntervalMs?.map(v=>v.toFixed(2)).join('..')})));
