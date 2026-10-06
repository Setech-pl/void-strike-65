// M5b-S4b — the boss lasers (docs/plans/boss-lasers.md; the owner's decisions
// of 2026-10-06, §12: option A, the column written once, the warning, the
// damage, the absorb, slot D; QA1 the boss shot born at the gun's muzzle; QA2
// the band DLI writing COLPF3 first).
//
// Everything runs on the default build's linked images through the 6502
// harness: the window's boss entry against a drive answering from the built
// ATR (region 1, level 1, MEDIUM), then the overlay's UPDATE and DLI called the
// way the main loop and ANTIC reach them, the band held still. Tiers 2 and 4
// run on the laser fixture (scripts/boss-assets.mjs bossLaserFixtureDraft:
// region 1 with gun-1, gun-3 and gun-4 as emitter slots 2-4 and the plates in
// front of the four emitters removed, so all four are exposed and fire
// together), installed at level 5 and level 9.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import * as assets from "../scripts/boss-assets.mjs";
import {
  call, cpuOver, Drive, installRegion, label, labelsOf, nmi, placeBand, root, runBossEntry,
  runUntil, shootAt, visibleCells,
} from "./boss-harness.mjs";

const { BOSS_KIND, bossBandRowAddress, bossRegionDirectory, compileBossRegion, loadBossRegionDraft } = assets;
const region1 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));
const byName = new Map(region1.modules.map((module, index) => [module.name, index]));
const fixture = typeof assets.bossLaserFixtureDraft === "function"
  ? compileBossRegion(assets.bossLaserFixtureDraft(loadBossRegionDraft(bossRegionDirectory(root, 1))))
  : null;
const fixtureByName = fixture === null ? new Map()
  : new Map(fixture.modules.map((module, index) => [module.name, index]));

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const has = (name) => labelsOf.boss.has(name);
const PRIOR = 0xd01b, SIZEM = 0xd00c, HPOSM0 = 0xd004, COLPF3 = 0xd019, WSYNC = 0xd40a;
const AUDF2 = 0xd202, AUDC2 = 0xd203, AUDF3 = 0xd204, AUDC3 = 0xd205;
// The missile plane: PMG_BASE + $300 (src/main.s); pinned against the source below.
const MISSILES = 0x3b00;
const LASERS = 4;
const OFF = 0, WARN = 1, BEAM = 2;
const PLAYER_ALIVE = 0, PLAYER_DYING = 1, PLAYER_RESPAWN_INVULNERABLE = 2;
const LIFECYCLE = main("PLAYER_LIFECYCLE");
const LIVES = LIFECYCLE + 1;                       // src/main.s: PLAYER_LIVES = PLAYER_LIFECYCLE+$01
const COOLDOWN = main("BROAD_DAMAGE_COOLDOWN");
const HEALTH = COOLDOWN - 1;                        // BROAD_DAMAGE_COOLDOWN = BROAD_PLAYER_HEALTH+$01
const HOSTILE_FIRST = 5;
const laser = (memory, field, index) => memory[lbl(`boss_laser_${field}`) + index];
const setLaser = (memory, field, index, value) => { memory[lbl(`boss_laser_${field}`) + index] = value; };
const hp = (memory, index) => memory[lbl("_boss_hp") + index];

let entry = null;
function entered() {
  if (entry === null) entry = runBossEntry();
  return Uint8Array.from(entry.memory);
}
// Region 1 as the boss entry left it, the band held at p.
function regionOne(p = 32) {
  const memory = entered();
  placeBand(memory, p);
  return memory;
}
// The laser fixture at a level (5: tier 2, 9: tier 4; 1: tier 1), MEDIUM.
function laserFixture(level, { difficulty = 1, p = 32 } = {}) {
  assert.ok(fixture !== null, "scripts/boss-assets.mjs has no bossLaserFixtureDraft");
  const memory = entered();
  installRegion(memory, fixture, { level, difficulty });
  placeBand(memory, p);
  return memory;
}
function alive(memory, { health = 10, lives = 3 } = {}) {
  memory[LIFECYCLE] = PLAYER_ALIVE;
  memory[LIVES] = lives;
  memory[HEALTH] = health;
  memory[COOLDOWN] = 0;
}
// One boss frame, the band held still: the band DLI's phase 0 (it publishes
// the lasers' HPOS for the frame - the position the hit test reads), then
// UPDATE, every write of both recorded.
function update(memory, { watch = null } = {}) {
  const writes = [];
  const hooks = { write: (address, value) => { writes.push([address, value]); return undefined; } };
  memory[main("loader_dli_phase")] = 0;
  nmi(memory, lbl("boss_dli"), { hooks });
  const cpu = call(memory, lbl("boss_update"), { hooks, watch });
  return { writes, cycles: cpu.cycles };
}
const writesTo = (writes, address) => writes.filter(([a]) => a === address).map(([, v]) => v);
// The controller names `module` as the firing one; boss_fire dispatches it.
function fire(memory, module) {
  memory[lbl("_boss_fire_module")] = module;
  memory[lbl("_boss_fire_offset")] = 0;
  call(memory, lbl("boss_fire"));
}
const laserOf = (memory, module) =>
  [...Array(LASERS).keys()].find((i) => laser(memory, "module", i) === module);
