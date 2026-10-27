// Read-only production input check. This is a blocker reproduction, not a
// slalom implementation or a substitute for the requested native matrix.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {compileLevel, defaultHullAsset, levelSourcePath} from './level-compiler.mjs';
import {ISLAND_RECIPES} from './l2-islands.mjs';
const asset=defaultHullAsset();
const rows=[];
let checks=0;
for(let length=288;length<=960;length+=8){
 const source=JSON.parse(fs.readFileSync(levelSourcePath(1),'utf8'));
 source.hull={rows:length,turrets:3};
 const capital=source.sectors.find(s=>s.kind==='capital');
 capital.islands={pattern:'salvage'};
 const compiled=compileLevel(source,{hullAsset:asset});
 const index=source.sectors.indexOf(capital),page=compiled.pages.islands;
 const count=page[9+index*2],first=page[8+index*2];
 const lookup=new Uint8Array(120);
 for(let i=0;i<count;i++){
  const p=28+first+i*6;
  for(let r=page[p];r<page[p+1];r++)lookup[r]=page[p+2]+1+r-page[p];
 }
 const difficulty=[];
 for(let d=0;d<3;d++){
  let straight=Array.from({length:69},(_,i)=>94+i);
  for(let row=0;row<length;row++)for(let fine=0;fine<8;fine++){
   // Conservatively occupy the complete recipe interval and the entire
   // 15-scanline ship footprint; require 20 HPOS for the 16-HPOS ship.
   const intervals=[];
   for(let q=0;q<Math.floor((fine+14)/8)+1;q++){
    const absolute=960-length+row-q;
    const tag=absolute>=0&&absolute<960?lookup[absolute>>3]:0;
    if(tag){
     const v=tag-1,[a,b]=ISLAND_RECIPES[v>>4].parts[v&7];
     intervals.push([128+4*Math.max(a,-(d+3)),128+4*Math.min(b,d+3)]);
    }
   }
   straight=straight.filter(x=>intervals.every(([a,b])=>x+10<=a||x-10>=b));
   checks++;
  }
  assert.ok(straight.length>0,'baseline unexpectedly already has slalom');
  difficulty.push({difficulty:['EASY','MEDIUM','HARD'][d],straightCentres:straight,
   minimumTotalTravelHpos:0,largestNecessaryShiftHpos:0,requiredLateralSpeed:0,
   speedMargin:null,marginReason:'No movement required: baseline fails no-straight-line property'});
 }
 capital.islands={pattern:'salvage',firstRow:64,heightRows:24,spacingRows:88,minGapRows:64};
 // Compiler's seven-record cap is separate; count only the short-hull case
 // for the most permissive placement, avoiding an unrelated long-hull error.
 let permissiveCount=null;
 if(length<328)permissiveCount=compileLevel(source,{hullAsset:asset}).pages.islands[9+index*2];
 rows.push({hullRows:length,defaultFragments:count,permissiveCount,difficulty});
}
const minimum=64+3*24+2*64+64;
assert.equal(minimum,328);
assert.ok(rows.filter(r=>r.hullRows<minimum).every(r=>r.permissiveCount===2));
const report={status:'BLOCKED_CENTRE_FIRST_ALL_LENGTHS',baseline:'bf4d410',
 scope:'Host compiler and conservative interval model, not linked or native execution',
 allRowFineDifficultyChecks:checks,legalHullLengths:rows.length,
 centreFirstMinimumRows:minimum,shortestHullRows:288,shortestHullDeficitRows:minimum-288,
 minimumWithFirstRow96:360,minimumWithOriginalDefaults:432,
 unsupportedLengths:rows.filter(r=>r.hullRows<minimum).map(r=>r.hullRows),rows};
fs.writeFileSync('docs/diagnostics/capital-slalom/feasibility.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,rows:undefined},null,2));
process.exitCode=1; // Requested no-straight-line / all-length acceptance gate fails.
