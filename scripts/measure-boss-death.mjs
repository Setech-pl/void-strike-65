// Focused native Atari800 PAL checks, including repeated direct-SIO reads.
// node scripts/measure-boss-death.mjs [--prepare] --build=build/level-1-s6 --region=1
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { compileBossRegion, loadBossRegionDraft, bossRegionDirectory } from "./boss-assets.mjs";
import { looks } from "./boss-art-preview.mjs";
import { TARGET_MACHINE, atari800SioArguments } from "./atari800-machine.mjs";
const root=process.cwd();
const arg=(n,d)=>process.argv.find(a=>a.startsWith(`--${n}=`))?.slice(n.length+3)??d;
const dir=path.resolve(arg("build","build")), region=Number(arg("region","1"));
const baseline=process.argv.includes("--baseline"), frames=Number(arg("frames",baseline?"74":"175"));
const source=path.join(root,"build/atari800-trace");
const run=(command,args,options={})=>{
  const p=spawnSync(command,args,{cwd:root,encoding:"utf8",maxBuffer:16*1024*1024,...options});
  if(p.status!==0) throw new Error(`${command} status ${p.status}\n${p.stdout}\n${p.stderr}`);
  return p;
};
const rebuildObserver=()=>{
  // Do not depend on the host make's header timestamp granularity.
  fs.rmSync(path.join(source,"src/atari800-cpu.o"),{force:true});
  run("make",["-j4"],{cwd:source});
};
if(process.argv.includes("--prepare")) {
  const normal=fs.readFileSync("scripts/atari800-wall-trace.h","utf8");
  fs.writeFileSync(path.join(source,"src/voidstrike65_trace.h"),
    "#define DFTrace_Observe DFTrace_ObserveUnused\n"+normal+
    "\n#undef DFTrace_Observe\n"+fs.readFileSync("scripts/atari800-boss-death-trace.h","utf8"));
  rebuildObserver();
}
if(process.argv.includes("--restore")) {
  fs.copyFileSync("scripts/atari800-wall-trace.h",path.join(source,"src/voidstrike65_trace.h"));
  rebuildObserver(); process.exit(0);
}
if(!fs.readFileSync(path.join(source,"src/voidstrike65_trace.h"),"utf8").includes("DFDB_POSITION_VALUE"))
  throw new Error("Prepare the focused observer with --prepare before running; restore it with --restore afterwards");
const repetitions=Number(arg("sio-count","0"));
if(repetitions) {
  const cases=[];
  for(let i=1;i<=repetitions;i++) {
    const scene=`sio-${String(i).padStart(2,"0")}`;
    const args=process.argv.slice(2).filter(a=>!a.startsWith("--sio-count=") && a!=="--prepare");
    const child=run(process.execPath,["scripts/measure-boss-death.mjs",...args,`--case=${scene}`,`--position=${(i*7+region*5)%64}`]);
    const records=child.stdout.trim().split("\n").filter(Boolean).map(JSON.parse);
    cases.push({trial:i,records});
    console.log(`R${region} SIO ${i}/${repetitions} PASS`);
  }
  const output=path.join(root,"build/play/boss-death-breakup/native",`r${region}-sio.json`);
  fs.writeFileSync(output,JSON.stringify({region,repetitions,cases},null,2)+"\n");
  process.exit(0);
}
const labels=f=>new Map([...fs.readFileSync(path.join(dir,f),"utf8").matchAll(/^al\s+([\da-f]+)\s+\.?([^\s]+)$/gmi)]
  .map(m=>[m[2],parseInt(m[1],16)]));
const main=labels("void-strike-65.lbl"), boss=labels("boss.lbl"), death=labels("boss-death.lbl"),
  reader=labels("sector-reader.lbl"), summary=labels("level-summary.lbl");
const all=new Map([...main,...labels("integration-glue.lbl"),...reader,...boss]);
const out=path.resolve(arg("output-dir","build/play/boss-death-breakup/native"));fs.mkdirSync(out,{recursive:true});
const scene=arg("case","");
const log=path.join(out,`r${region}${scene ? `-${scene}` : ""}.jsonl`);
const m=JSON.parse(fs.readFileSync(path.join(dir,"manifest.json")));
const r=compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root,m.boss.order[region-1])));
const fixture=path.join(out,`r${region}-spent.bin`);
fs.writeFileSync(fixture,Buffer.from(looks(r).allGone.flat().map(code=>r.nozzle.codes.includes(code&127) || code===r.field?.code ? 0:code)));
const weapon=arg("weapon",scene);
const last=r.modules.reduce((best,x,i)=>x.kind!=="armour" && Math.abs(x.x+x.width/2-(weapon==="left"?0:weapon==="right"?63:32))<best.d ?
  {i,d:Math.abs(x.x+x.width/2-(weapon==="left"?0:weapon==="right"?63:32))}:best,{i:0,d:999}).i;
const env={...process.env,SDL_VIDEODRIVER:"dummy",DFTRACE_FRAMES:"10000",DFTRACE_ACTIVE_FRAMES:"0",
  DFTRACE_FIRE_DELAY:"60000",DFTRACE_DIFFICULTY:"1",DFTRACE_POLICY:"neutral",DFTRACE_SESSION:"boss-death",
  DFTRACE_OUTPUT:path.join(out,"unused.csv"),DFTRACE_FRONTEND_DELAY:"300",DFDB_OUTPUT:log,DFDB_FIXTURE:fixture,DFDB_POSITION_VALUE:arg("position","65535"),DFDB_PHOTOS:scene?"0":"1",DFDB_FRAMES:String(frames),DFDB_RATES:arg("rates",""),DFDB_CROWN_DIR:arg("crown-dir","0"),DFDB_SHAKE_FORCE:arg("shake","-1")};
