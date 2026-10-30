// Production NMOS6502 instruction-cycle comparison. No DMA/wall-time claim.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Nmos6502} from '../../../scripts/nmos6502.mjs';
import {installRuntimeSegments} from '../../../scripts/runtime-image.mjs';
const root=process.cwd();
function machine(dir) {
 const labels=new Map([...fs.readFileSync(`${dir}/void-strike-65.lbl`,'utf8').matchAll(/^al ([0-9a-f]+) \.(\S+)/gmi)].map(m=>[m[2],parseInt(m[1],16)]));
 const memory=new Uint8Array(65536);installRuntimeSegments(memory,root,path.resolve(dir));
 const call=(m,name,{a=0,x=0,y=0}={})=>{
  const cpu=new Nmos6502(m);cpu.pc=labels.get(name);assert.ok(cpu.pc,name);
  cpu.a=a;cpu.x=x;cpu.y=y;cpu.push(0x7f);cpu.push(0xfe);
  for(let i=0;i<500000&&cpu.pc!==0x7fff;i++)cpu.step();
  assert.equal(cpu.pc,0x7fff,name);return cpu;
 };
 call(memory,'copy_charset');call(memory,'init_fighter_projectiles');
 for(let r=0;r<27;r++){
  const addr=0x8140+r*40;memory[labels.get('PLAYFIELD_ROW_LO')+r]=addr&255;memory[labels.get('PLAYFIELD_ROW_HI')+r]=addr>>8;
 }
 function render(code,kind,count,enemy=false) {
  const m=memory.slice(),first=enemy?5:0;
  for(let s=first;s<first+count;s++){
   const x=100+(s-first)*8,y=150;
   m[labels.get('FIGHTER_PROJECTILE_ACTIVE')+s]=kind;
   m[labels.get('FIGHTER_PROJECTILE_X')+s]=x;m[labels.get('FIGHTER_PROJECTILE_Y')+s]=y;
   m[0x8140+15*40+((x-48)>>2)]=code;
  }
  return call(m,'render_fighter_projectile_overlays').cycles;
 }
 return {labels,memory,call,render};
}
const baseline=machine(process.argv[2]??'build/frame-peak-main-campaign');
const candidate=machine(process.argv[3]??'build/frame-peak-fixed-campaign');
const cases=[];
for(const kind of [1,17,33,65])for(let code=0;code<256;code++)for(const count of [1,5]) {
 const before=baseline.render(code,kind,count),after=candidate.render(code,kind,count);
 cases.push({kind,code,count,before,after,delta:after-before});
}
const helper=[];
for(let code=0;code<256;code++){
 const cpu=candidate.call(candidate.memory.slice(),'player_projectile_solid_backing',{a:code});
 const solid=(code&127)>=59&&(code&127)<90;assert.equal(Boolean(cpu.p&1),solid);
 helper.push({code,solid,cycles:cpu.cycles,includingCallerJsr:cpu.cycles+6});
}
const enemies=[0,1,59,62,198,203,110,240].map(code=>({code,
 before:baseline.render(code,10,5,true),after:candidate.render(code,10,5,true)}));
assert.ok(enemies.every(r=>r.before===r.after));
const worst=count=>cases.filter(r=>r.count===count).sort((a,b)=>b.delta-a.delta)[0];
console.log(JSON.stringify({measurement:'MEASURED production NMOS6502 instruction cycles, DMA off; direct renderer fixtures, not proof that every five-cell combination occurs in gameplay',
 helperMaximumCycles:Math.max(...helper.map(r=>r.cycles)),helperWithCallerMaximumCycles:Math.max(...helper.map(r=>r.includingCallerJsr)),
 worstOneShot:worst(1),worstFiveShotFrame:worst(5),blank:cases.filter(r=>r.code===0),
 representative:cases.filter(r=>[2,59,62,198,203,110,240].includes(r.code)),enemyFrames:enemies,helper},null,2));
