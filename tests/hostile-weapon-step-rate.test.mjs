import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";

// Roadmap 4.5b: per-weapon_class movement rate. Every hostile class moves the
// shared 2-scanline step; BOMBER (3) takes that step only on even frames.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const asset = JSON.parse(fs.readFileSync(path.join(root, "assets/graphics/fighter-weapons.json"), "utf8"));
const include = fs.readFileSync(path.join(root, "build/fighter-weapons.inc"), "utf8");
const mainSource = fs.readFileSync(path.join(root, "src/main.s"), "utf8");

const labels = new Map();
for (const line of fs.readFileSync(path.join(root, "build/void-strike-65.lbl"), "utf8").split(/\r?\n/)) {
  const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
  if (match) labels.set(match[2], Number.parseInt(match[1], 16));
}
const L = (name) => {
  const address = labels.get(name);
  assert.ok(Number.isInteger(address), `missing label ${name}`);
  return address;
};
const constant = (name) => {
  const match = new RegExp(`^${name} = (\\d+)$`, "m").exec(include);
  assert.ok(match, `missing generated constant ${name}`);
  return Number(match[1]);
};

const PULSE = 1;
const LASER = 2;
const BOMBER = 3;
const BASE = constant("INTERCEPTOR_PROJECTILE_SLOT_BASE");
const SLOTS = constant("FIGHTER_PROJECTILE_SLOT_COUNT");
const SPEED = constant("INTERCEPTOR_PROJECTILE_SPEED");
const HEIGHT = constant("INTERCEPTOR_PROJECTILE_HEIGHT");
const LIFETIME = constant("INTERCEPTOR_PROJECTILE_LIFETIME");
const TOP = constant("GAMEPLAY_TOP");
const BOTTOM = constant("GAMEPLAY_BOTTOM");
const ACTIVE = L("FIGHTER_PROJECTILE_ACTIVE");
const Y = L("FIGHTER_PROJECTILE_Y");
const PREV_Y = L("FIGHTER_PROJECTILE_PREV_Y");
const X = L("FIGHTER_PROJECTILE_X");
const LIFE = L("FIGHTER_PROJECTILE_LIFETIME");
// Owner bits 0-2 (hostile bit 1, emitter bit 0) | weapon_class << 3.
const activeFor = (weaponClass) => 0x02 | (weaponClass << 3);

function image() {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, root);
  memory.fill(0, ACTIVE, ACTIVE + SLOTS);
  memory[L("player_x")] = 200;           // far from every test shot unless a case moves it
  memory[L("player_y")] = 200;
  memory[L("PLAYER_LIFECYCLE")] = 0;     // PLAYER_ALIVE
  memory[L("BROAD_DAMAGE_COOLDOWN")] = 0;
  memory[L("BROAD_DAMAGE_APPLIED")] = 0;
  memory[L("ENTITY_STATE") + 2] = 0;     // WEAPON_BOOSTER_SLOT (entity-effects.inc): no Shield
  return memory;
}

function spawn(memory, slot, weaponClass, { x = 60, y = 100, lifetime = LIFETIME } = {}) {
  memory[ACTIVE + slot] = activeFor(weaponClass);
  memory[X + slot] = x;
  memory[Y + slot] = y;
  memory[PREV_Y + slot] = y;
  memory[LIFE + slot] = lifetime;
}

// One gameplay frame of the update, as main_loop sees it: frame_counter is the
// value after its inc. Returns the slots whose collision sweep executed.
function frame(memory, counter) {
  memory[L("frame_counter")] = counter & 0xff;
  const sweep = L("interceptor_projectile_hits_player");
  const swept = [];
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = L("update_fighter_projectiles");
  for (let steps = 0; steps < 100_000 && cpu.pc !== stop; steps += 1) {
    if (cpu.pc === sweep) swept.push(cpu.x);
    cpu.step();
  }
  assert.equal(cpu.pc, stop, "update_fighter_projectiles did not return");
  return { swept, cycles: cpu.cycles };
}

const snapshot = (memory, slot) => ({
  active: memory[ACTIVE + slot], y: memory[Y + slot],
  prevY: memory[PREV_Y + slot], lifetime: memory[LIFE + slot],
});

