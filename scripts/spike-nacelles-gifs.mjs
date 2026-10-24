import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {encodeGif} from './showcase-gif.mjs';
import {readIndexedPng} from './github-showcase.mjs';
const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'docs/diagnostics/spike-nacelles');
const contact=process.argv.includes('--contact');
function encode(p,first,end,kind) {
 const prefix=path.join(root,`build/spike-nacelles-p${p}/${kind==='contact'?'contact-capture':'capture'}/frame`);
 const colours=[],map=new Map(),frames=[];
 for(let f=first;f<end;f++) {
  const img=readIndexedPng(fs.readFileSync(`${prefix}-${String(f).padStart(3,'0')}.png`));
  assert.equal(img.width,384);assert.equal(img.height,240);
  const pixels=new Uint8Array(320*240);
  for(let y=0;y<240;y++)for(let x=0;x<320;x++) {
   const i=img.indices[y*384+x+32]*3;
   const rgb=[...img.palette.subarray(i,i+3)],key=rgb[0]*65536+rgb[1]*256+rgb[2];
   let c=map.get(key);if(c===undefined){c=colours.length;map.set(key,c);colours.push(rgb);}
   pixels[y*320+x]=c;
  }
  frames.push({pixels,delay:2});
 }
 assert.ok(colours.length<256);assert.ok((end-first)<=750);
 const {bytes,frames:encodedFrames}=encodeGif({width:320,height:240,colours,frames});
 const file=`p${p}-${kind}-medium.gif`;fs.writeFileSync(path.join(output,file),bytes);
 const atr=fs.readFileSync(path.join(root,`build/spike-nacelles-p${p}/void-strike-65.atr`));
 const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
 return {file,pattern:p,kind,difficulty:'MEDIUM',frames:[first,end-1],seconds:(end-first)/50,encodedFrames,bytes:bytes.length,sha256:hash(bytes),atrSha256:hash(atr),source:'native Atari800 PAL ATR; full indexed capture, crop x=32; ordinary joystick',colours:colours.length};
}
let entries=[];
if(contact) {
 const [h,...rows]=zlib.gunzipSync(fs.readFileSync(path.join(output,'p1-contact-medium.csv.gz'))).toString().trim().split('\n').map(s=>s.split(','));
 const rs=rows.map(v=>Object.fromEntries(h.map((k,i)=>[k,+v[i]])));
 const hit=rs.find(r=>r.sector_state<5&&r.player_health-r.player_health_after===2&&[88,92].includes(r.player_x_after));
 assert.ok(hit,'no deliberate nacelle contact');
 entries=[encode(1,hit.frame-30,hit.frame+170,'contact')];entries[0].contactFrame=hit.frame;entries[0].health=[hit.player_health,hit.player_health_after];
} else for(let p=1;p<=3;p++) entries.push(encode(p,850,1550,'flight'));
const name=contact?'gif-contact.json':'gif-flight.json';fs.writeFileSync(path.join(output,name),JSON.stringify(entries,null,2)+'\n');console.log(entries);
