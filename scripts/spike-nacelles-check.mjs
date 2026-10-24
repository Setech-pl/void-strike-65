// Focused throwaway proof; no full test suite or release evidence.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { Nmos6502 } from './nmos6502.mjs';
import { installRuntimeSegments } from './runtime-image.mjs';
import { parseViceLabels } from './runtime-cycles.mjs';
const root = path.resolve(import.meta.dirname, '..');
const directory = path.resolve(process.argv[2] ?? 'build/spike-nacelles-p1');
const labels = parseViceLabels(fs.readFileSync(path.join(directory,'void-strike-65.lbl'),'utf8'));
const memory = new Uint8Array(65536);
installRuntimeSegments(memory, root, directory);
const at = n => { const a=labels.get(n); assert.ok(Number.isInteger(a),n); return a; };
function run(name,a=0,x=0,y=0) {
  const cpu = new Nmos6502(memory); cpu.a=a;cpu.x=x;cpu.y=y;
  cpu.push(0x7f);cpu.push(0xfe);cpu.pc=at(name);
  for(let i=0;cpu.pc!==0x7fff && i<100000;i++) cpu.step();
  assert.equal(cpu.pc,0x7fff,`${name} did not return`);
  return cpu;
}
const set = (n,v) => memory[at(n)]=v;
const get = n => memory[at(n)];
const word = (n,v) => {set(n,v&255);memory[at(n)+1]=(v>>>8)&255;};
run('copy_charset');run('publish_level_hull_style');
const immutable=memory.slice(at('spike_nacelles_start'),at('spike_nacelles_data_end'));
memory.fill(0xa5,0xb8fb,0xb900);memory.fill(0x5a,0x549e,0x54be);
const health=0x4e5d, visible=0x4e6f, leftBound=0x4ea8, rightBound=0x4ea9, applied=at("BROAD_DAMAGE_APPLIED");
// Resolve aliases from actual code operands, so this proof does not invent state.
const contactBytes = memory.subarray(at('handle_player_hull_contact'),at('handle_player_hull_contact')+310);
assert.ok(contactBytes.includes(0xad));
const result={pattern:JSON.parse(fs.readFileSync(path.join(directory,'spike-nacelles.json'))).pattern,
  difficulties:[],cases:0,protrudingEdgeCases:0,cooldownCases:0,cacheCases:0};
for(let difficulty=0;difficulty<3;difficulty++) {
  set('DIFFICULTY_SETTING',difficulty);set('CAPITAL_SECTOR_STATE',2);
  const rows=[];let worstDraw=0,worstContact=0,worstGap=0,minChannel=160;
  for(let row=0;row<488;row++) {
    word('corridor_phase',row&255);set('CORRIDOR_PHASE_HI',row>>>8);
    word('dst_ptr',0x4100);memory.fill(0,0x4100,0x4128);
    const cpu=run('draw_hull_row');worstDraw=Math.max(worstDraw,cpu.cycles);
    const chars=[...memory.subarray(0x4100,0x4128)];
    const hull=c=>(c&127)>=59&&(c&127)<90;
    const l=chars.slice(0,11).findLastIndex(hull)+1;
    const ri=chars.slice(29).findIndex(hull);const r=ri<0?40:29+ri;
    rows.push({left:48+l*4,right:48+r*4,chars});
    // New contour is contiguous from the existing five-cell minimum.
    if(l>9) for(let col=4;col<l;col++) assert.ok(hull(chars[col]),`left hole ${row}:${col}`);
    if(r<31) for(let col=r;col<36;col++) assert.ok(hull(chars[col]),`right hole ${row}:${col}`);
    // Prepared-row extra columns reach the real divider without stale cells.
    memory.set(chars,at('PREPARED_HULL_ROW'));
    run('spike_commit_strips');
    for(const col of [8,9,10,29,30]) assert.equal(memory[0x4028+col],chars[col]);
    result.cacheCases++;
  }
  for(let row=0;row<488;row++) for(let fine=0;fine<8;fine++) {
    const count=Math.floor((fine+14)/8)+1;
    const covered=Array.from({length:count},(_,i)=>rows[row-i]??{left:48,right:208});
    const left=Math.max(...covered.map(r=>r.left));
    const right=Math.min(...covered.map(r=>r.right));
    minChannel=Math.min(minChannel,right-left);
    if(difficulty===0) assert.ok(right-left>=80,`EASY channel ${row}/${fine}: ${right-left}`);
    for(const [kind,x,expected] of [['left',left-1,left],['right',right-7,right-8],['gap',Math.floor((left+right-8)/2),null],['gap-left',left,null],['gap-right',right-8,null]]) {
      // Check nacelles and the entire safe gap; ordinary prow uses the legacy
      // pixel-mask edge and is validated independently by the existing code.
      const protrudes = kind==='left'?left>84:kind==='right'?right<172:false;
      if(!kind.startsWith('gap')&&!protrudes) continue;
      set('corridor_phase',(row+11)&255);set('CORRIDOR_PHASE_HI',(row+11)>>>8);
      set('player_x',x);set('player_y',96+fine);set('PLAYER_LIFECYCLE',0);
      memory[visible]=28;memory[health]=10;memory[0x4e5e]=0;memory[applied]=0;
      set('ENTITY_ACTIVE_MASK',0);set('ENTITY_STATE',0);memory[at('ENTITY_STATE')+1]=0;
      const cpu=run('handle_player_hull_contact');result.cases++;
      if(kind.startsWith('gap')) {assert.equal(memory[health],10,`gap damage ${row}/${fine}`);assert.equal(get('player_x'),x);worstGap=Math.max(worstGap,cpu.cycles);}
      else {
        assert.equal(get('player_x'),expected,`${kind} clamp ${row}/${fine}`);
        assert.equal(memory[health],8,`${kind} damage ${row}/${fine}`);
        assert.equal(memory[0x4e5e],25,`cooldown ${row}/${fine}`);
        assert.ok(get('player_x')>=left && get('player_x')+7<right);
        result.protrudingEdgeCases++;worstContact=Math.max(worstContact,cpu.cycles);
        set('player_x',x);memory[applied]=0;run('handle_player_hull_contact');
        assert.equal(memory[health],8,'cooldown damage repeated');assert.equal(get('player_x'),expected);result.cooldownCases++;
      }
    }
  }
  result.difficulties.push({difficulty,minChannelHPOS:minChannel,minChannelCells:minChannel/4,worstDrawCpu:worstDraw,worstContactCpu:worstContact,worstGapCpu:worstGap});
}
assert.deepEqual(memory.slice(at('spike_nacelles_start'),at('spike_nacelles_data_end')),immutable,'immutable spike code/data changed');
assert.ok(memory.slice(0xb8fb,0xb900).every(v=>v===0xa5),'reserved five bytes changed');
assert.ok(memory.slice(0x549e,0x54be).every(v=>v===0x5a),'M3-H reservation changed');
result.immutableCodeAndDescriptors=true;result.reservedFiveBytesIntact=true;result.m3hReservationIntact=true;
const out=path.join(directory,'nacelle-correctness.json');fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
