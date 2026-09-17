import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments, readRuntimeBytes } from "../scripts/runtime-image.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json"), "utf8"));
const lifecycleSource = fs.readFileSync(path.join(root, "src/c/lifecycle.c"), "utf8");
const abiSource = fs.readFileSync(path.join(root, "src/hybrid/c-asm-abi.s"), "utf8");
const lightSource = fs.readFileSync(path.join(root, "src/hybrid/light-wingman.s"), "utf8");
const mainSource = fs.readFileSync(path.join(root, "src/main.s"), "utf8");

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

// Byte offsets into enemy_archetypes[]: 12 bytes per record.
const OFFSET_WINGMAN = 12;
const OFFSET_INTERCEPTOR = 24;

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
  const address = typeof target === "string" ? L(target) : target;
  const cpu = new Nmos6502(image);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = address;
  cpu.a = a;
  cpu.x = x;
  cpu.y = y;
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) {
    assert.notEqual(image[cpu.pc], 0, `${target} reached BRK at $${cpu.pc.toString(16)}`);
    cpu.step();
  }
  assert.equal(cpu.pc, stop, `${target} did not return`);
  return { a: cpu.a, x: cpu.x, y: cpu.y, carry: (cpu.p & 0x01) !== 0, cycles: cpu.cycles };
}

function game(difficulty = 2) {
  const image = memory();
  image[L("DIFFICULTY_SETTING")] = difficulty;
  run(image, "director_init", { a: 0x6d });
  return image;
}

const light = (image) => ({
  state: image[L("light_state")],
  hp: image[L("light_hp")],
  x: image[L("light_x")],
  y: image[L("light_y")],
  timer: image[L("light_fire_timer")],
  leaderless: image[L("_light_leaderless")],
  offset: image[L("light_archetype_offset")],
  burstLeft: image[L("_light_burst_left")],
  postBurstSlot: image[L("_light_post_burst_slot")],
});

// Selects the archetype the next admission will use, via the one legitimate
// knob: the provisional schedule index. It is not a substitute lifecycle
// toggle; it is the same mechanism the schedule itself advances.
function selectNextLight(image, offset) {
  image[L("_encounter_light_index")] = offset === OFFSET_INTERCEPTOR ? 1 : 0;
}

test("selection contract: the schedule names the archetype, and the reusable admission only reads it", () => {
  for (const offset of [OFFSET_WINGMAN, OFFSET_INTERCEPTOR]) {
    const image = game();
    selectNextLight(image, offset);
    run(image, "enemy_spawn_raiders");
    assert.equal(light(image).offset, offset);
    assert.equal(light(image).state, 1);
    assert.equal(light(image).leaderless, offset === OFFSET_INTERCEPTOR ? 1 : 0);
  }
});

test("a second admission while the slot is active changes neither the archetype nor the schedule", () => {
  const image = game();
  selectNextLight(image, OFFSET_INTERCEPTOR);
  run(image, "enemy_spawn_raiders");
  const before = light(image);
  const indexBefore = image[L("_encounter_light_index")];
  image[L("light_y")] = 50;
  image[L("light_fire_timer")] = 7;
  run(image, "enemy_spawn_raiders");
  assert.equal(light(image).offset, before.offset, "still active, so still the same archetype");
  assert.equal(image[L("light_y")], 50, "an active Light keeps its own lifecycle, untouched");
  assert.equal(image[L("light_fire_timer")], 7);
  assert.equal(image[L("_encounter_light_index")], indexBefore,
    "the schedule does not advance while the slot is busy");
});

