import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {capitalEntrySessions,spreadCapitalSessions,validateSpreadCapital,validateCapitalEntry,validateCapitalObservers,framePeakRouteIds,validatePeakCoverage} from '../scripts/frame-peak-routes.mjs';
import {traceArtifactLayout,assertDiagnosticRun} from '../scripts/trace-artifacts.mjs';
const sample=()=>Array.from({length:5},(_,frame)=>{
 const base=(100+frame)*35568,start=base+2060;
 return {frame,sector_state:frame===1?2:7,boss_state:frame===4?1:0,boss_entry:frame===3?1:0,
  start_clock:start,start_scanline:18,start_cycle:8,start_host_frame:100+frame,
  next_start_host_frame:100+frame+(frame===3?325:1),wall_cycles:31000,
  profile_clock19:base+24000,profile_publication_begin:frame===1?0:base+27364,
  missed_frames:0,extra_vbi_boundaries:0,dli_sequence_violations:0};
});
test('natural entry routes remain in the standard native suite and registered test gate',()=>{
 assert.deepEqual(capitalEntrySessions.map(s=>[s.id,s.difficulty,s.policy]),[
  ['campaign-0-flight',0,'l2-matrix'],['campaign-1-flight',1,'l2-matrix'],['campaign-2-brake',2,'l2-matrix-brake']]);
 const runtime=fs.readFileSync('scripts/runtime-wall-trace.mjs','utf8');
 assert.match(runtime,/\.\.\.capitalEntrySessions\]/);
 assert.match(runtime,/validateCapitalEntry\(session\.id,rows,session\.bossEntry\)/);
 assert.match(JSON.parse(fs.readFileSync('package.json')).scripts['test:frame-peaks'],/frame-peak-native\.mjs.*--gate/);
});
test('natural entry gate requires entry, exit and boss subject and accepts parser-set-aside boss entry',()=>{
 const r=sample();assert.equal(validateCapitalEntry('fixture',r).bossEntryFrames,325);
 const boss={...r[3],host_frames:325};assert.equal(validateCapitalEntry('fixture',r.filter(r=>!r.boss_entry),boss).capitalExit,2);
 assert.throws(()=>validateCapitalEntry('fixture',r.slice(1)),/start in SPACE/);
 assert.throws(()=>validateCapitalEntry('fixture',r.filter(r=>r.frame!==1)),/no natural/);
 assert.throws(()=>validateCapitalEntry('fixture',r.filter(r=>r.frame!==3)),/no boss entry/);
 const noExit=r.map(r=>({...r,sector_state:r.frame>1?2:r.sector_state}));
 assert.throws(()=>validateCapitalEntry('fixture',noExit),/no capital exit/);
});
test('natural entry gate rejects a target excess below the hard gate and the measured missed-fence pattern',()=>{
 const target=sample();target[0].wall_cycles=31501;
 assert.throws(()=>validateCapitalEntry('fixture',target),/exceeds 31500/);
 const miss=sample();miss[0].wall_cycles=63846;miss[0].profile_publication_begin+=35568;
 assert.throws(()=>validateCapitalEntry('fixture',miss),/missed publication fence/);
 const boss=sample();boss[3].next_start_host_frame=boss[3].start_host_frame+351;
 assert.throws(()=>validateCapitalEntry('fixture',boss),/boss entry 351/);
});
test('frame-peak snapshots stay worktree-local and must match their exact source variant',()=>{
 for(const [kind,buildVariant]of [['480','level-1-s1'],['960','l2-capital-960'],['campaign','release']]) {
  const dir=`build/frame-peak-fixed-${kind}`,layout=traceArtifactLayout(process.cwd(),dir);
  const argv=[`--artifacts=${dir}`,'--only-session=campaign-2-brake'];
  assert.doesNotThrow(()=>assertDiagnosticRun(layout,{buildVariant,l2:{}},argv));
  assert.throws(()=>assertDiagnosticRun(layout,{buildVariant:'wrong',l2:{}},argv),/manifest/);
  assert.throws(()=>assertDiagnosticRun(layout,{buildVariant:layout.variant,l2:{}},argv),/manifest/);
  assert.throws(()=>assertDiagnosticRun(layout,{buildVariant,l2:{}},argv.slice(0,1)),/focused/);
  if(kind==='campaign')assert.doesNotThrow(()=>assertDiagnosticRun(layout,{buildVariant,l2:{}},[argv[0],'--capital-entry-only']));
 }
 assert.throws(()=>traceArtifactLayout(process.cwd(),'build/frame-peak-fixed-480/runtime-wall-trace'),/debug-route/);
});
test('the native gate cannot drop old routes or accept stale L2 and mismatched world/hull clocks',()=>{
 assert.equal(framePeakRouteIds.length,16);assert.doesNotThrow(()=>validatePeakCoverage([...framePeakRouteIds]));
 assert.throws(()=>validatePeakCoverage(framePeakRouteIds.slice(1)),/missing l2-480-0-flight/);
 const clocks=[{state:2,phase:968,world:20,hull:20}];
 assert.doesNotThrow(()=>validateCapitalObservers('fixture',clocks,[]));
 assert.throws(()=>validateCapitalObservers('fixture',[{...clocks[0],hull:19}],[]),/world\/hull mismatch/);
 assert.throws(()=>validateCapitalObservers('fixture',clocks,[{event:'stale_access'}]),/stale L2/);
 assert.throws(()=>validateCapitalObservers('fixture',[{...clocks[0],phase:900}],[]),/incomplete/);
});
test('Spread capital failing inputs are permanent and retain the hard gate with an explicit soft target',()=>{
 assert.deepEqual(spreadCapitalSessions.map(s=>[s.id,s.difficulty,s.policy,s.frames,s.forcedBooster,s.holdPlayerLives]),
  [['campaign-1-spread-capital',1,'l2-spread-capital',1800,4,4]]);
 assert.throws(()=>validatePeakCoverage(framePeakRouteIds.filter(id=>id!=='campaign-1-spread-capital')),/missing campaign-1-spread-capital/);
 const rows=Array.from({length:1800},(_,frame)=>({...sample()[0],frame,sector_state:2,
  player_lifecycle:0,player_x:88,player_y:225,pickup_booster_state:4,corridor_phase:209,wall_cycles:31501}));
 assert.equal(validateSpreadCapital('fixture',rows).targetMargin,-1);
 rows[0].wall_cycles=32569;
 assert.throws(()=>validateSpreadCapital('fixture',rows),/Spread peak 32569 > 32568/);
 rows[0].wall_cycles=31501;rows[0].pickup_booster_state=3;
 assert.throws(()=>validateSpreadCapital('fixture',rows),/Spread fixture expired/);
 rows[0].pickup_booster_state=0;rows[0].player_lifecycle_after=1;
 assert.doesNotThrow(()=>validateSpreadCapital('fixture',rows),'lethal end-of-frame booster clear is not fixture expiry');
});
