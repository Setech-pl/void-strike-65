import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments, readRuntimeBytes } from "../scripts/runtime-image.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json"), "utf8"));
const mainSource = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
const lightSource = fs.readFileSync(path.join(root, "src/hybrid/light-wingman.s"), "utf8");

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

const CHARSET = 0x4400;
const LIGHT_CODE_LEFT = 120 | 0x80;
const LIGHT_OWNER = 0x06;
const ENEMY_BASE = 5;

function memory() {
  const image = new Uint8Array(0x10000);
  installRuntimeSegments(image, root);
  // Canonical ring mapping, head zero: logical row r lives at $8140 + 40*r.
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
  side: image[L("_light_side")],
});

function setLeader(image, x, y, state = 1) {
  image[L("ENEMY_MEMBER_STATE")] = state;
  image[L("ENEMY_X")] = x;
  image[L("ENEMY_Y")] = y;
}

function cell(image, row, column) {
  return 0x8140 + row * 40 + column;
}

test("Light EnemyArchetype is the second 12-byte C record and Raider is unchanged", () => {
  const table = L("enemy_archetype_table");
  assert.deepEqual([...readRuntimeBytes(root, table, 12)],
    [1, 0, 1, 5, 15, 60, 50, 40, 1, 1, 0x10, 1]);
  assert.deepEqual([...readRuntimeBytes(root, table + 12, 12)],
    [1, 1, 2, 1, 0, 96, 80, 64, 2, 1, 0x05, 1]);
});

test("Light kernel placement is legal, resident and inside every reviewed gate", () => {
  const light = manifest.lightWingman;
  assert.equal(light.residentRunAddress, 0x8776);
  assert.equal(L("__LIGHT_RESIDENT_RUN__"), 0x8776);
  assert.equal(L("__PICKUP_CODE_RUN__"), 0x8776 + light.residentBytes);
  assert.equal(light.extensionTailRunAddress + light.extensionTailBytes <= 0x9000, true);
  const extension = manifest.directorCodeRuntimes.find(({ name }) => name === "extension");
  assert.equal(extension.runAddress + extension.bytes, light.extensionTailRunAddress +
    light.extensionTailBytes, "LIGHT_CODE is the tail of the extension composite");
  assert.ok(extension.packedBytes <= 960, "late-compressed extension cold staging limit");
  assert.ok(manifest.starfieldRuntime.packedBytes <= 0x706, "starfield correction gate");
  assert.ok(L("light_starfield_end") <= L("hud_booster_backing"));
  assert.equal(manifest.entityEffects.stagingToBroadsideMarginBytes, 90,
    "ENTITY_CODE staging is untouched");
  assert.equal(manifest.capitalPlayerCollisionRuntime.runAddress, 0x8b67);
  // light_add_score exactly fills the retired 17-byte BROADSIDE entry pad.
  assert.equal(L("light_add_score"), L("entity_complete_scroll_tick") + 3);
  assert.deepEqual([L("light_state"), L("_enemy_profile_movement_id")], [0x8100, 0x8110]);
  assert.equal(manifest.encounterDirector.director.footprint.cStackBytes, 0);
  assert.equal(manifest.encounterDirector.director.footprint.zeroPageBytes, 0);
});

test("formation admission yields 2 Heavy + 1 Light with independent lifecycles", () => {
  for (const [difficulty, pause] of [[0, 96], [1, 80], [2, 64]]) {
    const image = game(difficulty);
    assert.equal(light(image).state, 0);
    run(image, "enemy_spawn_raiders");
    const member = L("ENEMY_MEMBER_STATE");
    assert.deepEqual([...image.subarray(member, member + 2)], [1, 1]);
    assert.deepEqual([image[L("ENEMY_LIVE_COUNT")], image[L("ENEMY_ACTIVE")]], [2, 1]);
    assert.deepEqual(light(image), {
      state: 1, hp: 1, x: 0, y: 0, timer: pause, leaderless: 0, side: 20,
    });
    // A wingman still flying from an earlier formation keeps its lifecycle.
    image[L("light_y")] = 100;
    image[L("light_fire_timer")] = 5;
    run(image, "enemy_spawn_raiders");
    assert.deepEqual([light(image).y, light(image).timer], [100, 5]);
  }
});

