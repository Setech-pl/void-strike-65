import fs from 'node:fs';
import assert from 'node:assert/strict';
import {compileLevel,defaultHullAsset,levelSourcePath} from './level-compiler.mjs';
import {ISLAND_RECIPES} from './l2-islands.mjs';
import {slalomLayout} from './capital-slalom-layout.mjs';
const asset=defaultHullAsset(),results=[];let cases=0;
const centres=Array.from({length:35},(_,i)=>94+2*i);
function solve(allowed,step){
 let cost=centres.map(()=>0);const parents=[];
 for(const free of allowed){
  const next=centres.map(()=>Infinity),prev=new Int16Array(centres.length).fill(-1);
  for(let x=0;x<centres.length;x++)if(free[x])for(let y=Math.max(0,x-step);y<=Math.min(centres.length-1,x+step);y++){
   const v=cost[y]+2*Math.abs(x-y);if(v<next[x]){next[x]=v;prev[x]=y;}
  }
  parents.push(prev);cost=next;
 }
 const travel=Math.min(...cost);assert.ok(Number.isFinite(travel),'no connected path');
 let x=cost.indexOf(travel);const path=[];
 for(let r=allowed.length-1;r>=0;r--){path.push(centres[x]);x=parents[r][x];}
 return {travel,path:path.reverse()};
}
for(const pattern of ['slalom','slalom-tight'])for(let length=288;length<=960;length+=8){
 const source=JSON.parse(fs.readFileSync(levelSourcePath(1),'utf8'));source.hull={rows:length,turrets:3};
 for(const sector of source.sectors)if(sector.kind==='capital')sector.islands={pattern};
 const compiled=compileLevel(source,{hullAsset:asset}),index=source.sectors.findIndex(s=>s.kind==='capital');
 const page=compiled.pages.islands,lookup=new Uint8Array(120),first=page[8+index*2],count=page[9+index*2];
 for(let n=0;n<count;n++){const p=28+first+n*6;for(let r=page[p];r<page[p+1];r++)lookup[r]=page[p+2]+1+r-page[p];}
 const layout=slalomLayout(length,pattern);
 for(let d=0;d<3;d++){
  const allowed=[];let straight=centres.map(()=>true),minimumLargestChannel=88;
  for(let row=0;row<length;row++){
   const free=centres.map(()=>true);
   for(let fine=0;fine<8;fine++){
    let left=172,right=84,occupied=false;
    for(let q=0;q<Math.floor((fine+14)/8)+1;q++){
     const absolute=960-length+row-q,tag=absolute>=0&&absolute<960?lookup[absolute>>3]:0;
     if(tag){const v=tag-1,[a,b]=ISLAND_RECIPES[(v>>4)&3].parts[v&7],raw=page[4+(v>>6)],shift=raw>127?raw-256:raw;
      left=Math.min(left,128+4*Math.max(a,-(d+3))+shift);right=Math.max(right,128+4*Math.min(b,d+3)+shift);occupied=true;}
    }
    if(occupied){minimumLargestChannel=Math.min(minimumLargestChannel,Math.max(left-84,172-right));
     for(let x=0;x<centres.length;x++)free[x]&&=centres[x]+10<=left||centres[x]-10>=right;
    }
    cases++;
   }
   assert.ok(free.some(Boolean),`${pattern}/${length}/${d}/${row}: clearance`);
   straight=straight.map((v,x)=>v&&free[x]);allowed.push(free);
  }
  assert.equal(straight.some(Boolean),false,`${pattern}/${length}/${d}: straight band`);
  const unconstrained=solve(allowed,centres.length-1),witness=solve(allowed,1);
  assert.equal(witness.travel,unconstrained.travel,'speed constraint increases minimum travel');
  const windows={};for(const w of [1,8,16,32,64,112,length-1]){let max=0;for(let i=0;i+w<length;i++)max=Math.max(max,Math.abs(witness.path[i+w]-witness.path[i]));windows[w]=max;}
  const minX=Math.min(...witness.path),maxX=Math.max(...witness.path);
  let lastMin=-1,lastMax=-1,shortestWindowForMax=length;
  for(let i=0;i<length;i++){
   if(witness.path[i]===minX){lastMin=i;if(lastMax>=0)shortestWindowForMax=Math.min(shortestWindowForMax,i-lastMax);}
   if(witness.path[i]===maxX){lastMax=i;if(lastMin>=0)shortestWindowForMax=Math.min(shortestWindowForMax,i-lastMin);}
  }
  const rowRate=[16,18,20][d]/40,requiredSpeed=2*rowRate,minimumFramesBetweenRows=Math.floor(1/rowRate),peakSpeed=2/minimumFramesBetweenRows;
  const margin=2/peakSpeed;assert.ok(d!==0||margin>=2);
  results.push({pattern,hullRows:length,difficulty:['EASY','MEDIUM','HARD'][d],minimumLargestChannelHpos:minimumLargestChannel,
   minimumTravelHpos:witness.travel,maximumAnyWindowShiftHpos:maxX-minX,shortestWindowForMaximumShiftRows:shortestWindowForMax,windowDisplacementHpos:windows,maximumStepHposPerRow:2,
   normalWorldRowsPerFrame:rowRate,witnessAverageRequiredHposPerFrame:requiredSpeed,
   worstCadenceRequiredHposPerFrame:peakSpeed,shipHposPerFrame:2,speedMargin:margin,
   straightBand20Hpos:false,spans:layout.spans});
 }
}
const report={status:'PASS',measurement:'HOST-MEASURED',cases,lengths:85,patterns:2,
 model:'Full island interval, 15 ship scanlines, all eight fine alignments intersected, 20-HPOS envelope inside [84,172). Exact shortest total travel on even HPOS centres (actual two-HPOS joystick grid); minimum-travel witness constrained to <=2 HPOS per world row. Speed is a sufficient witness bound, not an optimal-speed claim. No fire or island destruction.',results};
fs.writeFileSync('docs/diagnostics/capital-slalom/proof.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,cases,results:results.filter(r=>[288,352,416,480,960].includes(r.hullRows)).map(({spans,...r})=>r)},null,2));
