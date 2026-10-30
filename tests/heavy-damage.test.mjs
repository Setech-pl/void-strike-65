import assert from 'node:assert/strict';
import test from 'node:test';
import {compileHeavyDamage,damageSource} from '../scripts/heavy-damage.mjs';
import {machine,L,run} from '../scripts/measure-population-harness.mjs';

function call(m,name,x=0,a=0) {
  m.cpu.push(127);m.cpu.push(254);m.cpu.x=x;m.cpu.a=a;
  return run(m.cpu,L(name),[32767],{maxSteps:2000000});
}
function formation(shape=0,{difficulty=2,armoured=true}={}) {
  const m=machine({difficulty}),v=m.memory;
  v[L('game_state')]=6;call(m,'director_init');v.fill(0,0x3d00,0x3f00);
  v[L('_heavy_wave_flags')]=shape===0&&armoured?0x20:0;
  v[L('_heavy_archetype_offset')]=shape===2?36:0;v[L('_heavy_escort_offset')]=255;
  call(m,'reset_enemy');return m;
}
function plane(rows,y) {
  const p=new Uint8Array(256);
  for(let i=0;i<rows.length;i++)if(y+i>=16&&y+i<240)p[y+i]=rows[i];
  return p;
}
function schedule(m,{rotate=false,token=true}={}) {
  const v=m.memory;v[0x86]=(v[0x86]+1)&255;v[0x86b4]=8;
  v[L('scroll_accumulator')]=rotate?39:0;
  v[L('_light_token_frame')]=v[0x86];v[L('_light_token')]=token?1:0;
  v[L('_light_rotate_frame')]=(v[0x86]-1)&255;
}

test('H13 generated variant C is 24 checked-home bytes with cumulative holes',()=>{
  const c=compileHeavyDamage(),m=machine();
  assert.equal(c.bytes.length,24);
  assert.ok(L('heavy_damage_holes')>=0x1180&&L('heavy_damage_holes')+24<=0x1900);
  assert.deepEqual([...m.memory.slice(L('heavy_damage_holes'),L('heavy_damage_holes')+24)],[...c.bytes]);
  for(const stages of c.stages)for(let row=0;row<16;row++) {
    assert.equal(stages[1][row]&stages[0][row],stages[1][row]);
    assert.equal(stages[2][row]&stages[1][row],stages[2][row]);
  }
});

test('H13 rejects empty/nonexistent bits, silhouette erosion, duplicate rows and noncumulative stages',()=>{
  for(const mutate of [s=>s.heavyDamage.armouredRaider[0][0][1]=0,
    s=>s.heavyDamage.bomber[0][0][0]=13,
    s=>s.heavyDamage.bomber[0][0][1]=0x80,
    s=>s.heavyDamage.armouredRaider[0][1][0]=2,
    s=>s.heavyDamage.armouredRaider[1][0][1]=4,
    s=>s.heavyDamage.variant='B']) {
    const s=damageSource();mutate(s);assert.throws(()=>compileHeavyDamage(s),/heavyDamage/);
  }
});

test('H13 linked NMOS fixture clears the actual home masks into both H16 bodies exactly',()=>{
  const c=compileHeavyDamage(),m=machine(),v=m.memory,buffer=L('M3H_DAMAGED_BODY_BUFFER');
  for(let shape=0;shape<2;shape++)for(let stage=0;stage<2;stage++)for(let slot=0;slot<2;slot++) {
    const b=buffer+16*slot,t=L('heavy_damage_holes')+shape*12+stage*6;
    v.set(c.stages[shape][0],b);
    // Test-only NMOS loop at $2000. Production publisher is introduced in H12.
    v.set([0xa2,0,0xbc,t&255,t>>8,0xbd,(t+1)&255,(t+1)>>8,0x49,255,
      0x39,b&255,b>>8,0x99,b&255,b>>8,0xe8,0xe8,0xe0,6,0xd0,0xec,0x60],0x2000);
    m.cpu.push(127);m.cpu.push(254);run(m.cpu,0x2000,[32767]);
    assert.deepEqual([...v.slice(b,b+16)],c.stages[shape][stage+1]);
  }
});

