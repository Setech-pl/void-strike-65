import assert from 'node:assert/strict';
import test from 'node:test';
import {heavySmokeLevelSource} from '../scripts/heavy-smoke-level.mjs';
import {compileLevel,loadLevelSource,levelSourcePath,WAVE_ARRAY_OFFSET,defaultHullAsset} from '../scripts/level-compiler.mjs';

test('only the Heavy shortcut changes one wave kind; campaign data and pacing stay exact',()=>{
  const source=loadLevelSource(levelSourcePath(2)), original=structuredClone(source);
  const smoke=heavySmokeLevelSource(source,2,5);
  assert.deepEqual(source,original,'campaign source never mutated');
  for(const [level,sector] of [[1,5],[2,0],[2,4],[2,undefined]])
    assert.equal(heavySmokeLevelSource(source,level,sector),source);
  const options={hullAsset:defaultHullAsset()};
  const campaign=compileLevel(source,options),shortcut=compileLevel(smoke,options);
  const changed=[...campaign.core.keys()].filter(i=>campaign.core[i]!==shortcut.core[i]);
  const first=campaign.sectors[5].waveFirst;
  assert.deepEqual(changed,[WAVE_ARRAY_OFFSET.flags+first]);
  assert.equal(campaign.core[changed[0]]&0x20,0);
  assert.equal(shortcut.core[changed[0]],campaign.core[changed[0]]|0x20);
  assert.deepEqual(shortcut.payload,campaign.payload);
  assert.deepEqual(shortcut.geometry,campaign.geometry);
});