test("source contract: the Light admission and tick hold no ordering or toggle logic", () => {
  assert.doesNotMatch(lifecycleSource, /ALTERNATE/i,
    "the rejected per-admission alternation must not return");
  assert.doesNotMatch(lifecycleSource, /light_archetype_offset\s*\^=/,
    "no XOR toggle of the selected archetype");
  const assignments = [...lifecycleSource.matchAll(/light_archetype_offset\s*=[^=]/g)];
  assert.equal(assignments.length, 1,
    "light_archetype_offset has exactly one writer in the whole file");
  const scheduleFunction = lifecycleSource.slice(
    lifecycleSource.indexOf("static void encounter_light_schedule_advance"),
    lifecycleSource.indexOf("void lifecycle_c_init"));
  assert.match(scheduleFunction, /light_archetype_offset\s*=\s*encounter_light_schedule\[encounter_light_index\]/);
  // The reusable admission and tick only ever read the offset.
  const spawnRaiders = lifecycleSource.slice(
    lifecycleSource.indexOf("void enemy_c_spawn_raiders"),
    lifecycleSource.indexOf("uint8_t enemy_c_retire_member"));
  assert.doesNotMatch(spawnRaiders, /light_archetype_offset\s*=(?!=)/,
    "enemy_c_spawn_raiders must not itself assign the offset outside the schedule call");
  const lightTick = lifecycleSource.slice(
    lifecycleSource.indexOf("uint8_t enemy_c_light_tick"));
  assert.doesNotMatch(lightTick, /light_archetype_offset\s*=(?!=)/,
    "enemy_c_light_tick only reads the offset");
});

test("provisional schedule: a fresh game yields Wingman then Interceptor, then repeats", () => {
  const image = game();
  const admit = () => {
    run(image, "enemy_spawn_raiders");
    const offset = light(image).offset;
    image[L("light_state")] = 0;      // retire so the next call re-admits
    return offset;
  };
  assert.deepEqual([admit(), admit(), admit(), admit()],
    [OFFSET_WINGMAN, OFFSET_INTERCEPTOR, OFFSET_WINGMAN, OFFSET_INTERCEPTOR]);
});

test("admission per difficulty: entry x 124, leaderless, and the record's own post-burst pause", () => {
  for (const [difficulty, pause] of [[0, 56], [1, 44], [2, 32]]) {
    const image = game(difficulty);
    selectNextLight(image, OFFSET_INTERCEPTOR);
    run(image, "enemy_spawn_raiders");
    assert.deepEqual(light(image), {
      state: 1, hp: 1, x: 124, y: 0, timer: pause, leaderless: 1,
      offset: OFFSET_INTERCEPTOR, burstLeft: 0,
      postBurstSlot: OFFSET_INTERCEPTOR + difficulty,
    });
  }
});

test("descent is 2 lines per frame and retires at the recycled bottom ring row (232)", () => {
  const image = game();
  selectNextLight(image, OFFSET_INTERCEPTOR);
  run(image, "enemy_spawn_raiders");
  image[L("player_x")] = 124;         // no horizontal drift to isolate descent
  for (let frame = 1; frame <= 115; frame += 1) {
    run(image, "enemy_light_tick");
    assert.equal(light(image).y, frame * 2, `frame ${frame}`);
    assert.equal(light(image).state, 1);
  }
  run(image, "enemy_light_tick");     // 116th frame: y reaches 232
  assert.equal(light(image).state, 0, "retired before the recycled bottom ring row");
});

test("pursuit closes on the player one 4-HPOS cell every other frame, clamped to 48-200", () => {
  // Independent reference model of the spec, not a copy of the C source.
  function reference(playerX) {
    let x = 124;
    let y = 0;
    const trace = [];
    for (let frame = 0; frame < 40; frame += 1) {
      y += 2;
      if ((y & 2) === 0) {
        const target = Math.min(playerX & 0xfc, 200);
        if (x < target) x += 4;
        else if (x > target) x -= 4;
      }
      trace.push({ x, y });
    }
    return trace;
  }

  for (const playerX of [252, 0x30, 124]) {
    const image = game();
    selectNextLight(image, OFFSET_INTERCEPTOR);
    run(image, "enemy_spawn_raiders");
    image[L("player_x")] = playerX;
    const expected = reference(playerX);
    for (const { x, y } of expected) {
      run(image, "enemy_light_tick");
      assert.equal(light(image).y, y);
      assert.equal(light(image).x, x, `player_x ${playerX} at y ${y}`);
      assert.equal(light(image).x & 3, 0, "stays 4-aligned");
      assert.ok(light(image).x >= 48 && light(image).x <= 200, "stays within the ring");
    }
  }
});

