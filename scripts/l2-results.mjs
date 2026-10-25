// Compact reports from the focused, retained native captures; no game writes.
import fs from 'node:fs';import {auditSession}from'./pal-timing-audit.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const csv=p=>{const lines=fs.readFileSync(p,'utf8').trim().split(/\r?\n/),keys=lines.shift().split(',');return lines.map(l=>Object.fromEntries(l.split(',').map((v,i)=>[keys[i],/^-?\d+$/.test(v)?Number(v):v])));};
const records=[];
for(const run of read('build/l2-native-matrix/runs.json')){
 const raw=csv(`${run.dir}/runtime-wall-trace/${run.id}.csv`),rows=raw.filter(x=>!x.boss_entry);
 const report=read(`${run.dir}/runtime-wall-trace/${run.id}-focused-run.json`);
 const clocks=csv(`build/l2-native-matrix/${run.id}-clock.csv`).filter(x=>x.state<7);
 const capital=rows.filter(x=>x.sector_state<7),audit=auditSession(run.id,rows);
 const life=fs.readFileSync(`build/l2-native-matrix/${run.id}-lifetime.jsonl`,'utf8').trim().split('\n').map(JSON.parse);
 const stale=life.filter(x=>['resident_entry','rate_read','partial_l2_execution'].includes(x.event));
 const entry=raw.find(x=>x.boss_entry);
 const record={...run,artifact:report.artifact_sha256['void-strike-65.atr'].sha256,
  frames:rows.length,peak:report.acceptance.maximum_wall_cycles,mean:Math.round(rows.reduce((s,x)=>s+x.wall_cycles,0)/rows.length*100)/100,
  capitalFrames:capital.length,capitalPeak:Math.max(...capital.map(x=>x.wall_cycles)),
  fenceMargin:audit.worst_fence_margin_cycles,preFence:audit.worst_pre_wait_cycles,targetOverruns:audit.rows_over_target,
  misses:report.acceptance.missed_frames,extraVbi:report.acceptance.extra_vbi_boundaries,dliErrors:report.acceptance.dli_ordering_errors,
  distinctMisses:audit.distinct_miss_events,shifted:audit.shifted_phase_rows,phaseFirst:Math.min(...clocks.map(x=>x.phase)),phaseLast:Math.max(...clocks.map(x=>x.phase)),
  clockMismatches:clocks.filter(x=>x.world!==x.hull).length,rates:[...new Set(clocks.map(x=>x.rate))].sort((a,b)=>a-b),
  warningMax:Math.max(...clocks.flatMap(x=>[x.timer0,x.timer1,x.timer2])),
  damageFrames:capital.filter(x=>x.player_damage_applied>0).length,
  centralIslandPushFrames:capital.filter(x=>x.player_lifecycle===0&&x.player_lifecycle_after===0&&x.player_x>=108&&x.player_x<=140&&Math.abs(x.player_x_after-x.player_x)>=8).length,cooldown25Frames:capital.filter(x=>x.player_damage_cooldown_after===25).length,
  playerStaleCells:Math.max(...rows.map(x=>x.player_projectile_stale_cells)),enemyStaleCells:Math.max(...rows.map(x=>x.enemy_projectile_stale_cells)),
  spaceDebrisFrames:rows.filter(x=>x.sector_state===7&&[0,1,2,3].some(i=>x[`slot${i}_type`]===1&&x[`slot${i}_state`]===1)).length,
  staleL2Events:stale.length,bossEntryFrames:entry.next_start_host_frame-entry.start_host_frame};
 if(!report.passed||!audit.passed||record.clockMismatches||record.phaseLast!==968||!record.centralIslandPushFrames||stale.length)throw Error(`STOP ${JSON.stringify(record)}`);
 records.push(record);
}
fs.writeFileSync('build/l2-native-matrix/results.json',JSON.stringify(records,null,2)+'\n');
console.log('| Rows | Difficulty | Mode | Peak | Mean | Fence | Target+ | Miss / VBI / DLI |');
console.log('| --- | --- | --- | ---: | ---: | ---: | ---: | --- |');
for(const r of records.sort((a,b)=>a.length-b.length||a.difficulty-b.difficulty||Number(a.brake)-Number(b.brake)))console.log(`| ${r.length} | ${['E','M','H'][r.difficulty]} | ${r.brake?'brake/contact':'flight/contact'} | ${r.peak} | ${r.mean} | ${r.fenceMargin} | ${r.targetOverruns} | ${r.misses}/${r.extraVbi}/${r.dliErrors} |`);
