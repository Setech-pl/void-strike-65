// Same NMOS6502 fixture for baseline and candidate, no DMA estimate.
import fs from 'node:fs';
const dir=process.argv[2],output=process.argv[3];process.env.VS65_HARNESS_BUILD=dir;
const h=await import('../tests/boss-harness.mjs');
const d=n=>h.label('director',n),main=n=>h.label('main',n),m=h.bossGateMemory();
m[main('game_state')]=6;h.call(m,d('_director_c_init'));
let sector=0;while((m[d('_sector_kind')+sector+1]&3)!==1){if(++sector>=8)throw Error('No pre-capital sector');}
m[0x80f6]=sector;m[d('_sector_len')+sector]=32;
if(h.labelsOf.director.has('_asm_cc2_enter'))h.call(m,d('_asm_cc2_enter'));
const records=[];
for(const row of [1,7,8,127,128,135,136,137,255]){
 const x=Uint8Array.from(m);x[d('_sector_row_lo')]=(row-1)&255;x[d('_sector_row_hi')]=(row-1)>>8;
 x[0x80fc]=1;x[0x4ecd]=1;x[0x80fe]=0;
 const cpu=h.call(x,d('_director_c_world_row_tick'));
 records.push({row,cycles:cpu.cycles,departure:h.labelsOf.director.has('_heavy_departure')?x[d('_heavy_departure')]:null});
}
fs.writeFileSync(output,JSON.stringify({measurement:'MEASURED NMOS6502 CPU; complete Director row tick',records},null,2)+'\n');
