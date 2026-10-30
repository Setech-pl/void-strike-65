// Permanent native coverage: natural admission must not be replaced by a
// direct-capital start. These also run in the ordinary wall-trace suite.
import assert from 'node:assert/strict';
import {auditSession,TARGET_CYCLES} from './pal-timing-audit.mjs';
export const capitalEntrySessions=Object.freeze([
  {id:'campaign-0-flight',difficulty:0,policy:'l2-matrix'},
  {id:'campaign-1-flight',difficulty:1,policy:'l2-matrix'},
  {id:'campaign-2-brake',difficulty:2,policy:'l2-matrix-brake'},
].map(s=>Object.freeze({...s,kind:'natural-capital-entry',frames:10000,
  fireDelay:0,holdPlayerLives:3,endAtBossFrames:120})));
// Owner 2026-10-30: retain the exact campaign inputs that exposed Spread's
// solid-art composite overrun. Explicit host fixture, not a pickup replay.
export const spreadCapitalSessions=Object.freeze([Object.freeze({
  id:'campaign-1-spread-capital',kind:'spread-capital',difficulty:1,
  policy:'l2-spread-capital',frames:1800,fireDelay:0,holdPlayerLives:4,
  forcedBooster:4,
})]);
export const framePeakRouteIds=Object.freeze([
  ...[480,960].flatMap(n=>[0,1,2].flatMap(d=>['flight','brake'].map(mode=>`l2-${n}-${d}-${mode}`))),
  ...capitalEntrySessions.map(s=>s.id),
  ...spreadCapitalSessions.map(s=>s.id),
]);
export function validateSpreadCapital(session,rows) {
  assert.equal(rows.length,1800,`${session}: incomplete Spread fixture`);
  // Booster is sampled after simulation. A lethal frame starts ALIVE but
  // legitimately clears the booster before the end-of-frame snapshot.
  const capital=rows.filter(r=>r.sector_state<7&&(r.player_lifecycle_after??r.player_lifecycle)===0);
  assert.ok(capital.some(r=>r.corridor_phase>=209),`${session}: missing island workload`);
  assert.ok(capital.every(r=>r.pickup_booster_state===4),`${session}: Spread fixture expired`);
  assert.ok(capital.some(r=>r.player_y===225&&r.player_x<=92),`${session}: missing bottom left lane`);
  const peak=Math.max(...rows.map(r=>r.wall_cycles));
  assert.ok(peak<=32568,`${session}: Spread peak ${peak} > 32568`);
  const audit=auditSession(session,rows);
  assert.ok(audit.passed,`${session}: ${audit.gate_failures.join('; ')}`);
  assert.equal(audit.shifted_phase_rows,0,`${session}: shifted presentation rows`);
  assert.ok(rows.every(r=>r.extra_vbi_boundaries===0&&r.dli_sequence_violations===0),
    `${session}: VBI/DLI anomaly`);
  // Owner explicitly permits 31,500..32,568 on this added route for smoke.
  return {peak,targetMargin:31500-peak,hardMargin:32568-peak,capitalFrames:capital.length};
}
export function validatePeakCoverage(ids) {
  assert.equal(new Set(ids).size,ids.length,'duplicate native route');
  for(const id of framePeakRouteIds)assert.ok(ids.includes(id),`native gate missing ${id}`);
}
export function validateCapitalObservers(session,clocks,events) {
  const cap=clocks.filter(r=>Number(r.state)<7);
  assert.ok(cap.length,`${session}: no capital clock samples`);
  assert.ok(cap.every(r=>Number(r.world)===Number(r.hull)),`${session}: world/hull mismatch`);
  assert.equal(Math.max(...cap.map(r=>Number(r.phase))),968,`${session}: capital traversal incomplete`);
  assert.ok(events.every(e=>!['stale_access','resident_entry','rate_read','partial_l2_execution'].includes(e.event)),
    `${session}: stale L2 event`);
}
export function validateCapitalEntry(session,raw,bossEntry=null) {
  const rows=raw.filter(r=>!r.boss_entry);
  assert.equal(rows[0]?.sector_state,7,`${session}: natural route must start in SPACE`);
  const firstCapital=rows.findIndex(r=>r.sector_state<7);
  assert.ok(firstCapital>0,`${session}: no natural SPACE -> capital entry`);
  const exit=rows.findIndex((r,i)=>i>firstCapital&&r.sector_state===7);
  assert.ok(exit>firstCapital,`${session}: no capital exit`);
  const entry=raw.find(r=>r.boss_entry)??bossEntry;
  assert.ok(entry&&entry.frame>rows[exit].frame,`${session}: no boss entry after capital exit`);
  const bossFrames=entry.host_frames??entry.next_start_host_frame-entry.start_host_frame;
  assert.ok(bossFrames<=350,`${session}: boss entry ${bossFrames} > 350`);
  const audit=auditSession(session,rows);
  assert.equal(audit.distinct_miss_events,0,`${session}: missed publication fence`);
  assert.equal(audit.shifted_phase_rows,0,`${session}: shifted presentation rows`);
  assert.equal(audit.rows_over_target,0,`${session}: iteration exceeds ${TARGET_CYCLES}`);
  assert.ok(audit.passed,`${session}: ${audit.gate_failures.join('; ')}`);
  assert.ok(rows.every(r=>r.extra_vbi_boundaries===0&&r.dli_sequence_violations===0),
    `${session}: VBI/DLI anomaly`);
  return {naturalEntry:rows[firstCapital-1].frame,firstCapital:rows[firstCapital].frame,
    capitalExit:rows[exit].frame,bossEntry:entry.frame,bossEntryFrames:bossFrames};
}
