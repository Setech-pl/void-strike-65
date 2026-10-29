// Assemble rejected C output without linking or relaxing any production gate.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {toolchain,shareDir} from 'romdev-toolchain-cc65';
const out='build/evidence/capital-content-v2/amendment2';fs.mkdirSync(out,{recursive:true});
for(const name of ['director','lifecycle']){
 const factory=(await import(pathToFileURL(toolchain.ca65.gluePath).href)).default;
 const log=[];const m=await factory({noInitialRun:true,print:x=>log.push(x),printErr:x=>log.push(x)});
 m.FS.mkdir('/in');m.FS.writeFile('/in/input.s',fs.readFileSync(`build/${name}-generated.s`));
 m.FS.writeFile('/in/longbranch.mac',fs.readFileSync(path.join(shareDir,'asminc/longbranch.mac')));
 const rc=m.callMain(['--cpu','6502','-g','-I','/in','-l','/in/output.lst','-o','/in/output.o','/in/input.s']);
 if(rc)throw Error(log.join('\n'));
 for(const ext of ['lst','o'])fs.writeFileSync(`${out}/${name}.${ext}`,m.FS.readFile('/in/output.'+ext));
}
const full=fs.readFileSync('src/c/director.c','utf8');
const body=full.slice(full.lastIndexOf('static void heavy_departure_tick(void)'),full.lastIndexOf('static uint8_t heavy_entry_ready(void)'));
const prefix=`typedef unsigned char uint8_t;
#define STATE_SECTOR (*(volatile uint8_t*)0x80f6)
#define STATE_WAVE_REMAINING (*(volatile uint8_t*)0x80fc)
#define CORE_SECTOR_COUNT 2
#define SECTOR_KIND_MASK 3
#define SECTOR_KIND_CAPITAL 1
extern uint8_t director_scratch0,director_scratch1,director_scratch2;
extern uint8_t sector_kind[],sector_len[],level_header[];
extern uint8_t heavy_departure,heavy_armoured,heavy_descent_mask;
extern volatile uint8_t sector_row_lo,sector_row_hi;
`;
for(const mode of ['before','after']){
 let source=body.replace('static void','void');
 if(mode==='before')source=source.replace('director_scratch2 = (uint8_t)(sector_row_hi << 5);\n    director_scratch2 |= (uint8_t)(sector_row_lo >> 3);','director_scratch2 = (uint8_t)((sector_row_hi << 5) | (sector_row_lo >> 3));');
 const log=[];const f=(await import(pathToFileURL(toolchain.cc65.gluePath).href)).default;
 const m=await f({noInitialRun:true,print:x=>log.push(x),printErr:x=>log.push(x)});
 m.FS.writeFile('/input.c',prefix+source);
 if(m.callMain(['--cpu','6502','-Oirs','-o','/out.s','/input.c']))throw Error(log.join('\n'));
 const asm=m.FS.readFile('/out.s');fs.writeFileSync(`${out}/tick-${mode}.s`,asm);
 const a=(await import(pathToFileURL(toolchain.ca65.gluePath).href)).default;
 const n=await a({noInitialRun:true,print:x=>log.push(x),printErr:x=>log.push(x)});
 n.FS.writeFile('/input.s',asm);n.FS.writeFile('/longbranch.mac',fs.readFileSync(path.join(shareDir,'asminc/longbranch.mac')));
 if(n.callMain(['--cpu','6502','-I','/','-l','/out.lst','-o','/out.o','/input.s']))throw Error(log.join('\n'));
 fs.writeFileSync(`${out}/tick-${mode}.lst`,n.FS.readFile('/out.lst'));
}
