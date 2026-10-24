// Instruction-count attribution for paired, identical isolated capital states.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Nmos6502} from './nmos6502.mjs';
import {installRuntimeSegments} from './runtime-image.mjs';
import {parseViceLabels} from './runtime-cycles.mjs';
const root=path.resolve(import.meta.dirname,'..');
function image(dir) {
 const labels=parseViceLabels(fs.readFileSync(path.join(dir,'void-strike-65.lbl'),'utf8'));
 const memory=new Uint8Array(65536);installRuntimeSegments(memory,root,dir);
 return {labels,memory};
}
const names=['handle_player_hull_contact','player_inside_universal_hull_corridor','visible_hull_sector_row',
'resolve_allied_sector_row','resolve_enemy_sector_row','select_sector_module',
'spike_allied_boundary','spike_enemy_boundary','spike_extent','apply_broadside_player_damage',
'update_hud_status','draw_hull_row','spike_draw_hull_row','spike_base_draw_hull_row','spike_commit_strips',
'integration_apply_allied_prow','integration_apply_enemy_prow'];
function run(img,name,profile=false) {
 const {memory:m,labels:l}=img;const cpu=new Nmos6502(m);cpu.push(0x7f);cpu.push(0xfe);cpu.pc=l.get(name);
 const entries=new Map(names.filter(n=>l.has(n)).map(n=>[l.get(n),n]));
 const open=[],costs={};
 for(let steps=0;cpu.pc!==0x7fff&&steps<100000;steps++) {
   if(profile&&entries.has(cpu.pc)) open.push({name:entries.get(cpu.pc),sp:cpu.sp,start:cpu.cycles});
   const op=m[cpu.pc];cpu.step();
   if(profile&&op===0x60) for(let i=open.length-1;i>=0;i--) if(cpu.sp>open[i].sp) {
     const c=open.splice(i,1)[0];costs[c.name]=(costs[c.name]??0)+cpu.cycles-c.start;
   }
 }
 assert.equal(cpu.pc,0x7fff);return {cycles:cpu.cycles,inclusiveCpu:costs};
}
function setup(img,{row,fine=1,x=87,difficulty=1}) {
 const {memory:m,labels:l}=img;const set=(n,v)=>m[l.get(n)]=v;
 set('DIFFICULTY_SETTING',difficulty);set('CAPITAL_SECTOR_STATE',2);
 set('corridor_phase',(row+11)&255);set('CORRIDOR_PHASE_HI',(row+11)>>>8);
 set('player_y',96+fine);set('player_x',x);set('PLAYER_LIFECYCLE',0);
 m[0x4e6f]=28;m[0x4e5d]=10;m[0x4e5e]=0;set('BROAD_DAMAGE_APPLIED',0);
 set('ENTITY_ACTIVE_MASK',0);set('ENTITY_STATE',0);m[l.get('ENTITY_STATE')+1]=0;
}
const reports=[];
for(let p=1;p<=3;p++) {
 const spike=image(path.join(root,`build/spike-nacelles-p${p}`)),main=image(path.join(root,'build'));
 for(const i of [main,spike]) {run(i,'copy_charset');run(i,'publish_level_hull_style');}
 let worst={delta:-Infinity};let maxDraw={delta:-Infinity};
 for(let difficulty=0;difficulty<3;difficulty++) for(let row=0;row<488;row++) for(const x of [87,91,157,161]) {
  const state={difficulty,row,fine:2,x};setup(main,state);setup(spike,state);
  const a=run(main,'handle_player_hull_contact'),b=run(spike,'handle_player_hull_contact');
  if(b.cycles-a.cycles>worst.delta) worst={state,delta:b.cycles-a.cycles,main:a.cycles,spike:b.cycles};
 }
 for(let row=0;row<488;row++) {
  for(const i of [main,spike]) {setup(i,{row:row-11});i.memory[i.labels.get('dst_ptr')]=0;i.memory[i.labels.get('dst_ptr')+1]=0x41;i.memory.fill(0,0x4100,0x4128);}
  const a=run(main,'draw_hull_row'),b=run(spike,'draw_hull_row');
  if(b.cycles-a.cycles>maxDraw.delta) maxDraw={row,delta:b.cycles-a.cycles,main:a.cycles,spike:b.cycles};
 }
 setup(main,worst.state);setup(spike,worst.state);
 worst.mainProfile=run(main,'handle_player_hull_contact',true);worst.spikeProfile=run(spike,'handle_player_hull_contact',true);
 for(const i of [main,spike]) {setup(i,{row:maxDraw.row-11});i.memory[i.labels.get('dst_ptr')]=0;i.memory[i.labels.get('dst_ptr')+1]=0x41;}
 maxDraw.mainProfile=run(main,'draw_hull_row',true);maxDraw.spikeProfile=run(spike,'draw_hull_row',true);
 reports.push({pattern:p,worstContactIncrement:worst,worstDrawIncrement:maxDraw});
}
fs.writeFileSync(path.join(root,'docs/diagnostics/spike-nacelles/cpu-attribution.json'),JSON.stringify(reports,null,2)+'\n');
console.log(JSON.stringify(reports,null,2));
