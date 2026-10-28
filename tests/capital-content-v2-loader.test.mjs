import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Drive,cpuOver,runUntil,bossGateMemory,atrSector,label,manifest,buildPath} from './boss-harness.mjs';
const space=parseInt(fs.readFileSync(buildPath("l2.lbl"),"utf8").match(/^al ([0-9a-f]+) \.l2_space$/mi)[1],16);
const content=manifest.overlays.runs.find(r=>r.index===manifest.contentModule.runIndex);
for(const corrupt of [false,true])test(`content checked load ${corrupt?'rejects damaged data without arming':'arms only after all sectors pass'}`,()=>{
 const memory=bossGateMemory();memory[0x86b3]=0;
 const drive=new Drive({sectorOf:n=>{const bytes=Buffer.from(atrSector(n));if(corrupt&&n===content.startSector)bytes[0]^=1;return bytes;},
  onCommand:()=>assert.equal(memory[0x86b3],0,'unverified module armed during load')});
 const cpu=cpuOver(drive,memory);cpu.pc=0x1900;cpu.sp=255;
 const end=runUntil(cpu,{armed:space,rejected:label('reader','sector_reader_report_bad_image')});
 assert.equal(end,corrupt?'rejected':'armed');assert.equal(memory[0x86b3],corrupt?0:1);
 assert.deepEqual(drive.readSectors,Array.from({length:content.sectors},(_,i)=>content.startSector+i));
});
test('content call requires loaded validity and GAMEPLAY for every byte-valued phase',()=>{
 const initial=bossGateMemory();initial.set(fs.readFileSync(buildPath('content-module.bin')),0x1180);
 const word=a=>initial[a]|initial[a+1]<<8;
 const entry=word(word(0x190a)+1); // capital brake vector -> JSR guarded adapter
 const brake=parseInt(fs.readFileSync(buildPath('l2.lbl'),'utf8').match(/^al ([0-9a-f]+) \._l2_brake_tick$/mi)[1],16);
 let maximum=0;
 for(const valid of [0,1])for(let phase=0;phase<256;phase++){
  const m=Uint8Array.from(initial);m[0x86b3]=valid;m[label('main','game_state')]=phase;
  const cpu=cpuOver(new Drive(),m);cpu.pc=entry;cpu.sp=255;let calls=0;
  runUntil(cpu,{brake},{watch:pc=>{if(pc===0x1180)calls++;},maxSteps:100});
  maximum=Math.max(maximum,cpu.cycles);
  assert.equal(calls,valid&&phase===6?1:0,`phase ${phase}, valid ${valid}`);
 }
 console.log(JSON.stringify({measurement:"NMOS6502 guard plus no-op tick, excluding brake",maximumCpu:maximum,cases:512}));
});
