import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileLevel,defaultHullAsset} from '../scripts/level-compiler.mjs';
import {m3TempoSource} from '../scripts/m3-tempo.mjs';
const source=()=>JSON.parse(fs.readFileSync(new URL('../assets/levels/level-02.json',import.meta.url)));
const compile=s=>compileLevel(s,{hullAsset:defaultHullAsset(),file:'m3-tempo-test'});
test('M3 tempo variants preserve all groups, mirrored entries, Heavy definitions and four-slot ceiling',()=>{
 const normal=source(),baseline=compile(normal),old=structuredClone(normal);
 const heavy=c=>c.waves.filter(w=>w.class==='heavy');
 for(const tempo of ['easy','normal','hard']) {
  const s=m3TempoSource(normal,tempo),c=compile(s);
  assert.deepEqual(heavy(c),heavy(baseline));
  assert.equal(c.waves.length,20);
  for(const index of [0,3]) {
   assert.equal(s.sectors[index].lights,4);
   assert.ok(c.timeline[index].difficulties.every(d=>d.rows.every(r=>!r.mayCutAtSectorEnd)),`${tempo}: no group cut by sector clock`);
   assert.ok(c.timeline[index].difficulties.every(d=>d.rows.slice(1).every(r=>r.immediateKillIdleFrames===0)),`${tempo}: back-to-back groups`);
  }
  assert.deepEqual(s.chains,normal.chains);
  assert.deepEqual(s.sectors.map(x=>x.waves),normal.sectors.map(x=>x.waves));
 }
 assert.deepEqual(normal,old,'build-time selection leaves source intact');
 const l1={level:1,sectors:[]};assert.equal(m3TempoSource(l1,'easy'),l1);
 assert.throws(()=>m3TempoSource(normal,'unknown'),/tempo/);
});
test('M3 EASY is slower than NORMAL laterally; NORMAL halves wide sweeps and uses single-line vertical motion',()=>{
 const normal=source(),easy=m3TempoSource(normal,'easy'),hard=m3TempoSource(normal,'hard');
 for(const name of ['wide-west','wide-east','wide-cross','wide-return']) {
  const active=s=>s.payload.paths[name].filter(p=>(p.flags&12)!==0);
  assert.ok(active(normal).every(p=>(p.flags&3)===1));
  assert.ok(active(easy).every(p=>(p.flags&3)===3));
  assert.ok(active(hard).some(p=>(p.flags&3)===0));
 }
 for(const s of [easy,normal])for(const path of Object.values(s.payload.paths))assert.ok(path.every(p=>Math.abs(p.dy)<=1));
 for(const name of ['wide-track','tracking-dive'])assert.ok(normal.payload.paths[name].filter(p=>p.flags&12).every(p=>(p.flags&3)===3));
});
