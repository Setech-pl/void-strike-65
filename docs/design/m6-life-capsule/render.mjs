// Phase A art only. No build hook, runtime object, emulator patch or new dependency.
// Run from any directory: node docs/design/m6-life-capsule/render.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { encodePng } from '../../../scripts/preview.mjs';
import { atari800PalRgb } from '../../../scripts/atari800-pal-palette.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const output = path.join(root, 'build/play/m6-life-capsule');
const definition = JSON.parse(fs.readFileSync(path.join(here, 'looks.json')));
const source = fs.readFileSync(path.join(root, 'src/main.s'), 'utf8');
const masks = source.split('fighter_pickup_pmg_shape:')[1].split('.assert')[0]
  .split('\n').filter(line => /^\s*\.byte/.test(line))
  .flatMap(line => [...line.matchAll(/\$([0-9A-F]{2})/g)].map(m => parseInt(m[1], 16)));
if (masks.length !== 48) throw new Error('Expected three existing 16-row masks');

// Decode the repo's native RGB screenshot, retaining exact pixels. The top
// 16 rows (its historical HUD) are excluded: this is a background reference,
// not a claim about the current HUD or an implemented LIFE capsule.
function readRgb(png) {
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
  if (png[24] !== 8 || png[25] !== 2 || png[28] !== 0) throw new Error('Expected RGB8 PNG');
  const chunks = [];
  for (let i = 8; i < png.length;) {
    const n = png.readUInt32BE(i);
    if (png.toString('ascii', i + 4, i + 8) === 'IDAT') chunks.push(png.subarray(i + 8, i + 8 + n));
    i += n + 12;
  }
  const raw = zlib.inflateSync(Buffer.concat(chunks)), rgb = Buffer.alloc(w * h * 3), stride = w * 3;
  const paeth = (a,b,c) => {
    const p = a+b-c, x = Math.abs(p-a), y = Math.abs(p-b), z = Math.abs(p-c);
    return x <= y && x <= z ? a : y <= z ? b : c;
  };
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    if (filter > 4) throw new Error('Unsupported PNG filter');
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x, a = x >= 3 ? rgb[i-3] : 0;
      const b = y ? rgb[i-stride] : 0, c = y && x >= 3 ? rgb[i-stride-3] : 0;
      rgb[i] = raw[y * (stride+1) + 1 + x] + [0,a,b,(a+b)>>1,paeth(a,b,c)][filter];
    }
  }
  return { w,h,rgb };
}
const scene = readRgb(fs.readFileSync(path.join(root, 'docs/media/gameplay/02-standard-combat.png')));
const font = {
  ' ': [0,0,0,0,0,0,0],
  A:[14,17,17,31,17,17,17], B:[30,17,17,30,17,17,30],
  C:[14,17,16,16,16,17,14], D:[30,17,17,17,17,17,30],
  E:[31,16,16,30,16,16,31], F:[31,16,16,30,16,16,16],
  G:[14,17,16,23,17,17,15], K:[17,18,20,24,20,18,17],
  H:[17,17,17,31,17,17,17], I:[31,4,4,4,4,4,31],
  L:[16,16,16,16,16,16,31], M:[17,27,21,21,17,17,17],
  N:[17,25,21,19,17,17,17], O:[14,17,17,17,17,17,14],
  P:[30,17,17,30,16,16,16], R:[30,17,17,30,20,18,17],
  S:[15,16,16,14,1,1,30], T:[31,4,4,4,4,4,4],
  U:[17,17,17,17,17,17,14], X:[17,17,10,4,10,17,17],
  Y:[17,17,10,4,4,4,4],
  '6':[14,16,16,30,17,17,14],
};
const W = 320, H = 224, scale = 6;
function pixel(rgb,x,y,colour) {
  if (x < 0 || x >= W || y < 0 || y >= H) throw new Error('Out of canvas');
  rgb.set(colour,(y*W+x)*3);
}
function text(rgb,label,x,y,colour) {
  for (const ch of label) {
    const glyph = font[ch];
    if (!glyph) throw new Error(`Missing letter ${ch}`);
    glyph.forEach((row,j) => { for(let b=0;b<5;b++) if(row & (16>>b)) pixel(rgb,x+b,y+j,colour); });
    x += 6;
  }
}
function capsule(rgb,rows,x,y,colour) {
  if (rows.length !== 16 || rows.some(b => !Number.isInteger(b) || b<0 || b>255)) throw new Error('Invalid mask');
  rows.forEach((row,j) => {
    for(let bit=0;bit<8;bit++) if(row & (128>>bit)) {
      pixel(rgb,x+bit*2,y+j,colour); pixel(rgb,x+bit*2+1,y+j,colour);
    }
  });
}
fs.mkdirSync(output,{recursive:true});
const comparison = [];
for (const look of definition.looks) {
  const rgb = Buffer.from(scene.rgb.subarray(16*W*3,240*W*3));
  rgb.fill(0,0,29*W*3); // Editorial title band, clear of the screenshot's enemy.
  const white = atari800PalRgb(0x0c), gold = atari800PalRgb(0x1c), mint = atari800PalRgb(definition.colour);
  text(rgb,'LIFE CAPSULE LOOK MOCKUP X6',14,9,white);
  const names = ['RAPID','SPREAD','SHIELD',look.label];
  for(let i=0;i<4;i++) {
    const x = 40+i*76;
    capsule(rgb,i<3 ? masks.slice(i*16,i*16+16) : look.rows,x,75,i<3?gold:mint);
    const label = names[i];
    text(rgb,label,x+8-Math.floor(label.length*6/2),105,i<3?gold:mint);
  }
  text(rgb,'COMPARISON ONLY',14,151,white);
  text(rgb,'ONE CAPSULE IN GAME',14,162,white);
  comparison.push(rgb.subarray(60*W*3,120*W*3));
  const enlarged = Buffer.alloc(W*scale*H*scale*3);
  for(let y=0;y<H*scale;y++) for(let x=0;x<W*scale;x++) {
    const src = (Math.floor(y/scale)*W+Math.floor(x/scale))*3;
    rgb.copy(enlarged,(y*W*scale+x)*3,src,src+3);
  }
  const file = path.join(output,`${look.id}-x6.png`);
  fs.writeFileSync(file,encodePng(enlarged,W*scale,H*scale));
  console.log(path.relative(root,file));
}
const strip = Buffer.concat(comparison), stripHeight = 60*comparison.length;
const enlarged = Buffer.alloc(W*scale*stripHeight*scale*3);
for(let y=0;y<stripHeight*scale;y++) for(let x=0;x<W*scale;x++) {
  const src = (Math.floor(y/scale)*W+Math.floor(x/scale))*3;
  strip.copy(enlarged,(y*W*scale+x)*3,src,src+3);
}
fs.writeFileSync(path.join(output,'comparison-x6.png'),encodePng(enlarged,W*scale,stripHeight*scale));
