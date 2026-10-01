import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502, nmos6502Flags } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
import {
  compileLevel, defaultHullAsset, LEVEL_CORE_ADDRESS,
} from "../scripts/level-compiler.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
const directorSource = fs.readFileSync(path.join(root, "src/encounter-director.s"), "utf8");
const lifecycleSource = fs.readFileSync(path.join(root, "src/c/lifecycle.c"), "utf8");
const labels = new Map();
for (const file of ["build/void-strike-65.lbl", "build/encounter-director.lbl",
  "build/integration-glue.lbl"]) {
  for (const line of fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) labels.set(match[2], Number.parseInt(match[1], 16));
  }
}

// Roadmap 4.6 step 2 re-pinned this map. The twelve bytes did not move; five
// of them mean something else, because the Director reads a level now instead
// of carrying one (src/c/director.c).
const state = {
  rowLo: 0x80f4, rowHi: 0x80f5, sector: 0x80f6, waveCursor: 0x80f7,
  intensity: 0x80f8, reaction: 0x80f9, recovery: 0x80fa, rng: 0x80fb,
  waveRemaining: 0x80fc, spacing: 0x80fd, flags: 0x80fe, admissionFrame: 0x80ff,
};
const FLAG_COMPLETE = 0x01;
const FLAG_CAPITAL_DUE = 0x80;

// A synthetic level, compiled by the real compiler and poked into the level
// buffer where the sector reader would have put it. Nothing about it is
// hand-assembled: if the compiler's layout and the Director's reader ever
// disagreed, every test below that uses this would fail at once.
const hullAsset = defaultHullAsset();
function pokeLevel(image, source) {
  const compiled = compileLevel({
    level: 1, seed: 109, hull: { length: 3, turrets: 3 }, ...source,
  }, { hullAsset, file: "synthetic.json" });
  image.set(compiled.pages.core, LEVEL_CORE_ADDRESS);
  return compiled;
}

// A space sector of `rows` rows with one Heavy wave, or none.
function spaceSector(rows, waves = []) {
  return {
    kind: "space", subtype: "elite", rows,
    archetypes: ["raider", "wingman", "interceptor", "bomber"],
    lights: 1, heavies: 2, hazards: { debris: 2, pickups: true }, waves,
  };
}
const provisionalCapital = {
  frame: 600,
  frameLo: 0x4ff8,
  frameHi: 0x4ff9,
  due: 0x80,
  admitted: 0x40,
};

function setActiveGameplayFrame(image, frame) {
  image[provisionalCapital.frameLo] = frame & 0xff;
  image[provisionalCapital.frameHi] = frame >> 8 & 0xff;
}

function memory() {
  const result = new Uint8Array(0x10000);
  installRuntimeSegments(result, root);
  return result;
}

function currentMemory() {
  return memory();
}

function run(memoryImage, target, { a = 0, x = 0, y = 0 } = {}) {
  const address = typeof target === "string" ? labels.get(target) : target;
  assert.ok(Number.isInteger(address), `missing routine ${target}`);
  const cpu = new Nmos6502(memoryImage);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8); cpu.push((stop - 1) & 0xff);
  cpu.pc = address; cpu.a = a; cpu.x = x; cpu.y = y;
  const visited = [];
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) {
    visited.push(cpu.pc);
    assert.notEqual(memoryImage[cpu.pc], 0, `${target} reached BRK`);
    cpu.step();
  }
  assert.equal(cpu.pc, stop, `${target} did not return`);
  return { visited, carry: (cpu.p & nmos6502Flags.carry) !== 0, cycles: cpu.cycles,
    a: cpu.a, x: cpu.x, y: cpu.y };
}

function byteTable(memoryImage, label, length) {
  const address = labels.get(label);
  return [...memoryImage.subarray(address, address + length)];
}

const broadside = {
  state: 0x4e40,
  scheduleTimer: 0x4e5b,
  workSlot: 0x4e62,
};

// RE-PINNED at step 2: what permits a broadside is the SECTOR's hazard byte,
// not a phase number. Level 1's sector 2 is the capital, and it is the sector
// that authorises the broadside, so the harness selects it by index - which is
// the whole of the Director's sector state.
const CAPITAL_SECTOR_INDEX = 1;
function prepareBroadside({ difficulty = 2, sector = CAPITAL_SECTOR_INDEX, frame = 10 } = {}) {
  const image = memory();
  image[labels.get("DIFFICULTY_SETTING")] = difficulty;
  image[labels.get("PLAYER_LIFECYCLE")] = 0;
  image[labels.get("frame_counter")] = frame;
  run(image, "director_init", { a: 0x6f });
  image[state.sector] = sector;
  image[state.reaction] = 0;
  image[state.recovery] = 0;
  image[state.admissionFrame] = frame - 1;
  image[labels.get("CAPITAL_SECTOR_STATE")] = 2;
  image[broadside.scheduleTimer] = 1;
  return image;
}

function armMuzzle(image, turret, row) {
  const address = 0x4028 + row * 40 + (turret === 0 ? 8 : 31);
  image[labels.get("MUZZLE_VISIBLE_ROW") + turret] = row;
  image[labels.get("MUZZLE_SCREEN_LO") + turret] = address & 0xff;
  image[labels.get("MUZZLE_SCREEN_HI") + turret] = address >> 8;
}

function runEarlyEnemyReplay(difficulty, frames = 600) {
  const image = memory();
  const frameCounter = labels.get("frame_counter");
  const enemyActive = labels.get("ENEMY_ACTIVE");
  const enemyY = labels.get("ENEMY_Y");
  const enemyHp = labels.get("ENEMY_HP");
  const enemyMemberState = labels.get("ENEMY_MEMBER_STATE");
  const enemyTargetSlot = labels.get("ENEMY_TARGET_SLOT");
  const pickupState = labels.get("ENTITY_STATE") + 1;
  const pickupCounter = labels.get("ENTITY_HP") + 1;
  image[labels.get("DIFFICULTY_SETTING")] = difficulty;
  image[labels.get("PLAYER_LIFECYCLE")] = 0;
  run(image, "init_state");
  run(image, "init_entity_effects");
  run(image, "director_init", { a: 0x6d ^ difficulty });
  run(image, "init_broadside");
  const rate = [8, 9, 10][difficulty];
  let worldAccumulator = 0;
  const admissions = [];
  const visible = [];
  const releases = [];
  const kills = [];
  const pickup = { pending: null, active: null };
  const rng = [];
  let maximumActive = 0;
  for (let frame = 1; frame <= frames; frame += 1) {
    image[frameCounter] = image[frameCounter] + 1 & 0xff;
    run(image, "integration_active_gameplay_tick");
    run(image, "tick_shared_fighter_explosions");
    worldAccumulator += rate;
    if (worldAccumulator >= 20) {
      worldAccumulator -= 20;
      run(image, "director_world_row_tick");
    }
    run(image, "integration_update_first_capital");
    const before = image[enemyActive];
    const beforeRng = image[state.rng];
    const update = run(image, "integration_update_enemy");
    const after = image[enemyActive];
    if (before !== 1 && after === 1) {
      admissions.push(frame);
      rng.push([beforeRng, image[state.rng]]);
    }
    if (before === 2 && after === 0) releases.push(frame);
    maximumActive = Math.max(maximumActive, after === 1 ? 1 : 0);
    if (after === 1 && [0, 1].some((slot) =>
      image[enemyMemberState + slot] === 1 && image[enemyY + slot] + 14 > 16) &&
      visible.length < admissions.length) {
      visible.push(frame);
    }
    if (after === 1 && kills.length < 3) {
      const target = [0, 1, 2].find((slot) =>
        image[enemyMemberState + slot] === 1 && image[enemyY + slot] + 14 > 16);
      if (target !== undefined) {
        image[enemyTargetSlot] = target;
        image[labels.get("ENEMY_PENDING_DAMAGE") + target] = 0;
        image[labels.get("ENEMY_PENDING_SOURCE") + target] = 5;
        run(image, "queue_enemy_damage", { a: image[enemyHp + target], y: 0 });
        run(image, "resolve_enemy_damage");
        kills.push(frame);
      }
    }
    if (image[pickupState] !== 0) {
      if (image[pickupState] === 1 && pickup.pending === null) pickup.pending = frame;
      run(image, "update_weapon_pickup_active", { x: image[pickupState] });
      if (image[pickupState] === 2 && pickup.active === null) pickup.active = frame;
    }
    assert.ok(update.visited.filter((pc) => pc === labels.get("reset_enemy")).length <= 1,
      "one frame cannot admit the sole ordinary slot twice");
  }
  return { image, admissions, visible, releases, kills, pickup,
    pickupCounter: image[pickupCounter], rng, maximumActive };
}

