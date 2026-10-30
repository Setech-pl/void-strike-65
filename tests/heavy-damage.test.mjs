import assert from 'node:assert/strict';
import test from 'node:test';
import {compileHeavyDamage,damageSource} from '../scripts/heavy-damage.mjs';
import {machine,L,run} from '../scripts/measure-population-harness.mjs';

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
