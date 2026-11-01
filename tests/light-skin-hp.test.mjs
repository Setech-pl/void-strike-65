import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Nmos6502} from '../scripts/nmos6502.mjs';
import {installRuntimeSegments} from '../scripts/runtime-image.mjs';
import {compileLevel,defaultHullAsset,LIGHT_HP_OFFSET,LEVEL_CORE_ADDRESS,LEVEL_PAYLOAD_ADDRESS,LEVEL_GEOMETRY_ADDRESS} from '../scripts/level-compiler.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),labels=new Map();
for(const f of ['void-strike-65','encounter-director','integration-glue','light-kernel','l2'])
 for(const m of fs.readFileSync(`${root}/build/${f}.lbl`,'utf8').matchAll(/^al\s+([\da-f]+)\s+\.?(\S+)$/gim))if(!labels.has(m[2]))labels.set(m[2],parseInt(m[1],16));
const L=n=>{assert.ok(labels.has(n),n);return labels.get(n);};
function call(m,name) {
 const reads=[],c=new Nmos6502(m,{read:a=>{reads.push(a);}}),stop=0x7fff;c.push((stop-1)>>8);c.push((stop-1)&255);c.pc=L(name);
 for(let i=0;i<200000&&c.pc!==stop;i++){assert.notEqual(m[c.pc],0,`${name} BRK`);c.step();}
 assert.equal(c.pc,stop);return {a:c.a,cycles:c.cycles,reads};
}
function source(archetype='interceptor',appearance='hunter') {
 const looks=JSON.parse(fs.readFileSync(`${root}/assets/levels/level-02.json`)).payload.appearances;
 return {level:2,hull:{length:1,turrets:3},payload:{appearances:looks,appearanceHp:{hunter:2,lancer:4}},sectors:[
  {kind:'space',subtype:'swarm',rows:256,lights:3,archetypes:['wingman','interceptor'],waves:[{row:0,archetype,count:1,spacing:24,entry:124,appearance}]}]};
}
const compile=s=>compileLevel(s,{hullAsset:defaultHullAsset(),file:'skin-test.json'});
function image(s=source()) {
 const m=new Uint8Array(65536);installRuntimeSegments(m,root);m.set(fs.readFileSync(`${root}/build/content-module.bin`),0x1180);m.set(fs.readFileSync(`${root}/build/l2.bin`),0x1900);
 m[0x86b3]=1;m[L('game_state')]=6;m[L('DIFFICULTY_SETTING')]=1;
 const p=compile(s).pages;m.set(p.core,LEVEL_CORE_ADDRESS);m.set(p.payload,LEVEL_PAYLOAD_ADDRESS);m.set(p.geometry,LEVEL_GEOMETRY_ADDRESS);
 call(m,'director_init');return m;
}
test('C-skin uses the four existing payload tail bytes, base0 always inherits',()=>{
 const p=compile(source()).payload;assert.equal(LIGHT_HP_OFFSET,179);
 assert.deepEqual([...p.subarray(179,183)],[0,2,0,4]);
 for(const hp of [{hunter:5},{hunter:-1},{missing:2},{'0':2},[]]){const s=source();s.payload.appearanceHp=hp;assert.throws(()=>compile(s),/appearanceHp/);}
});
test('C-skin admission applies selected-look HP to either Light archetype and preserves default HP',()=>{
 for(const [arch,look,hp] of [['wingman','hunter',2],['interceptor','hunter',2],['interceptor','lancer',4],['wingman',0,1],['interceptor',0,3],['wingman','escort',1]]) {
  const m=image(source(arch,look));m[L('frame_counter')]=1;call(m,'_enemy_c_light_wave');assert.equal(m[L('_light_hp')],hp,`${arch}/${look}`);
  const record=m[L('_light_archetype')];m[L('light_slot')]=0;
  for(let hit=1;hit<hp;hit++){assert.equal(call(m,'_enemy_c_light_hit').a,0);assert.equal(m[L('_light_hp')],hp-hit);}
  assert.notEqual(call(m,'_enemy_c_light_hit').a,0);assert.equal(m[L('_light_hp')],0);assert.equal(m[L('_light_archetype')],record);
 }
});
test('C-skin guard never reads either poisoned checked home in an invalid phase',()=>{
 for(const [valid,phase,state] of [[0,6,7],[1,3,7],[1,6,2]]){
  const m=image();m[0x86b3]=valid;m[L('game_state')]=phase;m[0x4ea5]=state;m.fill(0,0x1180,0x2000);
  const r=call(m,'_asm_m3_skin');assert.ok(r.reads.every(a=>a<0x1180||a>=0x2000));
 }
 const m=image();m[0x86b3]=0;m.fill(0,0x1180,0x2000);m[L('frame_counter')]=1;call(m,'_enemy_c_light_wave');
 assert.equal(m[L('_light_hp')],3,'invalid pair keeps the normal Interceptor HP');
});
test('C-skin reused slot gets the new look HP and admission cost is measured',()=>{
 const m=image();m[L('frame_counter')]=1;call(m,'_enemy_c_light_wave');assert.equal(m[L('_light_hp')],2);
 m[L('light_state')]=0;m[L('light_screen_hi')]=0;m[L('_light_wave_remaining')]=1;m[L('_light_wave_timer')]=0;m[L('_light_wave_look')]=0xb0;
 m[L('frame_counter')]=2;call(m,'_enemy_c_light_wave');assert.equal(m[L('_light_hp')],4);
 m[L('light_slot')]=0;const d=call(m.slice(),'_m3_skin_admit'),g=call(m.slice(),'_asm_m3_skin');
 if(process.env.VS65_SKIN_COST_REPORT)fs.writeFileSync(process.env.VS65_SKIN_COST_REPORT,JSON.stringify({method:'MEASURED linked NMOS entry-through-RTS, no caller JSR/DMA; selected4-HP look',helper:d.cycles,guarded:g.cycles,guardOverhead:g.cycles-d.cycles},null,2)+'\n');
});