test("C formation follows Heavy slot 0 with a lag and edge-only side hysteresis", () => {
  const image = game();
  run(image, "enemy_spawn_raiders");
  const tick = (x, y) => {
    setLeader(image, x, y);
    run(image, "enemy_light_tick");
    return [light(image).x, light(image).y];
  };
  assert.deepEqual(tick(100, 100), [120, 88]);
  assert.deepEqual(tick(144, 100), [164, 88], "right side holds to the corridor edge");
  assert.deepEqual(tick(150, 60), [136, 48], "beyond the edge the wingman switches left");
  assert.deepEqual(tick(120, 60), [108, 48], "no switch back inside the corridor");
  assert.deepEqual(tick(90, 60), [108, 48], "near the left edge it switches right again");
  assert.deepEqual(tick(88, 8), [108, 0], "a leader above the lag keeps the wingman hidden");
});

test("leader loss continues straight down, then recycles below the playfield", () => {
  const image = game();
  run(image, "enemy_spawn_raiders");
  setLeader(image, 100, 100);
  run(image, "enemy_light_tick");
  image[L("ENEMY_TARGET_SLOT")] = 0;
  image[L("ENEMY_PENDING_DAMAGE")] = 1;
  assert.equal(run(image, "enemy_apply_pending_damage").a, 1, "Heavy slot 0 destroyed");
  assert.equal(image[L("ENEMY_MEMBER_STATE") + 1], 1, "Heavy slot 1 survives");
  run(image, "enemy_light_tick");
  assert.deepEqual([light(image).state, light(image).leaderless, light(image).x,
    light(image).y], [1, 1, 120, 89]);
  setLeader(image, 40, 40, 1);  // a respawned slot never re-captures this wingman
  run(image, "enemy_light_tick");
  assert.deepEqual([light(image).x, light(image).y], [120, 90]);
  image[L("light_y")] = 238;
  run(image, "enemy_light_tick");
  assert.equal(light(image).state, 1);
  run(image, "enemy_light_tick");
  assert.equal(light(image).state, 0, "recycled at scanline 240");
});

test("single-shot fire policy is slower than the Heavy burst and gated by visibility", () => {
  const image = game(2);
  run(image, "enemy_spawn_raiders");
  setLeader(image, 100, 100);
  const fires = [];
  for (let frame = 0; frame < 200; frame += 1) fires.push(run(image, "enemy_light_tick").a);
  assert.deepEqual(fires.flatMap((value, frame) => value ? [frame] : []), [64, 129, 194]);
  image[L("light_fire_timer")] = 0;
  setLeader(image, 100, 20);    // wingman top would be 8: not fully visible
  assert.equal(run(image, "enemy_light_tick").a, 0);
  assert.equal(light(image).timer, 0, "an invisible wingman retries next frame");
  setLeader(image, 100, 100);
  image[L("PLAYER_LIFECYCLE")] = 1;
  assert.equal(run(image, "enemy_light_tick").a, 0, "no fire while the player is dying");
  image[L("PLAYER_LIFECYCLE")] = 0;
  assert.equal(run(image, "enemy_light_tick").a, 1);
});

