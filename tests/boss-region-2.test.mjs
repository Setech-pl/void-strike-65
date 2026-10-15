// S5-5 (feat/boss-region-2, docs/plans/s5-boss-regions.md §6.5; the owner's
// design of 2026-10-14 and his choice of 2026-10-15: N-C with W2): region 2's
// boss, the Bastion - the hangar (its doors over the core), the two laser
// cannons hugging it, the two sliding gun rails. The data
// (assets/graphics/boss-regions/region-2/), the built disk's region 2, and the
// rails and the hangar on the 6502 harness through the real boss entry at
// level 4 (tier 1: the twin cannons take turns) or level 5 (tier 2: two
// beams) - the rails' code is read from the built disk into slot F:
//   1. the layout, the hit points, the rails and the hangar are region 2's own
//      data (W2: three 3-cell guns a side at a 4-column pitch, two slides, the
//      second covering the cannon), and the built disk carries them;
//   2. the art rule (plan boss-polish §10.3) and the palette against the ally
//      steel of levels 4-6 ($88); one ship; every module in reach;
//   3. a rail slides exactly one pitch per kill of its front gun, never
//      otherwise, and stops over its cannon - never over the doors or the core;
//   4. hit detection follows the rail: a gun's current columns hit it, its old
//      ones do not;
//   5. a covered cannon is invulnerable (the shot deflects) and keeps firing;
//   6. the doors: locked until every cannon and rail gun is destroyed or
//      covered - another colour and pattern, shots deflect - then open: their
//      open look, their flash and a tone; the core only behind them;
//   7. the escort: launched from the doors' column, its cue the doors' flash,
//      none once the doors fall;
//   8. fairness: the core's reach lies under the left cannon's beam (danger,
//      not a refuge), every beam left with >= 10 warning frames to spare, and
//      repeated windows (>= 50 frames each) to shoot the core outside every
//      warned or active beam in the core phase, per level and difficulty;
//   9. the stress composition (scripts/measure-boss-stress-r2.mjs) under the
//      reachable limit 8,500, and no frame with a kill and a gun's spawn.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { BOSS_TABLE, bossRegionDirectory, compileBossRegion, loadBossRegionDraft } from "../scripts/boss-assets.mjs";
import { BOSS_DEF_LASER_WARNING_OFFSET } from "../scripts/level-compiler.mjs";
import { atariPalRegisterToRgb } from "../scripts/preview.mjs";
import { call, includeConstants, label, labelsOf, manifest, nmi, placeBand, root, runBossEntry, shootAt } from "./boss-harness.mjs";

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const draftDirectory = bossRegionDirectory(root, 2);
const hasDraft = fs.existsSync(path.join(draftDirectory, "modules.json"));
const draft2 = hasDraft ? loadBossRegionDraft(draftDirectory) : null;
const region2 = hasDraft ? compileBossRegion(draft2) : null;
const region1 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));
const index = (name) => region2.modules.findIndex((module) => module.name === name);
const hasRails = labelsOf.boss.has("rail_front");
const layout = includeConstants("boss-layout.inc");
const BAND_A = layout.get("BOSS_BAND_A");
const ARMOUR_COLUMN = 0xfe;                              // BOSS_COLUMN_ARMOUR
const STILL = 32;

