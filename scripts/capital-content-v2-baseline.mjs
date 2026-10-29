// Read-only summary of the permanent native gate. No guest modifications.
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {csv,read,sha} from './frame-peak-results.mjs';
import {validatePeakCoverage} from './frame-peak-routes.mjs';
const root=process.argv[2]??'build/frame-peak-fixed';
const out=process.argv[3]??'docs/diagnostics/capital-content-v2';
const runs=read(`${root}/runs.json`);validatePeakCoverage(runs.map(r=>r.id));
const events=[...fs.readFileSync('scripts/atari800-wall-trace.h','utf8').matchAll(/DFTRACE_EVENT_(\w+) = 1u << (\d+)/g)].map(m=>[m[1],Number(m[2])]);
const all=[],bindings=[];
for(const run of runs){
 if(run.code!==0)throw Error(`${run.id}: incomplete or failed capture`);
 const file=`${run.dir}/runtime-wall-trace/${run.id}.csv`;
 bindings.push({file,sha256:sha(file)});
 const mask=fs.readFileSync(`${run.dir}/frame-state-mask.bin`).subarray(0,65536);
 const offsets=new Map();let width=0;mask.forEach((v,i)=>{if(v)offsets.set(i,width++);});
 const snapshots=gunzipSync(fs.readFileSync(`${root}/${run.id}-snapshots.bin.gz`));
 const raw=csv(file);if(snapshots.length!==raw.length*width)throw Error('Snapshot length mismatch');
 let index=-1;
 for(const r of raw){index++;if(!r.boss_entry&&!r.boss_state&&r.sector_state<7){
  const b=[r.start_clock,...Array.from({length:22},(_,i)=>r[`profile_clock${i}`]),r.end_clock];
  if(b.some((x,i)=>!Number.isFinite(x)||(i&&x<b[i-1])))throw Error('Incomplete profile');
  const byte=a=>snapshots[index*width+offsets.get(a)];
  const musicRow=byte(0x4ed9)!==0&&byte(0x4eda)===6;
  const explosionActive=byte(0x4eae)!==0||r.capital_explosion!==0;
  const event=musicRow||explosionActive||r.sector_state!==2;
  all.push({event,musicRow,explosionActive,route:run.id,frame:r.frame,wall:r.wall_cycles,sectorState:r.sector_state,events:events.filter(([,n])=>r.events&(1<<n)).map(([n])=>n),capitalExplosion:r.capital_explosion,audioWall:b[22]-b[21],broadsideUpdateWall:b[9]-b[8],broadsideRenderWall:b[18]-b[17],worldRingPlayfieldWall:b[14]-b[13],explosionVisualsWall:b[17]-b[16]});
 }}
}
const distribution=a=>{const v=a.map(r=>r.wall).sort((a,b)=>a-b);return {count:v.length,p50:v[Math.ceil(v.length*.5)-1],p95:v[Math.ceil(v.length*.95)-1],p99:v[Math.ceil(v.length*.99)-1],max:v.at(-1)};};
const result={measurement:'MEASURED native PAL wall cycles; same timer on 15 routes, including the 12-route L2 matrix',scope:'baseline without new content',distribution:distribution(all),ordinary:distribution(all.filter(r=>!r.event)),event:distribution(all.filter(r=>r.event)),budgets:Object.fromEntries([['ordinary',false],['event',true]].map(([name,event])=>{const rows=all.filter(r=>r.event===event),worst=Math.max(...rows.map(r=>r.wall)),withoutAudio=Math.max(...rows.map(r=>r.wall-r.audioWall));return [name,{worst,withoutAudio,headroomAfterSafety:31500-worst-300,composedWith1187:withoutAudio+1187,composedHeadroomAfterSafety:31500-withoutAudio-1187-300}];})),classification:'Event: music row (end MUSIC_ROW_TIMER=6 while active), live hull explosion, or sector state other than steady2; ordinary: remaining capital frames.',top20:all.sort((a,b)=>b.wall-a.wall).slice(0,20),limitations:['Segment costs include DMA and shared work; they are NOT reclaimable CPU measurements.','Music row classification uses the captured end-of-loop timer; pre-tick deferral signal is MUSIC_ACTIVE && MUSIC_ROW_TIMER==1.','Amendment 1 reclaimed costs remain ESTIMATE until the hazard sector is measured.'],bindings};
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(`${out}/baseline.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.distribution));
