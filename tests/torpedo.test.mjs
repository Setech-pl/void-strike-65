// M6 stage 1b after the owner's smoke (journal §BL 5; the owner's answer: the
// hull in P1, the exhaust in P2, both homing, both in the lasers' colour;
// docs/plans/m6-gauges.md §7.3): the VOID LANCE fires a TORPEDO, not a beam.
// On the 6502 harness through the real boss entry from the built disk:
//   - the fire frame locks the module under the ship and draws nothing;
//   - in flight the hull (P1) and the exhaust (P2, right below it) climb from
//     above the ship - never on its rows - and both HPOS follow the locked
//     module's current centre on a drifting band (a miss: the ship's centre);
//   - arrival: the module killed through the shot's path, the lance spent;
//     the explosion in P2 at the impact for its frames - never on the kill
//     frame - then P2 and HPOSP2 cleared; P1 empty;
//   - a miss, or the locked module destroyed on the way: the torpedo flies on
//     to the band's foot and nothing is hit; the lance is kept and the
//     reticle's rows come back in P1.
import assert from "node:assert/strict";
import test from "node:test";

import { bossLevel, call, label, manifest, placeBand, regionOf, runBossEntry } from "./boss-harness.mjs";

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const TRIG0 = 0xd010, STICK0 = 0xd300, UP = 0x01;
const HPOSP1 = 0xd001, HPOSP2 = 0xd002, P0 = 0x3c00, P1 = 0x3d00, P2 = 0x3e00;
const SHIP_Y = 200;
const lance = manifest.boss.lance;
const torpedo = lance.torpedo;
const KIND_CORE = 4;
const CROSSHAIR = [0x18, 0x18, 0x00, 0xc3, 0xc3, 0x00, 0x18, 0x18];
const HOLLOW = [0x00, 0x18, 0x00, 0x42, 0x42, 0x00, 0x18, 0x00];

function hold(memory, held) {
  memory[TRIG0] = held ? 0 : 1;
  memory[STICK0] = held ? 0x0f & ~UP : 0x0f;
}
function fight(directory = 1) {
  const { memory, end } = runBossEntry({ prepare: (m) => { m[0xa603] = bossLevel(directory); } });
  assert.equal(end, "main_loop");
  const region = manifest.boss.regions[regionOf(directory) - 1];
  placeBand(memory, region.stillAt ?? 32);
  memory[main("PLAYER_LIFECYCLE")] = 0;
  memory[main("PLAYER_LIFECYCLE") + 1] = 3;
  memory[main("player_y")] = SHIP_Y;
  hold(memory, false);
  call(memory, lbl("lance_tick"));                        // the fight's first frame
  const full = lance.meterFrames[memory[main("DIFFICULTY_SETTING")]];
  memory[lbl("_lance_meter_lo")] = (full - 1) & 0xff;
  memory[lbl("_lance_meter_hi")] = (full - 1) >> 8;
  for (let f = 0; f < 3; f += 1) call(memory, lbl("lance_tick"));
  assert.equal(memory[lbl("lance_ready")], 0xff, "a lance ready");
  return { memory, region };
}
const tick = (memory) => call(memory, lbl("lance_tick"));
const shipX = (memory, c) => c * 4 + 32 - memory[lbl("boss_shown_pos")] - 7;
const reach = (memory) => Array.from({ length: 64 }, (_, c) => c).filter((c) => shipX(memory, c) >= 48 && shipX(memory, c) <= 191);
const front = (memory, c) => memory[lbl("boss_column_map") + c];
function shotHurts(memory, c) {
  const module = front(memory, c);
  if (module >= 16) return false;
  const copy = Uint8Array.from(memory);
  copy[lbl("_boss_hit_module")] = module;
  return call(copy, lbl("_boss_c_hit")).a === 1;
}
const targetColumn = (memory) => reach(memory).find((c) => shotHurts(memory, c) && memory[lbl("_boss_kind") + front(memory, c)] !== KIND_CORE);
const emptyColumn = (memory) => reach(memory).find((c) => !(shotHurts(memory, c) && memory[lbl("_boss_kind") + front(memory, c)] !== KIND_CORE));
const centreOf = (memory, module) => ((memory[lbl("boss_mx") + module] + memory[lbl("boss_mxe") + module]) * 2 + 28 -
  memory[lbl("boss_shown_pos")]) & 0xff;