test("authored step periods: PULSE and LASER every frame, BOMBER every second frame", () => {
  assert.deepEqual(asset.hostileWeaponVisuals.classes.map((entry) => [entry.id, entry.stepPeriodFrames]),
    [["PULSE", 1], ["LASER", 1], ["BOMBER", 2]]);
  const masks = L("hostile_weapon_step_masks");
  const memory = image();
  assert.deepEqual([...memory.subarray(masks, masks + 3)], [0, 0, 1]);
  assert.match(mainSource,
    /@interceptor_slot:\s+lda FIGHTER_PROJECTILE_ACTIVE,x\s+beq @interceptor_next[\s\S]+?lsr\s+lsr\s+lsr\s+tay[^\n]*\s+lda frame_counter\s+and hostile_weapon_step_masks-1,y\s+bne @interceptor_next\s+dec FIGHTER_PROJECTILE_LIFETIME,x/,
    "the class gate precedes the lifetime, Y and collision work");
});

test("BOMBER skipped frames freeze Y, PREV_Y and lifetime and run no sweep; active frames step exactly 2 lines", () => {
  const memory = image();
  const [pulse, laser, bomber] = [BASE, BASE + 1, BASE + 2];
  spawn(memory, pulse, PULSE, { y: 60 });
  spawn(memory, laser, LASER, { y: 60 });
  spawn(memory, bomber, BOMBER, { y: 60 });
  const frames = 40;
  for (let counter = 1; counter <= frames; counter += 1) {
    const before = [pulse, laser, bomber].map((slot) => snapshot(memory, slot));
    const { swept } = frame(memory, counter);
    const after = [pulse, laser, bomber].map((slot) => snapshot(memory, slot));
    for (const index of [0, 1]) {
      assert.equal(after[index].y, before[index].y + SPEED, `PULSE/LASER step every frame (${counter})`);
      assert.equal(after[index].prevY, before[index].y);
      assert.equal(after[index].lifetime, before[index].lifetime - 1);
    }
    assert.ok(swept.includes(pulse) && swept.includes(laser));
    if (counter & 1) {
      assert.deepEqual(after[2], before[2], `skipped frame ${counter}: BOMBER state untouched`);
      assert.equal(swept.includes(bomber), false, `skipped frame ${counter}: no BOMBER sweep`);
    } else {
      assert.equal(after[2].y, before[2].y + SPEED, `active frame ${counter}: exactly 2 lines`);
      assert.equal(after[2].prevY, before[2].y);
      assert.equal(after[2].lifetime, before[2].lifetime - 1);
      assert.equal(swept.filter((slot) => slot === bomber).length, 1, `active frame ${counter}: one sweep`);
    }
  }
  assert.equal(memory[Y + pulse] - 60, frames * SPEED);
  assert.equal(memory[Y + bomber] - 60, frames / 2 * SPEED, "effective 1 scanline/frame");
  assert.equal(LIFETIME - memory[LIFE + bomber], frames / 2, "lifetime counts steps, not frames");
});

test("total effective travel: a BOMBER covers the same distance as a PULSE in twice the frames", () => {
  const travel = (weaponClass, lifetime, startY) => {
    const memory = image();
    spawn(memory, BASE, weaponClass, { y: startY, lifetime });
    let lastY = startY;
    let counter = 0;
    let steps = 0;
    while (memory[ACTIVE + BASE] !== 0) {
      counter += 1;
      assert.ok(counter < 1000, "shot never expired");
      const yBefore = memory[Y + BASE];
      frame(memory, counter);
      if (memory[ACTIVE + BASE] !== 0) {
        lastY = memory[Y + BASE];
        if (lastY !== yBefore) steps += 1;
      }
    }
    return { lastY, frames: counter, steps };
  };
  // Lifetime governs: a full-lifetime shot from the top expires mid-screen.
  const lifePulse = travel(PULSE, LIFETIME, TOP);
  const lifeBomber = travel(BOMBER, LIFETIME, TOP);
  assert.equal(lifePulse.lastY - TOP, (LIFETIME - 1) * SPEED);
  assert.equal(lifeBomber.lastY, lifePulse.lastY, "same travel for the same lifetime");
  assert.equal(lifeBomber.steps, LIFETIME - 1);
  assert.equal(lifeBomber.steps, lifePulse.steps);
  assert.equal(lifePulse.frames, LIFETIME);
  assert.equal(lifeBomber.frames, LIFETIME * 2, "twice the frames (steps on even frames)");
  // Bottom edge governs: both stop at the same last cell inside the viewport.
  const edgePulse = travel(PULSE, LIFETIME, 100);
  const edgeBomber = travel(BOMBER, LIFETIME, 100);
  assert.equal(edgeBomber.lastY, edgePulse.lastY);
  assert.equal(edgeBomber.steps, edgePulse.steps);
  assert.ok(edgePulse.lastY + HEIGHT <= BOTTOM && edgePulse.lastY + SPEED + HEIGHT > BOTTOM,
    `last Y ${edgePulse.lastY}: inside the viewport, next step past it`);
  assert.ok(edgePulse.steps < LIFETIME - 1, "the bottom test, not the lifetime, freed it");
});

