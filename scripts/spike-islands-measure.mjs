// Only focused P5 routes: clean, debris-off control, then debris-off islands.
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import assert from 'node:assert/strict';import {spawn}from'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'docs/diagnostics/spike-nacelles/p5');
function run(args,env,log){return new Promise((resolve,reject)=>{let f=fs.openSync(log,'w');let c=spawn(process.execPath,args,{cwd:root,env:{...process.env,...env},stdio:['ignore',f,f]});c.on('error',reject);c.on('exit',code=>{fs.closeSync(f);code===0?resolve():reject(Error(`${log} exit ${code}`));});});}
const names=['easy','medium','hard'];
await Promise.all(['main','off','islands'].map(async variant=>{
 const dir=variant==='main'?'build':variant==='off'?'build/spike-debris-off':'build/spike-nacelles-p5';
 for(let d=0;d<3;d++)for(const route of['flight','contact']){
  const id=`${variant}-${names[d]}-${route}`;
  // The original baseline EASY flight also prepares the emulator. --fresh
  // deliberately reruns it when reproducing the entire evidence set.
  if(!process.argv.includes('--fresh')&&variant==='main'&&d===0&&route==='flight'&&fs.existsSync(path.join(out,`${id}.csv.gz`)))continue;
  const capture=variant==='islands'&&(route==='flight'&&d!==1||route==='contact'&&d===0);
  const cap=`${dir}/p5-${names[d]}-${route}-capture`;
  if(capture)fs.mkdirSync(path.join(root,cap),{recursive:true});
  const side=`build/p5-${id}-islands.csv`;
  await run(['scripts/runtime-wall-trace.mjs','--atari800-source=build/atari800-trace',...(variant==='main'?['--skip-boot-smoke']:[`--artifacts=${dir}`]),'--smoke-frames=2300',`--smoke-difficulty=${d}`,'--only-session=observer-smoke'],{
   VS65_SPIKE_POLICY:`islands-${route}`,DFTRACE_ISLAND_OUTPUT:side,
   ...(variant==='islands'?{DFTRACE_ISLANDS_ENABLED:'1'}:{}),
   ...(capture?{DFTRACE_FULL_SCREENSHOT:'1',DFTRACE_ENGINE_SCREENSHOT_GENERATION:'0',DFTRACE_ENGINE_SCREENSHOT_PREFIX:`${cap}/frame`,DFTRACE_ENGINE_SCREENSHOT_LIMIT:'2200'}:{})
  },path.join(root,`build/p5-${id}.log`));
  const trace=path.join(root,dir,'runtime-wall-trace');
  for(const [suffix,file]of[['trace','observer-smoke.csv'],['report','observer-smoke-focused-run.json'],['watch','observer-smoke-watch.json']]){
   const bytes=fs.readFileSync(path.join(trace,file));
   fs.writeFileSync(path.join(out,`${id}${suffix==='trace'?'.csv.gz':`-${suffix}.json`}`),suffix==='trace'?zlib.gzipSync(bytes):bytes);
  }
  const sideBytes=fs.readFileSync(path.join(root,side));fs.writeFileSync(path.join(out,`${id}-islands.csv.gz`),zlib.gzipSync(sideBytes));
  const [h,...rs]=sideBytes.toString().trim().split('\n').map(x=>x.split(','));const ix=h.indexOf('corrupt_cells');
  assert.ok(rs.every(x=>+x[ix]===0),`${id}: island background corruption; inspect sidecar`);
  fs.copyFileSync(path.join(root,`build/p5-${id}.log`),path.join(out,`${id}.txt`));
  console.log(`${id}: PASS`);
 }
}));
