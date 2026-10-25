import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import{auditSession}from'./pal-timing-audit.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'docs/diagnostics/spike-nacelles/throttle');
function rows(file){const[h,...v]=zlib.gunzipSync(fs.readFileSync(path.join(out,file))).toString().trim().split('\n').map(x=>x.split(','));return v.map(a=>Object.fromEntries(h.map((k,i)=>[k,isNaN(+a[i])?a[i]:+a[i]])));}
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
const peak=r=>r.reduce((a,b)=>!a||b.wall_cycles>a.wall_cycles?b:a,null),mean=r=>r.reduce((s,x)=>s+x.wall_cycles,0)/r.length;
const report={baseline:'P5 ad3e108, islands and capital debris off',flagOffSha256:sha('dist/void-strike-65.atr'),difficulties:[]};
assert.equal(report.flagOffSha256,'410652973ed76f0033f0fbff84c17a484104f95ff97cbcc1d9eff9e6cb996ae7');
for(let d=0;d<3;d++){
 const name=['easy','medium','hard'][d],normal=16+2*d,half=normal/2,item={difficulty:d,name};
 for(const variant of ['off','on']){
  const id=`${variant}-${name}`,r=rows(`${id}.csv.gz`),clock=rows(`${id}-clock.csv.gz`),islands=rows(`${id}-islands.csv.gz`);
  assert.equal(r.length,2800);assert.equal(clock.length,2800);assert.equal(islands.length,2800);
  const audit=auditSession(id,r);assert.ok(audit.passed);assert.equal(audit.rows_over_target,0);
  assert.ok(r.every(x=>x.missed_frames===0&&x.extra_vbi_boundaries===0&&x.dli_sequence_violations===0));
  assert.ok(islands.every(x=>x.corrupt_cells===0));assert.ok(clock.every(x=>x.world_acc===x.hull_acc&&x.world_acc>=0&&x.world_acc<40));
  assert.ok(clock.every(x=>x.shell_unowned_missing===0),'unowned missing shell cell');
  assert.ok(clock.every(x=>x.rate>=half&&x.rate<=normal));
  const cap=r.filter(x=>x.director_sector===1),slow=cap.filter(x=>clock[x.frame].rate===half),ramp=cap.filter(x=>clock[x.frame].rate>half&&clock[x.frame].rate<normal),steady=cap.filter(x=>clock[x.frame].rate===normal&&x.sector_state<5);
  assert.ok(cap.length&&r.at(-1).director_sector>1,'route must finish capital');
  const pick=x=>x?{frame:x.frame,wall:x.wall_cycles,phase:islands[x.frame].phase,rate:clock[x.frame].rate}:null;
  let shellFrames=0;
  for(const x of r)for(let s=0;s<3;s++){
   // This frame's publication is checked against its logical row/pointer.
   // broad*_raster_row maps the earlier ANTIC list at a different observation
   // phase and must not be paired with the new row's cache.
   if(x[`broad${s}_state`]===2){shellFrames++;assert.equal(x[`broad${s}_raster_top`],x[`broad${s}_row`]*8+9,'shell cache differs from published row');}
   assert.equal(x.broad_pointer_errors,0);assert.equal(x.broad_screen_orphan_cells,0);
  }
  const returnWindow=clock.slice(1250,1250+normal-half).map(x=>x.rate);
  if(variant==='on')assert.deepEqual(returnWindow,Array.from({length:normal-half},(_,i)=>half+i+1));
  const binding=read(`docs/diagnostics/spike-nacelles/throttle/${id}-report.json`).artifact_sha256['void-strike-65.atr'].sha256;
  assert.equal(binding,sha(`build/spike-nacelles-p5${variant==='on'?'-throttle':''}/void-strike-65.atr`));
  item[variant]={audit,capital:{frames:cap.length,peak:pick(peak(cap)),mean:mean(cap)},slow:{frames:slow.length,peak:pick(peak(slow)),mean:slow.length?mean(slow):null},ramp:{frames:ramp.length,peak:pick(peak(ramp)),mean:ramp.length?mean(ramp):null},normalHull:{frames:steady.length,mean:mean(steady)},coverage:{shellFrames,occludedShellCells:clock.reduce((s,x)=>s+x.shell_occluded,0),checkedCells:islands.reduce((s,x)=>s+x.checked_cells,0)},returnWindow};
 }
 item.delta={capitalPeak:item.on.capital.peak.wall-item.off.capital.peak.wall,capitalMean:item.on.capital.mean-item.off.capital.mean};report.difficulties.push(item);
}
const dir='build/spike-nacelles-p5-throttle',m=read(`${dir}/manifest.json`),base=read('build/spike-nacelles-p5/manifest.json');
report.bytes={...read('docs/diagnostics/spike-nacelles/throttle/correctness.json').bytes,totalWindow:read(`${dir}/spike-nacelles.json`).bytes,windowFree:1155-read(`${dir}/spike-nacelles.json`).bytes,diskDeltaVsP5:m.transportCapacity.totalTransportBytes-base.transportCapacity.totalTransportBytes,netResidencyVsMain:read(`${dir}/spike-nacelles.json`).bytes-9};
report.atr={path:path.join(root,dir,'void-strike-65.atr'),sha256:sha(`${dir}/void-strike-65.atr`)};
assert.equal(read('docs/diagnostics/spike-nacelles/throttle/gif.json').atrSha256,report.atr.sha256);
assert.equal(sha('docs/diagnostics/spike-nacelles/p5-throttle.atr'),report.atr.sha256);
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(report,null,2)+'\n');
for(const d of report.difficulties)console.log(d.name,JSON.stringify(d));console.log(report.bytes,report.atr);
