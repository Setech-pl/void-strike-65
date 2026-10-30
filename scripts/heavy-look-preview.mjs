// Source-derived PMG DOUBLE preview. Left: assault; right: armoured.
// node scripts/heavy-look-preview.mjs [output-directory]
import fs from 'node:fs';
import path from 'node:path';
import {compileHeavyLook, defaultArmouredRaiderLook} from './enemy-roster.mjs';
import {encodePng} from './preview.mjs';
import {atari800PalRgb} from './atari800-pal-palette.mjs';

const roster=JSON.parse(fs.readFileSync(new URL('../assets/graphics/enemy-roster.json',import.meta.url)));
const assault=roster.archetypes.find(a=>a.id==='INTERCEPTOR').body.map(r=>parseInt(r,2));
const armour=compileHeavyLook(defaultArmouredRaiderLook());
const width=640,height=180,rgb=Buffer.alloc(width*height*3,4),rects=[];
for(const [index,{rows,colour}] of [{rows:assault,colour:0x44},{rows:armour.subarray(0,14),colour:armour[16]}].entries()) {
  const c=atari800PalRgb(colour),hex='#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');
  for(let row=0;row<14;row++)for(let bit=0;bit<8;bit++)if(rows[row]&(0x80>>bit)) {
    const x=64+index*320+bit*24,y=48+row*6;
    rects.push(`<rect x="${x}" y="${y}" width="24" height="6" fill="${hex}"/>`);
    for(let dy=0;dy<6;dy++)for(let dx=0;dx<24;dx++)for(let channel=0;channel<3;channel++)rgb[((y+dy)*width+x+dx)*3+channel]=c[channel];
  }
}
const out=path.resolve(process.argv[2]??'build/m3h-session2/checkpoint-2');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'looks.png'),encodePng(rgb,width,height));
fs.writeFileSync(path.join(out,'looks.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="180" viewBox="0 0 640 180"><rect width="640" height="180" fill="#040404"/><g fill="#ddd" font-family="monospace" font-size="16"><text x="64" y="25">ASSAULT $44</text><text x="384" y="25">ARMOURED $46</text></g>${rects.join('')}<text x="64" y="165" fill="#999" font-family="monospace" font-size="12">PMG DOUBLE / source pixels x6 / Atari800 PAL palette</text></svg>\n`);
console.log(path.join(out,'looks.svg'));
