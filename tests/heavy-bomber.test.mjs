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
  "ENEMY_MANEUVER_STATE", "ENEMY_MANEUVER_TIMER"];
// Roadmap 4.5d attack run and colours.
const ATTACK = 0;
const AIM_FRAMES = 20;
const SALVO_INTERVAL = 8;
const SALVO_SHELLS = 2;
// Identity: hue C (green) with the remaining HP as the luminance; the charge
// (+4) and hit flash (+6) are added on top, unclamped.
// Re-pinned 2026-09-23 from hue 8 (blue). 4.5d's $88 was byte-identical to
// GAMEPLAY_COLPF1, the allied steel, so the Bomber wore the allied capital
// hull's own colour and read as friendly at the owner's hardware smoke.
// Red was the fallback and was not taken: the enemy capital hull is burgundy.
const BOMBER_HUE = 0xc0;
// src/main.s GAMEPLAY_COLPF1 and its darker second-half level steps: the
// values the Bomber must not land on.
const ALLIED_STEEL = [0x88, 0x8a, 0x86, 0x84];
const HULL_AT = (hp) => BOMBER_HUE | (hp << 1);
const CHARGE_AT = (hp) => HULL_AT(hp) + 4;
const FLASH_AT = (hp) => HULL_AT(hp) + 6;
const HULL = HULL_AT(4);
const CHARGE = CHARGE_AT(4);
const FLASH = FLASH_AT(4);

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

function setMember(image, slot, [x, y, direction, fire, turn, aux = 4]) {
  for (const [index, value] of [x, y, direction, fire, turn, aux].entries())
    image[L(FIELDS[index]) + slot] = value;
}

function tickMember(image, slot) {
  image[L("ENEMY_TARGET_SLOT")] = slot;
  return run(image, "heavy_member_update", { x: slot });
}

test("Bomber is the fourth 12-byte C record: 4 HP, lane sweep, 2-shell salvo, BOMBER class", () => {
  const table = L("enemy_archetype_table");
  const image = memory();
  // 4.5d: fire policy HEAVY_SALVO (4), 2 shells 8 frames apart, reload 64/52/40.
  assert.deepEqual([...image.subarray(table + OFFSET_BOMBER, table + OFFSET_BOMBER + 12)],
    [4, 3, 4, 2, 8, 64, 52, 40, 1, WEAPON_BOMBER, 0x50, 1]);
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
    [OFFSET_BOMBER, ROSTER_SHAPE_BOMBER, HULL, HULL, 4, 4],
    [OFFSET_RAIDER, 0, 0x44, 0x44, 1, 1],
    [OFFSET_BOMBER, ROSTER_SHAPE_BOMBER, HULL, HULL, 4, 4],
  ]);
});