test("region 2 is the Bastion from its own draft: W2's layout, the hit points, the rails, the hangar, on the built disk", () => {
  assert.ok(hasDraft, "assets/graphics/boss-regions/region-2/ has no draft");
  assert.equal(region2.name, "Bastion");
  const at = Object.fromEntries(region2.modules.map((m) => [m.name, [m.kind,
    m.x, m.row, m.width, m.height]]));
  assert.deepEqual(at, {
    "rail-l-1": ["pulse", 19, 2, 3, 2], "rail-l-2": ["pulse", 15, 2, 3, 2], "rail-l-3": ["pulse", 11, 2, 3, 2],
    "cannon-l": ["emitter", 29, 1, 2, 3], core: ["salvo", 31, 1, 1, 3], "cannon-r": ["emitter", 32, 1, 2, 3],
    "rail-r-1": ["pulse", 41, 2, 3, 2], "rail-r-2": ["pulse", 45, 2, 3, 2], "rail-r-3": ["pulse", 49, 2, 3, 2],
    doors: ["armour", 31, 4, 1, 1],
  }, "W2 (the owner's choice of 2026-10-15): three 3-cell guns a side, the hangar one column at 31");
  // The hit points (tuned in Phase B, plan s5-boss-regions §6.5.8).
  const hp = Object.fromEntries(region2.modules.map((m) => [m.name, m.hp]));
  for (const name of ["rail-l-1", "rail-l-2", "rail-l-3", "rail-r-1", "rail-r-2", "rail-r-3"]) {
    assert.equal(hp[name], hp["rail-l-1"], `${name}: every rail gun alike`);
  }
  assert.equal(hp["cannon-l"], hp["cannon-r"]);
  const { rails, hangar } = region2;
  assert.ok(rails !== null && hangar !== null, "the region carries its rails and its hangar");
  assert.deepEqual([rails.pitch, rails.positions, rails.gunWidth, rails.framesPerStep, rails.delayFrames, rails.pulseFrames],
    [4, 2, 3, 4, 12, 16], "a 4-column pitch, two slides; 12 frames, then 4 a column (the owner's slide timing)");
  assert.deepEqual(rails.sides.map((s) => [s.nose, s.guns.map((i) => region2.modules[i].name), region2.modules[s.cannon].name]), [
    [22, ["rail-l-1", "rail-l-2", "rail-l-3"], "cannon-l"], [40, ["rail-r-1", "rail-r-2", "rail-r-3"], "cannon-r"]]);
  assert.deepEqual([region2.modules[hangar.doors].name, region2.modules[hangar.core].name], ["doors", "core"]);
  assert.ok(region2.openLooks.has(hangar.doors), "the doors have an open look");
  assert.deepEqual([region2.tables[BOSS_TABLE.framesPerStep], region2.tables[BOSS_TABLE.start]], [0, STILL], "a still band at 32");
  assert.equal(region2.bandShownRows, 5, "the band ends at its last non-empty row (the doors' row)");
  for (const byte of ["escortAfter", "escortBase", "escortJitter"]) {
    assert.equal(region2.tables[BOSS_TABLE[byte]], region1.tables[BOSS_TABLE[byte]], `${byte}: region 1's escort cadence (decision AI)`);
  }
  assert.equal(region2.fire.finaleCooldown, 12, "the final salvos are on in region 2");
  const built = manifest.boss.regions[1];
  assert.equal(built.name, "Bastion", "the title BASTION");
  assert.equal(built.modules, region2.modules.length, "the built disk's region 2 is the draft's");
  assert.equal(built.rails?.positions, 2);
  assert.ok(built.hangar?.unlockFrames > 0);
  const block = manifest.boss.slotF.blocks[1];
  assert.ok(block.codeBytes > 0, "region 2's block carries the rails' code");
  assert.ok(block.bytes <= manifest.boss.slotF.capacityBytes, `region 2's block is ${block.bytes} B`);
  assert.ok(region2.lookTail.length <= 110, "the look tail fits slot F's rule");
  assert.ok(region2.codeCount <= 128, `${region2.codeCount} codes`);
});