// T3 (plan §9). RE-PINNED at step 2: there are no phases and no compiled-in
// level. What the Director carries is a reader, and what it reads is the core
// page the sector reader leaves in the level buffer.
test("T3: the row tick advances the sector index from a poked core page and arms its first wave",
  () => {
    const image = memory();
    image[labels.get("frame_counter")] = 9;
    // Three space sectors, 16 / 24 / 32 rows, each with one Heavy wave on its
    // own first row. Short on purpose: the row tick is the only clock.
    pokeLevel(image, {
      sectors: [
        spaceSector(16, [{ row: 0, archetype: "raider", count: 1, spacing: 24, entry: 124 }]),
        spaceSector(24, [{ row: 0, archetype: "bomber", count: 1, spacing: 24, entry: 124 }]),
        spaceSector(32, [{ row: 8, archetype: "raider", count: 2, spacing: 24, entry: 124 }]),
      ],
    });
    run(image, "director_init", { a: 0 });
    assert.equal(image[state.sector], 0, "init enters sector 0");
    assert.equal(image[state.waveRemaining], 1, "a wave authored on row 0 arms at entry");
    assert.equal(image[labels.get("heavy_archetype_offset")], 0, "and publishes its Raider");

    for (let row = 0; row < 16; row += 1) run(image, "director_world_row_tick");
    assert.equal(image[state.sector], 1, "16 rows end a 16-row sector");
    assert.equal(image[labels.get("heavy_archetype_offset")], 36, "sector 2 arms its Bomber");

    for (let row = 0; row < 24; row += 1) run(image, "director_world_row_tick");
    assert.equal(image[state.sector], 2, "24 more rows end the second sector");
    assert.equal(image[state.waveRemaining], 0, "the third sector's wave waits for its row");
    for (let row = 0; row < 8; row += 1) run(image, "director_world_row_tick");
    assert.equal(image[state.waveRemaining], 2, "and arms on row 8 with both its formations");
    assert.equal(image[state.rowLo], 48, "the world row is the sum of the sectors walked");
  });

// T11 (plan §9). The level's LENGTH is data: a two-sector level completes at
// the end of sector 2 and a six-sector level at the end of sector 6. Nothing
// in the runtime knows the number 8 any more.
test("T11: a level completes at the end of its LAST authored sector, whatever their number",
  () => {
    for (const count of [2, 6]) {
      const image = memory();
      pokeLevel(image, {
        sectors: Array.from({ length: count }, () => spaceSector(16)),
      });
      run(image, "director_init", { a: 0 });
      for (let row = 0; row < 16 * count - 1; row += 1) run(image, "director_world_row_tick");
      assert.equal(image[state.flags] & FLAG_COMPLETE, 0,
        `a ${count}-sector level is not complete one row early`);
      assert.equal(image[state.sector], count - 1);
      run(image, "director_world_row_tick");
      assert.equal(image[state.flags] & FLAG_COMPLETE, FLAG_COMPLETE,
        `a ${count}-sector level completes at the end of sector ${count}`);
      // COMPLETE is terminal: the row clock stops and no hazard is admitted.
      const row = image[state.rowLo];
      run(image, "director_world_row_tick");
      assert.equal(image[state.rowLo], row, "the row clock stops at COMPLETE");
      for (const hazard of [0, 1, 2, 3]) {
        image[labels.get("frame_counter")] = 40 + hazard;
        assert.equal(run(image, "director_request", { x: hazard }).carry, false,
          `hazard ${hazard} is refused after COMPLETE`);
      }
    }
  });

// The runtime's own ceilings, which a level file may ask UNDER and never over
// (plan §5). They replaced the per-phase intensity budget: what bounds a
// sector's population is its kind and subtype, not a phase number.
test("the runtime ceiling tables carry a row per sector kind and keep CAPITAL at zero", () => {
  const image = memory();
  const light = byteTable(image, "_subtype_ceiling_light", 4);
  const heavy = byteTable(image, "_subtype_ceiling_heavy", 4);
  assert.deepEqual(light, [3, 1, 0, 0], "SWARM 3, ELITE 1, CAPITAL 0, BOSS 0");
  assert.deepEqual(heavy, [0, 2, 0, 0], "a SWARM sector has no Heavy slot at all");
  // Owner decision 1 (plan §11): the CAPITAL row exists and is zero, so paying
  // for §5.1 later is a table VALUE and not a format change.
  assert.equal(light[2], 0);
  assert.equal(heavy[2], 0);
  const floors = byteTable(image, "_class_spacing_floor", 2);
  assert.deepEqual(floors, [16, 24], "Light 16, Heavy 24 - the class floors a wave is clamped up to");
});

test("private RNG has period 256 for every one-byte seed", () => {
  for (let seed = 0; seed < 256; seed += 1) {
    const seen = new Set();
    let value = seed;
    for (let step = 0; step < 256; step += 1) {
      assert.equal(seen.has(value), false, `seed ${seed} repeats at ${step}`);
      seen.add(value);
      value = (5 * value + 1) & 0xff;
    }
    assert.equal(value, seed, `seed ${seed} does not close at 256`);
    assert.equal(seen.size, 256);
  }
});

