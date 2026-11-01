// Reproducible HOST-MEASURED path traversal, in HPOS and raster lines/frame.
import fs from 'node:fs';
import {encodeWavePath} from './wave-paths.mjs';
import {expandWaveChains} from './wave-chains.mjs';
import {m3TempoSource} from './m3-tempo.mjs';
const [beforeFile,outFile]=process.argv.slice(2);
if(!beforeFile||!outFile)throw Error('usage: node scripts/m3-tempo-report.mjs BEFORE.json OUTPUT.json');
const before=JSON.parse(fs.readFileSync(beforeFile));
const normal=JSON.parse(fs.readFileSync('assets/levels/level-02.json'));
const paths=['wide-west','wide-east','wide-cross','wide-track','wide-return','tracking-dive'];
function measure(source,name) {
 const bytes=encodeWavePath(name,source.payload.paths),runs=[];
 const wave=expandWaveChains(source).source.sectors.flatMap(s=>s.waves??[]).find(w=>w.path===name);
 const mirrors=wave.mirror?[false,true]:[false];
 for(const phase of [0,1,2,3])for(const mirror of mirrors)for(const target of [48,124,200]) {
  let x=wave.entry;
  let y=0,at=0,left=bytes[1],dxTotal=0,dyTotal=0,peakX=0,peakY=0,minX=x,maxX=x,frames=0;
  for(let frame=1;frame<10000;frame++) {
   const dy=bytes[at]<128?bytes[at]:bytes[at]-256,flags=bytes[at+2];
   const nextY=y+dy;
   if(nextY<0||nextY>=232)break;
   y=nextY;let dx=0;const dir=flags&12;
   if(dir&&((frame+phase)&(flags&3))===0) {
    dx=dir===12?Math.sign(target-x)*4:(dir===4?4:-4)*(mirror?-1:1);
    if(x+dx<48||x+dx>200)dx=0;
   }
   x+=dx;minX=Math.min(minX,x);maxX=Math.max(maxX,x);
   dxTotal+=Math.abs(dx);dyTotal+=Math.abs(dy);peakX=Math.max(peakX,Math.abs(dx));peakY=Math.max(peakY,Math.abs(dy));frames++;
   if(left&&--left===0) {if(flags&128)break;const back=(flags>>5)&3;at+=back?-3*back:3;left=bytes[at+1];}
  }
  runs.push({phase,mirror,target,frames,averageLateral:dxTotal/frames,peakLateral:peakX,averageVertical:dyTotal/frames,peakVertical:peakY,span:maxX-minX});
 }
 const average=k=>runs.reduce((a,r)=>a+r[k],0)/runs.length;
 return {averageLateral:average('averageLateral'),peakLateral:Math.max(...runs.map(r=>r.peakLateral)),averageVertical:average('averageVertical'),peakVertical:Math.max(...runs.map(r=>r.peakVertical)),maximumSpan:Math.max(...runs.map(r=>r.span)),frames:runs[0].frames,
  segments:Array.from({length:4},(_,i)=>({dy:bytes[i*3]<128?bytes[i*3]:bytes[i*3]-256,frames:bytes[i*3+1],lateralCadence:bytes[i*3+2]&12?1+(bytes[i*3+2]&3):0,unclampedLateralRate:bytes[i*3+2]&12?4/(1+(bytes[i*3+2]&3)):0})),runs};
}
const report={method:'HOST-MEASURED deterministic path traversal, no renderer/cycles. Mean of traversals per path: 4 frame phases x authored mirror states (one or two) x 3 fixed player columns (48/124/200), using the authored entry column. Absolute displacement per tick; terminal retirement tick excluded. Tracking averages depend on player input; segments also expose unclamped cadence rates. HPOS is one colour clock (2 high-resolution pixels); vertical unit is one raster line.',before:Object.fromEntries(paths.map(n=>[n,measure(before,n)])),after:Object.fromEntries(['easy','normal','hard'].map(t=>[t,Object.fromEntries(paths.map(n=>[n,measure(m3TempoSource(normal,t),n)]))]))};
fs.writeFileSync(outFile,JSON.stringify(report,null,2)+'\n');
