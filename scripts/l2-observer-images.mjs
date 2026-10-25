// Host-only ownership fixtures, reconstructed through the real checked boss entry.
// No guest byte is changed by the native lifetime observer.
import fs from 'node:fs';
import path from 'node:path';
import {parseViceLabels} from './runtime-cycles.mjs';
export async function writeOwnershipImages(build='build') {
  const dir=path.resolve(build), root=process.cwd();
  if(dir!==path.join(root,'build')) process.env.VS65_HARNESS_BUILD=path.basename(dir);
  const h=await import('../tests/boss-harness.mjs');
  const entered=h.runBossEntry();
  if(entered.end!=='main_loop') throw Error('Ownership fixture boss install failed');
  const boss=Buffer.from(entered.memory), death=Buffer.alloc(65536), bm=Buffer.alloc(65536), dm=Buffer.alloc(65536);
  const segments=file=>[...fs.readFileSync(path.join(dir,file),'utf8').split('Segment list:')[1]
    .split('Exports list')[0].matchAll(/^(\w+)\s+([0-9A-F]{6})\s+([0-9A-F]{6})\s+([0-9A-F]{6})/gm)]
    .map(m=>({name:m[1],start:parseInt(m[2],16),end:parseInt(m[3],16)+1}));
  for(const s of segments('boss.map')) if(!/BSS|DATA|SCRATCH|BACKUP/.test(s.name)) bm.fill(1,s.start,s.end);
  const vectors=h.manifest.overlays.capitalVectors;bm.fill(1,vectors.address,vectors.address+36);
  fs.readFileSync(path.join(dir,'boss-death.bin')).copy(death,0x1000);
  const boot=fs.readFileSync(path.join(dir,'boss-death-boot.bin'));boot.copy(death,0x5200);dm.fill(1,0x5200,0x5200+boot.length);
  for(const s of segments('boss-death.map')) if(/HEAD|CODE/.test(s.name))dm.fill(1,s.start,s.end);
  const main=h.labelsOf.main, reader=h.labelsOf.reader;
  const fields=[main.get('layout_d_glue_holding_complete'),main.get('start'),main.get('enter_frontend_state'),
    main.get('quit_gameplay_to_menu'),reader.get('sector_reader_level_end'),reader.get('sector_reader_read_run'),
    main.get('respawn_player'),main.get('main_loop')];
  const header=Buffer.alloc(64);for(const [i,v]of fields.entries()){if(!Number.isInteger(v))throw Error(`Ownership label ${i} missing`);header.writeUInt16LE(v,i*2);}
  header.writeUInt16LE(h.manifest.l2?1:0,16);
  header.writeUInt16LE(main.get("enter_game_over"),18);header.writeUInt16LE(main.get("game_state"),20);
  for(const [index,name] of [[12,"pause_frontend_input_poll"],[13,"frontend_input_armed"],[14,"frontend_selection"],[21,"CAPITAL_SECTOR_STATE"],[22,"PLAYER_LIFECYCLE"]])header.writeUInt16LE(main.get(name),index*2);
  const bl=h.labelsOf.boss, palette1=bl.get('boss_pal_colpf1'),palette3=bl.get('boss_pal_colpf3');
  const candidates=[];
  for(let pc=bl.get('boss_pal_src1')-1;pc<bl.get('boss_pal_landed');pc++)
    if(boss[pc]===0xad && (boss[pc+1]|boss[pc+2]<<8)===palette3)candidates.push(pc);
  if(candidates.length!==1)throw Error('Cannot derive installed palette DLI operand');
  for(const [i,v]of [[24,bl.get('boss_pal_src1')-1],[25,candidates[0]],
    [26,palette1],[27,palette3-palette1]])header.writeUInt16LE(v,i*2);
  const moving=[];
  for(let pc=0;pc<65534;pc++)if(dm[pc]&&death[pc]===0xb9&&death[pc+1]===255&&death[pc+2]===255)moving.push(pc);
  if(moving.length!==4)throw Error('Death SMOD read-site inventory changed');
  moving.forEach((pc,i)=>header.writeUInt16LE(pc,(28+i)*2));
  const l2=h.manifest.l2?fs.readFileSync(path.join(dir,'l2.bin')):Buffer.alloc(1792);
  const out=path.join(dir,'l2-ownership.bin');fs.writeFileSync(out,Buffer.concat([header,bm,boss,dm,death,l2]));
  console.log(out);return {out,boss,death,bossMask:bm,deathMask:dm,l2,fields};
}
if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname)
  await writeOwnershipImages(process.argv[2]??'build');
