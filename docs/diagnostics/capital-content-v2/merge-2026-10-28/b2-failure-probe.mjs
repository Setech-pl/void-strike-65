import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const id=process.argv[2],root=path.resolve('build/b2-root-cause/'+id);
const h=await import(pathToFileURL(root+'/tests/boss-harness.mjs'));
const {Nmos6502,nmos6502Flags}=await import(pathToFileURL(root+'/scripts/nmos6502.mjs'));
const {PokeyStub}=await import(pathToFileURL(root+'/scripts/sio-fixture.mjs'));
const l=(link,n)=>h.label(link,n),manifest=h.manifest;
const checksum=data=>{let v=0;for(const b of data){v+=b;if(v>255)v=(v&255)+1;}return v;};
const cases=[];
for(const target of ['l2',...(manifest.contentModule?['content']:[])])for(const fault of ['good','device-error','timeout','wire-checksum','image-checksum']){
 const m=h.bossGateMemory();m[l('main','game_state')]=1;m[l('main','MUSIC_ACTIVE')]=1;const run=manifest.overlays.runs.find(r=>r.index===(target==='l2'?11:manifest.contentModule.runIndex));
 const commands=[];let targeted=0;
 const stub=new PokeyStub({respond:frame=>{
  const sector=frame[2]|frame[3]<<8;commands.push(sector);
  const hit=sector===run.startSector;if(hit)targeted++;
  if(hit&&fault==='timeout')return [];
  if(hit&&fault==='device-error')return[{byte:65},{byte:69}];
  const data=Buffer.from(h.atrSector(sector));
  if(hit&&fault==='image-checksum')data[0]^=1;
  return [{byte:65},{byte:67},...Array.from(data,byte=>({byte})),{byte:checksum(data)^(hit&&fault==='wire-checksum'?1:0)}];
 }});
 const cpu=new Nmos6502(m,{read:a=>{if(a===0xd20d){stub.advance();return stub.serin;}return stub.read(a);},write:(a,v)=>stub.write(a,v)});
 const end=0x7fff;cpu.push((end-1)>>8);cpu.push((end-1)&255);cpu.pc=l('summary','summary_level_loaded');
 let steps=0,endpoint;
 while(steps++<8000000){if(cpu.pc===l('summary','summary_wait')){endpoint='summary-wait';break;}if(cpu.pc===end){endpoint='returned-to-summary';break;}if(cpu.pc===l('reader','sector_reader_failure_screen')){endpoint='failure-screen';break;}cpu.step();}
 const beforeStart={L2_VALID:m[0x86b3],game_state:m[l('main','game_state')],status:m[l('reader','sr_status')],carry:!!(cpu.p&1)};
 // Follow the actual guarded START boundary, stopping before reader or gameplay work.
 const start=new Nmos6502(m);start.pc=l('main','start_gameplay');let startEnd;for(let n=0;n<20;n++){if(start.pc===0xa000){startEnd='checked-reader-reentry';break;}if(start.pc===l('main','start_gameplay')+8){startEnd='gameplay-body';break;}start.step();}
 cases.push({target,fault,endpoint: endpoint??'step-limit',steps,targeted,commands,beforeStart,startEnd});
}
console.log(JSON.stringify({id,atr:manifest.artifacts['void-strike-65.atr'].sha256,cases},null,2));