test("the geometry: the first slide leaves each cannon clear, the second covers it, no slide reaches the hangar", () => {
  assert.ok(hasDraft);
  const { rails } = region2;
  for (const side of rails.sides) {
    const cannon = region2.modules[side.cannon];
    const fronts = [0, 1, 2].map((k) => side.nose + side.dir * k * rails.pitch);
    const inside = (c) => c >= cannon.x && c <= cannon.x + cannon.width - 1;
    assert.ok(!inside(fronts[0]) && !inside(fronts[1]), `${side.name}: fronts ${fronts}`);
    const covered = side.dir > 0 ? fronts[2] >= cannon.x + cannon.width - 1 : fronts[2] <= cannon.x;
    assert.ok(covered, `${side.name}: the second slide covers ${cannon.name} (front ${fronts[2]})`);
    assert.ok(fronts.every((c) => c !== 31), `${side.name}: a front at the hangar's column`);
    // The guns' slots: each gun locks into the front slot (in the shots'
    // reach, columns 14-52 at the still position).
    assert.ok(side.frontSlot[0] >= 14 && side.frontSlot[1] <= 52, `${side.name}'s front slot ${side.frontSlot}`);
  }
});

test("the art rule: every damage stage of every region 2 module has colour-3 pixels; the opened doors' PF2", () => {
  assert.ok(hasDraft);
  const colour3 = (code) => {
    let n = 0;
    for (let y = 0; y < 8; y += 1) {
      const byte = region2.runs.charset.data[(code & 0x7f) * 8 + y] ?? 0;
      for (let px = 0; px < 4; px += 1) if (((byte >> (6 - 2 * px)) & 3) === 3) n += 1;
    }
    return n;
  };
  const K = region2.stageStep;
  const staged = (code) => (code & 0x7f) >= region2.stagedBase && (code & 0x7f) < region2.plainBase;
  region2.modules.forEach((module, i) => {
    const look = region2.openLooks.get(i) ?? [...Array(module.width * module.height).keys()].map((k) =>
      region2.bandRows[module.row + Math.floor(k / module.width)][module.x + (k % module.width)]);
    [0, 1, 2].forEach((stage) => {
      const count = look.filter((code) => code & 0x7f).reduce((sum, code) => sum + colour3(staged(code) ? code + stage * K : code), 0);
      assert.ok(count >= 4, `${module.name} stage ${stage}: ${count} colour-3 pixels`);
    });
  });
  // The doors once open take damage in the PF2 bank (bit 7 clear), so b3's
  // flash turns their amber to the hull's olive and back.
  const doorsOpen = region2.openLooks.get(index("doors"));
  assert.ok(doorsOpen.every((code) => (code & 0x80) === 0 && staged(code)), "the opened doors are staged PF2 cells");
});

test("the doors read locked or open: another colour bank and another glyph", () => {
  assert.ok(hasDraft);
  const doors = region2.modules[index("doors")];
  const locked = region2.bandRows[doors.row][doors.x];
  const open = region2.openLooks.get(index("doors"))[0];
  assert.notEqual(locked & 0x7f, open & 0x7f, "the same glyph locked and open");
  assert.equal(locked & 0x80, 0x80, "locked: the olive (PF3) bank - barred armour");
  assert.equal(open & 0x80, 0, "open: the amber (PF2) bank - the chevrons");
});