test("director init and world rows are deterministic and do not touch game RNG", () => {
  const first = memory();
  const second = memory();
  const gameRng = [labels.get("rng_state"), labels.get("STAR_RNG_STATE")];
  for (const image of [first, second]) {
    image[labels.get("frame_counter")] = 9;
    image[gameRng[0]] = 0x31; image[gameRng[1]] = 0x32;
    run(image, "director_init", { a: 0x6d });
    for (let row = 0; row < 3712; row += 1) run(image, "director_world_row_tick");
  }
  assert.deepEqual([...first.subarray(0x80f4, 0x8100)], [...second.subarray(0x80f4, 0x8100)]);
  assert.equal(first[state.rowLo] | first[state.rowHi] << 8, 3712);
  // RE-PINNED at step 2. Level 1's second sector is the CAPITAL, and its clock
  // is the hull traversal, not a row count - so 3,712 bare row ticks with
  // nothing driving the sector state leave the Director exactly where the
  // capital would wait for a drained playfield, with DUE raised and the level
  // not complete. That is the determinism this test is about: two identical
  // runs land on identical bytes.
  assert.equal(first[state.sector], 1, "the row clock stops at the capital sector");
  assert.equal(first[state.flags], FLAG_CAPITAL_DUE);
  assert.equal(first[gameRng[0]], 0x31); assert.equal(first[gameRng[1]], 0x32);
});

test("New Game initialization leaves the 12-byte director state live", () => {
  const start = mainSource.slice(mainSource.indexOf("start_gameplay:"),
    mainSource.indexOf("main_loop:"));
  const clear = start.indexOf("jsr init_entity_effects");
  const initialise = start.indexOf("jsr DIRECTOR_INIT");
  assert.ok(clear >= 0 && initialise > clear,
    "DIRECTOR_INIT must run after init_entity_effects because that routine clears $80F4-$80FF");
});

test("world-row glue is inactive in DYING/GAME OVER and advances exactly once when active", () => {
  const image = memory();
  run(image, "director_init", { a: 0x6d });
  const lifecycle = labels.get("PLAYER_LIFECYCLE");
  image[lifecycle] = 1; run(image, 0x4efe); assert.equal(image[state.rowLo], 0);
  image[lifecycle] = 3; run(image, 0x4efe); assert.equal(image[state.rowLo], 0);
  image[lifecycle] = 0; run(image, 0x4efe); assert.equal(image[state.rowLo], 1);
  assert.equal((mainSource.match(/jsr integration_director_world_row\n/g) ?? []).length, 1);
});

test("admission accounts intensity, enforces budget and fails soft", () => {
  const image = memory();
  image[labels.get("DIFFICULTY_SETTING")] = 0;
  image[labels.get("frame_counter")] = 10;
  run(image, "director_init", { a: 0x6d });
  image[state.phase] = 3;
  image[state.reaction] = 0; image[state.recovery] = 0;
  image[state.admissionFrame] = 9;
  const admitted = run(image, "director_request", { x: 0 });
  assert.equal(admitted.carry, true);
  assert.equal(image[state.intensity], 1, "accepted Interceptor must charge one intensity unit");
  image[labels.get("frame_counter")] = 11;
  image[state.reaction] = 0;
  run(image, "director_release", { x: 0 });
  assert.equal(image[state.intensity], 0);
});

test("BROADSIDE admission is transactional across success, retry, budget and release", () => {
  const legal = prepareBroadside();
  armMuzzle(legal, 1, 5);
  run(legal, "schedule_broadside");
  assert.deepEqual([...legal.subarray(broadside.state, broadside.state + 3)], [1, 0, 0]);
  assert.equal(legal[state.intensity], 2, "one legal shell must charge exactly two");

  legal[broadside.workSlot] = 0;
  run(legal, "integration_broadside_release", { x: 0 });
  assert.deepEqual([...legal.subarray(broadside.state, broadside.state + 3)], [0, 0, 0]);
  assert.equal(legal[state.intensity], 0, "one shell lifecycle must release exactly two");

  legal[state.reaction] = 0;
  legal[labels.get("frame_counter")] += 1;
  legal[broadside.scheduleTimer] = 1;
  legal[broadside.scheduleTimer + 1] = 3;
  armMuzzle(legal, 0, 0);
  run(legal, "schedule_broadside");
  assert.equal(legal[state.intensity], 2, "readmission after release must charge once");
  assert.equal([...legal.subarray(broadside.state, broadside.state + 3)]
    .filter(Boolean).length, 1);

  const full = prepareBroadside();
  full.fill(1, broadside.state, broadside.state + 3);
  run(full, "schedule_broadside");
  assert.equal(full[state.intensity], 0);
  assert.deepEqual([...full.subarray(broadside.state, broadside.state + 3)], [1, 1, 1]);

  const noMuzzle = prepareBroadside();
  run(noMuzzle, "schedule_broadside");
  assert.equal(noMuzzle[state.intensity], 0);
  assert.deepEqual([...noMuzzle.subarray(broadside.state, broadside.state + 3)], [0, 0, 0]);
  assert.equal(noMuzzle[broadside.scheduleTimer], 7);

  armMuzzle(noMuzzle, 1, 5);
  noMuzzle[state.reaction] = 0;
  noMuzzle[labels.get("frame_counter")] += 1;
  noMuzzle[broadside.scheduleTimer] = 1;
  run(noMuzzle, "schedule_broadside");
  assert.equal(noMuzzle[state.intensity], 2, "retry success must commit once");
  assert.equal([...noMuzzle.subarray(broadside.state, broadside.state + 3)]
    .filter(Boolean).length, 1);

  const budget = prepareBroadside({ difficulty: 0 });
  budget[state.intensity] = 2;
  armMuzzle(budget, 1, 5);
  run(budget, "schedule_broadside");
  assert.equal(budget[state.intensity], 2, "budget rejection must not mutate intensity");
  assert.deepEqual([...budget.subarray(broadside.state, broadside.state + 3)], [0, 0, 0]);

  const parallel = prepareBroadside();
  armMuzzle(parallel, 1, 5);
  run(parallel, "schedule_broadside");
  parallel[state.reaction] = 0;
  parallel[labels.get("frame_counter")] += 1;
  parallel[broadside.scheduleTimer] = 1;
  parallel[broadside.scheduleTimer + 1] = 3;
  armMuzzle(parallel, 0, 0);
  run(parallel, "schedule_broadside");
  assert.deepEqual([...parallel.subarray(broadside.state, broadside.state + 3)], [1, 1, 0]);
  assert.equal(parallel[state.intensity], 4,
    "intensity must equal two units for each active Director-owned shell");

  parallel[state.reaction] = 0;
  parallel[labels.get("frame_counter")] += 1;
  parallel[broadside.scheduleTimer] = 1;
  run(parallel, "schedule_broadside");
  assert.equal(parallel[state.intensity], 4, "failed parallel retry must not double charge");
});

