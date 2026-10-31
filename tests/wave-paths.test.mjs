import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Nmos6502} from '../scripts/nmos6502.mjs';
import {installRuntimeSegments} from '../scripts/runtime-image.mjs';
import {compileLevel,defaultHullAsset,LEVEL_CORE_ADDRESS,LEVEL_PAYLOAD_ADDRESS,
  LEVEL_GEOMETRY_ADDRESS,PAYLOAD_OFFSET,WAVE_ARRAY_OFFSET} from '../scripts/level-compiler.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const labels=new Map();
for(const file of ['void-strike-65','encounter-director','integration-glue','light-kernel'])
  for(const m of fs.readFileSync(`${root}/build/${file}.lbl`,'utf8').matchAll(/^al\s+([\da-f]+)\s+\.?(\S+)$/gim))
    if(!labels.has(m[2]))labels.set(m[2],parseInt(m[1],16));
const L=n=>{assert.ok(labels.has(n),n);return labels.get(n);};
const pathCosts=[];
function source(pathName='straight') {
  return {level:2,seed:77,hull:{length:1,turrets:3},sectors:[
    {kind:'space',subtype:'swarm',rows:128,archetypes:['wingman','interceptor'],lights:3,
      waves:[{row:0,archetype:'wingman',count:1,spacing:24,entry:124,
        ...(pathName===undefined?{}:{path:pathName})}]}]};
}
function compile(s){return compileLevel(s,{hullAsset:defaultHullAsset(),file:'wave-path-test.json'});}
function run(m,n,{a=0}={}) {
  const segment=n==='_enemy_c_light_tick'&&m[0x86b3]&&m[L('game_state')]===6
    ?m[L('_m3_path_segment')+m[L('light_slot')]]:255;
  const accesses=[];
  const cpu=new Nmos6502(m,{read:(addr)=>{accesses.push(addr);}});
  const stop=0x7fff;cpu.push((stop-1)>>8);cpu.push((stop-1)&255);cpu.pc=L(n);cpu.a=a;
  for(let steps=0;steps<200000&&cpu.pc!==stop;steps++) {
    assert.notEqual(m[cpu.pc],0,`${n} BRK at ${cpu.pc.toString(16)}`);cpu.step();
  }
  assert.equal(cpu.pc,stop,`${n} returns`);
  if(segment!==255)pathCosts.push({segment,cycles:cpu.cycles,action:cpu.a});
  return {a:cpu.a,cycles:cpu.cycles,accesses};
}
after(()=>{
  if(process.env.VS65_M3_PATH_COST_REPORT)fs.writeFileSync(process.env.VS65_M3_PATH_COST_REPORT,
    JSON.stringify({method:'MEASURED whole C tick entry through RTS, no caller JSR/DMA; includes appearance decision, not ASM publication',maximum:Math.max(...pathCosts.map(r=>r.cycles)),rows:pathCosts},null,2)+'\n');
});
function image(s=source()) {
  const m=new Uint8Array(65536);installRuntimeSegments(m,root);
  m.set(fs.readFileSync(`${root}/build/content-module.bin`),0x1180);
  m[0x86b3]=1;m[L('game_state')]=6;m[L('DIFFICULTY_SETTING')]=1;
  const level=compile(s);m.set(level.pages.core,LEVEL_CORE_ADDRESS);
  m.set(level.pages.payload,LEVEL_PAYLOAD_ADDRESS);m.set(level.pages.geometry,LEVEL_GEOMETRY_ADDRESS);
  run(m,'director_init',{a:0x6d});return m;
}
function tick(m) {
  ++m[L('frame_counter')];run(m,'_enemy_c_light_wave');
  for(let slot=0;slot<4;slot++)if(m[L('light_state')+slot]) {
    m[L('light_slot')]=slot;run(m,'_enemy_c_light_tick');
  }
}

