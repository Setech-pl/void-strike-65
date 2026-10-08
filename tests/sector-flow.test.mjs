// feat/sector-flow (docs/plans/sector-flow.md, gameplay-variety.md §3.8, owner
// answer Q10 of 2026-10-08): the Director's three sector-flow rules, as the
// default for every level.
//
//   1. the early end: a space sector whose waves are all spawned ends on the
//      first row tick with the field clear (no Heavy formation, no Light), and
//      its authored row count becomes the no-kill cut;
//   2. afterCleared (`wave_flags` bit 4): the wave arms when its row is reached
//      AND the field is clear - an escort Light counts;
//   3. C1 (w2-lights.md §3.4, the M4 prerequisite): at the row count, the end
//      is held while the live population exceeds the NEXT sector's ceilings.
//
// The fixtures are synthetic levels compiled by the real compiler and poked
// into the level buffer (the method of tests/encounter-director.test.mjs); the
// live population is poked into the bytes the kernel and the Light stepper own
// (ENEMY_ACTIVE, light_state, the wave counters), because the Director is the
// unit under test and it reads only those. The level-1 effect - the time to the
// boss falls - is measured by the timeline probe on the default build.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
import { compileLevel, defaultHullAsset, LEVEL_CORE_ADDRESS } from "../scripts/level-compiler.mjs";
import { captureTimeline } from "../scripts/level-timeline.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const labels = new Map();
for (const file of ["build/void-strike-65.lbl", "build/encounter-director.lbl",
  "build/integration-glue.lbl"]) {
  for (const line of fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) labels.set(match[2], Number.parseInt(match[1], 16));
  }
}
const at = (name) => {
  const address = labels.get(name);
  assert.ok(Number.isInteger(address), `missing label ${name}`);
  return address;
};

const state = { sector: 0x80f6, waveCursor: 0x80f7, waveRemaining: 0x80fc, flags: 0x80fe };
const FLAG_COMPLETE = 0x01;
const FLAG_CAPITAL_DUE = 0x80;
const ENEMY_ACTIVE = at("ENEMY_ACTIVE");
const LIGHT_STATE = at("_light_state");
const LIGHT_WAVE_LOCK = at("_light_wave_lock");
const LIGHT_WAVE_REMAINING = at("_light_wave_remaining");
const LIGHT_FREE = 2;

const hullAsset = defaultHullAsset();
function level(sectors) {
  const image = new Uint8Array(0x10000);
  installRuntimeSegments(image, root);
  const compiled = compileLevel({ level: 1, seed: 109, hull: { length: 3, turrets: 3 }, sectors },
    { hullAsset, file: "sector-flow.json" });
  image.set(compiled.pages.core, LEVEL_CORE_ADDRESS);
  image[at("frame_counter")] = 9;
  run(image, "director_init", { a: 0 });
  return image;
}

function run(image, target, { a = 0, x = 0 } = {}) {
  const cpu = new Nmos6502(image);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8); cpu.push((stop - 1) & 0xff);
  cpu.pc = at(target); cpu.a = a; cpu.x = x;
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) {
    assert.notEqual(image[cpu.pc], 0, `${target} reached BRK`);
    cpu.step();
  }
  assert.equal(cpu.pc, stop, `${target} did not return`);
  return cpu.cycles;
}

const tick = (image, rows = 1) => {
  for (let row = 0; row < rows; row += 1) run(image, "director_world_row_tick");
};

const heavyWave = (row, archetype = "raider", extra = {}) =>
  ({ row, archetype, count: 1, spacing: 24, entry: 124, ...extra });
const lightWave = (row, archetype = "wingman", extra = {}) =>
  ({ row, archetype, count: 3, spacing: 32, entry: 88, ...extra });
function elite(rows, waves = []) {
  return { kind: "space", subtype: "elite", rows,
    archetypes: ["raider", "wingman", "interceptor", "bomber"],
    lights: 1, heavies: 2, hazards: { debris: 2, pickups: true }, waves };
}
function swarm(rows, waves = []) {
  return { kind: "space", subtype: "swarm", rows, archetypes: ["wingman", "interceptor"],
    lights: 3, heavies: 0, hazards: { debris: 2, pickups: true }, waves };
}
const capital = { kind: "capital", archetypes: [], hazards: { debris: 1, pickups: true, broadside: true } };

