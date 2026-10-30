import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {machine,L,run} from '../scripts/measure-population-harness.mjs';

// Production entry points and renderer, not a model of the new gate.
function call(m,name,x=0) {
  m.cpu.push(127);m.cpu.push(254);m.cpu.x=x;
  return run(m.cpu,L(name),[32767],{maxSteps:2000000});
}
function formation({bomber=false,armoured=false,motion=0,difficulty=1}={}) {
  const m=machine({difficulty});m.memory[L("game_state")]=6;
  // Production start_gameplay clears both PMG planes before admission.
  m.memory.fill(0,0x3d00,0x3f00);
  for(let row=0;row<27;row++) {
    const a=0x8140+row*40;m.memory[L('PLAYFIELD_ROW_LO')+row]=a&255;m.memory[L('PLAYFIELD_ROW_HI')+row]=a>>8;
  }
  call(m,'director_init');
  // Arm a real WaveDef; the successful Heavy request publishes H4 metadata.
  m.memory[0x80f7]=0;
  m.memory[L('_wave_archetype')]=bomber?36:0;
  m.memory[L('_wave_member_offset')]=255;
  m.memory[L('_wave_flags')]=armoured?0x28:8;
  m.memory[L('_wave_path')]=motion;
  call(m,'director_try_event');
  m.memory[L('PLAYER_LIFECYCLE')]=0;
  call(m,'director_request',0);
  assert.ok(m.cpu.p&1,'Heavy request admitted');
  const spawn=call(m,'reset_enemy');return {...m,spawn};
}
function expected(m,slot) {
  const p=new Uint8Array(256),v=m.memory;
  if(!v[L('ENEMY_MEMBER_STATE')+slot])return p;
  const shape=v[L('ENEMY_ARCHETYPE')],y=v[L('ENEMY_Y')+slot];
  for(let i=0;i<v[L('enemy_frame_heights')+shape];i++)if(y+i>=16&&y+i<240)p[y+i]=v[L('enemy_body_data')+shape*16+i];
  return p;
}
test('M3-H assault: opposite descent parity, unchanged pursuit, exact planes and bounded standing cost',()=>{
  const m=formation(),reference=formation();const v=m.memory,ref=reference.memory;
  let maximum=0,total=0,samples=0,frames=0;
  for(let f=0;f<900;f++) {
    if(!v[L('ENEMY_LIVE_COUNT')])break;
    v[0x86]=ref[0x86]=f&255;v[L('player_x')]=ref[L('player_x')]=[60,160,100,190][(f>>4)&3];
    const before=[v[L('ENEMY_Y')],v[L('ENEMY_Y')+1]],live=[v[L('ENEMY_MEMBER_STATE')],v[L('ENEMY_MEMBER_STATE')+1]];
    const writes=[0,0];const old=m.cpu.hooks.write;
    m.cpu.hooks.write=(a,value)=>{if(a>=0x3d00&&a<0x3f00)writes[(a-0x3d00)>>8]++;return old?.(a,value);};
    const result=call(m,'update_enemy');m.cpu.hooks.write=old;
    for(let slot=0;slot<2;slot++) {
      if(!live[slot])continue;
      ref[L('ENEMY_TARGET_SLOT')]=slot;call(reference,'update_enemy_slot_motion',slot);
      for(const field of ['ENEMY_X','ENEMY_VELOCITY_X','ENEMY_MOVE_ACCUMULATOR'])
        assert.equal(v[L(field)+slot],ref[L(field)+slot],`${field}, frame ${f}, slot ${slot}`);
      if(v[L('ENEMY_MEMBER_STATE')+slot]) {
        if(((f^slot)&1)!==0)assert.equal(v[L('ENEMY_Y')+slot],before[slot],'skipped descent');
        if(v[L('ENEMY_Y')+slot]===before[slot])assert.equal(writes[slot],0,'held plane was rewritten');
      }
      assert.deepEqual(v.slice(0x3d00+slot*256,0x3e00+slot*256),expected(m,slot),`plane ${slot}, frame ${f}`);
    }
    if(live.every(Boolean)){maximum=Math.max(maximum,result.cycles);total+=result.cycles;samples++;}
    frames++;
  }
  assert.equal(frames,668,'full unhit formation lifetime');
  // Owner amendment 3 (2026-10-27): report >1200; hard STOP above +5%.
  if(maximum>1200)console.log(JSON.stringify({tolerance:"assault maximum",nominal:1200,measured:maximum,stopAbove:1260}));
  assert.ok(maximum<=1260,`two-member maximum ${maximum} > 1260 (1200 +5%)`);
  assert.ok(1546-total/samples>=400,`mean ${total/samples}: saving <400`);
  console.log(JSON.stringify({family:'assault',maximum,mean:total/samples,frames}));
});
test('M3-H HP, flash hue, and spawn delta on every difficulty',()=>{
  for(let difficulty=0;difficulty<3;difficulty++)for(const profile of ['assault','armoured','bomber']) {
    const m=formation({difficulty,armoured:profile==='armoured',bomber:profile==='bomber'});
    const hp=profile==='assault'?1:(profile==='bomber'?4:2)+(difficulty===2?1:0);
    assert.deepEqual([...m.memory.slice(L('ENEMY_HP'),L('ENEMY_HP')+2)],[hp,hp]);
    const baseline=profile==='bomber'?2245:1612;
    assert.ok(m.spawn.cycles<=baseline+105,`${profile} reset ${m.spawn.cycles} > ${baseline+105}`);
  }
});
test('M3-H armoured authored hold and surviving-hit dodge retain Y and the stop',()=>{
  const m=formation({armoured:true,motion:0x14}); // row40, 64 frames
  const v=m.memory;let at=0;
  while(v[L('ENEMY_Y')]<40&&at<300){v[0x86]=at++;call(m,'update_enemy');}
  assert.equal(v[L('ENEMY_Y')],40);
  for(let f=0;f<64;f++) {
    v[0x86]=at++;
    if(f===8)v[L('ENEMY_HP')]--;
    const y=v[L('ENEMY_Y')];call(m,'update_enemy');assert.equal(v[L('ENEMY_Y')],y,`hold ${f}`);
  }
  // A flying hit moves 12 HPOS away over six ticks, without changing Y.
  const a=formation({armoured:true});a.memory[L('ENEMY_Y')]=60;a.memory[L('ENEMY_X')]=100;a.memory[L('player_x')]=160;
  a.memory[L('ENEMY_HP')]--;
  for(let f=0;f<6;f++){a.memory[0x86]=f;a.memory[L('ENEMY_TARGET_SLOT')]=0;call(a,'heavy_member_update',0);assert.equal(a.memory[L('ENEMY_Y')],60);}
  assert.equal(a.memory[L('ENEMY_X')],88);
});
test('M3-H Bomber flying hit dodges, authored stop survives hit, and flash stays in hue C',()=>{
  for(const held of [false,true]) {
    const m=formation({bomber:true,motion:held?0x36:0,difficulty:2});const v=m.memory;
    v[L('ENEMY_Y')]=held?72:60;v[L('ENEMY_X')]=80;v[L('player_x')]=160;v[L('ENEMY_HP')]--;
    for(let f=0;f<6;f++){v[0x86]=f;v[L('ENEMY_TARGET_SLOT')]=0;call(m,'heavy_member_update',0);assert.equal(v[L('ENEMY_Y')],held?72:60);assert.equal(v[0xd013]&0xf0,0xc0);}
    assert.equal(v[L('ENEMY_X')],68);
    if(held){for(let f=6;f<96;f++){v[0x86]=f;v[L('ENEMY_TARGET_SLOT')]=0;call(m,'heavy_member_update',0);assert.equal(v[L('ENEMY_Y')],72);}}
  }
});
test('M3-H placement: appended H2, thirteen BSS bytes and unchanged protected capacities',()=>{
  assert.equal(L('__HYBRID_HEAVY_PACKAGE_SIZE__')+L('__HYBRID_HEAVY_MEMBERS_SIZE__'),13);
  assert.equal(L('__HYBRID_HEAVY_PACKAGE_RUN__'),0x813b);
  assert.equal(L('__HYBRID_HEAVY_MEMBERS_RUN__'),0x85e6);
  assert.ok(L('heavy_armoured_tick')>=0xae00&&L('heavy_armoured_tick')<0xb8fb);
  const m=JSON.parse(fs.readFileSync('build/manifest.json'));
  const r=m.transportCapacity.manifest.parsed.records;
  assert.equal(r[0].sectorCount,44);assert.equal(r[6].sectorCount,6);
  assert.ok(r[7].sectorCount<=14);assert.equal(r[8].sectorCount,9);assert.equal(r[10].sectorCount,3);
  // B1 solid impact uses existing CODE/alignment padding. Packed content is
  // +18 B; protected segment capacities and transport sectors stay unchanged.
  assert.equal(m.transportCapacity.initialBootContentBytes,12843);assert.equal(m.l2.usedBytes,1290);
});


