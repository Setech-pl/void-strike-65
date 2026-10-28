// Summarize the existing PAL trace; the observer's exclusive costs must add
// exactly to its wall timer. The boss loader row is a multi-frame transition.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {auditSession} from './pal-timing-audit.mjs';
import {validatePeakCoverage} from './frame-peak-routes.mjs';
export const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export function csv(p) {
 const lines=fs.readFileSync(p,'utf8').trim().split(/\r?\n/),keys=lines.shift().split(',');
 return lines.map(l=>Object.fromEntries(l.split(',').map((v,i)=>[keys[i],/^-?\d+$/.test(v)?Number(v):v])));
}
const sector=r=>r.boss_state>0?'boss':r.sector_state<7?'capital':'SPACE';
function labels(build) {
 const labels=new Map();
 for(const file of ['void-strike-65.lbl','integration-glue.lbl','encounter-director.lbl','capital-player-collision.lbl','l2.lbl','light-kernel.lbl','gameplay-music.lbl','sector-reader.lbl'])
  for(const m of fs.readFileSync(`${build}/${file}`,'utf8').matchAll(/^al ([0-9A-Fa-f]+) \.(\S+)/gm)) {
   if(/^[A-Z_0-9]+$|^__|^profile_|^@|_operand|_end$|^capital_slot_[a-f]$/.test(m[2]))continue;
   const pc=parseInt(m[1],16);if(!labels.has(pc))labels.set(pc,m[2]);
  }
 return [...labels].sort((a,b)=>a[0]-b[0]);
}
export function category(n) {
 if(/^wait_frame|^wait_for_master/.test(n))return 'raster wait';
 if(/^gameplay_dli|^vbi|^nmi/.test(n))return 'raster interrupts';
 if(n==='read_input')return 'input';
 if(/player_death|respawn|draw_player|erase_player|^apply_player_damage/.test(n))return 'ship';
 if(/stats_|update_score_display|update_hud_status|hud_/.test(n))return 'HUD/statistics';
 if(/sound|^gm_|music|^sr_frame/.test(n))return 'sound';
 if(/pickup|booster|capsule|^_life_|^life_colour/.test(n))return 'pickups';
 if(/^l2_|^_l2_|l2_rate_selection/.test(n))return 'L2 phase work';
 if(/light_shot|light_hit|hits_|collision|_target|player_contacts|player_inside|resolve_enemy_damage|hull_contact/.test(n))return 'collisions';
 if(/rotate_playfield|starfield|star_|_star|near_|scroll_world|set_gameplay_row_ptr|restore_recycled_row/.test(n))return 'starfield';
 if(/projectile|fighter_weapon|hostile_weapon_visual/.test(n))return 'shots';
 if(/light_|^_enemy_|^_sector_|director|update_enemy|enemy_animation|interceptor|broadside|muzzle|sector_completion|schedule_|admission|update_first_capital|engine_animation|scroll_hull/.test(n))return 'enemies/Director';
 if(/effect|explosion|flash|entity_|debris/.test(n))return 'effects/breakup';
 if(/capital_vector|shell_overlay/.test(n))return 'L2 phase work';
 return 'loop/shared overhead';
}
export function profiles(build,file) {
 const names=labels(build),frames=new Map();let frame;
 for(const line of fs.readFileSync(file,'utf8').trim().split('\n')) {
  if(line.startsWith('frame,')) {
   const [index,state,wall]=line.split(',').slice(1).map(Number);
   frame={frame:index,state,wall,pcCosts:[],routines:{},breakdown:{}};frames.set(index,frame);
  } else if(line.startsWith('pc,')) {
   const [pc,cpu,wall]=line.split(',').slice(1).map(Number);
   const n=names.findLast(([a])=>a<=pc)?.[1]??`$${pc.toString(16)}`,c=category(n);
   frame.pcCosts.push([pc,cpu,wall]);
   const routine=frame.routines[n]??={cpu:0,wall:0};routine.cpu+=cpu;routine.wall+=wall;
   frame.breakdown[c]=(frame.breakdown[c]??0)+wall;
  }
 }
 for(const r of frames.values())assert.equal(r.pcCosts.reduce((s,p)=>s+p[2],0),r.wall,`PC wall sum frame ${r.frame}`);
 return frames;
}
export function capitalBudget(args) {
 const value=args.find(a=>a.startsWith('--capital-budget='));
 const limit=value?Number(value.slice(17)):30025;
 assert.ok(Number.isInteger(limit)&&limit>0&&limit<=31200,'Capital content budget must be <=31500-300');
 return limit;
}
const out=process.argv[2];
if(out&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 const baseline=process.argv.includes('--baseline');
 const results=[],overruns=[],all=[];
 for(const run of read(`${out}/runs.json`)) {
  if(!baseline)assert.equal(run.code,0,run.id);
  const raw=csv(`${run.dir}/runtime-wall-trace/${run.id}.csv`),rows=raw.filter(r=>!r.boss_entry);
  const report=read(`${run.dir}/runtime-wall-trace/${run.id}-focused-run.json`),audit=auditSession(run.id,rows);
  if(!baseline)assert.ok(report.passed&&audit.passed,run.id);
  const states=csv(`${out}/${run.id}-states.csv`);assert.equal(states.length,raw.length,`${run.id} states`);
  const clocks=csv(`${out}/${run.id}-clock.csv`).filter(r=>r.state<7);
  const life=fs.readFileSync(`${out}/${run.id}-lifetime.jsonl`,'utf8').trim().split('\n').map(JSON.parse);
  const stale=life.filter(x=>['stale_access','resident_entry','rate_read','partial_l2_execution'].includes(x.event));
  const entry=raw.find(r=>r.boss_entry);assert.ok(entry,`${run.id} boss entry`);
  assert.equal(stale.length,0);assert.equal(clocks.filter(r=>r.world!==r.hull).length,0);
  const bossEntryFrames=entry.next_start_host_frame-entry.start_host_frame;assert.ok(bossEntryFrames<=350);
  const cap=rows.filter(r=>sector(r)==='capital'),space=rows.filter(r=>sector(r)==='SPACE'),boss=rows.filter(r=>sector(r)==='boss');
  const peak=a=>Math.max(...a.map(r=>r.wall_cycles));
  if(!baseline) {
   assert.ok(peak(rows)<=31500,`${run.id}: peak ${peak(rows)} > 31500`);
   // capital max is a sampled replay maximum; 2026-10-27 M3-H moved kill timing and exposed an audio coincidence reachable on main
   // Main-image native state transplant reproduces 30025 exactly; proof:
   // docs/diagnostics/m3h-step1/continuation8-audio-summary.json (owner amendment 5).
   const limit=capitalBudget(process.argv);
   assert.ok(peak(cap)<=limit,`${run.id}: capital peak ${peak(cap)} > ${limit}`);
   assert.equal(report.acceptance.missed_frames,0,`${run.id}: missed frames`);
   assert.equal(report.acceptance.extra_vbi_boundaries,0,`${run.id}: extra VBI`);
   assert.equal(report.acceptance.dli_ordering_errors,0,`${run.id}: DLI errors`);
   assert.equal(audit.shifted_phase_rows,0,`${run.id}: shifted rows`);
  }
  const prof=profiles(run.dir,`${out}/${run.id}-profile.csv`);
  for(const r of rows)all.push({route:run.id,frame:r.frame,sector:sector(r),cycles:r.wall_cycles});
  for(const r of rows.filter(r=>r.wall_cycles>31500)) {
   const p=prof.get(r.frame);assert.ok(p);assert.equal(p.wall,r.wall_cycles);
   overruns.push({route:run.id,frame:r.frame,sector:sector(r),cycles:r.wall_cycles,breakdown:p.breakdown,routines:p.routines,pcCosts:p.pcCosts,
    coincidence:{playerShots:r.player_fighter_projectiles,enemyShots:r.enemy_projectiles,lights:[0,1,2,3].filter(i=>[1,2].includes(r[`light_state${i}`])).length,heavy:r.enemy_live_count,effects:r.effect_active_count,entity:r.entity_active_mask,events:r.events,phase:r.corridor_phase}});
  }
  const coincidence=space.filter(r=>r.player_fighter_projectiles===4&&r.enemy_projectiles===4&&[0,1,2,3].filter(i=>[1,2].includes(r[`light_state${i}`])).length===3&&(r.events&1));
  results.push({...run,passed:report.passed&&audit.passed,gateFailures:audit.gate_failures,frames:rows.length,capitalFrames:cap.length,spaceFrames:space.length,bossFrames:boss.length,peak:peak(rows),capitalPeak:peak(cap),spacePeak:peak(space),bossPeak:peak(boss),targetOverruns:audit.rows_over_target,fence:audit.worst_fence_margin_cycles,misses:audit.distinct_miss_events,extraVbi:report.acceptance.extra_vbi_boundaries,dliErrors:report.acceptance.dli_ordering_errors,shifted:audit.shifted_phase_rows,staleL2:stale.length,bossEntryFrames,coincidenceFrames:coincidence.length,artifact:report.artifact_sha256['void-strike-65.atr'].sha256,stateFileSha256:sha(`${out}/${run.id}-states.csv`),traceSha256:sha(`${run.dir}/runtime-wall-trace/${run.id}.csv`)});
 }
 results.sort((a,b)=>a.id.localeCompare(b.id));overruns.sort((a,b)=>b.cycles-a.cycles);
 if(process.argv.includes('--require-routes'))validatePeakCoverage(results.map(r=>r.id));
 fs.writeFileSync(`${out}/results.json`,JSON.stringify({measurement:'MEASURED Atari800 PAL DMA on; standard runtime-wall-trace timer',results,overruns,worst5:all.sort((a,b)=>b.cycles-a.cycles).slice(0,5)},null,2)+'\n');
 console.log(results.map(r=>`${r.id}: ${r.frames} frames; peak ${r.peak}; capital ${r.capitalPeak}; >target ${r.targetOverruns}; boss entry ${r.bossEntryFrames}`).join('\n'));
}