const rowsOf = (memory, plane) => Array.from({ length: 256 }, (_, y) => y).filter((y) => memory[plane + y] !== 0);
// Charge and fire over column c (or none): returns the fire frame's state.
function fire(memory, c) {
  memory[main("player_x")] = shipX(memory, c);
  hold(memory, true);
  for (let f = 0; f < lance.chargeFrames + 2 && memory[lbl("lance_beam")] === 0; f += 1) {
    memory[main("player_x")] = shipX(memory, c);         // the half advance moves the ship up only
    tick(memory);
  }
  hold(memory, false);
  assert.equal(memory[lbl("lance_beam")], 1, "the torpedo fired");
}

for (const directory of [1, 2, 3, 4]) {
  test(`§BL 5: boss directory ${directory} - the torpedo homes on the locked module over a drifting band, kills it, explodes, and P1 / P2 come back empty`, () => {
    const { memory, region } = fight(directory);
    const c = targetColumn(memory);
    assert.ok(c !== undefined, "a target column");
    const module = front(memory, c);
    const hp = memory[lbl("_boss_hp") + module];
    assert.ok(hp > 0);
    const ship = memory[main("player_y")];
    const p0 = [...memory.subarray(P0, P0 + ship)];         // the ship's plane above its rows (the entry's drawing)
    fire(memory, c);
    assert.equal(memory[lbl("_lance_module")], module, "the module under the ship is locked on the fire frame");
    assert.deepEqual(rowsOf(memory, P2), [], "the fire frame draws no exhaust");
    assert.equal(memory[HPOSP1], 0, "the fire frame: the reticle off, nothing in P1's place");
    const y = memory[lbl("lance_y")];
    const mark = (r) => r >= y && r < y + 8;                // the reticle's rows: they stay until the torpedo passes or kills
    let frames = 0;
    let p = memory[lbl("boss_shown_pos")];
    while (memory[lbl("lance_beam")] === 1) {
      // The band drifts a colour clock every other frame (as far as it can).
      if (frames % 2 === 1 && (region.travel ?? 0) > 0) { p = (p + 1) % Math.max(region.travel, 1); placeBand(memory, p); }
      tick(memory);
      frames += 1;
      assert.ok(frames < 80, "the torpedo never arrived");
      if (memory[lbl("lance_beam")] !== 1) break;
      const head = memory[lbl("lance_head")];
      const hull = rowsOf(memory, P1).filter((r) => !mark(r));
      for (let y = head; y < head + torpedo.hullRows; y += 1) assert.notEqual(memory[P1 + y], 0, `frame ${frames}: the hull's row ${y}`);
      const exhaust = rowsOf(memory, P2);
      assert.ok(hull.every((y) => y >= head && y < head + torpedo.hullRows), `frame ${frames}: P1's rows ${hull} at ${head} (the hull's and the reticle's only)`);
      assert.ok(exhaust.length > 0 && exhaust.every((y) => y >= head + torpedo.hullRows && y < head + torpedo.hullRows + torpedo.exhaustRows),
        `frame ${frames}: the exhaust right below the hull (${exhaust})`);
      assert.ok(Math.max(...hull, ...exhaust) < ship, `frame ${frames}: the torpedo above the ship's rows`);
      const centre = centreOf(memory, module);
      assert.equal(memory[HPOSP1], centre, `frame ${frames}: P1 at the locked module's centre`);
      assert.equal(memory[HPOSP2], centre, `frame ${frames}: P2 at the locked module's centre`);
    }
    // The kill frame: the module destroyed, the torpedo gone, no explosion yet.
    assert.equal(memory[lbl("_boss_hp") + module], 0, "the locked module destroyed");
    assert.equal(memory[lbl("lance_ready")], 0, "the lance spent");
    assert.deepEqual(rowsOf(memory, P1), [], "the kill frame: P1 empty");
    assert.deepEqual(rowsOf(memory, P2), [], "the kill frame: no explosion yet");
    let blast = 0;
    while (memory[lbl("lance_beam")] !== 0) {
      tick(memory);
      if (memory[lbl("lance_beam")] === 0) break;
      blast += 1;
      const rows = rowsOf(memory, P2);
      const top = memory[lbl("lance_top")];
      // At the impact: its first two rows the module's last lines, the rest under it.
      assert.ok(rows.length > 0 && rows.every((y) => y >= top - 1 && y <= top + torpedo.blastRows - 2), `explosion frame ${blast}: at the impact (${rows})`);
      assert.ok(blast <= torpedo.blastFrames);
    }
    assert.equal(blast, torpedo.blastFrames, "the explosion's frames");
    assert.deepEqual(rowsOf(memory, P2), [], "P2 released");
    assert.equal(memory[HPOSP2], 0, "HPOSP2 0");
    assert.deepEqual(rowsOf(memory, P1), [], "P1 empty: the lance spent, no reticle");
    assert.deepEqual([...memory.subarray(P0, P0 + ship)], p0, "P0 above the ship untouched");
  });
}

