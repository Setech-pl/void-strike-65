import assert from 'node:assert/strict';
import test from 'node:test';
import {machine, L, run} from '../scripts/measure-population-harness.mjs';
import {compileHeavyLook, defaultArmouredRaiderLook} from '../scripts/enemy-roster.mjs';
import {compileLevelFile, compileLevel, loadLevelSource, levelSourcePath,
  HEAVY_LOOK_OFFSET, LEVEL_PAYLOAD_ADDRESS} from '../scripts/level-compiler.mjs';

function call(m,name,{x=0,a=0}={}) {
  m.cpu.push(0x7f);m.cpu.push(0xfe);m.cpu.x=x;m.cpu.a=a;
  return run(m.cpu,L(name),[0x7fff],{maxSteps:2000000});
}
function formation(shape=0,{armoured=false,difficulty=1,payload=null,flags=0}={}) {
  const m=machine({difficulty});m.memory[L('game_state')]=6;
  call(m,'director_init');
  m.memory.fill(0,0x3d00,0x3f00); // production start_gameplay clears both planes
  m.memory[L('_heavy_wave_flags')]=flags|(armoured?0x20:0);
  if(payload)m.memory.set(payload,LEVEL_PAYLOAD_ADDRESS+HEAVY_LOOK_OFFSET);
  m.memory[L('_heavy_archetype_offset')]=shape===2?36:0;
  m.memory[L('_heavy_escort_offset')]=255;
  m.memory.fill(0xa5,L('M3H_DAMAGED_BODY_BUFFER'),L('M3H_RENDER_STATE_END'));
  call(m,'reset_enemy');
  return m;
}

test('H11 admission resets poisoned metadata and installs both default bodies before drawing',()=>{
  const m=formation();
  for(const shape of [0,2,0,2]) {
    m.memory.fill(0xa5,L('M3H_BODY_INDEX'),L('M3H_RENDER_STATE_END'));
    m.memory[L('_heavy_archetype_offset')]=shape===2?36:0;
    call(m,'reset_enemy');
    assert.deepEqual([...m.memory.slice(L('M3H_BODY_INDEX'),L('M3H_RENDER_STATE_END'))],
      [shape*16,shape*16,0,0,0,0,0,0]);
    assert.equal(m.memory[L('heavy_body_height_operand')],shape===2?16:14);
    const p=L('heavy_body_base_operand');
    assert.equal(m.memory[p]|m.memory[p+1]<<8,L('enemy_body_data'));
    assert.ok(m.memory.slice(L('M3H_DAMAGED_BODY_BUFFER'),L('M3H_DAMAGED_BODY_BUFFER_END')).every(v=>v===0xa5),
      'admission must not read/copy an uninitialized damage buffer');
  }
});

test('heavyLook compiler uses exactly 17 reserved bytes and rejects unsafe shapes/colours',()=>{
  const expected=compileHeavyLook(defaultArmouredRaiderLook());
  assert.equal(expected[16],0x68,'armour has its own violet hue, unlike assault $44');
  for(const id of [1,2]) {
    const level=compileLevelFile(levelSourcePath(id));
    assert.deepEqual(level.payload.slice(HEAVY_LOOK_OFFSET,HEAVY_LOOK_OFFSET+17),expected);
    assert.ok(level.payload.slice(HEAVY_LOOK_OFFSET+17,184).every(v=>v===0),'five geometry bytes stay free');
  }
  for(const invalid of [null,{rows:[]},{rows:Array(14).fill('00000000'),colour:'$46'},
    {rows:Array(14).fill('11111111'),colour:'$46'},
    {...defaultArmouredRaiderLook(),colour:'$88'},
    {...defaultArmouredRaiderLook(),colour:'$47'},
    {...defaultArmouredRaiderLook(),rows:['12345678',...defaultArmouredRaiderLook().rows.slice(1)]}]) {
    const source=loadLevelSource(levelSourcePath(2));source.payload.heavyLook=invalid;
    assert.throws(()=>compileLevel(source),/payload.heavyLook/);
  }
});