// RE-PINNED at step 2. The level used to end on an EVENT at a fixed row - the
// BOSS_HANDOFF opcode at row 3712 - and it ends now where its last authored
// sector ends. What the test is really about survives unchanged: COMPLETE is
// raised exactly once, it is terminal, and it closes every admission.
test("the level completes exactly once at the end of its last sector and closes admissions", () => {
  const image = memory();
  pokeLevel(image, { sectors: [spaceSector(16), spaceSector(16)] });
  run(image, "director_init", { a: 0x6d });
  for (let row = 0; row < 31; row += 1) run(image, "director_world_row_tick");
  assert.equal(image[state.flags] & FLAG_COMPLETE, 0);
  run(image, "director_world_row_tick");
  assert.equal(image[state.flags] & FLAG_COMPLETE, FLAG_COMPLETE);
  const after = [...image.subarray(0x80f4, 0x8100)];
  run(image, "director_world_row_tick");
  assert.deepEqual([...image.subarray(0x80f4, 0x8100)], after,
    "COMPLETE is terminal: a further row changes nothing at all");
  image[labels.get("frame_counter")] += 1;
  assert.equal(run(image, "director_request", { x: 0 }).carry, false);
});

// RE-PINNED at step 2: "phase one" was the phase whose authored mask carried
// no debris. A SECTOR carries that mask now, so the test authors a sector with
// debris switched off and keeps every other clause exactly as it was - above
// all the one this test exists for, which is that the capital traversal's
// debris exception is local to the traversal and inherited by nothing.
test("debris admission follows the sector mask and the capital traversal exception", () => {
  const image = memory();
  const sectorState = labels.get("CAPITAL_SECTOR_STATE");
  const frameCounter = labels.get("frame_counter");
  image[labels.get("PLAYER_LIFECYCLE")] = 0;
  image[labels.get("DIFFICULTY_SETTING")] = 2;
  image[frameCounter] = 10;
  pokeLevel(image, {
    sectors: [{
      kind: "space", subtype: "elite", rows: 800,
      archetypes: ["raider", "wingman"], lights: 1, heavies: 2,
      hazards: { debris: 0, pickups: true },
      waves: [{ row: 0, members: ["raider", "wingman"], count: 2, spacing: 24, entry: 124 }],
    }],
  });
  run(image, "director_init", { a: 0x6d });
  image[state.reaction] = 0;
  image[state.recovery] = 0;
  image[sectorState] = 7;
  const rngBefore = image[state.rng];

  assert.equal(run(image, "director_request", { x: 1 }).carry, false,
    "a sector whose mask carries no debris admits none in OPEN space");
  assert.deepEqual([image[state.intensity], image[state.rng]], [0, rngBefore]);

  image[frameCounter] += 1;
  image[sectorState] = 0;
  assert.equal(run(image, "director_request", { x: 1 }).carry, true,
    "the same debris request must be admitted once the capital traversal is active");
  assert.equal(image[state.intensity], 1);
  run(image, "director_release", { x: 1 });

  for (const blockedState of [5, 6, 7]) {
    image[frameCounter] += 1;
    image[state.reaction] = 0;
    image[state.recovery] = 0;
    image[sectorState] = blockedState;
    assert.equal(run(image, "director_request", { x: 1 }).carry, false,
      `capital state ${blockedState} must not inherit the traversal exception`);
    assert.equal(image[state.intensity], 0);
  }
});

test("BOSS_HANDOFF maps every capital state once and leaves final COMPLETE terminal", () => {
  const expected = [5, 5, 5, 5, 5, 5, 6, 5];
  const entityState = labels.get("ENTITY_STATE");
  for (let capitalState = 0; capitalState < 8; capitalState += 1) {
    for (const pickupState of [1, 2]) {
      const image = memory();
      run(image, "director_init", { a: 0x6d });
      image[state.rowLo] = 0x80;
      image[state.rowHi] = 0x0e;
      // RE-PINNED at step 2: the level is complete when its last sector ends,
      // so the state this test wants is the COMPLETE flag on the last sector,
      // not a phase and an event index.
      image[state.sector] = 3;
      image[state.flags] = FLAG_COMPLETE;
      image[labels.get("CAPITAL_SECTOR_STATE")] = capitalState;
      image[entityState + 1] = pickupState;
      image[entityState + 2] = 4;
      const directorBefore = [...image.subarray(0x80f4, 0x80fe)];
      run(image, "integration_update_sector_completion");
      assert.equal(image[labels.get("CAPITAL_SECTOR_STATE")], expected[capitalState],
        `capital state ${capitalState}`);
      // REWRITTEN 2026-10-01 (recorded failures review, B2; owner-approved): the
      // test expected every capsule state to clear, in every capital state.
      // The rule is docs/game-design.md "Weapon pickups": an ACTIVE capsule is
      // removed when the sector takes over, a PENDING one is frozen and resumes
      // afterwards (weapon_pickup_clear_sector, since f6eee5c). The clear runs
      // with the forced DRAIN; a sector that is already COMPLETE (state 6) is
      // terminal and the routine touches nothing there.
      const forcedDrain = capitalState !== 6;
      const expectedPickup = pickupState === 2 && forcedDrain ? 0 : pickupState;
      assert.equal(image[entityState + 1], expectedPickup,
        `capital state ${capitalState}, pickup state ${pickupState}`);
      assert.equal(image[entityState + 2], 4, "collected booster lifecycle remains independent");
      assert.deepEqual([...image.subarray(0x80f4, 0x80fe)], directorBefore,
        "completion must not reset the row, the sector, the cursor or the RNG");
    }
  }

  const draining = memory();
  run(draining, "director_init", { a: 0x6d });
  draining[state.flags] = 1;
  draining[labels.get("CAPITAL_SECTOR_STATE")] = 7;
  draining[labels.get("CAPITAL_SECTOR_STATE") + 1] = 28;
  draining[broadside.state] = 1;
  run(draining, "integration_update_sector_completion");
  assert.equal(draining[labels.get("CAPITAL_SECTOR_STATE")], 5);
  run(draining, "integration_update_sector_completion");
  assert.equal(draining[labels.get("CAPITAL_SECTOR_STATE")], 5,
    "an active object must prevent premature completion");
  draining[broadside.state] = 0;
  run(draining, "integration_update_sector_completion");
  assert.equal(draining[labels.get("CAPITAL_SECTOR_STATE")], 6);
  for (let row = 0; row < 44; row += 1) run(draining, "entity_complete_scroll_tick");
  assert.equal(draining[labels.get("CAPITAL_SECTOR_STATE")], 6,
    "Director completion must not reopen and re-enter DRAIN");
});

test("scheduler ownership remains single-source and lifecycle-owned", () => {
  for (const call of ["integration_update_enemy", "integration_update_enemy_weapon",
    "integration_update_player_death", "integration_update_sector_completion",
    "integration_director_world_row"]) {
    assert.equal((mainSource.match(new RegExp(`jsr ${call}\\n`, "g")) ?? []).length, 1, call);
  }
  assert.match(directorSource, /STATE_RNG\s+= \$80FB/);
  assert.doesNotMatch(directorSource, /rng_state|STAR_RNG_STATE/);
});

