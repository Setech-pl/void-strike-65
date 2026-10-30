// Matched linked NMOS HP-boundary costs, with/without the resident notice.
// VS65_HARNESS_BUILD=recovery-baseline selects the pre-recovery reference.
import {machine,L,run} from './measure-population-harness.mjs';
function call(m,name,x=0) {
  m.cpu.push(127);m.cpu.push(254);m.cpu.x=x;
  return run(m.cpu,L(name),[32767],{maxSteps:2000000});
}
const samples=[];
for(const difficulty of [0,1,2])for(const shape of [0,2])for(const slot of [0,1])for(const departure of [0,1])for(const kind of ['surviving','lethal','retired']) {
  const m=machine({difficulty}),v=m.memory;v[L('game_state')]=6;call(m,'director_init');
  v[L('_heavy_wave_flags')]=shape===0?32:0;v[L('_heavy_archetype_offset')]=shape===2?36:0;v[L('_heavy_escort_offset')]=255;
  call(m,'reset_enemy');v[L('_heavy_departure')]=departure;v[L('ENEMY_TARGET_SLOT')]=slot;
  v[L('ENEMY_PENDING_DAMAGE')+slot]=v[L('ENEMY_HP')+slot]-(kind==='surviving'?1:0);
  if(kind==='retired')v[L('ENEMY_MEMBER_STATE')+slot]=0;
  const result=call(m,'_enemy_c_apply_pending_damage');
  samples.push({difficulty,shape,slot,departure,kind,cycles:result.cycles,a:m.cpu.a,x:m.cpu.x,hp:v[L('ENEMY_HP')+slot],pending:v[L('_heavy_breakup_pending')]});
}
console.log(JSON.stringify({measurement:'MEASURED linked NMOS, no ANTIC DMA, HP boundary only',samples},null,2));
