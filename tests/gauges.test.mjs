// M6 stage 1b (journal §BK; docs/plans/m6-gauges.md §3): the PMG gauges of the
// boss sector on the 6502 harness, through the real boss entry from the built
// disk. Bottom-left in P2 (the lasers' COLPM2, never written here), from the
// bottom up: the lance icon, the lance meter's four dots (25 / 50 / 75 / 100 %),
// the booster icon, the booster's four dots (the HUD's lit BOOST cells). Drawn
// whole once, on the fight's first frame; afterwards a change - a meter
// quarter, a charge step, a booster cell - writes ONE dot (two P2 bytes) on a
// frame, and a frame with no change writes nothing. The variant is only the
// horizontal position (A over the playfield's column 0, B in the left border).
import assert from "node:assert/strict";
import test from "node:test";

import { bossLevel, call, label, manifest, placeBand, regionOf, runBossEntry } from "./boss-harness.mjs";

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const TRIG0 = 0xd010, STICK0 = 0xd300, UP = 0x01;
const HPOSP2 = 0xd002, SIZEP2 = 0xd00a, P2 = 0x3e00;
const COLPM2 = 0xd014;
const DIFFICULTY = main("DIFFICULTY_SETTING");
const lance = manifest.boss.lance;
const gauge = lance.gauge;
const METER = lance.meterFrames;                                // EASY, MEDIUM, HARD
const CHARGE = lance.chargeFrames;
const SHIP_Y = 200;
const HUD_CELLS = main("SCREEN") + main("HUD_BOOSTER_SEGMENTS_OFFSET");
const LIT = 0x3c, SOCKET = 0x24;
// The rows (PMG Y = scanline): the dots two lines tall, three apart.
const LANCE_DOT = [228, 225, 222, 219];                         // 25 % at the bottom
const BOOST_DOT = [205, 202, 199, 196];
const LANCE_ICON = { y: 232, rows: [0x18, 0x3c, 0x18, 0x18, 0x18, 0x24] };
const BOOST_ICON = { y: 209, rows: [0x18, 0x24, 0x42, 0x18, 0x24, 0x42] };
const GAUGE_TOP = 196, GAUGE_BOTTOM = 237;

// The quarters reached: the k-th dot lights when the meter reaches
// ceil(k * full / 4) frames (the 4th is the lance ready).
const thresholds = (full) => [1, 2, 3, 4].map((k) => Math.ceil(k * full / 4));
const quartersOf = (meter, full) => thresholds(full).filter((t) => meter >= t).length;
// The charge empties the lance gauge from the top: lit by (charge + 7) / 8 as
// the ramp is indexed (journal §BI 2) - 4 to frame 16, none from 65.
const chargeLit = (charge) => Math.min(4, (10 - ((charge + 7) >> 3)) >> 1);

const setMeter = (memory, frames) => {
  memory[lbl("_lance_meter_lo")] = frames & 0xff;
  memory[lbl("_lance_meter_hi")] = frames >> 8;
};
const meterOf = (memory) => memory[lbl("_lance_meter_lo")] | (memory[lbl("_lance_meter_hi")] << 8);
function hold(memory, held = true) {
  memory[TRIG0] = held ? 0 : 1;
  memory[STICK0] = held ? 0x0f & ~UP : 0x0f;
}
function boosterCells(memory, lit) {
  for (let k = 0; k < 4; k += 1) memory[HUD_CELLS + k] = k < lit ? 7 : 0;
}
const dots = (memory, rows) => rows.map((y) => {
  const pair = [memory[P2 + y], memory[P2 + y + 1]];
  if (pair[0] === LIT && pair[1] === LIT) return "lit";
  if (pair[0] === SOCKET && pair[1] === SOCKET) return "socket";
  return `$${pair[0].toString(16)}/$${pair[1].toString(16)}`;
});
const litCount = (memory, rows) => {
  const shown = dots(memory, rows);
  const n = shown.indexOf("socket") === -1 ? 4 : shown.indexOf("socket");
  assert.deepEqual(shown, rows.map((_, k) => (k < n ? "lit" : "socket")), `a gauge shows ${shown}`);
  return n;
};