// The kernel's admission of the armed Heavy wave's formation, as the Director
// sees it: STATE_WAVE_REMAINING counts down and the formation is live.
function admitFormation(image) {
  assert.ok(image[state.waveRemaining] > 0, "no formation to admit");
  image[state.waveRemaining] -= 1;
  image[ENEMY_ACTIVE] = 1;
}
// The Light stepper's wave, spent, with `live` members still flying.
function spendLightWave(image, live) {
  image[LIGHT_WAVE_REMAINING] = 0;
  for (let slot = 0; slot < 4; slot += 1) image[LIGHT_STATE + slot] = slot < live ? LIGHT_FREE : 0;
  image[LIGHT_WAVE_LOCK] = live === 0 ? 0 : 1;
}

test("early end: a sector whose waves are spent ends on the first row tick with the field clear", () => {
  const image = level([elite(64, [heavyWave(0)]), elite(64, [heavyWave(0, "bomber")])]);
  assert.equal(image[state.waveRemaining], 1, "the row-0 wave arms at entry");
  tick(image, 4);
  assert.equal(image[state.sector], 0, "a formation still to admit keeps the sector");
  admitFormation(image);
  tick(image, 4);
  assert.equal(image[state.sector], 0, "a live formation keeps the sector");
  image[ENEMY_ACTIVE] = 0;
  tick(image);
  assert.equal(image[state.sector], 1, "the sector ends on the first row tick after its last formation");
  assert.equal(image[state.waveRemaining], 1, "and the next sector opens with its own row-0 wave armed");
});

test("early end: never with a formation pending, the Light lock up, or an escort Light live", () => {
  const image = level([elite(64, [heavyWave(0)]), elite(64)]);
  tick(image, 8);
  assert.equal(image[state.sector], 0, "a pending formation holds even on a clear field");
  admitFormation(image);
  image[ENEMY_ACTIVE] = 0;
  image[LIGHT_STATE + 2] = LIGHT_FREE;          // the escort, flying free after its leader
  tick(image, 8);
  assert.equal(image[state.sector], 0, "a live escort Light keeps the sector");
  image[LIGHT_STATE + 2] = 0;
  image[LIGHT_WAVE_LOCK] = 1;
  tick(image, 8);
  assert.equal(image[state.sector], 0, "the Light lock keeps the sector");
  image[LIGHT_WAVE_LOCK] = 0;
  tick(image);
  assert.equal(image[state.sector], 1);
});

test("early end: a Light wave's sector ends once the wave is spent and its last Light is gone", () => {
  const image = level([swarm(128, [lightWave(0)]), elite(64)]);
  assert.equal(image[LIGHT_WAVE_LOCK], 1, "the row-0 Light wave arms at entry");
  spendLightWave(image, 2);
  tick(image, 8);
  assert.equal(image[state.sector], 0, "two Lights still flying");
  spendLightWave(image, 0);
  tick(image);
  assert.equal(image[state.sector], 1);
});

test("early end: a sector with no waves still lasts its rows, and the row count is still the cut", () => {
  const image = level([elite(32), elite(32)]);
  tick(image, 31);
  assert.equal(image[state.sector], 0, "a wave-less sector is a timed stretch");
  tick(image);
  assert.equal(image[state.sector], 1);
  // A sector whose wave never gets admitted ends on its rows, as before.
  const cut = level([elite(32, [heavyWave(0)]), elite(32)]);
  tick(cut, 31);
  assert.equal(cut[state.sector], 0);
  tick(cut);
  assert.equal(cut[state.sector], 1, "the row count ends a sector whose wave is still pending");
});

test("afterCleared: the wave arms on its row only once the field is clear; the row is a minimum", () => {
  const image = level([elite(160, [heavyWave(0), heavyWave(8, "bomber", { afterCleared: true })]), elite(64)]);
  admitFormation(image);
  tick(image, 7);
  assert.equal(image[state.waveCursor], 1, "nothing arms before row 8");
  tick(image, 8);
  assert.equal(image[state.waveCursor], 1, "the Raider pair is live: the afterCleared wave waits");
  assert.equal(image[state.waveRemaining], 0);
  image[ENEMY_ACTIVE] = 0;
  image[LIGHT_STATE + 1] = LIGHT_FREE;          // its escort outlives it
  tick(image, 4);
  assert.equal(image[state.waveCursor], 1, "an escort Light counts: the field is not clear");
  image[LIGHT_STATE + 1] = 0;
  tick(image);
  assert.equal(image[state.waveCursor], 2, "armed on the first row tick after the field clears");
  assert.equal(image[state.waveRemaining], 1);
  assert.equal(image[at("heavy_archetype_offset")], 36, "and it is the Bomber wave");

  // The row stays the minimum: a field cleared early does not arm it early.
  const early = level([elite(160, [heavyWave(0), heavyWave(16, "bomber", { afterCleared: true })]), elite(64)]);
  admitFormation(early);
  early[ENEMY_ACTIVE] = 0;
  tick(early, 15);
  assert.equal(early[state.waveCursor], 1, "a clear field before row 16 does not arm the wave");
  tick(early);
  assert.equal(early[state.waveCursor], 2, "it arms on its row");
});

