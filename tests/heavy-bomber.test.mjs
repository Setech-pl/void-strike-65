import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";

// Roadmap 4.5c: the Bomber is the second Heavy archetype on P1/P2. C owns its
// record, the temporary Heavy smoke schedule, the lane-sweep tick and the fire
// decision; ASM marshals the member bytes, emits the returned weapon_class and
// writes the formation hull colour to COLPM1/COLPM2.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lifecycleSource = fs.readFileSync(path.join(root, "src/c/lifecycle.c"), "utf8");
const memberSource = fs.readFileSync(path.join(root, "src/hybrid/heavy-member.s"), "utf8");

const labels = new Map();
for (const file of ["build/void-strike-65.lbl", "build/encounter-director.lbl",
  "build/integration-glue.lbl"]) {
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

const FRAME_COUNTER = 0x86;
const PLAYER_LIFECYCLE = 0x4eaa;
const DIRECTOR_STATE_FLAGS = 0x80fe;
const COLPM1 = 0xd013;
const COLPM2 = 0xd014;
const OFFSET_RAIDER = 0;
const OFFSET_BOMBER = 36;
const ROSTER_SHAPE_BOMBER = 2;
const WEAPON_BOMBER = 3;
const LANES = [[48, 92], [132, 176]];
const ENTRY_DEPTH = [40, 16];
const FIELDS = ["ENEMY_X", "ENEMY_Y", "ENEMY_VELOCITY_X", "ENEMY_MOVE_ACCUMULATOR",
  "ENEMY_MANEUVER_STATE"];

function memory() {
  const image = new Uint8Array(0x10000);
  installRuntimeSegments(image, root);
  for (let row = 0; row < 27; row += 1) {
    const address = 0x8140 + row * 40;
    image[L("PLAYFIELD_ROW_LO") + row] = address & 0xff;
    image[L("PLAYFIELD_ROW_HI") + row] = address >> 8;
  }
  return image;
}

function run(image, target, { a = 0, x = 0, y = 0 } = {}) {
  const cpu = new Nmos6502(image);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = L(target);
  cpu.a = a;
  cpu.x = x;
  cpu.y = y;
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) {
    assert.notEqual(image[cpu.pc], 0, `${target} reached BRK at $${cpu.pc.toString(16)}`);
    cpu.step();
  }
  assert.equal(cpu.pc, stop, `${target} did not return`);
  return { a: cpu.a, cycles: cpu.cycles };
}

function game(difficulty = 2) {
  const image = memory();
  image[L("DIFFICULTY_SETTING")] = difficulty;
  run(image, "director_init", { a: 0x6d });
  return image;
}

// A fresh game's first formation is the Raider; the second is the Bomber.
function bomberFormation(difficulty = 2) {
  const image = game(difficulty);
  image[L("_encounter_heavy_index")] = 1;
  run(image, "enemy_spawn_raiders");
  return image;
}

const member = (image, slot) => FIELDS.map((field) => image[L(field) + slot]);

function setMember(image, slot, [x, y, direction, fire, turn]) {
  for (const [index, value] of [x, y, direction, fire, turn].entries())
    image[L(FIELDS[index]) + slot] = value;
}

function tickMember(image, slot) {
  image[L("ENEMY_TARGET_SLOT")] = slot;
  return run(image, "heavy_member_update", { x: slot });
}

test("Bomber is the fourth 12-byte C record: 4 HP, lane sweep, single shot, BOMBER class", () => {
  const table = L("enemy_archetype_table");
  const image = memory();
  assert.deepEqual([...image.subarray(table + OFFSET_BOMBER, table + OFFSET_BOMBER + 12)],
    [4, 3, 2, 1, 0, 80, 64, 48, 1, WEAPON_BOMBER, 0x50, 1]);
  assert.deepEqual([...image.subarray(table, table + 12)],
    [1, 0, 1, 5, 15, 60, 50, 40, 1, 1, 0x10, 1], "the Raider record is unchanged");
});

test("the temporary Heavy schedule alternates Raider and Bomber formations with their hull colours", () => {
  const image = game();
  const formations = [];
  for (let index = 0; index < 4; index += 1) {
    image[COLPM1] = 0;
    image[COLPM2] = 0;
    run(image, "enemy_spawn_raiders");
    formations.push([image[L("heavy_archetype_offset")], image[L("ENEMY_ARCHETYPE")],
      image[COLPM1], image[COLPM2], image[L("ENEMY_HP")], image[L("ENEMY_HP") + 1]]);
    image[L("light_state")] = 0;
  }
  assert.deepEqual(formations, [
    [OFFSET_RAIDER, 0, 0x44, 0x44, 1, 1],
    [OFFSET_BOMBER, ROSTER_SHAPE_BOMBER, 0x24, 0x24, 4, 4],
    [OFFSET_RAIDER, 0, 0x44, 0x44, 1, 1],
    [OFFSET_BOMBER, ROSTER_SHAPE_BOMBER, 0x24, 0x24, 4, 4],
  ]);
});