test('H12 guarded publisher forces exact current-Y planes; members and stages are independent',()=>{
  const generated=compileHeavyDamage(),samples=[];
  for(const shape of [0,2])for(const y of [0,15,16,40,72,225,239])for(const stages of [[1,0],[0,2],[1,2],[2,2]]) {
    const m=formation(shape),v=m.memory,source=generated.stages[shape===2?1:0];
    for(const slot of [0,1]) {v[L('ENEMY_Y')+slot]=y;call(m,'draw_enemy_member',slot,255);}
    const writes=[0,0],old=m.cpu.hooks.write;
    m.cpu.hooks.write=(a,value)=>{if(a>=0x3d00&&a<0x3f00)writes[(a-0x3d00)>>8]++;return old?.(a,value);};
    v.set(stages,L('heavy_damage_request'));
    const first=call(m,'heavy_damage_publish');
    samples.push({shape,y,stages,first:first.cycles});
    for(const slot of [0,1]) {
      assert.deepEqual(v.slice(0x3d00+slot*256,0x3e00+slot*256),plane(source[stages[slot]],y));
      assert.deepEqual([...v.slice(L('M3H_DAMAGED_BODY_BUFFER')+slot*16,L('M3H_DAMAGED_BODY_BUFFER')+slot*16+16)],source[stages[slot]]);
      assert.equal(v[L('M3H_DAMAGE_STAGE')+slot],stages[slot]);
      if(!stages[slot])assert.equal(writes[slot],0,'untouched peer must not republish');
    }
    assert.deepEqual([...v.slice(L('heavy_damage_request'),L('heavy_damage_request')+2)],[0,0]);
    assert.equal(v[L('M3H_BODY_FLAGS')],shape===0?0x21:1);
    v.set([2,2],L('heavy_damage_request'));
    const later=call(m,'heavy_damage_publish');samples.at(-1).later=later.cycles;
    for(const slot of [0,1])assert.deepEqual(v.slice(0x3d00+slot*256,0x3e00+slot*256),plane(source[2],y));
    v.set([1,1],L('heavy_damage_request'));call(m,'heavy_damage_publish');
    for(const slot of [0,1])assert.equal(v[L('M3H_DAMAGE_STAGE')+slot],2,'a late stage1 cannot heal holes');
  }
  console.log(JSON.stringify({measurement:'NMOS instruction cycles, including guard/copy/masks/draw; no ANTIC DMA',samples}));
});

test('H12 invalid home/phase drops requests with no content read or draw',()=>{
  for(const valid of [0,1])for(const phase of [0,5,6,7,8,9]) {
    if(valid&&phase===6)continue;
    const m=formation(),v=m.memory;v[0x86b3]=valid;v[L('game_state')]=phase;
    v.fill(0xa5,0x1180,0x1900);v.set([1,2],L('heavy_damage_request'));
    const pmg=v.slice(0x3d00,0x3f00),old=m.cpu.hooks.read;
    m.cpu.hooks.read=(a,cpu)=>{assert.ok(a<0x1180||a>=0x1900,`stale content read $${a.toString(16)}`);return old?.(a,cpu);};
    call(m,'heavy_damage_publish');
    assert.deepEqual(v.slice(0x3d00,0x3f00),pmg);
    assert.deepEqual([...v.slice(L('heavy_damage_request'),L('heavy_damage_request')+2)],[0,0]);
  }
});

test('H12 skips dead members, does not re-copy damaged bodies and admission restores intact sources',()=>{
  const m=formation(2),v=m.memory;
  v[L('ENEMY_Y')]=v[L('ENEMY_Y')+1]=60;
  call(m,'draw_enemy_member',0,255);call(m,'draw_enemy_member',1,255);
  v[L('ENEMY_HP')]=0;v[L('ENEMY_MEMBER_STATE')]=0;
  const peer=v.slice(0x3d00,0x3e00);v.set([2,1],L('heavy_damage_request'));call(m,'heavy_damage_publish');
  assert.deepEqual(v.slice(0x3d00,0x3e00),peer);assert.equal(v[L('M3H_DAMAGE_STAGE')],0);
  v[L('M3H_DAMAGED_BODY_BUFFER')+31]=0x5a;
  v.set([0,2],L('heavy_damage_request'));call(m,'heavy_damage_publish');
  assert.equal(v[L('M3H_DAMAGED_BODY_BUFFER')+31],0x5a,'later stage must not re-copy source');
  call(m,'reset_enemy');assert.equal(v[L('M3H_BODY_FLAGS')],0);
  assert.deepEqual([...v.slice(L('M3H_DAMAGE_STAGE'),L('M3H_RENDER_STATE_END'))],[0,0,0,0,0,0]);
});

