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
const lightSource = fs.readFileSync(path.join(root, "src/hybrid/light-kernel.s"), "utf8");

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

const CHARSET = 0x4400;
const LIGHT_CODE_LEFT = 120 | 0x80;
// Owner bits 0-2 ($06) | weapon_class PULSE (1) << 3.
const LIGHT_OWNER = 0x06 | (1 << 3);
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

// REBASELINED for Light multiplicity (plan §2.1): the per-Light state is a
// structure of arrays indexed by light_slot, so each label is the base of a
// four-byte array and slot 0 is what these tests drive. light_leaderless is
// gone - it is now the light_state VALUE (1 escort, 2 free), so the derived
// field below keeps the old assertions readable without keeping the byte.
const SLOT = 0;
const light = (image, slot = SLOT) => ({
  state: image[L("light_state") + slot] === 0 ? 0 : 1,
  hp: image[L("light_hp") + slot],
  x: image[L("light_x") + slot],
  y: image[L("light_y") + slot],
  timer: image[L("light_fire_timer") + slot],
  leaderless: image[L("light_state") + slot] === 2 ? 1 : 0,
});
const setLeaderless = (image, value, slot = SLOT) => {
  image[L("light_state") + slot] = value === 0 ? 1 : 2;
};

function setLeader(image, x, y, state = 1) {
  image[L("ENEMY_MEMBER_STATE")] = state;
  image[L("ENEMY_X")] = x;
  image[L("ENEMY_Y")] = y;
}

function cell(image, row, column) {
  return 0x8140 + row * 40 + column;
}

test("Light Wingman and Interceptor are the second and third 12-byte C records; Raider is unchanged", () => {
  const table = L("enemy_archetype_table");
  assert.deepEqual([...readRuntimeBytes(root, table, 12)],
    [1, 0, 1, 5, 15, 60, 50, 40, 1, 1, 0x10, 1]);
  assert.deepEqual([...readRuntimeBytes(root, table + 12, 12)],
    [1, 1, 2, 1, 0, 96, 80, 64, 2, 1, 0x05, 1]);
  // 4.4c: the Interceptor fires one LASER (2) bolt per burst, post 56/44/32.
  assert.deepEqual([...readRuntimeBytes(root, table + 24, 12)],
    [1, 2, 3, 1, 0, 56, 44, 32, 2, 2, 0x15, 1]);
});

test("Light kernel placement is legal, resident and inside every reviewed gate", () => {
  // REBASELINED for step 1b: the kernel is its own link in the code window.
  // LIGHT_RESIDENT is gone - PICKUP_CODE now starts $8776 itself - and so is
  // the STARFIELD resolver tail. LIGHT_CODE keeps only what was never
  // Light-only: entity_debris_publish and its two debris helpers.
  const kernel = manifest.lightKernel;
  assert.equal(L("__LIGHT_KERNEL_RUN__"), kernel.address);
  assert.equal(L("__LIGHT_KERNEL_RAM_LAST__"), kernel.endExclusive);
  // The two links meet exactly: no byte of the window is lost to a boundary,
  // and the ASM half stops below the sector reader's BSS at $BC00.
  assert.equal(kernel.address, kernel.cHalfEndExclusive,
    "the kernel must start where the Director link's window half ends");
  assert.equal(kernel.address,
    manifest.residentCapacity.basicWindow.address +
      manifest.residentCapacity.basicWindow.usedBytes);
  assert.ok(kernel.endExclusive <= 0xbc00, "the kernel must stop before the reader BSS");
  assert.ok(kernel.freeBytes >= 0, `code window tail ${kernel.freeBytes} B`);
  // The frozen five-entry vector table is main.s's only binding to the kernel.
  assert.deepEqual(Object.values(kernel.vectors),
    [0, 1, 2, 3, 4].map((index) => kernel.address + index * 3));
  assert.equal(L("light_kernel_vectors"), kernel.address);

  const light = manifest.lightWingman;
  assert.equal(light.residentBytes, 0, "LIGHT_RESIDENT is gone from the main link");
  assert.equal(L("__PICKUP_CODE_RUN__"), 0x8776);
  assert.equal(light.extensionTailRunAddress + light.extensionTailBytes <= 0x9000, true);
  const extension = manifest.directorCodeRuntimes.find(({ name }) => name === "extension");
  assert.equal(extension.runAddress + extension.bytes, light.extensionTailRunAddress +
    light.extensionTailBytes, "LIGHT_CODE is the tail of the extension composite");
  assert.ok(extension.packedBytes <= 960, "late-compressed extension cold staging limit");
  // 4.5M-M1: the 1,798 B single-stream correction gate (open owner decision)
  // becomes 1,804 B for the two-stream total. Step 1b took the 31-B resolver
  // out of STARFIELD, which is what finally put it UNDER the gate: 1,811 B
  // before, 1,780 B now. The open decision is a report to the owner, not this
  // test's to close, so the assertion simply holds again.
  assert.ok(manifest.starfieldRuntime.packedBytes <= 1804,
    `starfield correction gate: ${manifest.starfieldRuntime.packedBytes} B`);
  // 93 B before the early-frame pickup PMG erase was removed from
  // entity_effects_erase (96 B); 107 B after the debris late publication
  // (frame-start debris erase and mid-frame debris render removed from
  // ENTITY_CODE, guarded erase and cell-loop render added).
  // 75 B after the Wingman and Interceptor art moved to the ENTITY_CODE tail
  // (+32 B packed).
  // 76 after step 1b: the art tables stayed, the kernel left.
  assert.equal(manifest.entityEffects.stagingToBroadsideMarginBytes, 76,
    "ENTITY_CODE staging margin tracks the Light art tables");
  assert.equal(manifest.capitalPlayerCollisionRuntime.runAddress, 0x8b67);
  // light_add_score exactly fills the retired 17-byte BROADSIDE entry pad.
  assert.equal(L("light_add_score"), L("entity_complete_scroll_tick") + 3);
  // Step 1a: the per-slot state left $8100 for the SoA arrays at $7FC4; the
  // profile cache still starts $8110 and light_slot still heads $8100.
  assert.deepEqual([L("light_state"), L("light_slot"), L("_enemy_profile_movement_id")],
    [0x7fc4, 0x8100, 0x8110]);
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
      state: 1, hp: 1, x: 0, y: 0, timer: pause, leaderless: 0,
    });
    // A wingman still flying from an earlier formation keeps its lifecycle.
    image[L("light_y")] = 100;
    image[L("light_fire_timer")] = 5;
    run(image, "enemy_spawn_raiders");
    assert.deepEqual([light(image).y, light(image).timer], [100, 5]);
  }
});