// The fight as the entry leaves it, before its first tick: the meter empty,
// no booster, the ship alive under the band.
function fight(directory = 1) {
  const { memory, end } = runBossEntry({ prepare: (m) => { m[0xa603] = bossLevel(directory); } });
  assert.equal(end, "main_loop", `the boss entry ended at ${end}`);
  const region = manifest.boss.regions[regionOf(directory) - 1];
  placeBand(memory, region.stillAt ?? 32);
  memory[main("PLAYER_LIFECYCLE")] = 0;
  memory[main("PLAYER_LIFECYCLE") + 1] = 3;
  memory[main("player_y")] = SHIP_Y;
  hold(memory, false);
  boosterCells(memory, 0);
  return memory;
}
// One boss frame's tick, with the P2 writes it made (address -> value).
function tick(memory) {
  const writes = new Map();
  call(memory, lbl("lance_tick"), { hooks: { write: (address, value) => {
    if ((address >= P2 && address < P2 + 256) || address === HPOSP2 || address === SIZEP2 || address === COLPM2) {
      writes.set(address, value);
    }
  } } });
  return writes;
}
const settle = (memory, frames = 8) => { for (let f = 0; f < frames; f += 1) tick(memory); };

// The brief's sixth sector (717) was 96 B short: the run takes a seventh (718).
test("M6 stage 1b: the lance run takes seven sectors (712-718); the gauge's position is the variant's", () => {
  assert.equal(lance.sectors, 7);
  assert.equal(lance.startSector, 712);
  assert.ok(["a", "b"].includes(gauge.variant));
  assert.equal(gauge.hpos, gauge.variant === "a" ? 48 : 40, "A over column 0 (HPOS 48-55), B in the left border (40-47)");
  assert.ok(lance.bytes <= lance.capacityBytes);
});

test("M6 stage 1b: the fight's first frame draws both gauges whole, once - icons, eight sockets, HPOSP2, SIZEP2; COLPM2 never", () => {
  const memory = fight();
  const first = tick(memory);
  assert.equal(first.get(HPOSP2), gauge.hpos, "HPOSP2 once, the variant's");
  assert.equal(first.get(SIZEP2), 0, "single width");
  assert.ok(!first.has(COLPM2), "the lasers' colour is not touched");
  assert.deepEqual([...memory.subarray(P2 + LANCE_ICON.y, P2 + LANCE_ICON.y + 6)], LANCE_ICON.rows, "the lance icon");
  assert.deepEqual([...memory.subarray(P2 + BOOST_ICON.y, P2 + BOOST_ICON.y + 6)], BOOST_ICON.rows, "the booster icon");
  assert.equal(litCount(memory, LANCE_DOT), 0, "the meter empty at the entry");
  assert.equal(litCount(memory, BOOST_DOT), 0, "no booster");
  for (let y = 0; y < 256; y += 1) {
    if (y < GAUGE_TOP || y > GAUGE_BOTTOM) assert.equal(memory[P2 + y], 0, `P2 row ${y} outside the gauges`);
  }
  // Never again: 300 frames of a filling meter write neither register.
  for (let f = 0; f < 300; f += 1) {
    const writes = tick(memory);
    assert.ok(!writes.has(HPOSP2) && !writes.has(SIZEP2) && !writes.has(COLPM2), `frame ${f}: a register rewritten`);
  }
});

for (const difficulty of [0, 1, 2]) {
  test(`M6 stage 1b: the lance gauge lights a dot at each quarter of the meter (${["EASY", "MEDIUM", "HARD"][difficulty]})`, () => {
    const memory = fight();
    memory[DIFFICULTY] = difficulty;
    tick(memory);                                       // the gauges drawn
    const full = METER[difficulty];
    for (const [k, t] of thresholds(full).entries()) {
      // One frame before the quarter: settled (the meter held), nothing written.
      for (let f = 0; f < 8; f += 1) { setMeter(memory, t - 2); tick(memory); }
      setMeter(memory, t - 2);
      assert.equal(tick(memory).size, 0, `quarter ${k + 1}: a write with no change (meter ${t - 1})`);
      assert.equal(litCount(memory, LANCE_DOT), k, `quarter ${k + 1}: ${k} lit before ${t}`);
      // The frame the meter reaches it: exactly one dot, two bytes.
      const writes = tick(memory);
      assert.equal(meterOf(memory), t);
      assert.deepEqual([...writes.keys()].sort(), [P2 + LANCE_DOT[k], P2 + LANCE_DOT[k] + 1], `quarter ${k + 1}: one dot`);
      assert.equal(litCount(memory, LANCE_DOT), k + 1);
      assert.equal(quartersOf(meterOf(memory), full), k + 1);
    }
  });
}

