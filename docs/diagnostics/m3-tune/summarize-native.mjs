// Run after the documented focused captures; keeps bounded JSON evidence only.
import fs from 'node:fs';
import crypto from 'node:crypto';
const jobs=[['quick-spread','build/runtime-wall-trace','campaign-1-spread-capital'],['quick-960','build/l2-capital-960/runtime-wall-trace','l2-960-1-flight'],...['easy','normal','hard'].flatMap(t=>[[`four-${t}`,'build/level-2-s0/runtime-wall-trace',`m3-four-${t}`],[`pilot-${t}`,`build/m3-tempo-${t}-level-2-s3/runtime-wall-trace`,`m3-pilot-${t}`]])];
const results=[];
for(const [name,dir,id]of jobs){
 const buffer=fs.readFileSync(`${dir}/${id}.csv`),lines=buffer.toString().trim().split('\n'),h=lines.shift().split(','),allRows=lines.map(l=>Object.fromEntries(l.split(',').map((v,i)=>[h[i],Number(v)]))),rows=allRows.filter(r=>r.boss_entry!==1);
 const report=JSON.parse(fs.readFileSync(`${dir}/${id}-focused-run.json`));
 const worst=rows.reduce((a,b)=>b.wall_cycles>a.wall_cycles?b:a),admissions=[0,0,0,0];let prev=Array(4).fill(0),previousShots=0,fourShotRises=0;
 for(const r of rows){for(let i=0;i<4;i++){const s=r[`light_state${i}`];if(s===2&&prev[i]!==2)admissions[i]++;prev[i]=s;}if(r.enemy_projectiles-previousShots>=4)fourShotRises++;previousShots=r.enemy_projectiles;}
 const fourLightFrames=rows.filter(r=>[0,1,2,3].every(i=>r[`light_state${i}`]===2)).length;
 results.push({name,id,transitionFrames:allRows.filter(r=>r.boss_entry===1).map(({frame,wall_cycles})=>({frame,wall_cycles,note:"Existing canonical exclusion: boss loading/Warning transition with display and DLIs off, outside gameplay frame gate"})),frames:rows.length,peak:worst.wall_cycles,targetDelta:worst.wall_cycles-31500,hardMargin:32568-worst.wall_cycles,fourLightFrames,fourShotRises,freeLightAdmissions:admissions.reduce((a,b)=>a+b,0),observedSectors:[...new Set(rows.map(r=>r.director_sector))],worstFrame:worst,traceSha256:crypto.createHash('sha256').update(buffer).digest('hex'),acceptance:report.acceptance,artifact_sha256:report.artifact_sha256});
 fs.copyFileSync(`${dir}/${id}-focused-run.json`,`docs/diagnostics/m3-tune/${name}.json`);
 if(rows.length!==report.acceptance.measured_frames)throw Error(`${name}: canonical measured frame count mismatch`);
 if(!report.acceptance.passed||worst.wall_cycles>32568)throw Error(`${name}: native gate`);
 if(name.startsWith('four-')&&(!fourLightFrames||!fourShotRises))throw Error(`${name}: missing four-Light/volley subject`);
}
fs.writeFileSync('docs/diagnostics/m3-tune/native.json',JSON.stringify({measurement:'MEASURED Atari800 7.1.2 PAL, ANTIC DMA on; existing frame timer, no guest instrumentation bytes. Stress retains old every-frame paths; host lives held at3; park176 with no player fire on pilot/volley. Quick Spread uses registered route;960 uses l2-matrix, NORMAL,120 boss frames and ownership observer.',results},null,2)+'\n');
console.log(results.map(({name,peak,hardMargin,fourLightFrames,fourShotRises,freeLightAdmissions,observedSectors})=>({name,peak,hardMargin,fourLightFrames,fourShotRises,freeLightAdmissions,observedSectors})));