test("the palette reads as the enemy on levels 4-6: no colour register near the ally steel $88's hue", () => {
  assert.ok(hasDraft);
  const hue = (value) => {
    const [r, g, b] = atariPalRegisterToRgb(value).map((c) => c / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d < 0.1) return null;
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const ally = hue(0x88);
  [0, 1, 2, 3].map((i) => region2.tables[BOSS_TABLE.palette + i]).forEach((value, i) => {
    const h = hue(value);
    if (h === null) return;
    const distance = Math.min(Math.abs(h - ally), 360 - Math.abs(h - ally));
    assert.ok(distance >= 45, `COLPF${i} $${value.toString(16)} is ${distance.toFixed(0)} degrees from $88`);
  });
});

test("one ship: the track is whole from screen edge to screen edge, and every module is in the player's reach", () => {
  assert.ok(hasDraft);
  const owner = new Set(region2.modules.flatMap((m) => [...Array(m.width * m.height).keys()]
    .map((k) => `${m.x + (k % m.width)},${m.row + Math.floor(k / m.width)}`)));
  for (let c = 12; c <= 51; c += 1) {
    assert.ok(region2.bandRows[0][c] !== 0 && !owner.has(`${c},0`), `the track's cell (${c}, 0) is hull`);
  }
  // A shot leaves the fighter's centre (x + 8, x even 48..200) and meets band
  // column (x + 8 - 32 + p) / 4; every module but the rails' back guns (in
  // reach once they lock into the front slot) is in reach where it stands.
  const back = new Set(region2.rails.sides.flatMap((s) => s.guns.slice(1)));
  for (const [i, m] of region2.modules.entries()) {
    if (back.has(i)) continue;
    const reach = [...Array(m.width).keys()].some((k) => m.x + k >= 14 && m.x + k <= 52);
    assert.ok(reach, `${m.name} (columns ${m.x}-${m.x + m.width - 1}) out of the player's shots`);
  }
});

// ---------------------------------------------------------------------------
// The rails and the hangar on the 6502 harness, through the real boss entry.
// ---------------------------------------------------------------------------
const entries = new Map();
function bastion({ level = 4, difficulty = 1 } = {}) {
  if (!entries.has(level)) entries.set(level, runBossEntry({ prepare: (memory) => { memory[0xa603] = level; } }));
  const entry = entries.get(level);
  assert.equal(entry.end, "main_loop");
  const memory = Uint8Array.from(entry.memory);
  memory[main("DIFFICULTY_SETTING")] = difficulty;
  placeBand(memory, STILL);
  return memory;
}
const LIFECYCLE = () => main("PLAYER_LIFECYCLE");
function frame(memory, { hooks = null } = {}) {
  memory[LIFECYCLE()] = 0;
  memory[LIFECYCLE() + 1] = 3;
  memory[main("loader_dli_phase")] = 0;
  memory[main("frame_counter")] = (memory[main("frame_counter")] + 1) & 0xff;   // the VBI's
  const h = hooks === null ? {} : { hooks };
  nmi(memory, lbl("boss_dli"), h);
  call(memory, lbl("boss_update"), h);
  call(memory, manifest.overlays.capitalVectors.address + 8 * 3, h);
  call(memory, lbl("boss_motion"), h);
  nmi(memory, lbl("boss_dli"), h);
  nmi(memory, lbl("boss_dli"), h);
}
const run = (memory, frames) => { for (let f = 0; f < frames; f += 1) frame(memory); };
const HP = (memory, name) => memory[lbl("_boss_hp") + index(name)];
const RECORD = (i) => lbl("_boss_module_table") + 12 * i;
const columnsOf = (memory, name) => {
  const x = memory[RECORD(index(name))];
  return [...Array(region2.modules[index(name)].width).keys()].map((k) => x + k);
};
const exposed = (memory, name) => (((memory[lbl("_boss_exposed_lo")] | (memory[lbl("_boss_exposed_hi")] << 8)) >> index(name)) & 1) === 1;
const front = (memory, side) => memory[lbl("rail_front") + side];
const slides = (memory, side) => memory[lbl("rail_k") + side];
// One shot at a column, met on this frame.
function shoot(memory, column) {
  shootAt(memory, column, 0);
  frame(memory);
}
// A module destroyed through the game's own path: a shot at its last hit point.
function destroy(memory, name, { settle = 60 } = {}) {
  assert.ok(exposed(memory, name), `${name} is not exposed`);
  memory[lbl("_boss_hp") + index(name)] = 1;
  shoot(memory, columnsOf(memory, name)[1] ?? columnsOf(memory, name)[0]);
  assert.equal(HP(memory, name), 0, `${name} did not fall`);
  run(memory, settle);
}
const map = (memory, column) => memory[lbl("boss_column_map") + column];
const cell = (memory, column, row) => memory[BAND_A + row * 64 + column];

test("a rail slides exactly one pitch per kill of its front gun, never otherwise, and stops over its cannon", () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  const memory = bastion();
  assert.deepEqual([front(memory, 0), front(memory, 1), slides(memory, 0), slides(memory, 1)], [22, 40, 0, 0]);
  run(memory, 400);
  assert.deepEqual([front(memory, 0), front(memory, 1)], [22, 40], "a rail moved on its own");
  // A kill that is not a rail's front gun moves no rail.
  destroy(memory, "cannon-r", { settle: 200 });
  assert.deepEqual([front(memory, 0), front(memory, 1)], [22, 40], "a cannon's kill moved a rail");
  // The left rail's front gun: one pitch, one column at a time, after the delay.
  memory[lbl("_boss_hp") + index("rail-l-1")] = 1;
  shoot(memory, 20);
  const seen = [front(memory, 0)];
  for (let f = 0; f < 80; f += 1) { frame(memory); seen.push(front(memory, 0)); }
  const steps = seen.map((c, i) => (i === 0 ? 0 : c - seen[i - 1])).filter((d) => d !== 0);
  assert.deepEqual(steps, [1, 1, 1, 1], `the left rail's front ${[...new Set(seen)]}`);
  assert.ok(seen.indexOf(23) >= 12, "the first column before the delay ran out");
  assert.deepEqual([front(memory, 0), slides(memory, 0), front(memory, 1), slides(memory, 1)], [26, 1, 40, 0]);
  run(memory, 300);
  assert.deepEqual([front(memory, 0), slides(memory, 0)], [26, 1], "the rail slid again on its own");
  destroy(memory, "rail-l-2");
  assert.deepEqual([front(memory, 0), slides(memory, 0)], [30, 2], "the second kill slid it over the cannon");
  destroy(memory, "rail-l-3", { settle: 200 });
  assert.deepEqual([front(memory, 0), slides(memory, 0)], [30, 2], "the rail went past its last position");
  // The right rail, the mirror.
  destroy(memory, "rail-r-1");
  destroy(memory, "rail-r-2");
  assert.deepEqual([front(memory, 1), slides(memory, 1)], [32, 2]);
});

