// Independent raster oracle: real row publisher + ANTIC 4 glyph pixels +
// double-width PMG sprite. Engine decisions execute linked NMOS6502 code.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Nmos6502} from './nmos6502.mjs';
import {installRuntimeSegments} from './runtime-image.mjs';
import {parseViceLabels} from './runtime-cycles.mjs';
export function sweep({build='build',output='docs/diagnostics/island-edge/before.json',module=null}={}){
 const labels=parseViceLabels(fs.readFileSync(`${build}/void-strike-65.lbl`,'utf8'));
 const overlay=parseViceLabels(fs.readFileSync(`${module??build}/l2.lbl`,'utf8'));
 const fixed={BROAD_VISIBLE_SCROLLS:0x4e6f,BROAD_PLAYER_HEALTH:0x4e5d,BROAD_DAMAGE_COOLDOWN:0x4e5e};
 const at=n=>{const a=labels.get(n)??overlay.get(n)??fixed[n];if(a===undefined)throw Error(`Missing label ${n}`);return a;};
 const m=new Uint8Array(65536);installRuntimeSegments(m,process.cwd(),path.resolve(build));
 if(module)m.set(fs.readFileSync(`${module}/l2.bin`),0x1900);
 const run=(name,a=0)=>{const c=new Nmos6502(m);c.a=a;c.push(127);c.push(254);c.pc=at(name);let hit=false;
  for(let i=0;c.pc!==32767;i++){if(i>20000)throw Error(name);if(c.pc===at('apply_broadside_player_damage'))hit=true;c.step();}return {hit,cycles:c.cycles};};
 const set=(n,v)=>m[at(n)]=v;
 const coord=r=>{set('corridor_phase',r&255);set('CORRIDOR_PHASE_HI',r>>8);};
 m[0x80f6]=1;run('l2_enter');run('copy_charset');run('publish_level_hull_style');
 const shape=[...m.slice(at('player_shape'),at('player_shape')+15)];
 if(!shape.some(Boolean))throw Error('Missing sprite');
 const groups=new Map();let total=0,mismatches=0,falseNegative=0,falsePositive=0,maxCpu=0,minPositive=Infinity;
 const examples=[];
 for(let design=0;design<3;design++)for(let faction=0;faction<2;faction++)for(let difficulty=0;difficulty<3;difficulty++){
  set('DIFFICULTY_SETTING',difficulty);set('CAPITAL_SECTOR_STATE',2);set('BROAD_VISIBLE_SCROLLS',28);
  m.fill(0,0xad80,0xadf8);for(let p=0;p<6;p++)m[0xad80+72+p]=1+(design<<4)+(faction<<3)+p;
  const raster=new Map();
  for(let row=570;row<634;row++){
   coord(row);m[at('dst_ptr')]=0;m[at('dst_ptr')+1]=0x41;run('draw_hull_row');
   raster.set(row,Array.from({length:8},(_,line)=>{
    const pixels=new Set();for(let col=9;col<31;col++){
     const code=m[0x4100+col];if(!code)continue;
     const bits=m[at('CHARSET')+(code&127)*8+line];
     for(let p=0;p<4;p++)if((bits>>(6-2*p))&3){pixels.add(96+col*8+p*2);pixels.add(97+col*8+p*2);}
    }return pixels;
   }));
  }
  for(let source=574;source<=627;source++)for(let fine=0;fine<8;fine++){
   const y=96+fine;coord(source+11);set('player_y',y);
   for(let x=76;x<=164;x++){
    let area=0,width=0;const occupiedX=new Set();
    for(let dy=0;dy<15;dy++){
     const offset=fine+dy,solid=raster.get(source-Math.floor(offset/8))[offset&7];
     let rowWidth=0;
     for(let bit=0;bit<8;bit++)if(shape[dy]&(128>>bit))for(let p=0;p<4;p++){
      const px=x*2+bit*4+p;if(solid.has(px)){area++;rowWidth++;occupiedX.add(px);}
     }width=Math.max(width,rowWidth);
    }
    const part=Math.max(0,Math.min(5,Math.floor((source-576)/8)));
    const region=source>=624?'plate-top':source<=577?'plate-bottom':([2,3].includes(part)||(design===2&&part===4)?'plate':'neck')+(x<128?'-left':'-right');
    set('player_x',x);set('PLAYER_LIFECYCLE',0);set('BROAD_DAMAGE_APPLIED',0);set('BROAD_DAMAGE_COOLDOWN',0);set('BROAD_PLAYER_HEALTH',10);set('ENTITY_ACTIVE_MASK',0);
    const result=run('l2_contact');maxCpu=Math.max(maxCpu,result.cycles);total++;
    const key=[design,faction,difficulty,region,fine].join('/');
    let g=groups.get(key);if(!g){g={design:['01','03','05'][design],faction,difficulty,region,alignment:fine,cases:0,mismatches:0,falseNegative:0,falsePositive:0,minHitOverlap:null,maxMissOverlap:0,overlapDecisions:{}};groups.set(key,g);}
    g.cases++;if(area&&width<minPositive)minPositive=width;
    if(result.hit)g.minHitOverlap=g.minHitOverlap===null?width:Math.min(width,g.minHitOverlap);else g.maxMissOverlap=Math.max(g.maxMissOverlap,width);
    if(result.hit!==!!area){
     mismatches++;g.mismatches++;if(area){falseNegative++;g.falseNegative++;}else{falsePositive++;g.falsePositive++;}
     const k=`${width}/${result.hit?'yes':'no'}`;g.overlapDecisions[k]=(g.overlapDecisions[k]??0)+1;
     if(examples.length<32)examples.push({design,faction,difficulty,source,fine,x,region,overlapWidthHires:width,overlapAreaHires:area,engineHit:result.hit});
    }
   }
  }
 }
 const report={measurement:'MEASURED linked NMOS6502 + raster oracle',build,total,mismatches,falseNegative,falsePositive,maxCpu,minPositive,shape,examples,groups:[...groups.values()]};
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 const table=['# Island contact raster sweep','', `${report.total} cases; ${report.mismatches} mismatches (${report.falseNegative} missed overlaps, ${report.falsePositive} false contacts).`, '', 'MEASURED. Overlap is maximum common opaque width on any matching scanline, in hires pixels. Zero means no common solid pixel. HPOS advances two hires pixels; ANTIC 4 pixels also span two hires pixels. World scrolling publishes whole character rows; alignment is the eight relative sprite/glyph scanline phases.','', '| Design | Colour | Difficulty | Region | Alignment | Mismatch overlap / engine hit / count | Minimum overlap on hit | Maximum overlap on miss |','| --- | --- | --- | --- | ---: | --- | ---: | ---: |',...report.groups.filter(g=>g.mismatches).map(g=>`| ${g.design} | ${g.faction} | ${g.difficulty} | ${g.region} | ${g.alignment} | ${Object.entries(g.overlapDecisions).map(([k,v])=>`${k}/${v}`).join(', ')} | ${g.minHitOverlap} | ${g.maxMissOverlap} |`)];
 fs.writeFileSync(output.replace(/\.json$/,'.md'),table.join('\n')+'\n');console.log(JSON.stringify({...report,groups:undefined,examples:undefined}));return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url))sweep({build:process.argv[2]??'build',output:process.argv[3]??'docs/diagnostics/island-edge/before.json',module:process.argv[4]??null});