test("C formation holds the Light centred behind Heavy slot 0 without side switching", () => {
  const image = game();
  run(image, "enemy_spawn_raiders");
  const tick = (x, y) => {
    setLeader(image, x, y);
    run(image, "enemy_light_tick");
    return [light(image).x, light(image).y];
  };
  // Centre offset (16 - 8) / 2 = 4 HPOS, rounded to the nearest 4-HPOS cell.
  for (let x = 48; x <= 198; x += 1) {
    const [lightX] = tick(x, 100);
    assert.ok(Math.abs(lightX - (x + 4)) <= 2, `leader ${x}: light ${lightX}`);
    assert.equal(lightX & 3, 0);
  }
  assert.deepEqual(tick(100, 100), [104, 88], "8 + 4 lines behind (above) the leader");
  assert.deepEqual(tick(156, 60), [160, 48], "no side switch near the right edge");
  assert.deepEqual(tick(60, 60), [64, 48], "no side switch near the left edge");
  assert.deepEqual(tick(208, 60), [200, 48], "clamped to the last two-cell start, columns 38-39");
  assert.deepEqual(tick(88, 8), [92, 0], "a leader above the lag keeps the wingman hidden");
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
    light(image).y], [1, 1, 104, 89]);
  setLeader(image, 40, 40, 1);  // a respawned slot never re-captures this wingman
  run(image, "enemy_light_tick");
  assert.deepEqual([light(image).x, light(image).y], [104, 90]);
  image[L("light_y")] = 230;
  run(image, "enemy_light_tick");
  assert.equal(light(image).state, 1);
  run(image, "enemy_light_tick");
  assert.equal(light(image).state, 0, "retired before the recycled bottom ring row (232)");
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
  assert.equal(run(image, "enemy_light_tick").a, 1, "fires, returning weapon_class PULSE");
});