test("focused production replay exposes three early qualified kills and one natural pickup", () => {
  const limits = [60, 45, 30];
  for (const difficulty of [0, 1, 2]) {
    const trace = runEarlyEnemyReplay(difficulty);
    assert.ok(trace.visible[0] <= 60, `difficulty ${difficulty} first visible ${trace.visible[0]}`);
    assert.ok(trace.kills.length >= 3, `difficulty ${difficulty} produced ${trace.kills.length} kills`);
    assert.equal(trace.pickup.pending, trace.kills[2], "third legal kill must create PENDING once");
    assert.ok(trace.pickup.active !== null && trace.pickup.active < provisionalCapital.frame,
      `difficulty ${difficulty} pickup did not become ACTIVE in the early window`);
    assert.equal(trace.pickupCounter, 0, "the three-kill counter must reset after one drop");
    assert.equal(trace.maximumActive, 1);
    for (let index = 1; index < Math.min(trace.visible.length, trace.releases.length + 1);
      index += 1) {
      const release = trace.releases[index - 1];
      assert.ok(trace.visible[index] - release <= limits[difficulty],
        `difficulty ${difficulty} visibility gap ${trace.visible[index] - release}`);
    }
    assert.equal(trace.rng.every(([before, after]) => after === (5 * before + 1 & 0xff)), true,
      "each accepted enemy must consume exactly one Director RNG value");
  }
});

test("ordinary admission is slot-safe, RNG-stable and pre-sector compatible", () => {
  const image = memory();
  image[labels.get("DIFFICULTY_SETTING")] = 2;
  image[labels.get("PLAYER_LIFECYCLE")] = 0;
  run(image, "init_state");
  run(image, "init_entity_effects");
  run(image, "director_init", { a: 0x6f });
  run(image, "init_broadside");
  const frameCounter = labels.get("frame_counter");
  image[state.reaction] = 0;
  image[frameCounter] += 1;
  run(image, "integration_active_gameplay_tick");
  run(image, "integration_update_enemy");
  assert.equal(image[labels.get("ENEMY_ACTIVE")], 1);
  const rngWithOccupiedSlot = image[state.rng];
  run(image, "integration_update_enemy");
  assert.equal(image[labels.get("ENEMY_ACTIVE")], 1, "occupied slot spawned a second enemy");
  assert.equal(image[state.rng], rngWithOccupiedSlot, "occupied slot consumed Director RNG");

  run(image, "director_release", { x: 0 });
  image[labels.get("ENEMY_ACTIVE")] = 0;
  image[state.reaction] = 0;
  const rngBeforeSameFrameRetry = image[state.rng];
  // RE-PINNED at step 2: the provisional wrapper is retired, so the request
  // the kernel's retry makes IS the production request.
  assert.equal(run(image, "director_request", { x: 0 }).carry, false,
    "a second admission in the same gameplay frame must be rejected");
  assert.equal(image[state.intensity], 0, "same-frame rejection leaked a Director charge");
  assert.equal(image[state.rng], rngBeforeSameFrameRetry,
    "same-frame rejection consumed Director RNG");

  image[frameCounter] += 1;
  run(image, "integration_active_gameplay_tick");
  image[labels.get("CAPITAL_SECTOR_STATE")] = 7;
  image[state.flags] = 0;
  image[labels.get("INTERCEPTOR_BURST_TIMER")] = 0;
  // Step 2: the armed wave paces its own members, and its spacing counts
  // WORLD ROWS - the same clock the retired reaction and recovery bytes
  // counted. This test advances frames and not rows, so it spends the spacing
  // the way the row tick would.
  image[state.spacing] = 0;
  const rngBeforeCapitalAdmission = image[state.rng];
  run(image, "integration_update_enemy");
  assert.equal(image[labels.get("ENEMY_ACTIVE")], 1,
    "pre-sector OPEN must retain ordinary admission");
  assert.equal(image[state.intensity], 1);
  assert.equal(image[state.rng], 5 * rngBeforeCapitalAdmission + 1 & 0xff,
    "pre-sector admission must consume exactly one Director RNG value");
});

test("two PMG Raiders keep separate HP, score once, and preserve the surviving machine", () => {
  const image = currentMemory();
  image[labels.get("DIFFICULTY_SETTING")] = 1;
  image[labels.get("PLAYER_LIFECYCLE")] = 0;
  run(image, "director_init", { a: 0x6d });
  run(image, "init_entity_effects");
  run(image, "reset_enemy");
  image[state.flags] = 0;
  image[labels.get("ENEMY_ARCHETYPE")] = 0;
  const member = labels.get("ENEMY_MEMBER_STATE");
  const hp = labels.get("ENEMY_HP");
  const pendingDamage = labels.get("ENEMY_PENDING_DAMAGE");
  const pendingSource = labels.get("ENEMY_PENDING_SOURCE");
  const target = labels.get("ENEMY_TARGET_SLOT");
  const live = labels.get("ENEMY_LIVE_COUNT");
  const enemyX = labels.get("ENEMY_X");
  const enemyY = labels.get("ENEMY_Y");
  const score = labels.get("score_bcd_lo");
  assert.deepEqual([...image.subarray(member, member + 2)], [1, 1]);
  assert.deepEqual([...image.subarray(hp, hp + 2)], [1, 1]);
  assert.deepEqual([image[live], image[enemyY], image[enemyY + 1]], [2, 2, 2]);

  for (let frame = 0; frame < 94; frame += 1) run(image, "update_enemy");
  assert.deepEqual([image[enemyY], image[enemyY + 1]], [48, 96],
    "both Raiders must enter naturally at their old formation anchors");

  run(image, "clear_pmg");
  run(image, "draw_enemy");
  assert.ok(image.subarray(0x3d00 + image[enemyY], 0x3d00 + image[enemyY] + 14).some(Boolean));
  assert.ok(image.subarray(0x3e00 + image[enemyY + 1], 0x3e00 + image[enemyY + 1] + 14)
    .some(Boolean));
  const survivorP2 = image.slice(0x3e00, 0x3f00);
  const survivorState = [image[enemyX + 1], image[enemyY + 1],
    image[labels.get("ENEMY_VELOCITY_X") + 1], image[labels.get("ENEMY_MANEUVER_TIMER") + 1]];

  image[target] = 0;
  image[pendingDamage] = 1;
  image[pendingSource] = 0;
  run(image, "resolve_enemy_damage");
  assert.deepEqual([...image.subarray(member, member + 2)], [0, 1]);
  assert.deepEqual([...image.subarray(hp, hp + 2)], [0, 1]);
  assert.deepEqual([image[live], image[labels.get("ENEMY_ACTIVE")], image[score]], [1, 1, 0x10]);
  assert.deepEqual([image[enemyX + 1], image[enemyY + 1],
    image[labels.get("ENEMY_VELOCITY_X") + 1], image[labels.get("ENEMY_MANEUVER_TIMER") + 1]],
  survivorState, "destroying P1 must not mutate P2 movement state");
  assert.deepEqual([...image.subarray(0x3e00, 0x3f00)], [...survivorP2],
    "destroying P1 must not redraw or erase the live P2 machine");
  run(image, "render_shared_fighter_explosions");
  assert.deepEqual([...image.subarray(0x3e00, 0x3f00)], [...survivorP2],
    "Raider breakup must not borrow the surviving PMG");
  run(image, "resolve_enemy_damage");
  assert.equal(image[score], 0x10, "re-resolving the frame must not award score twice");
  assert.equal(run(image, "ordinary_wave_pressure_active").a, 1,
    "one aggregate owner keeps capital admission blocked while any Raider survives");

  run(image, "update_enemy");
  assert.deepEqual([...image.subarray(member, member + 2)], [0, 1]);
  assert.equal(image[enemyY + 1], survivorState[1] - 1,
    "the surviving P2 continues its accepted independent crossing motion");
  assert.ok(image[enemyX + 1] >= 48 && image[enemyX + 1] <= 208);
  assert.equal(image[labels.get("ENEMY_VELOCITY_X") + 1], survivorState[2]);
  assert.equal(image[labels.get("ENEMY_MANEUVER_TIMER") + 1], survivorState[3] - 1);

  image[target] = 1;
  image[pendingDamage + 1] = 1;
  image[pendingSource + 1] = 0;
  run(image, "resolve_enemy_damage");
  assert.deepEqual([...image.subarray(member, member + 2)], [0, 0]);
  assert.deepEqual([image[live], image[labels.get("ENEMY_ACTIVE")], image[score]], [0, 2, 0x20]);
  assert.equal(image[labels.get("FIGHTER_EXPLOSION_TIMER") + 1], 24,
    "the last loss leaves the shared explosion lifecycle active");
});