env.DFDB_LEVEL_LOAD=String(reader.get("sector_reader_load"));
env.DFDB_LEVEL_LOADED=String(summary.get("summary_level_loaded"));
env.DFDB_L2_DONE=String(m.l2 ? summary.get("summary_load_l2")+13 : 0);
if(m.l2){
 env.DFTRACE_L2_LIFETIME=log+".lifetime.jsonl";
 env.DFTRACE_L2_READ_RUN=String(reader.get("sector_reader_read_run"));
 env.DFTRACE_L2_IMAGE_SUM=String(fs.readFileSync(path.join(dir,"l2.bin")).reduce((v,b)=>(Math.imul(v,33)+b)>>>0,0));
 env.DFWATCH_OUTPUT=log+".writers.json";
}
if(!baseline) {
  for(const [key,name]of Object.entries({RATE_L:"_death_left_rate",RATE_R:"_death_right_rate",RATE_C:"_death_crown_rate",CROWN_DIR_ADDR:"_death_crown_dir",SHAKE_ADDR:"_death_shake"})) {
    if(death.has(name))env[`DFDB_${key}`]=`0x${death.get(name).toString(16)}`;
  }
  if(process.argv.includes("--strips"))env.DFDB_STRIPS=log+".strips";
}
const text=fs.readFileSync("scripts/runtime-wall-trace.mjs","utf8").split("const traceLabels = {")[1].split("\n};")[0];
for(const [,key,name] of text.matchAll(/(DFTRACE_\w+): "([^"]+)"/g)) if(all.has(name)) env[key]=`0x${all.get(name).toString(16)}`;
const pcs={MAIN:main.get("main_loop"),RESUME:main.get("resume_gameplay_dli_lo_operand"),
  BOSS_DLI:boss.get("boss_dli"),ENTER:all.get("_asm_boss_enter")??labels("encounter-director.lbl").get("_asm_boss_enter"),
  READ:boss.get("boss_read_run"),ENGINE:death.get("death_entry"),FRAME:death.get("death_frame_begin"),MENU:main.get("quit_gameplay_to_menu"),
  FENCE:death.get("death_pre_fence"),END:death.get("death_publish_end"),HANDOFF:death.get("death_handoff"),
  SUMMARY:summary.get("summary_level_end"),START:main.get("start_gameplay"),FAILURE:reader.get("sector_reader_failure_screen"),
  PHASE:boss.get("_boss_phase"),N:boss.get("_boss_n"),POSITION:boss.get("boss_shown_pos"),POSSTATE:boss.get("boss_pos"),DLI_POS:boss.get("boss_dli_pos"),
  DIR:boss.get("boss_dir"),STEP_TIMER:boss.get("boss_step_timer"),LAST:last,DLI:death.get("death_dli"),CLOCK:boss.get("_boss_clock_lo"),
  STROBE:baseline?0:boss.get("boss_dli"),READ_RING:baseline?0:boss.get("boss_death_dli"),FAST_HUD:baseline?0:boss.get("boss_death_hud"),
  TOP_DLI:death.get("death_dli_top_entry")??death.get("death_dli"),ACTIVE_LIST:main.get("PLAYFIELD_DLIST_A"),READ_SECTOR:reader.get("sector_reader_read_sector"),WIRE:reader.get("sector_reader_rs_wire"),NO_DEVICE:reader.get("sector_reader_rs_no_device"),DEVICE:reader.get("sector_reader_rs_device"),
  BAND_END:23+8*r.bandShownRows,SEPARATOR:main.get("GAMEPLAY_DIVIDER_SCREEN"),
  RELEASE:summary.get("summary_fire_release"),PRESS:summary.get("summary_fire_press")};
for(const [k,v]of Object.entries(pcs)) {if(!Number.isInteger(v))throw new Error(`Missing ${k}`);env[`DFDB_${k}`]=`0x${v.toString(16)}`;}
// No writes to the candidate medium: summary persistence uses an isolated copy.
const media=path.join(out,`r${region}${scene ? `-${scene}` : ""}.atr`);fs.copyFileSync(path.join(dir,"void-strike-65.atr"),media);
run(path.join(source,"src/atari800"),[TARGET_MACHINE,"-pal",...atari800SioArguments(root,{realSio:process.argv.includes("--real-sio")}),"-nobasic",
  "-nosound","-turbo","-no-video-accel","-no-vsync",media],{env,timeout:120000});
const result=fs.readFileSync(log,"utf8");console.log(result);
const rows=result.trim().split("\n").map(JSON.parse);
const timing=rows.find(x=>x.peakDmaOn), ending=rows.find(x=>x.restartedLevel);
if(!timing || !ending || timing.peakPreFence>24300 || timing.peakDmaOn>31500 || timing.minimumFence<500 ||
  ending.misses || ending.hudErrors || ending.shipErrors || ending.dliErrors || ending.readImageErrors || ending.readImageChecks<60 ||
  !ending.returnedToMenu || ending.sioFailures || ending.readAttempts!==m.boss.death.diskSectors || ending.readDliErrors ||
  (!baseline && (ending.readDlis<120 || ending.strobeFrames<60)) ||
  timing.dliCount!==frames*11 || ending.frames!==frames) throw new Error("Death gates failed");
