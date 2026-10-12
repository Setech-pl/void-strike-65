// feat/interceptor-standoff, the top-hold loop (the owner's smoke of
// 2026-10-11 and answers L1-L5 / E1 of 2026-10-12, decision AK points 9-10,
// docs/plans/interceptor-standoff.md §12-§13): an Interceptor of a wave that
// authors loops does not leave after its 100-frame standoff. It climbs to its
// top-hold row - y 32 for slot 0, two rows lower per slot, on screen (a Light
// is drawn from y 24) - holds there without firing, dives back to its
// standoff and flies it again; after the last loop it climbs out upward
// exactly as R does. Level 1's swarm and elite (a) Interceptors loop twice;
// the boss escort keeps 0 loops and R's single pass (life <= 121 frames).
//
// The machine is the 6502 harness on the built runtime (as
// tests/interceptor-standoff.test.mjs), the loop count from the armed wave's
// flags exactly as light_admit reads it. RED on 8950956 (no loop: every
// Interceptor climbs out after one standoff, and level 1 authors no loops),
// GREEN after.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
import { compileLevel, compileLevelFile, levelSourcePath, loadLevelSource } from "../scripts/level-compiler.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const labels = new Map();
for (const file of ["build/void-strike-65.lbl", "build/encounter-director.lbl",
  "build/integration-glue.lbl", "build/light-kernel.lbl"]) {
  for (const line of fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) labels.set(match[2], Number.parseInt(match[1], 16));
  }
}
const L = (name) => {
  const address = labels.get(name);
  assert.ok(Number.isInteger(address), `missing label ${name}`);
  return address;
};

const OFFSET_INTERCEPTOR = 24;
const LASER = 2;
const LIGHT_TOP = 24;          // ENTITY_GAMEPLAY_TOP: the first drawn line
const TOP_HOLD = 32;           // slot 0's hold row; +16 a slot
const SLOT_ROWS = 16;
const ESCORT_FLOOR = 128;      // scripts/boss-assets.mjs: baseFrames >= 128
const loopFlags = (loops) => loops << 6;   // wave_flags bits 6-7

function run(image, target, a = 0) {
  const cpu = new Nmos6502(image);
  cpu.a = a;
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = L(target);
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) {
    assert.notEqual(image[cpu.pc], 0, `${target} reached BRK at $${cpu.pc.toString(16)}`);
    cpu.step();
  }
  assert.equal(cpu.pc, stop, `${target} did not return`);
  return { a: cpu.a };
}

function game() {
  const image = new Uint8Array(0x10000);
  installRuntimeSegments(image, root);
  for (let row = 0; row < 27; row += 1) {
    const address = 0x8140 + row * 40;
    image[L("PLAYFIELD_ROW_LO") + row] = address & 0xff;
    image[L("PLAYFIELD_ROW_HI") + row] = address >> 8;
  }
  image[L("DIFFICULTY_SETTING")] = 1;
  run(image, "director_init", 0x6d);
  return image;
}

// Interceptors admitted the way a Heavy wave admits its escort, under the
// armed wave's flags; `slots` more copy slot 0 (a swarm arriving together).
function admit(image, flags, slots = 1) {
  image[L("_heavy_wave_flags")] = flags;
  image[L("_heavy_escort_offset")] = OFFSET_INTERCEPTOR;
  image[L("frame_counter")] = (image[L("frame_counter")] + 1) & 0xff;
  run(image, "enemy_spawn_raiders");
  assert.equal(image[L("light_state")], 2, "the Interceptor is born free-flying");
  for (let slot = 1; slot < slots; slot += 1) {
    for (const array of ["light_state", "light_hp", "light_x", "light_y", "light_fire_timer",
      "_light_burst_left", "light_archetype_offset", "_light_loops"]) {
      image[L(array) + slot] = image[L(array)];
    }
  }
  image[L("_light_slot_limit")] = Math.max(image[L("_light_slot_limit")], slots);
}

// Flies the admitted slots with the player parked low in their column until
// all retire; per slot, the y and tick result of every live frame.
function fly(image, slots = 1) {
  image[L("player_x")] = 124;
  image[L("player_y")] = 190;
  const lives = Array.from({ length: slots }, () => []);
  for (let f = 0; f < 900; f += 1) {
    image[L("frame_counter")] = (image[L("frame_counter")] + 1) & 0xff;
    let live = 0;
    for (let slot = 0; slot < slots; slot += 1) {
      if (image[L("light_state") + slot] === 0) continue;
      image[L("_light_slot")] = slot;
      const { a } = run(image, "enemy_light_tick");
      if (image[L("light_state") + slot] === 0) continue;
      live += 1;
      lives[slot].push({ y: image[L("light_y") + slot], result: a });
    }
    if (live === 0) return lives;
  }
  assert.fail("an Interceptor was still live after 900 frames");
}

// Runs of at least 8 frames at one y on the top rows: the holds.
function holds(life) {
  const runs = [];
  for (let i = 0; i < life.length; i += 1) {
    const last = runs.at(-1);
    if (last !== undefined && last.end === i - 1 && life[i].y === last.y) last.end = i;
    else runs.push({ y: life[i].y, start: i, end: i });
  }
  return runs.filter(({ y, start, end }) => y < 96 && end - start + 1 >= 8);
}