test('M3-H shared wave arm leaves Heavy metadata untouched on Light/boss escort paths',()=>{
  const m=machine({difficulty:1});m.memory[L('game_state')]=6;call(m,'director_init');
  for(const flags of [0,0x80,0xc1]) {
    m.memory[0x80f7]=0;
    m.memory[L('_wave_flags')]=flags;m.memory[L('_wave_path')]=255;
    m.memory[L('_wave_archetype')]=24;m.memory[L('_wave_member_offset')]=255;
    m.memory[L('_heavy_motion')]=0x35;
    m.memory[L('_heavy_wave_hold_row')]=0x55;m.memory[L('_heavy_wave_hold_frames')]=0xaa;
    call(m,'director_try_event');
    assert.deepEqual([m.memory[L('_heavy_motion')],m.memory[L('_heavy_wave_hold_row')],m.memory[L('_heavy_wave_hold_frames')]],[0x35,0x55,0xaa]);
    assert.equal(m.memory[L('_heavy_wave_flags')],flags,'escort flags are still published byte for byte');
  }
  m.memory[L('_wave_flags')]=0x28;m.memory[L('_wave_path')]=0x14;
  m.memory[L('_wave_archetype')]=0;
  call(m,'director_init'); // teardown the Light wave after restoring a Heavy WaveDef
  m.memory[0x80f7]=0;call(m,'director_try_event');
  assert.equal(m.memory[L('_heavy_motion')],0x35,'wave arm itself has no Heavy work');
  m.memory[L('PLAYER_LIFECYCLE')]=0;call(m,'director_request',0);
  assert.ok(m.cpu.p&1,'Heavy request admitted');
  assert.deepEqual([m.memory[L('_heavy_motion')],m.memory[L('_heavy_wave_hold_row')],m.memory[L('_heavy_wave_hold_frames')]],[0x14,40,64]);
});
