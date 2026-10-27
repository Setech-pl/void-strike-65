// Deterministic authored placement; no runtime RNG or extra lookup storage.
export function slalomLayout(rows, pattern='slalom') {
 if(!Number.isInteger(rows)||rows<288||rows>960||rows%8)throw Error('slalom: invalid hull rows');
 if(!['slalom','slalom-tight'].includes(pattern))throw Error('slalom: unknown pattern');
 const short=rows<328,compact=rows<432;
 const first=short?96:compact?64:96,height=compact?24:48,spacing=compact?88:112;
 const offset=pattern==='slalom-tight'?16:20;
 const spans=[];
 for(let start=first,n=0;start+height<=rows-64;start+=spacing,n++){
  const side=!short&&n===0?'centre':((n-(short?0:1))%2===0?'left':'right');
  const shift=side==='centre'?0:side==='left'?-offset:offset;
  spans.push({index:n,side,shift,centreHpos:128+shift,centreCell:20+shift/4,start,end:start+height,recipe:n%3,faction:n&1,position:side==='centre'?0:side==='left'?1:2});
 }
 return {pattern,rows,first,height,spacing,offset,spans};
}