test("pursuit ignores Heavy slot 0 entirely: an alive P1 formation does not switch it to follow mode", () => {
  const image = game();
  selectNextLight(image, OFFSET_INTERCEPTOR);
  run(image, "enemy_spawn_raiders");
  image[L("ENEMY_MEMBER_STATE")] = 1;   // Heavy slot 0 reported alive
  image[L("ENEMY_X")] = 40;
  image[L("ENEMY_Y")] = 40;
  image[L("player_x")] = 200;
  run(image, "enemy_light_tick");
  // A follow-mode Light would centre on ENEMY_X (40); the Interceptor stays
  // on its own pursuit track instead.
  assert.equal(light(image).leaderless, 1);
  assert.notEqual(light(image).x, (40 + 4 + 2) & 0xfc);
  assert.equal(light(image).y, 2);
});

test("single laser bolt cadence: burst 1, post 56/44/32, 1/2/3 shots per pass, tick returns LASER", () => {
  // 4.4c owner decision: one deliberate bolt per burst. Zero-based frame
  // indices; the pass fires on ticks 57 / 45, 90 / 33, 66, 99.
  const LASER = 2;
  for (const [difficulty, fires] of [
    [0, [56]],
    [1, [44, 89]],
    [2, [32, 65, 98]],
  ]) {
    const image = game(difficulty);
    selectNextLight(image, OFFSET_INTERCEPTOR);
    run(image, "enemy_spawn_raiders");
    image[L("player_x")] = 124;
    const observed = [];
    for (let frame = 0; frame < 200 && light(image).state !== 0; frame += 1) {
      const { a } = run(image, "enemy_light_tick");
      if (a) {
        observed.push(frame);
        assert.equal(a, LASER, "a firing tick returns the record's weapon_class");
      }
    }
    assert.deepEqual(observed, fires, `difficulty ${difficulty}`);
  }
});

test("fire is gated by visibility and by the player dying, exactly like the Wingman", () => {
  const image = game();
  selectNextLight(image, OFFSET_INTERCEPTOR);
  run(image, "enemy_spawn_raiders");
  image[L("light_fire_timer")] = 0;
  image[L("light_y")] = 10;           // below LIGHT_FIRE_TOP (24)
  assert.equal(run(image, "enemy_light_tick").a, 0);
  assert.equal(light(image).timer, 0, "an invisible Interceptor retries next frame");
  image[L("light_y")] = 100;
  image[L("PLAYER_LIFECYCLE")] = 1;
  assert.equal(run(image, "enemy_light_tick").a, 0, "no fire while the player is dying");
  image[L("PLAYER_LIFECYCLE")] = 0;
  assert.equal(run(image, "enemy_light_tick").a, 2, "fires, returning weapon_class LASER");
});

test("a player PairShot kills the Interceptor, scores 0x15 BCD, and only the fighter lifecycle retires it", () => {
  const image = game();
  selectNextLight(image, OFFSET_INTERCEPTOR);
  run(image, "enemy_spawn_raiders");
  image[L("light_x")] = 100;
  image[L("light_y")] = 99;
  const active = L("FIGHTER_PROJECTILE_ACTIVE");
  image[active] = 1;
  image[L("FIGHTER_PROJECTILE_X")] = 102;
  image[L("FIGHTER_PROJECTILE_Y")] = 100;
  image[L("score_bcd_lo")] = 0x00;
  image[L("score_bcd_hi")] = 0x00;
  const hit = run(image, "light_shot", { x: 0 });
  assert.equal(hit.carry, false);
  assert.equal(image[active], 0);
  assert.equal(light(image).state, 0);
  assert.deepEqual([image[L("score_bcd_lo")], image[L("score_bcd_hi")]], [0x15, 0x00]);
  const member = L("ENEMY_MEMBER_STATE");
  assert.deepEqual([...image.subarray(member, member + 2), image[L("ENEMY_LIVE_COUNT")]],
    [1, 1, 2], "both Heavies are untouched");

  // Fighter-only lifecycle: any non-fighter sector retires it at once, the
  // same contract the Wingman uses.
  const image2 = game();
  selectNextLight(image2, OFFSET_INTERCEPTOR);
  run(image2, "enemy_spawn_raiders");
  image2[L("CAPITAL_SECTOR_STATE")] = 1;
  run(image2, "enemy_light_tick");
  assert.equal(light(image2).state, 0);
});