// Frames until laser i leaves `state` (cap 200).
function framesIn(memory, i, state) {
  let frames = 0;
  while (laser(memory, "state", i) === state && frames < 200) { update(memory); frames += 1; }
  return frames;
}
function damageCalls(memory, frames, perFrame = () => {}) {
  let calls = 0;
  const site = lbl("boss_laser_damage");
  for (let frame = 0; frame < frames; frame += 1) {
    perFrame(frame);
    update(memory, { watch: (pc) => { if (pc === site) calls += 1; } });
  }
  return calls;
}

test("S4b: the overlay links the laser ABI in slot D", () => {
  for (const name of ["laser_tier", "laser_prepare", "laser_start", "laser_frame", "laser_publish",
    "boss_laser_damage", "boss_laser_slots", "boss_laser_module", "boss_laser_state",
    "boss_laser_timer", "boss_laser_edge", "boss_laser_hpos", "boss_laser_sizem", "boss_laser_fired"]) {
    assert.ok(has(name), `the boss link has no ${name}`);
  }
  for (const name of ["laser_tier", "laser_frame", "boss_laser_state"]) {
    assert.ok(lbl(name) >= 0x1900 && lbl(name) < 0x2000, `${name} is not in slot D ($1900-$1FFF)`);
  }
});

test("the missile plane the lasers write is main's PMG_BASE + $300", () => {
  const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
  const base = Number.parseInt(/^PMG_BASE\s*=\s*\$([0-9A-Fa-f]+)/m.exec(source)[1], 16);
  assert.match(source, /^MISSILES\s*=\s*PMG_BASE \+ \$0300/m);
  assert.equal(base + 0x300, MISSILES);
  assert.match(source, /^PLAYER_LIVES\s*=\s*PLAYER_LIFECYCLE\+\$01/m);
  assert.match(source, /^BROAD_DAMAGE_COOLDOWN\s*=\s*BROAD_PLAYER_HEALTH\+\$01/m);
});

test("option A: the install sets PRIOR's fifth-player bit and writes the emitter's column once", () => {
  const memory = regionOne();
  assert.equal(memory[PRIOR], 0x10, "PRIOR is not $10 in the boss sector");
  const emitter = byName.get("emitter");
  assert.equal(laser(memory, "module", 0), emitter, "the emitter (slot 1) is not laser 0 (M0)");
  for (let i = 1; i < LASERS; i += 1) assert.equal(laser(memory, "module", i), 0xff, `laser ${i} has a module`);
  const module = region1.modules[emitter];
  const top = 24 + (module.row + module.height) * 8;
  for (let line = 0; line < 256; line += 1) {
    const expected = line >= top && line < 240 ? 0x02 : 0x00;
    assert.equal(memory[MISSILES + line], expected, `missile plane line ${line}`);
  }
});

test("the laser count per tier: region 1 on level 1 has 1; the fixture has 2 on level 5 and 4 on level 9", () => {
  const one = regionOne();
  assert.equal(one[lbl("boss_laser_slots")], 1);
  assert.equal(one[lbl("_boss_kind") + byName.get("emitter")], BOSS_KIND.emitter,
    "region 1's emitter is still capped on level 1");
  const two = laserFixture(5);
  assert.equal(two[lbl("boss_laser_slots")], 2);
  assert.deepEqual([0, 1, 2, 3].map((i) => laser(two, "module", i)),
    [fixtureByName.get("emitter"), fixtureByName.get("gun-1"), 0xff, 0xff]);
  for (const name of ["gun-3", "gun-4"]) {
    assert.equal(two[lbl("_boss_kind") + fixtureByName.get(name)], BOSS_KIND.armour, `${name} is not capped at tier 2`);
  }
  const four = laserFixture(9);
  assert.equal(four[lbl("boss_laser_slots")], 4);
  assert.deepEqual([0, 1, 2, 3].map((i) => laser(four, "module", i)),
    ["emitter", "gun-1", "gun-3", "gun-4"].map((name) => fixtureByName.get(name)));
  for (let line = 0; line < 240; line += 1) {
    const expected = [0, 1, 2, 3].reduce((bits, i) => {
      const module = fixture.modules[laser(four, "module", i)];
      return line >= 24 + (module.row + module.height) * 8 ? bits | (0x02 << (2 * i)) : bits;
    }, 0);
    assert.equal(four[MISSILES + line], expected, `tier 4 plane line ${line}`);
  }
});

