import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {Nmos6502} from '../scripts/nmos6502.mjs';import {installRuntimeSegments} from '../scripts/runtime-image.mjs';import {parseViceLabels} from '../scripts/runtime-cycles.mjs';
const main=parseViceLabels(fs.readFileSync('build/void-strike-65.lbl','utf8')),l2=parseViceLabels(fs.readFileSync('build/l2.lbl','utf8'));
function call(m,address,x=0){const c=new Nmos6502(m);c.x=x;c.pc=address;c.push(127);c.push(254);for(let i=0;c.pc!==32767;i++){assert.ok(i<10000);c.step();}return c;}
function machine(){const m=new Uint8Array(65536);installRuntimeSegments(m,process.cwd());return m;}

test('L2 brake: exact E/M/H ramps, release, SPACE/death reset and warning slot preservation',()=>{
 const m=machine();
 for(let d=0;d<3;d++){
  m[0x4e70]=d;m[0x4ea5]=2;m[0x4eaa]=0;m[0x81]=225;m[0x90]=13;m[l2.get("_l2_rate")]=0;
  const normal=16+2*d,half=8+d;
  for(let n=1;n<=normal-half;n++) {call(m,l2.get('_l2_brake_tick'));assert.equal(m[l2.get("_l2_rate")],normal-n);}
  for(let n=0;n<5;n++){call(m,l2.get('_l2_brake_tick'));assert.equal(m[l2.get("_l2_rate")],half);}
  m[0x90]=15;for(let n=1;n<=normal-half;n++){call(m,l2.get('_l2_brake_tick'));assert.equal(m[l2.get("_l2_rate")],half+n);}
  for(const state of [0,1,2,3,4,5,6,7])for(const y of [200,224,225])for(const stick of [13,15])for(const rate of [0,half,normal,255]){
   m[0x4ea5]=state;m[0x4eaa]=0;m[0x81]=y;m[0x90]=stick;m[l2.get("_l2_rate")]=rate;
   call(m,l2.get('_l2_brake_tick'));
   const initial=rate<half||rate>normal?normal:rate;
   const expected=state>=7?normal:y===225&&stick===13?Math.max(half,initial-1):Math.min(normal,initial+1);
   assert.equal(m[l2.get("_l2_rate")],expected);
  }
  m[0x4eaa]=1;m[0x4ea5]=2;m[l2.get("_l2_rate")]=half;call(m,l2.get('_l2_brake_tick'));assert.equal(m[l2.get("_l2_rate")],normal);
  for(const rate of [half,normal])for(let acc=0;acc<40;acc++){
   m[l2.get("_l2_rate")]=rate;m[main.get('scroll_accumulator')]=acc;
   assert.equal(call(m,main.get('world_rotate_due')).a,acc+rate>=40?1:0);
  }
 }
 for(const y of [0,200,201,224,225])for(let slot=0;slot<3;slot++){
  m[0x81]=y;m[0x4e62]=slot;m.fill(0x6a,0x4e4f,0x4e52);
  const c=call(m,0x190c,slot);assert.equal(c.x,slot);assert.equal(m[0x4e4f+slot],y>=201?35:25);
  for(let i=0;i<3;i++)if(i!==slot)assert.equal(m[0x4e4f+i],0x6a);
 }
});