test("ASM emits one PULSE PairShot tagged with the leader's P1 emitter bit", () => {
  const image = game(2);
  run(image, "enemy_spawn_raiders");
  setLeader(image, 80, 112);
  image[L("light_fire_timer")] = 0;
  run(image, "light_update");
  const active = L("FIGHTER_PROJECTILE_ACTIVE");
  assert.deepEqual([light(image).x, light(image).y], [84, 100]);
  assert.equal(image[active + ENEMY_BASE], LIGHT_OWNER);
  assert.equal(image[L("FIGHTER_PROJECTILE_X") + ENEMY_BASE], 86);
  assert.equal(image[L("FIGHTER_PROJECTILE_Y") + ENEMY_BASE], 104);
  assert.equal(image[L("FIGHTER_PROJECTILE_LIFETIME") + ENEMY_BASE], 96);
  assert.deepEqual([...image.subarray(CHARSET + 120 * 8, CHARSET + 122 * 8)],
    [0xf0, 0xfc, 0x3f, 0x0f, 0x0f, 0x03, 0x03, 0x00,
      0x0f, 0x3f, 0xfc, 0xf0, 0xf0, 0xc0, 0xc0, 0x00]);

  // Emitter-independent shots: neither leader death frees the Light shot.
  for (const slot of [1, 0]) {
    image[L("ENEMY_TARGET_SLOT")] = slot;
    run(image, "spawn_interceptor_breakup_effects");
    assert.equal(image[active + ENEMY_BASE], LIGHT_OWNER);
  }

  // A full shared enemy pool drops the single shot rather than stealing a slot.
  image.fill(2, active + ENEMY_BASE, active + 10);
  image[L("light_fire_timer")] = 0;
  run(image, "light_update");
  assert.deepEqual([...image.subarray(active + ENEMY_BASE, active + 10)], [2, 2, 2, 2, 2]);
});

test("light_update installs the selected archetype's art into glyphs 120/121", () => {
  const art = new Map([
    [12, [0xf0, 0xfc, 0x3f, 0x0f, 0x0f, 0x03, 0x03, 0x00,
      0x0f, 0x3f, 0xfc, 0xf0, 0xf0, 0xc0, 0xc0, 0x00]],
    [24, [0xf0, 0xe0, 0x28, 0x09, 0x28, 0xe0, 0xf0, 0x00,
      0x0f, 0x0b, 0x28, 0x60, 0x28, 0x0b, 0x0f, 0x00]],
  ]);
  for (const [offset, bytes] of art) {
    const image = game(2);
    image[L("_encounter_light_index")] = offset === 24 ? 1 : 0;
    run(image, "enemy_spawn_raiders");
    assert.equal(image[L("light_archetype_offset")], offset);
    setLeader(image, 80, 112);
    image.fill(0x55, CHARSET + 120 * 8, CHARSET + 122 * 8);
    run(image, "light_update");
    assert.deepEqual([...image.subarray(CHARSET + 120 * 8, CHARSET + 122 * 8)], bytes,
      `archetype offset ${offset}`);
    assert.deepEqual([image[CHARSET + 119 * 8 + 7], image[CHARSET + 122 * 8]], [0, 0],
      "neighbouring glyphs untouched");
  }
  // Both 16-byte tables sit contiguously at the ENTITY_CODE tail, one page.
  const wingman = L("light_glyph");
  assert.equal(L("light_interceptor_glyph"), wingman + 16);
  assert.equal(L("light_glyph_end"), wingman + 32);
  assert.equal(wingman >> 8, (wingman + 31) >> 8, "no page crossing");
  // Death-frame deferral (2026-09-17): the 18-B player_dying_tick follows the
  // art tables, so they keep their addresses and the routine is the new tail.
  assert.equal(L("player_dying_tick"), L("light_glyph_end"));
  assert.equal(L("player_dying_tick") + 18, L("__ENTITY_CODE_RUN__") + L("__ENTITY_CODE_SIZE__"));
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
  image[L("player_x")] = 100;           // Light x 104: overlaps the player
  image[L("player_y")] = 100;
  run(image, "light_update");
  assert.equal(light(image).state, 0);
  assert.equal(image[0x4e5d], 0, "full player damage through the shared gate");
});