test("afterCleared: a wave without the flag arms on its row under a live formation, as before", () => {
  const image = level([elite(160, [heavyWave(0), heavyWave(8, "bomber")]), elite(64)]);
  admitFormation(image);
  tick(image, 8);
  assert.equal(image[state.waveCursor], 2, "armed on row 8 with the Raider pair still live");
});

test("C1: a live Heavy formation holds an elite sector's end before a swarm, and lets go when it has gone", () => {
  const image = level([elite(32, [heavyWave(0)]), swarm(64, [lightWave(0)])]);
  admitFormation(image);
  tick(image, 32);
  assert.equal(image[state.sector], 0, "the row count is reached with a Heavy live: held");
  assert.equal(image[LIGHT_WAVE_LOCK], 0, "and the swarm's wave has not armed");
  tick(image, 40);
  assert.equal(image[state.sector], 0, "held for as long as the formation lives");
  image[ENEMY_ACTIVE] = 2;                      // exploding is still a Heavy on screen
  tick(image);
  assert.equal(image[state.sector], 0, "an exploding formation still holds");
  image[ENEMY_ACTIVE] = 0;
  tick(image);
  assert.equal(image[state.sector], 1, "released on the first row tick after it has gone");
  assert.equal(image[LIGHT_WAVE_LOCK], 1, "and the swarm opens with its row-0 wave");
});

test("C1: two swarm Lights hold the end before an elite sector; one is within its ceiling", () => {
  const image = level([swarm(32, [lightWave(0)]), elite(64, [heavyWave(0)])]);
  image[LIGHT_WAVE_REMAINING] = 1;              // a member still to admit at the cut
  for (let slot = 0; slot < 2; slot += 1) image[LIGHT_STATE + slot] = LIGHT_FREE;
  tick(image, 32);
  assert.equal(image[state.sector], 0, "two Lights live against the elite's ceiling of one: held");
  assert.equal(image[LIGHT_WAVE_REMAINING], 0, "the cut cancels the members not yet admitted");
  tick(image, 8);
  assert.equal(image[state.sector], 0);
  image[LIGHT_STATE + 0] = 0;
  image[LIGHT_WAVE_LOCK] = 1;                   // the lock still up: the cut does not wait for it
  tick(image);
  assert.equal(image[state.sector], 1, "one Light fits the elite ceiling: released");
});

test("C1: no hold where the next sector admits the population (elite after elite)", () => {
  const image = level([elite(32, [heavyWave(0)]), elite(64, [heavyWave(0, "bomber")])]);
  admitFormation(image);
  image[LIGHT_STATE + 3] = LIGHT_FREE;
  tick(image, 32);
  assert.equal(image[state.sector], 1, "a pair and one Light are legal in an elite sector");
});

test("C1: no hold before a capital - its entry waits for the drain itself", () => {
  const image = level([elite(32, [heavyWave(0)]), capital, elite(64)]);
  admitFormation(image);
  tick(image, 32);
  assert.equal(image[state.sector], 1, "the capital is entered on the row count");
  assert.notEqual(image[state.flags] & FLAG_CAPITAL_DUE, 0, "and raises CAPITAL_DUE as before");
});

test("C1: the last sector's cut still completes the level", () => {
  const image = level([elite(32, [heavyWave(0)])]);
  admitFormation(image);
  tick(image, 32);
  assert.equal(image[state.flags] & FLAG_COMPLETE, FLAG_COMPLETE);
});

// The level-1 effect on the timeline probe (scripts/level-timeline.mjs, its
// fixed kill policy): MEASURED on main 5e68875's default build, the boss sector
// was entered at frames 4,201 / 3,735 / 3,361 (EASY / MEDIUM / HARD).
const MAIN_BOSS_ENTRY = [4201, 3735, 3361];
test("level 1: the time to the boss falls on every difficulty", () => {
  for (const difficulty of [0, 1, 2]) {
    const run = captureTimeline({ buildDirectory: path.join(root, "build"), difficulty, frames: 7000 });
    assert.ok(run.bossEntryFrame, `difficulty ${difficulty}: the level never reached the boss`);
    assert.ok(run.bossEntryFrame.frame < MAIN_BOSS_ENTRY[difficulty],
      `difficulty ${difficulty}: the boss at frame ${run.bossEntryFrame.frame}, ` +
      `main ${MAIN_BOSS_ENTRY[difficulty]}`);
  }
});
