// Linked NMOS member costs. Run before/after the HP lookup on identical state.
import {machine,L,run} from './measure-population-harness.mjs';
function call(m,name,x=0) {
  m.cpu.push(127);m.cpu.push(254);m.cpu.x=x;
  return run(m.cpu,L(name),[32767],{maxSteps:2000000});
}
const samples=[];
for(const difficulty of [0,1,2])for(const slot of [0,1])for(const hp of [1,2,3,4,5])for(const mode of ['cruise','charge','flash']) {
  const m=machine({difficulty}),v=m.memory;
  call(m,'director_init');v[L('_heavy_archetype_offset')]=36;v[L('_heavy_escort_offset')]=255;
  call(m,'reset_enemy');v[L('ENEMY_TARGET_SLOT')]=slot;
  for(const [field,value] of Object.entries({ENEMY_X:slot?150:70,ENEMY_Y:100,
    ENEMY_VELOCITY_X:mode==='charge'?0:1,ENEMY_MOVE_ACCUMULATOR:30,
    ENEMY_MANEUVER_STATE:20,ENEMY_MANEUVER_TIMER:hp+(mode==='flash'?0x60:0),ENEMY_HP:hp}))v[L(field)+slot]=value;
  samples.push({difficulty,slot,hp,mode,cycles:call(m,'heavy_member_update',slot).cycles,colour:v[0xd013+slot]});
}
console.log(JSON.stringify({measurement:'MEASURED NMOS instructions; no ANTIC DMA',samples},null,2));