test("the laser's tier comes from the level id (decision 8) in the default build: 1 / 2 / 4", () => {
  const memory = regionOne();
  for (const [level, slots] of [[1, 1], [4, 1], [5, 2], [8, 2], [9, 4], [12, 4]]) {
    memory[0xa603] = level;
    call(memory, lbl("laser_tier"));
    assert.equal(memory[lbl("boss_laser_slots")], slots, `level ${level}`);
  }
});

test("a named emitter warns for 25 frames, fires for 50, and spawns no pulse shot", () => {
  const memory = laserFixture(1);
  alive(memory);
  memory[main("player_x")] = 60;
  const emitter = fixtureByName.get("emitter");
  const before = [...memory.subarray(main("FIGHTER_PROJECTILE_ACTIVE") + HOSTILE_FIRST,
    main("FIGHTER_PROJECTILE_ACTIVE") + HOSTILE_FIRST + 5)];
  fire(memory, emitter);
  const i = laserOf(memory, emitter);
  assert.equal(laser(memory, "state", i), WARN);
  assert.deepEqual([...memory.subarray(main("FIGHTER_PROJECTILE_ACTIVE") + HOSTILE_FIRST,
    main("FIGHTER_PROJECTILE_ACTIVE") + HOSTILE_FIRST + 5)], before, "an emitter spawned a pulse shot");
  assert.equal(framesIn(memory, i, WARN), 25, "the warning is not 25 frames");
  assert.equal(laser(memory, "state", i), BEAM);
  assert.equal(framesIn(memory, i, BEAM), 50, "the beam is not 50 frames");
  assert.equal(laser(memory, "state", i), OFF);
  update(memory);
  assert.equal(laser(memory, "hpos", i), 0, "the beam's HPOS is not 0 after it");
});

test("the warning reads: the emitter's bottom cell heats, the line pulses 1/2 clocks, the tone rises on channel 3 only", () => {
  const memory = laserFixture(1);
  alive(memory);
  memory[main("player_x")] = 60;
  memory[main("sound_enabled")] = 1;
  const emitter = fixtureByName.get("emitter");
  const module = fixture.modules[emitter];
  const cellAddress = bossBandRowAddress(module.row + module.height - 1) + module.x + (module.width >> 1);
  const intact = memory[cellAddress];
  fire(memory, emitter);
  const i = laserOf(memory, emitter);
  const cells = [], sizes = [], tones = [];
  let channel2 = 0;
  for (let frame = 0; frame < 24; frame += 1) {
    const { writes } = update(memory);
    cells.push(memory[cellAddress]);
    sizes.push((memory[lbl("boss_laser_sizem")] >> (2 * i)) & 3);
    tones.push(...writesTo(writes, AUDF3));
    channel2 += writesTo(writes, AUDF2).length + writesTo(writes, AUDC2).length;
  }
  const spark = memory[0xad00 + assets.BOSS_TABLE.spark];
  const muzzle = memory[0xad00 + assets.BOSS_TABLE.muzzle];
  assert.ok(cells.every((code) => code === spark || code === muzzle), "the bottom cell does not heat");
  assert.ok(cells.includes(spark) && cells.includes(muzzle), "the heat does not alternate");
  for (let frame = 4; frame < 24; frame += 4) {
    assert.equal(cells[frame], cells[frame - 4] === spark ? muzzle : spark, `heat phase at frame ${frame}`);
  }
  assert.ok(sizes.every((size) => size === 0 || size === 1), "the warning is wider than 2 clocks");
  for (let frame = 2; frame < 24; frame += 2) {
    assert.notEqual(sizes[frame], sizes[frame - 2], `the line does not pulse in 2-frame groups at ${frame}`);
  }
  assert.ok(tones.length >= 20, "no tone on channel 3");
  assert.ok(tones.at(-1) < tones[0], "the tone does not rise (AUDF3 falls)");
  assert.equal(channel2, 0, "the warning touched channel 2 (the music's lead)");
  framesIn(memory, i, WARN);
  assert.equal(memory[cellAddress], intact, "the emitter's cell did not get its look back");
  assert.equal((memory[lbl("boss_laser_sizem")] >> (2 * i)) & 3, 3, "the beam is not quad width");
});