test("hit detection follows the rail: a gun's current columns hit it, its old columns do not", () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  const memory = bastion();
  assert.deepEqual(columnsOf(memory, "rail-l-2"), [15, 16, 17]);
  destroy(memory, "rail-l-1");
  assert.deepEqual(columnsOf(memory, "rail-l-2"), [19, 20, 21], "the gun's record moved with the rail");
  assert.ok(exposed(memory, "rail-l-2"), "the next gun locked in");
  const hp = HP(memory, "rail-l-2");
  for (const column of [15, 16, 17]) { shoot(memory, column); run(memory, 3); }
  assert.equal(HP(memory, "rail-l-2"), hp, "a shot at the gun's old columns hit it");
  for (const column of [19, 20, 21]) {
    const before = HP(memory, "rail-l-2");
    shoot(memory, column);
    assert.equal(HP(memory, "rail-l-2"), before - 1, `a shot at column ${column} missed the gun there`);
    run(memory, 3);
  }
  for (let c = 19; c <= 21; c += 1) assert.equal(map(memory, c), index("rail-l-2"), `the map's column ${c}`);
});

test("a covered cannon is invulnerable - the shot deflects - and keeps firing; the rail never covers the doors or the core", () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  for (const level of [4, 5]) {
    const memory = bastion({ level });
    destroy(memory, "rail-l-1");
    destroy(memory, "rail-l-2");
    destroy(memory, "rail-r-1");
    destroy(memory, "rail-r-2");
    for (const c of [29, 30, 32, 33]) assert.equal(map(memory, c), ARMOUR_COLUMN, `level ${level}: column ${c} is not the rail's`);
    assert.equal(map(memory, 31), index("doors"), "the hangar's column is the doors'");
    const hp = HP(memory, "cannon-l");
    for (const c of [29, 30]) {
      shoot(memory, c);
      const ring = [...Array(8).keys()].filter((r) => memory[lbl("boss_ring_timer") + r] !== 0 &&
        (memory[lbl("boss_ring_lo") + r] & 63) === c && memory[lbl("boss_ring_glyph") + r] === region2.deflect);
      assert.equal(ring.length, 1, `level ${level}: no deflection at column ${c}`);
      run(memory, 3);
    }
    assert.equal(HP(memory, "cannon-l"), hp, "the covered cannon took damage");
    // It keeps firing: each covered cannon's laser warns and fires.
    const fired = new Set();
    for (let f = 0; f < 1200 && fired.size < 2; f += 1) {
      frame(memory);
      for (let laser = 0; laser < 4; laser += 1) {
        if (memory[lbl("boss_laser_state") + laser] === 2) fired.add(memory[lbl("boss_laser_module") + laser]);
      }
    }
    assert.deepEqual([...fired].sort((a, b) => a - b), [index("cannon-l"), index("cannon-r")].sort((a, b) => a - b),
      `level ${level}: the covered cannons' beams`);
  }
});

