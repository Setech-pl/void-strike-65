// Read-only ATR verification, native-raster checks and labelled crop boards.
// Run after the two replays described in report.md. No guest writes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {parseAtr} from '../../../../scripts/formats.mjs';
import {loadChunkFixture} from '../../../../scripts/chunk-loader.mjs';
import {unpackBroadsideLzss} from '../../../../scripts/broadside-lzss.mjs';
import {decodePng, encodePng, crop, scaleNearest, createImage} from '../../../../scripts/pages/png.mjs';
import {draw, textImage} from '../../../../scripts/pages/image.mjs';
import {textBitmap} from '../../../../scripts/pages/font.mjs';

const out = path.dirname(new URL(import.meta.url).pathname);
const build = 'build/level-2-s5';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const read = p => fs.readFileSync(p);
const expected = '40688a25a87ce374fe3e7cb59488b34588efe768c36218fc75d5b8b4f666c8e4';
const atr = read('build/play/m3h-session2/checkpoint-6/heavy-sector.atr');
assert.equal(sha(atr), expected);
assert.equal(sha(read(`${build}/void-strike-65.atr`)), expected);
const manifest = JSON.parse(read(`${build}/manifest.json`));
assert.equal(manifest.buildVariant, 'level-2-s5');
assert.match(read(`${build}/encounter-director-abi.lst`).toString(), /HEAVY_DAMAGE_REVIEW = 0/);
const body = parseAtr(atr).body, memory = Buffer.alloc(65536);
loadChunkFixture({atrBody:body, manifest:manifest.transportCapacity.manifest.parsed,
  memory, unpackLz:unpackBroadsideLzss});
const window = manifest.directorCodeRuntimes.find(x => x.name === 'hybrid-window');
assert.deepEqual(memory.subarray(window.runAddress, window.endExclusive), read(`${build}/${window.file}`));
const runs = [...manifest.overlays.runs, ...manifest.sectorReader.levels];
const packedRuns = [];
for (const name of ['content-module', 'fighter-capital-l2', 'level-2.bin']) {
  const run = runs.find(x => x.name === name || x.file === name);
  const bytes = body.subarray((run.startSector-1)*128, (run.startSector-1)*128+run.bytes);
  assert.deepEqual(bytes, read(`${build}/${run.file}`));
  packedRuns.push({file:run.file, startSector:run.startSector, sectors:run.sectors,
    bytes:run.bytes, sha256:sha(bytes), exactAtrMatch:true});
  memory.set(bytes, run.destination ?? manifest.sectorReader.levelBuffer.address);
}
const labels = new Map();
for (const file of ['void-strike-65.lbl','encounter-director.lbl'])
  for (const m of read(`${build}/${file}`).toString().matchAll(/^al ([0-9a-f]+) \.(\S+)/gmi))
    labels.set(m[2], parseInt(m[1],16));
const address = name => {assert.ok(labels.has(name), name); return labels.get(name);};
const call = (from, to, opcode=0x20, length=80) => {
  const start=address(from), target=address(to), bytes=Buffer.from([opcode,target&255,target>>8]);
  const offset=memory.subarray(start,start+length).indexOf(bytes);
  assert.ok(offset>=0, `${from} -> ${to}`);
  return {from, to, address:start+offset, opcode:opcode===0x20?'JSR':'JMP', bytes:bytes.toString('hex')};
};
const calls = [call('heavy_look_spawn','_enemy_c_spawn_raiders'),
  call('heavy_look_spawn','_enemy_c_heavy_look_colour'),
  call('heavy_visual_retry','_enemy_c_heavy_visual_claim'),
  call('heavy_visual_retry','heavy_damage_stamp',0x4c)];