test("a beam damages the player once per firing: MEDIUM 10 units, EASY 5", () => {
  for (const [difficulty, units] of [[1, 10], [0, 5]]) {
    const memory = laserFixture(1, { difficulty });
    alive(memory);
    const emitter = fixtureByName.get("emitter");
    fire(memory, emitter);
    const i = laserOf(memory, emitter);
    framesIn(memory, i, WARN);
    update(memory);                                  // the beam's HPOS is on screen from here
    const hpos = laser(memory, "hpos", i);
    assert.ok(hpos >= 48 && hpos <= 204, `the beam is off screen (${hpos})`);
    memory[main("player_x")] = hpos - 2;
    const calls = damageCalls(memory, 49, () => { memory[main("player_x")] = laser(memory, "hpos", i) - 2; });
    assert.equal(calls, 1, `difficulty ${difficulty}: ${calls} laser damage calls in one firing`);
    assert.equal(memory[HEALTH], 10 - units, `difficulty ${difficulty}: health`);
    assert.equal(memory[LIFECYCLE], units >= 10 ? PLAYER_DYING : PLAYER_ALIVE);
    assert.equal(memory[LIVES], units >= 10 ? 2 : 3);
  }
});

test("a beam that does not cover the player does not damage it", () => {
  const memory = laserFixture(1);
  alive(memory);
  const emitter = fixtureByName.get("emitter");
  fire(memory, emitter);
  const i = laserOf(memory, emitter);
  framesIn(memory, i, WARN);
  const calls = damageCalls(memory, 50, () => { memory[main("player_x")] = laser(memory, "hpos", i) + 12; });
  assert.equal(calls, 0);
  assert.equal(memory[HEALTH], 10);
});

test("the beam absorbs the player's shots in its column (Q6), and only those", () => {
  const memory = laserFixture(1);
  alive(memory);
  memory[main("player_x")] = 60;
  const emitter = fixtureByName.get("emitter");
  fire(memory, emitter);
  const i = laserOf(memory, emitter);
  framesIn(memory, i, WARN);
  update(memory);
  const hpos = laser(memory, "hpos", i);
  const active = main("FIGHTER_PROJECTILE_ACTIVE");
  for (const [slot, x] of [[0, hpos], [1, hpos + 3], [2, hpos + 8], [3, hpos - 4]]) {
    memory[active + slot] = 1;
    memory[main("FIGHTER_PROJECTILE_X") + slot] = x;
    memory[main("FIGHTER_PROJECTILE_Y") + slot] = 160;
  }
  update(memory);
  assert.deepEqual([0, 1, 2, 3].map((slot) => memory[active + slot] !== 0), [false, false, true, true]);
});

test("destroying an emitter stops its laser at once, in its warning and in its beam", () => {
  const memory = laserFixture(1);
  alive(memory);
  memory[main("player_x")] = 60;
  const emitter = fixtureByName.get("emitter");
  fire(memory, emitter);
  const i = laserOf(memory, emitter);
  update(memory);
  const module = fixture.modules[emitter];
  const p = memory[lbl("boss_shown_pos")];
  const { left, right } = visibleCells(p);
  const column = [...Array(module.width).keys()].map((k) => module.x + k).find((c) => c >= left && c <= right);
  for (let guard = 0; guard < 40 && hp(memory, emitter) > 0; guard += 1) {
    for (let slot = 0; slot < 5; slot += 1) shootAt(memory, column, slot);
    update(memory);
  }
  assert.equal(hp(memory, emitter), 0, "the emitter did not die in its warning");
  assert.equal(laser(memory, "state", i), OFF, "the laser outlived its emitter");
  assert.equal(laser(memory, "hpos", i), 0);
  fire(memory, emitter);
  for (let frame = 0; frame < 30; frame += 1) update(memory);
  assert.equal(laser(memory, "state", i), OFF, "a dead emitter's laser started again");

  const beam = laserFixture(5);
  alive(beam);
  beam[main("player_x")] = 60;
  const gun1 = fixtureByName.get("gun-1");
  fire(beam, gun1);
  const j = laserOf(beam, gun1);
  framesIn(beam, j, WARN);
  update(beam);
  assert.equal(laser(beam, "state", j), BEAM);
  beam[lbl("_boss_hp") + gun1] = 0;
  update(beam);
  assert.equal(laser(beam, "state", j), OFF, "the beam outlived its emitter");
  assert.equal(laser(beam, "hpos", j), 0);
});

