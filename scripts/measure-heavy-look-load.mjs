// Linked checked content-load measurement. Uses the existing serial-drive
// fixture: CPU/sector counts are real emulated instructions, not PAL time.
// VS65_HARNESS_BUILD=<snapshot-name> selects an isolated reference build.
import fs from 'node:fs';
import {bossGateMemory,Drive,cpuOver,runUntil,label,buildPath,manifest} from '../tests/boss-harness.mjs';

const memory=bossGateMemory();memory[0x86b3]=0;
const drive=new Drive(),cpu=cpuOver(drive,memory);cpu.pc=0x1900;cpu.sp=255;
const space=parseInt(fs.readFileSync(buildPath('l2.lbl'),'utf8').match(/^al ([0-9a-f]+) \.l2_space$/mi)[1],16);
const end=runUntil(cpu,{armed:space,rejected:label('reader','sector_reader_failure_screen')});
if(end!=='armed'||memory[0x86b3]!==1)throw Error('Checked content load did not arm');
console.log(JSON.stringify({measurement:'MEASURED linked NMOS checked content-load fixture; synthetic drive, not physical host frames',
  end,cpuCycles:cpu.cycles,driveFixtureFrames:drive.frames,readSectors:drive.readSectors,
  contentUsed:manifest.contentModule.usedBytes,
  contentRun:manifest.overlays.runs.find(r=>r.index===manifest.contentModule.runIndex)},null,2));