test("ASM emits one red PairShot owned by the leader's P1 emitter bit", () => {
  const image = game(2);
  run(image, "enemy_spawn_raiders");
  setLeader(image, 80, 112);
  image[L("light_fire_timer")] = 0;
  run(image, "light_update");
  const active = L("FIGHTER_PROJECTILE_ACTIVE");
  assert.deepEqual([light(image).x, light(image).y], [100, 100]);
  assert.equal(image[active + ENEMY_BASE], LIGHT_OWNER);
  assert.equal(image[L("FIGHTER_PROJECTILE_X") + ENEMY_BASE], 102);
  assert.equal(image[L("FIGHTER_PROJECTILE_Y") + ENEMY_BASE], 104);
  assert.equal(image[L("FIGHTER_PROJECTILE_LIFETIME") + ENEMY_BASE], 96);
  assert.deepEqual([...image.subarray(CHARSET + 120 * 8, CHARSET + 122 * 8)],
    [0xf0, 0xfc, 0x3f, 0x0f, 0x0f, 0x03, 0x03, 0x00,
      0x0f, 0x3f, 0xfc, 0xf0, 0xf0, 0xc0, 0xc0, 0x00]);

  // Existing emitter-owned cleanup: P2 death keeps it, P1 (leader) death frees it.
  image[L("ENEMY_TARGET_SLOT")] = 1;
  run(image, "begin_enemy_fighter_explosion_with_projectile_cleanup");
  assert.equal(image[active + ENEMY_BASE], LIGHT_OWNER);
  image[L("ENEMY_TARGET_SLOT")] = 0;
  run(image, "begin_enemy_fighter_explosion_with_projectile_cleanup");
  assert.equal(image[active + ENEMY_BASE], 0);

  // A full shared enemy pool drops the single shot rather than stealing a slot.
  image.fill(2, active + ENEMY_BASE, active + 10);
  image[L("light_fire_timer")] = 0;
  run(image, "light_update");
  assert.deepEqual([...image.subarray(active + ENEMY_BASE, active + 10)], [2, 2, 2, 2, 2]);
});

test("a player PairShot kills only the Light, scores its record and frees the shot", () => {
  const image = game();
  run(image, "enemy_spawn_raiders");
  image[L("light_x")] = 100;
  image[L("light_y")] = 99;           // character-aligned top 96
  const active = L("FIGHTER_PROJECTILE_ACTIVE");
  image[active] = 1;
  image[L("FIGHTER_PROJECTILE_X")] = 140;
  image[L("FIGHTER_PROJECTILE_Y")] = 100;
  const miss = run(image, "light_shot", { x: 0 });
  assert.equal(miss.carry, false);
  assert.deepEqual([light(image).state, image[active]], [1, 1], "a miss falls through");

  image[L("FIGHTER_PROJECTILE_X")] = 102;
  image[L("score_bcd_lo")] = 0x98;
  image[L("score_bcd_hi")] = 0x00;
  const hit = run(image, "light_shot", { x: 0 });
  assert.deepEqual([hit.carry, hit.x], [false, 0], "slot consumed, scan index preserved");
  assert.equal(image[active], 0);
  assert.equal(light(image).state, 0);
  assert.deepEqual([image[L("score_bcd_lo")], image[L("score_bcd_hi")]], [0x03, 0x01]);
  assert.notEqual(image[L("EFFECT_ACTIVE_MASK")], 0, "breakup feedback");
  const member = L("ENEMY_MEMBER_STATE");
  assert.deepEqual([...image.subarray(member, member + 2), image[L("ENEMY_LIVE_COUNT")]],
    [1, 1, 2], "both Heavies are untouched");
});

test("player contact follows the Raider contract and destroys the Light", () => {
  const image = game();
  run(image, "enemy_spawn_raiders");
  setLeader(image, 100, 108);
  image[L("light_fire_timer")] = 50;
  image[L("PLAYER_LIFECYCLE")] = 0;
  image[0x4e5d] = 10;                 // BROAD_PLAYER_HEALTH
  image[L("player_x")] = 116;
  image[L("player_y")] = 100;
  run(image, "light_update");
  assert.equal(light(image).state, 0);
  assert.equal(image[0x4e5d], 0, "full player damage through the shared gate");
});