test("a BOMBER resting on the player during a skipped frame hits on the next active step", () => {
  const memory = image();
  memory[L("player_x")] = 100;
  memory[L("player_y")] = 150;
  spawn(memory, BASE, BOMBER, { x: 102, y: 150 });
  const skipped = frame(memory, 1);
  assert.deepEqual(skipped.swept, []);
  assert.equal(memory[ACTIVE + BASE], activeFor(BOMBER), "no hit on a skipped frame");
  assert.equal(memory[L("BROAD_DAMAGE_APPLIED")], 0);
  const active = frame(memory, 2);
  assert.deepEqual(active.swept, [BASE]);
  assert.equal(memory[ACTIVE + BASE], 0, "hit frees the shot");
  assert.equal(memory[L("BROAD_DAMAGE_APPLIED")], 1, "damage applied through the unchanged path");
});

test("PULSE behaviour is unchanged: bottom exit, lifetime expiry and hit", () => {
  // Bottom: the last step whose cell still fits is taken, the next one frees.
  const bottom = image();
  const limit = BOTTOM + 1 - SPEED - HEIGHT;
  spawn(bottom, BASE, PULSE, { y: limit - 1 });
  frame(bottom, 1);
  assert.equal(bottom[Y + BASE], limit - 1 + SPEED);
  assert.equal(bottom[ACTIVE + BASE], activeFor(PULSE));
  frame(bottom, 2);
  assert.equal(bottom[ACTIVE + BASE], 0, "Y + speed + height past the viewport frees");
  // Lifetime: 1 frees on the next update without moving.
  const expiry = image();
  spawn(expiry, BASE, PULSE, { lifetime: 1 });
  frame(expiry, 1);
  assert.equal(expiry[ACTIVE + BASE], 0);
  // Hit on the very first frame, identical to 4.5a.
  const hit = image();
  hit[L("player_x")] = 100;
  hit[L("player_y")] = 150;
  spawn(hit, BASE, PULSE, { x: 102, y: 150 });
  frame(hit, 1);
  assert.equal(hit[ACTIVE + BASE], 0);
  assert.equal(hit[L("BROAD_DAMAGE_APPLIED")], 1);
});

test("update cost: BOMBER skipped frame is cheaper than a step; step cost bounded", () => {
  const cost = (weaponClass, counter) => {
    const memory = image();
    for (let slot = BASE; slot < SLOTS; slot += 1) spawn(memory, slot, weaponClass, { x: 20 + slot * 8 });
    return frame(memory, counter).cycles;
  };
  const pulse = cost(PULSE, 1);
  const bomberSkip = cost(BOMBER, 1);
  const bomberStep = cost(BOMBER, 2);
  assert.equal(bomberStep, cost(PULSE, 2), "a BOMBER step costs exactly a PULSE step");
  assert.ok(bomberSkip < pulse, `skip ${bomberSkip} < step ${pulse}`);
  // Report for the checkpoint notes.
  test.diagnostic?.(`5 hostile slots: PULSE ${pulse}, BOMBER skip ${bomberSkip}, BOMBER step ${bomberStep} cycles`);
  console.log(`hostile update, 5 slots: PULSE ${pulse}, BOMBER skip ${bomberSkip}, BOMBER step ${bomberStep} cycles`);
});
