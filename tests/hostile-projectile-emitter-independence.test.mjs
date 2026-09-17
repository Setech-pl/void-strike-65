// Owner decision 2026-09-17: an already-emitted hostile PairShot becomes
// independent of its emitter and continues its normal lifecycle after the
// emitter dies. It still ends on player collision, lifetime expiry, leaving the
// playfield and every sector/global reset (player death, respawn, new game or
// quit). The ACTIVE owner bits remain an allocation/trace tag only.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
import { initialiseRuntime, requiredLabel, runRoutine } from "../scripts/weapon-pickup-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SLOT_BASE = 5;
const SLOT_COUNT = 10;
const SPEED = 2;
const PULSE = 1;
const BOMBER = 3;

function projectile(memory, labels, slot) {
  const at = (name) => memory[requiredLabel(labels, name) + slot];
  const address = at("FIGHTER_PROJECTILE_SCREEN_LO") | at("FIGHTER_PROJECTILE_SCREEN_HI") << 8;
  return {
    active: at("FIGHTER_PROJECTILE_ACTIVE"),
    rendered: at("FIGHTER_PROJECTILE_RENDERED"),
    x: at("FIGHTER_PROJECTILE_X"),
    y: at("FIGHTER_PROJECTILE_Y"),
    lifetime: at("FIGHTER_PROJECTILE_LIFETIME"),
    backing: at("FIGHTER_PROJECTILE_BACKUP_TOP"),
    address,
    visible: memory[address],
  };
}

const activeSlots = (memory, labels) => {
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  return Array.from({ length: SLOT_COUNT - SLOT_BASE }, (_, index) => SLOT_BASE + index)
    .filter((slot) => memory[active + slot] !== 0);
};

// Production order: OLD publication erase, simulation, NEW publication.
function frame(memory, labels) {
  runRoutine(memory, labels, "erase_fighter_projectile_overlays");
  runRoutine(memory, labels, "update_fighter_projectiles");
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  memory[requiredLabel(labels, "frame_counter")] =
    (memory[requiredLabel(labels, "frame_counter")] + 1) & 0xff;
}

// Two live, fully visible Raiders; one shot from `emitter`, rendered.
function raiderWithShot(artifact, emitter) {
  const { memory, labels } = initialiseRuntime(root, artifact);
  const set = (name, value, offset = 0) => { memory[requiredLabel(labels, name) + offset] = value; };
  set("ENEMY_ARCHETYPE", 0);
  set("ENEMY_ACTIVE", 1);
  set("ENEMY_LIVE_COUNT", 2);
  for (const slot of [0, 1]) {
    set("ENEMY_MEMBER_STATE", 1, slot);
    set("ENEMY_HP", 1, slot);
    set("ENEMY_X", slot === 0 ? 88 : 144, slot);
    set("ENEMY_Y", slot === 0 ? 48 : 64, slot);
  }
  set("PLAYER_LIFECYCLE", 0);
  set("player_x", 200);                       // far from the shot column
  set("player_y", 200);
  set("ENEMY_TARGET_SLOT", emitter);
  runRoutine(memory, labels, "allocate_interceptor_projectile");
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  const [slot] = activeSlots(memory, labels);
  assert.equal(slot, SLOT_BASE);
  // Unlinked equates (src/main.s): BROAD_DAMAGE_COOLDOWN = BROAD_PLAYER_HEALTH+1,
  // PLAYER_LIVES = PLAYER_LIFECYCLE+1.
  labels.set("BROAD_PLAYER_HEALTH", requiredLabel(labels, "BROAD_DAMAGE_COOLDOWN") - 1);
  labels.set("PLAYER_LIVES", requiredLabel(labels, "PLAYER_LIFECYCLE") + 1);
  return { memory, labels, slot, set };
}

function killRaider(memory, labels, set, emitter) {
  set("ENEMY_PENDING_DAMAGE", 1, emitter);
  set("ENEMY_PENDING_SOURCE", 0, emitter);
  runRoutine(memory, labels, "resolve_enemy_damage");
  assert.equal(memory[requiredLabel(labels, "ENEMY_MEMBER_STATE") + emitter], 0,
    "the emitter is destroyed");
}

