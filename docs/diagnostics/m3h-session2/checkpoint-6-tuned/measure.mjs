// Compare identical linked NMOS scenarios before/after this data tuning.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Nmos6502} from '../../../../scripts/nmos6502.mjs';
import {loadRuntimeSegments} from '../../../../scripts/runtime-image.mjs';
const root=process.cwd(),before=path.resolve(process.argv[2]??'.cache/m3h-session2-tune/baseline'),after=path.resolve('build');
const output=new URL('measurements.json',import.meta.url);
function machine(dir,shape=0) {
  const labels=new Map();for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.lbl')))
    for(const m of fs.readFileSync(path.join(dir,file),'utf8').matchAll(/^al ([0-9a-f]+) \.(\S+)/gmi))labels.set(m[2],parseInt(m[1],16));
  const L=n=>{assert.ok(labels.has(n),n);return labels.get(n);};
  const memory=new Uint8Array(65536);
  for(const segment of loadRuntimeSegments(root,dir).segments)memory.set(segment.data,segment.start);
  memory.set(fs.readFileSync(path.join(dir,"l2.bin")),0x1900);
  memory.set(fs.readFileSync(path.join(dir,"content-module.bin")),0x1180);
  memory[0x86b3]=1;
  let read=0;const cpu=new Nmos6502(memory,{read:a=>a===0xd40b?[0,1,0x70,0x71,0x77,0x78][read++%6]:a===0xd010?1:a===0xd300?15:a===0xd01f?255:undefined});
  const m={cpu,memory,L,isAfter:dir===after};memory[L('DIFFICULTY_SETTING')]=2;memory[L('game_state')]=6;
  call(m,'director_init');memory.fill(0,0x3d00,0x3f00);
  memory[L('_heavy_wave_flags')]=shape===0?0x20:0;
  memory[L('_heavy_archetype_offset')]=shape===2?36:0;memory[L('_heavy_escort_offset')]=255;
  call(m,'reset_enemy');return m;
}
function call(m,name,x=0,a=0) {
  m.cpu.push(127);m.cpu.push(254);m.cpu.x=x;m.cpu.a=a;m.cpu.pc=m.L(name);
  const start=m.cpu.cycles;let steps=0;
  while(m.cpu.pc!==32767){assert.ok(++steps<2000000,`${name} did not return`);m.cpu.step();}
  return m.cpu.cycles-start;
}
const samples=[];
function scenario(name,shape,fn) {
  const a=fn(machine(before,shape)),b=fn(machine(after,shape));
  assert.equal(b,a,`${name}: cycle delta`);samples.push({name,shape,before:a,after:b,delta:b-a});
}
for(const shape of [0,2]) {
  scenario('admission',shape,m=>call(m,'reset_enemy'));
  scenario('row tick',shape,m=>call(m,'director_world_row_tick'));
  scenario('idle damage entry',shape,m=>call(m,'heavy_breakup_retry'));
  scenario('forced body draw',shape,m=>{m.memory[m.L('ENEMY_Y')]=72;return call(m,'draw_enemy_member',0,255);});
  for(const request of [[1,0],[0,2],[2,2]])scenario(`first stamp ${request}`,shape,m=>{
    m.memory[m.L('ENEMY_Y')]=m.memory[m.L('ENEMY_Y')+1]=72;
    m.memory.set(request,m.L('heavy_damage_request'));return call(m,'heavy_damage_publish');
  });
  scenario('stage 1 then stage 2 stamp',shape,m=>{
    m.memory[m.L('ENEMY_Y')]=m.memory[m.L('ENEMY_Y')+1]=72;
    m.memory.set([1,1],m.L('heavy_damage_request'));call(m,'heavy_damage_publish');
    m.memory.set([2,2],m.L('heavy_damage_request'));return call(m,'heavy_damage_publish');
  });
}
for(const hp of [1,2,3,4,5])for(const mode of ['cruise','charge','flash','flash while charging'])scenario(`Bomber HP${hp} ${mode}`,2,m=>{
  const v=m.memory,L=m.L;
  v[L('ENEMY_X')]=70;v[L('ENEMY_Y')]=100;v[L('ENEMY_HP')]=hp;
  const charge=mode.includes('charg'),flash=mode.includes('flash');
  v[L('ENEMY_TARGET_SLOT')]=0;v[L('ENEMY_VELOCITY_X')]=charge?0:1;
  v[L('ENEMY_MOVE_ACCUMULATOR')]=charge?2:40;
  v[L('ENEMY_MANEUVER_STATE')]=charge?5:30;
  v[L('ENEMY_MANEUVER_TIMER')]=flash?(hp===4?3:4):hp;
  const cycles=call(m,'heavy_member_update');
  const base=(m.isAfter?[0xc0,0x28,0xc6,0xc8,0xc8,0xc8]:[0xc0,0xc4,0xc6,0xc8,0xc8,0xc8])[hp];
  assert.equal(v[0xd013],base+(flash||charge?4:0),'flash takes priority over charge; no double addition');
  return cycles;
});
const a=JSON.parse(fs.readFileSync(path.join(before,'manifest.json'))),b=JSON.parse(fs.readFileSync(path.join(after,'manifest.json')));
const resources=m=>({window:m.directorCodeRuntimes.find(r=>r.name==='hybrid-window').bytes,
  arena:m.directorCodeRuntimes.find(r=>r.name==='arena').bytes,director:m.directorRuntime.bytes,
  contentHome:m.contentModule.usedBytes,l2:m.l2.usedBytes??m.l2.bytes,
  extension:m.directorCodeRuntimes.find(r=>r.name==='extension').bytes,
  extensionPacked:m.directorCodeRuntimes.find(r=>r.name==='extension').packedBytes,
  windowPacked:m.directorCodeRuntimes.find(r=>r.name==='hybrid-window').packedBytes,
  contentSectors:m.overlays.runs.find(r=>r.name==='content-module').sectors,
  totalSectors:m.transportCapacity.totalTransportSectors});
assert.deepEqual(resources(b),resources(a));
const files=['encounter-director-code-hybrid-window.bin','content-module.bin','l2.bin',
  'encounter-director-code-arena.bin','encounter-director.bin','resident-runtime.bin','broadside-runtime.bin','level-payload.bin'];
const differences=files.map(file=>{
  const x=fs.readFileSync(path.join(before,file)),y=fs.readFileSync(path.join(after,file));assert.equal(x.length,y.length);
  const offsets=[...x.keys()].filter(i=>x[i]!==y[i]);return {file,bytes:x.length,deltaBytes:0,changedOffsets:offsets};
});
assert.deepEqual(differences[0].changedOffsets,[2203],'only HP1 table datum changes in window');
assert.ok(differences[1].changedOffsets.every(i=>i>=1000&&i<1024),'only H13 table changes in home');
assert.deepEqual(differences[2].changedOffsets,[1284,1286],'L2 changes only its checked-content fold immediates');
for(const d of differences.slice(3,7))assert.deepEqual(d.changedOffsets,[]);
const result={baselineCommit:'2d4ef8c',measurement:'linked NMOS instruction cycles; no ANTIC DMA',
  samples,resourcesBefore:resources(a),resourcesAfter:resources(b),differences,
  cycleDeltaRowTick:0,cycleDeltaOrdinaryFrame:0,cycleDeltaStamp:0,sessionWindowGrowth:222};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
