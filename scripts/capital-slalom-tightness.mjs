// Exhaustively price inward translations on the existing character grid.
// Plate projection is checked independently against the real raster in tests.
import fs from 'node:fs';import assert from 'node:assert/strict';
const rows=[];
for(let offset=0;offset<=20;offset+=4){
 const union=[{left:128-offset-12,right:128-offset+12},{left:128+offset-12,right:128+offset+12}];
 const straight=[];
 for(let start=84;start+20<=172;start++)if(union.every(({left,right})=>start+20<=left||start>=right))straight.push(start);
 rows.push({offsetHpos:offset,leftCentre:128-offset,rightCentre:128+offset,
  easyPlateLargestSideChannelHpos:32+offset,straightBand20Starts:straight,pass:straight.length===0});
}
assert.equal(rows.find(r=>r.pass).offsetHpos,16);
fs.writeFileSync('docs/diagnostics/capital-slalom/tightness.json',JSON.stringify({measurement:'HOST-MEASURED exhaustive four-HPOS-grid inward offsets, unchanged EASY plate width 24',rows,chosen:16},null,2)+'\n');
console.log('Tight Weave: 16 HPOS is the most inward passing offset; 0/4/8/12 retain straight bands.');