test("no laser while the player dies or respawns; a running beam goes off", () => {
  for (const lifecycle of [PLAYER_DYING, PLAYER_RESPAWN_INVULNERABLE]) {
    const memory = laserFixture(1);
    alive(memory);
    memory[main("player_x")] = 60;
    memory[LIFECYCLE] = lifecycle;
    const emitter = fixtureByName.get("emitter");
    fire(memory, emitter);
    const i = [...Array(LASERS).keys()].find((k) => laser(memory, "module", k) === emitter);
    assert.equal(laser(memory, "state", i), OFF, `a laser started in lifecycle ${lifecycle}`);
    memory[LIFECYCLE] = PLAYER_ALIVE;
    fire(memory, emitter);
    framesIn(memory, i, WARN);
    update(memory);
    assert.equal(laser(memory, "state", i), BEAM);
    memory[LIFECYCLE] = lifecycle;
    update(memory);
    assert.equal(laser(memory, "state", i), OFF, `a beam ran on in lifecycle ${lifecycle}`);
    assert.equal(laser(memory, "hpos", i), 0);
  }
});

test("the band DLI publishes the lasers' HPOS and SIZEM in phase 0, and phase 1 writes COLPF3 first (QA2)", () => {
  const memory = laserFixture(9);
  // HPOS = the laser's edge in the band - the band position this frame shows
  // + 32 (plan §5.12 item 8), 0 outside the window (HPOS 48-203) or when off.
  const p = memory[lbl("boss_shown_pos")];
  const edges = [p + 16 + 50, p + 16 + 120, 0, p + 4];
  const expected = [50 + 48, 120 + 48, 0, 0];
  edges.forEach((edge, i) => setLaser(memory, "edge", i, edge));
  memory[lbl("boss_laser_sizem")] = 0xc3;
  memory[main("loader_dli_phase")] = 0;
  const phase0 = [], phase1 = [];
  nmi(memory, lbl("boss_dli"), { hooks: { write: (a, v) => { phase0.push([a, v]); return undefined; } } });
  nmi(memory, lbl("boss_dli"), { hooks: { write: (a, v) => { phase1.push([a, v]); return undefined; } } });
  for (let i = 0; i < LASERS; i += 1) {
    assert.deepEqual(writesTo(phase0, HPOSM0 + i), [expected[i]], `HPOSM${i}`);
    assert.equal(laser(memory, "hpos", i), expected[i], `boss_laser_hpos ${i}`);
  }
  assert.deepEqual(writesTo(phase0, SIZEM), [0xc3]);
  const afterWsync = phase1.slice(phase1.findIndex(([a]) => a === WSYNC) + 1)
    .filter(([a]) => a >= 0xd000 && a < 0xd500);
  assert.deepEqual(afterWsync[0], [COLPF3, main("GAMEPLAY_COLPF3")], "phase 1's first store is not COLPF3");
});

test("QA1: a boss pulse shot is born at the gun's muzzle and drawn in the band down to its edge", () => {
  const memory = regionOne();
  alive(memory);
  memory[main("player_x")] = 60;
  const gun2 = byName.get("gun-2");
  const module = region1.modules[gun2];
  const active = main("FIGHTER_PROJECTILE_ACTIVE");
  memory.fill(0, active + HOSTILE_FIRST, active + HOSTILE_FIRST + 5);
  fire(memory, gun2);
  const slot = [5, 6, 7, 8, 9].find((s) => memory[active + s] !== 0);
  assert.ok(slot !== undefined, "gun-2 spawned no shot");
  const muzzle = 24 + (module.row + module.height) * 8;
  assert.equal(memory[main("FIGHTER_PROJECTILE_Y") + slot], muzzle, "the shot is not born at the muzzle line");
  const centre = module.x + (module.width >> 1);
  const base = memory[0xad00 + assets.BOSS_TABLE.shotCode] + assets.BOSS_SHOT_CODES;
  const isHostile = (code) => code === base || code === base + 1;
  let y = muzzle;
  const seen = [];
  for (; y < 88; y += 8) {
    memory[main("FIGHTER_PROJECTILE_Y") + slot] = y;
    update(memory);
    const row = (y - 24) >> 3;
    assert.ok(isHostile(memory[bossBandRowAddress(row) + centre]), `no shot drawn in row ${row}`);
    for (let other = 4; other < 8; other += 1) {
      if (other !== row) assert.ok(!isHostile(memory[bossBandRowAddress(other) + centre]), `a stale shot in row ${other}`);
    }
    seen.push(row);
  }
  assert.ok(seen.length >= 3, `the shot crossed only rows ${seen}`);
  memory[main("FIGHTER_PROJECTILE_Y") + slot] = 88;
  update(memory);
  for (let row = 0; row < 8; row += 1) {
    assert.ok(!isHostile(memory[bossBandRowAddress(row) + centre]), `the shot stayed drawn in row ${row} past the edge`);
  }
});

