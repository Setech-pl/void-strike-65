import assert from 'node:assert/strict';
import test from 'node:test';
import {machine, L, run} from '../scripts/measure-population-harness.mjs';

function call(m,name,{x=0,a=0}={}) {
  m.cpu.push(0x7f);m.cpu.push(0xfe);m.cpu.x=x;m.cpu.a=a;
  return run(m.cpu,L(name),[0x7fff],{maxSteps:2000000});
}
function formation(shape=0) {
  const m=machine({difficulty:1});m.memory[L('game_state')]=6;
  call(m,'director_init');
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
