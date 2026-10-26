import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {Nmos6502} from '../scripts/nmos6502.mjs';
import {installRuntimeSegments} from '../scripts/runtime-image.mjs';
import {parseViceLabels} from '../scripts/runtime-cycles.mjs';
import {compileLevel,levelSourcePath,defaultHullAsset} from '../scripts/level-compiler.mjs';
import {ISLAND_RECIPES,islandRecipeBytes} from '../scripts/l2-islands.mjs';
const root=process.cwd();const l=parseViceLabels(fs.readFileSync('build/void-strike-65.lbl','utf8'));const ol=parseViceLabels(fs.readFileSync('build/l2.lbl','utf8'));
function run(m,name,a=0,x=0){const c=new Nmos6502(m);c.a=a;c.x=x;c.push(127);c.push(254);c.pc=l.get(name)??ol.get(name)??name;for(let i=0;c.pc!==32767;i++){assert.ok(i<200000,String(name));c.step();}return c;}
function set(m,name,value){const at=l.get(name);assert.ok(Number.isInteger(at),name);m[at]=value;}
function coord(m,row){set(m,'corridor_phase',row&255);set(m,'CORRIDOR_PHASE_HI',row>>8);}
const protectedRanges=[[0x0c00,0x1180],[0x0500,0x0c00],[0x3615,0x3aef],[0x549e,0x54be],[0xb8fb,0xb900],[0x1f00,0x2000]];
const protectedSnapshot=m=>protectedRanges.flatMap(([s,e])=>[...m.slice(s,e)]);
function memory(){const m=new Uint8Array(65536);installRuntimeSegments(m,root);m[0x80f6]=1;run(m,0x1912);run(m,'copy_charset');run(m,'publish_level_hull_style');return m;}

test('L2 islands: real level lookup, all row publications, cache hit/miss and both factions',()=>{
 const m=memory();let count=0,maxRowCpu=0;const colours=new Set(),protectedBefore=protectedSnapshot(m);
 for(let d=0;d<3;d++){
  set(m,'DIFFICULTY_SETTING',d);set(m,'CAPITAL_SECTOR_STATE',2);
  for(let row=480;row<968;row++){
   coord(m,row);m[l.get('dst_ptr')]=0;m[l.get('dst_ptr')+1]=0x41;m.fill(0,0x4100,0x4128);
   maxRowCpu=Math.max(maxRowCpu,run(m,'draw_hull_row').cycles);const chars=m.slice(0x4100,0x4128);
   const tag=m[0xad80+(row>>3)];
   const expected=Array(22).fill(0);
   if(tag){
    const v=tag-1,part=v&7,recipe=(v>>4)&3,base=v&8?198:59;
    const [left,right,edge,fill,motif,last]=ISLAND_RECIPES[recipe].parts[part];
    const raw=m[0xad04+(v>>6)],shift=(raw>127?raw-256:raw)/4;
    const start=20+shift+Math.max(left,-(d+3)),end=20+shift+Math.min(right,d+3);
    for(let col=start;col<end;col++)expected[col-9]=base+(col===start?edge:col===end-1?last:col===20+shift?motif:fill);
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
 assert.deepEqual(protectedSnapshot(m),protectedBefore,"row publication changed protected bytes");
 console.log(JSON.stringify({measurement:"row CPU including shared renderer",maximum:maxRowCpu}));
 assert.equal(count,3*3*48);assert.deepEqual([...colours].sort((a,b)=>a-b),[59,198]);
});

test('L2 islands: visible-width clamp, two HULL units, cooldown and every fine alignment',()=>{
 const m=memory(),protectedBefore=protectedSnapshot(m);let maxContactCpu=0;
 // Flat plate interiors isolate damage policy from the separately exhaustive
 // pixel oracle. Both no-contact lanes fit the full drawn 16-HPOS sprite.
 for(let d=0;d<3;d++)for(let fine=0;fine<8;fine++)for(const x of [92,124,148]){
  const hit=x===124,right=140+4*d;
  set(m,'DIFFICULTY_SETTING',d);set(m,'CAPITAL_SECTOR_STATE',2);set(m,'PLAYER_LIFECYCLE',0);
  coord(m,611);set(m,'player_y',96+fine);set(m,'player_x',x);
  m[0x4e6f]=28;m[0x4e5d]=10;m[0x4e5e]=0;set(m,'BROAD_DAMAGE_APPLIED',0);set(m,'ENTITY_ACTIVE_MASK',0);
  maxContactCpu=Math.max(maxContactCpu,run(m,'handle_player_hull_contact').cycles);
  assert.equal(m[l.get('player_x')],hit?right:x);
  assert.equal(m[0x4e5d],hit?8:10);
  if(hit){
   assert.equal(m[0x4e5e],25);
   set(m,'player_x',x);set(m,'BROAD_DAMAGE_APPLIED',0);run(m,'handle_player_hull_contact');assert.equal(m[0x4e5d],8);
   m[0x4e5e]=0;set(m,'player_x',x);set(m,'BROAD_DAMAGE_APPLIED',1);run(m,'handle_player_hull_contact');assert.equal(m[0x4e5d],8,'one-event latch');
   set(m,'player_x',x);set(m,'BROAD_DAMAGE_APPLIED',0);run(m,'handle_player_hull_contact');assert.equal(m[0x4e5d],6,'expired cooldown permits canonical damage');
  }
 }
 assert.deepEqual(protectedSnapshot(m),protectedBefore,'contact changed protected bytes');
 console.log(JSON.stringify({measurement:'contact CPU including canonical damage',maximum:maxContactCpu}));
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
 const sparse=src();sparse.sectors[1].islands={pattern:'salvage',density:'sparse'};assert.equal(compile(sparse).pages.islands[2],2);
});

// Shield blocks damage through the canonical policy; contact still displaces.
test('L2 contact retains Shield and dying/respawning lifecycle policy',()=>{
 const m=memory();set(m,'CAPITAL_SECTOR_STATE',2);set(m,'DIFFICULTY_SETTING',2);coord(m,615);set(m,'player_y',96);m[0x4e6f]=28;
 for(const lifecycle of [0,1,2,3]){
  set(m,'PLAYER_LIFECYCLE',lifecycle);set(m,'player_x',124);m[0x4e5d]=10;m[0x4e5e]=0;set(m,'BROAD_DAMAGE_APPLIED',0);
  const generated=fs.readFileSync('build/entity-effects.inc','utf8');
  const constant=n=>Number(new RegExp(`^${n} = (\\d+)$`,'m').exec(generated)?.[1]);
  const shield=constant('WEAPON_PICKUP_STATE_SHIELD'),slot=constant('WEAPON_BOOSTER_SLOT');
  assert.ok(Number.isInteger(shield)&&Number.isInteger(slot));
  m.fill(0,l.get('ENTITY_STATE'),l.get('ENTITY_STATE')+4);m[l.get('ENTITY_STATE')+slot]=shield;
  run(m,'handle_player_hull_contact');assert.equal(m[0x4e5d],10,'Shield/lifecycle must retain HULL');
  if(lifecycle===0)assert.notEqual(m[l.get('player_x')],124,'active Shield still meets solid island');
 }
});

test('L2 recipes reject fractional or nonnumeric interval endpoints instead of dropping coordinate bits',()=>{
 const part=ISLAND_RECIPES[0].parts[0],old=[...part];
 try { for(const value of [0.5,'bad',null,NaN]) {part[0]=value;assert.throws(()=>islandRecipeBytes(),/Invalid L2 recipe/);} }
 finally {part.splice(0,part.length,...old);}
 assert.equal(islandRecipeBytes().length,108);
});