test("Raider shot survives its emitter's destruction and keeps moving and ageing", () => {
  for (const artifact of ["xex", "atr"]) {
    for (const emitter of [0, 1]) {
      const { memory, labels, slot, set } = raiderWithShot(artifact, emitter);
      const emitted = projectile(memory, labels, slot);
      assert.equal(emitted.active, 0x02 | emitter | PULSE << 3);
      killRaider(memory, labels, set, emitter);
      assert.equal(projectile(memory, labels, slot).active, emitted.active,
        `${artifact} P${emitter + 1}: the kill leaves the shot active`);

      let previous = projectile(memory, labels, slot);
      for (let step = 1; step <= 12; step += 1) {
        const oldAddress = previous.address;
        const oldBacking = previous.backing;
        frame(memory, labels);
        const now = projectile(memory, labels, slot);
        assert.equal(now.active, emitted.active, `frame ${step} active`);
        assert.equal(now.y, previous.y + SPEED, `frame ${step} moves`);
        assert.equal(now.lifetime, previous.lifetime - 1, `frame ${step} ages`);
        assert.equal(now.rendered, 0xff, `frame ${step} published`);
        assert.notEqual(now.visible, now.backing, `frame ${step} glyph visible`);
        if (oldAddress !== now.address)
          assert.equal(memory[oldAddress], oldBacking, `frame ${step} old cell restored`);
        previous = now;
      }
    }
  }
});

test("both Raiders dying (formation over) keeps every released shot; the pool drains cleanly", () => {
  const { memory, labels, set } = raiderWithShot("xex", 0);
  set("ENEMY_TARGET_SLOT", 1);
  runRoutine(memory, labels, "allocate_interceptor_projectile");
  runRoutine(memory, labels, "erase_fighter_projectile_overlays");
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  assert.deepEqual(activeSlots(memory, labels), [5, 6]);
  const cells = [5, 6].map((slot) => projectile(memory, labels, slot));
  killRaider(memory, labels, set, 0);
  killRaider(memory, labels, set, 1);
  assert.deepEqual(activeSlots(memory, labels), [5, 6]);

  // Natural expiry: no stale slot, no leftover glyph, the whole pool reusable.
  for (let step = 0; step < 200 && activeSlots(memory, labels).length; step += 1)
    frame(memory, labels);
  runRoutine(memory, labels, "erase_fighter_projectile_overlays");
  assert.deepEqual(activeSlots(memory, labels), []);
  for (const slot of [5, 6]) {
    const record = projectile(memory, labels, slot);
    assert.equal(record.rendered, 0, `slot ${slot} holds no visible ownership`);
    assert.equal(memory[record.address], record.backing, `slot ${slot} last cell restored`);
  }
  assert.ok(cells.every((cell) => memory[cell.address] === cell.backing));
  set("ENEMY_MEMBER_STATE", 1, 0);
  set("ENEMY_TARGET_SLOT", 0);
  for (let count = 0; count < 5; count += 1)
    runRoutine(memory, labels, "allocate_interceptor_projectile");
  assert.deepEqual(activeSlots(memory, labels), [5, 6, 7, 8, 9], "no pool leak");
});

test("an orphaned shot still ends on player collision, lifetime expiry and the playfield edge", () => {
  // Collision.
  {
    const { memory, labels, slot, set } = raiderWithShot("xex", 0);
    killRaider(memory, labels, set, 0);
    const shot = projectile(memory, labels, slot);
    set("BROAD_PLAYER_HEALTH", 10);
    set("BROAD_DAMAGE_COOLDOWN", 0);
    set("BROAD_DAMAGE_APPLIED", 0);
    set("player_x", shot.x - 2);
    set("player_y", shot.y + SPEED);
    frame(memory, labels);
    assert.equal(projectile(memory, labels, slot).active, 0, "collision consumes the shot");
    assert.equal(memory[requiredLabel(labels, "BROAD_PLAYER_HEALTH")], 9, "one damage unit");
    runRoutine(memory, labels, "erase_fighter_projectile_overlays");
    assert.equal(memory[shot.address], shot.backing, "no backing artifact");
    assert.equal(projectile(memory, labels, slot).rendered, 0);
  }
  // Lifetime expiry.
  {
    const { memory, labels, slot, set } = raiderWithShot("xex", 1);
    killRaider(memory, labels, set, 1);
    set("FIGHTER_PROJECTILE_LIFETIME", 2, slot);
    frame(memory, labels);
    assert.notEqual(projectile(memory, labels, slot).active, 0);
    const last = projectile(memory, labels, slot);
    frame(memory, labels);
    assert.equal(projectile(memory, labels, slot).active, 0, "expiry frees the slot");
    assert.equal(memory[last.address], last.backing);
  }
  // Leaving the playfield.
  {
    const { memory, labels, slot, set } = raiderWithShot("xex", 0);
    killRaider(memory, labels, set, 0);
    runRoutine(memory, labels, "erase_fighter_projectile_overlays");
    set("FIGHTER_PROJECTILE_Y", 226, slot);
    set("FIGHTER_PROJECTILE_PREV_Y", 226, slot);
    runRoutine(memory, labels, "render_fighter_projectile_overlays");
    let last = projectile(memory, labels, slot);
    for (let step = 0; step < 8 && projectile(memory, labels, slot).active; step += 1) {
      last = projectile(memory, labels, slot);
      frame(memory, labels);
    }
    assert.equal(projectile(memory, labels, slot).active, 0, "the bottom edge frees it");
    assert.equal(memory[last.address], last.backing);
  }
});