test("the doors: locked until every cannon and rail gun is destroyed or covered, deflecting; then open, flashing, sounding; the core behind them", () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  const memory = bastion();
  const doors = region2.modules[index("doors")];
  const lockedCode = region2.bandRows[doors.row][doors.x];
  const openCode = region2.openLooks.get(index("doors"))[0];
  assert.equal(cell(memory, 31, 4), lockedCode, "the doors start locked");
  // Locked: a shot deflects (the glyph), no hit point lost - the doors' or the core's.
  const doorsHp = HP(memory, "doors"), coreHp = HP(memory, "core");
  shoot(memory, 31);
  assert.equal(cell(memory, 31, 4), region2.deflect, "no deflection glyph on the locked doors");
  run(memory, 3);
  assert.deepEqual([HP(memory, "doors"), HP(memory, "core")], [doorsHp, coreHp]);
  // Every cannon and rail gun destroyed or covered: the left side covered,
  // the right side's cannon destroyed, its rail emptied.
  destroy(memory, "rail-l-1");
  destroy(memory, "rail-l-2");
  destroy(memory, "rail-l-3");
  destroy(memory, "cannon-r");
  destroy(memory, "rail-r-1");
  destroy(memory, "rail-r-2");
  assert.ok(!exposed(memory, "doors"), "the doors opened with a rail gun standing");
  memory[lbl("_boss_hp") + index("rail-r-3")] = 1;
  shoot(memory, columnsOf(memory, "rail-r-3")[1]);
  // The unlock: the exposure check's frame, then the open look, the flash and
  // the tone.
  const writes = [];
  let flashed = false;
  for (let f = 0; f < 8; f += 1) {
    frame(memory, { hooks: { write: (address, value) => { if (address === 0xd204 || address === 0xd205) writes.push([address, value]); } } });
    if (memory[lbl("boss_mflash_timer")] !== 0 && memory[lbl("boss_mflash_m")] === index("doors")) flashed = true;
  }
  assert.ok(exposed(memory, "doors"), "the doors did not open");
  assert.ok(flashed, "the doors did not flash as they opened");
  assert.ok(writes.some(([a, v]) => a === 0xd204 && v === 0x18) && writes.some(([a, v]) => a === 0xd205 && v === 0xa6),
    `the unlock's tone: ${JSON.stringify(writes)}`);
  run(memory, 6);
  assert.equal(cell(memory, 31, 4), openCode, "the doors' open look");
  // Open: they take damage and flash (b3); the core still behind them.
  shoot(memory, 31);
  assert.equal(HP(memory, "doors"), doorsHp - 1, "the open doors took no damage");
  assert.equal(HP(memory, "core"), coreHp);
  run(memory, 4);
  destroy(memory, "doors");
  assert.ok(exposed(memory, "core"), "the core is exposed once the doors fall");
  shoot(memory, 31);
  assert.equal(HP(memory, "core"), coreHp - 1, "the core took no damage");
});

