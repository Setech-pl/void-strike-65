// Diagnostic standalone L2 linker: imports from a normal build; emits no ATR.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {toolchain,shareDir} from 'romdev-toolchain-cc65';
import {parseViceLabels} from './runtime-cycles.mjs';
export async function linkL2(source,out,build='build'){
 const base='/project/build/l2';
 async function tool(name,inputs,args,outputs){
  const factory=(await import(pathToFileURL(toolchain[name].gluePath))).default;
  const log=[];const m=await factory({noInitialRun:true,print:x=>log.push(x),printErr:x=>log.push(x)});
  for(const [p,b]of Object.entries(inputs)){m.FS.mkdirTree(path.posix.dirname(p));m.FS.writeFile(p,b);}
  const status=m.callMain(args);if(status)throw Error(`${name}: ${log.join('\n')}`);
  return Object.fromEntries(outputs.map(p=>[p,Buffer.from(m.FS.readFile(p))]));
 }
 const inputs={[base+'.s']:Buffer.from(source)};
 for(const [name,p]of Object.entries({'l2-abi.inc':'src/hybrid/l2-abi.inc','l2-main.inc':`${build}/l2-main.inc`,'l2-recipes.inc':`${build}/l2-recipes.inc`,'l2-c.inc':`${build}/l2-generated.s`}))inputs[`/project/build/${name}`]=fs.readFileSync(p);
 inputs['/cc65/asminc/longbranch.mac']=fs.readFileSync(path.join(shareDir,'asminc/longbranch.mac'));
 const a=await tool('ca65',inputs,['--cpu','6502','-g','-I','/cc65/asminc','-l',base+'.lst','-o',base+'.o',base+'.s'],[base+'.o',base+'.lst']);
 const l=await tool('ld65',{[base+'.o']:a[base+'.o'],[base+'.cfg']:fs.readFileSync('cfg/l2.cfg')},['-C',base+'.cfg','-o',base+'.bin','-m',base+'.map','-Ln',base+'.lbl',base+'.o'],[base+'.bin',base+'.map',base+'.lbl']);
 fs.mkdirSync(out,{recursive:true});for(const [p,b]of Object.entries({...a,...l}))fs.writeFileSync(path.join(out,path.basename(p)),b);
 const used=parseViceLabels(l[base+'.lbl'].toString()).get('l2_end')-0x1900;
 if(used>1536)throw Error(`L2 first contents ${used} B exceed approved 1536 B`);
 console.log(JSON.stringify({measurement:'MEASURED',out,used,remaining:1536-used}));return used;
}
if(process.argv[1]===new URL(import.meta.url).pathname)await linkL2(fs.readFileSync(process.argv[2],'utf8'),process.argv[3]);
