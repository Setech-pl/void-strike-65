import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileLevel,compileLevelFile,levelSourcePath,defaultHullAsset} from '../scripts/level-compiler.mjs';
import {compileCapitalHulls} from '../scripts/capital-hulls.mjs';
import {installRuntimeSegments} from '../scripts/runtime-image.mjs';
import {Nmos6502} from '../scripts/nmos6502.mjs';
const root=process.cwd();
const source=()=>JSON.parse(fs.readFileSync(levelSourcePath(1)));
function call(memory,address,a=0,x=0){const c=new Nmos6502(memory);c.a=a;c.x=x;c.push(0x7f);c.push(0xfe);c.pc=address;for(let i=0;c.pc!==0x7fff;i++){assert.ok(i<100000);c.step();}return c;}

test('L2 coordinates: 16-bit entry and every phase boundary through maximum drain',()=>{
 const memory=new Uint8Array(65536);installRuntimeSegments(memory,root);let maxEntryCpu=0,maxPhaseCpu=0;
 for(const rows of [288,352,480,512,720,960]){
  const s=source();s.hull={rows,turrets:3};const level=compileLevel(s,{hullAsset:defaultHullAsset()});
  memory.set(level.pages.geometry,0xac00);memory.set(level.pages.islands,0xad00);memory[0x4ea5]=0;maxEntryCpu=Math.max(maxEntryCpu,call(memory,0x1912).cycles);
  const first=960-rows;assert.equal(memory[0x8c]|memory[0x85ef]<<8,first);
  for(let row=first;row<990;row++){
   memory[0x8c]=row&255;memory[0x85ef]=row>>8;maxPhaseCpu=Math.max(maxPhaseCpu,call(memory,0x190f).cycles);
   const module=row>>3;const phase=level.geometry.phaseStarts.findIndex(v=>module<v);
   const expected=module>=121?5:phase<0?4:phase;
   assert.equal(memory[0x4ea5],expected,`${rows} rows at coordinate ${row}`);
  }
 }
 console.log(JSON.stringify({measurement:"L2 coordinate CPU",maxEntryCpu,maxPhaseCpu}));
});

test('L2 compiler: scalable nested stations and finite sequence tables',()=>{
 for(const [rows,expected] of [[352,[7,10,14]],[480,[10,15,20]],[960,[22,33,44]]]){
  const asset=compileCapitalHulls(defaultHullAsset().definition,{combatRows:rows-224});
  assert.deepEqual(Object.values(asset.sector.turretCounts),expected);
  for(const side of ['allied','enemy']){
   const sets=asset.sector.cannonModuleIndicesByDifficulty.get(side);
   for(const [difficulty,count] of Object.entries(asset.sector.turretCounts)){
    const values=sets.get(difficulty);assert.equal(values.length,count);
    for(let i=1;i<values.length;i++){
     assert.ok((values[i]-values[i-1])*8>=16);
     assert.ok((values[i]-values[i-1])*8<=asset.sector.maximumTurretGapRows[difficulty]);
    }
   }
   assert.ok(sets.get('easy').every(v=>sets.get('medium').includes(v)));
   assert.ok(sets.get('medium').every(v=>sets.get('hard').includes(v)));
  }
  const s=source();s.hull={rows,turrets:3};const level=compileLevel(s,{hullAsset:defaultHullAsset()});
  assert.equal(level.pages.geometry.length,256);
  assert.equal(level.geometry.drainModule,121);
  assert.equal(level.geometry.firstRow,960-rows);
 }
 for(const rows of [0,287,289,961,968,65536]){
  const s=source();s.hull={rows,turrets:3};assert.throws(()=>compileLevel(s,{hullAsset:defaultHullAsset()}));
 }
 assert.equal(compileLevelFile(levelSourcePath(1)).hull.rows,480);
});
