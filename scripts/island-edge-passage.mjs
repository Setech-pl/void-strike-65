// All finite rows and eight relative glyph phases, with the real published art.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {Nmos6502} from './nmos6502.mjs';import {installRuntimeSegments} from './runtime-image.mjs';
import {parseViceLabels} from './runtime-cycles.mjs';
import {compileLevel,levelSourcePath,defaultHullAsset} from './level-compiler.mjs';
export function passage(output='docs/diagnostics/island-edge/passage.json'){
 const l=parseViceLabels(fs.readFileSync('build/void-strike-65.lbl','utf8')),o=parseViceLabels(fs.readFileSync('build/l2.lbl','utf8'));
 const at=n=>{const a=l.get(n)??o.get(n);assert.ok(Number.isInteger(a),n);return a;};
 const m=new Uint8Array(65536);installRuntimeSegments(m,process.cwd());
 const set=(n,v)=>m[at(n)]=v;const coord=r=>{set('corridor_phase',r&255);set('CORRIDOR_PHASE_HI',r>>>8);};
 const run=n=>{const c=new Nmos6502(m);c.push(127);c.push(254);c.pc=at(n);for(let i=0;c.pc!==32767;i++){assert.ok(i<20000,n);c.step();}};
 run('copy_charset');run('publish_level_hull_style');
 const shape=[...m.slice(at('player_shape'),at('player_shape')+15)],records=[];
 for(const length of [480,960]){
  const s=JSON.parse(fs.readFileSync(levelSourcePath(1)));s.hull={rows:length,turrets:3};const level=compileLevel(s,{hullAsset:defaultHullAsset()});
  m.set(level.pages.geometry,0xac00);m.set(level.pages.islands,0xad00);m[0x80f6]=1;run('l2_enter');
  const first=960-length;
  for(let difficulty=0;difficulty<3;difficulty++){
   set('DIFFICULTY_SETTING',difficulty);set('CAPITAL_SECTOR_STATE',2);m[0x4e6f]=28;
   const rows=new Map();
   for(let source=first-2;source<972;source++){
    coord(source<0?65535:source);m[at('dst_ptr')]=0;m[at('dst_ptr')+1]=0x41;run('draw_hull_row');
    rows.set(source,Array.from({length:8},(_,y)=>{
     const solid=new Set();for(let col=0;col<40;col++){
      const code=m[0x4100+col];if(!code)continue;
      const bits=m[at('CHARSET')+(code&127)*8+y];for(let p=0;p<4;p++)if((bits>>(6-p*2))&3){solid.add(96+col*8+p*2);solid.add(97+col*8+p*2);}
     }return solid;
    }));
   }
   let checks=0,minLeft=Infinity,minRight=Infinity;
   for(let source=first;source<970;source++)for(let fine=0;fine<8;fine++){
    let hullLeft=168,hullRight=344,islandLeft=Infinity,islandRight=-Infinity;
    for(let dy=0;dy<15;dy++){
     const solid=rows.get(source-Math.floor((fine+dy)/8))[(fine+dy)&7];
     for(const px of solid){if(px<168)hullLeft=Math.max(hullLeft,px+1);else if(px>=344)hullRight=Math.min(hullRight,px);else{islandLeft=Math.min(islandLeft,px);islandRight=Math.max(islandRight,px+1);}}
     for(const x of [92,148])for(let bit=0;bit<8;bit++)if(shape[dy]&(128>>bit))for(let p=0;p<4;p++)assert.ok(!solid.has(x*2+bit*4+p),`passage ${length}/${difficulty}/${source}/${fine}/${x}/${dy}`);
    }
    if(Number.isFinite(islandLeft)){minLeft=Math.min(minLeft,(islandLeft-hullLeft)/2);minRight=Math.min(minRight,(hullRight-islandRight)/2);}
    coord(source+11);set('player_y',96+fine);set('PLAYER_LIFECYCLE',0);set('BROAD_DAMAGE_COOLDOWN',0);set('ENTITY_ACTIVE_MASK',0);
    for(const x of [92,148]){set('player_x',x);m[0x4e5d]=10;set('BROAD_DAMAGE_APPLIED',0);run('handle_player_hull_contact');assert.equal(m[0x4e5d],10,'side lane damage');assert.equal(m[at('player_x')],x,'side lane displacement');checks++;}
   }
   records.push({length,difficulty,checks,minLeftHpos:minLeft,minRightHpos:minRight,shipWidthHpos:16,leftLaneHpos:92,rightLaneHpos:148,fire:false});
  }
 }
 const result={measurement:'MEASURED raster oracle and linked NMOS6502',pass:true,easyClearableWithoutFiring:true,records};fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(result);return result;
}
if(process.argv[1]===new URL(import.meta.url).pathname)passage(process.argv[2]);
