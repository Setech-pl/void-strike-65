// Counterfactual legal joystick reachability for one shell. No guest changes.
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {Nmos6502} from './nmos6502.mjs';import{installRuntimeSegments}from'./runtime-image.mjs';import{parseViceLabels}from'./runtime-cycles.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'docs/diagnostics/spike-nacelles/throttle');
function rows(name){const[h,...v]=zlib.gunzipSync(fs.readFileSync(path.join(out,name))).toString().trim().split('\n').map(x=>x.split(','));return v.map(a=>Object.fromEntries(h.map((k,i)=>[k,+a[i]])));}
const dir=path.join(root,'build/spike-nacelles-p5'),m=new Uint8Array(65536);installRuntimeSegments(m,root,dir);
const l=parseViceLabels(fs.readFileSync(path.join(dir,'void-strike-65.lbl'),'utf8'));
function set(n,v){m[l.get(n)]=v;}
function run(n){const c=new Nmos6502(m);c.push(127);c.push(254);c.pc=typeof n==='number'?n:l.get(n);let s=0;while(c.pc!==32767&&s++<100000)c.step();assert.equal(c.pc,32767,n);return c;}
run('copy_charset');run('publish_level_hull_style');
const result={method:'nine legal joystick directions; swept 16-HPOS shell target; actual drawn hull/island bounds; fixed off-route row clock',difficulties:[]};
for(let d=0;d<3;d++){
 const name=['easy','medium','hard'][d],r=rows(`off-${name}.csv.gz`),side=rows(`off-${name}-islands.csv.gz`),geometry=[];
 set('DIFFICULTY_SETTING',d);set('CAPITAL_SECTOR_STATE',2);
 for(let row=0;row<488;row++){
  set('corridor_phase',row&255);set('CORRIDOR_PHASE_HI',row>>>8);set('dst_ptr',0);m[l.get('dst_ptr')+1]=0x41;run('draw_hull_row');
  const chars=[...m.slice(0x4100,0x4128)],h=x=>(x&127)>=59&&(x&127)<90;
  let left=48+(chars.slice(0,9).findLastIndex(h)+1)*4,re=chars.slice(31).findIndex(h),right=re<0?208:48+(31+re)*4;
  const cells=chars.flatMap((v,c)=>c>=9&&c<=30&&h(v)?[c]:[]);
  geometry.push({left,right,il:cells.length?48+cells[0]*4:null,ir:cells.length?48+(cells.at(-1)+1)*4:null});
 }
 function legal(x,y,f){const top=(y-8)>>3,count=((((y-8)&7)+14)>>3)+1;
  for(let n=0;n<count;n++){const g=geometry[side[Math.min(f,side.length-1)].phase-top-n];if(!g)continue;
   if(x<g.left||x+7>=g.right||g.il!==null&&x<g.ir&&x+7>=g.il)return false;}return true;}
 function reach(f,slot){const a=r[f],shellX=a[`broad${slot}_x`],owner=a[`broad${slot}_owner`];let top=a[`broad${slot}_raster_top`];
  let states=new Set([a.player_x*256+a.player_y]),sizes=[];
  for(let t=1;t<=60;t++){
   let previous=shellX+(owner?-2:2)*(t-1),current=previous+(owner?-2:2),left=Math.min(previous&252,current&252),right=Math.max(previous&252,current&252)+7;
   if(current<48||current>=208)return{avoidable:true,steps:t,reachable:sizes};
   const next=new Set();for(let k of states){let x=k>>8,y=k&255;for(let dx of[-2,0,2])for(let dy of[-1,0,1]){
    let nx=Math.max(48,Math.min(200,x+dx)),ny=Math.max(32,Math.min(225,y+dy));
    if(left<=nx+15&&right>=nx&&top<=ny+6&&top+5>=ny-8)continue;
    if(legal(nx,ny,f+t))next.add(nx*256+ny);
   }}sizes.push(next.size);if(!next.size)return{avoidable:false,steps:t,reachable:sizes};states=next;
   // The launch flash shares the row pointer for its first few frames.
   // Collision consumes the previous published raster; remaining flash time
   // can then advect the bolt by one world row before next frame's test.
   if(a[`broad${slot}_flash`]-t>0)top+=8*(side[f+t].phase-side[f+t-1].phase);
  }return{avoidable:true,steps:60,reachable:sizes};
 }
 const launches=[];
 for(let f=1;f<r.length;f++)for(let slot=0;slot<3;slot++)if(r[f].player_y===225&&r[f][`broad${slot}_state`]===2&&r[f-1][`broad${slot}_state`]===1){
  const top=r[f][`broad${slot}_raster_top`];if(top<212||top>232)continue;
  launches.push({frame:f,phase:side[f].phase,slot,x:r[f].player_x,y:r[f].player_y,shellX:r[f][`broad${slot}_x`],shellY:r[f][`broad${slot}_y`],rasterTop:top,owner:r[f][`broad${slot}_owner`],...reach(f,slot)});
 }
 // Late commitment example: same actual input frame, every possible next
 // joystick direction overlaps the sweep before vertical separation is possible.
 let late=null;
 for(let f=1;f<r.length&&!late;f++)for(let slot=0;slot<3;slot++)if(r[f].player_y===225&&r[f].player_health-r[f].player_health_after===2&&r[f][`broad${slot}_state`]===3&&r[f][`broad${slot}_collision`]===1&&r[f-1][`broad${slot}_state`]===2){
  const before=r[f-1],sx=before[`broad${slot}_x`],owner=before[`broad${slot}_owner`],top=before[`broad${slot}_raster_top`],cx=sx+(owner?-2:2),sl=Math.min(sx&252,cx&252),sr=Math.max(sx&252,cx&252)+7;
  let misses=[];for(let dx of[-2,0,2])for(let dy of[-1,0,1]){let x=Math.max(48,Math.min(200,r[f].player_x+dx)),y=Math.min(225,r[f].player_y+dy);const expected=sl<=x+15&&sr>=x&&top<=y+6&&top+5>=y-8;
   m[0x94]=sl;m[0x95]=sr;m[0x96]=x;m[0x97]=x+15;m[0x98]=y-8;m[0x99]=y+6;m[0x4e72]=top;
   assert.equal(Boolean(run(0x8b67).p&1),expected,'analytic rectangle differs from real NMOS collision');
   if(!expected)misses.push([dx,dy]);}
  if(!misses.length)late={frame:f,phase:side[f].phase,slot,playerX:r[f].player_x,playerY:r[f].player_y,priorShellX:sx,nextShellX:cx,swept:[sl,sr],shellRaster:[top,top+5],allNineInputsHit:true,health:[r[f].player_health,r[f].player_health_after]};
 }
 result.difficulties.push({difficulty:d,name,launches,late});
}
fs.writeFileSync(path.join(out,'root-cause.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