test("placement contract: legal composite and packed size, state inside its reserved windows, no C stack", () => {
  const extension = manifest.directorCodeRuntimes.find(({ name }) => name === "extension");
  assert.ok(extension.runAddress + extension.bytes <= 0x9000,
    `extension composite ends at $${(extension.runAddress + extension.bytes).toString(16)}`);
  assert.ok(extension.packedBytes <= 960, "late-compressed extension cold staging limit");
  // Scarce: the owner floor is 16 B; below it the next change needs a decision.
  assert.ok(manifest.residentCapacity.tails.hybridCExtension >= 16,
    `free HYBRID_C_EXT tail ${manifest.residentCapacity.tails.hybridCExtension} B`);
  // Visual identity (4.4b): both 16-byte Light art tables are the ENTITY_CODE
  // tail, LIGHT_RESIDENT loses the Wingman art but gains the selection.
  // Weapon visuals (4.4c): the Light emit tags the shot with weapon_class (+4 B).
  assert.equal(manifest.lightWingman.residentBytes, 229);
  assert.equal(manifest.entityEffects.codeBytes, 3153);
  assert.equal(manifest.residentCapacity.tails.entityCode, 13);
  assert.equal(manifest.residentCapacity.tails.pickupStreamFill, 11);
  assert.equal(manifest.residentCapacity.tails.hybridCExtension, 21);
  assert.equal(L("light_glyph"), 0x9d31);
  assert.equal(L("light_interceptor_glyph"), 0x9d41);
  assert.equal(L("light_archetype_offset"), 0x810c);
  assert.equal(L("_light_burst_left"), 0x810d);
  assert.equal(L("_light_target_x"), 0x810e);
  assert.equal(L("_light_post_burst_slot"), 0x810f);
  assert.deepEqual([L("__HYBRID_LIGHT_STATE_RUN__"), L("__HYBRID_LIGHT_STATE_SIZE__")],
    [0x8100, 0x10], "HYBRID_LIGHT_STATE is exactly $8100-$810F");
  assert.equal(L("_encounter_light_index"), 0x8119);
  assert.deepEqual([L("__HYBRID_ENCOUNTER_STATE_RUN__"), L("__HYBRID_ENCOUNTER_STATE_SIZE__")],
    [0x8119, 1], "the provisional schedule counter is the only byte of its segment");
  assert.equal(manifest.encounterDirector.director.footprint.cStackBytes, 0);
  assert.equal(manifest.encounterDirector.director.footprint.zeroPageBytes, 0);
});

test("no PMG: no P1/P2 or PMG register touched by the ASM files this task changed", () => {
  const pmgPattern = /\b(?:PLAYER0|PLAYER1|PLAYER2|PLAYER3|MISSILE0|MISSILE1|MISSILE2|MISSILE3|HPOSP\d|SIZEP\d|GRACTL|PMBASE)\b/;
  assert.doesNotMatch(lightSource, pmgPattern);
  assert.doesNotMatch(abiSource, pmgPattern);
  // ASM is limited to the ABI equate, the ldx before the score add and the
  // adc,x in the 17-byte pad; it must not introduce a second archetype field.
  assert.equal((mainSource.match(/adc LIGHT_SCORE_BCD,x/g) ?? []).length, 1);
  assert.equal((lightSource.match(/ldx LIGHT_ARCHETYPE_OFFSET/g) ?? []).length, 1);
});

