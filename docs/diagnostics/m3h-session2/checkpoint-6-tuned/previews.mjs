// Source-derived previews, using the same masks/palette as the linked build.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {compileHeavyDamage,damageSource} from '../../../../scripts/heavy-damage.mjs';
import {compileHeavyLook} from '../../../../scripts/enemy-roster.mjs';
import {createImage,scaleNearest,encodePng} from '../../../../scripts/pages/png.mjs';
import {draw,textImage} from '../../../../scripts/pages/image.mjs';
import {textBitmap} from '../../../../scripts/pages/font.mjs';
import {atari800PalRgb} from '../../../../scripts/atari800-pal-palette.mjs';
const out=new URL('.',import.meta.url).pathname;
const current=damageSource(), previous=JSON.parse(execFileSync('git',['show','2d4ef8c:assets/graphics/enemy-roster.json']));
const now=compileHeavyDamage(current),old=compileHeavyDamage(previous);
const armourColour=compileHeavyLook(current.heavyLooks.armouredRaider)[16];
const colours=[[armourColour,armourColour,armourColour],[0xc8,0xc6,0x28]];
const oldColours=[[0x46,0x46,0x46],[0xc8,0xc6,0xc4]];
function sprite(rows,colour,shape) {
  const bitWidth=shape?8:4,image=createImage(bitWidth*8,16,4,[4,4,4,255]);
  for(let y=0;y<16;y++)for(let x=0;x<8;x++)if(rows[y]&(128>>x))
    for(let dx=0;dx<bitWidth;dx++)image.data.set([...atari800PalRgb(colour),255],(y*image.width+x*bitWidth+dx)*4);
  return scaleNearest(image,4);
}
function sheet(file,title,rows) {
  const image=createImage(1000,70+rows.length*150,4,[15,18,23,255]);
  const label=(s,x,y,scale=1)=>{if(s)draw(image,textImage(textBitmap(s),[230,231,234],scale),x,y);};
  label(title,16,12,2);
  rows.forEach((row,r)=>row.forEach((cell,c)=>{
    const x=16+c*330,y=55+r*150;label(cell.label,x,y);
    const body=sprite(cell.body,cell.colour,cell.shape);draw(image,body,x+(300-body.width)/2,y+25);
    label(cell.note??'',x,y+108);
  }));
  label('SOURCE BITMAP PREVIEW / ATARI800 PAL / NATIVE PMG WIDTHS X4',16,image.height-17);
  fs.writeFileSync(out+file,encodePng(image));
}
const count=b=>b.reduce((n,x)=>n+x.toString(2).replaceAll('0','').length,0);
const cells=(compiled,shape,tag,palette)=>compiled.stages[shape].map((body,stage)=>({body,shape,colour:palette[shape][stage],
  label:`${tag} / ${stage?`STAGE ${stage}`:'INTACT'} / ${palette[shape][stage].toString(16).toUpperCase()}`,
  note:`${count(compiled.stages[shape][0])-count(body)} BITMAP PIXELS REMOVED`}));
sheet('damage-stages.png','TUNED HEAVY DAMAGE - INTACT / STAGE 1 / STAGE 2',[
  cells(now,0,'ARMOURED',colours),cells(now,1,'BOMBER',colours)]);
sheet('armour-damage-comparison.png','ARMOURED RAIDER - PREVIOUS AND TUNED',[
  cells(old,0,'PREVIOUS',oldColours),cells(now,0,'TUNED',colours)]);
sheet('bomber-comparison.png','BOMBER - PREVIOUS AND TUNED',[
  cells(old,1,'PREVIOUS',oldColours),cells(now,1,'TUNED',colours)]);
sheet('raider-comparison.png','ASSAULT AND ARMOURED RAIDER',[[
  {body:current.archetypes.find(a=>a.id==='INTERCEPTOR').body.map(r=>parseInt(r,2)),colour:0x44,shape:0,label:'ASSAULT / 44'},
  {body:old.stages[0][0],colour:0x46,shape:0,label:'PREVIOUS ARMOUR / 46'},
  {body:now.stages[0][0],colour:armourColour,shape:0,label:'TUNED ARMOUR / 68'}]]);
fs.writeFileSync(out+'preview-data.json',JSON.stringify({kind:'source-derived, not native capture',colours,
  masks:[...now.bytes],litBits:now.stages.map(s=>s.map(count)),
  removed:now.stages.map(s=>s.map(b=>count(s[0])-count(b)))},null,2)+'\n');