test('M3 compiler packs a named path into the existing payload, deduplicating identical records',()=>{
  const s=source();s.sectors[0].waves.push({...s.sectors[0].waves[0],row:8});
  const l=compile(s);assert.equal(l.core[WAVE_ARRAY_OFFSET.path],0);
  assert.equal(l.core[WAVE_ARRAY_OFFSET.path+1],0);
  assert.deepEqual([...l.payload.subarray(PAYLOAD_OFFSET.path,PAYLOAD_OFFSET.path+12)],
    [1,0,16,1,0,16,1,0,16,1,0,16]);
  assert.equal(l.payload.length,256);assert.equal(l.core.length,256);
});
test('M3 compiler rejects malformed, Heavy, boss, looping-archetype and nonterminating paths',()=>{
  const bad=source('unknown');assert.throws(()=>compile(bad),/path/);
  for(const edit of [s=>{s.sectors[0].subtype='elite';s.sectors[0].archetypes=['raider'];s.sectors[0].waves[0].archetype='raider';},
    s=>{s.sectors[0].waves[0].archetype='interceptor';s.sectors[0].waves[0].loops=1;},
    s=>{s.payload={paths:{bad:[{dy:1,frames:1,flags:16}]}};s.sectors[0].waves[0].path='bad';}]) {
    const s=source();edit(s);assert.throws(()=>compile(s),/path/);
  }
});
test('M3 straight policy descends once per tick and retires without kill credit or fragments',()=>{
  const m=image();for(let f=1;f<232;f++){tick(m);assert.equal(m[L('light_y')],f);assert.equal(m[L('light_x')],124);}
  tick(m);assert.equal(m[L('light_state')],0);assert.equal(m[L('_m3_path_segment')],255);
  assert.equal(m[L('_heavy_breakup_pending')],0);
});
test('M3 finite segments advance on exact durations and a terminal flag retires immediately',()=>{
  const s=source('four');s.payload={paths:{four:[
    {dy:1,frames:2,flags:16},{dy:1,frames:3,flags:16},
    {dy:1,frames:1,flags:16},{dy:1,frames:2,flags:144}]}};
  const m=image(s),segments=[];
  for(let f=0;f<8;f++){tick(m);segments.push(m[L('_m3_path_segment')]);}
  assert.deepEqual(segments,[0,3,3,3,6,9,9,255]);assert.equal(m[L('light_state')],0);
});
test('M3 invalid/disarmed home is never executed and shared wave publication still works',()=>{
  const m=image();m[0x86b3]=0;m.fill(0,0x1180,0x1900);
  for(const entry of ['_asm_m3_reset','_asm_m3_admit','_asm_m3_escort','_asm_m3_wave_arm'])run(m,entry);
  const guarded=run(m,'_asm_m3_tick');assert.equal(guarded.a,255);
  assert.ok(guarded.accesses.every(a=>a<0x1180||a>=0x1900),'no stale home read');
  m[0x86b3]=1;m[L('game_state')]=3;assert.equal(run(m,'_asm_m3_tick').a,255);
});

test('M3 no-path Wingman and Interceptor retain main positions, cadence and loop decisions',
  {skip:!process.env.VS65_M3_BASELINE},()=>{
  const base=process.env.VS65_M3_BASELINE,bl=new Map();
  for(const file of ['void-strike-65','encounter-director','integration-glue','light-kernel'])
    for(const m of fs.readFileSync(`${base}/build/${file}.lbl`,'utf8').matchAll(/^al\s+([\da-f]+)\s+\.?(\S+)$/gim))
      if(!bl.has(m[2]))bl.set(m[2],parseInt(m[1],16));
  const measurements=[];
  for(const archetype of ['wingman','interceptor']) {
    const s=source();delete s.sectors[0].waves[0].path;s.sectors[0].waves[0].archetype=archetype;
    if(archetype==='interceptor')s.sectors[0].waves[0].loops=2;
    const now=image(s),old=new Uint8Array(65536);installRuntimeSegments(old,base);
    old.set(fs.readFileSync(`${base}/build/content-module.bin`),0x1180);
    old[0x86b3]=1;old[bl.get('game_state')]=6;old[bl.get('DIFFICULTY_SETTING')]=1;
    const l=compile(s);old.set(l.pages.core,LEVEL_CORE_ADDRESS);old.set(l.pages.payload,LEVEL_PAYLOAD_ADDRESS);
    function call(name) {
      const cpu=new Nmos6502(old),stop=0x7fff;cpu.push((stop-1)>>8);cpu.push((stop-1)&255);cpu.pc=bl.get(name);
      for(let i=0;i<200000&&cpu.pc!==stop;i++)cpu.step();assert.equal(cpu.pc,stop);
      return {a:cpu.a,cycles:cpu.cycles};
    }
    call('director_init');
    for(let frame=0;frame<190;frame++) {
      ++now[L('frame_counter')];++old[bl.get('frame_counter')];
      run(now,'_enemy_c_light_wave');call('_enemy_c_light_wave');
      now[L('light_slot')]=old[bl.get('light_slot')]=0;
      const n=run(now,'_enemy_c_light_tick'),b=call('_enemy_c_light_tick');
      assert.equal(n.a,b.a,`${archetype} action f${frame}`);
      for(const field of ['light_state','light_x','light_y','_light_hp','_light_fire_timer','_light_burst_left','_light_loops'])
        assert.deepEqual([...now.slice(L(field),L(field)+4)],[...old.slice(bl.get(field),bl.get(field)+4)],`${archetype} ${field} f${frame}`);
      measurements.push({archetype,frame,main:b.cycles,current:n.cycles,delta:n.cycles-b.cycles});
    }
  }
  if(process.env.VS65_M3_COST_REPORT)fs.writeFileSync(process.env.VS65_M3_COST_REPORT,JSON.stringify({method:'MEASURED linked NMOS CPU; entry through RTS, no DMA or caller JSR',rows:measurements},null,2)+'\n');
});
test('M3 no-path and orphan escort use resident movement, no inherited segment',()=>{
  const s=source();delete s.sectors[0].waves[0].path;const m=image(s);
  for(let f=1;f<=32;f++){tick(m);assert.equal(m[L('light_y')],f);}
  assert.equal(m[L('_m3_path_segment')],255);
  m[L('_m3_path_segment')]=0;m[L('light_slot')]=0;run(m,'_asm_m3_escort');
  assert.equal(m[L('_m3_path_segment')],255);
});