test("M6 stage 1b: the charge empties the lance gauge from the top, one dot a step, and a release fills it again", () => {
  const memory = fight();
  tick(memory);
  setMeter(memory, METER[1] - 1);
  settle(memory);                                       // a lance ready: 4 lit
  assert.equal(memory[lbl("lance_ready")], 0xff);
  assert.equal(litCount(memory, LANCE_DOT), 4);
  hold(memory, true);
  const stepFrames = [];
  for (let frame = 1; frame < CHARGE; frame += 1) {
    const writes = [...tick(memory).keys()].filter((a) => a >= P2);
    const charge = memory[lbl("_lance_charge")];
    assert.equal(charge, frame);
    // A step lands on its frame, or on the next when the mark's swap took it.
    const lit = litCount(memory, LANCE_DOT);
    assert.ok(lit === chargeLit(charge) || lit === chargeLit(charge - 1), `charge ${charge}: ${lit} lit`);
    if (writes.length > 0) {
      assert.equal(writes.length, 2, `charge ${charge}: one dot`);
      stepFrames.push(charge);
    }
  }
  assert.equal(litCount(memory, LANCE_DOT), 0, "empty before the fire");
  assert.equal(stepFrames.length, 4, `four steps (${stepFrames})`);
  // Released: back to 4, one dot a frame.
  hold(memory, false);
  for (let lit = 1; lit <= 4; lit += 1) {
    const writes = tick(memory);
    assert.equal(writes.size, 2);
    assert.equal(litCount(memory, LANCE_DOT), lit);
  }
  assert.equal(tick(memory).size, 0, "settled: nothing written");
});

test("M6 stage 1b: a shot over a target leaves the lance gauge empty; a dry shot gives the four back after its beam", () => {
  for (const dry of [false, true]) {
    const memory = fight();
    tick(memory);
    setMeter(memory, METER[1] - 1);
    settle(memory);
    const p = memory[lbl("boss_shown_pos")];
    const xOf = (c) => c * 4 + 32 - p - 7;
    if (!dry) {
      // A column whose front module a shot would hurt, not the core (the
      // lance's target; tests/lance.test.mjs's oracle).
      const column = Array.from({ length: 64 }, (_, c) => c).find((c) => {
        const module = memory[lbl("boss_column_map") + c];
        if (xOf(c) < 48 || xOf(c) > 191 || module >= 16 || memory[lbl("_boss_kind") + module] === 4) return false;
        const copy = Uint8Array.from(memory);
        copy[lbl("_boss_hit_module")] = module;
        return call(copy, lbl("_boss_c_hit")).a === 1;
      });
      assert.ok(column !== undefined, "a target column");
      memory[main("player_x")] = xOf(column);
    }
    if (dry) {
      // A column with no target under the ship's centre: armour or open sky
      // in the column map (journal §BH: the beam flies, the lance is kept).
      const column = Array.from({ length: 64 }, (_, c) => c).find((c) =>
        xOf(c) >= 48 && xOf(c) <= 191 && memory[lbl("boss_column_map") + c] >= 16);
      assert.ok(column !== undefined, "a column with no target");
      memory[main("player_x")] = xOf(column);
    }
    hold(memory, true);
    let frames = 0;
    while (memory[lbl("lance_beam")] === 0 && frames < CHARGE + 5) { tick(memory); frames += 1; }
    assert.notEqual(memory[lbl("lance_beam")], 0, "the beam fired");
    hold(memory, false);
    for (let f = 0; f < 60 && memory[lbl("lance_beam")] !== 0; f += 1) tick(memory);
    assert.equal(memory[lbl("lance_beam")], 0, "the beam down");
    settle(memory);
    const lit = litCount(memory, LANCE_DOT);
    assert.equal(memory[lbl("lance_ready")], dry ? 0xff : 0, dry ? "the dry shot keeps the lance" : "the shot spends it");
    if (dry) assert.equal(lit, 4, "the lance kept: four lit");
    else assert.equal(lit, quartersOf(meterOf(memory), METER[1]), "the meter emptied: its quarters again");
  }
});

