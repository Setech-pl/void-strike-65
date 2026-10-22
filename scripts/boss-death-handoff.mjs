// Package the focused boss-breakup candidate after the native read checks.
// Generated media stays in build/; compact proof and SHA metadata go to docs/.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const root=process.cwd(), diag="docs/diagnostics/boss-death-breakup-2026-10-22";
const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const write=(name,value)=>fs.writeFileSync(`${diag}/${name}`,JSON.stringify(value,null,2)+"\n");
const manifest=read("build/manifest.json");
const before=JSON.parse(execFileSync("git",["show","e97244c:dist/void-strike-65-manifest.json"],{encoding:"utf8"}));
const variants=["level-1-s6","boss-region-2-level-1-s6","boss-region-3-level-1-s6","boss-region-4-level-1-s6"];
const names=["Blockade Breaker","Void Citadel","Siege Spine","Bastion"];
const records=file=>fs.readFileSync(file,"utf8").split("\n").filter(l=>l.startsWith("{")).map(JSON.parse);
const max=(rows,k)=>Math.max(...rows.filter(x=>k in x).map(x=>x[k]));
const min=(rows,k)=>Math.min(...rows.filter(x=>k in x).map(x=>x[k]));
const expected=manifest.boss.death.diskSectors;
const regions=variants.map((build,index)=>{
  const region=index+1, native=read(`build/play/boss-death-breakup/native/r${region}-sio.json`);
  if(native.repetitions!==20 || native.cases.length!==20)throw Error(`Incomplete R${region} SIO proof`);
  const canonical=records(`build/boss-death-r${region}-native.log`);
  const all=[...native.cases.flatMap(c=>c.records),...canonical];
  for(const x of all.filter(x=>x.restartedLevel)){
    for(const k of ["misses","hudErrors","shipErrors","dliErrors","readImageErrors","readDliErrors","sioFailures"])
      if(x[k])throw Error(`R${region} ${k}`);
    if(x.frames!==175 || x.readAttempts!==expected)throw Error(`R${region} duration/read count`);
  }
  if(max(all,"peakPreFence")>24300 || max(all,"peakDmaOn")>31500 || min(all,"minimumFence")<500)
    throw Error(`R${region} frame budget`);
  const old=records(region===1?"build/boss-death-read-baseline.log":`build/boss-death-baseline-r${region}.log`);
  const baseline=old.find(x=>x.restartedLevel);
  if(!baseline || baseline.sioFailures || baseline.readAttempts!==17)throw Error(`R${region} baseline`);
  const end=native.cases.map(c=>c.records.find(x=>x.restartedLevel));
  return {region,name:names[index],runs:20,framesPerRun:175,
    peakPreFence:max(all,"peakPreFence"),peakDmaOn:max(all,"peakDmaOn"),minimumFence:min(all,"minimumFence"),
    pauseHostFrames:max(all,"pauseHostFrames"),readClockFramesMin:min(all,"readPauseFrames"),readClockFramesMax:max(all,"readPauseFrames"),
    entryHostFrames:Math.ceil(max(all,"entryFrames")),checksumSectors:20*expected,retries:0,failures:0,timeouts:0,
    baselineWithoutDli:{runs:1,sectors:17,retries:0,failures:0,timeouts:0},
    readImageFrames:end.reduce((n,x)=>n+x.readImageChecks,0),
    strobeCpuTop:max(all,"strobeCpuTop"),strobeCpuRing:max(all,"strobeCpuRing"),strobeCpuHud:max(all,"strobeCpuHud"),
    strobeBlockPeak:max(all,"strobeBlockPeak"),strobeEntryWallPeak:max(all,"strobeDliWallPeak"),canonical,
    cases:native.cases.map(c=>({trial:c.trial,position:(c.trial*7+region*5)%64,
      ...c.records.find(x=>x.peakDmaOn),...c.records.find(x=>x.restartedLevel),
      ...c.records.find(x=>"pauseHostFrames"in x),readPauseFrames:c.records.find(x=>"readPauseFrames"in x).readPauseFrames}))};
});
write("revision-native.json",{date:"2026-10-23",status:"OWNER-SMOKE CANDIDATE",
  scope:"20 cold-entry native PAL ATR trials per region plus one authored-position capture. Spent-band/defeat RAM fixture; the normal below-band DLI publishes each varied pose. Observer does not patch guest opcodes. CPU costs are opcode-accounted, excluding ROM dispatch; block peak includes hardware NMI/ROM/DMA/WSYNC/RTI.",
  limits:{preFence:24300,dmaTarget:31500,dmaHard:32568,fenceMinimum:500,bossEntry:350},regions});
const jobs=[["campaign","build","dist/void-strike-65.atr"],
  ...variants.map((d,i)=>[["r1-breaker","r2-citadel","r3-spine","r4-bastion"][i],`build/${d}`])];