test("leaving by the win: the lasers are off, the column erased and PRIOR 0 before the hand-off", () => {
  const memory = regionOne();
  alive(memory);
  memory[main("player_x")] = 60;
  const order = ["plate-d", "emitter", "plate-g", "gun-4", "plate-f", "plate-e", "gun-3", "plate-c", "gun-1", "gun-2"];
  for (const name of order) {
    const index = byName.get(name);
    for (let guard = 0; guard < 600 && hp(memory, index) > 0 && memory[lbl("_boss_phase")] === 0; guard += 1) {
      const p = memory[lbl("boss_shown_pos")];
      const { left, right } = visibleCells(p);
      const map = [...memory.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64)];
      const column = map.findIndex((v, c) => v === index && c >= left && c <= right);
      if (column >= 0) for (let slot = 0; slot < 5; slot += 1) shootAt(memory, column, slot);
      memory[LIFECYCLE] = PLAYER_ALIVE;
      memory[COOLDOWN] = 25;                         // the bot under fire: never killed here
      update(memory);
    }
  }
  assert.notEqual(memory[lbl("_boss_phase")], 0, "the fight did not end");
  for (let frame = 0; frame < 400 && memory[lbl("_boss_handoff")] === 0; frame += 1) update(memory);
  assert.notEqual(memory[lbl("_boss_handoff")], 0, "no hand-off");
  assert.equal(memory[PRIOR], 0, "PRIOR is not 0 at the hand-off");
  assert.ok(memory.subarray(MISSILES, MISSILES + 256).every((v) => v === 0), "the column is not erased");
  for (let i = 0; i < LASERS; i += 1) assert.equal(laser(memory, "hpos", i), 0);
});

test("leaving by the last death: PRIOR 0 and the column erased while the player dies", () => {
  const memory = laserFixture(1);
  alive(memory, { lives: 1 });
  const emitter = fixtureByName.get("emitter");
  fire(memory, emitter);
  const i = laserOf(memory, emitter);
  framesIn(memory, i, WARN);
  update(memory);
  damageCalls(memory, 3, () => { memory[main("player_x")] = laser(memory, "hpos", i) - 2; });
  assert.equal(memory[LIFECYCLE], PLAYER_DYING);
  assert.equal(memory[LIVES], 0);
  for (let frame = 0; frame < 20; frame += 1) update(memory);
  assert.equal(memory[PRIOR], 0, "PRIOR is not 0 during the last death");
  assert.ok(memory.subarray(MISSILES, MISSILES + 256).every((v) => v === 0), "the column is not erased");
});

test("outside the boss sector: START GAME after a game that ended in it leaves PRIOR, SIZEM, HPOSM and the missiles off", () => {
  const memory = laserFixture(9);
  memory[PRIOR] = 0x10;
  memory[SIZEM] = 0xff;
  for (let i = 0; i < LASERS; i += 1) memory[HPOSM0 + i] = 100 + i;
  const writes = [];
  const drive = new Drive({ trig: (frame) => Math.floor(frame / 4) % 8 < 4 });
  const cpu = cpuOver(drive, memory);
  const inner = cpu.hooks.write;
  cpu.hooks.write = (address, value) => { writes.push([address, value]); return inner(address, value); };
  cpu.sp = 0xff;
  cpu.pc = 0xa000;
  memory[main("game_state")] = 1;
  assert.equal(runUntil(cpu, { start: main("start_gameplay"), failure: label("reader", "sector_reader_failure_screen") },
    { maxSteps: 200_000_000 }), "start");
  const game = cpuOver(new Drive(), memory);
  const gameInner = game.hooks.write;
  game.hooks.write = (address, value) => { writes.push([address, value]); return gameInner(address, value); };
  game.sp = 0xff;
  game.pc = main("start_gameplay");
  assert.equal(runUntil(game, { loop: main("main_loop") }, { maxSteps: 50_000_000 }), "loop");
  assert.equal(writesTo(writes, PRIOR).at(-1), 0, "PRIOR is not 0 in the next game");
  // init_broadside gives M1-M3 the capital broadside's double size at every
  // game start and keeps M0's pair, which the restore has zeroed: $54.
  assert.equal(writesTo(writes, SIZEM).at(-1), 0x54, "SIZEM is not the game start's $54 in the next game");
  for (let i = 0; i < LASERS; i += 1) assert.equal(writesTo(writes, HPOSM0 + i).at(-1), 0, `HPOSM${i}`);
  assert.ok(memory.subarray(MISSILES, MISSILES + 256).every((v) => v === 0), "the missile plane is not empty");
});