test("the escort: launched over the doors' column, the doors flash as its cue, none armed once the doors fall", () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  // The escort's entry: level 1's boss wave (the route's) enters at HPOS 124,
  // band column 31 at the still position - the doors.
  assert.equal(Math.floor((124 - 32 + STILL) / 4), 31, "the escort's column (HPOS 32 + 4c - p)");
  const memory = bastion();
  const timer = 0x80fd;                                  // src/c/director.c STATE_SPACING (the escort's clock)
  const cue = region2.hangar.cueFrames;
  memory[timer] = cue + 1;
  frame(memory);
  assert.equal(memory[timer], cue);
  assert.equal(memory[lbl("boss_mflash_req")], index("doors"), "no cue on the doors");
  // The doors fall: the clock stops for good.
  memory[lbl("_boss_hp") + index("doors")] = 0;
  memory[timer] = 90;
  frame(memory);
  assert.equal(memory[timer], 0, "the escort's clock runs on after the doors fell");
  run(memory, 200);
  assert.equal(memory[timer], 0);
});

test("the cover warning: one slide from covering a standing cannon, the gun whose fall would cover it pulses", () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  const memory = bastion();
  const pulses = (m, frames) => {
    let n = 0;
    for (let f = 0; f < frames; f += 1) {
      frame(m);
      if (m[lbl("boss_mflash_m")] === index("rail-l-2") && m[lbl("boss_mflash_timer")] === 3) n += 1;
    }
    return n;
  };
  run(memory, 4);
  destroy(memory, "rail-l-1");
  const n = pulses(memory, 96);
  assert.ok(n >= 5 && n <= 6, `${n} pulses of rail-l-2 in 96 frames`);
  // With its cannon destroyed, no warning.
  const quiet = bastion();
  destroy(quiet, "cannon-l");
  destroy(quiet, "rail-l-1");
  assert.equal(pulses(quiet, 96), 0, "a warning with no cannon to cover");
});

// The beam's hit window (laser_collide): edge - x in -3 .. 7, the edge the
// beam's left colour clock, 32 + (x * 4 + width * 2) - 2 - p.
const beamEdge = (m) => 32 + (m.x * 4 + m.width * 2) - 2 - STILL;
const inBeam = (m, x) => beamEdge(m) - x >= -3 && beamEdge(m) - x <= 7;
// The x a shot meets band column c from: (x + 8 - 32 + p) / 4 = c, x even.
const reachOf = (c) => [...Array(4).keys()].map((k) => 4 * c + k + 32 - 8 - STILL).filter((x) => x % 2 === 0);

test("fairness: the core's reach lies under the left cannon's beam, every beam is left with >= 10 warning frames to spare", () => {
  assert.ok(hasDraft);
  const cannonL = region2.modules[index("cannon-l")];
  const cannonR = region2.modules[index("cannon-r")];
  assert.ok(reachOf(31).every((x) => inBeam(cannonL, x)), `the core's reach ${reachOf(31)}: a refuge from the left beam`);
  assert.ok(reachOf(31).every((x) => !inBeam(cannonR, x)), "the right beam over the core's reach too (geometry moved)");
  const def = includeConstants("level-def.inc").get("LEVEL_PAYLOAD_BOSS_DEF") + BOSS_DEF_LASER_WARNING_OFFSET;
  const warnings = [0, 1, 2].map((d) => bastion()[def + d]);
  // The worst escape: from the window's deepest x, two colour clocks a frame
  // (the ship's speed), out of an 11-clock window on the still band.
  let worst = 0;
  for (const cannon of [cannonL, cannonR]) {
    for (let x = 48; x <= 200; x += 2) {
      if (!inBeam(cannon, x)) continue;
      const out = Math.min(...[-2, 2].map((d) => { let f = 0, y = x; while (inBeam(cannon, y)) { y += d; f += 1; } return f; }));
      worst = Math.max(worst, out);
    }
  }
  warnings.forEach((warning, d) => {
    console.log(`# difficulty ${d}: warning ${warning} frames, worst escape ${worst}, ${warning - worst} left`);
    assert.ok(warning - worst >= 10, `difficulty ${d}: ${warning - worst} frames left`);
  });
});

