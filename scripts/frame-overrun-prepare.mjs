// Prepare a PRIVATE emulator copy. Never changes the source argument.
// First run: node scripts/frame-overrun-prepare.mjs /path/to/atari800-7.1.2
// Later runs: node scripts/frame-overrun-prepare.mjs
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const dest='build/atari800-trace';
if(!fs.existsSync(dest)) {
 const source=process.argv[2];
 if(!source)throw Error('Supply an existing Atari800 7.1.2 source tree');
 if(path.resolve(source)===path.resolve(dest))throw Error('Source must be separate');
 fs.cpSync(source,dest,{recursive:true});
}
if(fs.lstatSync(dest).isSymbolicLink())throw Error('Refuse shared emulator');
for(const name of ['frame-overrun-spike.h','frame-overrun-media.h','frame-peak-observer.h'])
 fs.copyFileSync(`scripts/${name}`,`${dest}/src/${name}`);
const cpuFile=`${dest}/src/cpu.c`;let cpu=fs.readFileSync(cpuFile,'utf8');
// A pristine upstream tree needs the ordinary observer installed first.
// Export-only preparation does not run a replay or release evidence.
if(!cpu.includes('#include "voidstrike65_trace.h"')||
   !cpu.includes('DFTrace_Observe(GET_PC(), A, X, Y, S);')) {
 const base=spawnSync(process.execPath,['scripts/runtime-wall-trace.mjs','--prepare',
  `--atari800-source=${dest}`,'--skip-boot-smoke','--smoke-frames=1',
  '--export-launch=build/frame-overrun-prepare-launch.json'],{stdio:'inherit'});
 if(base.status!==0)process.exit(base.status??1);
 cpu=fs.readFileSync(cpuFile,'utf8');
}
if(!cpu.includes('#include "frame-overrun-spike.h"'))
 cpu=cpu.replace('#include "voidstrike65_trace.h"',
  '#include "voidstrike65_trace.h"\n#include "frame-overrun-spike.h"\n#include "frame-peak-observer.h"');
if(!cpu.includes('fo_observe(GET_PC()'))
 cpu=cpu.replace('DFTrace_Observe(GET_PC(), A, X, Y, S);',
  'if (fo_observe(GET_PC(), A, X, Y, S)) {\n'+
  '            DFTrace_Observe(GET_PC(), A, X, Y, S);\n'+
  '            cc_before(GET_PC());\n        }');
if(!cpu.includes('fo_observe(GET_PC()'))throw Error('CPU observer anchor missing');
fs.writeFileSync(cpuFile,cpu);
const atariFile=`${dest}/src/atari.c`;let atari=fs.readFileSync(atariFile,'utf8');
if(!atari.includes('#include "frame-overrun-media.h"'))
 atari=atari.replace('void Atari800_Frame(void)',
  '#include "frame-overrun-media.h"\n\nvoid Atari800_Frame(void)');
if(!atari.includes('fo_media_frame();'))
 atari=atari.replace('\tPOKEY_Frame();','\tPOKEY_Frame();\n\tfo_media_frame();');
if(!atari.includes('fo_hold_input();'))
 atari=atari.replace('\tGTIA_Frame();','\tfo_hold_input();\n\tGTIA_Frame();');
fs.writeFileSync(atariFile,atari);
const r=spawnSync(process.execPath,['scripts/runtime-wall-trace.mjs','--prepare',
 `--atari800-source=${dest}`,'--skip-boot-smoke','--smoke-frames=1',
 '--export-launch=build/frame-overrun-prepare-launch.json'],{stdio:'inherit'});
if(r.status!==0)process.exit(r.status??1);