test("the loop count comes from the wave's data: level 1's swarm and elite Interceptors loop twice, the boss escort 0", () => {
  const compiled = compileLevelFile(levelSourcePath(1));
  const interceptorWaves = compiled.waves.filter(({ archetype, escort }) =>
    archetype === "interceptor" || escort === "interceptor");
  const bySector = Object.fromEntries(interceptorWaves.map((wave) => [wave.sector, wave]));
  for (const sector of [3, 4]) {
    assert.equal(bySector[sector]?.loops, 2, `sector ${sector}'s Interceptor wave loops ${bySector[sector]?.loops}`);
    assert.equal(bySector[sector].flags >> 6, 2, `sector ${sector}'s wave_flags bits 6-7`);
  }
  const boss = compiled.waves.filter(({ sector }) => sector === Math.max(...compiled.waves.map((w) => w.sector)));
  assert.equal(boss.length, 1);
  assert.equal(boss[0].loops, 0, "the boss escort's wave loops");
  assert.equal(boss[0].flags >> 6, 0);

  // Only an Interceptor loops, and at most three times.
  const source = loadLevelSource(levelSourcePath(1));
  const wingman = structuredClone(source);
  wingman.sectors.find(({ subtype }) => subtype === "swarm").waves[0].loops = 1;
  assert.throws(() => compileLevel(wingman), /only an Interceptor loops/);
  const four = structuredClone(source);
  four.sectors.find(({ subtype }) => subtype === "swarm").waves[1].loops = 4;
  assert.throws(() => compileLevel(four), /loops/);
});

test("the tick loops as many times as the armed wave's flags say: 0, 1, 2 holds at the top", () => {
  for (const loops of [0, 1, 2, 3]) {
    const image = game();
    admit(image, loopFlags(loops));
    const [life] = fly(image);
    assert.equal(holds(life).length, loops, `${loops} loop(s): ${holds(life).length} holds`);
  }
});

test("the top-hold rows are on screen, apart per slot, and nothing is fired on the way up or in the hold", () => {
  const image = game();
  admit(image, loopFlags(2), 3);
  const lives = fly(image, 3);
  lives.forEach((life, slot) => {
    const runs = holds(life);
    assert.equal(runs.length, 2, `slot ${slot}: ${runs.length} holds`);
    for (const { y, start, end } of runs) {
      assert.equal(y, TOP_HOLD + slot * SLOT_ROWS, `slot ${slot} holds at y ${y}`);
      assert.ok(y >= LIGHT_TOP, `slot ${slot}'s hold row ${y} is off screen`);
      assert.ok(end - start + 1 >= 20, `slot ${slot}: a hold of ${end - start + 1} frames`);
    }
    // From the end of each standoff (frame 100 of the loop) to the end of the
    // hold: climbing or holding, never firing.
    for (const { start, end } of runs) {
      let i = start;
      while (i > 0 && life[i - 1].y > life[i].y) i -= 1;
      for (let k = i; k <= end; k += 1) {
        assert.notEqual(life[k].result, LASER, `slot ${slot}: fired at life frame ${k} on the way up or in the hold`);
      }
    }
  });
});

test("after its two loops it climbs out upward, as R does, and its slot is freed", () => {
  const image = game();
  admit(image, loopFlags(2));
  const [life] = fly(image);
  const runs = holds(life);
  assert.equal(runs.length, 2);
  // After the second hold: the dive back and the standoff, then only up.
  const after = life.slice(runs[1].end + 1);
  // The last frame of the final standoff (its lowest point; it holds there).
  const lowest = after.reduce((best, { y }, i) => (y >= after[best].y ? i : best), 0);
  const exit = after.slice(lowest);
  assert.ok(exit.length >= 2, "no climb out after the last standoff");
  for (let i = 1; i < exit.length; i += 1) {
    assert.ok(exit[i].y < exit[i - 1].y, `after the last loop it moved ${exit[i - 1].y} -> ${exit[i].y}: not up`);
  }
  assert.ok(exit.at(-1).y < LIGHT_TOP, `it left from y ${exit.at(-1).y}, not off the top`);
  assert.equal(image[L("light_state")], 0, "the slot is not freed");
  // 100 + 2 x 139 frames of loops, then the climb out from the standoff.
  assert.ok(life.length > 100 + 2 * 139 && life.length < 100 + 3 * 139,
    `a life of ${life.length} frames`);
});

test("the boss escort is unchanged: 0 loops from its wave, one pass, out inside the escort clock's floor", () => {
  const compiled = compileLevelFile(levelSourcePath(1));
  const escortFlags = compiled.waves.at(-1).flags;
  const image = game();
  admit(image, escortFlags);
  const [life] = fly(image);
  assert.equal(holds(life).length, 0, "the escort held at the top");
  assert.ok(life.length > 100 && life.length < ESCORT_FLOOR, `an escort life of ${life.length} frames`);
});
