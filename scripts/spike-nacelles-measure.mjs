// Reproduce only the requested spike routes. Requires normal + three spike builds.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {spawn,spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'docs/diagnostics/spike-nacelles');
const node=process.execPath;
function run(args,env,log) {return new Promise((resolve,reject)=>{
 const file=fs.openSync(path.join(root,log),'w');
 const child=spawn(node,args,{cwd:root,env:{...process.env,...env},stdio:['ignore',file,file]});
 child.on('error',reject);child.on('exit',code=>{fs.closeSync(file);code===0?resolve():reject(new Error(`${log}: exit ${code}`));});
});}
if (process.argv.includes('--baseline')) {
 for (const route of ['flight','contact']) {
  await run(['scripts/runtime-wall-trace.mjs','--atari800-source=build/atari800-trace','--skip-boot-smoke',
   '--smoke-frames=2100','--smoke-difficulty=1','--only-session=observer-smoke'],
   {VS65_SPIKE_POLICY:route==='flight'?'sweep':'nacelle-contact'},`build/spike-main-${route}-pal.log`);
  const trace=path.join(root,'build/runtime-wall-trace');
  fs.writeFileSync(path.join(out,`main-${route}-medium.csv.gz`),zlib.gzipSync(fs.readFileSync(path.join(trace,'observer-smoke.csv'))));
  fs.copyFileSync(path.join(trace,'observer-smoke-focused-run.json'),path.join(out,`main-${route}-medium.json`));
  console.log(`main ${route}: PASS`);
 }
}
await Promise.all([1,2,3].map(async p=>{
 const dir=`build/spike-nacelles-p${p}`;
 const check=spawnSync(node,['scripts/spike-nacelles-check.mjs',dir],{cwd:root,encoding:'utf8'});
 fs.writeFileSync(path.join(root,`build/spike-p${p}-check.log`),check.stdout+check.stderr);
 if(check.status!==0)throw new Error(`P${p} correctness failed`);
 for(const route of ['flight','contact']) {
  const capture=route==='flight'||p===1;
  const captureDir=`${dir}/${route==='flight'?'capture':'contact-capture'}`;
  fs.mkdirSync(path.join(root,captureDir),{recursive:true});
  await run(['scripts/runtime-wall-trace.mjs','--atari800-source=build/atari800-trace',`--artifacts=${dir}`,
  '--smoke-frames=2100','--smoke-difficulty=1','--only-session=observer-smoke'],{
   VS65_SPIKE_POLICY:route==='flight'?'sweep':'nacelle-contact',
   ...(capture?{DFTRACE_FULL_SCREENSHOT:'1',DFTRACE_ENGINE_SCREENSHOT_GENERATION:'0',DFTRACE_ENGINE_SCREENSHOT_PREFIX:`${captureDir}/frame`,DFTRACE_ENGINE_SCREENSHOT_LIMIT:'1700'}:{})
  },`build/spike-p${p}-${route}-pal.log`);
  const trace=path.join(root,dir,'runtime-wall-trace');
  fs.writeFileSync(path.join(out,`p${p}-${route}-medium.csv.gz`),zlib.gzipSync(fs.readFileSync(path.join(trace,'observer-smoke.csv'))));
  fs.copyFileSync(path.join(trace,'observer-smoke-focused-run.json'),path.join(out,`p${p}-${route}-medium.json`));
  fs.copyFileSync(path.join(trace,'observer-smoke-watch.json'),path.join(out,`p${p}-${route}-watch.json`));
  fs.copyFileSync(path.join(root,`build/spike-p${p}-${route}-pal.log`),path.join(out,`p${p}-${route}-pal.log`));
  console.log(`P${p} ${route}: PASS`);
 }
 fs.copyFileSync(path.join(root,dir,'nacelle-correctness.json'),path.join(out,`p${p}-correctness.json`));
 fs.copyFileSync(path.join(root,`build/spike-p${p}-build.log`),path.join(out,`p${p}-build.log`));
}));
for(const args of [['scripts/spike-nacelles-attribution.mjs'],['scripts/spike-nacelles-gifs.mjs'],['scripts/spike-nacelles-gifs.mjs','--contact'],['scripts/spike-nacelles-report.mjs']]) {
 const run=spawnSync(node,args,{cwd:root,encoding:'utf8'});if(run.status!==0)throw new Error(run.stdout+run.stderr);
}
console.log('Refreshed attribution, GIFs and summary.');
