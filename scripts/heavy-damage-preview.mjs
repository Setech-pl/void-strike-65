// Source-derived PMG preview: rows armoured/Bomber; columns intact/stage1/stage2.
import fs from 'node:fs';
import {compileHeavyDamage} from './heavy-damage.mjs';
import {encodePng} from './preview.mjs';
import {atari800PalRgb} from './atari800-pal-palette.mjs';
const {stages}=compileHeavyDamage(),width=768,height=280,rgb=Buffer.alloc(width*height*3,4);
for(let shape=0;shape<2;shape++)for(let stage=0;stage<3;stage++) {
  const c=atari800PalRgb(shape?[0xc8,0xc6,0xc4][stage]:0x46);
  for(let row=0;row<16;row++)for(let bit=0;bit<8;bit++)if(stages[shape][stage][row]&(0x80>>bit)) {
    const x=32+stage*256+bit*(shape?24:16),y=20+shape*140+row*6;
    for(let dy=0;dy<6;dy++)for(let dx=0;dx<(shape?24:16);dx++)for(let ch=0;ch<3;ch++)rgb[((y+dy)*width+x+dx)*3+ch]=c[ch];
  }
}
const file=process.argv[2]??'build/heavy-damage-variant-c.png';
fs.writeFileSync(file,encodePng(rgb,width,height));console.log(file);
