import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502, nmos6502Flags } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
const directorSource = fs.readFileSync(path.join(root, "src/encounter-director.s"), "utf8");
const labels = new Map();
for (const file of ["build/void-strike-65.lbl", "build/encounter-director.lbl",
  "build/integration-glue.lbl"]) {
  for (const line of fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) labels.set(match[2], Number.parseInt(match[1], 16));
  }
}

const state = {
  rowLo: 0x80f4, rowHi: 0x80f5, phase: 0x80f6, event: 0x80f7,
  intensity: 0x80f8, reaction: 0x80f9, recovery: 0x80fa, rng: 0x80fb,
  pending: 0x80fc, defer: 0x80fd, flags: 0x80fe, admissionFrame: 0x80ff,
};
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
  return { visited, carry: (cpu.p & nmos6502Flags.carry) !== 0, cycles: cpu.cycles };
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

function prepareBroadside({ difficulty = 2, phase = 3, frame = 10 } = {}) {
  const image = memory();
  image[labels.get("DIFFICULTY_SETTING")] = difficulty;
  image[labels.get("PLAYER_LIFECYCLE")] = 0;
  image[labels.get("frame_counter")] = frame;
  run(image, "director_init", { a: 0x6f });
  image[state.phase] = phase;
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
  const enemyY = labels.get("enemy_y");
  const enemyHp = labels.get("ENEMY_HP");
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
    if (after === 1 && image[enemyY] + 14 > 16 && visible.length < admissions.length) {
      visible.push(frame);
      if (kills.length < 3) {
        image[labels.get("ENEMY_PENDING_DAMAGE")] = 0;
        image[labels.get("ENEMY_PENDING_SOURCE")] = 5;
        run(image, "queue_enemy_damage", { a: image[enemyHp], y: 0 });
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

test("Level 1 has exactly eight gapless phases and ends at row 3712", () => {
  const image = memory();
  const lo = byteTable(image, "level1_phase_end_lo", 8);
  const hi = byteTable(image, "level1_phase_end_hi", 8);
  const ends = lo.map((value, index) => value | hi[index] << 8);
  assert.deepEqual(ends, [128, 576, 1056, 1664, 1856, 2752, 2944, 3712]);
  assert.equal(labels.get("director_level1_end"), 3712);
  assert.ok(ends.every((end, index) => index === 0 || end > ends[index - 1]));
});

test("phase policy encodes EASY/MEDIUM/HARD intensity ceilings 3/4/5", () => {
  const image = memory();
  const easy = byteTable(image, "level1_phase_budget_easy", 8);
  const medium = byteTable(image, "level1_phase_budget_medium", 8);
  const hard = byteTable(image, "level1_phase_budget_hard", 8);
  assert.equal(Math.max(...easy) + 0, 3);
  assert.equal(Math.max(...medium), 4);
  assert.equal(Math.max(...hard), 5);
  for (let index = 0; index < 8; index += 1) {
    assert.ok(easy[index] <= medium[index] && medium[index] <= hard[index]);
  }
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
  assert.equal(first[state.phase], 7);
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

test("BOSS_HANDOFF falls back to COMPLETE exactly once and closes admissions", () => {
  const image = memory();
  run(image, "director_init", { a: 0x6d });
  image[state.rowLo] = 0x7f; image[state.rowHi] = 0x0e;
  image[state.phase] = 7; image[state.event] = 5; image[state.pending] = 0xff;
  image[state.reaction] = 0; image[state.recovery] = 0;
  run(image, "director_world_row_tick");
  assert.equal(image[state.rowLo] | image[state.rowHi] << 8, 3712);
  assert.equal(image[state.flags] & 1, 1);
  assert.equal(image[state.event], 6); assert.equal(image[state.pending], 0xff);
  const event = image[state.event];
  run(image, "director_world_row_tick");
  assert.equal(image[state.event], event);
  image[labels.get("frame_counter")] += 1;
  assert.equal(run(image, "director_request", { x: 0 }).carry, false);
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
      image[state.phase] = 7;
      image[state.event] = 6;
      image[state.flags] = 1;
      image[labels.get("CAPITAL_SECTOR_STATE")] = capitalState;
      image[entityState + 1] = pickupState;
      image[entityState + 2] = 4;
      const directorBefore = [...image.subarray(0x80f4, 0x80fe)];
      run(image, "integration_update_sector_completion");
      assert.equal(image[labels.get("CAPITAL_SECTOR_STATE")], expected[capitalState],
        `capital state ${capitalState}`);
      assert.equal(image[entityState + 1], 0, `pickup state ${pickupState} must clear`);
      assert.equal(image[entityState + 2], 4, "collected booster lifecycle remains independent");
      assert.deepEqual([...image.subarray(0x80f4, 0x80fe)], directorBefore,
        "handoff must not reset row, phase, RNG or event state");
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

test("ordinary rejection is bounded, slot-safe, RNG-stable and capital-exclusive", () => {
  const image = memory();
  image[labels.get("DIFFICULTY_SETTING")] = 2;
  image[labels.get("PLAYER_LIFECYCLE")] = 0;
  run(image, "init_state");
  run(image, "init_entity_effects");
  run(image, "director_init", { a: 0x6f });
  run(image, "init_broadside");
  image[state.reaction] = 0;
  image[labels.get("frame_counter")] = 1;
  image[state.phase] = 2;
  const rngBeforeMaskReject = image[state.rng];
  assert.equal(run(image, "provisional_interceptor_director_request", { x: 0 }).carry, false);
  assert.equal(image[state.rng], rngBeforeMaskReject, "phase-mask rejection consumed RNG");

  image[state.phase] = 1;
  image[state.admissionFrame] = 0;
  run(image, "integration_update_enemy");
  assert.equal(image[labels.get("ENEMY_ACTIVE")], 1);
  const rngWithOccupiedSlot = image[state.rng];
  run(image, "integration_update_enemy");
  assert.equal(image[labels.get("ENEMY_ACTIVE")], 1, "occupied slot spawned a second enemy");
  assert.equal(image[state.rng], rngWithOccupiedSlot, "occupied slot consumed Director RNG");

  image[labels.get("ENEMY_ACTIVE")] = 0;
  image[state.intensity] = 0;
  image[labels.get("CAPITAL_SECTOR_STATE")] = 0;
  image[labels.get("INTERCEPTOR_BURST_TIMER")] = 0;
  image[state.reaction] = 0;
  run(image, "integration_update_enemy");
  assert.equal(image[labels.get("ENEMY_ACTIVE")], 0,
    "active capital hull admitted an ordinary enemy");
  assert.equal(image[state.intensity], 0);
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

test("provisional first capital admission uses the 16-bit active-gameplay clock", () => {
  const sectorState = labels.get("CAPITAL_SECTOR_STATE");
  const frameCounter = labels.get("frame_counter");
  const legal = memory();
  run(legal, "director_init", { a: 0x6d });
  run(legal, "init_broadside");
  setActiveGameplayFrame(legal, provisionalCapital.frame - 1);
  run(legal, "integration_update_first_capital");
  assert.equal(legal[sectorState], 7);
  assert.equal(legal[state.flags], 0);
  setActiveGameplayFrame(legal, provisionalCapital.frame);
  run(legal, "integration_update_first_capital");
  assert.equal(legal[sectorState], 0, "the first legal attempt must admit at active frame 600");
  assert.equal(legal[state.flags], provisionalCapital.admitted);

  run(legal, "director_init", { a: 0x6d });
  run(legal, "init_broadside");
  assert.equal(legal[state.flags], 0, "level restart must reset provisional admission state");
  assert.equal(legal[sectorState], 7);

  const blocked = memory();
  run(blocked, "director_init", { a: 0x6d });
  run(blocked, "init_broadside");
  setActiveGameplayFrame(blocked, provisionalCapital.frame);
  blocked[state.intensity] = 2;
  run(blocked, "integration_update_first_capital");
  assert.equal(blocked[sectorState], 7);
  assert.equal(blocked[state.flags], provisionalCapital.due,
    "a legal budget block must retain a deterministic pending admission");
  setActiveGameplayFrame(blocked, provisionalCapital.frame + 1);
  blocked[frameCounter] += 1;
  blocked[state.intensity] = 0;
  run(blocked, "integration_update_first_capital");
  assert.equal(blocked[sectorState], 0);
  assert.equal(blocked[state.flags], provisionalCapital.admitted,
    "retry must commit at the first subsequent legal gameplay frame");
});

test("the provisional gate moves rather than duplicates the one capital encounter", () => {
  const image = memory();
  assert.deepEqual(byteTable(image, "level1_phase_capital_state", 8), Array(8).fill(7));
  assert.deepEqual(byteTable(image, "level1_event_row_lo", 6),
    [128, 32, 64, 128, 0, 128]);
  assert.deepEqual(byteTable(image, "level1_event_row_hi", 6), [0, 4, 7, 11, 14, 14]);
  assert.equal((mainSource.match(/jsr integration_update_first_capital\n/g) ?? []).length, 1);
  assert.match(mainSource,
    /cmp #>PROVISIONAL_FIRST_CAPITAL_FRAME[\s\S]+cmp #<PROVISIONAL_FIRST_CAPITAL_FRAME[\s\S]+jmp retry_first_capital_admission/);
  assert.equal((mainSource.match(/PROVISIONAL_FIRST_CAPITAL_FRAME/g) ?? []).length, 2,
    "the historical frame-50 gate must not survive as a second event");

  run(image, "director_init", { a: 0x6d });
  image[labels.get("CAPITAL_SECTOR_STATE")] = 2;
  for (let row = 0; row < 3_000; row += 1) run(image, "director_world_row_tick");
  assert.equal(image[labels.get("CAPITAL_SECTOR_STATE")], 2,
    "later phase boundaries must neither duplicate nor interrupt the moved encounter");
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
      run(image, "entity_effects_update");
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

    assert.equal(admittedAtFrame, provisionalCapital.frame,
      `difficulty ${difficulty} capital admission must occur at active gameplay frame 600`);
    assert.ok(enteredCapitalAtRow >= 200,
      `difficulty ${difficulty} capital section must follow the early ordinary-enemy window`);
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