test("Bomber admission publishes its profile and the lane-sweep formation start", () => {
  for (const [difficulty, pause] of [[0, 80], [1, 64], [2, 48]]) {
    const image = bomberFormation(difficulty);
    assert.deepEqual([image[L("ENEMY_ACTIVE")], image[L("ENEMY_LIVE_COUNT")],
      image[L("ENEMY_MEMBER_STATE")], image[L("ENEMY_MEMBER_STATE") + 1]], [1, 2, 1, 1]);
    assert.equal(image[L("enemy_profile_movement_id")], 3);
    assert.equal(image[L("enemy_profile_weapon_class")], WEAPON_BOMBER);
    assert.equal(image[L("enemy_profile_score_bcd")], 0x50);
    assert.equal(image[L("enemy_profile_post_burst_frames")], pause);
    // Slot 0 enters left moving right; slot 1 mirrored and fires 24 frames later.
    assert.deepEqual(member(image, 0), [48, 0, 1, 48, 60]);
    assert.deepEqual(member(image, 1), [176, 0, 0xff, 72, 52]);
  }
});

test("escort column: the Bomber formation admits no Light and does not advance the Light schedule", () => {
  const image = game();
  image[L("_encounter_heavy_index")] = 1;
  const lightIndex = image[L("_encounter_light_index")];
  run(image, "enemy_spawn_raiders");
  assert.equal(image[L("light_state")], 0);
  assert.equal(image[L("_encounter_light_index")], lightIndex);
  run(image, "enemy_spawn_raiders");                // Raider formation
  assert.equal(image[L("light_state")], 1);
  assert.equal(image[L("_encounter_heavy_index")], 1);
});

test("recycle restores the Raider hull colour for the capital broadside missiles", () => {
  const image = bomberFormation();
  assert.deepEqual([image[COLPM1], image[COLPM2]], [0x24, 0x24]);
  run(image, "enemy_recycle");
  assert.equal(image[L("ENEMY_ACTIVE")], 0);
  assert.equal(image[L("heavy_hull_colour")], 0x44);
  assert.deepEqual([image[COLPM1], image[COLPM2]], [0x44, 0x44]);
});

test("marshalling: the member veneer ticks exactly its own slot bytes", () => {
  const image = bomberFormation();
  image[FRAME_COUNTER] = 0;
  const other = member(image, 1);
  tickMember(image, 0);
  assert.deepEqual(member(image, 0), [49, 1, 1, 47, 59]);
  assert.deepEqual(member(image, 1), other, "slot 1 untouched");
  image[FRAME_COUNTER] = 1;
  tickMember(image, 1);
  assert.deepEqual(member(image, 1), [175, 1, 0xff, 71, 51]);
  assert.deepEqual(member(image, 0), [49, 1, 1, 47, 59], "slot 0 untouched");
  // Raider formations keep the ASM cross-pursuit motion.
  assert.match(memberSource,
    /heavy_member_update:\s+lda ENEMY_PROFILE_MOVEMENT_ID\s+bne @policy\s+jmp update_enemy_slot_motion/);
});

test("entry depth: one line per frame to 40/16, then one line every other frame, de-phased", () => {
  const image = bomberFormation();
  const ys = [[], []];
  for (let frame = 0; frame < 120; frame += 1) {
    image[FRAME_COUNTER] = frame & 0xff;
    for (const slot of [0, 1]) {
      image[L("ENEMY_MOVE_ACCUMULATOR") + slot] = 200;     // hold fire
      tickMember(image, slot);
      ys[slot].push(image[L("ENEMY_Y") + slot]);
    }
  }
  for (const slot of [0, 1]) {
    const steps = ys[slot].map((y, frame) => y - (frame === 0 ? 0 : ys[slot][frame - 1]));
    assert.ok(steps.every((step) => step === 0 || step === 1), "Y grows by at most one line");
    assert.equal(ys[slot][ENTRY_DEPTH[slot] - 1], ENTRY_DEPTH[slot]);
    const cruise = steps.slice(ENTRY_DEPTH[slot] + 1);
    const moved = cruise.map((step, index) => [ENTRY_DEPTH[slot] + 1 + index, step])
      .filter(([, step]) => step === 1).map(([frame]) => frame);
    assert.ok(moved.every((frame) => ((frame ^ slot) & 1) === 0), `slot ${slot} cruise parity`);
  }
  // Slot 1 slows early, so it trails slot 0 and the pair is never phase-locked.
  assert.ok(ys[1][119] < ys[0][119]);
  assert.notEqual(ys[0][119] - ys[1][119], 0);
});

