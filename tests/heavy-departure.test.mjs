import test from 'node:test';
import assert from 'node:assert/strict';
import {Nmos6502} from '../scripts/nmos6502.mjs';
import {machine,L,run} from '../scripts/measure-population-harness.mjs';
import {compileHeavyDamage} from '../scripts/heavy-damage.mjs';

function call(m,name,x=0,a=0) {
  m.cpu.push(127);m.cpu.push(254);m.cpu.x=x;m.cpu.a=a;
  return run(m.cpu,L(name),[32767],{maxSteps:2000000});
}
function formation(difficulty=1,shape=2) {
  const m=machine({difficulty}),v=m.memory;v[L('game_state')]=6;call(m,'director_init');
  v.fill(0,0x3d00,0x3f00);v[L('_heavy_wave_flags')]=0;
  v[L('_heavy_archetype_offset')]=shape===2?36:0;v[L('_heavy_escort_offset')]=255;
  call(m,'reset_enemy');v[L('_heavy_departure')]=1;v[L('_heavy_member_colour')]=0xc8;
  return m;
}
function clone(m) {const memory=m.memory.slice();return {memory,cpu:new Nmos6502(memory)};}
function solo(m,slot,x,y) {
  const v=m.memory,peer=slot^1;
  v[L('ENEMY_MEMBER_STATE')+peer]=0;v[L('ENEMY_HP')+peer]=0;v[L('ENEMY_LIVE_COUNT')]=1;
  v[L('ENEMY_X')+slot]=x;v[L('ENEMY_Y')+slot]=y;
  call(m,'draw_enemy_member',slot,255);
}
test('departing Bomber chooses nearest screen edge, flies eight pixels/frame and clears before retirement',()=>{
  let cases=0,maximum=0;
  for(const difficulty of [0,1,2]) {
    const base=formation(difficulty);
    for(const slot of [0,1])for(const y of [16,72,225])for(let x=48;x<=176;x++) {
      const m=clone(base),v=m.memory;solo(m,slot,x,y);
      let frames=0,old=x;const direction=x<112?-1:1;
      while(v[L('ENEMY_MEMBER_STATE')+slot]) {
        call(m,'update_enemy');frames++;
        const next=v[L('ENEMY_X')+slot];
        if(v[L('ENEMY_MEMBER_STATE')+slot]) {
          assert.equal(next-old,direction*4);assert.equal(v[L('ENEMY_Y')+slot],y);
          assert.equal(v[0xd001+slot],next);
        } else {
          assert.equal(next,direction<0?0:224);assert.equal(v[0xd001+slot],0);
          assert.ok(v.slice(0x3d00+slot*256,0x3e00+slot*256).every(b=>!b),'old body completely erased');
        }
        old=next;assert.ok(frames<=28);assert.ok(v.slice(L('FIGHTER_PROJECTILE_ACTIVE')+5,L('FIGHTER_PROJECTILE_ACTIVE')+10).every(b=>!b),'no departure fire');
      }
      assert.equal(v[L('ENEMY_ACTIVE')],0);assert.equal(v[L('ENEMY_LIVE_COUNT')],0);
      const plane=v.slice(0x3d00,0x3f00);v[L('_heavy_breakup_pending')]=slot+1;
      call(m,'heavy_breakup_retry');call(m,'update_enemy');assert.deepEqual(v.slice(0x3d00,0x3f00),plane,'retired member never redrawn');
      maximum=Math.max(maximum,frames);cases++;
    }
  }
  console.log(JSON.stringify({departureCases:cases,maximumExitFrames:maximum,speedRasterPixelsPerFrame:8,newStateBytes:0}));
});
test('departure hits publish both Bomber hole stages at held Y, then kill and score normally',()=>{
  const stages=compileHeavyDamage().stages[1];
  for(const difficulty of [0,1,2])for(const slot of [0,1]) {
    const m=formation(difficulty),v=m.memory;v[L('ENEMY_Y')]=v[L('ENEMY_Y')+1]=72;
    v[L('ENEMY_X')]=88;v[L('ENEMY_X')+1]=152;
    for(const s of [0,1])call(m,'draw_enemy_member',s,255);
    v[L('score_bcd_lo')]=v[L('score_bcd_hi')]=0;
    const initial=v[L('ENEMY_HP')+slot];
    for(let hp=initial-1;hp>=0;hp--) {
      call(m,'update_enemy');assert.equal(v[L('ENEMY_Y')+slot],72);
      v[L('ENEMY_PENDING_DAMAGE')+slot]=1;v[L('ENEMY_PENDING_SOURCE')+slot]=0;
      call(m,'resolve_enemy_damage');v[L('ENEMY_PENDING_DAMAGE')+slot]=0;
      if(hp) {
        assert.equal(v[L('ENEMY_HP')+slot],hp);
        v[0x86]++;v[0x86b4]=8;v[L('scroll_accumulator')]=0;
        v[L('_light_token_frame')]=v[0x86];v[L('_light_token')]=1;v[L('_light_rotate_frame')]=(v[0x86]-1)&255;
        call(m,'heavy_breakup_retry');const stage=hp<=2?3-hp:0;
        assert.equal(v[L('M3H_DAMAGE_STAGE')+slot],stage);
        assert.deepEqual([...v.slice(0x3d00+slot*256+72,0x3d00+slot*256+88)],stages[stage]);
      } else {
        assert.equal(v[L('ENEMY_MEMBER_STATE')+slot],0);assert.equal(v[L('ENEMY_HP')+slot],0);
        assert.equal(v[L('ENEMY_LIVE_COUNT')],1);assert.equal(v[L('score_bcd_lo')],0x50);
        assert.ok(v.slice(0x3d00+slot*256,0x3e00+slot*256).every(b=>!b));
      }
    }
  }
});
test('capital admission still waits two fully Heavy-free frames, including frame-counter wrap',()=>{
  let minimum=255;
  for(const difficulty of [0,1,2])for(const frame of [40,254]) {
    const m=formation(difficulty),v=m.memory;solo(m,0,4,72);
    call(m,'_asm_cc2_advance');assert.equal(v[0x80f6],0,'live Heavy blocks admission');
    call(m,'update_enemy');assert.equal(v[L('ENEMY_ACTIVE')],0);
    for(let empty=0;empty<=2;empty++) {
      v[0x86]=(frame+empty)&255;call(m,'_asm_cc2_advance');
      assert.equal(v[0x80f6],empty<2?0:1);
      if(v[0x80f6]===1)minimum=Math.min(minimum,empty);
    }
  }
  console.log(JSON.stringify({minimumHeavyFreeFrames:minimum,difficulties:[0,1,2],counterWrapCovered:true}));
});
test('invalid content/phase cannot enter the departure body or its erase executor',()=>{
  for(const [valid,phase] of [[0,6],[0,0],[1,0],[1,5],[1,7],[1,8],[1,255]]) {
    const m=formation(),v=m.memory;v[0x86b3]=valid;v[L('game_state')]=phase;
    v.fill(0xa5,0x1180,0x1900);const old=m.cpu.hooks.read;
    m.cpu.hooks.read=(a,c)=>{assert.ok(a<0x1180||a>=0x1900,'invalid home read');return old?.(a,c);};
    v[L('ENEMY_TARGET_SLOT')]=0;call(m,'heavy_member_update');
  }
});