// Owner decision Q8 (2026-10-06): the boss sector's per-frame work limit is
// 8,500 native cycles, measured with four beams firing; 7,000 stays elsewhere.
test("Q8: the tier-4 fixture with four lasers running and five shots a frame stays under 8,500 native cycles", () => {
  let worst = 0, worstCase = "", fourActiveFrames = 0, fourBeamFrames = 0;
  // Two modes at five band positions: the four held in their beams, and the
  // four cycling warning -> fire start -> beam (every idle laser restarts at
  // once), while the drive kills every module through five shots a frame.
  for (const mode of ["beam", "cycle"]) {
    for (const p of [0, 16, 32, 48, 63]) {
      const memory = laserFixture(9, { p });
      alive(memory);
      const frame = () => {
        for (let i = 0; i < LASERS; i += 1) {
          const module = laser(memory, "module", i);
          if (module !== 0xff && hp(memory, module) > 0 && laser(memory, "state", i) === OFF) {
            setLaser(memory, "state", i, mode === "beam" ? BEAM : WARN);
            setLaser(memory, "timer", i, mode === "beam" ? 50 : 25);
            setLaser(memory, "fired", i, 0);
          }
        }
        const states = [0, 1, 2, 3].map((i) => laser(memory, "state", i));
        if (states.every((state) => state !== OFF)) fourActiveFrames += 1;
        if (states.every((state) => state === BEAM)) fourBeamFrames += 1;
        memory[LIFECYCLE] = PLAYER_ALIVE;
        memory[COOLDOWN] = 25;
        // The player under the first beam: the hit test's long path every frame.
        memory[main("player_x")] = laser(memory, "hpos", 0) || 60;
        memory[main("loader_dli_phase")] = 0;
        let cycles = nmi(memory, lbl("boss_dli"));
        cycles += call(memory, lbl("boss_update")).cycles;
        cycles += call(memory, lbl("boss_motion")).cycles;
        cycles += nmi(memory, lbl("boss_dli")) + nmi(memory, lbl("boss_dli"));
        if (cycles > worst) { worst = cycles; worstCase = `${mode}, p ${p}, states ${states.join("")}`; }
      };
      const order = ["gun-2", "plate-a", "plate-b", "plate-f", "plate-h", "emitter", "gun-1", "gun-3", "gun-4"];
      for (const name of order) {
        const index = fixtureByName.get(name);
        for (let guard = 0; guard < 600 && hp(memory, index) > 0 && memory[lbl("_boss_phase")] === 0; guard += 1) {
          const shown = memory[lbl("boss_shown_pos")];
          const { left, right } = visibleCells(shown);
          const map = [...memory.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64)];
          const column = map.findIndex((v, c) => v === index && c >= left && c <= right);
          if (column >= 0) for (let slot = 0; slot < 5; slot += 1) shootAt(memory, column, slot);
          frame();
        }
      }
      for (let rest = 0; rest < 150 && memory[lbl("_boss_handoff")] === 0; rest += 1) frame();
    }
  }
  assert.ok(fourBeamFrames >= 50, `only ${fourBeamFrames} frames had four beams firing`);
  assert.ok(worst <= 8500, `the worst frame's work is ${worst} native cycles (${worstCase})`);
  console.log(`# four-laser stress, worst: ${worst} native cycles (${worstCase}); ` +
    `${fourActiveFrames} frames with four lasers running, ${fourBeamFrames} with four beams (Q8 limit 8,500)`);
});