assert.equal(labels.has('heavy_damage_review'), false);
const assault = memory.subarray(0x7765,0x7775);
const armour = memory.subarray(0xaba2,0xabb2);
const bomber = memory.subarray(0x7785,0x7795);
assert.equal(armour.toString('hex'), 'c3e7ffdbffe7ffe77e7e3c2424000000');
assert.equal(memory[0xabb2],0x46);
const ramp = Buffer.from([0xc0,0xc4,0xc6,0xc8,0xc8,0xc8]);
const rampOffset=memory.subarray(window.runAddress,window.endExclusive).indexOf(ramp);
assert.ok(rampOffset>=0);
// LevelDef wave flags and row/count are decoded directly from the ATR's core.
const core=0xaa00, waves=[];
for(let i=13;i<19;i++) waves.push({index:i, numberInSector:i-12,
  row:memory[core+96+i]*8, flags:memory[core+116+i], count:memory[core+176+i]});
assert.ok(waves[3].flags&0x20); assert.ok(waves[5].flags&0x20);
const proof={productionCommit:'761ec2a', mainCommit:'71a38a8', atrSHA256:expected, reconstructedAtrMatches:true, buildCommand:'node scripts/build.mjs --level=2:sector=5',
  variant:manifest.buildVariant, HEAVY_DAMAGE_REVIEW:0, LEVEL_DEBUG_START:1,
  difficulty:'MEDIUM (1), unchanged boot default', nativeGameCodeChanges:0, nativeStateInjection:false,
  window:{bytes:window.bytes, exactAtrMatch:true}, packedRuns, calls,
  armour:{address:0xaba2,colour:memory[0xabb2],bodyHex:armour.toString('hex')},
  bomberRamp:{address:window.runAddress+rampOffset,bytes:ramp.toString('hex')},waves};

const replays=[['bomber','build/visual-bomber-clear'],['armour','build/visual-armour-final']];
const captures=[];
for(const [name,dir] of replays) {
  const launch=JSON.parse(read(`${dir}/launch.json`));
  assert.equal(launch.atrSHA256,expected); assert.equal(launch.guestStateInjection,false);
  assert.equal(launch.observerSHA256,sha(read(`${out}/observer.h`)));
  assert.equal(sha(read(`${dir}/exact-delivered.atr`)),expected);
  const events=read(`${dir}/events.jsonl`).toString().trim().split('\n').map(JSON.parse);
  fs.writeFileSync(`${out}/${name}-events.json`,JSON.stringify(events.map(e=>({...e,file:e.file?path.basename(e.file):''})),null,2)+'\n');
  fs.writeFileSync(`${out}/${name}-launch.json`,JSON.stringify(launch,null,2)+'\n');
  for(const e of events.filter(e=>e.kind==='capture' && (name==='bomber'||e.subject===1||e.subject===2))) {
    assert.equal(e.difficulty,1);assert.equal(e.game,6);assert.equal(e.members[e.slot].state,1);
    const target=`${out}/${path.basename(e.file)}`;fs.copyFileSync(e.file,target);
    captures.push({...e,replay:name,file:path.basename(e.file),sha256:sha(read(target))});
  }
}
assert.equal(captures.length,6);
const byId=id=>captures.find(x=>x.subject===id);
assert.equal(byId(1).formation,byId(2).formation);
assert.equal(byId(3).formation,byId(4).formation);
assert.equal(byId(3).formation,byId(5).formation);
assert.ok(byId(5).claims>byId(3).claims && byId(5).stamps>byId(3).stamps);
assert.ok(byId(2).claims>byId(1).claims && byId(2).stamps>byId(1).stamps);
const pop = b=>[...b].reduce((n,x)=>n+x.toString(2).replaceAll('0','').length,0);
const xor=(a,b)=>Buffer.from([...a].map((x,i)=>x^b[i]));
const metrics={assaultBits:pop(assault),armourBits:pop(armour),bomberBits:pop(bomber),
  assaultToArmourChangedBits:pop(xor(assault,armour)),
  armourFirstHitRemovedBits:pop(xor(armour,Buffer.from(byId(2).members[0].bodyHex,'hex'))),
  bomberHp2RemovedBits:pop(xor(bomber,Buffer.from(byId(4).members[0].bodyHex,'hex'))),
  bomberHp1RemovedBits:pop(xor(bomber,Buffer.from(byId(5).members[0].bodyHex,'hex')))};
