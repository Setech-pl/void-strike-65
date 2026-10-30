import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {Nmos6502} from '../scripts/nmos6502.mjs';
import {installRuntimeSegments} from '../scripts/runtime-image.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const labels=new Map(['void-strike-65.lbl','encounter-director.lbl'].flatMap(file=>
 [...fs.readFileSync(path.join(root,'build',file),'utf8').matchAll(/^al ([0-9a-f]+) \.(\S+)/gmi)]
 .map(m=>[m[2],parseInt(m[1],16)])));
const at=name=>{assert.ok(labels.has(name),name);return labels.get(name);};
function call(m,name,hooks={}) {
 const cpu=new Nmos6502(m,hooks);cpu.pc=at(name);cpu.push(0x7f);cpu.push(0xfe);
 for(let i=0;i<500000&&cpu.pc!==0x7fff;i++)cpu.step();
 assert.equal(cpu.pc,0x7fff,name);return cpu.cycles;
}
function fixture() {
 const m=new Uint8Array(65536);installRuntimeSegments(m,root);
 call(m,'copy_charset');call(m,'init_fighter_projectiles');
 m.fill(0,0x8140,0x8578);
 for(let row=0;row<27;row++) {
  const address=0x8140+row*40;
  m[at('PLAYFIELD_ROW_LO')+row]=address&255;m[at('PLAYFIELD_ROW_HI')+row]=address>>8;
 }
 return m;
}
function cell(x,y) {
 const row=(y>>3)-2;
 return (row===0?at('GAMEPLAY_DIVIDER_SCREEN'):0x8140+(row-1)*40)+((x-48)>>2);
}
function shot(m,{x=100,y=150,slot=0,kind=1}={}) {
 m[at('FIGHTER_PROJECTILE_ACTIVE')+slot]=kind;
 m[at('FIGHTER_PROJECTILE_X')+slot]=x;
 m[at('FIGHTER_PROJECTILE_Y')+slot]=y;
 m[at('FIGHTER_PROJECTILE_LIFETIME')+slot]=255;
}
for(const [surface,code] of [['island',62],['allied hull',59],['hostile hull',203]]) {
 test(`shot entering ${surface} ends without writing or damaging its backing cell`,()=>{
  const m=fixture();shot(m);const address=cell(100,144);m[address]=code;
  call(m,'update_fighter_projectiles');
  assert.equal(m[at('FIGHTER_PROJECTILE_ACTIVE')],1,'no existing target consumed the shot');
  let writes=0;
  call(m,'render_fighter_projectile_overlays',{write:(a)=>{if(a===address)writes++;}});
  assert.equal(m[at('FIGHTER_PROJECTILE_ACTIVE')],0);
  assert.equal(m[at('FIGHTER_PROJECTILE_RENDERED')],0);
  assert.equal(m[at('FIGHTER_PROJECTILE_OWNED_COUNT')],0);
  assert.equal(m[address],code);assert.equal(writes,0);
  call(m,'erase_fighter_projectile_overlays');assert.equal(m[address],code);
 });
}
test('spawn into a solid cell ends immediately with no drawing, for every player shot kind',()=>{
 for(const code of [59,62,203])for(const kind of [1,17,33,65]) {
  const m=fixture();m[at('player_x')]=92;m[at('player_y')]=225;
  // The ordinary allocation entry creates the centre shot. Kind covers all
  // publication modes; side-volley admission itself is unchanged.
  call(m,'allocate_player_fighter_projectile');
  m[at('FIGHTER_PROJECTILE_ACTIVE')]=kind;
  const address=cell(m[at('FIGHTER_PROJECTILE_X')],m[at('FIGHTER_PROJECTILE_Y')]);m[address]=code;
  let writes=0;call(m,'render_fighter_projectile_overlays',{write:a=>{if(a===address)writes++;}});
  assert.equal(m[at('FIGHTER_PROJECTILE_ACTIVE')],0);assert.equal(m[address],code);
  assert.equal(writes,0);assert.equal(m[at('FIGHTER_PROJECTILE_RENDERED')],0);
 }
});
test('a shot passing beside an island reaches the top',()=>{
 const m=fixture();shot(m,{y:223});
 for(let row=0;row<27;row++)m[0x8140+row*40+14]=62; // adjacent column, not shot column 13
 let minimum=223;
 for(let frame=0;frame<50&&m[at('FIGHTER_PROJECTILE_ACTIVE')];frame++) {
  call(m,'erase_fighter_projectile_overlays');call(m,'update_fighter_projectiles');
  call(m,'render_fighter_projectile_overlays');
  if(m[at('FIGHTER_PROJECTILE_ACTIVE')])minimum=Math.min(minimum,m[at('FIGHTER_PROJECTILE_Y')]);
 }
 assert.equal(minimum,19);assert.equal(m[at('FIGHTER_PROJECTILE_ACTIVE')],0);
 for(let row=0;row<27;row++)assert.equal(m[0x8140+row*40+14],62);
});
test('stars remain passable and enemy PairShots retain their existing solid-cell overdraw',()=>{
 for(const code of [0,1,2,3]) {
  const m=fixture();shot(m);m[cell(100,150)]=code;call(m,'render_fighter_projectile_overlays');
  assert.equal(m[at('FIGHTER_PROJECTILE_ACTIVE')],1);
  call(m,'erase_fighter_projectile_overlays');assert.equal(m[cell(100,150)],code===1?0:code); // sparse near star backing is already sanitised
 }
 for(const code of [59,62,203]) {
  const m=fixture();shot(m,{slot:5,kind:10});m[cell(100,150)]=code;
  call(m,'render_fighter_projectile_overlays');
  assert.equal(m[at('FIGHTER_PROJECTILE_ACTIVE')+5],10);
  assert.equal(m[at('FIGHTER_PROJECTILE_RENDERED')+5],255);
  call(m,'erase_fighter_projectile_overlays');assert.equal(m[cell(100,150)],code);
 }
});