test("lanes: each member sweeps inside its own lane and turns at both edges", () => {
  const image = bomberFormation();
  const xs = [[], []];
  const directions = [new Set(), new Set()];
  for (let frame = 0; frame < 600; frame += 1) {
    image[FRAME_COUNTER] = (frame * 7) & 0xff;
    for (const slot of [0, 1]) {
      image[L("ENEMY_Y") + slot] = 100;
      image[L("ENEMY_MOVE_ACCUMULATOR") + slot] = 200;
      if (frame < 300) image[L("ENEMY_MANEUVER_STATE") + slot] = 200;  // edge turns only
      tickMember(image, slot);
      xs[slot].push(image[L("ENEMY_X") + slot]);
      directions[slot].add(image[L("ENEMY_VELOCITY_X") + slot]);
    }
  }
  for (const slot of [0, 1]) {
    const [first, last] = LANES[slot];
    assert.ok(xs[slot].every((x) => x >= first && x <= last), `slot ${slot} lane`);
    assert.ok(xs[slot].includes(first) && xs[slot].includes(last), `slot ${slot} reaches both edges`);
    assert.deepEqual([...directions[slot]].sort((a, b) => a - b), [1, 0xff]);
    assert.ok(xs[slot].every((x, index) => index === 0 || Math.abs(x - xs[slot][index - 1]) <= 1));
  }
  // An 8-HPOS gap between the two 32-HPOS QUAD hulls at their closest.
  assert.ok(LANES[0][1] + 32 < LANES[1][0]);
  assert.equal(LANES[1][1] + 32, 208);
});

test("turns: an expired turn timer flips the direction and reloads (FRAME_COUNTER & 31) + 24", () => {
  for (const frame of [0, 13, 31, 0xe5]) {
    const image = bomberFormation();
    image[FRAME_COUNTER] = frame;
    setMember(image, 0, [70, 100, 1, 9, 1]);
    tickMember(image, 0);
    const [x, , direction, , turn] = member(image, 0);
    assert.equal(direction, 0xff);
    assert.equal(turn, (frame & 31) + 24);
    assert.equal(x, 69, "the flipped direction applies in the same frame");
  }
});

test("fire gate: visible band, living player, no capital due, own timer; returns BOMBER class", () => {
  const fire = (setup) => {
    const image = bomberFormation();
    image[FRAME_COUNTER] = 0;
    setMember(image, 0, [70, 100, 1, 0, 30]);
    setup?.(image);
    for (const [index, field] of FIELDS.entries())
      image[L("heavy_member_x") + index] = image[L(field)];
    image[L("ENEMY_TARGET_SLOT")] = 0;
    const { a } = run(image, "enemy_heavy_tick");
    return [a, image[L("_heavy_member_fire_timer")]];
  };
  assert.deepEqual(fire(), [WEAPON_BOMBER, 48]);
  assert.deepEqual(fire((image) => { image[L("ENEMY_Y")] = 22; }), [0, 0], "above the band");
  assert.deepEqual(fire((image) => { image[L("ENEMY_Y")] = 200; }), [0, 0], "below the band");
  assert.deepEqual(fire((image) => { image[L("ENEMY_Y")] = 23; }), [WEAPON_BOMBER, 48],
    "Y 23 steps to 24 before the gate");
  assert.deepEqual(fire((image) => { image[PLAYER_LIFECYCLE] = 1; }), [0, 0], "player dying");
  assert.deepEqual(fire((image) => { image[DIRECTOR_STATE_FLAGS] |= 0x80; }), [0, 0], "capital due");
  assert.deepEqual(fire((image) => { image[L("ENEMY_MOVE_ACCUMULATOR")] = 5; }), [0, 4],
    "an armed timer counts down");
});

test("emission: the veneer passes the returned class to the generic allocator (ACTIVE $1A/$1B)", () => {
  const image = bomberFormation();
  const active = L("FIGHTER_PROJECTILE_ACTIVE");
  image.fill(0, active, active + 10);
  image[FRAME_COUNTER] = 0;
  setMember(image, 0, [70, 100, 1, 0, 30]);
  setMember(image, 1, [150, 100, 0xff, 0, 30]);
  tickMember(image, 0);
  tickMember(image, 1);
  assert.deepEqual([image[active + 5], image[active + 6]],
    [0x02 | (WEAPON_BOMBER << 3), 0x02 | 0x01 | (WEAPON_BOMBER << 3)]);
  assert.deepEqual([image[active + 5], image[active + 6]], [0x1a, 0x1b]);
  assert.deepEqual([image[L("ENEMY_MOVE_ACCUMULATOR")], image[L("ENEMY_MOVE_ACCUMULATOR") + 1]],
    [48, 48], "independent per-member fire timers");
});

test("source contract: the smoke scheduler is temporary data, placed in HYBRID_C_ARENA", () => {
  assert.match(lifecycleSource, /TEMPORARY 4\.5 HEAVY SMOKE SCHEDULER/);
  assert.match(lifecycleSource,
    /#pragma code-name \("HYBRID_C_ARENA"\)\s+#pragma rodata-name \("HYBRID_C_ARENA_RODATA"\)[\s\S]+void enemy_c_spawn_raiders[\s\S]+uint8_t enemy_c_heavy_tick/);
  assert.match(lifecycleSource,
    /encounter_heavy_light_escort\[ENCOUNTER_HEAVY_SCHEDULE_LENGTH\] = \{\s+1u, 0u\s+\}/);
  assert.doesNotMatch(lifecycleSource, /HYBRID_C_HEAVY/);
});
