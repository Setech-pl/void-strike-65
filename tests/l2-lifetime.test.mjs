import test from 'node:test';
import assert from 'node:assert/strict';
import {runBossEntry,label,call,word,root,buildPath,manifest} from './boss-harness.mjs';
import {loadCheckedL2} from '../scripts/sio-fixture.mjs';

const main=n=>label('main',n);
const resident=pc=>(pc>=0x2000&&pc<0x3b00)||(pc>=0x5400&&pc<0x6de8)||(pc>=0x8000&&pc<0xa000);

test('L2 lifetime: checked image is disarmed before first boss read; no stale resident entry/read until checked reload',()=>{
 let reading=false,fetches=0,commands=0;
 const watch=(pc,cpu)=>{
  if(!reading)return;
  const m=cpu.memory;
  if(pc>=0x1900&&pc<0x2000)fetches++;
  const op=m[pc],target=word(m,pc+1);
  if(resident(pc)){
   assert.ok(!([0x20,0x4c].includes(op)&&target>=0x1900&&target<=0x1915),`stale L2 call at $${pc.toString(16)}`);
   assert.ok(!([0xad,0xbd,0xb9].includes(op)&&target===0x1918),`stale L2 rate read at $${pc.toString(16)}`);
  }
 };
 const entered=runBossEntry({watch,onCommand:(_sector,cpu)=>{
  commands++;
  assert.equal(word(cpu.memory,main('profile_after_player')+1),main('integration_update_enemy'),'disarm must precede the first install read');
  assert.equal(cpu.memory[0x86b4],0,'boss scroll must be stopped before reads');
  assert.equal(cpu.memory[0xd40e],0,'redirect under blanked interrupts');reading=true;
 }});
 assert.equal(entered.end,'main_loop');assert.ok(commands>0);assert.ok(fetches>0,'boss slot D legitimately executes in the shared address range');
 const m=entered.memory;
 for(let frame=0;frame<20;frame++){
  call(m,main('profile_after_player'),{stopAt:[main('profile_after_enemy')],watch});
  call(m,main('update_starfield'),{watch});
  call(m,main('world_rotate_due'),{watch});
  assert.equal(m[0x86b4],0);
 }
 // Real checked level image + whole L2 run + INIT, also on a resident-level hit.
 loadCheckedL2(m,root,buildPath(''),manifest);
 assert.equal(word(m,main('profile_after_player')+1),0x1909);
 assert.equal(m[0x86b4],0);
});
