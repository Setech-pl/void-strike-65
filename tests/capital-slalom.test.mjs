import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {compileLevel,defaultHullAsset,levelSourcePath} from '../scripts/level-compiler.mjs';
import {Nmos6502} from '../scripts/nmos6502.mjs';
import {installRuntimeSegments} from '../scripts/runtime-image.mjs';
import {parseViceLabels} from '../scripts/runtime-cycles.mjs';
import {ISLAND_RECIPES} from '../scripts/l2-islands.mjs';
const source=()=>JSON.parse(fs.readFileSync(levelSourcePath(1),'utf8'));
test('slalom schema rejects unknown enum, fields, and conflicting manual overrides',()=>{
 const asset=defaultHullAsset();
 for(const spec of [{pattern:'slalom-wrong'},{pattern:'slalom',x:4},{pattern:'slalom',density:'sparse'},{pattern:'slalom-tight',firstRow:64}]){
  const s=source();s.sectors.find(x=>x.kind==='capital').islands=spec;assert.throws(()=>compileLevel(s,{hullAsset:asset}));
 }
});
test('shifted row publication matches authored intervals and motifs; real pixels block every straight 20-HPOS band',()=>{
 const l=parseViceLabels(fs.readFileSync('build/void-strike-65.lbl','utf8')),o=parseViceLabels(fs.readFileSync('build/l2.lbl','utf8'));
 const m=new Uint8Array(65536);installRuntimeSegments(m,process.cwd());
 const at=n=>l.get(n)??o.get(n),set=(n,v)=>m[at(n)]=v;
 function run(n){const c=new Nmos6502(m);c.push(127);c.push(254);c.pc=at(n);for(let i=0;c.pc!==32767;i++){assert.ok(i<200000);c.step();}}
 run('copy_charset');run('publish_level_hull_style');
 let publications=0;
 for(const offset of [20,16])for(let d=0;d<3;d++){
  const masks=[];
  for(const shift of [-offset,offset])for(let design=0;design<3;design++)for(let faction=0;faction<2;faction++){
   const union=new Set();masks.push({shift,union});
   set('DIFFICULTY_SETTING',d);m[0xad05]=shift&255;m.fill(0,0xad80,0xadf8);
   for(let part=0;part<6;part++)m[0xad80+72+part]=65+(design<<4)+(faction<<3)+part;
   for(let part=0;part<6;part++){
    const row=576+part*8;set('corridor_phase',row&255);set('CORRIDOR_PHASE_HI',row>>8);set('dst_ptr',0);m[at('dst_ptr')+1]=0x41;
    run('draw_hull_row');const [left,right,edge,fill,motif,last]=ISLAND_RECIPES[design].parts[part];
    const a=20+shift/4+Math.max(left,-(d+3)),b=20+shift/4+Math.min(right,d+3),base=faction?198:59;
    const expected=Array(22).fill(0);
    for(let col=a;col<b;col++)expected[col-9]=base+(col===a?edge:col===b-1?last:col===20+shift/4?motif:fill);
    assert.deepEqual([...m.slice(0x4109,0x411f)],expected);publications++;
    // One plate part suffices even on the 24-row short fragments. Decode
    // actual published glyphs, independently of interval geometry.
    if(part===2)for(let col=9;col<31;col++){
     const code=m[0x4100+col];if(!code)continue;
     for(let line=0;line<8;line++){const bits=m[at('CHARSET')+(code&127)*8+line];for(let p=0;p<4;p++)if(bits&(0xc0>>(2*p)))union.add(48+4*col+p);}
    }
   }
  }
  for(const left of masks.filter(x=>x.shift<0))for(const right of masks.filter(x=>x.shift>0))for(let start=84;start+20<=172;start++)assert.ok(Array.from({length:20},(_,i)=>start+i).some(x=>left.union.has(x)||right.union.has(x)),`straight raster band at ${start}, offset ${offset}, difficulty ${d}`);
 }
 assert.equal(publications,432);
});