test("the shared burst alternates two real Raider origins and skips a destroyed owner", () => {
  const image = currentMemory();
  image[labels.get("DIFFICULTY_SETTING")] = 1;
  image[labels.get("PLAYER_LIFECYCLE")] = 0;
  run(image, "director_init", { a: 0x6d });
  run(image, "init_entity_effects");
  run(image, "reset_enemy");
  image[state.flags] = 0;
  image[labels.get("ENEMY_ARCHETYPE")] = 0;
  const target = labels.get("ENEMY_TARGET_SLOT");
  const cursor = labels.get("ENEMY_WEAPON_CURSOR");
  const projectileActive = labels.get("FIGHTER_PROJECTILE_ACTIVE");
  const projectileY = labels.get("FIGHTER_PROJECTILE_Y");
  const enemyY = labels.get("ENEMY_Y");
  for (let frame = 0; frame < 95; frame += 1) run(image, "update_enemy");
  const origins = [image[enemyY], image[enemyY + 1]];
  assert.equal(run(image, "select_enemy_weapon_member").carry, true,
    "fully entered Raiders must be eligible emitters");
  run(image, "update_enemy_weapon_runtime");
  image[labels.get("INTERCEPTOR_BURST_TIMER")] = 0;
  run(image, "update_enemy_weapon_runtime");
  // RE-PINNED 2026-10-01 (recorded failures review, A11): a hostile shot's ACTIVE byte is
  // (weapon_class << 3) | kind since 8a09e57 / 35f2b90, so class 1 kinds 2 and 3
  // read 10 and 11 (src/main.s update_fighter_projectiles).
  assert.deepEqual([...image.subarray(projectileActive + 5, projectileActive + 7)], [10, 11]);
  assert.deepEqual([...image.subarray(projectileY + 5, projectileY + 7)],
    origins.map((value) => value + 13));
  assert.equal(image[cursor], 0);

  image[target] = 0;
  image[labels.get("ENEMY_PENDING_DAMAGE")] = 1;
  image[labels.get("ENEMY_PENDING_SOURCE")] = 0;
  run(image, "resolve_enemy_damage");
  const releasedY = image[projectileY + 5];
  run(image, "update_fighter_projectiles");
  assert.equal(image[projectileActive + 5], 10,
    "an already released pulse survives the death of its emitter");
  assert.equal(image[projectileY + 5], releasedY + 2);

  image[cursor] = 0;
  assert.equal(run(image, "select_enemy_weapon_member").carry, true);
  assert.equal(image[target], 1, "the round robin skips the destroyed owner");
});

