// Linked listing audit for every changed routine, including separate C objects.
import fs from 'node:fs';import path from 'node:path';
const before=process.argv[2]??'build/l2-baseline',after=process.argv[3]??'build';
const specifications=[
 ['main.lst','void-strike-65.map','main.o'],
 ['encounter-director.lst','encounter-director.map','encounter-director-c.o'],
 ['encounter-director-lifecycle.lst','encounter-director.map','encounter-director-lifecycle.o'],
 ['encounter-director-abi.lst','encounter-director.map','encounter-director-abi.o'],
 ['life-capsule-c.lst','encounter-director.map','life-capsule-c.o'],
 ['light-kernel.lst','light-kernel.map','light-kernel.o'],
 ['sector-reader.lst','sector-reader.map','sector-reader.o'],
 ['level-summary.lst','level-summary.map','level-summary.o'],
 ['integration-glue.lst','integration-glue.map','integration-glue.o'],
 ['capital-player-collision.lst','capital-player-collision.map','capital-player-collision.o'],
 ['l2.lst','l2.map','l2.o'],
];
const branchOps=new Set(['bcc','bcs','beq','bne','bmi','bpl','bvc','bvs']);
function collect(dir){const routines=new Map();
 for(const [listing,mapFile,object] of specifications){
  if(!fs.existsSync(path.join(dir,listing)))continue;
  const map=fs.readFileSync(path.join(dir,mapFile),'utf8');
  const segments=new Map([...map.slice(map.indexOf('Segment list:')).matchAll(/^(\w+)\s+([\dA-F]{6})\s+[\dA-F]{6}\s+[\dA-F]{6}/gm)].map(m=>[m[1],parseInt(m[2],16)]));
  const objects=map.slice(0,map.indexOf('Segment list:'));const start=objects.indexOf(object+':');
  if(start<0)throw Error(`Missing ${object} in ${mapFile}`);
  const piece=objects.slice(start+object.length+1).split(/\n\S/)[0];
  const offsets=new Map([...piece.matchAll(/^\s+(\w+)\s+Offs=([\dA-F]+)/gm)].map(m=>[m[1],parseInt(m[2],16)]));
  let segment=null,routine=null,proc=false;
  for(const line of fs.readFileSync(path.join(dir,listing),'utf8').split('\n')){
   const text=line.slice(23).trim(), off=parseInt(line.slice(0,6),16);
   const sg=/^\.segment\s+"([^"]+)"/.exec(text);if(sg){segment=sg[1];continue;}
   const base=(segments.get(segment)??NaN)+(offsets.get(segment)??0),address=base+off;
   const pr=/^\.proc\s+(\w+)/.exec(text),gl=!proc&&/^(\w+):/.exec(text);
   if(pr||gl){const name=(pr??gl)[1];proc=!!pr;
    routine={name,segment,listing,address,branches:[],indexed:[],instructions:0};routines.set(`${listing}:${segment}:${name}`,routine);
   }
   if(text.startsWith('.endproc')){proc=false;routine=null;continue;}
   const instruction=/^(?:(?:\w+):\s*)?([a-z]{3})\b\s*(.*)$/i.exec(text);
   const bytes=line.slice(11,23).trim().split(/\s+/);
   if(!instruction||!routine||!Number.isFinite(address)||! /^[\dA-F]{2}$/.test(bytes[0]??''))continue;
   const op=instruction[1].toLowerCase();routine.instructions++;
   if(branchOps.has(op)&&/^[\dA-F]{2}$/.test(bytes[1]??'')){
    const rel=parseInt(bytes[1],16),target=address+2+(rel>127?rel-256:rel);
    routine.branches.push({address,target,op,source:instruction[2],cross:((address+2)&0xff00)!==(target&0xff00)});
   }
   if(/,\s*[xy]$/i.test(instruction[2]))routine.indexed.push({address,source:text});
  }
 }
 return routines;
}
const old=collect(before),now=collect(after);const rows=[];
for(const [key,r] of now){if(!r.instructions)continue;const b=old.get(key);
 const changed=!b||b.address!==r.address||JSON.stringify(b.branches)!==JSON.stringify(r.branches);
 if(!changed)continue;
 const crossings=r.branches.filter(x=>x.cross);
 const newCross=r.branches.filter((x,i)=>x.cross&&!b?.branches[i]?.cross);
 rows.push({key,addressBefore:b?.address??null,addressAfter:r.address,
  before:b?.branches.filter(x=>x.cross).length??0,after:crossings.length,newCrossings:newCross,
  branchCount:r.branches.length,indexedSites:r.indexed,classification:/guard|reader|summary|boot|loader|^copy_|^init_|unpack|frontend|menu|publish_level|l2_init|l2_rearm|l2_disarm|l2_c_enter/i.test(r.name)?'cold/transition':'per-frame'});
}
const indexedTables=[
 ['l2_part_offsets',5],['l2_recipe_offsets',2],['l2_left_caps',2],['l2_right_caps',2],['l2_recipes',107],['_l2_normal_rates',2],['_l2_half_rates',2],
].map(([name,maxIndex])=>{const address=now.get(`l2.lst:L2:${name}`)?.address;if(!Number.isFinite(address))throw Error(`Missing table ${name}`);return {name,address,maxIndex,pageCross:((address&255)+maxIndex)>255};});
indexedTables.push({name:'level allied sequence',address:0xac08,maxIndex:119,pageCross:false},{name:'level enemy sequence',address:0xac80,maxIndex:119,pageCross:false},{name:'current-sector lookup',address:0xad80,maxIndex:119,pageCross:false});
const out=process.argv[4]??'build/l2-page-cross.json';fs.writeFileSync(out,JSON.stringify({before,after,rows,indexedTables},null,2)+'\n');
const hex=n=>n===null?'new':'$'+n.toString(16).toUpperCase();
console.log('| Routine | Before | After | Crossings | New | Phase |\n| --- | --- | --- | --- | --- | --- |');
for(const r of rows)console.log(`| ${r.key} | ${hex(r.addressBefore)} | ${hex(r.addressAfter)} | ${r.before} → ${r.after} | ${r.newCrossings.length} | ${r.classification} |`);
console.log('NEW per-frame crossings:',rows.filter(r=>r.classification==='per-frame').reduce((n,r)=>n+r.newCrossings.length,0));

console.log('\n| Indexed table | Address | Maximum index | Page penalty |\n| --- | --- | --- | --- |');
for(const t of indexedTables)console.log(`| ${t.name} | ${hex(t.address)} | ${t.maxIndex} | ${t.pageCross?1:0} |`);
if(rows.some(r=>r.classification==='per-frame'&&r.newCrossings.length)||indexedTables.some(t=>t.pageCross))process.exitCode=1;