const artifacts=jobs.map(([name,buildDirectory,source=`${buildDirectory}/void-strike-65.atr`])=>{
  const data=fs.readFileSync(source), sha256=crypto.createHash("sha256").update(data).digest("hex");
  const output=path.join(root,"build/play/boss-death-breakup",`boss-death-b-175-${name}-${sha256.slice(0,12)}.atr`);
  fs.copyFileSync(source,output);
  return{name,source,buildDirectory,path:output,bytes:data.length,sha256,launch:`atari800 -xl -pal -nobasic ${output}`};
});
write("candidate.json",{status:"OWNER-SMOKE CANDIDATE",branch:"codex/boss-death-breakup",date:"2026-10-23",
  revision:"DLI strobe; 175 PAL frames; half-speed flight",artifacts});
function disk(m){
  const used=new Set(),add=(s,n)=>{for(let i=s;i<s+n;i++)used.add(i)};
  add(1,m.transportCapacity.totalTransportSectors);
  for(const r of [...m.sectorReader.levels,...m.overlays.runs,...m.boss.runs,m.levelSummary.code,...m.levelSummary.art.runs])add(r.startSector,r.sectors);
  add(598,2);
  return{total:1040,used:used.size,free:1040-used.size,deathUsed:m.boss.death.diskSectors,deathReserved:32,deathFree:32-m.boss.death.diskSectors};
}
const afterDisk=disk(manifest);
write("revision-disk.json",{before:disk(before),after:afterDisk,
  onePointZeroConservative:{M3:3,M3H:1,M4:2,twelveLevelsAdditionalAt16Cap:179,remaining:afterDisk.free-6-179}});
write("revision-resources.json",{scope:"e97244c -> revised candidate; phase reuse, no new permanent allocation",
  before:{aCardBytes:47,cTakeoverBytes:81,engineCode:before.boss.death.codeBytes,engineDisk:1664,bootstrapCode:157,bootstrapDisk:512,deathSectors:17,privateScratchSpan:297,scratchCapacity:576,wingBuffer:512},
  after:{aUsefulCode:46,aSlotBytes:47,cTakeoverBytes:81,cReplacementNewInstructions:55,redundantGuardResetRemoved:3,cReplacementNet:52,
    engineCode:manifest.boss.death.codeBytes,engineDisk:(expected-4)*128,engineCodeCapacity:3584,engineCodeFree:manifest.boss.death.codeFree,
    bootstrapCode:157,bootstrapDisk:512,deathSectors:expected,privateScratchSpan:301,privateScratchHighWater:"$4D2D",scratchCapacity:576,scratchAboveHighWater:275,wingBuffer:512},
  permanentDelta:{resident:0,window:0,startBlock:0,DIRECTOR_RAM:0,DIRECTOR_C_LOW:0,lanceRun:0,page4:0},
  unchanged:{install:manifest.boss.install,slotA:manifest.boss.slotA,slotC:manifest.boss.slotC,
    initialContent:manifest.transportCapacity.initialBootContentBytes,remainingSafeResidency:manifest.transportCapacity.remainingSafeResidencyBytes}});
const fight=variants.map(build=>{
  const old=`build/boss-death-baseline/${build}`,now=`build/${build}`;
  const files=["resident-runtime.bin","entity-code-runtime.bin","pickup-code-runtime.bin","starfield-runtime.bin","a2-kernel-runtime.bin","sector-reader.bin",
    "overlay-boss-slot-d.bin","overlay-boss-slot-e.bin","overlay-boss-install.bin"];
  for(const f of files)if(!fs.readFileSync(`${old}/${f}`).equals(fs.readFileSync(`${now}/${f}`)))throw Error(`Fight code changed: ${build}/${f}`);
  let a=fs.readFileSync(`${old}/overlay-boss-slot-c.bin`),b=fs.readFileSync(`${now}/overlay-boss-slot-c.bin`);
  for(const[s,e]of[[0,0x4fc],[0x54e,0x71d]])if(!a.subarray(s,e).equals(b.subarray(s,e)))throw Error(`Hot C changed: ${build}`);
  a=fs.readFileSync(`${old}/overlay-boss-code.bin`);b=fs.readFileSync(`${now}/overlay-boss-code.bin`);
  const offsets=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])offsets.push(i);
  for(const i of offsets)if(!((i>=42&&i<=88)||(i>=591&&i<=618)||(i>=2026&&i<=2037)))throw Error(`Hot A changed: ${build}/${i}`);
  return{build,byteIdentical:files,hotC:"byte-identical outside cold death prep",hotA:"byte-identical outside cold death/entry bytes",aChangedOffsets:offsets};
});
write("fight-unchanged.json",fight);
console.log(JSON.stringify({regions:regions.map(({canonical,cases,...r})=>r),disk:afterDisk,
  artifacts:artifacts.map(({name,path,sha256})=>({name,path,sha256}))},null,2));
