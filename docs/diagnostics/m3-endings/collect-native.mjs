import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const jobs=[['quick-spread','build/runtime-wall-trace','campaign-1-spread-capital'],['quick-960','build/l2-capital-960/runtime-wall-trace','l2-960-1-flight'],...['easy','normal','hard'].map(t=>[`four-${t}`,'build/level-2-s0/runtime-wall-trace',`m3-four-${t}`]),['pilot-normal','build/m3-tempo-normal-level-2-s3/runtime-wall-trace','m3-pilot-normal']];
const results=[];
const reference={'quick-spread':30465,'quick-960':31156,'four-easy':32224,'four-normal':32184,'four-hard':32033,'pilot-normal':31281};
for(const [name,dir,id] of jobs){
 const report=JSON.parse(fs.readFileSync(`${dir}/${id}-focused-run.json`));
 const csv=fs.readFileSync(`${dir}/${id}.csv`),lines=csv.toString().trim().split('\n'),header=lines.shift().split(',');
 const all=lines.map(l=>Object.fromEntries(l.split(',').map((v,i)=>[header[i],Number(v)]))),rows=all.filter(r=>r.boss_entry!==1);
 const worst=rows.reduce((a,b)=>b.wall_cycles>a.wall_cycles?b:a);
 let previous=0,fourShotRises=0;
 for(const r of rows){if(r.enemy_projectiles-previous>=4)fourShotRises++;previous=r.enemy_projectiles;}
 const fourLightFrames=rows.filter(r=>[0,1,2,3].every(i=>r[`light_state${i}`]===2)).length;
 let nativeAdmissionGaps=[],pilotAdmissions=0;
 if(name==='pilot-normal') {
  let lastLive=null,wasLive=false,previousStates=[0,0,0,0];
  for(const r of rows.filter(r=>r.director_sector===3)) {
   for(let i=0;i<4;i++){if(r[`light_state${i}`]===2&&previousStates[i]!==2)pilotAdmissions++;previousStates[i]=r[`light_state${i}`];}
   const live=[0,1,2,3].some(i=>r[`light_state${i}`]===2);
   if(live&&lastLive!==null&&!wasLive)nativeAdmissionGaps.push(r.frame-lastLive-1);
   if(live)lastLive=r.frame;
   wasLive=live;
  }
 }
 if(name==='pilot-normal'){assert.equal(pilotAdmissions,32);assert.equal(nativeAdmissionGaps.length,3);assert.ok(nativeAdmissionGaps.every(n=>n>=2&&n<=4));}
 results.push({name,nativeAdmissionGaps,pilotAdmissions: name==='pilot-normal'?pilotAdmissions:null,referencePeak:reference[name],peakDelta:worst.wall_cycles-reference[name],frames:rows.length,peak:worst.wall_cycles,targetDelta:worst.wall_cycles-31500,hardMargin:32568-worst.wall_cycles,fourLightFrames,fourShotRises,worstFrame:worst,acceptance:report.acceptance,artifactSha256:report.artifact_sha256,traceSha256:crypto.createHash('sha256').update(csv).digest('hex'),loadingTransitions:all.filter(r=>r.boss_entry===1).map(r=>({frame:r.frame,wall_cycles:r.wall_cycles}))});
 assert.equal(rows.length,report.acceptance.measured_frames);assert.ok(report.acceptance.passed);assert.ok(worst.wall_cycles<=32568);
 assert.ok(worst.wall_cycles-reference[name]<=100,'owner worst-frame increase <=100');
 if(name.startsWith('four-'))assert.ok(fourLightFrames&&fourShotRises,'four-Light path and volley subject');
 fs.copyFileSync(`${dir}/${id}-focused-run.json`,`docs/diagnostics/m3-endings/${name}.json`);
}
fs.writeFileSync('docs/diagnostics/m3-endings/native.json',JSON.stringify({method:'MEASURED Atari8007.1.2 PAL; canonical boss-loading transition exclusion only; host lives held3, pilot/stress parked176 without player fire; no full native matrix',results},null,2)+'\n');
console.log(results.map(({name,peak,peakDelta,hardMargin,fourLightFrames,fourShotRises})=>({name,peak,peakDelta,hardMargin,fourLightFrames,fourShotRises})));
