// Diagnostic state schema shared by the existing native and NMOS fixtures.
// End of main-loop iteration, before the next frame's input. No guest writes.
import fs from 'node:fs';
import path from 'node:path';
export function stateMask(build) {
  const mask=Buffer.alloc(65536), ranges=[];
  const add=(start,end,name)=>{mask.fill(1,start,end);ranges.push({start,end,name});};
  add(0x80,0x91,'positions, counters, RNG, score, input');
  add(0x99,0xa0,'game/frontend/input/audio state');
  add(0xac,0xc4,'session statistics and boss lance state');
  add(0x3b00,0x5400,'PMG, screen, character banks, hull maps, resident state and HUD');
  add(0x7f10,0x813b,'display lists, Light slots, entity/effect pool, Director and C state');
  add(0x8140,0x8602,'27-row playfield ring, row tables and resident caches');
  add(0xaa00,0xae00,'level data and geometry');
  for(const file of fs.readdirSync(build).filter(f=>f.endsWith('.map'))) {
    const body=fs.readFileSync(path.join(build,file),'utf8').split('Segment list:')[1]?.split('Exports list')[0]??'';
    for(const m of body.matchAll(/^(\w+)\s+([0-9A-F]{6})\s+([0-9A-F]{6})\s+([0-9A-F]{6})/gm)) {
      if(/BSS|STATE|PROJECTILES/.test(m[1])) add(parseInt(m[2],16),parseInt(m[3],16)+1,`${file}:${m[1]}`);
    }
  }
  return {mask,ranges,bytes:mask.reduce((a,b)=>a+b,0)};
}
export function stateHash(memory,mask) {
  let hash=14695981039346656037n;
  for(let i=0;i<65536;i++) if(mask[i])hash=BigInt.asUintN(64,(hash^BigInt(memory[i]))*1099511628211n);
  return hash.toString(16).padStart(16,'0');
}
