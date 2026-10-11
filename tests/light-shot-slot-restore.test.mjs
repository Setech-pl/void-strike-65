// feat/interceptor-standoff, owner answer Q4 (2026-10-11, plan §8.1): a
// lethal debris shot must hand the PairShot loop its slot index back.
//
// update_fighter_projectiles walks the player's PairShot slots in X and calls
// the Light kernel's light_shot for each one. light_shot used to end
// `ldx LIGHT_SLOT_SAVE / jmp entity_player_fighter_projectile_target`, so the
// old target path returned straight into the loop - and its lethal debris
// branch (spawn_debris_destruction_effects, integration_debris_release,
// debris_shot_reward) loads X. The loop then went on from a garbage index: a
// higher slot skipped its move for a frame, and the summary's shot counter
// (stats_scan) saw its lifetime $FF twice and counted the shot twice - the
// level-end stats clause failed by one shot on R's boss-aim-0 (626 vs 625).
// Both tests below were RED on main.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";

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

const PLAYER_ALIVE = 0;
const DEBRIS_X = 124;
const DEBRIS_Y = 100;

function run(image, target, { x = 0 } = {}) {
  const cpu = new Nmos6502(image);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = L(target);
  cpu.x = x;
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) {
    assert.notEqual(image[cpu.pc], 0, `${target} reached BRK at $${cpu.pc.toString(16)}`);
    cpu.step();
  }
  assert.equal(cpu.pc, stop, `${target} did not return`);
  return { x: cpu.x, carry: (cpu.p & 0x01) !== 0 };
}

// One shootable debris piece with one hit point left, no Light live.
function armedImage() {
  const image = new Uint8Array(0x10000);
  installRuntimeSegments(image, root);
  for (let row = 0; row < 27; row += 1) {
    const address = 0x8140 + row * 40;
    image[L("PLAYFIELD_ROW_LO") + row] = address & 0xff;
    image[L("PLAYFIELD_ROW_HI") + row] = address >> 8;
  }
  image[L("PLAYER_LIFECYCLE")] = PLAYER_ALIVE;
  image[L("_light_slot_limit")] = 0;
  image[L("ENTITY_ACTIVE_MASK")] = 1;
  image[L("ENTITY_TYPE")] = 1;
  image[L("ENTITY_STATE")] = 1;
  image[L("ENTITY_FLAGS")] = 0x3f;
  image[L("ENTITY_X")] = DEBRIS_X;
  image[L("ENTITY_Y")] = DEBRIS_Y;
  image[L("ENTITY_HP")] = 1;
  return image;
}

function shot(image, slot, { x, y, lifetime = 40 }) {
  image[L("FIGHTER_PROJECTILE_ACTIVE") + slot] = 1;
  image[L("FIGHTER_PROJECTILE_X") + slot] = x;
  image[L("FIGHTER_PROJECTILE_Y") + slot] = y;
  image[L("FIGHTER_PROJECTILE_PREV_Y") + slot] = y;
  image[L("FIGHTER_PROJECTILE_LIFETIME") + slot] = lifetime;
}

test("light_shot returns the caller's PairShot slot in X after a lethal debris hit", () => {
  for (const slot of [0, 1, 3]) {
    const image = armedImage();
    shot(image, slot, { x: DEBRIS_X + 2, y: DEBRIS_Y + 2 });
    const result = run(image, "light_shot", { x: slot });
    assert.equal(image[L("ENTITY_ACTIVE_MASK")] & 1, 0, "the shot must destroy the debris");
    assert.equal(result.carry, false, "the debris consumes the shot (carry clear)");
    assert.equal(result.x, slot, `slot ${slot}: X must come back as the caller's slot`);
  }
});

test("a lethal debris shot in slot 0 leaves the next PairShot's move intact", () => {
  const image = armedImage();
  shot(image, 0, { x: DEBRIS_X + 2, y: DEBRIS_Y + 6 });
  shot(image, 1, { x: 60, y: 150, lifetime: 30 });
  run(image, "update_fighter_projectiles");
  assert.equal(image[L("ENTITY_ACTIVE_MASK")] & 1, 0, "slot 0's shot must destroy the debris");
  assert.equal(image[L("FIGHTER_PROJECTILE_ACTIVE")], 0, "slot 0's shot is consumed");
  assert.equal(image[L("FIGHTER_PROJECTILE_LIFETIME") + 1], 29,
    "slot 1's lifetime must step exactly once this frame");
  assert.ok(image[L("FIGHTER_PROJECTILE_Y") + 1] < 150, "slot 1's shot must move up this frame");
  assert.equal(image[L("FIGHTER_PROJECTILE_PREV_Y") + 1], 150);
});
