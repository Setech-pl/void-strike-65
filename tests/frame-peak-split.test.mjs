import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as h from './boss-harness.mjs';
import {parseViceLabels} from '../scripts/runtime-cycles.mjs';
import {compileLevel,levelSourcePath,defaultHullAsset} from '../scripts/level-compiler.mjs';
import {ISLAND_DESCRIPTORS_OFFSET,ISLAND_SPANS_OFFSET,ISLAND_LOOKUP_OFFSET} from '../scripts/l2-islands.mjs';
const main=n=>h.label('main',n);
const l2=parseViceLabels(fs.readFileSync(h.buildPath('l2.lbl'),'utf8'));

test('frame split: statistics finish before the wait, publication remains after it, scan once',()=>{
 const m=h.bossGateMemory();
 for(const n of ['init_state','init_entity_effects','init_playfield_row_table','init_playfield_display_lists'])h.call(m,main(n));
 m[main('FIGHTER_PROJECTILE_PUBLICATION_FRAME')]=0;
 m[main('FIGHTER_PROJECTILE_ACTIVE')]=1;m[main('FIGHTER_PROJECTILE_LIFETIME')]=255;
 m[main('FIGHTER_PROJECTILE_X')]=124;m[main('FIGHTER_PROJECTILE_Y')]=200;
 m[0xac]=255;m[0xad]=0;
 const pixels=m.slice(0x3b00,0x4c00),order=[];
 const scan=h.label('reader','stats_scan'),publish=h.labelsOf.kernel.get('light_publish');
 let reads=0;
 const watch=pc=>{if(pc===scan)order.push('scan');if(pc===publish)order.push('publish');};
 const cpu=h.call(m,main('publish_fighter_projectile_overlays'),{
  hooks:{read:a=>a===0xd40b?Math.floor(reads++/2)%156:undefined},
  watch,stopAt:[main('wait_frame_at_line')]});
 assert.equal(cpu.pc,main('wait_frame_at_line'));
 assert.deepEqual(order,['scan']);assert.equal(m[0xac]|m[0xad]<<8,256);
 assert.deepEqual(m.slice(0x3b00,0x4c00),pixels,'pre-wait bookkeeping published gameplay cells');
 h.runUntil(cpu,{returned:0},{watch});
 assert.deepEqual(order,['scan','publish']);assert.equal(m[0xac]|m[0xad]<<8,256,'double scan');
});

test('frame split: four lookup stripes clear every cell, preserve guards and retain all span tags',()=>{
 const source=JSON.parse(fs.readFileSync(levelSourcePath(1),'utf8'));
 let maximum=0;
 for(const rows of [288,352,480,512,720,960]) {
  const level=compileLevel({...source,hull:{rows,turrets:3}},{hullAsset:defaultHullAsset()});
  for(let sector=0;sector<level.sectors.length;sector++) {
   const m=h.bossGateMemory();m.set(level.pages.geometry,0xac00);m.set(level.pages.islands,0xad00);m[0x80f6]=sector;
   const start=0xad00+ISLAND_LOOKUP_OFFSET;m.fill(0xa5,start,start+120);
   const before=m.slice(),writes=[];
   const cpu=h.call(m,l2.get('_l2_c_enter'),{hooks:{write:(a,v)=>{if(a>=start&&a<start+120)writes.push([a-start,v]);}}});
   maximum=Math.max(maximum,cpu.cycles);
   const clear=writes.filter(([,v])=>v===0).map(([i])=>i).sort((a,b)=>a-b);
   assert.deepEqual(clear,Array.from({length:120},(_,i)=>i),'each lookup byte must be cleared exactly once');
   const desc=ISLAND_DESCRIPTORS_OFFSET+2*sector;
   let at=level.pages.islands[desc],count=level.pages.islands[desc+1];
   const expected=new Uint8Array(120);
   while(count--) {
    const record=ISLAND_SPANS_OFFSET+at;
    const first=level.pages.islands[record],until=level.pages.islands[record+1],tag=level.pages.islands[record+2];
    for(let row=first;row<until;row++)expected[row]=tag+(row-first)+1;
    at+=6;
   }
   assert.deepEqual(m.slice(start,start+120),expected,`${rows}/${sector}: authored span tags`);
   assert.deepEqual(m.slice(0x1f00,0x2000),before.slice(0x1f00,0x2000),'protected L2 reserve');
   assert.deepEqual(m.slice(start-1,start),before.slice(start-1,start),'lookup prefix guard');
   assert.deepEqual(m.slice(start+120,0xae00),before.slice(start+120,0xae00),'lookup suffix guard');
  }
 }
 console.log(JSON.stringify({measurement:'NMOS6502 C entry across all sector/length fixtures',maximum}));
});