assert.equal(metrics.armourFirstHitRemovedBits,7);
assert.equal(metrics.bomberHp2RemovedBits,4);assert.equal(metrics.bomberHp1RemovedBits,7);
// Locate the exact observed PMG bitmap in its native screenshot. No redraw,
// recolouring or guessed sprite position is used for the comparison boards.
for(const e of captures) {
  const image=decodePng(read(`${out}/${e.file}`)), s=e.members[e.slot];
  const bytes=Buffer.from(s.bodyHex,'hex'), bitWidth=e.shape===2?8:4;
  let best={bad:Infinity};
  for(let y=s.y-11;y<=s.y-5;y++) for(let x=2*s.x-72;x<=2*s.x-54;x++) {
    const colours=new Map();
    for(let yy=0;yy<14;yy++) for(let xx=0;xx<8*bitWidth;xx++) if(bytes[yy]&(128>>(xx/bitWidth|0))) {
      const i=((y+yy)*image.width+x+xx)*4, key=[...image.data.subarray(i,i+3)].join(',');
      colours.set(key,(colours.get(key)??0)+1);
    }
    const rgb=[...colours].sort((a,b)=>b[1]-a[1])[0][0];let bad=0;
    for(let yy=0;yy<14;yy++) for(let xx=0;xx<8*bitWidth;xx++) {
      const i=((y+yy)*image.width+x+xx)*4;
      bad+=Boolean(bytes[yy]&(128>>(xx/bitWidth|0)))!==([...image.data.subarray(i,i+3)].join(',')===rgb);
    }
    if(bad<best.bad)best={bad,x,y,rgb:rgb.split(',').map(Number)};
  }
  assert.equal(best.bad,0,`${e.file}: native body must match observed PMG bits`);
  e.nativeRaster={...best,width:8*bitWidth,height:14,litPixels:pop(bytes)*bitWidth};
}
function board(file,title,ids,labels) {
  const width=ids.length===3?1000:760, image=createImage(width,240,4,[15,18,23,255]);
  const text=(s,x,y,scale=1)=>draw(image,textImage(textBitmap(s),[225,227,231],scale),x,y);
  text(title,20,12,2);
  const cell=(width-40)/ids.length;
  ids.forEach((id,i)=>{
    const e=byId(id), r=e.nativeRaster, native=decodePng(read(`${out}/${e.file}`));
    const piece=scaleNearest(crop(native,r.x-4,r.y-4,r.width+8,22),4);
    const x=Math.round(20+i*cell);text(labels[i],x,48);
    draw(image,piece,x+Math.round((cell-piece.width)/2),78);
    text(`${e.seconds.toFixed(2)} S / HP ${e.members[0].hp} / ${e.members[0].colour.toString(16).toUpperCase()}`,x,187);
  });
  text('NATIVE CROPS / 4X NEAREST / SEPARATE FRAMES / MEDIUM',20,218);
  fs.writeFileSync(`${out}/${file}`,encodePng(image));
}
board('raider-comparison.png','ASSAULT AND ARMOURED RAIDER',[0,1],['ASSAULT / 1 HP','ARMOURED / 2 HP']);
board('armour-damage-comparison.png','ARMOURED RAIDER - FIRST HIT',[1,2],['INTACT / STAGE 0','FIRST HIT / STAGE 2']);
board('bomber-comparison.png','BOMBER - HP AND DAMAGE',[3,4,5],['4 HP / STAGE 0 / C8','2 HP / STAGE 1 / C6','1 HP / STAGE 2 / C4']);
fs.writeFileSync(`${out}/proof.json`,JSON.stringify({...proof,metrics,captures},null,2)+'\n');
console.log(JSON.stringify({checks:'PASS',atrSHA256:expected,captures:captures.length,metrics},null,2));