test("late publication erases PairShots first, then unwinds and republishes the Light", () => {
  const image = game();
  run(image, "enemy_spawn_raiders");
  image[L("light_x")] = 100;          // column (100-48)/4 = 13
  image[L("light_y")] = 100;          // top 96 -> ring row 9
  const left = cell(image, 9, 13);
  // Left: an OLD enemy PairShot over underlay $05. Right: a near star.
  image[left] = (90 | 0x80);
  image[left + 1] = 1;
  const slot = 6;
  image[L("FIGHTER_PROJECTILE_RENDERED") + slot] = 1;
  image[L("FIGHTER_PROJECTILE_SCREEN_LO") + slot] = left & 0xff;
  image[L("FIGHTER_PROJECTILE_SCREEN_HI") + slot] = left >> 8;
  image[L("FIGHTER_PROJECTILE_BACKUP_TOP") + slot] = 0x05;
  run(image, "light_publish");
  assert.equal(image[L("FIGHTER_PROJECTILE_RENDERED") + slot], 0, "PairShots are erased first");
  assert.deepEqual([image[left], image[left + 1]], [LIGHT_CODE_LEFT, LIGHT_CODE_LEFT + 1]);
  // Cell-major backing: slot 0's two cells are the first two bytes.
  assert.deepEqual([image[L("light_backing0")], image[L("light_backing0") + 1]], [0x05, 0x00],
    "shot underlay and CH_SPACE, never a PairShot or near-star glyph");
  assert.equal(image[L("light_screen_lo")] | image[L("light_screen_hi")] << 8, left);

  // Debris/effects rendered over the still-visible Light inherit its backing.
  const resolved = run(image, "light_cell_resolve", { a: LIGHT_CODE_LEFT + 1, x: 7, y: 1 });
  assert.deepEqual([resolved.a, resolved.x, resolved.y], [0x00, 7, 1]);
  assert.equal(run(image, "light_cell_resolve", { a: 0x33 }).a, 0x33, "other codes unchanged");
  assert.equal(run(image, "light_cell_resolve_sanitized", { a: 1 }).a, 0, "near star sanitised");

  // A lower layer overwrote the left cell; the Light then retires.
  image[left] = 0x77;
  image[L("light_state")] = 0;
  run(image, "light_publish");
  assert.deepEqual([image[left], image[left + 1]], [0x77, 0x00], "only still-owned cells restore");
  assert.equal(image[L("light_screen_hi")], 0);
  run(image, "light_publish");
  assert.deepEqual([image[left], image[left + 1]], [0x77, 0x00], "unpublish is idempotent");

  // The footprint never enters the recycled bottom ring row (Y 232-239).
  image[L("light_state")] = 1;
  image[L("light_y")] = 232;
  run(image, "light_publish");
  assert.equal(image[L("light_screen_hi")], 0);
  image[L("light_y")] = 231;
  run(image, "light_publish");
  assert.equal(image[L("light_screen_lo")] | image[L("light_screen_hi")] << 8, cell(image, 25, 13));
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
  image[L("light_screen_hi")] = 0x81; // retired but not yet unpublished late
  assert.equal(run(image, "sector_update_first_capital").a, 0);
  image[L("light_screen_hi")] = 0;
  assert.equal(run(image, "sector_update_first_capital").a, 1);
  assert.equal(image[state], 0);

  // REBASELINED: this used to poke a stale light_leaderless = 1 and prove the
  // fresh admission cleared it. That byte is gone - "leaderless" is now the
  // light_state VALUE - so a stale flag cannot outlive the retirement by
  // construction, and poking one here would instead read as a live slot and
  // block the re-admission the test is about.
  image[state] = 7;                   // post-capital OPEN
  // The provisional schedule advanced past Wingman on the first admission;
  // preset it back to demonstrate the fresh Wingman re-admission explicitly,
  // independent of the provisional Wingman/Interceptor smoke order.
  image[L("_encounter_light_index")] = 0;
  // 4.5c: the first admission also advanced the temporary Heavy scheduler to a
  // Bomber formation, which carries no Light escort; preset the Raider one.
  image[L("_encounter_heavy_index")] = 0;
  run(image, "enemy_spawn_raiders");
  assert.deepEqual([light(image).state, light(image).hp, light(image).leaderless], [1, 1, 0]);
});

test("hooks are operand-only redirections and the Light publishes only in the late window", () => {
  for (const [hook, count] of [
    ["entity_effects_update_with_light", 1],
    ["erase_fighter_projectile_overlays_with_light", 1],
    ["entity_player_fighter_projectile_target_with_light", 1],
    ["resolve_effect_backing_below_interactive_debris_and_light", 1],
    ["debris_capture_resolve", 1],
  ]) {
    assert.equal((mainSource.match(new RegExp(`jsr ${hook}\\b`, "g")) ?? []).length, count, hook);
  }
  // The fighter pickup's missile plane shares this window; it is published
  // between the Light's erase and the PairShot render, still post-playfield.
  assert.match(mainSource, new RegExp("jsr wait_frame_at_line\\s+fighter_projectile_publication_begin = \\*" +
    "[\\s\\S]*?jsr erase_fighter_projectile_overlays_with_light\\s+" +
    "(?:[^\\n]*\\n\\s*)*?jsr publish_fighter_pickup_pmg\\s+" +
    "fighter_projectile_publication_capital_render:\\s+jsr render_fighter_projectile_overlays"));
  assert.doesNotMatch(mainSource, /jsr entity_effects_(?:erase_with_white_starfield|render)_with_light/,
    "no frame-start Light erase and no mid-frame Light render");
  assert.doesNotMatch(lightSource,
    /\b(?:sta|stx|sty|inc|dec)\s+(?:LIGHT_STATE|LIGHT_HP|LIGHT_X|LIGHT_Y)\b/,
    "ASM never writes C-owned Light lifecycle, HP or position");
});