// RE-PINNED at step 2. The per-phase hazard masks are retired; what a sector
// admits is its own `sector_hazards` byte, and the level file is where it is
// written. What this test still guards - and the reason it exists - is the
// CAPITAL GATE, which is not level data at all: it is a PMG fact.
test("the hazard mask is the sector's own, while the capital gate stays local", () => {
  const image = currentMemory();
  const compiled = pokeLevel(image, {
    sectors: [
      { kind: "space", subtype: "elite", rows: 800, archetypes: ["raider", "wingman"],
        lights: 1, heavies: 2, hazards: { debris: 2, pickups: true } },
      { kind: "capital", archetypes: [],
        hazards: { debris: 1, pickups: true, broadside: true } },
    ],
  });
  // The hazard byte is written by the compiler and read by the Director; the
  // bits are plan §2.2's: 0-1 debris, 2 pickups, 3 broadside.
  const hazards = [...image.subarray(LEVEL_CORE_ADDRESS + 0x38, LEVEL_CORE_ADDRESS + 0x3a)];
  assert.deepEqual(hazards, [2 | 0x04, 1 | 0x04 | 0x08],
    "a space sector with debris and pickups, and a capital that adds the broadside");
  assert.equal(compiled.sectors[0].broadside, false,
    "only the sector that authored it may schedule a broadside");
  assert.deepEqual(byteTable(image, "interceptor_admission_retry_frames", 3), [48, 36, 24]);
  assert.match(mainSource,
    /ordinary_wave_capital_blocked:[\s\S]+bit DIRECTOR_STATE_FLAGS[\s\S]+cmp #CAPITAL_HULL_STATE_OPEN/);
  assert.match(mainSource,
    /interceptor_admission_update:[\s\S]+jsr ordinary_wave_capital_blocked[\s\S]+bmi @blocked/);
  // Step 2: the retry asks the production request directly - there is no
  // wrapper left to borrow a policy before it.
  assert.match(mainSource,
    /@request:[\s\S]+ldx #DIRECTOR_HAZARD_INTERCEPTOR\s+jsr DIRECTOR_REQUEST/);
  assert.match(mainSource,
    /update_enemy_weapon_runtime:[\s\S]+jsr ordinary_wave_capital_blocked[\s\S]+bmi @stop/);
});

test("active-gameplay schedule freezes across pause and odd player lifecycles", () => {
  const image = memory();
  image[labels.get("PLAYER_LIFECYCLE")] = 0;
  for (let frame = 0; frame < 100; frame += 1) run(image, "integration_active_gameplay_tick");
  const beforePause = image[provisionalCapital.frameLo] |
    image[provisionalCapital.frameHi] << 8;
  assert.equal(beforePause, 100);
  image[labels.get("PLAYER_LIFECYCLE")] = 1;
  for (let frame = 0; frame < 80; frame += 1) run(image, "integration_active_gameplay_tick");
  assert.equal(image[provisionalCapital.frameLo] |
    image[provisionalCapital.frameHi] << 8, beforePause);
  image[labels.get("PLAYER_LIFECYCLE")] = 2;
  for (let frame = 0; frame < 500; frame += 1) run(image, "integration_active_gameplay_tick");
  assert.equal(image[provisionalCapital.frameLo] |
    image[provisionalCapital.frameHi] << 8, provisionalCapital.frame);
});

// RE-PINNED at step 2 (owner decision 3, plan §11 item 3). The capital used to
// become DUE on a 16-bit ACTIVE-GAMEPLAY FRAME count; it becomes DUE when the
// ROW clock enters a CAPITAL sector. Every other clause here is unchanged,
// including the two that matter most: a live hostile holds the admission
// pending rather than losing it, and a level restart clears it.
test("first capital admission is due on the authored ROW and retries until the playfield drains",
  () => {
    const sectorState = labels.get("CAPITAL_SECTOR_STATE");
    const frameCounter = labels.get("frame_counter");
    const toCapitalRow = (image) => {
      for (let row = 0; row < 272; row += 1) run(image, "director_world_row_tick");
    };
    const legal = memory();
    run(legal, "director_init", { a: 0x6d });
    run(legal, "init_broadside");
    for (let row = 0; row < 271; row += 1) run(legal, "director_world_row_tick");
    run(legal, "integration_update_first_capital");
    assert.equal(legal[sectorState], 7);
    assert.equal(legal[state.flags], 0, "one row early is not due");
    run(legal, "director_world_row_tick");
    run(legal, "integration_update_first_capital");
    assert.equal(legal[sectorState], 0, "the first legal attempt admits on the authored row");
    assert.equal(legal[state.flags], provisionalCapital.admitted);

    run(legal, "director_init", { a: 0x6d });
    run(legal, "init_broadside");
    assert.equal(legal[state.flags], 0, "level restart must reset the admission state");
    assert.equal(legal[sectorState], 7);

    const blocked = memory();
    run(blocked, "director_init", { a: 0x6d });
    run(blocked, "init_broadside");
    toCapitalRow(blocked);
    blocked[labels.get("ENEMY_ACTIVE")] = 1;
    blocked[state.intensity] = 1;
    run(blocked, "integration_update_first_capital");
    assert.equal(blocked[sectorState], 7);
    assert.equal(blocked[state.flags], provisionalCapital.due,
      "a live ordinary enemy must retain a deterministic pending admission");
    blocked[frameCounter] += 1;
    blocked[labels.get("ENEMY_ACTIVE")] = 0;
    blocked[state.intensity] = 0;
    run(blocked, "integration_update_first_capital");
    assert.equal(blocked[sectorState], 0);
    assert.equal(blocked[state.flags], provisionalCapital.admitted,
      "retry must commit at the first subsequent legal gameplay frame");
  });

// RE-PINNED at step 2. There are no event rows left to duplicate the capital;
// the level authors exactly as many CAPITAL sectors as it wants, and the one
// this level authors is entered once. The clause that survives is the one the
// title names: nothing the row clock does later reopens or interrupts a
// traversal that is already running.
test("the capital encounter is entered once and no later row interrupts it", () => {
  const image = memory();
  assert.equal((mainSource.match(/jsr integration_update_first_capital\n/g) ?? []).length, 1);
  assert.match(mainSource,
    /integration_update_first_capital:[\s\S]+jsr HYBRID_SECTOR_UPDATE_FIRST_CAPITAL/);
  // The threshold the C lifecycle used to own is gone: the entry is the drain
  // test and nothing else.
  assert.doesNotMatch(lifecycleSource, /ACTIVE_GAMEPLAY_FRAME_HI\s*<|FIRST_CAPITAL/);
  assert.match(lifecycleSource,
    /sector_c_update_first_capital[\s\S]+DIRECTOR_FLAG_CAPITAL_DUE[\s\S]+sector_c_drain_clear/);

  run(image, "director_init", { a: 0x6d });
  image[labels.get("CAPITAL_SECTOR_STATE")] = 2;
  for (let row = 0; row < 3_000; row += 1) run(image, "director_world_row_tick");
  assert.equal(image[labels.get("CAPITAL_SECTOR_STATE")], 2,
    "a traversal in progress is neither duplicated nor interrupted by later rows");
  assert.equal(image[state.sector], 1, "and the Director waits in the capital sector for it");
});

test("natural Level 1 reaches a visible two-sided BROADSIDE without state injection", () => {
  const ownersAcrossDifficulties = new Set();
  for (const difficulty of [0, 1, 2]) {
    const image = memory();
    const lifecycle = labels.get("PLAYER_LIFECYCLE");
    const sectorState = labels.get("CAPITAL_SECTOR_STATE");
    const broadState = labels.get("BROAD_STATE");
    const broadOwner = 0x4e43;
    const broadX = 0x4e49;
    const broadFlash = labels.get("BROAD_FLASH_TIMER");
    const frameCounter = labels.get("frame_counter");
    image[labels.get("DIFFICULTY_SETTING")] = difficulty;
    image[lifecycle] = 0;
    run(image, "init_playfield_row_table");
    run(image, "init_playfield_display_lists");
    run(image, "init_state");
    run(image, "unpack_capital_hull_maps");
    run(image, "director_init", { a: 0x6d ^ difficulty });
    run(image, "init_broadside");
    assert.equal(image[sectorState], 7, "intro must begin in the documented open corridor");

    const visibleByOwner = new Set();
    const motionByOwner = new Set();
    const previousX = new Map();
    const previousStates = [0, 0, 0];
    const previousFlashes = [0, 0, 0];
    const hostileCycles = { warnings: 0, flashes: 0, launches: 0 };
    const debrisAdmissions = [];
    const debrisReleases = [];
    let debrisWasActive = false;
    let maximumActiveDebris = 0;
    let admittedAtFrame = null;
    let enteredCapitalAtRow = null;
    let completedCapital = false;
    for (let frame = 0; frame < 10_000; frame += 1) {
      image[frameCounter] = image[frameCounter] + 1 & 0xff;
      run(image, "integration_active_gameplay_tick");
      const stateBeforeAdmission = image[sectorState];
      run(image, "integration_update_first_capital");
      if (admittedAtFrame === null && stateBeforeAdmission === 7 && image[sectorState] === 0)
        admittedAtFrame = frame + 1;
      run(image, "tick_launch_flashes");
      run(image, "update_broadside");
      run(image, "update_starfield");
      const debrisBeforeUpdate = image[labels.get("ENTITY_ACTIVE_MASK")] & 1;
      run(image, "entity_effects_update");
      const debrisActive = image[labels.get("ENTITY_ACTIVE_MASK")] & 1;
      // RE-PINNED at step 2. The admissions below are already counted only
      // inside the capital corridor (sector state < 5) and the releases were
      // counted everywhere, so the first capital admission was being measured
      // against a release from the fighter sector before it. That mixed gap
      // moved when the capital did - it is due on the authored ROW now, which
      // on EASY is 80 frames later than the retired frame gate (owner decision
      // 3) - and it was measuring the run-in, not the corridor. Both halves are
      // the corridor's now, which is what the clause below is about.
      if (debrisBeforeUpdate && !debrisActive && image[sectorState] < 5) {
        debrisReleases.push(frame + 1);
      }
      if (debrisActive && !debrisWasActive && image[sectorState] < 5)
        debrisAdmissions.push(frame + 1);
      maximumActiveDebris = Math.max(maximumActiveDebris, debrisActive);
      debrisWasActive = debrisActive !== 0;
      run(image, "render_launch_flashes");
      run(image, "integration_update_sector_completion");
      const row = image[state.rowLo] | image[state.rowHi] << 8;
      if (enteredCapitalAtRow === null && image[sectorState] < 5) enteredCapitalAtRow = row;
      for (let slot = 0; slot < 3; slot += 1) {
        const slotState = image[broadState + slot];
        const owner = image[broadOwner + slot];
        const flash = image[broadFlash + slot];
        if (owner === 1 && slotState === 1 && previousStates[slot] !== 1)
          hostileCycles.warnings += 1;
        if (owner === 1 && slotState === 2 && previousStates[slot] === 1)
          hostileCycles.launches += 1;
        if (owner === 1 && flash !== 0 && previousFlashes[slot] === 0)
          hostileCycles.flashes += 1;
        previousStates[slot] = slotState;
        previousFlashes[slot] = flash;
        if (image[broadState + slot] !== 2) continue;
        const x = image[broadX + slot];
        if (x >= 48 && x < 208) visibleByOwner.add(owner);
        const key = `${slot}:${owner}`;
        if (previousX.has(key)) {
          const delta = x - previousX.get(key);
          if (owner === 0 && delta === 2 || owner === 1 && delta === -2) {
            motionByOwner.add(owner);
          }
        }
        previousX.set(key, x);
      }
      completedCapital ||= enteredCapitalAtRow !== null && image[sectorState] >= 6;
      if (completedCapital && image[state.intensity] === 0) break;
    }

    // RE-PINNED at step 2 (owner decision 3). The capital is due on the
    // authored ROW, not at active gameplay frame 600, so the FRAME it admits
    // on is now a consequence of the difficulty's scroll rate - later on EASY,
    // earlier on HARD - while the ROW is the same on all three. That is the
    // whole of the change this replay sees, and the row is what the assertion
    // pins now. The frame is still bounded, because a capital that never
    // arrived would fail every clause below it.
    assert.equal(enteredCapitalAtRow, 272,
      `difficulty ${difficulty} capital must be due on level 1's authored row`);
    assert.ok(admittedAtFrame !== null && admittedAtFrame < 1_000,
      `difficulty ${difficulty} capital admitted at frame ${admittedAtFrame}`);
    assert.ok(visibleByOwner.has(1),
      `difficulty ${difficulty} must render a natural Hostile projectile`);
    assert.deepEqual([...motionByOwner].sort(), [...visibleByOwner].sort(),
      `difficulty ${difficulty} visible projectiles must move in their intended directions`);
    assert.ok(hostileCycles.warnings >= 3,
      `difficulty ${difficulty} produced only ${hostileCycles.warnings} Hostile warnings`);
    assert.equal(hostileCycles.flashes, hostileCycles.warnings,
      `difficulty ${difficulty} warning/flash lifecycle mismatch`);
    assert.equal(hostileCycles.launches, hostileCycles.warnings,
      `difficulty ${difficulty} warning/launch lifecycle mismatch`);
    assert.ok(debrisAdmissions.length >= 3,
      `difficulty ${difficulty} capital debris admissions ${debrisAdmissions.join(",")}`);
    assert.equal(maximumActiveDebris, 1,
      `difficulty ${difficulty} exceeded the single debris-slot limit`);
    const admissionIntervals = debrisAdmissions.slice(1)
      .map((frame, index) => frame - debrisAdmissions[index]);
    // A debris admitted in the fighter sector can be RELEASED inside the
    // corridor, which puts a release in front of the first admission and
    // shifts every pair by one. Align on the admissions: each gap is measured
    // from the last release before it.
    const pairedReleases = debrisReleases.filter((frame) => frame > debrisAdmissions[0]);
    const emptyIntervals = debrisAdmissions.slice(1)
      .map((frame, index) => frame - pairedReleases[index]);
    assert.ok(Math.max(...admissionIntervals) <= 384,
      `difficulty ${difficulty} capital admission gap ${Math.max(...admissionIntervals)} frames; ` +
      `admissions=${debrisAdmissions.join(",")}; releases=${debrisReleases.join(",")}`);
    assert.ok(Math.max(...emptyIntervals) <= 272,
      `difficulty ${difficulty} empty debris gap ${Math.max(...emptyIntervals)} frames`);
    for (const owner of visibleByOwner) ownersAcrossDifficulties.add(owner);
    assert.equal(completedCapital, true, `difficulty ${difficulty} capital section must drain`);
    assert.equal(image[state.intensity], 0,
      `difficulty ${difficulty} projectile lifecycles must release intensity`);
  }
  assert.deepEqual([...ownersAcrossDifficulties].sort(), [0, 1],
    "the source-authored alternating schedule must exercise both firing sides");
});

test("natural capital exit performs one scene recycle on every world row", () => {
  const image = memory();
  const lifecycle = labels.get("PLAYER_LIFECYCLE");
  const sectorState = labels.get("CAPITAL_SECTOR_STATE");
  const frameCounter = labels.get("frame_counter");
  const rotate = labels.get("rotate_playfield_rows");
  image[labels.get("DIFFICULTY_SETTING")] = 2;
  image[lifecycle] = 0;
  run(image, "init_playfield_row_table");
  run(image, "init_playfield_display_lists");
  run(image, "init_state");
  run(image, "unpack_capital_hull_maps");
  run(image, "director_init", { a: 0x6f });
  run(image, "init_broadside");

  let drainWorldRows = 0;
  let drainRecycles = 0;
  let previousRow = 0;
  let sawComplete = false;
  for (let frame = 0; frame < 5_000; frame += 1) {
    image[frameCounter] = image[frameCounter] + 1 & 0xff;
    run(image, "integration_active_gameplay_tick");
    run(image, "integration_update_first_capital");
    run(image, "tick_launch_flashes");
    run(image, "update_broadside");
    const result = run(image, "update_starfield");
    run(image, "entity_effects_update");
    run(image, "render_launch_flashes");
    run(image, "integration_update_sector_completion");
    const row = image[state.rowLo] | image[state.rowHi] << 8;
    if (image[sectorState] === 5 && row !== previousRow) {
      drainWorldRows += 1;
      drainRecycles += result.visited.filter((address) => address === rotate).length;
    }
    previousRow = row;
    if (drainWorldRows > 0 && image[sectorState] === 6) {
      sawComplete = true;
      break;
    }
  }
  assert.equal(sawComplete, true, "natural capital DRAIN did not reach COMPLETE");
  assert.equal(drainWorldRows, 28, "DRAIN must consume every visible hull row exactly once");
  assert.equal(drainRecycles, drainWorldRows,
    "the exit cannot fall back to the half-rate near-layer recycle");
});