test("fairness: in the core phase, repeated windows to shoot the core outside every warned or active beam", { timeout: 300_000 }, () => {
  assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
  // The careless end: both cannons covered (still firing), the doors down;
  // the core's reach (x 116, 118) is under the left beam. A window is a run of
  // frames with no beam that endangers that reach in its warning or beam.
  const cannonL = region2.modules[index("cannon-l")];
  for (const level of [4, 5]) {
    for (const difficulty of [0, 1, 2]) {
      const memory = bastion({ level, difficulty });
      for (const name of ["rail-l-1", "rail-l-2", "rail-r-1", "rail-r-2", "rail-l-3", "rail-r-3"]) destroy(memory, name);
      destroy(memory, "doors");
      assert.ok(exposed(memory, "core"));
      const windows = [];
      // open < 0 until the first danger ends: the measurement's first run of
      // free frames starts mid-cycle, not after a beam.
      let open = -1, beams = 0;
      for (let f = 0; f < 3000; f += 1) {
        frame(memory);
        let danger = false;
        for (let laser = 0; laser < 4; laser += 1) {
          const state = memory[lbl("boss_laser_state") + laser];
          const module = memory[lbl("boss_laser_module") + laser];
          if (state === 0 || module === 0xff) continue;
          const m = region2.modules[module];
          if (reachOf(31).some((x) => inBeam(m, x))) danger = true;
        }
        if (memory[lbl("boss_laser_state")] === 2 && memory[lbl("boss_laser_module")] === index("cannon-l")) beams += 1;
        if (danger) { if (open > 0) windows.push(open); open = 0; } else if (open >= 0) open += 1;
      }
      console.log(`# level ${level}, difficulty ${difficulty}: ${windows.length} windows between the left beams in 3,000 frames, ` +
        `shortest ${Math.min(...windows)}, longest ${Math.max(...windows)}; left-beam frames ${beams}`);
      assert.ok(beams > 0, `level ${level} difficulty ${difficulty}: the covered left cannon never fired`);
      // Repeated: at least three windows, none under a second (50 frames).
      assert.ok(windows.length >= 3 && windows.every((w) => w >= 50), `level ${level} difficulty ${difficulty}: windows ${windows}`);
      assert.ok(inBeam(cannonL, 116) && inBeam(cannonL, 118));
    }
  }
});

test("the stress composition: region 2's reachable worst under 8,500 at levels 4 and 5, no frame with a kill and a spawn",
  { timeout: 900_000 }, async () => {
    assert.ok(hasRails, "the boss link has no rails (region 2's block code)");
    const { regionTwoStress } = await import("../scripts/measure-boss-stress-r2.mjs");
    for (const level of [4, 5]) {
      const { cases, worstOf, describe } = regionTwoStress({ level, maxMeetings: 2 });
      const worst = worstOf(cases.filter((c) => c.reach === "reachable"));
      console.log(`# region 2, level ${level} stress: ${cases.length} cases, worst reachable ${describe(worst)}`);
      assert.ok(worst.cycles <= 8500, `level ${level}: region 2's worst reachable frame ${worst.cycles} native cycles`);
      assert.equal(cases.reduce((sum, c) => sum + c.clashes, 0), 0, "rule (B): a kill frame with a gun's spawn");
    }
  });
