// Focused throttle A/B only, ordinary joystick input. No full trace suite.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {spawn} from 'node:child_process';
import {parseViceLabels} from './runtime-cycles.mjs';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'docs/diagnostics/spike-nacelles/throttle');
fs.mkdirSync(out,{recursive:true});
function run(args,env,log){return new Promise((resolve,reject)=>{
 const fd=fs.openSync(log,'w');
 const child=spawn(process.execPath,args,{cwd:root,env:{...process.env,...env},stdio:['ignore',fd,fd]});
 child.on('error',reject);child.on('exit',code=>{fs.closeSync(fd);code===0?resolve():reject(Error(`${log}: ${code}`));});
});}
for(const variant of (process.argv.includes('--off-only')?['off']:process.argv.includes('--on-only')?['on']:['off','on'])){
 const dir=`build/spike-nacelles-p5${variant==='on'?'-throttle':''}`;
 const labels=parseViceLabels(fs.readFileSync(path.join(root,dir,'void-strike-65.lbl'),'utf8'));
 for(const[d,difficulty]of ['easy','medium','hard'].entries()){
  const id=`${variant}-${difficulty}`,stem=`build/throttle-${id}`;
  const capture=variant==='on'&&d===0&&!process.argv.includes('--no-capture');
  const prefix=`${dir}/throttle-capture/frame`;
  if(capture)fs.mkdirSync(path.dirname(path.join(root,prefix)),{recursive:true});
  await run(['scripts/runtime-wall-trace.mjs',`--artifacts=${dir}`,
   '--atari800-source=build/atari800-trace',
   ...(process.argv.includes('--prepare')&&variant==='off'&&d===0?['--prepare']:[]),
   '--smoke-frames=2800',`--smoke-difficulty=${d}`,'--only-session=observer-smoke'],{
    VS65_SPIKE_POLICY:'throttle-bottom',DFTRACE_ISLANDS_ENABLED:'1',
    DFTRACE_ISLAND_OUTPUT:`${stem}-islands.csv`,DFTRACE_THROTTLE_OUTPUT:`${stem}-clock.csv`,
    DFTRACE_WORLD_ACC:String(labels.get('scroll_accumulator')),
    DFTRACE_HULL_ACC:String(labels.get('BROAD_RASTER_TOP')-1),
    ...(variant==='on'?{DFTRACE_THROTTLE_RATE:String(labels.get('spike_scroll_rate'))}:{}),
    ...(capture?{DFTRACE_FULL_SCREENSHOT:'1',DFTRACE_ENGINE_SCREENSHOT_GENERATION:'0',
     DFTRACE_ENGINE_SCREENSHOT_PREFIX:prefix,DFTRACE_ENGINE_SCREENSHOT_LIMIT:'2000'}:{}),
   },path.join(root,`${stem}.log`));
  for(const [suffix,file]of [['','observer-smoke.csv'],['-report','observer-smoke-focused-run.json'],['-watch','observer-smoke-watch.json']]){
   const bytes=fs.readFileSync(path.join(root,dir,'runtime-wall-trace',file));
   fs.writeFileSync(path.join(out,`${id}${suffix}${suffix?'.json':'.csv.gz'}`),suffix?bytes:zlib.gzipSync(bytes));
  }
  for(const side of ['clock','islands'])fs.writeFileSync(path.join(out,`${id}-${side}.csv.gz`),zlib.gzipSync(fs.readFileSync(path.join(root,`${stem}-${side}.csv`))));
  fs.copyFileSync(path.join(root,`${stem}.log`),path.join(out,`${id}.txt`));
  console.log(`${id}: PASS`);
 }
}
