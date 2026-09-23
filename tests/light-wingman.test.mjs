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

// Light multiplicity step 4: the one-expensive-event token keys on
// FRAME_COUNTER, so a harness that never advances it would spend the token on
// the first consumer and starve every later one FOREVER - one frame, forever.
// The per-frame entries advance it here, which is what the runtime does.
// light_shot is included because handle_collisions is the FIRST Light entry
// of a runtime frame, before the tick: a kill therefore meets a fresh token,
// which is exactly what these kill tests are about. The frame where a kill
// and a volley SHARE one token is constructed deliberately in
// tests/light-multiplicity.test.mjs, not stumbled into here.
const FRAME_ENTRIES = new Set(["light_update", "enemy_light_tick", "light_shot",
  "enemy_spawn_raiders"]);
// Owner fix (a), 2026-09-21: light_publish's RENDER loop walks light_slot_limit,
// which enemy_c_light_wave derives once per frame. In the runtime that always
// precedes it - light_update runs earlier in the same frame - so a test that
// calls light_publish on its own has to establish the same order.
function refreshSlotLimit(image) {
  const cpu = new Nmos6502(image);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = L("enemy_light_wave");
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) cpu.step();
}
function run(image, target, { a = 0, x = 0, y = 0 } = {}) {
  if (typeof target === "string" && FRAME_ENTRIES.has(target)) {
    image[L("frame_counter")] = (image[L("frame_counter")] + 1) & 0xff;
  }
  if (target === "light_publish") refreshSlotLimit(image);
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
// Step 2: the appearance install is hoisted out of every frame onto the
// admission frame, so a freshly admitted Light spends its FIRST tick returning
// LIGHT_RETURN_INSTALL instead of 0. The tick body still runs in full there -
// motion, retirement and fire cadence are all unchanged - so only that one
// return differs, and the frame indices below are the same as before.
const LIGHT_RETURN_INSTALL = 0x40;
const LIGHT_X_ENTRY = 124;
const SLOT = 0;
const LIGHT_BREAKUP_PENDING = 3;
const light = (image, slot = SLOT) => ({
  raw: image[L("light_state") + slot],
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
  // basicWindow.usedBytes counts BOTH window links since 2026-09-21 (finding
  // F6); the Director link's half alone is directorHalfBytes, which is what
  // this boundary is made of.
  assert.equal(kernel.address,
    manifest.residentCapacity.basicWindow.address +
      manifest.residentCapacity.basicWindow.directorHalfBytes);
  assert.equal(manifest.residentCapacity.basicWindow.address +
    manifest.residentCapacity.basicWindow.usedBytes, kernel.endExclusive);
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
  // 77 after plan §4.6's rotate-marker store in advance_starfield_layers:
  // ENTITY_CODE itself is unchanged, but the 6 new STARFIELD bytes re-pack the
  // starfield runtime stream (1,780 -> 1,785 packed B), which is what this
  // margin is measured against.
  // 81 after music v2 §10.2: the v1 gameplay player's four-byte self-modified
  // read tail left ENTITY_CODE with the v1 player (the format-2 encoding
  // reaches a column through a one-byte offset and needs no pointer), so the
  // margin grew by exactly those four bytes. A deliberate SHRINK of
  // ENTITY_CODE, re-recorded here with its reason.
  // 84 after capital-hulls v2 (hull set v1): ENTITY_CODE is byte-identical and
  // every segment keeps its address, but the new hull art packs smaller, so the
  // ENTITY_CODE runtime stream lands 3 B shorter (packedBytes 2,727 -> 2,724)
  // and the margin GROWS by exactly those three bytes. A deliberate shrink of
  // the packed stream, re-recorded here with its reason.
  // 7 after owner decision A' (2026-09-23), the main-menu background stars cut
  // to sixteen: ENTITY_CODE is byte-identical again (the display-list growth
  // and the one-shot star draw fit inside alignment padding that was already
  // there), but the sky's 49 incompressible bytes in STARFIELD re-pack that
  // stream 1,701 -> 1,749 B, and as the §4.6 note above says this margin is
  // measured against it. 7 B is legal but it is now the scarcest number in the
  // transport: the next thing added to STARFIELD hits this wall, and the $4801
  // pickup-staging margin (16 B), long before it reaches the 1,825-B packed
  // gate. Flagged for the owner in STATUS.
  assert.equal(manifest.entityEffects.stagingToBroadsideMarginBytes, 7,
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
    // Step 3: every admission goes through light_admit, which gives the slot a
    // defined entry column instead of leaving the escort's x whatever the slot
    // last held. The escort overwrites it from its leader on its first tick,
    // so only this moment can see the difference.
    assert.deepEqual(light(image), {
      raw: 1, state: 1, hp: 1, x: LIGHT_X_ENTRY, y: 0, timer: pause, leaderless: 0,
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
  assert.equal(fires[0], LIGHT_RETURN_INSTALL, "the admission frame installs the appearance");
  assert.deepEqual(
    fires.flatMap((value, frame) => value && value !== LIGHT_RETURN_INSTALL ? [frame] : []),
    [64, 129, 194], "the cadence itself is unchanged by the hoist");
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
  // The admission frame belongs to the appearance install, and this is where
  // the 16-byte bitmap copy now happens - once, not on every frame. Only after
  // it has been spent can a poked fire timer produce a shot.
  run(image, "light_update");
  assert.deepEqual([...image.subarray(CHARSET + 120 * 8, CHARSET + 122 * 8)],
    [0xf0, 0xfc, 0x3f, 0x0f, 0x0f, 0x03, 0x03, 0x00,
      0x0f, 0x3f, 0xfc, 0xf0, 0xf0, 0xc0, 0xc0, 0x00],
  "the install frame wrote the Wingman bitmap");
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
  // Step 4: a contact kill happens inside light_update, AFTER the tick, so it
  // competes with the tick's own fire or install for that frame's one
  // expensive event. Here the tick took it, so the kill is deferred: the slot
  // is erased, scored and sounded now and parks in BREAKUP_PENDING, which is
  // not live, not hittable and never redrawn.
  assert.equal(light(image).raw, LIGHT_BREAKUP_PENDING);
  assert.equal(image[0x4e5d], 0, "full player damage through the shared gate");
  // The next frame's token frees the slot and spawns the fragments.
  run(image, "light_update");
  assert.equal(light(image).raw, 0, "the deferred breakup spawns one frame later");
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
  // REBASELINED for step 1c: the resolver is keyed by SCREEN ADDRESS, so the
  // caller's dst_ptr is now part of the question and not just the code.
  const resolveAt = (address, options) => {
    image[L("dst_ptr")] = address & 0xff;
    image[L("dst_ptr") + 1] = address >> 8;
    return run(image, "light_cell_resolve", options);
  };
  const resolved = resolveAt(left + 1, { a: LIGHT_CODE_LEFT + 1, x: 7, y: 1 });
  assert.deepEqual([resolved.a, resolved.x, resolved.y], [0x00, 7, 1]);
  assert.equal(resolveAt(left, { a: LIGHT_CODE_LEFT }).a, 0x05, "cell 0 gets its own backing");
  assert.equal(resolveAt(left, { a: 0x33 }).a, 0x33, "other codes unchanged");
  // The contract the address key exists for: the SAME code at a cell no slot
  // published is left alone. Under the old code-keyed resolver this returned
  // slot 0's backing and would have corrupted a second slot's cell.
  assert.equal(resolveAt(left + 40, { a: LIGHT_CODE_LEFT }).a, LIGHT_CODE_LEFT,
    "a Light code at an address no slot owns keeps its capture");
  assert.equal(resolveAt(left - 1, { a: LIGHT_CODE_LEFT + 1 }).a, LIGHT_CODE_LEFT + 1,
    "one cell before the published pair is not owned either");
  // X and Y are preserved on every path (debris captures cell 1 with Y = 1).
  const missed = resolveAt(left + 40, { a: LIGHT_CODE_LEFT, x: 7, y: 1 });
  assert.deepEqual([missed.x, missed.y], [7, 1]);
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

// Step 1c. The resolver's whole reason for changing: with several slots the
// code no longer names a cell, because two slots may carry the SAME code and
// slot count and code count are independent. Only the ASM contract is driven
// here - the render/erase loops are still single-slot until step 3 - so the
// other slots' published state is written directly, which is what ASM does.
test("the resolver answers by screen address, so two slots sharing a code stay apart", () => {
  const image = game();
  run(image, "enemy_spawn_raiders");
  image[L("light_x")] = 100;
  image[L("light_y")] = 100;
  const zero = cell(image, 9, 13);
  image[zero] = 0x05;                      // plain underlay the publish captures
  image[zero + 1] = 0x06;
  run(image, "light_publish");
  assert.equal(image[L("light_screen_lo")] | image[L("light_screen_hi")] << 8, zero);

  // Slot 1 publishes the SAME code pair two rows down, with its own backing.
  // REBASELINED for owner fix (a), 2026-09-21: screen_hi is no longer the
  // whole of what publication writes. light_publish also raises
  // light_screen_slot_limit, which is the bound the resolver scans, so a test
  // that fabricates a published slot has to fabricate that too - exactly as
  // it already fabricates screen_lo, screen_hi and the backing.
  const one = cell(image, 11, 20);
  image[L("light_screen_lo") + 1] = one & 0xff;
  image[L("light_screen_hi") + 1] = one >> 8;
  image[L("_light_screen_slot_limit")] = 2;
  image[L("light_backing0") + 2] = 0x41;   // cell-major: slot 1, cell 0
  image[L("light_backing0") + 3] = 0x42;   // slot 1, cell 1

  const resolveAt = (address, a) => {
    image[L("dst_ptr")] = address & 0xff;
    image[L("dst_ptr") + 1] = address >> 8;
    return run(image, "light_cell_resolve", { a, x: 7, y: 1 });
  };
  // Same code at four addresses; four different answers, each the owner's own.
  assert.equal(resolveAt(zero, LIGHT_CODE_LEFT).a, 0x05, "slot 0 cell 0");
  assert.equal(resolveAt(zero + 1, LIGHT_CODE_LEFT).a, 0x06, "slot 0 cell 1");
  assert.equal(resolveAt(one, LIGHT_CODE_LEFT).a, 0x41, "slot 1 cell 0");
  assert.equal(resolveAt(one + 1, LIGHT_CODE_LEFT).a, 0x42, "slot 1 cell 1");
  // A slot that is not on screen owns nothing, whatever its stale bytes say.
  image[L("light_screen_hi") + 1] = 0;
  assert.equal(resolveAt(one, LIGHT_CODE_LEFT).a, LIGHT_CODE_LEFT,
    "screen_hi = 0 means the slot is not on screen and owns no cell");
  // X and Y survive the slot scan on both paths.
  const kept = resolveAt(one, LIGHT_CODE_LEFT);
  assert.deepEqual([kept.x, kept.y], [7, 1]);
});

// Step 2, plan §5.4. The saving is only real if the copy stops happening, so
// prove that directly rather than through a cycle count: scribble on the glyph
// pair after the admission frame and watch it stay scribbled.
test("the appearance install runs on the admission frame only, not every frame", () => {
  const image = game();
  const wingman = [0xf0, 0xfc, 0x3f, 0x0f, 0x0f, 0x03, 0x03, 0x00,
    0x0f, 0x3f, 0xfc, 0xf0, 0xf0, 0xc0, 0xc0, 0x00];
  image.fill(0, CHARSET + 120 * 8, CHARSET + 122 * 8);
  run(image, "enemy_spawn_raiders");
  setLeader(image, 100, 100);
  assert.deepEqual([...image.subarray(CHARSET + 120 * 8, CHARSET + 122 * 8)],
    new Array(16).fill(0), "admission alone installs nothing: the tick does");

  // Only through light_update: asking the tick directly CONSUMES the decision,
  // because C marks the pair installed as it returns $40 and relies on the
  // kernel to act on that same return. Nothing calls the tick twice a frame.
  run(image, "light_update");
  assert.deepEqual([...image.subarray(CHARSET + 120 * 8, CHARSET + 122 * 8)], wingman);

  // From here the kernel must not touch the pair again for this Light's life.
  image.fill(0x5a, CHARSET + 120 * 8, CHARSET + 122 * 8);
  for (let frame = 0; frame < 40; frame += 1) {
    setLeader(image, 100, 100);
    run(image, "light_update");
  }
  assert.deepEqual([...image.subarray(CHARSET + 120 * 8, CHARSET + 122 * 8)],
    new Array(16).fill(0x5a), "40 frames of a live Light rewrite nothing");

  // A new game re-installs: copy_charset has rebuilt glyphs 120-125, so the
  // bookkeeping must be reset or the Light would render the frontend's art.
  run(image, "director_init", { a: 0x6d });
  image[L("DIFFICULTY_SETTING")] = 2;
  run(image, "enemy_spawn_raiders");
  setLeader(image, 100, 100);
  run(image, "light_update");
  assert.deepEqual([...image.subarray(CHARSET + 120 * 8, CHARSET + 122 * 8)], wingman,
    "lifecycle_c_init forgets what the pairs held, so a new game re-installs");
});

// Owner instruction 2026-09-21, the question fix (a) left open: WHERE the slot
// limit lowers. It lowers once, at the top of light_update, which is AFTER
// handle_collisions - so a slot killed this frame can fall outside the limit
// while its cells are still on screen. The invariant is therefore NOT "nothing
// above the limit carries screen_hi"; that is briefly false by construction.
// What must hold is that no LIMIT-GATED consumer needs a slot above the limit,
// and the one consumer that keys on screen_hi - the erase loop - is not gated.
// This pins that: kill the HIGHER of two slots and the limit drops beneath it,
// and its cells must still come back in the same late window.
test("a slot above the lowered limit is still erased", () => {
  const image = game();
  run(image, "enemy_spawn_raiders");
  image[L("light_x")] = 100;
  image[L("light_y")] = 100;
  const zero = cell(image, 9, 13);
  // Slot 1 lives two rows down, with its own underlay to restore.
  image[L("light_state") + 1] = 2;
  image[L("light_x") + 1] = 120;
  image[L("light_y") + 1] = 116;
  const one = cell(image, 11, 18);
  image[one] = 0x41;
  image[one + 1] = 0x42;
  run(image, "light_publish");
  assert.equal(image[L("light_screen_hi") + 1] !== 0, true, "slot 1 published");
  assert.deepEqual([image[one], image[one + 1]], [LIGHT_CODE_LEFT, LIGHT_CODE_LEFT + 1]);
  assert.deepEqual([image[L("light_backing0") + 2], image[L("light_backing0") + 3]],
    [0x41, 0x42], "slot 1 captured its own underlay");

  // Slot 1 dies. Its state goes to 0 now; its cells stay on screen until the
  // next late window. The limit will drop to 1 and leave it outside.
  image[L("light_state") + 1] = 0;
  run(image, "light_publish");
  assert.equal(image[L("_light_slot_limit")], 1,
    "the limit dropped beneath the slot that still carried screen_hi");
  assert.deepEqual([image[one], image[one + 1]], [0x41, 0x42],
    "the ungated erase loop restored a slot the limit had already excluded");
  assert.equal(image[L("light_screen_hi") + 1], 0, "and cleared its screen_hi");
  // Slot 0 is untouched by any of it.
  assert.equal(image[zero], LIGHT_CODE_LEFT);
});

// Owner fix (a), 2026-09-21. light_cell_resolve no longer walks all four
// slots: it walks light_screen_slot_limit, which light_publish maintains from
// screen_hi - zeroed as the full-width erase loop clears each slot, raised as
// the render loop sets one. The bound is therefore NOT light_slot_limit, and
// the two must not be confused: the state-derived one drops beneath a slot
// killed this frame while its cells are still on screen, and a resolver gated
// on THAT would hand a lower layer a Light glyph as its backing.
//
// This pins the published-slot bound at the two places it can be wrong: inside
// the render loop, where a lower slot captures over a higher slot published
// moments earlier in the same call, and after the kill, where the state limit
// has dropped away beneath a slot whose cells have not been erased yet.
test("a published slot above the state limit is still resolved", () => {
  const image = game();
  run(image, "enemy_spawn_raiders");
  // Slot 2 - the highest occupied - and slot 0 on the SAME two cells, so the
  // render loop publishes slot 2 first (it descends) and slot 0 then captures
  // a cell slot 2 owns. Under the raise, slot 0's backing is slot 2's
  // underlay; without it, slot 0 would capture the Light code itself and the
  // late erase would resurrect a Light glyph over a live cell.
  image[L("light_state") + 2] = 2;
  image[L("light_x") + 2] = 120;
  image[L("light_y") + 2] = 116;
  image[L("light_state") + 1] = 2;
  image[L("light_x") + 1] = 120;
  image[L("light_y") + 1] = 116;
  // Slot 0 stays where the Wingman admission put it, well away from the pair.
  image[L("light_x")] = 100;
  image[L("light_y")] = 100;
  const shared = cell(image, 11, 18);
  image[shared] = 0x41;
  image[shared + 1] = 0x42;

  run(image, "light_publish");
  assert.equal(image[L("_light_slot_limit")], 3, "three slots occupied");
  assert.equal(image[L("_light_screen_slot_limit")], 3,
    "the published-slot bound covers the highest slot that reached screen_hi");
  assert.notEqual(image[L("light_screen_hi") + 2], 0, "slot 2 published");
  assert.deepEqual([image[L("light_backing0") + 4], image[L("light_backing0") + 5]],
    [0x41, 0x42], "slot 2 captured the real underlay");
  assert.deepEqual([image[L("light_backing0") + 2], image[L("light_backing0") + 3]],
    [0x41, 0x42],
    "slot 1 captured the underlay BELOW slot 2, not slot 2's own Light code");

  // The resolver, asked from outside light_publish as effects and debris ask
  // it, must still find slot 2 through the maintained bound.
  const resolveAt = (address, options) => {
    image[L("dst_ptr")] = address & 0xff;
    image[L("dst_ptr") + 1] = address >> 8;
    return run(image, "light_cell_resolve", options);
  };
  assert.equal(resolveAt(shared, { a: LIGHT_CODE_LEFT }).a, 0x41,
    "a captured Light cell resolves to its backing");

  // THE CASE THE BOUND EXISTS FOR. Slot 2 dies: light_slot_limit drops to 1,
  // beneath it, while its cells are still on screen until the next late
  // window. The published-slot bound must NOT follow it down.
  image[L("light_state") + 2] = 0;
  image[L("light_state") + 1] = 0;
  refreshSlotLimit(image);
  assert.equal(image[L("_light_slot_limit")], 1, "the state limit dropped beneath slot 2");
  assert.equal(image[L("_light_screen_slot_limit")], 3,
    "the published-slot bound still covers it, because its cells still exist");
  assert.equal(resolveAt(shared, { a: LIGHT_CODE_LEFT }).a, 0x41,
    "and the resolver still finds the slot the state limit excluded");

  // Negative control, so the assertions above cannot pass vacuously: the
  // resolver really is gated on this byte, and a bound that failed to cover
  // slot 2 would hand the capture straight back.
  image[L("_light_screen_slot_limit")] = 1;
  assert.equal(resolveAt(shared, { a: LIGHT_CODE_LEFT }).a, LIGHT_CODE_LEFT,
    "a bound that excludes a published slot loses its backing - the failure this pins");
  image[L("_light_screen_slot_limit")] = 3;

  // And the erase still restores both cells, bound or no bound: it is the one
  // consumer that stays full-width.
  run(image, "light_publish");
  assert.deepEqual([image[shared], image[shared + 1]], [0x41, 0x42]);
  assert.equal(image[L("_light_screen_slot_limit")], 1,
    "after the erase the bound describes only what is published now");
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