test("M6 stage 1b: the booster gauge follows the HUD's lit BOOST cells, its blink included, one dot a frame", () => {
  const memory = fight();
  tick(memory);
  for (const lit of [4, 3, 2, 1, 0, 2, 4, 0]) {
    boosterCells(memory, lit);
    settle(memory, 5);
    assert.equal(litCount(memory, BOOST_DOT), lit, `${lit} cells lit`);
    assert.equal(tick(memory).size, 0, `${lit}: settled, nothing written`);
  }
  // The HUD's blink of the last cell: the last dot follows it.
  boosterCells(memory, 1);
  settle(memory, 3);
  memory[HUD_CELLS] = 0;
  assert.equal(tick(memory).size, 2);
  assert.equal(litCount(memory, BOOST_DOT), 0);
  memory[HUD_CELLS] = 7;
  assert.equal(tick(memory).size, 2);
  assert.equal(litCount(memory, BOOST_DOT), 1);
  // The lance gauge first: a frame with both changes writes one dot.
  boosterCells(memory, 4);
  setMeter(memory, thresholds(METER[1])[0] - 1);
  const writes = tick(memory);
  assert.equal(writes.size, 2, "one gauge write a frame");
});

test("M6 stage 1b: frame by frame, P2 is written only on a change - a whole fight's meter, charges and boosters", () => {
  const memory = fight();
  let installs = 0;
  let steps = 0;
  for (let frame = 0; frame < 2600; frame += 1) {
    // A booster from frame 400 to 900, its cells draining as the HUD's do.
    const boost = frame < 400 || frame >= 900 ? 0 : 4 - Math.floor((frame - 400) / 125);
    boosterCells(memory, boost);
    // The gesture held for 100 frames in every 400 once a lance is ready
    // (the charge, its release, the fire and the meter again).
    hold(memory, memory[lbl("lance_ready")] === 0xff && frame % 400 < 100);
    const before = frame === 0 ? null : [litCount(memory, LANCE_DOT), litCount(memory, BOOST_DOT)];
    const writes = tick(memory);
    if (writes.has(HPOSP2)) installs += 1;
    if (frame === 0) continue;
    // What each gauge should show after this frame.
    const ready = memory[lbl("lance_ready")] === 0xff && memory[lbl("lance_beam")] === 0;
    const wanted = [ready ? chargeLit(memory[lbl("_lance_charge")]) : quartersOf(meterOf(memory), METER[1]), boost];
    const after = [litCount(memory, LANCE_DOT), litCount(memory, BOOST_DOT)];
    const bytes = [...writes.keys()].filter((a) => a >= P2 && a < P2 + 256);
    if (before[0] === wanted[0] && before[1] === wanted[1]) {
      assert.equal(bytes.length, 0, `frame ${frame}: written with both gauges as wanted (${before})`);
    }
    if (bytes.length > 0) {
      steps += 1;
      assert.equal(bytes.length, 2, `frame ${frame}: one dot, two bytes`);
      const moved = [0, 1].filter((g) => after[g] !== before[g]);
      assert.equal(moved.length, 1, `frame ${frame}: one gauge a frame`);
      const g = moved[0];
      assert.equal(Math.abs(after[g] - before[g]), 1, `frame ${frame}: one dot`);
      assert.ok(Math.abs(wanted[g] - after[g]) < Math.abs(wanted[g] - before[g]), `frame ${frame}: toward the wanted level`);
    } else {
      assert.deepEqual(after, before, `frame ${frame}: a gauge changed without a write`);
    }
  }
  assert.equal(installs, 1, "HPOSP2 written once in the fight");
  assert.ok(steps > 20, `the run exercised the gauges (${steps} steps)`);
});