// QA1, found in the emulator while measuring it: a boss shot fell straight down
// the screen while the band drifted under it, so a shot from gun-3 slid behind
// plate-f (standing beside it) and came out at the plate's foot. Inside the
// band the shot now rides the band's drift and stays in its gun's column.
test("QA1: inside the band a boss shot rides the band's drift and stays in its gun's column", () => {
  const memory = regionOne(32);
  alive(memory);
  memory[main("player_x")] = 60;
  const gun2 = byName.get("gun-2");
  const module = region1.modules[gun2];
  const active = main("FIGHTER_PROJECTILE_ACTIVE");
  memory.fill(0, active + HOSTILE_FIRST, active + HOSTILE_FIRST + 5);
  fire(memory, gun2);
  const slot = [5, 6, 7, 8, 9].find((s) => memory[active + s] !== 0);
  const centre = module.x + (module.width >> 1);
  const base = memory[0xad00 + assets.BOSS_TABLE.shotCode] + assets.BOSS_SHOT_CODES;
  let p = 32;
  for (let y = 24 + (module.row + module.height) * 8; y < 88; y += 2) {
    p = Math.min(63, p + 1);                     // the band drifts a clock a frame here (twice the game's)
    placeBand(memory, p);
    memory[main("FIGHTER_PROJECTILE_Y") + slot] = y;
    update(memory);
    const row = (y - 24) >> 3;
    const drawn = [...Array(64).keys()].filter((c) => {
      const code = memory[bossBandRowAddress(row) + c];
      return code === base || code === base + 1;
    });
    assert.deepEqual(drawn, [centre], `y ${y}, p ${p}: the shot is drawn in columns ${drawn}, not its gun's ${centre}`);
  }
});

// AUD-03 (owner addendum, 2026-10-06): the boss DLI runs binary arithmetic
// (boss_apply_pos, the lasers' publish), and the NMI keeps the interrupted
// code's D flag - the boss's own scoring runs between SED and CLD. Every
// phase, every band position, D clear and set, with non-trivial registers:
// the DLI's writes are the same either way, and it returns A, X, Y and P as
// it found them.
test("AUD-03: the boss DLI writes the same with D set as with D clear, every phase and position, and returns A, X, Y and P", () => {
  const base = laserFixture(9);
  const edges = [70, 130, 190, 236];
  edges.forEach((edge, i) => {
    setLaser(base, "state", i, i & 1 ? BEAM : WARN);
    setLaser(base, "edge", i, edge);
  });
  base[lbl("boss_laser_sizem")] = 0x5a;
  const regs = { a: 0x5a, x: 0xa5, y: 0x3c };
  const run = (phase, pos, shown, p) => {
    const memory = Uint8Array.from(base);
    memory[main("loader_dli_phase")] = phase;   // src/main.s: gameplay_dli_phase = loader_dli_phase
    memory[lbl("boss_shown_pos")] = phase === 0 ? pos : shown;
    memory[lbl("boss_shown_lms")] = 0;
    memory[lbl("boss_dli_pos")] = pos;
    const writes = [];
    const out = {};
    nmi(memory, lbl("boss_dli"), { ...regs, p, out,
      hooks: { write: (address, value) => {
        if (address >> 8 !== 0x01) writes.push([address, value]);   // not the stack: the pushed P differs by design
        return undefined;
      } } });
    return { writes, cpu: out.cpu };
  };
  const failures = [];
  for (const phase of [0, 1, 2]) {
    for (let pos = 0; pos < 64; pos += 1) {
      for (const shown of phase === 1 ? [0, 63] : [0]) {
        for (const carry of [0, 1]) {
          const binary = run(phase, pos, shown, 0x24 | carry);
          const decimal = run(phase, pos, shown, 0x2c | carry);
          const where = `phase ${phase}, pos ${pos}, shown ${shown}, C ${carry}`;
          if (JSON.stringify(decimal.writes) !== JSON.stringify(binary.writes)) {
            const at = decimal.writes.findIndex((w, k) => JSON.stringify(w) !== JSON.stringify(binary.writes[k]));
            failures.push(`${where}: write ${at} is ${JSON.stringify(decimal.writes[at])} with D set, ` +
              `${JSON.stringify(binary.writes[at])} with D clear`);
          }
          for (const [run1, p] of [[binary, 0x24 | carry], [decimal, 0x2c | carry]]) {
            const back = { a: run1.cpu.a, x: run1.cpu.x, y: run1.cpu.y, p: run1.cpu.p };
            if (JSON.stringify(back) !== JSON.stringify({ ...regs, p }))
              failures.push(`${where}, P $${p.toString(16)}: returned ${JSON.stringify(back)}`);
          }
        }
      }
    }
  }
  const perPhase = [0, 1, 2].map((phase) => failures.filter((f) => f.startsWith(`phase ${phase},`)).length);
  const audit = failures.filter((f) => f.startsWith("phase 1, pos 14, shown 0,"));   // the audit's case
  assert.deepEqual([...audit, ...failures.slice(0, 6)], [],
    `${failures.length} cases differ (phase 0/1/2: ${perPhase.join("/")})`);
});