test("sector/global resets still clear an orphaned shot and restore its cell", () => {
  // Player death (clear_interceptor_pulses) and respawn (clear_fighter_projectiles)
  // erase the published cell; new game / quit (init_fighter_projectiles) zero
  // the whole projectile state before the screen is rebuilt.
  for (const reset of ["clear_interceptor_pulses", "clear_fighter_projectiles",
    "init_fighter_projectiles"]) {
    const { memory, labels, slot, set } = raiderWithShot("xex", 0);
    killRaider(memory, labels, set, 0);
    frame(memory, labels);
    const shot = projectile(memory, labels, slot);
    assert.equal(shot.rendered, 0xff);
    runRoutine(memory, labels, reset);
    assert.deepEqual(activeSlots(memory, labels), [], `${reset} clears the pool`);
    assert.equal(projectile(memory, labels, slot).rendered, 0, `${reset} drops ownership`);
    if (reset !== "init_fighter_projectiles")
      assert.equal(memory[shot.address], shot.backing, `${reset} restores the cell`);
  }
  // A lethal player hit (game over path) clears it through apply_player_damage.
  const { memory, labels, slot, set } = raiderWithShot("xex", 1);
  killRaider(memory, labels, set, 1);
  set("BROAD_PLAYER_HEALTH", 1);
  set("BROAD_DAMAGE_COOLDOWN", 0);
  set("BROAD_DAMAGE_APPLIED", 0);
  set("PLAYER_LIVES", 0);
  runRoutine(memory, labels, "apply_player_damage", { a: 10 });
  assert.notEqual(memory[requiredLabel(labels, "PLAYER_LIFECYCLE")], 0);
  assert.equal(projectile(memory, labels, slot).active, 0, "player death clears the shot");
});

test("a future Bomber-class shell is emitter-independent and keeps its own rate", () => {
  const { memory, labels, slot, set } = raiderWithShot("xex", 0);
  // Retag the live record as weapon_class BOMBER; no emitter is consulted.
  set("FIGHTER_PROJECTILE_ACTIVE", 0x02 | BOMBER << 3, slot);
  killRaider(memory, labels, set, 0);
  set("ENEMY_ACTIVE", 0);
  set("frame_counter", 0);
  const start = projectile(memory, labels, slot);
  for (let step = 0; step < 8; step += 1) frame(memory, labels);
  const now = projectile(memory, labels, slot);
  assert.equal(now.active, 0x02 | BOMBER << 3);
  assert.equal(now.y, start.y + 4 * SPEED, "every second frame");
  assert.equal(now.lifetime, start.lifetime - 4);
});

// ---- Light / Interceptor (same harness as tests/light-wingman.test.mjs) ----

const lightLabels = new Map();
for (const file of ["build/void-strike-65.lbl", "build/encounter-director.lbl",
  "build/integration-glue.lbl"]) {
  for (const line of fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) lightLabels.set(match[2], Number.parseInt(match[1], 16));
  }
}
const L = (name) => requiredLabel(lightLabels, name);

