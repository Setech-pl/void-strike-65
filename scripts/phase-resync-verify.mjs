// Control-referenced recovery proof; run after frame-overrun-analyze.mjs.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root='build/phase-resync';
const csv=p=>{const [head,...rows]=fs.readFileSync(p,'utf8').trim().split('\n');const keys=head.split(',');return rows.map(r=>Object.fromEntries(r.split(',').map((v,i)=>[keys[i],/^-?\d+$/.test(v)?Number(v):v])));};
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const summary=JSON.parse(fs.readFileSync(`${root}/cases/summary.json`));
const controls=[],recovery=[];
for(const scene of ['space','capital','boss','hud-music']) {
 const id=scene+'-control',main=csv(`${root}/main/evidence/${id}/states.csv`),task=csv(`${root}/cases/${id}/states.csv`);
 const baseTrace=csv(`${root}/main/evidence/${id}/trace.csv`),taskTrace=csv(`${root}/cases/${id}/trace.csv`);
 const startDeltas=taskTrace.map((r,i)=>r.start_clock-baseTrace[i].start_clock);
 const physicalAdmissionDifferences=taskTrace.filter((r,i)=>r.start_host_frame!==baseTrace[i].start_host_frame).length;
 const a=hash(`${root}/main/raw/${id}/frames.rgb`),b=hash(`build/frame-overrun/${id}/frames.rgb`);
 const changes=task.filter((r,i)=>r.logical_fnv1a64!==main[i]?.logical_fnv1a64);
 controls.push({scene,mainTicks:main.length,taskTicks:task.length,logicalDifferences:changes.length,mainRasterSha256:a,taskRasterSha256:b,identicalRasters:a===b,physicalAdmissionDifferences,startClockDeltaRange:[Math.min(...startDeltas),Math.max(...startDeltas)]});

 const base=csv(`${root}/main/evidence/${id}/trace.csv`);
 const phase=base.filter(r=>!r.boss_entry).map(r=>r.start_scanline);
 const normal=phase.sort((a,b)=>phase.filter(x=>x===b).length-phase.filter(x=>x===a).length)[0];
 for(const mode of ['single','repeat']) {
  const id=`${scene}-${mode}-forced`,result=summary.find(r=>r.id===id),rows=csv(`${root}/cases/${id}/trace.csv`);
  const events=result.injections.map((e,i)=>{
   const affected=rows.find(r=>r.start_clock<=e.start&&r.end_clock>=e.start);
   const next=rows.filter(r=>r.start_clock>e.end);
   const good=next.findIndex(r=>Math.abs(r.start_scanline-normal)<=8);
   const mixed=(result.raster.unmatchedPhysicalFrames??[]).filter(f=>f>=e.host-result.window.host&&f<(result.injections[i+1]?.host??result.window.end_host)-result.window.host);
   return {mixedPhysicalFrames:mixed,mixedCount:mixed.length,row:e.row,host:e.host,affectedFrame:affected?.frame,nextStartScanline:next[0]?.start_scanline,lateIterationsBeforeRecovery:good<0?null:good,physicalFramesFromMissStart:good<0?null:next[good].start_host_frame-affected.start_host_frame};
  });
  recovery.push({id,normalStartScanline:normal,events,persistentPhaseSlip:events.some(e=>e.lateIterationsBeforeRecovery===null),mixedRasters:result.raster.unmatchedControlRasters,shiftedRows:result.baselinePhaseShiftedRows,peakWall:result.peakWall,dliViolations:result.dliViolations,staleL2:result.staleL2});
 }
}
fs.writeFileSync('docs/diagnostics/phase-resync/recovery.json',JSON.stringify({controls,recovery},null,2)+'\n');
console.table(controls.map(({scene,logicalDifferences,identicalRasters})=>({scene,logicalDifferences,identicalRasters})));
console.table(recovery.map(r=>({id:r.id,mixed:r.mixedRasters,shift:r.shiftedRows,recovery:[...new Set(r.events.map(e=>e.lateIterationsBeforeRecovery))].join(','),persistent:r.persistentPhaseSlip})));

assert.ok(controls.every(r=>r.logicalDifferences===0&&r.identicalRasters), 'no-injection controls must equal main');
assert.ok(recovery.every(r=>!r.persistentPhaseSlip), 'persistent phase slip');
