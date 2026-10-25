import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Nmos6502} from './nmos6502.mjs';
import {installRuntimeSegments} from './runtime-image.mjs';
import {parseViceLabels} from './runtime-cycles.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'docs/diagnostics/spike-nacelles/p5');
function image(dir){let m=new Uint8Array(65536);installRuntimeSegments(m,root,dir);let l=parseViceLabels(fs.readFileSync(path.join(dir,'void-strike-65.lbl'),'utf8'));return{m,l};}
function set(i,n,v){assert.ok(i.l.has(n),n);i.m[i.l.get(n)]=v;}
function word(i,n,v){set(i,n,v&255);i.m[i.l.get(n)+1]=(v>>>8)&255;}
function run(i,n,a=0,x=0,y=0){let c=new Nmos6502(i.m);c.a=a;c.x=x;c.y=y;c.push(127);c.push(254);c.pc=i.l.get(n);assert.ok(c.pc,n);for(let s=0;c.pc!==32767&&s<150000;s++)c.step();assert.equal(c.pc,32767,n);return c.cycles;}
let p=image(path.join(root,'build/spike-nacelles-p5')),b=image(path.join(root,'build'));
for(let i of[p,b]){run(i,'copy_charset');run(i,'publish_level_hull_style');}
function state(i,row,fine,x,d){set(i,'DIFFICULTY_SETTING',d);set(i,'CAPITAL_SECTOR_STATE',2);set(i,'corridor_phase',(row+11)&255);set(i,'CORRIDOR_PHASE_HI',(row+11)>>>8);set(i,'player_y',96+fine);set(i,'player_x',x);set(i,'PLAYER_LIFECYCLE',0);i.m[0x4e6f]=28;i.m[0x4e5d]=10;i.m[0x4e5e]=0;set(i,'BROAD_DAMAGE_APPLIED',0);set(i,'ENTITY_STATE',0);i.m[i.l.get('ENTITY_STATE')+1]=0;set(i,'ENTITY_ACTIVE_MASK',0);}
const immutable=p.m.slice(p.l.get('spike_nacelles_start'),p.l.get('spike_nacelles_data_end'));
p.m.fill(165,0xb8fb,0xb900);p.m.fill(90,0x549e,0x54be);
const result={difficulties:[],contacts:0,gaps:0,edges:0,cooldowns:0,cacheCases:0,centredContacts:0};
for(let d=0;d<3;d++){
 const rows=[];let maxWidth=0,minSide=160,maxOrdinaryDelta=-Infinity,maxContact=0,maxDraw=0;
 for(let r=0;r<488;r++){
  state(p,r-11,0,124,d);word(p,'dst_ptr',0x4100);p.m.fill(0,0x4100,0x4128);maxDraw=Math.max(maxDraw,run(p,'draw_hull_row'));
  const chars=[...p.m.slice(0x4100,0x4128)],h=x=>(x&127)>=59&&(x&127)<90;
  const cells=chars.flatMap((x,c)=>c>=9&&c<=30&&h(x)?[c]:[]);
  if(cells.length){assert.equal(cells.at(-1)-cells[0]+1,cells.length,'noncontiguous island');assert.ok(cells[0]<=19&&cells.at(-1)>=20);maxWidth=Math.max(maxWidth,cells.length);}
  const left=48+(chars.slice(0,9).findLastIndex(h)+1)*4;
  const re=chars.slice(31).findIndex(h),right=re<0?208:48+(31+re)*4;
  rows.push({left,right,island:cells.length?{left:48+cells[0]*4,right:48+(cells.at(-1)+1)*4}:null});
  // Actual cache hit and fallback both publish the complete 40-cell row.
  p.m.set(chars,p.l.get('PREPARED_HULL_ROW'));const k=p.l.get('PREPARED_HULL_ROW')+40;
  p.m[k]=r&255;p.m[k+1]=r>>>8;p.m[k+2]=2;p.m[k+3]=112;set(p,'PLAYFIELD_ROW_LO',112);
  for(let miss=0;miss<2;miss++){if(miss)p.m[k]^=1;word(p,'dst_ptr',0x4028);p.m.fill(0,0x4028,0x4050);run(p,'commit_prepared_hull_row');assert.deepEqual([...p.m.slice(0x4028,0x4050)],chars);result.cacheCases++;}
 }
 assert.equal(maxWidth,[6,8,10][d]);
 for(let r=0;r<488;r++)for(let fine=0;fine<8;fine++){
  const count=Math.floor((fine+14)/8)+1,rs=Array.from({length:count},(_,n)=>rows[r-n]??{left:48,right:208,island:null});
  const left=Math.max(...rs.map(x=>x.left)),right=Math.min(...rs.map(x=>x.right));
  const ir=rs.flatMap(x=>x.island?[x.island]:[]),il=ir.length?Math.min(...ir.map(x=>x.left)):null,ie=ir.length?Math.max(...ir.map(x=>x.right)):null;
  if(ir.length){minSide=Math.min(minSide,il-left,right-ie);assert.ok(il-left>=[32,28,24][d]);assert.ok(right-ie>=[32,28,24][d]);}
  const xs=new Set([left-1,left,right-8,right-7,92,152,124]);
  if(ir.length){for(let x=il-7;x<ie;x++)xs.add(x);for(let x of[left,il-8,ie,right-8])xs.add(x);}
  for(let x of xs){if(x<48||x>200)continue;state(p,r,fine,x,d);state(b,r,fine,x,d);
   const baseCpu=run(b,'handle_player_hull_contact'),baseX=b.m[b.l.get('player_x')],baseHealth=b.m[0x4e5d];
   const hit=ir.length&&x<ie&&x+7>=il;
   const expected=hit?(x+4<=128?il-8:ie):baseX;
   const cpu=run(p,'handle_player_hull_contact');assert.equal(p.m[p.l.get('player_x')],expected,`clamp r${r} f${fine} x${x} d${d}`);
   assert.equal(p.m[0x4e5d],hit?8:baseHealth,`damage r${r} f${fine} x${x}`);
   if(hit){assert.equal(p.m[0x4e5e],25);maxContact=Math.max(maxContact,cpu);result.contacts++;if(x===124)result.centredContacts++;
    set(p,'player_x',x);set(p,'BROAD_DAMAGE_APPLIED',0);run(p,'handle_player_hull_contact');assert.equal(p.m[0x4e5d],8);assert.equal(p.m[p.l.get('player_x')],expected);result.cooldowns++;
   }else if(baseHealth===10){maxOrdinaryDelta=Math.max(maxOrdinaryDelta,cpu-baseCpu);result.gaps++;}else result.edges++;
  }
 }
 assert.ok(maxOrdinaryDelta<=1000,`ordinary island test delta ${maxOrdinaryDelta}`);
 result.difficulties.push({difficulty:d,maxWidthCells:maxWidth,islandHPOS:maxWidth*4,minSideChannelCells:minSide/4,minSideChannelHPOS:minSide,maxOrdinaryCpuDelta:maxOrdinaryDelta,maxContactCpu:maxContact,maxDrawCpu:maxDraw});
}
assert.deepEqual(p.m.slice(p.l.get('spike_nacelles_start'),p.l.get('spike_nacelles_data_end')),immutable);
assert.ok(p.m.slice(0xb8fb,0xb900).every(x=>x===165));assert.ok(p.m.slice(0x549e,0x54be).every(x=>x===90));
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'correctness.json'),JSON.stringify(result,null,2)+'\n');console.log(result);