test("weapon_class visuals: Raider PULSE publishes $DA/$E4, the Interceptor LASER bolt $E5, and the resolver restores both", () => {
  const CHARSET = 0x4400;
  const PULSE = 1;
  const LASER = 2;
  const base = 5;
  const image = game(2);
  run(image, "init_fighter_projectiles");
  run(image, "build_interceptor_projectile_glyphs");
  // Authored per class: left phase at 89+c, right phase (>> 4) at 99+c.
  const pulse = [0x00, 0xa0, 0x50, 0x00, 0x00, 0xa0, 0x50, 0x00];
  const laser = [0x20, 0x20, 0x20, 0x10, 0x10, 0x10, 0x10, 0x00];
  const glyph = (index) => [...image.subarray(CHARSET + index * 8, CHARSET + (index + 1) * 8)];
  assert.deepEqual(glyph(90), pulse);
  assert.deepEqual(glyph(91), laser);
  assert.deepEqual(glyph(100), pulse.map((value) => value >> 4));
  assert.deepEqual(glyph(101), laser.map((value) => value >> 4));

  // Interceptor: the real Light emit tags the shot with the C-returned class.
  selectNextLight(image, OFFSET_INTERCEPTOR);
  run(image, "enemy_spawn_raiders");
  image[L("light_x")] = 100;
  image[L("light_y")] = 100;
  image[L("light_fire_timer")] = 0;
  const active = L("FIGHTER_PROJECTILE_ACTIVE");
  image.fill(0, active, active + 10);
  run(image, "light_update");
  assert.equal(image[active + base], 0x06 | (LASER << 3));

  // Raider: the real Heavy emitter tags its shot PULSE and keeps the 0/1 cursor.
  for (const member of [0, 1]) {
    image[L("ENEMY_MEMBER_STATE") + member] = 1;
    image[L("ENEMY_X") + member] = 80 + member * 40;
    image[L("ENEMY_Y") + member] = 60;
  }
  image[L("ENEMY_TARGET_SLOT")] = 1;
  assert.equal(run(image, "allocate_interceptor_projectile").carry, true);
  assert.equal(image[active + base + 1], 0x02 | 0x01 | (PULSE << 3));
  assert.equal(image[L("ENEMY_WEAPON_CURSOR")], 0);
  image[L("ENEMY_TARGET_SLOT")] = 0;
  assert.equal(run(image, "allocate_interceptor_projectile").carry, true);
  assert.equal(image[active + base + 2], 0x02 | (PULSE << 3));
  assert.equal(image[L("ENEMY_WEAPON_CURSOR")], 1);
  // Pin the two Raider shots to the left and right horizontal phases.
  image[L("FIGHTER_PROJECTILE_X") + base + 1] = 96;
  image[L("FIGHTER_PROJECTILE_X") + base + 2] = 130;
  image[L("FIGHTER_PROJECTILE_Y") + base + 1] = 120;
  image[L("FIGHTER_PROJECTILE_Y") + base + 2] = 140;

  run(image, "render_fighter_projectile_overlays");
  const cell = (slot) => image[L("FIGHTER_PROJECTILE_SCREEN_LO") + slot] |
    (image[L("FIGHTER_PROJECTILE_SCREEN_HI") + slot] << 8);
  assert.deepEqual([base, base + 1, base + 2].map((slot) => image[cell(slot)]),
    [0xe5, 0xda, 0xe4]);

  const dst = L("dst_ptr");
  for (const slot of [base, base + 1, base + 2]) {
    const address = cell(slot);
    image[dst] = address & 0xff;
    image[dst + 1] = address >> 8;
    const backing = image[L("FIGHTER_PROJECTILE_BACKUP_TOP") + slot];
    assert.ok(backing < 0xda || backing > 0xe6, "the saved underlay is not a hostile shot");
    assert.equal(run(image, "resolve_effect_backing_below_enemy_pairshot",
      { a: image[address] }).a, backing, `slot ${slot} restores its backing`);
    // 4.5b: the BOMBER class (3) extends the hostile range through $E6.
    for (const bomber of [0xdc, 0xe6]) {
      assert.equal(run(image, "resolve_effect_backing_below_enemy_pairshot",
        { a: bomber }).a, backing, `BOMBER code $${bomber.toString(16)} is a hostile shot`);
    }
    for (const outside of [0xd9, 0xe7]) {
      assert.equal(run(image, "resolve_effect_backing_below_enemy_pairshot",
        { a: outside }).a, outside, `code $${outside.toString(16)} is not a hostile shot`);
    }
  }
});