test('H12 review build holds the preselected stages through flight, hold, dodge and retirement',
  {skip:!process.env.VS65_HARNESS_BUILD?.startsWith('heavy-damage-review')},()=>{
  const generated=compileHeavyDamage();
  for(const shape of [0,2])for(const difficulty of [0,1,2]) {
    const m=formation(shape,{difficulty}),v=m.memory,source=generated.stages[shape===2?1:0];
    assert.deepEqual([...v.slice(L('M3H_DAMAGE_STAGE'),L('M3H_DAMAGE_STAGE')+2)],[1,2]);
    v[L('_heavy_hold_row')]=40;v[L('_heavy_hold_left')]=v[L('_heavy_hold_left')+1]=64;
    let held=0,dodged=false;
    for(let f=0;f<1200&&v[L('ENEMY_LIVE_COUNT')];f++) {
      v[0x86]=f&255;
      if(!dodged&&v[L('ENEMY_Y')]===40) {v[L('ENEMY_HP')]--;dodged=true;}
      const oldY=v[L('ENEMY_Y')];call(m,'update_enemy');
      if(oldY===40&&v[L('ENEMY_Y')]===40)held++;
      for(const slot of [0,1])assert.deepEqual(v.slice(0x3d00+slot*256,0x3e00+slot*256),
        v[L('ENEMY_MEMBER_STATE')+slot]?plane(source[slot+1],v[L('ENEMY_Y')+slot]):new Uint8Array(256));
    }
    assert.ok(dodged&&held>=64);assert.equal(v[L('ENEMY_LIVE_COUNT')],0);
  }
});

test('H14 natural hit watches publish HP stages on both Heavy profiles and every difficulty',()=>{
  const generated=compileHeavyDamage();
  for(const shape of [0,2])for(const difficulty of [0,1,2]) {
    const m=formation(shape,{difficulty}),v=m.memory;
    v[L('ENEMY_Y')]=v[L('ENEMY_Y')+1]=72;
    v[L('_heavy_hold_row')]=72;v[L('_heavy_hold_left')]=v[L('_heavy_hold_left')+1]=64;
    for(const slot of [0,1])call(m,'draw_enemy_member',slot,255); // seed the current-Y planes before a hold
    const initial=v[L('ENEMY_HP')];
    for(let hp=initial-1;hp>=1;hp--) {
      // Collision-owned HP changes; the real member tick supplies the request.
      v[L('ENEMY_HP')]=v[L('ENEMY_HP')+1]=hp;call(m,'update_enemy');
      const requested=hp<=2?3:0;
      assert.equal(v[L('_heavy_breakup_pending')]&3,requested);
      const before=[v[L('ENEMY_Y')],v[L('ENEMY_Y')+1]];
      schedule(m);const event=call(m,'heavy_breakup_retry');
      const stage=hp<=2?3-hp:0;
      assert.deepEqual([...v.slice(L('M3H_DAMAGE_STAGE'),L('M3H_DAMAGE_STAGE')+2)],[stage,stage]);
      for(const slot of [0,1])assert.deepEqual(v.slice(0x3d00+slot*256,0x3e00+slot*256),
        plane(generated.stages[shape===2?1:0][stage],before[slot]));
      assert.equal(v[L('_heavy_breakup_pending')],0);
      console.log(JSON.stringify({event:'live-damage',shape,difficulty,hp,cycles:event.cycles}));
    }
    assert.equal(v[L('_heavy_damage_pending')],0,'old request byte remains reserved');
  }
});

