// Diagnostic only. Reuse the registered native fixture, inject a real 6502
// busy-wait in a private emulator, record every physical raster + POKEY sample.
// node scripts/frame-overrun-spike.mjs space control|single|repeat [--forced]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {stateMask} from './frame-peak-state.mjs';
import {parseViceLabels} from './runtime-cycles.mjs';
const [scene,mode]=process.argv.slice(2);
if(!['space','capital','boss','hud-music'].includes(scene)||
   !['control','single','repeat'].includes(mode))throw Error('scene mode required');
const forced=process.argv.includes('--forced');
const root=process.cwd(),emulator='build/atari800-trace';
const build=scene==='capital'?'build/l2-capital-960':scene==='boss'?'build/level-1-s4':'build';
const id=`${scene}-${mode}${forced?'-forced':''}`;
const scratch=path.resolve('build/frame-overrun',id);
const evidence=path.resolve(process.env.VS65_OVERRUN_EVIDENCE??'build/phase-resync/cases',id);
fs.mkdirSync(scratch,{recursive:true});fs.mkdirSync(evidence,{recursive:true});
const run=(exe,args,options={})=>{
 const r=spawnSync(exe,args,{encoding:'utf8',maxBuffer:32*1024*1024,...options});
 if(r.status!==0)throw Error(`${exe} exited ${r.status}: ${r.stderr}\n${r.stdout}`);
 return r;
};
run(process.execPath,['scripts/l2-observer-images.mjs',build]);
const launchFile=`${scratch}/launch.json`;
run(process.execPath,['scripts/runtime-wall-trace.mjs',`--atari800-source=${emulator}`,
 ...(build==='build'?['--skip-boot-smoke']:[`--artifacts=${build}`]), '--smoke-frames=1600',`--only-session=${id}`,
 `--export-launch=${launchFile}`],{env:{...process.env,VS65_L2_POLICY:'l2-matrix',VS65_L2_SESSION:id,
 DFTRACE_HOLD_PLAYER_LIVES:'3'}});
const launch=JSON.parse(fs.readFileSync(launchFile));
const labels=parseViceLabels(fs.readFileSync(`${build}/void-strike-65.lbl`,'utf8'));
const {mask,logicalMask,...schema}=stateMask(build);
fs.writeFileSync(`${scratch}/mask.bin`,Buffer.concat([mask,logicalMask]));
fs.writeFileSync(`${evidence}/state-schema.json`,JSON.stringify(schema,null,2)+'\n');
const env={...launch.env,
 VS65_OVERRUN_EVENTS:`${evidence}/events.jsonl`,VS65_OVERRUN_SCENE:scene,
 VS65_OVERRUN_REPEAT:mode==='repeat'?'1':'0',
 VS65_OVERRUN_FORCED:mode==='control'?'2':forced?'1':'0',
 ...(scene==='hud-music'&&mode==='single'?{VS65_OVERRUN_MUSIC_ROW:String(labels.get('MUSIC_ROW_TIMER'))}:{}),
 ...(scene==='boss'&&mode==='repeat'&&forced?{
  VS65_OVERRUN_FALLBACK_WAIT:String(labels.get('wait_frame_at_line'))}:{}),
 VS65_OVERRUN_RGB:`${scratch}/frames.rgb`,VS65_OVERRUN_PCM:`${scratch}/audio.s16le`,
 VS65_OVERRUN_FRAMES:`${evidence}/physical-frames.csv`,
 VS65_FRAME_PROFILE:`${scratch}/profile.csv`,VS65_FRAME_STATES:`${evidence}/states.csv`,
 VS65_FRAME_STATE_MASK:`${scratch}/mask.bin`,
 VS65_FRAME_PHYSICAL:String(schema.tokens[0].address),
 VS65_FRAME_CONSUMED:String(schema.tokens[1].address),
 VS65_FRAME_SNAPSHOTS:`${evidence}/snapshots.bin.gz`,
 DFTRACE_OUTPUT:`${evidence}/trace.csv`,
 DFTRACE_L2_LIFETIME:`${evidence}/lifetime.jsonl`,
 DFTRACE_L2_OUTPUT:`${evidence}/clock.csv`,
 DFTRACE_L2_WORLD_ACC:String(labels.get('scroll_accumulator')),
 DFTRACE_L2_HULL_ACC:String(labels.get('HULL_SCROLL_ACCUMULATOR')??0x4e71),
 DFWATCH_OUTPUT:`${evidence}/watch.json`,DFSUMMARY_OUTPUT:`${scratch}/summary.jsonl`,
 DFTRACE_SECTOR_CLOCK_OUTPUT:`${scratch}/director.csv`,
 DFTRACE_FRAMES:'1600',
};
// Presence (including "0") rearms the lifetime observer's stop limit.
delete env.DFTRACE_L2_BOSS_FRAMES;
const logfd=fs.openSync(`${scratch}/emulator.log`,'w');
const result=spawnSync(launch.emulatorPath,launch.args,{env,stdio:['ignore',logfd,logfd],encoding:'utf8',
 maxBuffer:32*1024*1024,timeout:600000});
fs.closeSync(logfd);
if(result.status!==0)throw Error(`${id} emulator ${result.status}/${result.signal}/${result.error?.code}: see ${scratch}/emulator.log`);
if(!fs.existsSync(`${scratch}/frames.rgb`))throw Error(`${id}: scene never reached`);
run('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo',
 '-pixel_format','rgb24','-video_size','384x240','-framerate','49.8607597',
 '-i',`${scratch}/frames.rgb`,'-f','s16le','-ar','44100','-ac','1',
 '-i',`${scratch}/audio.s16le`,'-c:v','libx264','-crf','12','-preset','fast',
 '-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',
 `${evidence}/recording.mp4`]);
run('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','s16le','-ar','44100',
 '-ac','1','-i',`${scratch}/audio.s16le`,'-c:a','flac',`${evidence}/audio.flac`]);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const metadata={id,scene,mode,forced,baseline:run('git',['rev-parse','main']).stdout.trim(),
 atr:fs.existsSync(`${build}/void-strike-65.atr`)?`${build}/void-strike-65.atr`:'dist/void-strike-65.atr',
 video:{path:path.relative(root,`${evidence}/recording.mp4`),sha256:hash(`${evidence}/recording.mp4`),
 width:384,height:240,fps:49.8607597,physicalFrames:fs.statSync(`${scratch}/frames.rgb`).size/(384*240*3)},
 pcm:{sha256:hash(`${scratch}/audio.s16le`),samples:fs.statSync(`${scratch}/audio.s16le`).size/2},
 audioLossless:{path:path.relative(root,`${evidence}/audio.flac`),sha256:hash(`${evidence}/audio.flac`),sampleRate:44100,channels:1},
 guestBytesAdded:0,guestBytesTemporarilyPatched:mode==='control'?0:3};
metadata.atrSha256=hash(metadata.atr);
fs.writeFileSync(`${evidence}/provenance.json`,JSON.stringify(metadata,null,2)+'\n');
// Leave raw captures until visual/audio review is complete. They are ignored.
console.log(id,metadata.video.physicalFrames,'physical frames');
