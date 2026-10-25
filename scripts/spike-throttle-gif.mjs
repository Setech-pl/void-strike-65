import fs from'node:fs';import path from'node:path';import crypto from'node:crypto';import assert from'node:assert/strict';
import{encodeGif}from'./showcase-gif.mjs';import{readIndexedPng}from'./github-showcase.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'docs/diagnostics/spike-nacelles');
const prefix=path.join(root,'build/spike-nacelles-p5-throttle/throttle-capture/frame');
const colours=[],map=new Map(),frames=[],first=1350,count=400;
for(let f=first;f<first+count;f++){
 const img=readIndexedPng(fs.readFileSync(`${prefix}-${String(f).padStart(3,'0')}.png`));assert.equal(img.width,384);
 const pixels=new Uint8Array(320*240);
 for(let y=0;y<240;y++)for(let x=0;x<320;x++){
  const p=img.indices[y*384+x+32]*3,rgb=[...img.palette.subarray(p,p+3)],key=rgb[0]*65536+rgb[1]*256+rgb[2];
  let c=map.get(key);if(c===undefined){c=colours.length;colours.push(rgb);map.set(key,c);}pixels[y*320+x]=c;
 }frames.push({pixels,delay:2});
}
assert.ok(colours.length<256);
const {bytes}=encodeGif({width:320,height:240,colours,frames});
const output=path.join(out,'p5-throttle-bottom.gif');fs.writeFileSync(output,bytes);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const metadata={path:output,first,last:first+count-1,seconds:count/50,sha256:sha(bytes),atrSha256:sha(fs.readFileSync(path.join(root,'build/spike-nacelles-p5-throttle/void-strike-65.atr'))),brakeDown:1400,fullySlow:1407,release:1600,fullyNormal:1607};
fs.writeFileSync(path.join(out,'throttle/gif.json'),JSON.stringify(metadata,null,2)+'\n');console.log(metadata);
