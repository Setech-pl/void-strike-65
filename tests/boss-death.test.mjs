import test from "node:test";
import assert from "node:assert/strict";
import { readLabels, runBossEntry, Drive, cpuOver, runUntil, label, call, manifest, atrSector } from "./boss-harness.mjs";
import {makeAtr} from "../scripts/formats.mjs";
const death = readLabels("boss-death.lbl");
const D = n => { assert(death.has(n), n); return death.get(n); };
const B = n => label("boss", n);
const M = n => label("main", n);
const band = r => r < 6 ? 0xA880 + r * 64 : 0xAC80 + (r - 6) * 64;

test("last weapon still freezes the fight clock and awards its summary bonus before takeover", () => {
  const {memory:m,end}=runBossEntry(); assert.equal(end,"main_loop");
  const armed=m[B("_boss_armed_lo")]|m[B("_boss_armed_hi")]<<8;
  const n=Array.from({length:m[B("_boss_count")]},(_,i)=>i).find(i=>
    (armed&(1<<i)) && m[B("_boss_kind")+i]===1);
  assert.notEqual(n,undefined);
  m[B("_boss_hit_module")]=n;m[B("_boss_hp")+n]=1;m[B("_boss_weapons_left")]=1;
  m[M("ACTIVE_GAMEPLAY_FRAME_LO")]=100;m[M("ACTIVE_GAMEPLAY_FRAME_LO")+1]=0;
  call(m,B("_boss_c_hit"));
  assert.equal(m[B("_boss_phase")],2);
  const clock=[m[B("_boss_clock_lo")],m[B("_boss_clock_hi")]];
  assert.deepEqual(clock,[100,0]);
  assert.deepEqual([...m.slice(B("_boss_stats_bonus"),B("_boss_stats_bonus")+2)],[0,0x20]);
  call(m,B("_boss_c_tick"));
  assert.equal(m[B("_boss_handoff")],1);
  assert.deepEqual([m[B("_boss_clock_lo")],m[B("_boss_clock_hi")]],clock);
});

export function deathFixture(region, sectorOf, setup) {
  const entry = runBossEntry({ prepare: m => { m[0xA603] = 3 * region - 2; } });
  assert.equal(entry.end, "main_loop");
  const m = entry.memory;
  m[B("_boss_handoff")] = 1;
  m[B("_boss_phase")] = 2;
  m[B("_boss_n")] = 0;
  m[B("_boss_clock_lo")] = 123;
  m[B("_boss_clock_hi")] = 1;
  // Transition fixture: no pending temporary draw or live shot. Production
  // teardown also restores these; tests below exercise the disk guard.
  m.fill(0, B("boss_ring_timer"), B("boss_ring_timer") + 8);
  m[B("boss_queue_head")] = m[B("boss_queue_tail")];
  setup?.(m);
  const ship = m.slice(0x3C00, 0x3D00), hud = m.slice(0x4000, 0x4028);
  const drive = new Drive(sectorOf ? {sectorOf} : {});
  const cpu = cpuOver(drive, m);
  cpu.pc = B("boss_completion"); cpu.sp = 0xf0;
  const end = runUntil(cpu, { animation: D("death_loop"), failure: label("reader","sector_reader_failure_screen") });
  return {m, cpu, drive, end, ship, hud};
}

test("pending COPY drains before F is overwritten; an unrelated module flash ends before E reuse", () => {
  let expected,rect;
  const f=deathFixture(1,undefined,m=>{
    const n=Array.from({length:m[B("_boss_count")]},(_,i)=>i).find(i=>m[0xAD00+40+i]!==255);
    const offset=m[0xAD00+40+n], record=0xAD00+56+n*12;
    rect={x:m[record],row:m[record+1],w:m[record+2],h:m[record+3]&15};
    expected=[...m.slice(0x5200+offset,0x5200+offset+rect.w*rect.h)];
    m[B("boss_queue_head")]=0;m[B("boss_queue_tail")]=1;
    m[B("boss_queue_module")]=n;m[B("boss_queue_mode")]=0;m[B("boss_queue_value")]=offset;
    for(let r=rect.row;r<rect.row+rect.h;r++)m.fill(0,band(r)+rect.x,band(r)+rect.x+rect.w);
  });
  assert.equal(f.end,"animation");
  const actual=[];for(let r=rect.row;r<rect.row+rect.h;r++)actual.push(...f.m.slice(band(r)+rect.x,band(r)+rect.x+rect.w));
  assert.deepEqual(actual,expected);
  let plate;
  const g=deathFixture(1,undefined,m=>{
    plate=[...m.slice(band(4)+11,band(4)+16)];
    for(let c=11;c<16;c++) if(m[band(4)+c]&127)m[band(4)+c]^=128;
    m[B("boss_mflash_timer")]=3;m[B("boss_mflash_m")]=0;
  });
  assert.equal(g.end,"animation");
  assert.deepEqual([...g.m.slice(band(4)+11,band(4)+16)],plate);
});

