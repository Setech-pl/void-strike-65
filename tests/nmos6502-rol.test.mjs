import test from 'node:test';
import assert from 'node:assert/strict';
import {Nmos6502} from '../scripts/nmos6502.mjs';
test('documented ROL A: all512 accumulator/carry inputs, flags and two cycles',()=>{
 const m=new Uint8Array(65536);m[0x200]=0x2a;
 for(let a=0;a<256;a++)for(const c of [0,1]){
  const cpu=new Nmos6502(m);cpu.pc=0x200;cpu.a=a;cpu.p=0x7c|c;
  cpu.step();const result=((a<<1)|c)&255;
  assert.equal(cpu.a,result);assert.equal(cpu.p&1,a>>7);
  assert.equal(Boolean(cpu.p&2),result===0);assert.equal(Boolean(cpu.p&0x80),result>=128);
  assert.equal(cpu.p&0x7c,0x7c);assert.equal(cpu.cycles,2);assert.equal(cpu.pc,0x201);
 }
});