function lightGame(archetypeIndex) {
  const image = new Uint8Array(0x10000);
  installRuntimeSegments(image, root);
  for (let row = 0; row < 27; row += 1) {
    const address = 0x8140 + row * 40;
    image[L("PLAYFIELD_ROW_LO") + row] = address & 0xff;
    image[L("PLAYFIELD_ROW_HI") + row] = address >> 8;
  }
  image[L("DIFFICULTY_SETTING")] = 2;
  run(image, "director_init", { a: 0x6d });
  image[L("_encounter_light_index")] = archetypeIndex;
  run(image, "enemy_spawn_raiders");
  return image;
}

function run(image, name, { a = 0, x = 0, y = 0 } = {}) {
  const cpu = new Nmos6502(image);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = L(name);
  cpu.a = a;
  cpu.x = x;
  cpu.y = y;
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
  return cpu;
}

test("Light Wingman and Interceptor shots survive the Light's destruction", () => {
  for (const [archetypeIndex, offset, weaponClass] of [[0, 12, PULSE], [1, 24, 2]]) {
    const image = lightGame(archetypeIndex);
    assert.equal(image[L("light_archetype_offset")], offset);
    image[L("ENEMY_MEMBER_STATE")] = 1;
    image[L("ENEMY_X")] = 80;
    image[L("ENEMY_Y")] = 112;
    image[L("PLAYER_LIFECYCLE")] = 0;
    image[L("player_x")] = 200;
    image[L("player_y")] = 60;
    if (offset === 24) image[L("light_y")] = 100;  // leaderless: fully visible
    image[L("light_fire_timer")] = 0;
    run(image, "light_update");
    const active = L("FIGHTER_PROJECTILE_ACTIVE");
    const tag = 0x06 | weaponClass << 3;
    assert.equal(image[active + SLOT_BASE], tag, `offset ${offset}: shot emitted`);
    run(image, "render_fighter_projectile_overlays");

    // Kill the Light with a player PairShot in slot 0.
    image[active] = 1;
    image[L("FIGHTER_PROJECTILE_X")] = image[L("light_x")] + 2;
    image[L("FIGHTER_PROJECTILE_Y")] = (image[L("light_y")] & 0xf8) + 4;
    run(image, "light_shot", { x: 0 });
    assert.equal(image[L("light_state")], 0, `offset ${offset}: Light destroyed`);
    assert.equal(image[active + SLOT_BASE], tag, `offset ${offset}: shot still active`);

    const y = image[L("FIGHTER_PROJECTILE_Y") + SLOT_BASE];
    const lifetime = image[L("FIGHTER_PROJECTILE_LIFETIME") + SLOT_BASE];
    const stepMasks = [0, 0, 1];
    let steps = 0;
    for (let frameIndex = 0; frameIndex < 6; frameIndex += 1) {
      image[L("frame_counter")] = frameIndex;
      if ((frameIndex & stepMasks[weaponClass - 1]) === 0) steps += 1;
      run(image, "erase_fighter_projectile_overlays");
      run(image, "update_fighter_projectiles");
      run(image, "render_fighter_projectile_overlays");
    }
    assert.equal(image[active + SLOT_BASE], tag);
    assert.equal(image[L("FIGHTER_PROJECTILE_Y") + SLOT_BASE], y + steps * SPEED);
    assert.equal(image[L("FIGHTER_PROJECTILE_LIFETIME") + SLOT_BASE], lifetime - steps);
    assert.equal(image[L("FIGHTER_PROJECTILE_RENDERED") + SLOT_BASE], 0xff);

    // A later leader death does not remove the Light's shot either.
    image[L("ENEMY_TARGET_SLOT")] = 0;
    run(image, "spawn_interceptor_breakup_effects");
    assert.equal(image[active + SLOT_BASE], tag);

    // Reset still clears and restores.
    const address = image[L("FIGHTER_PROJECTILE_SCREEN_LO") + SLOT_BASE] |
      image[L("FIGHTER_PROJECTILE_SCREEN_HI") + SLOT_BASE] << 8;
    const backing = image[L("FIGHTER_PROJECTILE_BACKUP_TOP") + SLOT_BASE];
    run(image, "clear_interceptor_pulses");
    assert.equal(image[active + SLOT_BASE], 0);
    assert.equal(image[address], backing);
  }
});