test('H14 token denial then rotate retry coalesces both members by the third frame',()=>{
  for(const shape of [0,2]) {
    const m=formation(shape),v=m.memory;
    v[L('ENEMY_Y')]=v[L('ENEMY_Y')+1]=72;
    v[L('ENEMY_HP')]=v[L('ENEMY_HP')+1]=2;call(m,'update_enemy');
    const pmg=v.slice(0x3d00,0x3f00);
    schedule(m,{token:false});call(m,'heavy_breakup_retry');
    assert.equal(v[L('M3H_DAMAGE_RETRY')],1);assert.equal(v[L('_heavy_breakup_pending')],3);
    assert.deepEqual(v.slice(0x3d00,0x3f00),pmg);
    // A newer, lower HP supersedes the pending stage without another token.
    v[L('ENEMY_HP')+1]=1;
    schedule(m,{rotate:true,token:false});call(m,'heavy_breakup_retry');
    assert.equal(v[L('_heavy_breakup_pending')],3);assert.deepEqual(v.slice(0x3d00,0x3f00),pmg);
    schedule(m,{token:false});const forced=call(m,'heavy_breakup_retry');
    assert.deepEqual([...v.slice(L('M3H_DAMAGE_STAGE'),L('M3H_DAMAGE_STAGE')+2)],[1,2]);
    assert.equal(v[L('_heavy_breakup_pending')],0);assert.equal(v[L('M3H_DAMAGE_RETRY')],0);
    console.log(JSON.stringify({event:'forced-dual',shape,cycles:forced.cycles}));
  }
});

test('H14 first rotate denial leaves the token untouched and publishes on the next nonrotate',()=>{
  const m=formation(),v=m.memory;v[L('ENEMY_HP')]=1;call(m,'update_enemy');
  schedule(m,{rotate:true});call(m,'heavy_breakup_retry');
  assert.equal(v[L('_light_token')],1);assert.equal(v[L('M3H_DAMAGE_RETRY')],1);
  schedule(m,{token:false});call(m,'heavy_breakup_retry');assert.equal(v[L('M3H_DAMAGE_STAGE')],2);
});

test('H14 breakup retains priority and surviving requests, including the nonrotate deadline',()=>{
  const m=formation(2),v=m.memory;
  v[L('ENEMY_Y')]=v[L('ENEMY_Y')+1]=72;
  v[L('ENEMY_HP')]=v[L('ENEMY_HP')+1]=1;call(m,'update_enemy');
  v[L('ENEMY_HP')]=0;v[L('ENEMY_MEMBER_STATE')]=0;
  v[L('_heavy_breakup_pending')]|=0x80;
  schedule(m);call(m,'heavy_breakup_retry');
  assert.equal(v[L('_heavy_breakup_pending')],3,'breakup clear must preserve request bits');
  assert.equal(v[L('EFFECT_ACTIVE_COUNT')],5);
  assert.equal(v[L('M3H_DAMAGE_STAGE')+1],0,'death got the first event');
  schedule(m,{rotate:true,token:false});call(m,'heavy_breakup_retry');
  assert.equal(v[L('_heavy_breakup_pending')],2,'dead request pruned');
  schedule(m,{token:false});call(m,'heavy_breakup_retry');
  assert.equal(v[L('M3H_DAMAGE_STAGE')],0);assert.equal(v[L('M3H_DAMAGE_STAGE')+1],2);
});

test('H14 stale/dead/assault requests and invalid-home events drop safely; admission clears all damage',()=>{
  for(const scenario of ['dead','assault','invalid','boss-phase','already-applied']) {
    const m=formation(0,{armoured:scenario!=='assault'}),v=m.memory;
    v[L('ENEMY_HP')]=1;v[L('_heavy_breakup_pending')]=1;
    if(scenario==='dead')v[L('ENEMY_MEMBER_STATE')]=0;
    if(scenario==='invalid')v[0x86b3]=0;
    if(scenario==='boss-phase')v[L('game_state')]=7;
    if(scenario==='already-applied')v[L('M3H_DAMAGE_STAGE')]=2;
    const pmg=v.slice(0x3d00,0x3f00);schedule(m);call(m,'heavy_breakup_retry');
    assert.deepEqual(v.slice(0x3d00,0x3f00),pmg);assert.equal(v[L('_heavy_breakup_pending')],0);
    v[0x86b3]=1;v[L('game_state')]=6;v[L('_heavy_breakup_pending')]=3;
    call(m,'reset_enemy');assert.equal(v[L('_heavy_breakup_pending')],0);
    assert.equal(v[L('M3H_DAMAGE_RETRY')],0);
  }
});

test('H14 idle pending entry remains byte-exact LDY/BNE/RTS with zero added cycles',()=>{
  const m=formation(),v=m.memory,p=L('heavy_breakup_retry'),pending=L('_heavy_breakup_pending');
  assert.deepEqual([...v.slice(p,p+6)],[0xac,pending&255,pending>>8,0xd0,1,0x60]);
  v[pending]=0;assert.equal(call(m,'heavy_breakup_retry').cycles,12);
});
