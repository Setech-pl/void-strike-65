import assert from 'node:assert/strict';
import test from 'node:test';
import {runBossEntry,label,call,bossLevel} from './boss-harness.mjs';

const main=n=>label('main',n), boss=n=>label('boss',n);
test('Citadel normalizes stale LIFE once before its first visible M3 column',()=>{
 const entry=runBossEntry({prepare(m){
  m[0xa603]=bossLevel(4);
  m[main('ENTITY_TYPE')+1]=3;
  m[main('ENTITY_STATE')+1]=0;
 }});
 assert.equal(entry.end,'main_loop');
 const m=entry.memory;
 const hp=boss('boss_m0_publish'); // Stable shared disk ABI; patched only in Citadel RAM.
 assert.equal(m[hp+4],4);
 assert.equal(m[boss('boss_m0_hpos')],0,'column hidden before initialization');
 const ordinary=Uint8Array.from(m);
 ordinary[boss('gravity_hooks')+1]=boss('gravity_frame')&255;
 ordinary[boss('gravity_hooks')+2]=boss('gravity_frame')>>8;
 const baselineCycles=call(ordinary,boss('gravity_hooks')).cycles;
 const initCycles=call(m,boss('gravity_hooks')).cycles;
 assert.equal(initCycles-baselineCycles,27,'one-time overhead only');
 for(const [offset,operand] of [[7,1],[12,2]]) {
   const pc=boss('gravity_init')+offset;
   assert.equal(m[pc],0x8d,'trace observer names the exact STA');
   assert.equal(m[pc+1]|m[pc+2]<<8,boss('gravity_hooks')+operand);
 }
 assert.equal(m[main('ENTITY_TYPE')+1],0);
 assert.equal(m[hp+4],7,'publisher now addresses HPOSM3');
 assert.equal(m[boss('gravity_hooks')+1]|m[boss('gravity_hooks')+2]<<8,boss('gravity_frame'));
 call(m,main('render_shared_fighter_explosions'));
 m[0xd012]=0xd8;
 call(m,label('kernel','life_colour'));
 assert.equal(m[0xd015],0x1c,'gold without a capsule after preceding LIFE');
 assert.equal(m[0xd012],0xd8,'green ship unchanged');
 m[main('ENTITY_TYPE')+1]=2;
 call(m,boss('gravity_hooks'));
 assert.equal(m[main('ENTITY_TYPE')+1],2,'later frames do not reset a capsule type');
 m[boss('boss_m0_hpos')]=100;
 m[0xd004]=0;
 call(m,hp);
 assert.equal(m[0xd007],100);
 assert.equal(m[0xd004],0,'M0 remains hidden');
 m[boss('gravity_on')]=1;
 m[boss('boss_frame_heavy')]=1;
 m[boss('boss_laser_sizem')]=0x3c;
 call(m,boss('gravity_late'));
 assert.equal(m[boss('boss_laser_sizem')],0xfc,'quad M3 preserves laser size bits');
});