test("death reads only after defeat, preserves HUD/player, and stays inside freed overlays", () => {
  assert.equal(manifest.boss.install.bytes,383);
  assert.equal(manifest.boss.slotC.sectors,15);
  assert.equal(B("_boss_bit_table"),0x154e);
  assert.equal(B("_boss_next_armed"),0x1558);
  assert.equal(B("_boss_phase"),0x177a);
  assert(manifest.boss.death.codeBytes <=3584);
  for (const r of [1,2,3,4]) {
    const f=deathFixture(r);
    assert.equal(f.end,"animation");
    assert.deepEqual(f.drive.readSectors, Array.from({length:manifest.boss.death.diskSectors},(_,i)=>720+i));
    assert.deepEqual(f.m.slice(0x3C00,0x3D00),f.ship);
    assert.deepEqual(f.m.slice(0x4000,0x4028),f.hud);
    assert.equal(f.m[M("ACTIVE_GAMEPLAY_FRAME_LO")],123);
    assert.equal(f.m[M("ACTIVE_GAMEPLAY_FRAME_LO")+1],1);
  }
});

test("extended ATR retains complete post-fight sectors; corrupt bootstrap/engine is rejected", () => {
  const tail=Buffer.alloc(128,0xa5);
  const atr=makeAtr(Buffer.alloc(128),[{startSector:1040,data:tail}],{sectorCount:1040});
  assert.equal(atr.length,133136);
  assert.deepEqual(atr.subarray(-128),tail);
  for(const sector of [720,724]) {
    const f=deathFixture(1,n=>{const b=Buffer.from(atrSector(n)); if(n===sector)b[15]^=1; return b;});
    assert.equal(f.end,"failure");
  }
});

test("wings shift exactly one cell into a separate buffer, leaving visible source untouched", () => {
  for (const region of [1,2,3,4]) {
    const {m}=deathFixture(region);
    const split=m[0x4D03], rows=m[0x4D02];
    for (let r=2;r<rows;r++) for(let c=0;c<64;c++) m[band(r)+c]=c+1;
    const before=Uint8Array.from(m);
    call(m,D("death_copy"));
    for(let r=2;r<rows;r++) {
      assert.deepEqual(m.slice(band(r),band(r)+64), before.slice(band(r),band(r)+64));
      const expected=Array.from({length:64},(_,c)=>c<split-1 ? c+2 : c>split ? c : 0);
      assert.deepEqual([...m.slice(0x1E00+r*64,0x1E00+(r+1)*64)],expected);
    }
    call(m,D("death_copy"));
    for(let r=2;r<rows;r++) assert.deepEqual([...m.slice(band(r),band(r)+64)],
      Array.from({length:64},(_,c)=>c<split-2 ? c+3 : c>split+1 ? c-1 : 0));
  }
});

test("crown LMS follows original rows and colours; all 175 ticks finish with no ship/HUD writes", () => {
  for(const region of [1,2,3,4]) {
    const {m,ship,hud}=deathFixture(region);
    const writes=[];
    for(let t=1;t<=175;t++) {
      call(m,D("_death_tick"));
      if(m[D("_death_shift")]) call(m,D("death_copy"));
      call(m,D("death_layout"));
      call(m,D("death_publish"), {hooks:{write:(a,v)=>{writes.push(a); return false;}}});
    }
    assert.equal(m[D("_death_done")],1);
    assert.deepEqual(m.slice(0x3C00,0x3D00),ship);
    assert.deepEqual(m.slice(0x4000,0x4028),hud);
    assert(!writes.some(a=>a>=0xB8FB && a<0xB900));
    assert(!writes.some(a=>a>=0x400 && a<0x500));
    assert(!writes.some(a=>a>=0xB900 && a<0xBC00));
    m[D("_death_vanish")]=0; m[D("_death_up")]=1; call(m,D("death_layout"));
    assert.equal(m[0x4C41] | m[0x4C42]<<8, band(0)+m[0x4D0F]);
    m[D("_death_up")]=2; call(m,D("death_layout"));
    assert.equal(m[0x4C41] | m[0x4C42]<<8, band(1)+m[0x4D0F]);
  }
});