test("§BL 5 (§BH): a miss - no target under the ship - the torpedo flies to the band's foot at the ship's column; the lance kept, the reticle back", () => {
  const { memory } = fight(1);
  const c = emptyColumn(memory);
  assert.ok(c !== undefined);
  const hp = [...memory.subarray(lbl("_boss_hp"), lbl("_boss_hp") + 16)];
  fire(memory, c);
  const x = (memory[main("player_x")] + 4) & 0xff;
  assert.equal(memory[lbl("lance_top")], memory[lbl("lance_y")] - 1, "to the band's foot");
  let frames = 0;
  while (memory[lbl("lance_beam")] !== 0) {
    tick(memory);
    frames += 1;
    assert.ok(frames < 80);
    if (memory[lbl("lance_beam")] === 1) {
      assert.equal(memory[HPOSP1], x, "the ship's column");
      assert.equal(memory[HPOSP2], x);
    }
  }
  assert.deepEqual([...memory.subarray(lbl("_boss_hp"), lbl("_boss_hp") + 16)], hp, "nothing hit");
  assert.equal(memory[lbl("lance_ready")], 0xff, "the lance kept");
  assert.deepEqual(rowsOf(memory, P2), [], "P2 released");
  tick(memory);
  const y = memory[lbl("lance_y")];
  const mark = [...memory.subarray(P1 + y, P1 + y + 8)];
  assert.ok(JSON.stringify(mark) === JSON.stringify(HOLLOW) || JSON.stringify(mark) === JSON.stringify(CROSSHAIR),
    `the reticle's rows back (${mark})`);
  assert.deepEqual(rowsOf(memory, P1).filter((r) => r < y || r >= y + 8), [], "P1 holds the reticle only");
});

test("§BL 5 (§BH): the locked module destroyed on the way - the torpedo flies on to its line and hits nothing; the lance kept", () => {
  const { memory } = fight(1);
  const c = targetColumn(memory);
  const module = front(memory, c);
  fire(memory, c);
  tick(memory);
  tick(memory);
  assert.equal(memory[lbl("lance_beam")], 1, "in flight");
  memory[lbl("_boss_hp") + module] = 0;                    // a player shot took it
  const hp = [...memory.subarray(lbl("_boss_hp"), lbl("_boss_hp") + 16)];
  let frames = 0;
  while (memory[lbl("lance_beam")] !== 0) { tick(memory); frames += 1; assert.ok(frames < 80); }
  assert.deepEqual([...memory.subarray(lbl("_boss_hp"), lbl("_boss_hp") + 16)], hp, "no other module touched");
  assert.equal(memory[lbl("lance_ready")], 0xff, "the lance kept");
  assert.deepEqual(rowsOf(memory, P2), [], "no explosion");
});

test("§BL 5: the kill frame is the frame's only meeting (the shots wait a frame); the explosion's first frame AUD-04's two again", () => {
  const { memory } = fight(1);
  fire(memory, targetColumn(memory));
  const admit = lbl("laser_admit_operand");
  let killFrame = null;
  for (let f = 0; f < 80 && memory[lbl("lance_beam")] !== 0; f += 1) {
    const before = memory[lbl("lance_beam")];
    tick(memory);
    if (before === 1 && memory[lbl("lance_beam")] === 2) { killFrame = f; assert.equal(memory[admit], 0, "the kill frame admits none"); }
    else if (killFrame !== null && f === killFrame + 1) assert.equal(memory[admit], 2, "the next frame two");
  }
  assert.notEqual(killFrame, null, "a kill");
});
