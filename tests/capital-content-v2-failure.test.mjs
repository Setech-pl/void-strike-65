import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Nmos6502} from '../scripts/nmos6502.mjs';
import {PokeyStub} from '../scripts/sio-fixture.mjs';
import {bossGateMemory,atrSector,label,manifest,readBuild,runUntil} from './boss-harness.mjs';

// Compare instructions exactly, resolving only the three named data references.
// Baseline bytes, symbols and map range were captured from the 5053697 build.
test('mandatory content failures retain the 5053697 error-screen and FIRE implementation',()=>{
 const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/sector-reader-error-5053697.json',import.meta.url)));
 const start=label('reader','sector_reader_failure_screen'),end=label('reader','sector_reader_drain_ready');
 const actual=Buffer.from(readBuild('sector-reader.bin').subarray(start-0xa000,end-0xa000));
 const expected=Buffer.from(baseline.hex,'hex');
 const map=/^SECTOR_READER\s+([0-9A-F]+)\s+([0-9A-F]+)/.exec(baseline.segmentMapLine);
 assert.ok(map,'baseline map must identify the reader segment');
 assert.equal(actual.length,expected.length,'instruction sequence length');
 for(const {symbol,low,high} of baseline.relocations){
  const current=label('reader',symbol),previous=baseline.labels[symbol];
  assert.ok(previous>=parseInt(map[1],16)&&previous<=parseInt(map[2],16),symbol);
  assert.equal(expected[low]|expected[high]<<8,previous,`5053697 reference to ${symbol}`);
  assert.equal(actual[low]|actual[high]<<8,current,`current reference to ${symbol}`);
  actual[low]=previous&255;actual[high]=previous>>8;
 }
 assert.deepEqual(actual,expected,'same instructions and targets by symbol, including FIRE control flow');
});
const sum=bytes=>{let v=0;for(const b of bytes){v+=b;if(v>255)v=(v&255)+1;}return v;};
function failedLoad(target,fault){
 const memory=bossGateMemory();memory[label('main','game_state')]=1;
 memory[label('main','MUSIC_ACTIVE')]=1;
 const run=manifest.overlays.runs.find(r=>r.index===(target==='l2'?11:manifest.contentModule.runIndex));
 let trigger=0,polls=[];
 const stub=new PokeyStub({respond:frame=>{
  const sector=frame[2]|frame[3]<<8,hit=sector===run.startSector;
  if(hit&&fault==='timeout')return [];
  if(hit&&fault==='SIO error')return [{byte:65},{byte:69}];
  const bytes=Buffer.from(atrSector(sector));
  if(hit&&fault==='image checksum')bytes[0]^=1;
  return [{byte:65},{byte:67},...Array.from(bytes,byte=>({byte})),
   {byte:sum(bytes)^(hit&&fault==='wire checksum'?1:0)}];
 }});
 const cpu=new Nmos6502(memory,{
  read:a=>{if(a===0xd010){polls.push(trigger);return trigger;}
   if(a===0xd20d){stub.advance();return stub.serin;}return stub.read(a);},
  write:(a,v)=>stub.write(a,v),
 });
 cpu.pc=label('summary','summary_level_loaded');cpu.sp=255;
 const end=runUntil(cpu,{error:label('reader','sector_reader_failure_screen'),
  summary:label('summary','summary_wait'),gameplay:label('main','start_gameplay')});
 assert.equal(end,'error',`${target} ${fault} must leave the normal summary path`);
 assert.equal(memory[0x86b3],0,'failed mandatory load cannot validate L2');
 const status=cpu.a;
 runUntil(cpu,{fire:label('reader','sector_reader_wait_for_fire')});
 assert.equal(memory[label('reader','sr_status')],status);
 const menu=label('main','quit_gameplay_to_menu');
 // Held FIRE cannot dismiss; release alone cannot dismiss; a fresh press exits.
 for(const value of [0,0,1,1]){
  trigger=value;const count=polls.length;
  for(let steps=0;polls.length===count;steps++){assert.ok(steps<10000);assert.notEqual(cpu.pc,menu);cpu.step();}
 }
 trigger=0;
 assert.equal(runUntil(cpu,{menu,summary:label('summary','summary_wait'),
  reload:0xa000,gameplay:label('main','start_gameplay')}),'menu');
 assert.deepEqual(polls,[0,0,1,1,0]);
 return {status,polls};
}
for(const fault of ['SIO error','timeout','wire checksum','image checksum'])
 test(`content ${fault} uses the L2 error and 5053697 FIRE-to-menu path`,()=>{
  assert.deepEqual(failedLoad('content',fault),failedLoad('l2',fault));
 });
