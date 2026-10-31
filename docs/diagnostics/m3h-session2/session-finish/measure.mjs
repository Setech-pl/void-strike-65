// Linked instruction-cycle comparison: 3468204 baseline versus merged finish.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Nmos6502} from '../../../../scripts/nmos6502.mjs';
import {loadRuntimeSegments} from '../../../../scripts/runtime-image.mjs';
const root=process.cwd(),old='.cache/m3h-session2-finish/baseline';
function setup(dir,shape=2,departure=0) {
  const labels=new Map();for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.lbl')))
    for(const m of fs.readFileSync(path.join(dir,f),'utf8').matchAll(/^al ([0-9a-f]+) \.(\S+)/gmi))labels.set(m[2],parseInt(m[1],16));
  const L=n=>{assert.ok(labels.has(n),n);return labels.get(n);},memory=new Uint8Array(65536);
  for(const s of loadRuntimeSegments(root,dir).segments)memory.set(s.data,s.start);
  memory.set(fs.readFileSync(path.join(dir,'l2.bin')),0x1900);
  memory.set(fs.readFileSync(path.join(dir,'content-module.bin')),0x1180);memory[0x86b3]=1;
  const m={memory,cpu:new Nmos6502(memory),L};memory[L('game_state')]=6;memory[L('DIFFICULTY_SETTING')]=1;
  call(m,'director_init');memory[L('_heavy_archetype_offset')]=shape===2?36:0;
  memory[L('_heavy_escort_offset')]=255;memory[L('_heavy_wave_flags')]=0;call(m,'reset_enemy');
  memory[L('_heavy_departure')]=departure;memory[L('_heavy_armoured')]=memory[L('_heavy_descent_mask')]=0;
  memory[L('_heavy_member_colour')]=0xc8;
  for(const [s,x]of [[0,88],[1,152]]) {
    memory[L('ENEMY_X')+s]=x;memory[L('ENEMY_Y')+s]=72;
    memory[L('ENEMY_VELOCITY_X')+s]=1;memory[L('ENEMY_MOVE_ACCUMULATOR')+s]=30;
    memory[L('ENEMY_MANEUVER_STATE')+s]=40;memory[L('ENEMY_MANEUVER_TIMER')+s]=memory[L('ENEMY_HP')+s];
    call(m,'draw_enemy_member',s,255);
  }
  return m;
}
function call(m,name,x=0,a=0) {
  m.cpu.push(127);m.cpu.push(254);m.cpu.x=x;m.cpu.a=a;m.cpu.pc=m.L(name);
  const begin=m.cpu.cycles;let n=0;while(m.cpu.pc!==32767){assert.ok(++n<2000000,name);m.cpu.step();}
  return m.cpu.cycles-begin;
}
const samples=[];
for(const shape of [0,2])for(const departure of [0,1])for(const name of ['heavy_member_update','update_enemy','director_world_row_tick']) {
  const a=setup(old,shape,departure),b=setup('build',shape,departure);
  const before=call(a,name),after=call(b,name);
  if(shape===0)assert.equal(after,before,'Raider CPU unchanged');
  samples.push({shape,departure,name,before,after,delta:after-before});
}
for(const x of [48,100,111,112,152,176,4,220]) {
  const a=setup(old,2,1),b=setup('build',2,1);
  a.memory[a.L('ENEMY_X')]=b.memory[b.L('ENEMY_X')]=x;
  const before=call(a,'heavy_member_update'),after=call(b,'heavy_member_update');
  samples.push({shape:2,departure:1,name:'member at X'+x,before,after,delta:after-before});
}
const a=setup(old,0,1),b=setup('build',0,1);let raiderFrames=0;
while(a.memory[a.L('ENEMY_ACTIVE')]) {
  const x=call(a,'update_enemy'),y=call(b,'update_enemy');assert.equal(y,x);
  assert.deepEqual(b.memory.slice(b.L('ENEMY_X'),b.L('ENEMY_X')+12),a.memory.slice(a.L('ENEMY_X'),a.L('ENEMY_X')+12));
  assert.deepEqual(b.memory.slice(0x3d00,0x3f00),a.memory.slice(0x3d00,0x3f00));
  assert.ok(++raiderFrames<1000);
}
{
  const a=setup(old,2,1),b=setup('build',2,1);
  for(const m of [a,b]){m.memory[m.L('ENEMY_X')]=4;m.memory[m.L('ENEMY_X')+1]=220;}
  const before=call(a,'update_enemy'),after=call(b,'update_enemy');
  samples.push({shape:2,departure:1,name:'both members terminal update',before,after,delta:after-before});
}
const manifests=[old,'build'].map(d=>JSON.parse(fs.readFileSync(d+'/manifest.json')));
const resources=manifests.map(m=>({window:m.residentCapacity.basicWindow.usedBytes,arena:m.residentCapacity.arena.usedBytes,
  director:m.directorRuntime.bytes,l2:m.l2.usedBytes,home:m.contentModule.usedBytes,
  extension:m.directorCodeRuntimes.find(r=>r.name==='extension').bytes,
  extensionPacked:m.directorCodeRuntimes.find(r=>r.name==='extension').packedBytes,
  windowPacked:m.directorCodeRuntimes.find(r=>r.name==='hybrid-window').packedBytes,
  totalSectors:m.transportCapacity.totalTransportSectors}));
const current=setup('build');const dataSizes={header:current.L('__CONTENT_HEADER_SIZE__'),code:current.L('__CONTENT_CODE_SIZE__'),data:current.L('__CONTENT_DATA_SIZE__'),holeTable:24,homeState:5,
  heavyPolicyState:current.L('__HYBRID_HEAVY_PACKAGE_SIZE__')+current.L('__HYBRID_HEAVY_MEMBERS_SIZE__'),renderMetadata:8,damagedBodiesReused:32,newDepartureState:0};
assert.equal(resources[1].home-resources[0].home,68);assert.equal(resources[1].window,2290);
const result={baseline:'3468204',measurement:'linked NMOS instruction cycles, no ANTIC DMA',samples,raiderFramesIdentical:raiderFrames,resources,dataSizes};
fs.writeFileSync(new URL('measurements.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
