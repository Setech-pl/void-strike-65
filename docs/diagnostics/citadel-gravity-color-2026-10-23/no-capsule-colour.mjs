// Run from the repository after a normal build. No production edits.
import assert from 'node:assert/strict';
import {runBossEntry,label,call} from '../../../tests/boss-harness.mjs';
const rows=[];
for (const type of [0,1,2,3]) {
  const r=runBossEntry({prepare(m){
    m[0xa603]=4;
    m[label('main','ENTITY_TYPE')+1]=type;
    m[label('main','ENTITY_STATE')+1]=0;
  }});
  assert.equal(r.end,'main_loop');
  const m=r.memory;
  const colours=[];
  for(let frame=0;frame<3;frame++) {
    call(m,label('main','render_shared_fighter_explosions'));
    call(m,label('kernel','life_colour'));
    colours.push(m[0xd015]);
  }
  assert.equal(m[label('main','ENTITY_STATE')+1],0);
  assert.deepEqual(colours,Array(3).fill(type===3?0xac:0x1c));
  rows.push({typeBefore:type,typeAfter:m[label('main','ENTITY_TYPE')+1],
    capsuleState:0,capitalState:m[label('main','CAPITAL_SECTOR_STATE')],colpm3:colours});
}
console.log(JSON.stringify({scope:'Baseline 6dae5a6 game bytes; real Citadel entry, isolated per-frame colour publication; not a PAL stress measurement',rows},null,2));
