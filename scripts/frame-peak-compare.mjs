// Exact masked RAM equality, independently of the per-iteration FNV streams.
// Physical-token exceptions are derived ONLY from a measured entry-fence miss.
import fs from 'node:fs';import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {csv,read,sha} from './frame-peak-results.mjs';
import {stateMask} from './frame-peak-state.mjs';
import {auditSession} from './pal-timing-audit.mjs';
import {validatePeakCoverage} from './frame-peak-routes.mjs';
const stateRows=p=>fs.readFileSync(p,'utf8').trim().split('\n').slice(1).map(l=>{
 const [frame,full,logical,physical,consumed]=l.split(',');
 return {frame:Number(frame),full,logical,physical:Number(physical),consumed:Number(consumed)};
});
// main.s wait_for_master_pal_frame: consume an already advanced token, or
// wait for exactly the next first DLI. Boss install explicitly snaps the pair.
export const nextConsumedToken=(physical,consumed)=>(physical+(physical===consumed?1:0))&255;
export function compareRoute(before,after,bdir,adir) {
 const btrace=csv(`${before.dir}/runtime-wall-trace/${before.id}.csv`),atrace=csv(`${after.dir}/runtime-wall-trace/${after.id}.csv`);
 const bpath=`${bdir}/${before.id}-states.csv`,apath=`${adir}/${after.id}-states.csv`;
 const b=stateRows(bpath),a=stateRows(apath);assert.equal(a.length,b.length,`${before.id}: row count`);
 assert.equal(b.length,btrace.length);assert.equal(a.length,atrace.length);
 const schema=stateMask(before.dir),candidate=stateMask(after.dir);
 assert.ok(schema.mask.equals(candidate.mask),`${before.id}: state schema changed`);
 const addresses=[...schema.mask.keys()].filter(i=>schema.mask[i]);
 const tokenOffsets=schema.tokens.map(t=>addresses.indexOf(t.address)).sort((a,b)=>a-b);
 const snapshot=p=>zlib.gunzipSync(fs.readFileSync(p));
 const bs=snapshot(`${bdir}/${before.id}-snapshots.bin.gz`),as=snapshot(`${adir}/${after.id}-snapshots.bin.gz`);
 assert.equal(bs.length,b.length*schema.bytes);assert.equal(as.length,bs.length);
 const rows=btrace.filter(r=>!r.boss_entry),audit=auditSession(before.id,rows);
 const firstCapital=rows.findIndex(r=>r.sector_state<7),entry=before.campaign?rows[firstCapital-1]?.frame:null;
 const misses=audit.miss_events.map(e=>e.frame);
 assert.ok(misses.every(frame=>before.campaign&&frame===entry),`${before.id}: non-entry timing exception`);
 assert.ok(misses.length<=1,`${before.id}: more than one removed physical frame`);
 const differences=[];let lost=0,space=0,minDelta=Infinity,maxDelta=-Infinity,fullEqual=0;
 let previousExpectedPhysical,previousExpectedConsumed;
 const segments=[];let offset=0;
 for(const token of tokenOffsets){segments.push([offset,token]);offset=token+1;}
 segments.push([offset,schema.bytes]);
 for(let i=0;i<a.length;i++) {
  assert.equal(a[i].frame,b[i].frame);
  if(a[i].logical!==b[i].logical) {
   const diffs=addresses.flatMap((address,j)=>schema.logicalMask[address]&&bs[i*schema.bytes+j]!==as[i*schema.bytes+j]
    ?[{address:`$${address.toString(16)}`,before:bs[i*schema.bytes+j],after:as[i*schema.bytes+j]}]:[]);
   assert.fail(`${before.id} logical mismatch at ${i}: ${JSON.stringify(diffs.slice(0,24))}`);
  }
  for(const [start,end]of segments)assert.ok(
   bs.subarray(i*schema.bytes+start,i*schema.bytes+end).equals(as.subarray(i*schema.bytes+start,i*schema.bytes+end)),
   `${before.id}/${i}: FNV matched but RAM differed`);
  const frameLossBefore=lost;
  if(misses.includes(i))lost++;
  const expectedPhysical=(b[i].physical-lost+256)%256;
  const expectedConsumed=i===0?b[i].consumed:atrace[i].boss_entry?expectedPhysical:
    nextConsumedToken(previousExpectedPhysical,previousExpectedConsumed);
  if(i>0)assert.equal(b[i].consumed,btrace[i].boss_entry?b[i].physical:nextConsumedToken(b[i-1].physical,b[i-1].consumed),
    `${before.id}/${i}: baseline master-token model disagreement`);
  for(const [token,expected]of [['physical',expectedPhysical],['consumed',expectedConsumed]]) {
   assert.equal(a[i][token],expected,`${before.id}/${i}: unexpected ${token} clock difference`);
   if(a[i][token]!==b[i][token])differences.push({frame:i,token,before:b[i][token],after:a[i][token],removedEntry:entry,
    delta:((a[i][token]-b[i][token]+384)%256)-128,
    reason:token==='physical'?'one fewer first-DLI boundary':'deterministic master-token consume/wait after that boundary removal'});
  }
  previousExpectedPhysical=expectedPhysical;previousExpectedConsumed=expectedConsumed;
  fullEqual+=a[i].full===b[i].full;
  const r=atrace[i],old=btrace[i];
  const bbase=btrace[0].start_host_frame,abase=atrace[0].start_host_frame;
  assert.equal((old.start_host_frame-bbase)-(r.start_host_frame-abase),frameLossBefore,
    `${before.id}/${i}: physical start-frame shift`);
  if(!r.boss_entry) {
   assert.equal((old.end_host_frame-bbase)-(r.end_host_frame-abase),lost,
     `${before.id}/${i}: physical end-frame shift`);
   if(r.profile_publication_begin&&old.profile_publication_begin)
    assert.equal((Math.floor(old.profile_publication_begin/35568)-bbase)-
      (Math.floor(r.profile_publication_begin/35568)-abase),lost,
      `${before.id}/${i}: physical publication-frame shift`);
  }
  if(!r.boss_entry&&r.sector_state===7&&r.boss_state===0) {
   const delta=r.wall_cycles-old.wall_cycles;
   assert.ok(delta<=0,`${before.id}/${i}: SPACE +${delta} cycles`);
   space++;minDelta=Math.min(minDelta,delta);maxDelta=Math.max(maxDelta,delta);
  }
 }
 return {id:before.id,rows:a.length,stateBytes:schema.bytes,logicalBytes:schema.bytes-2,
  logicalHashesIdentical:true,maskedRamIdentical:true,fullHashesIdenticalRows:fullEqual,
  physicalPresentationFramesIdenticalExceptEntryCorrection:true,
  masterTokenModelMatchedEveryRow:true,
  stateStreams:{before:sha(bpath),after:sha(apath)},removedPhysicalFrames:lost,
  spaceRows:space,spaceDelta:{min:minDelta,max:maxDelta},physicalTokenDifferences:differences};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 const [before,after,output]=process.argv.slice(2),b=read(`${before}/runs.json`),a=read(`${after}/runs.json`);
 validatePeakCoverage(b.map(r=>r.id));validatePeakCoverage(a.map(r=>r.id));
 const results=b.map(r=>compareRoute(r,a.find(s=>s.id===r.id),before,after));
 fs.writeFileSync(output,JSON.stringify({baseline:'main 6ea1ca5',physicalException:'one measured natural-entry fence miss only',results},null,2)+'\n');
 console.log(results.map(r=>`${r.id}: ${r.rows} exact logical RAM/hash rows; token differences ${r.physicalTokenDifferences.length}; SPACE delta ${r.spaceDelta.min}..${r.spaceDelta.max}`).join('\n'));
}
