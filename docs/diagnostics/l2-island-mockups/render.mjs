// Review-only recipes. Never imported by the build or installed as game art.
// Run from the repository root: node docs/diagnostics/l2-island-mockups/render.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
import {readGameGraphicsSource,readFrontendGraphicsSource} from '../../../scripts/preview.mjs';
import {atari800PalRgb} from '../../../scripts/atari800-pal-palette.mjs';
import {createImage,encodePng,scaleNearest} from '../../../scripts/pages/png.mjs';
const out = new URL('./', import.meta.url);
const graphics = readGameGraphicsSource(fs.readFileSync('src/main.s','utf8'));
const hull = graphics.capitalHulls;
const frontend=readFrontendGraphicsSource(fs.readFileSync('src/main.s','utf8')); 
// Local role indices refer to each faction's existing compiled hull glyphs.
const roles = ['hull_mass','hull_wall','hull_accent','hull_chamfer_in',
  'hull_chamfer_out','hull_groove','hull_seam','turret_base',
  'turret_housing','turret_barrel','engine_energy'];
const enemyRoles = roles.map(s=>s==='hull_groove'?'hull_detail_a':s==='hull_seam'?'hull_detail_b':s);
// Each of six eight-row parts has L edge / body / centre motif / R edge.
const designs = [
 {id:'01-module-wreck',name:'MODULE WRECK',half:[1,2,5,5,2,1],rows:[[3,0,2,4],[1,0,6,1],[1,0,5,1],[1,0,6,1],[3,0,2,4],[3,0,6,4]]},
 {id:'02-engine-pod',name:'ENGINE POD',half:[1,2,5,5,2,1],rows:[[3,0,6,4],[1,0,5,1],[1,0,5,1],[1,0,6,1],[1,0,10,1],[3,0,10,4]]},
 {id:'03-turret-deck',name:'TURRET DECK',half:[1,1,5,5,2,1],rows:[[3,0,9,4],[1,0,9,1],[1,0,8,1],[1,0,7,1],[1,0,6,1],[3,0,2,4]]},
 {id:'04-girder-mast',name:'GIRDER MAST',half:[1,1,5,2,1,1],rows:[[3,5,2,4],[1,5,6,1],[1,5,2,1],[1,5,6,1],[1,5,2,1],[3,5,6,4]]},
 {id:'05-panel-plate',name:'PANEL PLATE',half:[1,2,5,5,5,2],rows:[[3,0,6,4],[1,2,6,1],[1,0,6,1],[1,2,6,1],[1,0,6,1],[3,0,6,4]]},
];
const palette = ['COLBK','COLPF0','COLPF1','COLPF2','COLPF3'].map(k=>{
 const value=graphics.hardwareState.get(k); if(value===undefined)throw Error(k);
 return {register:k,value,rgb:atari800PalRgb(value)};
});
function put(im,x,y,rgb){if(x<0||y<0||x>=im.width||y>=im.height)return;
 im.data.set([...rgb,255],(y*im.width+x)*4);}
function glyph(im,code,x,y){
 for(let dy=0;dy<8;dy++){const b=graphics.charset[(code&127)*8+dy];
  for(let dx=0;dx<4;dx++){const v=(b>>(6-dx*2))&3;
   const c=palette[v===3?(code&128?4:3):v].rgb;
   put(im,x+dx*2,y+dy,c);put(im,x+dx*2+1,y+dy,c);}}
}
function label(im,str,x,y){for(const c of str){const n=c.charCodeAt(0);
 const key=n===32?'CH_FRONT_SPACE':n>=48&&n<=57?'CH_FRONT_ZERO':'CH_FRONT_A';
 const code=frontend.constants.get(key)+(key==='CH_FRONT_ZERO'?n-48:key==='CH_FRONT_A'?n-65:0);
 for(let dy=0;dy<8;dy++){const b=frontend.frontendCharset[code*8+dy];
  for(let dx=0;dx<8;dx++)if(b&(128>>dx))put(im,x+dx,y+dy,palette[1].rgb);}
 x+=8;}}
const manifest={classification:'MEASURED static mockup output, not runtime evidence',
 baseline:'19b1464',palette,glyphSource:'assets/graphics/capital-hulls.json',
 pipeline:'readGameGraphicsSource + compileCapitalHulls; actual ANTIC 4 byte decoding; atari800PalRgb',
 cellPixels:[8,8],parts:6,rowsPerPart:8,fullHeightRows:48,newGlyphSlots:0,
 recipeBytesPerDesign:30,roleMapBytes:22,geometry:'Per-design six-part half-width envelope capped to EASY 3 / HARD 5; centred; side hulls use compiled combat rows',
 panels:'top EASY allied/enemy; bottom HARD allied/enemy; complete tall fragment, not a viewport screenshot',designs:[]};
for(const design of designs){const im=createImage(656,864,4,[4,4,4,255]);
 for(const [panel,width,faction] of [[0,6,'allied'],[1,6,'enemy'],[2,10,'allied'],[3,10,'enemy']]){
  const ox=(panel%2)*336,oy=Math.floor(panel/2)*432;
  label(im,`${width===6?'EASY':'HARD'} ${faction.toUpperCase()}`,ox+8,oy+2);
  label(im,design.name,ox+8,oy+14);
  const roleNames=faction==='allied'?roles:enemyRoles;
  const codes=roleNames.map(r=>hull.glyphs.find(g=>g.name===`${faction}_${r}`).screenCode);
  for(let row=0;row<48;row++){
   // Use real combat hulls for scale, including the existing opposite-side phase.
   const sr=160+row;
   for(const [side,col,source] of [['allied',0,sr],['enemy',31,sr-8]]){
    const cells=hull.sector.sectorScreenRowsBySide.get(side)[source];
    for(let c=0;c<9;c++)glyph(im,cells[c],ox+(col+c)*8,oy+32+row*8);
   }
   const part=Math.floor(row/8),w=Math.min(width,design.half[part]*2);
   const start=(40-w)/2,recipe=design.rows[part];
   for(let c=0;c<w;c++){
    const role=c===0?recipe[0]:c===w-1?recipe[3]:
      c===Math.floor(w/2)?recipe[2]:recipe[1];
    glyph(im,codes[role],ox+(start+c)*8,oy+32+row*8);
   }
  }
  label(im,`${width===6?'8':'6'} CELL MIN SIDE CHANNEL`,ox+8,oy+420);
 }
 const bytes=encodePng(scaleNearest(im,2));fs.writeFileSync(new URL(`${design.id}.png`,out),bytes);
 manifest.designs.push({...design,recipeBytes:design.rows.flat().length+design.half.length,newGlyphSlots:0,
  file:`${design.id}.png`,pngBytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
fs.writeFileSync(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
console.log(manifest.designs.map(d=>`${d.file}: ${d.pngBytes} B; ${d.recipeBytes} recipe B; no new glyphs`).join('\n'));
