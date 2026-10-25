import fs from'node:fs';import path from'node:path';import zlib from'node:zlib';import crypto from'node:crypto';import assert from'node:assert/strict';
import{encodeGif}from'./showcase-gif.mjs';import{readIndexedPng}from'./github-showcase.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'docs/diagnostics/spike-nacelles'),evidence=path.join(out,'p5');
function rows(name){const[h,...rs]=zlib.gunzipSync(fs.readFileSync(path.join(evidence,name))).toString().trim().split('\n').map(x=>x.split(','));return rs.map(v=>Object.fromEntries(h.map((k,i)=>[k,+v[i]])));}
const atr=fs.readFileSync(path.join(root,'build/spike-nacelles-p5/void-strike-65.atr')),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function encode(d,route,first,count){const prefix=path.join(root,`build/spike-nacelles-p5/p5-${d}-${route}-capture/frame`),colours=[],map=new Map(),frames=[];
 for(let f=first;f<first+count;f++){let img=readIndexedPng(fs.readFileSync(`${prefix}-${String(f).padStart(3,'0')}.png`));assert.equal(img.width,384);let pixels=new Uint8Array(320*240);for(let y=0;y<240;y++)for(let x=0;x<320;x++){const p=img.indices[y*384+x+32]*3,rgb=[...img.palette.subarray(p,p+3)],key=rgb[0]*65536+rgb[1]*256+rgb[2];let c=map.get(key);if(c===undefined){c=colours.length;colours.push(rgb);map.set(key,c);}pixels[y*320+x]=c;}frames.push({pixels,delay:2});}
 assert.ok(colours.length<256&&count<=750);let{bytes}=encodeGif({width:320,height:240,colours,frames}),name=`p5-${route}-${d}.gif`;fs.writeFileSync(path.join(out,name),bytes);return{path:path.join(out,name),first,last:first+count-1,seconds:count/50,bytes:bytes.length,sha256:sha(bytes),atrSha256:sha(atr)};
}
const result=[];for(let d of['easy','hard']){const first=rows(`islands-${d}-flight-islands.csv.gz`).find(r=>r.island_cells>0).frame;result.push(encode(d,'flight',first-40,700));}
const r=rows('islands-easy-contact.csv.gz'),hit=r.find(x=>x.sector_state<5&&x.player_health-x.player_health_after===2&&[100,104,108,112,116,132,136,140,144,148].includes(x.player_x_after));assert.ok(hit,'no island contact');result.push({...encode('easy','contact',hit.frame-30,200),contactFrame:hit.frame,hull:[hit.player_health,hit.player_health_after]});
fs.writeFileSync(path.join(evidence,'gifs.json'),JSON.stringify(result,null,2)+'\n');console.log(result);