test("render and erase restore both ring cells byte-exactly in reverse layer order", () => {
  const image = game();
  run(image, "enemy_spawn_raiders");
  image[L("light_x")] = 100;          // column (100-48)/4 = 13
  image[L("light_y")] = 100;          // top 96 -> ring row 9
  const left = cell(image, 9, 13);
  // Left: an OLD enemy PairShot whose saved underlay is $05. Right: near star.
  image[left] = (90 | 0x80);
  image[left + 1] = 1;
  const slot = 6;
  image[L("FIGHTER_PROJECTILE_RENDERED") + slot] = 0xff;
  image[L("FIGHTER_PROJECTILE_SCREEN_LO") + slot] = left & 0xff;
  image[L("FIGHTER_PROJECTILE_SCREEN_HI") + slot] = left >> 8;
  image[L("FIGHTER_PROJECTILE_BACKUP_TOP") + slot] = 0x05;
  run(image, "light_render");
  assert.deepEqual([image[left], image[left + 1]], [LIGHT_CODE_LEFT, LIGHT_CODE_LEFT + 1]);
  assert.deepEqual([image[L("light_backing0")], image[L("light_backing1")]], [0x05, 0x00],
    "shot underlay and CH_SPACE, never a PairShot or near-star glyph");
  assert.equal(image[L("light_screen_lo")] | image[L("light_screen_hi")] << 8, left);

  // A PairShot later saving the right Light cell inherits the Light's backing.
  const dst = L("dst_ptr");
  image[dst] = (left + 1) & 0xff;
  image[dst + 1] = (left + 1) >> 8;
  assert.equal(run(image, "light_backing", { a: LIGHT_CODE_LEFT + 1 }).a, 0x00);
  image[dst] = (left + 2) & 0xff;
  assert.equal(run(image, "light_backing", { a: 0x33 }).a, 0x33, "other cells unchanged");

  image[left] = 0x77;                 // any later layer write is overwritten by restore
  run(image, "light_erase");
  assert.deepEqual([image[left], image[left + 1]], [0x05, 0x00]);
  assert.equal(image[L("light_screen_hi")], 0);
  const again = run(image, "light_erase");
  assert.ok(again.cycles > 0);
  assert.deepEqual([image[left], image[left + 1]], [0x05, 0x00], "erase is idempotent");
});

test("fighter->capital waits for the Light and capital->fighter re-admits a fresh one", () => {
  const image = game();
  const state = L("CAPITAL_SECTOR_STATE");
  run(image, "enemy_spawn_raiders");
  image[L("ENEMY_ACTIVE")] = 0;       // formation already gone; the wingman remains
  image[0x4ff8] = 600 & 0xff;
  image[0x4ff9] = 600 >> 8;
  assert.equal(run(image, "sector_update_first_capital").a, 0);
  assert.equal(image[state], 7);
  image[state] = 0;                   // any non-fighter sector retires it at once
  run(image, "enemy_light_tick");
  assert.equal(light(image).state, 0);
  image[state] = 7;
  assert.equal(run(image, "sector_update_first_capital").a, 1);
  assert.equal(image[state], 0);

  image[L("_light_leaderless")] = 1;
  image[state] = 7;                   // post-capital OPEN
  run(image, "enemy_spawn_raiders");
  assert.deepEqual([light(image).state, light(image).hp, light(image).leaderless], [1, 1, 0]);
});

test("hooks are operand-only redirections and C remains the single lifecycle owner", () => {
  for (const hook of ["entity_effects_erase_with_white_starfield_light",
    "entity_effects_update_with_light", "entity_effects_render_with_light",
    "entity_player_fighter_projectile_target_with_light",
    "resolve_effect_backing_below_interactive_debris_and_light"]) {
    assert.equal((mainSource.match(new RegExp(`jsr ${hook}\\b`, "g")) ?? []).length, 1, hook);
  }
  assert.doesNotMatch(lightSource,
    /\b(?:sta|stx|sty|inc|dec)\s+(?:LIGHT_STATE|LIGHT_HP|LIGHT_X|LIGHT_Y)\b/,
    "ASM never writes C-owned Light lifecycle, HP or position");
});
