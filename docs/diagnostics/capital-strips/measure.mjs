import {machine,L,run} from '../../../scripts/measure-population-harness.mjs';
function call(m,n,x=0){m.cpu.push(127);m.cpu.push(254);m.cpu.x=x;return run(m.cpu,L(n),[32767],{maxSteps:2000000});}
const samples=[];
for(const leader of [0,40,48,100,176,224]){
 const m=machine({difficulty:1}),v=m.memory;v[L('game_state')]=6;call(m,'director_init');v[L('_heavy_archetype_offset')]=36;v[L('_heavy_escort_offset')]=12;call(m,'reset_enemy');v[L('ENEMY_X')]=leader;v[L('ENEMY_Y')]=100;v[L('_light_slot')]=0;
 const r=call(m,'enemy_light_tick');samples.push({leader,cycles:r.cycles,x:v[L('_light_x')]});
}
console.log(JSON.stringify(samples));
for(const x of [1,72,152,223]){
 const m=machine({difficulty:1}),v=m.memory;v[L('game_state')]=6;call(m,'director_init');v[L('_heavy_archetype_offset')]=36;v[L('_heavy_escort_offset')]=255;call(m,'reset_enemy');v[L('_heavy_departure')]=1;v[L('ENEMY_X')]=x;v[L('ENEMY_Y')]=72;v[L('ENEMY_MEMBER_STATE')+1]=0;v[L('ENEMY_HP')+1]=0;v[L('ENEMY_LIVE_COUNT')]=1;v[0x86]=1;
 console.log(JSON.stringify({heavyX:x,cycles:call(m,'update_enemy').cycles,finalX:v[L('ENEMY_X')]}));
}