test("Bomber admission publishes its profile and the lane-sweep formation start", () => {
  for (const [difficulty, pause] of [[0, 64], [1, 52], [2, 40]]) {
    const image = bomberFormation(difficulty);
    assert.deepEqual([image[L("ENEMY_ACTIVE")], image[L("ENEMY_LIVE_COUNT")],
      image[L("ENEMY_MEMBER_STATE")], image[L("ENEMY_MEMBER_STATE") + 1]], [1, 2, 1, 1]);
    assert.equal(image[L("enemy_profile_movement_id")], 3);
    assert.equal(image[L("enemy_profile_weapon_class")], WEAPON_BOMBER);
    assert.equal(image[L("enemy_profile_score_bcd")], 0x50);
    assert.equal(image[L("enemy_profile_post_burst_frames")], pause);
    // Slot 0 enters left moving right; slot 1 mirrored and fires 24 frames later.
    // The sixth byte is the hit-flash byte: last HP 4, no flash.
    assert.deepEqual(member(image, 0), [48, 0, 1, 48, 60, 4]);
    assert.deepEqual(member(image, 1), [176, 0, 0xff, 72, 52, 4]);
    assert.equal(image[L("enemy_profile_fire_policy_id")], 4, "never the ASM Raider pair burst");
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
  assert.deepEqual([image[COLPM1], image[COLPM2]], [HULL, HULL]);
  run(image, "enemy_recycle");
  assert.equal(image[L("ENEMY_ACTIVE")], 0);
  assert.equal(image[L("heavy_hull_colour")], 0x44);
  assert.deepEqual([image[COLPM1], image[COLPM2]], [0x44, 0x44]);
});

test("marshalling: the member veneer ticks exactly its own slot bytes", () => {
  const image = bomberFormation();
  image[FRAME_COUNTER] = 0;
  const other = member(image, 1);
  image[COLPM1] = 0;
  image[COLPM2] = 0;
  tickMember(image, 0);
  assert.deepEqual(member(image, 0), [49, 1, 1, 47, 59, 4]);
  assert.deepEqual(member(image, 1), other, "slot 1 untouched");
  assert.deepEqual([image[COLPM1], image[COLPM2]], [HULL, 0], "only its own COLPM");
  image[FRAME_COUNTER] = 1;
  tickMember(image, 1);
  assert.deepEqual(member(image, 1), [175, 1, 0xff, 71, 51, 4]);
  assert.deepEqual(member(image, 0), [49, 1, 1, 47, 59, 4], "slot 0 untouched");
  assert.deepEqual([image[COLPM1], image[COLPM2]], [HULL, HULL]);
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

test("attack start: an expired reload inside the band brakes and charges instead of firing", () => {
  const start = (setup) => {
    const image = bomberFormation();
    image[FRAME_COUNTER] = 0;
    setMember(image, 0, [70, 100, 1, 0, 30]);
    setup?.(image);
    const { a } = tickMember(image, 0);
    const [, , direction, fire, turn] = member(image, 0);
    return [a, direction, turn, fire];
  };
  assert.deepEqual(start(), [0, ATTACK, AIM_FRAMES, SALVO_SHELLS]);
  assert.deepEqual(start((image) => { image[L("ENEMY_Y")] = 22; }), [0, 1, 29, 0], "above the band");
  assert.deepEqual(start((image) => { image[L("ENEMY_Y")] = 200; }), [0, 1, 29, 0], "below the band");
  assert.deepEqual(start((image) => { image[L("ENEMY_Y")] = 23; }), [0, ATTACK, AIM_FRAMES, SALVO_SHELLS],
    "Y 23 steps to 24 before the gate");
  assert.deepEqual(start((image) => { image[PLAYER_LIFECYCLE] = 1; }), [0, 1, 29, 0], "player dying");
  assert.deepEqual(start((image) => { image[DIRECTOR_STATE_FLAGS] |= 0x80; }), [0, 1, 29, 0], "capital due");
  assert.deepEqual(start((image) => { image[L("ENEMY_MOVE_ACCUMULATOR")] = 5; }), [0, 1, 29, 4],
    "an armed reload counts down");
});

const shellCount = (image) => [5, 6, 7, 8, 9]
  .filter((slot) => image[L("FIGHTER_PROJECTILE_ACTIVE") + slot] !== 0).length;

// Runs one member from an attack start and records every frame. The veneer
// tail-calls the allocator, so a shot shows as a newly occupied hostile slot.
function attackRun(difficulty = 2, setup = null) {
  const image = bomberFormation(difficulty);
  const active = L("FIGHTER_PROJECTILE_ACTIVE");
  image.fill(0, active, active + 10);
  setMember(image, 0, [70, 100, 1, 0, 30]);
  const frames = [];
  for (let frame = 0; frame < 140; frame += 1) {
    image[FRAME_COUNTER] = frame & 0xff;
    setup?.(image, frame);
    const before = shellCount(image);
    tickMember(image, 0);
    const a = shellCount(image) > before ? WEAPON_BOMBER : 0;
    const [x, y, direction, fire, turn] = member(image, 0);
    frames.push({ frame, a, x, y, direction, fire, turn, colour: image[COLPM1] });
  }
  return { image, frames };
}

test("attack run: brake, 20-frame charge, two shells 8 frames apart from one column, resume", () => {
  for (const [difficulty, reload] of [[0, 64], [1, 52], [2, 40]]) {
    const { image, frames } = attackRun(difficulty);
    const shots = frames.filter(({ a }) => a !== 0);
    // The attack starts on frame 0; the charge lasts 20 ticks; the salvo follows.
    assert.equal(shots[0].frame, AIM_FRAMES);
    assert.equal(shots[1].frame, AIM_FRAMES + SALVO_INTERVAL);
    assert.ok(shots.every(({ a }) => a === WEAPON_BOMBER));
    // The brake tick still sweeps once (70 -> 71, Y 100 -> 101); X and Y then
    // freeze through the last shell.
    const hold = frames.slice(0, AIM_FRAMES + SALVO_INTERVAL + 1);
    assert.ok(hold.every(({ x, y }) => x === 71 && y === 101), `hold freezes X/Y (difficulty ${difficulty})`);
    assert.ok(frames.slice(0, AIM_FRAMES + SALVO_INTERVAL).every(({ direction }) => direction === ATTACK));
    // The last shell resumes the sweep with the post-burst reload.
    const resume = frames[AIM_FRAMES + SALVO_INTERVAL];
    assert.ok([1, 0xff].includes(resume.direction));
    assert.equal(resume.fire, reload);
    assert.ok(resume.turn >= 24 && resume.turn <= 55);
    assert.notEqual(frames[AIM_FRAMES + SALVO_INTERVAL + 2].x, 71, "the member moves again");
    // Attack period = charge + interval + reload + the attack-start tick.
    assert.equal(shots[2].frame - shots[0].frame, AIM_FRAMES + SALVO_INTERVAL + reload + 1);
    // Both shells leave from the same column: a two-cell heavy stream.
    const slots = [5, 6, 7, 8, 9].filter((slot) => image[L("FIGHTER_PROJECTILE_ACTIVE") + slot] !== 0);
    assert.ok(slots.length >= 2);
    const xs = new Set(slots.slice(0, 2).map((slot) => image[L("FIGHTER_PROJECTILE_X") + slot]));
    assert.equal(xs.size, 1);
  }
});

test("resume direction follows FRAME_COUNTER bit 1, never lockstep with the pair", () => {
  const resumeDirection = (frame) => {
    const image = bomberFormation();
    image[FRAME_COUNTER] = frame;
    setMember(image, 0, [70, 100, ATTACK, 1, 1]);   // last shell due now
    const active = L("FIGHTER_PROJECTILE_ACTIVE");
    image.fill(0, active, active + 10);
    tickMember(image, 0);
    assert.equal(image[active + 5], 0x02 | (WEAPON_BOMBER << 3), "the last shell is emitted");
    return member(image, 0)[2];
  };
  // bomber_turn flips the seeded direction: bit 1 clear seeds 1 and turns to $FF.
  assert.equal(resumeDirection(0), 0xff);
  assert.equal(resumeDirection(2), 1);
});

test("salvo abort: a dying player or a due capital skips the shell and resumes the sweep", () => {
  for (const setup of [(image) => { image[PLAYER_LIFECYCLE] = 1; },
    (image) => { image[DIRECTOR_STATE_FLAGS] |= 0x80; }]) {
    const image = bomberFormation();
    image[FRAME_COUNTER] = 0;
    setMember(image, 0, [70, 100, ATTACK, 2, 1]);
    setup(image);
    const active = L("FIGHTER_PROJECTILE_ACTIVE");
    image.fill(0, active, active + 10);
    tickMember(image, 0);
    const [, , direction, fire] = member(image, 0);
    assert.equal(shellCount(image), 0);
    assert.ok([1, 0xff].includes(direction));
    assert.equal(fire, 40);
  }
});

test("charge telegraph and hit flash: per-member COLPM, Raider formations untouched", () => {
  const { frames } = attackRun(2);
  assert.ok(frames.slice(0, AIM_FRAMES + SALVO_INTERVAL).every(({ colour }) => colour === CHARGE),
    "the hull brightens from the brake to the last shell");
  assert.equal(frames[AIM_FRAMES + SALVO_INTERVAL].colour, HULL, "and dims when it resumes");
  // The ramp itself: every HP step, and every charge/flash combination on it,
  // stays inside hue C ($C0-$CF). HP is existing state, so no new per-slot byte.
  const ramp = [];
  for (const hp of [4, 3, 2, 1]) {
    const cruise = bomberFormation();
    cruise[L("ENEMY_HP")] = hp;
    setMember(cruise, 0, [70, 100, 1, 40, 30, hp]);
    tickMember(cruise, 0);
    const base = cruise[COLPM1];
    const charged = bomberFormation();
    charged[L("ENEMY_HP")] = hp;
    setMember(charged, 0, [70, 100, ATTACK, 2, 5, hp]);
    tickMember(charged, 0);
    const flashed = bomberFormation();
    flashed[L("ENEMY_HP")] = hp;
    setMember(flashed, 0, [70, 100, 1, 40, 30, hp === 4 ? 3 : 4]);
    tickMember(flashed, 0);
    ramp.push([hp, base, charged[COLPM1], flashed[COLPM1]]);
  }
  assert.deepEqual(ramp, [
    [4, 0xc8, 0xcc, 0xce],
    [3, 0xc6, 0xca, 0xcc],
    [2, 0xc4, 0xc8, 0xca],
    [1, 0xc2, 0xc6, 0xc8],
  ]);
  assert.ok(ramp.every(([, ...colours]) => colours.every((c) => c >= 0xc0 && c <= 0xcf)),
    "no combination overflows hue C");
  assert.ok(ramp.every(([, base]) => base !== 0x44 && base !== 0x24),
    "the Bomber no longer shares the Raider red family");
  // The reason for the 2026-09-23 re-pin: not one value of the ramp, charge or
  // flash included, may collide with the allied steel the player's own side
  // wears, and none may sit in the hostile red family the capital hull uses.
  assert.ok(ramp.every(([, ...colours]) =>
    colours.every((c) => !ALLIED_STEEL.includes(c))),
    "no Bomber colour lands on the allied steel");
  assert.ok(ramp.every(([, ...colours]) =>
    colours.every((c) => (c & 0xf0) !== 0x80 && (c & 0xf0) !== 0x40)),
    "the Bomber hull leaves both the allied steel hue and the hostile red hue");
  // A hit (HP 4 -> 3) flashes the member for 6 ticks, over the charge colour,
  // and the hull stays one luma step darker afterwards.
  const hit = attackRun(2, (image, frame) => { if (frame === 5) image[L("ENEMY_HP")] = 3; }).frames;
  assert.deepEqual(hit.slice(4, 13).map(({ colour }) => colour),
    [CHARGE_AT(4), FLASH_AT(3), FLASH_AT(3), FLASH_AT(3), FLASH_AT(3), FLASH_AT(3),
      FLASH_AT(3), CHARGE_AT(3), CHARGE_AT(3)]);
  const image = bomberFormation();
  setMember(image, 1, [150, 100, 1, 9, 30]);
  image[L("ENEMY_HP") + 1] = 2;
  image[COLPM1] = 0x55;
  tickMember(image, 1);
  assert.equal(image[COLPM2], FLASH_AT(2));
  assert.equal(image[COLPM1], 0x55, "the other member keeps its colour");
  assert.equal(member(image, 1)[5], 0x52, "last HP 2, five flash ticks left");
  // Raider formations run the ASM motion and never reach the colour write.
  assert.match(memberSource,
    /heavy_member_update:\s+lda ENEMY_PROFILE_MOVEMENT_ID\s+bne @policy\s+jmp update_enemy_slot_motion[\s\S]+@store:[\s\S]+ldx ENEMY_TARGET_SLOT\s+lda HEAVY_MEMBER_COLOUR[^\n]*\s+sta COLPM1,x/);
  run(image, "enemy_recycle");
  assert.deepEqual([image[COLPM1], image[COLPM2]], [0x44, 0x44], "recycle still restores $44");
});

test("pair rhythm: both Bombers attack in turn, at most four shells, bounded time on screen", () => {
  for (const difficulty of [0, 1, 2]) {
    const image = bomberFormation(difficulty);
    const active = L("FIGHTER_PROJECTILE_ACTIVE");
    image.fill(0, active, active + 10);
    const shots = [[], []];
    let frame = 0;
    const alive = [true, true];
    for (; frame < 1200 && (alive[0] || alive[1]); frame += 1) {
      image[FRAME_COUNTER] = frame & 0xff;
      for (const slot of [0, 1]) {
        if (!alive[slot]) continue;
        const before = shellCount(image);
        tickMember(image, slot);
        if (shellCount(image) > before) shots[slot].push(frame);
        if (image[L("ENEMY_Y") + slot] >= 232) alive[slot] = false;   // retire depth
      }
      image.fill(0, active + 5, active + 10);                  // shells leave the pool
    }
    assert.ok(shots[0].length >= 6 && shots[1].length >= 6, `both attack (difficulty ${difficulty})`);
    assert.ok(shots.every((list) => list.length % 2 === 0), "every salvo has two shells");
    assert.notEqual(shots[0][0], shots[1][0], "the pair does not fire in lockstep");
    // Formation lifetime stays bounded (MEDIUM 4.5c was ~440 frames for slot 0).
    assert.ok(frame < 900, `formation lifetime ${frame} frames (difficulty ${difficulty})`);
  }
});

test("animated shell: the assembled helper publishes the exhaust phase only for BOMBER", () => {
  const image = bomberFormation();
  const active = L("FIGHTER_PROJECTILE_ACTIVE");
  const code = (value, x, frame) => {
    image[active + 5] = value;
    image[L("FIGHTER_PROJECTILE_X") + 5] = x;
    image[FRAME_COUNTER] = frame;
    return run(image, "hostile_projectile_screen_code", { x: 5 }).a;
  };
  assert.deepEqual([code(0x1a, 96, 0), code(0x1a, 96, 4), code(0x1b, 98, 3), code(0x1b, 98, 5)],
    [0xdc, 0xdd, 0xe6, 0xe7]);
  assert.deepEqual([code(0x0a, 96, 4), code(0x16, 98, 4)], [0xda, 0xe5], "PULSE and LASER never animate");
  // The helper stays in its fixed 70-byte BROADSIDE slot.
  assert.equal(L("hostile_weapon_visual_slot"), L("hostile_projectile_screen_code"));
});

test("emission: the veneer passes the returned class to the generic allocator (ACTIVE $1A/$1B)", () => {
  const image = bomberFormation();
  const active = L("FIGHTER_PROJECTILE_ACTIVE");
  image.fill(0, active, active + 10);
  image[FRAME_COUNTER] = 0;
  setMember(image, 0, [70, 100, ATTACK, 2, 1]);
  setMember(image, 1, [150, 100, ATTACK, 2, 1]);
  tickMember(image, 0);
  tickMember(image, 1);
  assert.deepEqual([image[active + 5], image[active + 6]],
    [0x02 | (WEAPON_BOMBER << 3), 0x02 | 0x01 | (WEAPON_BOMBER << 3)]);
  assert.deepEqual([image[active + 5], image[active + 6]], [0x1a, 0x1b]);
  assert.deepEqual([image[L("ENEMY_MOVE_ACCUMULATOR")], image[L("ENEMY_MOVE_ACCUMULATOR") + 1]],
    [1, 1], "independent per-member shells left");
  assert.deepEqual([image[L("ENEMY_MANEUVER_STATE")], image[L("ENEMY_MANEUVER_STATE") + 1]],
    [SALVO_INTERVAL, SALVO_INTERVAL], "the next shell follows burst_interval frames later");
});

test("source contract: the smoke scheduler is temporary data, placed in HYBRID_C_ARENA", () => {
  assert.match(lifecycleSource, /TEMPORARY 4\.5 HEAVY SMOKE SCHEDULER/);
  assert.match(lifecycleSource,
    /#pragma code-name \("HYBRID_C_ARENA"\)\s+#pragma rodata-name \("HYBRID_C_ARENA_RODATA"\)[\s\S]+void enemy_c_spawn_raiders[\s\S]+uint8_t enemy_c_heavy_tick/);
  assert.match(lifecycleSource,
    /encounter_heavy_light_escort\[ENCOUNTER_HEAVY_SCHEDULE_LENGTH\] = \{\s+1u, 0u\s+\}/);
  assert.doesNotMatch(lifecycleSource, /HYBRID_C_HEAVY/);
});

// Re-pinned 2026-09-23. The 4.5d Bomber hue and the allied steel were the same
// byte, and nothing in the tree said so, so the collision survived a smoke and
// two documentation passes. This reads both constants out of their own source
// and fails the moment they share a hue again — a hostile Heavy may not wear
// the colour of the player's own side. It also holds the build's per-level
// steel steps and the --allied-steel review override to the same rule.
test("the Bomber hull hue is green and never collides with the allied steel", () => {
  const hue = /#define\s+BOMBER_HULL_HUE\s+0x([0-9a-fA-F]{2})u/.exec(lifecycleSource);
  assert.ok(hue, "src/c/lifecycle.c must state the Bomber hull hue");
  assert.equal(Number.parseInt(hue[1], 16), 0xc0, "the Bomber hull hue is C (green)");
  // The full-HP entry is derived from the hue, not written twice, so the
  // --bomber-hull review variant cannot drift from the shipped default.
  assert.match(lifecycleSource,
    /#define\s+HULL_COLOUR_BOMBER\s+\(BOMBER_HULL_HUE \| 0x08u\)/,
    "HULL_COLOUR_BOMBER is derived from BOMBER_HULL_HUE");

  const mainSource = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
  const steel = /^GAMEPLAY_COLPF1 = \$([0-9A-Fa-f]{2})$/m.exec(mainSource);
  assert.ok(steel, "src/main.s must state GAMEPLAY_COLPF1");
  const alliedSteel = Number.parseInt(steel[1], 16);
  assert.equal(alliedSteel, 0x88, "the release-default allied steel is $88");

  // The build's own per-level steel bytes and the review override.
  const buildSource = fs.readFileSync(path.join(root, "scripts/build.mjs"), "utf8");
  const steels = [...buildSource.matchAll(/alliedSteel(?:FirstHalf|SecondHalf) = 0x([0-9a-f]{2})/g)]
    .map((match) => Number.parseInt(match[1], 16));
  assert.deepEqual(steels, [0x88, 0x84], "levels 1-6 $88, levels 7-12 $84");

  // The red fallback the owner named is buildable for comparison, and it is a
  // review variant only: green is what the source states and what dist/ gets.
  assert.match(buildSource, /--bomber-hull=/, "the red comparison build exists");
  assert.match(buildSource,
    /bomberHullValues = new Map\(\[\["green", 0xc0\], \["red", 0x40\]\]\)/,
    "green and red are the only Bomber hulls the build offers");

  for (const value of [alliedSteel, ...steels, ...ALLIED_STEEL]) {
    assert.notEqual(value & 0xf0, Number.parseInt(hue[1], 16),
      `the Bomber hull shares a hue with allied steel $${value.toString(16)}`);
  }
});
