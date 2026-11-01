import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {m3TempoSource} from '../scripts/m3-tempo.mjs';
import {Nmos6502} from '../scripts/nmos6502.mjs';
import {installRuntimeSegments} from '../scripts/runtime-image.mjs';
import {compileLevel,defaultHullAsset,LEVEL_CORE_ADDRESS,LEVEL_PAYLOAD_ADDRESS,
  LEVEL_GEOMETRY_ADDRESS,PAYLOAD_OFFSET,WAVE_ARRAY_OFFSET} from '../scripts/level-compiler.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const labels=new Map();
for(const file of ['void-strike-65','encounter-director','integration-glue','light-kernel','l2'])
  for(const m of fs.readFileSync(`${root}/build/${file}.lbl`,'utf8').matchAll(/^al\s+([\da-f]+)\s+\.?(\S+)$/gim))
    if(!labels.has(m[2]))labels.set(m[2],parseInt(m[1],16));
const L=n=>{assert.ok(labels.has(n),n);return labels.get(n);};
const pathCosts=[];
const simultaneousCosts=[];
const tuningResults=[];
const visibleTop=Number(/ENTITY_GAMEPLAY_TOP = (\d+)/.exec(fs.readFileSync(`${root}/build/entity-effects.inc`,'utf8'))[1]);
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
  if(process.env.VS65_M3_TUNING_REPORT)fs.writeFileSync(process.env.VS65_M3_TUNING_REPORT,JSON.stringify(tuningResults,null,2)+'\n');
  if(process.env.VS65_M3_PATH_COST_REPORT)fs.writeFileSync(process.env.VS65_M3_PATH_COST_REPORT,
    JSON.stringify({method:'MEASURED whole C tick entry through RTS, no caller JSR/DMA; includes appearance decision, not ASM publication',maximum:Math.max(...pathCosts.map(r=>r.cycles)),simultaneousThreeLightTicks:simultaneousCosts,rows:pathCosts},null,2)+'\n');
});
function image(s=source()) {
  const m=new Uint8Array(65536);installRuntimeSegments(m,root);
  m.set(fs.readFileSync(`${root}/build/content-module.bin`),0x1180);
  m.set(fs.readFileSync(`${root}/build/l2.bin`),0x1900);
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
  const review=compile(JSON.parse(fs.readFileSync(`${root}/assets/levels/diagnostics/m3-path-review.json`)));
  assert.equal(review.core[WAVE_ARRAY_OFFSET.path+7],84,'review fills all eight path records');
});
test('M3 compiler rejects malformed, Heavy, boss, looping-archetype and nonterminating paths',()=>{
  const bad=source('unknown');assert.throws(()=>compile(bad),/path/);
  for(const edit of [s=>{s.sectors[0].subtype='elite';s.sectors[0].archetypes=['raider'];s.sectors[0].waves[0].archetype='raider';},
    s=>{s.sectors[0].waves[0].archetype='interceptor';s.sectors[0].waves[0].loops=1;},
    s=>{s.sectors[0].waves[0].entry=50;},
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
  for(const entry of ['_asm_m3_reset','_asm_m3_admit','_asm_m3_escort','_asm_m3_wave_arm']) {
    const r=run(m,entry);
    assert.ok(r.accesses.every(a=>a<0x1180||a>=0x1900),`${entry}: no stale home read`);
  }
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
test('M3 boss escort skips poisoned path state and orphan falls back without home reads',()=>{
  const m=image();m[0x86b3]=0;m[L('game_state')]=3;m.fill(0,0x1180,0x1900);
  m[L('light_state')]=1;m[L('light_slot')]=0;m[0x5470]=1;
  m[0x5478]=124;m[0x547a]=80;
  let r=run(m,'_enemy_c_light_tick');
  assert.equal(m[L('light_state')],1);assert.equal(m[L('light_x')],128);
  assert.ok(r.accesses.every(a=>a<0x1180||a>=0x1900));
  m[0x5470]=0;r=run(m,'_enemy_c_light_tick');
  assert.equal(m[L('light_state')],2);
  assert.ok(r.accesses.every(a=>a<0x1180||a>=0x1900));
});

test('M3 mirror alternates successful admissions, including a recycled slot after refusal',()=>{
  const s=source('snake');s.sectors[0].waves[0].mirror=true;s.sectors[0].waves[0].count=2;
  const m=image(s);tick(m);assert.equal(m[L('_m3_path_segment')]&128,0);
  for(let i=0;i<3;i++)m[L('light_state')+i]=2;
  m[L('_light_wave_timer')]=0;run(m,'_enemy_c_light_wave');
  for(let i=0;i<4;i++){m[L('light_state')+i]=0;m[L('light_screen_hi')+i]=0;}
  tick(m);assert.equal(m[L('_m3_path_segment')]&128,128,'same physical slot is mirrored');
  assert.equal(m[L('light_x')],120,'mirrored first step goes left');
});
test('M3 tracking quantizes and clamps player column without overshoot',()=>{
  for(const [player,target]of [[180,184],[0,48],[255,48]]) {
    const s=source('follow');s.payload={paths:{follow:Array.from({length:4},()=>({dy:1,frames:0,flags:29}))}};
    const m=image(s);m[L('player_x')]=player;
    for(let f=0;f<80;f++){tick(m);assert.ok(m[L('light_x')]>=48&&m[L('light_x')]<=200);assert.equal(m[L('light_x')]%4,0);}
    assert.equal(m[L('light_x')],target);
  }
});
test('M3 vocabulary has repeatable shallow, snake and arc landmarks',()=>{
  for(const [name,landmarks] of [
    ['shallow-wave',[[24,148],[72,100],[96,124]]],
    ['snake',[[24,172],[72,76],[96,124]]],
    ['arc',[[24,172],[48,196],[72,172]]],
  ]) {
    const m=image(source(name));let frame=0;
    for(const [end,x] of landmarks) {
      while(frame<end){tick(m);frame++;}
      assert.equal(m[L('light_x')],x,`${name} X at ${end}`);
      assert.equal(m[L('light_y')],end,`${name} Y at ${end}`);
    }
  }
});
test('M3 three-Light simultaneous segment transitions stay independent and bounded',()=>{
  const s=source('four');s.payload={paths:{four:[
    {dy:1,frames:2,flags:21},{dy:1,frames:3,flags:25},
    {dy:1,frames:1,flags:16},{dy:1,frames:2,flags:144}]}};
  const m=image(s);tick(m);
  for(let i=0;i<3;i++) {
    m[L('light_state')+i]=2;m[L('_light_archetype')+i]=m[L('_light_archetype')];
    m[L('light_x')+i]=124;m[L('light_y')+i]=60;
    m[L('_m3_path_segment')+i]=0;m[L('_m3_path_timer')+i]=1;
  }
  const before=pathCosts.length;tick(m);
  simultaneousCosts.push(pathCosts.slice(before).reduce((sum,r)=>sum+r.cycles,0));
  for(let i=0;i<3;i++) {
    assert.equal(m[L('_m3_path_segment')+i],3);
    assert.equal(m[L('_m3_path_timer')+i],3);
    assert.equal(m[L('light_x')+i],128);
    assert.equal(m[L('light_y')+i],61);
  }
});
test('M3 upward return retires before negative wrap; side exit clamps before terminal retirement',()=>{
  const m=image(source('dive-return'));
  for(let f=0;f<104;f++){tick(m);assert.equal(m[L('light_state')],2);assert.ok(m[L('light_y')]<232);}
  assert.equal(m[L('light_y')],0);tick(m);assert.equal(m[L('light_state')],0);assert.equal(m[L('light_y')],0);
  const s=source('side');s.payload={paths:{side:[{dy:0,frames:48,flags:148},
    ...Array.from({length:3},()=>({dy:1,frames:0,flags:16}))]}};
  const side=image(s);for(let f=0;f<48;f++){tick(side);assert.ok(side[L('light_x')]<=200);}
  assert.equal(side[L('light_x')],200);assert.equal(side[L('light_state')],0);
});
test('M3 relative loop stays within its record, progresses vertically and eventually retires',()=>{
  const m=image(source('finite-loop'));for(let f=0;f<56;f++)tick(m);
  assert.equal(m[L('light_y')],8);assert.equal(m[L('light_x')],124);assert.equal(m[L('_m3_path_segment')],0);
  let f=56;while(m[L('light_state')]&&f<1700){tick(m);f++;}
  assert.ok(f<1700);assert.equal(m[L('light_state')],0);
});
test('M3 compiler refuses zero-progress loops, invalid relative ends, cadence2 and ninth distinct path',()=>{
  for(const path of [
    Array.from({length:4},(_,i)=>({dy:0,frames:16,flags:i===3?112:16})),
    [{dy:1,frames:1,flags:48},...Array.from({length:3},()=>({dy:1,frames:0,flags:16}))],
    Array.from({length:4},()=>({dy:1,frames:0,flags:18})),
  ]){const s=source('bad');s.payload={paths:{bad:path}};assert.throws(()=>compile(s),/path/);}
  const s=source('p0');s.payload={paths:{}};s.sectors[0].waves=[];
  for(let i=0;i<9;i++) {
    s.payload.paths[`p${i}`]=[{dy:1,frames:i+1,flags:16},...Array.from({length:3},()=>({dy:1,frames:0,flags:16}))];
    s.sectors[0].waves.push({row:i*8,archetype:'wingman',count:1,spacing:24,entry:124,path:`p${i}`});
  }
  assert.throws(()=>compile(s),/eight distinct paths/);
});

function readyMembers(fire='volley') {
  const s=source();Object.assign(s.sectors[0].waves[0],{fire,count:3,spacing:16});
  const m=image(s);for(let f=0;f<36;f++)tick(m);
  for(let i=0;i<3;i++) {
    assert.equal(m[L('light_state')+i],2);
    m[L('light_y')+i]=64;m[L('light_x')+i]=124;m[L('_light_fire_timer')+i]=0;
  }
  m[L('frame_counter')]=64;
  return m;
}
function memberActions(m) {
  return Array.from({length:3},(_,i)=>{m[L('light_slot')]=i;return run(m,'_enemy_c_light_tick').a;});
}
test('M3 contextual fire bits preserve no-path and escort loops and reject invalid modes',()=>{
  for(const [fire,bits] of [['normal',0],['volley',64],['column',128],['volley-column',192]]) {
    const s=source();s.sectors[0].waves[0].fire=fire;
    assert.equal(compile(s).core[WAVE_ARRAY_OFFSET.flags]&192,bits);
  }
  for(const mode of ['constructor','bad',1]) {const s=source();s.sectors[0].waves[0].fire=mode;assert.throws(()=>compile(s),/fire/);}
  const s=source();delete s.sectors[0].waves[0].path;s.sectors[0].waves[0].fire='volley';assert.throws(()=>compile(s),/fire/);
});
test('M3 one volley opportunity emits only ready members using one token, without backlog',()=>{
  const m=readyMembers();m[L('_light_token_budget')]=1;
  assert.deepEqual(memberActions(m),[1,1,1]);
  assert.equal(m[L('_light_token')],0);
  assert.deepEqual(memberActions(m),[0,0,0],'no duplicate same-frame action');
  for(let i=0;i<3;i++)m[L('_light_fire_timer')+i]=0;
  m[L('frame_counter')]=65;assert.deepEqual(memberActions(m),[0,0,0]);
  m[L('frame_counter')]=128;assert.deepEqual(memberActions(m),[1,1,1]);
});
test('M3 token-denied volley does not retry until the next opening or advance reloads',()=>{
  const m=readyMembers();m[L('_light_token_frame')]=64;m[L('_light_token')]=0;
  assert.deepEqual(memberActions(m),[0,0,0]);
  assert.equal(m[L('_light_fire_timer')],0);
  m[L('_light_token')]=1;assert.deepEqual(memberActions(m),[0,0,0]);
  m[L('frame_counter')]=65;assert.deepEqual(memberActions(m),[0,0,0]);
  m[L('frame_counter')]=128;assert.deepEqual(memberActions(m),[1,1,1]);
});
test('M3 column is inclusive one cell and combined volley filters its snapshot',()=>{
  const m=readyMembers('volley-column');m[L('player_x')]=118;
  m[L('light_x')]=120;m[L('light_x')+1]=128;m[L('light_x')+2]=132;
  assert.deepEqual(memberActions(m),[1,1,0]);
  for(const [x,expected] of [[120,1],[128,1],[116,0],[132,0]]) {
    const c=readyMembers('column');c[L('player_x')]=118;c[L('light_x')]=x;
    c[L('light_slot')]=0;assert.equal(run(c,'_enemy_c_light_tick').a,expected);
  }
});
test('M3 segment hold-fire and late/reused admissions cannot join a prepared volley',()=>{
  const m=readyMembers();m[L('light_slot')]=0;assert.equal(run(m,'_enemy_c_light_tick').a,1);
  m[L('light_slot')]=1;run(m,'_asm_m3_admit');m[L('_light_fire_timer')+1]=0;m[L('light_y')+1]=64;
  assert.equal(run(m,'_enemy_c_light_tick').a,0);
  const q=readyMembers();q[LEVEL_PAYLOAD_ADDRESS+PAYLOAD_OFFSET.path+2]=0;
  assert.deepEqual(memberActions(q),[0,0,0]);
});
test('M3 invalid L2/phase returns ordinary fallback without reading poisoned L2 or content',()=>{
  for(const [valid,phase,state] of [[0,6,7],[1,3,7],[1,6,2]]) {
    const m=readyMembers();m[0x86b3]=valid;m[L('game_state')]=phase;m[0x4ea5]=state;
    m.fill(0,0x1900,0x2000);
    const r=run(m,'_asm_m3_volley');assert.equal(r.a,0);
    assert.ok(r.accesses.every(a=>a<0x1180||a>=0x2000),'guard precedes both checked homes');
  }
});
test('M3 invalid checked pair falls back to ordinary per-member token/fire policy',()=>{
  const m=readyMembers();m[0x86b3]=0;m.fill(0,0x1180,0x2000);
  m[L('_light_token_budget')]=1;m[L('_light_token_frame')]=63;
  assert.deepEqual(memberActions(m),[1,0,0],'normal fire claims a token per member, never a volley');
});
test('M3 volley guard overhead is measured against its identical direct helper',()=>{
  const m=readyMembers(),direct=run(m.slice(),'_m3_prepare_volley'),guarded=run(m.slice(),'_asm_m3_volley');
  assert.equal(guarded.a,1);
  if(process.env.VS65_M3_GUARD_COST_REPORT)fs.writeFileSync(process.env.VS65_M3_GUARD_COST_REPORT,
    JSON.stringify({method:'MEASURED NMOS entry-through-RTS, no caller JSR/DMA; identical three-ready-member state',helper:direct.cycles,guarded:guarded.cycles,guardOverhead:guarded.cycles-direct.cycles},null,2)+'\n');
});

// Owner's final pilot: test actual linked decisions, not just authored row pins.
test('M3 denser pilot spans both sides and hands off at the next available row tick',()=>{
 const pilot=JSON.parse(fs.readFileSync(`${root}/assets/levels/level-02.json`));
 for(const tempo of ['easy','normal','hard'])for(const sectorIndex of [0,3])for(const difficulty of [0,1,2])for(const quickKills of [false,true]) {
  const sector=structuredClone(m3TempoSource(pilot,tempo).sectors[sectorIndex]);
  const s={...m3TempoSource(pilot,tempo),sectors:[sector]},m=image(s),c=compile(s);
  m[L('DIFFICULTY_SETTING')]=difficulty;
  const expected=c.waves.reduce((n,w)=>n+w.count,0);let admitted=0,acc=0,previousCursor=1,cleared=null,lastFrame=0;
  const gaps=[],xs=new Set(),columns=new Set(),visibleGaps=[];let lastVisible=null;
  for(let frame=1;frame<=5000;frame++) {
   m[L('frame_counter')]=(m[L('frame_counter')]+1)&255;acc+=8+difficulty;
   if(acc>=20){acc-=20;run(m,'_director_c_world_row_tick');}
   const cursor=m[0x80f7];
   if(cursor>previousCursor){assert.notEqual(cleared,null,'next wave requires a clear field');gaps.push(frame-cleared);previousCursor=cursor;}
   const remaining=m[L('_light_wave_remaining')];run(m,'_enemy_c_light_wave');
   if(m[L('_light_wave_remaining')]+1===remaining)admitted++;
   for(let slot=0;slot<4;slot++)if(m[L('light_state')+slot]) {
    m[L('light_slot')]=slot;run(m,'_enemy_c_light_tick');
    if(m[L('light_y')+slot]>=visibleTop&&m[L('light_state')+slot]){xs.add(m[L('light_x')+slot]);columns.add(Math.floor((m[L('light_x')+slot]-48)/52));}
    if(quickKills){m[L('light_state')+slot]=0;m[L('light_screen_hi')+slot]=0;}
   }
   const visible=Array.from({length:4},(_,i)=>m[L('light_state')+i]===2&&m[L('light_y')+i]>=visibleTop&&m[L('light_y')+i]<232).some(Boolean);
   if(visible){if(lastVisible!==null&&frame-lastVisible>1)visibleGaps.push(frame-lastVisible-1);lastVisible=frame;}
   const empty=!m.slice(L('light_state'),L('light_state')+4).some(Boolean);
   if(empty&&m[L('_light_wave_remaining')]===0&&cleared===null)cleared=frame;
   if(!empty||m[L('_light_wave_remaining')]!==0)cleared=null;
   lastFrame=frame;if(admitted===expected&&empty)break;
  }
  tuningResults.push({tempo,sector:sectorIndex+1,difficulty,quickKills,admitted,completionFrame:lastFrame,handoffGaps:gaps,visibleGaps,visibleWidth:xs.size?Math.max(...xs)-Math.min(...xs):0});
  assert.equal(admitted,expected,`sector${sectorIndex+1}/${difficulty}/${quickKills}: every group admitted`);
  assert.ok(lastFrame<5000);assert.equal(gaps.length,c.waves.length-1);
  assert.ok(gaps.every(n=>n>=1&&n<=4),`handoff ${gaps}: only the existing clear/row cadence`);
  if(!quickKills){assert.ok(Math.max(...xs)-Math.min(...xs)>=140);assert.ok(columns.has(0)&&columns.has(1)&&columns.has(2),'left, centre and right used');}
 }
});
test('M3 mirrored centre fan descends from opposite sides before crossing',()=>{
 const pilot=JSON.parse(fs.readFileSync(`${root}/assets/levels/level-02.json`));
 const s={...pilot,sectors:[{kind:'space',subtype:'swarm',rows:480,lights:3,archetypes:['interceptor'],waves:[
  {row:0,archetype:'interceptor',count:2,spacing:16,entry:124,path:'wide-cross',mirror:true}]}]},m=image(s),entries=[];
 for(let f=0;f<140;f++){
  tick(m);for(let slot=0;slot<2;slot++)if(m[L('light_y')+slot]===visibleTop)entries.push(m[L('light_x')+slot]);
 }
 assert.deepEqual(entries,[200,48],'hidden fan precedes visible opposing-side entries at gameplay top24 at the slower authored cadence');
 assert.ok(m[L('light_x')]<124&&m[L('light_x')+1]>124,'both members cross the centre');
});


test('M3 four admitted path Lights share one glyph pair and one volley token',()=>{
 const s=source('straight');s.sectors[0].lights=4;s.sectors[0].waves[0].count=4;
 s.sectors[0].waves[0].spacing=16;s.sectors[0].waves[0].fire='volley';const m=image(s);
 for(let frame=0;frame<54;frame++)tick(m);
 assert.deepEqual([...m.slice(L('light_state'),L('light_state')+4)],[2,2,2,2]);
 assert.equal(m[L('_light_wave_remaining')],0);assert.equal(m[L('_light_slot_limit')],4);
 assert.equal(new Set(m.slice(L('_light_code'),L('_light_code')+4)).size,1,'same authored look shares an installed pair');
 for(let i=0;i<4;i++){m[L('_light_fire_timer')+i]=0;m[L('light_y')+i]=64;}
 m[L('frame_counter')]=64;m[L('_light_token_budget')]=1;const actions=[];
 for(let i=0;i<4;i++){m[L('light_slot')]=i;actions.push(run(m,'_enemy_c_light_tick').a);}
 assert.deepEqual(actions,[1,1,1,1]);assert.equal(m[L('_light_token')],0);
 for(let i=0;i<4;i++){m[L('light_slot')]=i;assert.equal(run(m,'_enemy_c_light_tick').a,0,'no duplicate pulse');}
});