test('armoured look publishes payload rows and C colour; escort-loop bits do not change the look',()=>{
  const look=defaultArmouredRaiderLook();look.colour='$48';
  const payload=compileHeavyLook(look);
  for(const difficulty of [0,1,2])for(const flags of [0,0x40,0x80,0xc0]) {
    const m=formation(0,{armoured:true,difficulty,payload,flags});
    const p=L('heavy_body_base_operand');
    assert.equal(m.memory[p]|m.memory[p+1]<<8,LEVEL_PAYLOAD_ADDRESS+HEAVY_LOOK_OFFSET);
    assert.deepEqual([...m.memory.slice(L('M3H_BODY_INDEX'),L('M3H_BODY_INDEX')+2)],[0,0]);
    assert.equal(m.memory[L('M3H_BODY_FLAGS')],0x20,'latched presentation is independent of motion cutoff');
    assert.equal(m.memory[0xd013],0x48);assert.equal(m.memory[0xd014],0x48);
    assert.equal(m.memory[L('ENEMY_HP')],difficulty===2?3:2);
    for(const slot of [0,1]) {
      m.memory[L('ENEMY_Y')+slot]=60;m.memory.fill(0,0x3d00+slot*256,0x3e00+slot*256);
      call(m,'draw_enemy_member',{x:slot,a:255});
      assert.deepEqual([...m.memory.slice(0x3d00+slot*256+60,0x3d00+slot*256+74)],[...payload.slice(0,14)]);
    }
    m.memory[L('_heavy_armoured')]=0; // real runway cutoff clears movement, not appearance
    assert.equal(m.memory[L('M3H_BODY_FLAGS')],0x20);
    assert.equal(m.memory[p]|m.memory[p+1]<<8,LEVEL_PAYLOAD_ADDRESS+HEAVY_LOOK_OFFSET);
    m.memory[L('_heavy_wave_flags')]=0;call(m,'reset_enemy');
    assert.equal(m.memory[p]|m.memory[p+1]<<8,L('enemy_body_data'));
    assert.equal(m.memory[0xd013],0x44);assert.equal(m.memory[0xd014],0x44);
  }
});

test('armoured payload planes remain exact through flight, authored hold, hit dodge and retirement',()=>{
  for(const difficulty of [0,1,2]) {
    const m=formation(0,{armoured:true,difficulty}),v=m.memory;
    v[L('_heavy_hold_row')]=40;v[L('_heavy_hold_left')]=64;v[L('_heavy_hold_left')+1]=64;
    let held=0,dodged=0;
    for(let f=0;f<1000&&v[L('ENEMY_LIVE_COUNT')];f++) {
      v[0x86]=f&255;
      const before=[v[L('ENEMY_Y')],v[L('ENEMY_Y')+1]],writes=[0,0];
      if(f===90){v[L('ENEMY_HP')]--;dodged++;}
      const hook=m.cpu.hooks.write;m.cpu.hooks.write=(a,b)=>{if(a>=0x3d00&&a<0x3f00)writes[(a-0x3d00)>>8]++;return hook?.(a,b);};
      call(m,'update_enemy');m.cpu.hooks.write=hook;
      for(const slot of [0,1]) {
        const plane=new Uint8Array(256),y=v[L('ENEMY_Y')+slot];
        if(v[L('ENEMY_MEMBER_STATE')+slot])for(let r=0;r<14;r++)if(y+r>=16&&y+r<240)plane[y+r]=v[0xaba2+r];
        assert.deepEqual(v.slice(0x3d00+slot*256,0x3e00+slot*256),plane,`difficulty${difficulty} frame${f} slot${slot}`);
        if(v[L('ENEMY_MEMBER_STATE')+slot]&&before[slot]===y){held++;assert.equal(writes[slot],0);}
      }
    }
    assert.ok(held>64);assert.equal(dodged,1);assert.equal(v[L('ENEMY_LIVE_COUNT')],0);
  }
});

// Exact 71-B draw_enemy_member from main 7fe9040. Other routine/data addresses
// stay pinned. This compares real NMOS execution of the old/new body loops,
// including clipping and self-modified PMG-page selection, in identical RAM.
const originalDraw=Buffer.from('8e8654dd7a5408accb4ebd785438f950779d01d028f02f20a02da8aecb4ebd4a77858f8a0a0a0a0aaaad865418693d8dc463c010900abd6577c0f0b00999003dc8e8c68fd0ec60','hex');

test('H10 clipped body copies equal main on both planes and save eight cycles; idle path is unchanged',()=>{
  for(const shape of [0,2])for(const slot of [0,1])for(const y of [0,2,3,15,16,60,224,226,238,239,240]) {
    const current=formation(shape),baseline=formation(shape);
    baseline.memory.set(originalDraw,L('draw_enemy_member'));
    for(const m of [current,baseline]) {
      m.memory[L('ENEMY_Y')+slot]=y;
      m.memory[L('ENEMY_X')+slot]=100;
      m.memory.fill(0,0x3d00,0x3f00);
    }
    const now=call(current,'draw_enemy_member',{x:slot,a:255});
    const old=call(baseline,'draw_enemy_member',{x:slot,a:255});
    assert.deepEqual(current.memory.slice(0x3d00,0x3f00),baseline.memory.slice(0x3d00,0x3f00),`shape${shape} slot${slot} Y${y}`);
    assert.equal(now.cycles-old.cycles,-8,`body-copy delta shape${shape} slot${slot} Y${y}`);
    let writes=0;const hook=current.cpu.hooks.write;
    current.cpu.hooks.write=(a,v)=>{if(a>=0x3d00&&a<0x3f00)writes++;return hook?.(a,v);};
    const idle=call(current,'draw_enemy_member',{x:slot,a:y});
    const oldIdle=call(baseline,'draw_enemy_member',{x:slot,a:y});
    assert.equal(idle.cycles,oldIdle.cycles);assert.equal(writes,0);
  }
});
