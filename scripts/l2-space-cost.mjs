// CPU-only 6502 comparison, no DMA estimate: execute complete SPACE main-loop
// bodies on the same input route; count actual instructions outside raster waits.
import fs from 'node:fs';import path from 'node:path';
const build=process.argv[2]??'build';
if(path.resolve(build)!==path.resolve('build'))process.env.VS65_HARNESS_BUILD=path.basename(build);
const h=await import('../tests/boss-harness.mjs');
const main=n=>h.label('main',n);
const template=h.bossGateMemory();
for(const n of ['init_state','init_entity_effects','init_playfield_row_table','init_playfield_display_lists'])h.call(template,main(n));
const records=[];
for(let difficulty=0;difficulty<3;difficulty++)for(const x of [52,83,84,124,171,196])for(let accumulator=0;accumulator<40;accumulator++){
 const m=Uint8Array.from(template);m[main('DIFFICULTY_SETTING')]=difficulty;
 if(h.manifest.l2)h.call(m,0x191c);
 m[main('CAPITAL_SECTOR_STATE')]=7;m[main('PLAYER_LIFECYCLE')]=0;
 m[main('player_x')]=x;m[main('player_y')]=225;m[main('scroll_accumulator')]=accumulator;
 m[0x80fe]=0;m[0xd01f]=7;m[0xd300]=15;m[0xd010]=1;
 m[main('PHYSICAL_PAL_FRAME_ID')]=1;m[main('GAMEPLAY_PAL_FRAME_CONSUMED')]=0;
 const before=Uint8Array.from(m),predictor=h.call(before,main('world_rotate_due'));
 const cpu=h.cpuOver(new h.Drive({trig:()=>true}),m);let line=0;const inner=cpu.hooks.read;
 cpu.hooks.read=a=>a===0xd40b?Math.floor(line++/3)%156:inner(a);cpu.sp=255;cpu.pc=main('main_loop');
 let active=0,steps=0;
 const waiting=pc=>(pc>=main('wait_for_master_pal_frame')&&pc<main('wait_for_master_pal_frame_end'))||
   (pc>=main('wait_frame')&&pc<main('publish_fighter_projectile_overlays'))||
   (pc>=main('wait_frame_start')&&pc<main('show_loader'));
 do{const pc=cpu.pc,c=cpu.cycles;cpu.step();if(!waiting(pc))active+=cpu.cycles-c;
   if(++steps>2000000)throw Error(`SPACE fixture stuck $${cpu.pc.toString(16)}`);
 }while(cpu.pc!==main('main_loop'));
 if(m[main('CAPITAL_SECTOR_STATE')]!==7)throw Error('SPACE fixture entered capital');
 records.push({difficulty,x,accumulator,activeCpu:active,predictorCpu:predictor.cycles,predictorResult:predictor.a});
}
const output=process.argv[3]??'build/l2-space-cost.json';
fs.writeFileSync(output,JSON.stringify({build,route:'neutral joystick, released FIRE; empty SPACE field; complete main-loop body',
 measurement:'MEASURED CPU-only NMOS6502; raster busy waits excluded; DMA not estimated',records},null,2)+'\n');
console.log(`${records.length} SPACE frames -> ${output}`);
