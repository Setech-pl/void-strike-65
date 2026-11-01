import test from 'node:test';
import assert from 'node:assert/strict';
import {compileLevel,compileLevelFile,defaultHullAsset} from '../scripts/level-compiler.mjs';
import {expandWaveChains,pathLifetime} from '../scripts/wave-chains.mjs';
import {encodeWavePath} from '../scripts/wave-paths.mjs';
const base=()=>({level:2,hull:{length:1,turrets:3},chains:{lesson:[
 {row:0,path:'straight',count:2},{row:64,path:'snake',mirror:true,count:3},
 {row:128,path:'tracking-dive',fire:'volley-column',count:3},{row:192,path:'dive-return',count:1}]},
 sectors:[{kind:'space',subtype:'swarm',rows:768,lights:3,archetypes:['wingman'],waves:[{chain:'lesson',row:0,with:{archetype:'wingman',spacing:24,entry:124}}]}]});
const compile=s=>compileLevel(s,{hullAsset:defaultHullAsset(),file:'chain-test.json'});
test('M3 chains compile byte-identically to explicit waves without mutating source',()=>{
 const s=base(),old=structuredClone(s),expanded=expandWaveChains(s),a=compile(s),b=compile({...s,chains:undefined,sectors:expanded.source.sectors});
 assert.deepEqual(s,old);assert.deepEqual(a.core,b.core);assert.deepEqual(a.payload,b.payload);
 assert.equal(a.chainExpansions[0].count,4);assert.equal(a.waves.length,4);
 assert.equal(a.timeline[0].waves[0].lifetimeFrames,232);
 assert.ok(a.timeline[0].difficulties.every(d=>d.rows.every(r=>!r.mayCutAtSectorEnd)));
});
test('M3 chain expansion never truncates limit overflow and rejects nested/unknown/malformed recipes',()=>{
 const s=base();s.chains.lesson=Array.from({length:21},(_,i)=>({row:i*8,path:'straight'}));assert.throws(()=>compile(s),/chain/);
 for(const mutate of [s=>s.sectors[0].waves[0].chain='missing',s=>s.chains.lesson[0]={chain:'lesson'},s=>s.sectors[0].waves[0].with.row=8,s=>s.chains.lesson[0].row=3]){
  const s=base();mutate(s);assert.throws(()=>compile(s),/chain/);
 }
 const many=base();many.sectors[0].waves=Array.from({length:6},(_,i)=>({chain:'lesson',row:i*8,with:{archetype:'wingman',spacing:24,entry:124}}));assert.throws(()=>compile(many),/20|twenty/);
});
test('M3 timeline exposes late no-fire completion and distinguishes unmodeled Heavy lifetime',()=>{
 const s=base();s.sectors[0].rows=256;const c=compile(s);
 assert.ok(c.warnings.some(w=>w.includes('no-fire model may cut')));
 const pilot=compileLevelFile('assets/levels/level-02.json');assert.equal(pilot.waves.length,20);
 assert.equal(pilot.chainExpansions[0].name,'teach-mirror-pressure-release');
 assert.ok(pilot.timeline[3].difficulties.every(d=>d.rows.every(r=>!r.mayCutAtSectorEnd)));
 assert.ok(pilot.timeline[3].difficulties.every(d=>d.rows.slice(1).every(r=>r.immediateKillIdleFrames===0)),'fast kills introduce no authored inter-wave wait');
 assert.equal(pilot.timeline[1].difficulties[0].rows[0].finishFrame,null);
});
test('M3 path lifetimes include upward exit, terminal and progressing loops',()=>{
 assert.equal(pathLifetime(encodeWavePath('straight'),0),232);
 assert.equal(pathLifetime(encodeWavePath('dive-return'),0),105);
 assert.ok(pathLifetime(encodeWavePath('finite-loop'),0)>1000);
});
test('M3 pilot preserves every decoded Heavy WaveDef from accepted checkpoint3',async()=>{
 const {createHash}=await import('node:crypto');
 const h=compileLevelFile('assets/levels/level-02.json').waves.filter(w=>w.class==='heavy')
  .map(w=>[w.sector,w.row,w.flags,w.count,w.spacing,w.entry,w.archetypeOffset,w.escortOffset,w.motion]);
 assert.equal(createHash('sha256').update(JSON.stringify(h)).digest('hex'),
  '6ed7fd6deb3a8adbd83615725f8dc3096612cba02b9d18eeaec6a52fd8399661');
});
