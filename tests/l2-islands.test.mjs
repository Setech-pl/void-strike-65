import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {Nmos6502} from '../scripts/nmos6502.mjs';
import {installRuntimeSegments} from '../scripts/runtime-image.mjs';
import {parseViceLabels} from '../scripts/runtime-cycles.mjs';
import {compileLevel,levelSourcePath,defaultHullAsset} from '../scripts/level-compiler.mjs';
import {ISLAND_RECIPES} from '../scripts/l2-islands.mjs';
const root=process.cwd();const l=parseViceLabels(fs.readFileSync('build/void-strike-65.lbl','utf8'));const ol=parseViceLabels(fs.readFileSync('build/l2.lbl','utf8'));
function run(m,name,a=0,x=0){const c=new Nmos6502(m);c.a=a;c.x=x;c.push(127);c.push(254);c.pc=l.get(name)??ol.get(name)??name;for(let i=0;c.pc!==32767;i++){assert.ok(i<200000,String(name));c.step();}return c;}
function set(m,name,value){const at=l.get(name);assert.ok(Number.isInteger(at),name);m[at]=value;}
function coord(m,row){set(m,'corridor_phase',row&255);set(m,'CORRIDOR_PHASE_HI',row>>8);}
function memory(){const m=new Uint8Array(65536);installRuntimeSegments(m,root);m[0x80f6]=1;run(m,0x1912);run(m,'copy_charset');run(m,'publish_level_hull_style');return m;}

test('L2 islands: real level lookup, all row publications, cache hit/miss and both factions',()=>{
 const m=memory();let count=0;const colours=new Set();
 for(let d=0;d<3;d++){
  set(m,'DIFFICULTY_SETTING',d);set(m,'CAPITAL_SECTOR_STATE',2);
  for(let row=480;row<968;row++){
   coord(m,row);m[l.get('dst_ptr')]=0;m[l.get('dst_ptr')+1]=0x41;m.fill(0,0x4100,0x4128);
   run(m,'draw_hull_row');const chars=m.slice(0x4100,0x4128);
   const tag=m[0xad80+(row>>3)];
   const expected=Array(22).fill(0);
   if(tag){
    const v=tag-1,part=v&7,recipe=v>>4,base=v&8?198:59;
    const [left,right,edge,fill,motif,last]=ISLAND_RECIPES[recipe].parts[part];
    const start=20+Math.max(left,-(d+3)),end=20+Math.min(right,d+3);
    for(let col=start;col<end;col++)expected[col-9]=base+(col===start?edge:col===end-1?last:col===20?motif:fill);
    count++;colours.add(base);
   }
   assert.deepEqual([...chars.slice(9,31)],expected,`row ${row}, difficulty ${d}`);
   m.set(chars,l.get('PREPARED_HULL_ROW'));const key=l.get('PREPARED_HULL_ROW')+40;
   m[key]=row&255;m[key+1]=row>>8;m[key+2]=2;m[key+3]=112;set(m,'PLAYFIELD_ROW_LO',112);
   for(let miss=0;miss<2;miss++){
    if(miss)m[key]^=1; m[l.get('dst_ptr')]=0x28;m[l.get('dst_ptr')+1]=0x40;m.fill(0,0x4028,0x4050);
    run(m,'commit_prepared_hull_row');assert.deepEqual(m.slice(0x4028,0x4050),chars);
   }
  }
 }
 assert.equal(count,3*3*48);assert.deepEqual([...colours].sort((a,b)=>a-b),[59,198]);
});

test('L2 islands: nearest-side clamp, two HULL units, cooldown and every fine alignment',()=>{
 const m=memory();
 for(let d=0;d<3;d++)for(let row=576;row<624;row++)for(let fine=0;fine<8;fine++){
  const rows=Math.floor((fine+14)/8)+1;let left=255,right=0;
  for(let n=0;n<rows;n++){
   const tag=m[0xad80+((row-n)>>3)];if(!tag)continue;
   const v=tag-1,[a,b]=ISLAND_RECIPES[v>>4].parts[v&7];
   left=Math.min(left,128+4*Math.max(a,-(d+3)));right=Math.max(right,128+4*Math.min(b,d+3));
  }
  for(const x of [92,left-8,left-7,124,right-1,right,152]){
   if(x<84||x>164)continue;
   set(m,'DIFFICULTY_SETTING',d);set(m,'CAPITAL_SECTOR_STATE',2);set(m,'PLAYER_LIFECYCLE',0);
   coord(m,row+11);set(m,'player_y',96+fine);set(m,'player_x',x);
   m[0x4e6f]=28;m[0x4e5d]=10;m[0x4e5e]=0;set(m,'BROAD_DAMAGE_APPLIED',0);set(m,'ENTITY_ACTIVE_MASK',0);
   const hit=right&&x<right&&x+7>=left;
   const expected=hit?(right-x<x+8-left?right:left-8):x;
   run(m,'handle_player_hull_contact');assert.equal(m[l.get('player_x')],expected);
   assert.equal(m[0x4e5d],hit?8:10);if(hit){assert.equal(m[0x4e5e],25);set(m,'player_x',x);set(m,'BROAD_DAMAGE_APPLIED',0);run(m,'handle_player_hull_contact');assert.equal(m[0x4e5d],8);assert.equal(m[l.get('player_x')],expected);}
  }
 }
});

test('L2 island authoring rejects unsafe/unknown placements and keeps SPACE debris',()=>{
 const src=()=>JSON.parse(fs.readFileSync(levelSourcePath(1)));
 const compile=s=>compileLevel(s,{hullAsset:defaultHullAsset()});
 for(const spec of [{pattern:'wrong'},{pattern:'salvage',firstRow:48},{pattern:'salvage',spacingRows:48},{pattern:'salvage',surprise:1}]){
  const s=src();s.sectors[1].islands=spec;assert.throws(()=>compile(s));
 }
 const s=src();const before=s.sectors.filter(x=>x.kind==='space').map(x=>x.hazards?.debris??0);
 const c=compile(s);assert.deepEqual(c.sectors.filter(x=>x.kind===0).map(x=>x.debris),before);
 s.sectors[1].hazards.debris=1;assert.throws(()=>compile(s),/capital hazards.debris/);
 const sparse=src();sparse.sectors[1].islands.density='sparse';assert.equal(compile(sparse).pages.islands[2],2);
});
