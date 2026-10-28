import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runBossEntry,bossGateMemory,label,call,word,buildPath,cpuOver,Drive,runUntil} from './boss-harness.mjs';
import {Nmos6502} from '../scripts/nmos6502.mjs';
import {writeOwnershipImages} from '../scripts/l2-observer-images.mjs';
const images=await writeOwnershipImages(buildPath(''));
const main=n=>label('main',n);
function installed(m,pc,mask,image){
 if(!mask[pc]||m[pc]!==image[pc])return false;
 const abs=[0x20,0x4c,0x6c,0x0d,0x1d,0x19,0x2d,0x3d,0x39,0x4d,0x5d,0x59,0x6d,0x7d,0x79,0x8d,0x9d,0x99,0xad,0xbd,0xb9,0xcd,0xdd,0xd9,0xed,0xfd,0xf9,0xae,0xbe,0xac,0xbc,0x2c,0xcc,0xec,0xce,0xde,0xee,0xfe,0x0e,0x1e,0x2e,0x3e,0x4e,0x5e,0x6e,0x7e,0x8c,0x8e];
 const ind=[0x01,0x11,0x21,0x31,0x41,0x51,0x61,0x71,0x81,0x91,0xa1,0xb1,0xc1,0xd1,0xe1,0xf1];
 if(abs.includes(m[pc]))return m[(pc+1)&65535]===image[(pc+1)&65535]&&m[(pc+2)&65535]===image[(pc+2)&65535];
 return !ind.includes(m[pc])||m[(pc+1)&65535]===image[(pc+1)&65535];
}
function observer(m,{verified=true}={}){
 let pc=0,previous=0,initializing=false,fetches=0,reads=0;
 const owned=p=>installed(m,p,images.bossMask,images.boss)||installed(m,p,images.deathMask,images.death);
 return {
  instruction(at){
   pc=at;
   if(pc===0x1900&&!m[0x86b3]){assert.deepEqual(m.slice(0x1900,0x2000),Uint8Array.from(images.l2),'partial L2 execution');initializing=true;verified=true;}
   if(m[0x86b3])initializing=false;
   if(pc>=0x1900&&pc<0x2000){fetches++;
    assert.ok((m[0x86b3]&&verified)||initializing||(owned(pc)&&owned(previous)),`stale fetch $${pc.toString(16)} from $${previous.toString(16)}`);
   }
   previous=pc;
  },
  read(address){if(address<0x1900||address>=0x2000)return;
   reads++;assert.ok((m[0x86b3]&&verified)||(initializing&&pc>=0x1900&&pc<0x2000)||owned(pc),`stale read $${address.toString(16)} from $${pc.toString(16)}`);
  },
  get counts(){return {fetches,reads};},
 };
}
function watched(cpu,watch){const inner=cpu.hooks.read;cpu.hooks.read=a=>{watch.read(a);return inner?.(a);};return()=>{watch.instruction(cpu.pc);cpu.step();};}
function fullFrames(m,n,watch){
 m[0xd01f]=7;m[0xd300]=15;m[0xd010]=1;
 const cpu=cpuOver(new Drive(),m);let line=0;const read=cpu.hooks.read;
 cpu.hooks.read=a=>a===0xd40b?(Math.floor(line++/3)%156):read(a);
 const step=watched(cpu,watch);cpu.sp=255;cpu.pc=main('main_loop');
 const seen=new Set();
 for(let frame=0;frame<n;frame++){
  m[main('PHYSICAL_PAL_FRAME_ID')]++;
  step();let steps=0;
  while(cpu.pc!==main('main_loop')){seen.add(cpu.pc);assert.ok(steps++<1000000,`main loop stuck $${cpu.pc.toString(16)} X=${cpu.x} line=${line}`);step();}
 }
 return seen;
}
test('L2 lifetime: complete boss main-loop bodies use installed images until real START GAME checked reload',()=>{
 const image=bossGateMemory();
 const blankCpu=call(Uint8Array.from(image),0xa03d).cycles;
 const disarmCpu=call(Uint8Array.from(image),0x8656).cycles;
 assert.equal(disarmCpu-blankCpu,34,'cold disarm including validity clear');
 const checked=Uint8Array.from(image);checked[0x86b3]=0;
 const init=cpuOver(new Drive(),checked);init.push(0x7f);init.push(0xfe);init.pc=0x1900;
 runUntil(init,{returned:0x7fff});
 assert.equal(init.cycles,313589,'checked content read plus INIT/SPACE publication CPU');
 let commands=0;
 const entered=runBossEntry({onCommand:(_sector,cpu)=>{commands++;
  assert.equal(word(cpu.memory,main('profile_after_player')+1),main('integration_update_enemy'));
  assert.equal(cpu.memory[0x86b4],0);assert.equal(cpu.memory[0x86b3],0);assert.equal(cpu.memory[0xd40e],0);
 }});
 assert.equal(entered.end,'main_loop');assert.ok(commands>0);
 const m=entered.memory,watch=observer(m,{verified:false});
 const seen=fullFrames(m,20,watch);
 for(const n of ['profile_after_player','update_starfield','profile_after_hull_contact','profile_after_entity_update'])assert.ok(seen.has(main(n)),n);
 assert.ok(watch.counts.fetches>0,'legitimate installed slot D fetched');assert.ok(watch.counts.reads>0);
 assert.equal(m[0x86b3],0);assert.equal(m[0x86b4],0);
 const reload=cpuOver(new Drive({trig:f=>Math.floor(f/4)%8<4}),m),step=watched(reload,watch);
 reload.sp=255;reload.pc=0xa000;m[main('game_state')]=1;
 for(let n=0;reload.pc!==main('start_gameplay');n++){assert.ok(n<200000000);step();}
 assert.equal(m[0x86b3],1);assert.equal(word(m,main('profile_after_player')+1),main('integration_update_enemy'));
 assert.equal(m[0x86b4],16+2*m[main('DIFFICULTY_SETTING')]);
 console.log(JSON.stringify({measurement:'complete main-loop lifetime',...watch.counts,frames:20,disarmDelta:34,initCpu:45}));
});
test('L2 lifetime: every resident caller and every addressing family rejects foreign slot-D reads/fetches',()=>{
 const callers=[['brake',main('profile_after_player')],['contact',main('player_inside_universal_hull_corridor')],
 ['draw',main('draw_hull_row')],['commit',main('commit_prepared_hull_row')],['warning',main('schedule_broadside')],
 ['phase',label('director','_sector_c_update_capital_phase')],['enter',label('director','_sector_c_update_first_capital')],
 ['SPACE exit',label('director','_sector_c_complete_scroll_tick')],['checked INIT',label('summary','summary_load_l2')]];
 const allSources=[...callers.map(x=>x[1]),0x0600,0x0e00,0x18fe,0x2200,0x3b10,0x4100,0x53e0,0x5500,0x75f0,0x7800,0x8800,0x9fe0,0xa300,0xb900];
 const cases=[[0x20,0x71,0x1e],[0x4c,0x51,0x19],[0x6c,0x90,0],[0xad,0x51,0x19],[0xbd,0xff,0x18],
  [0xb9,0xff,0x1f],[0xb1,0x90],[0xa1,0x90],[0x6d,0x51,0x19],[0x2d,0x51,0x19],[0xae,0x51,0x19],
  [0xbc,0xff,0x18],[0xce,0x51,0x19]];
 for(const source of allSources)for(const bytes of cases){
  const m=Uint8Array.from(images.boss);m[0x86b3]=0;m.set(bytes,source);m[0x90]=0x51;m[0x91]=0x19;
  const cpu=new Nmos6502(m),watch=observer(m,{verified:false}),step=watched(cpu,watch);cpu.pc=source;cpu.x=1;cpu.y=0;
  if(bytes[0]===0xa1)cpu.x=0;if(bytes[0]===0xbc)cpu.x=1;
  assert.throws(()=>{step();step();},/stale (read|fetch)/,`$${source.toString(16)} ${bytes[0].toString(16)}`);
 }
 assert.equal(callers.length,9,'all resident callers, including cold SPACE and INIT');
});
test('L2 lifetime: capital death and actual respawn keep the image valid and brake usable',()=>{
 const m=bossGateMemory();call(m,main('init_state'));m[0x86b3]=1;m[main('CAPITAL_SECTOR_STATE')]=0;call(m,0x1912);m[main('CAPITAL_SECTOR_STATE')]=2;
 m[main('PLAYER_LIFECYCLE')]=1;m[main('PLAYER_LIFECYCLE')+1]=2;
 m[main('BROAD_DAMAGE_COOLDOWN')-1]=0;m[main('BROAD_DAMAGE_COOLDOWN')+1]=2;
 call(m,main('update_player_death'));call(m,main('update_player_death'));
 assert.equal(m[main('PLAYER_LIFECYCLE')],2,'real respawn lifecycle');assert.equal(m[0x86b3],1);
 assert.equal(word(m,main('profile_after_player')+1),0x1909);
 m[main('player_y')]=225;m[main('stick_value')]=13;
 call(m,main('profile_after_player'),{stopAt:[main('profile_after_enemy')]});
 assert.ok(m[0x86b4]<16+2*m[main('DIFFICULTY_SETTING')]);
});

test('L2 lifetime: unchecked START GAME routes to the checked reader before any gameplay arm',()=>{
 const m=bossGateMemory();call(m,0x8656);
 const result=call(m,main('start_gameplay'),{stopAt:[0xa000]});
 assert.equal(result.pc,0xa000);assert.equal(m[0x86b3],0);
 assert.equal(word(m,main('profile_after_player')+1),main('integration_update_enemy'));
});
