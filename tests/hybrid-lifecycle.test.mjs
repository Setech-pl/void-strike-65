import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments, readRuntimeBytes } from "../scripts/runtime-image.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
const lifecycleSource = fs.readFileSync(path.join(root, "src/c/lifecycle.c"), "utf8");
const generatedSource = fs.readFileSync(
  path.join(root, "build/encounter-director-lifecycle-generated.s"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json"), "utf8"));

const labels = new Map();
for (const file of ["build/void-strike-65.lbl", "build/encounter-director.lbl",
  "build/integration-glue.lbl"]) {
  for (const line of fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) labels.set(match[2], Number.parseInt(match[1], 16));
  }
}

function memory() {
  const image = new Uint8Array(0x10000);
  installRuntimeSegments(image, root);
  return image;
}

function run(image, target, { a = 0, x = 0, y = 0 } = {}) {
  const address = typeof target === "string" ? labels.get(target) : target;
  assert.ok(Number.isInteger(address), `missing routine ${target}`);
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
  return { a: cpu.a, x: cpu.x, y: cpu.y, cycles: cpu.cycles };
}

test("C EnemyArchetype is a compact exact Raider record in legal extension placement", () => {
  assert.deepEqual([...readRuntimeBytes(root, labels.get("enemy_archetype_table"), 12)],
    [1, 0, 1, 5, 15, 60, 50, 40, 1, 1, 0x10, 1]);
  // Step 4.3: the 240 B of sector-transition C moved from the extension composite
  // (still carrying LIGHT_CODE) into the reusable resident window; 642 + 240 = 882.
  // The debris late-publication kernel then grew LIGHT_CODE by 70 B: 712 + 240.
  // Roadmap 4.4 (Interceptor): the third EnemyArchetype record, its pursuit/
  // burst C and the provisional encounter schedule add 164 B: 712 + 164 = 876.
  // 4.4c: enemy_c_light_tick returns the record's weapon_class (+2 B) = 878.
  // 4.5c (Bomber): the Heavy admission moved to HYBRID_C_ARENA while the Bomber
  // record and HEAVY_CODE member veneer joined the extension composite = 871.
  // 4.5d: the veneer publishes the per-member colour to COLPM1+slot (+9 B) = 880.
  assert.deepEqual(manifest.encounterDirector.director.placements.find(
    ({ name }) => name === "extension"), { name: "extension", runAddress: 0x8c7d, bytes: 880 });
  // 4.3 step 5: the drain clause left sector_c_update_first_capital for the
  // arena as sector_c_drain_clear, so the window composite loses 10 B.
  assert.deepEqual(manifest.encounterDirector.director.placements.find(
    ({ name }) => name === "window"), { name: "window", runAddress: 0x8602, bytes: 230 });
  assert.equal(manifest.encounterDirector.director.footprint.cStackBytes, 0);
  assert.equal(manifest.encounterDirector.director.footprint.zeroPageBytes, 0);
});

test("C initialization owns fighter state, Raider lifecycle, and the ASM profile cache", () => {
  for (const [difficulty, pause] of [[0, 60], [1, 50], [2, 40]]) {
    const image = memory();
    image[labels.get("DIFFICULTY_SETTING")] = difficulty;
    run(image, "director_init", { a: 0x6d });
    assert.equal(image[labels.get("CAPITAL_SECTOR_STATE")], 7);
    assert.equal(image[labels.get("ENEMY_ARCHETYPE")], 0);
    assert.equal(image[labels.get("ENEMY_ACTIVE")], 0);
    assert.deepEqual([...image.subarray(labels.get("enemy_profile_movement_id"),
      labels.get("enemy_profile_movement_id") + 9)],
    [0, 1, 5, 15, pause, 1, 1, 0x10, 1]);
  }
});

test("C maps the existing capital corridor phases and complete lifecycle exactly", () => {
  const image = memory();
  const state = labels.get("CAPITAL_SECTOR_STATE");
  const lo = 0x008c;
  const hi = labels.get("CORRIDOR_PHASE_HI");
  for (const [phase, expected] of [[0x001f, 0], [0x0020, 1], [0x006f, 1],
    [0x0070, 2], [0x016f, 2], [0x0170, 3], [0x01bf, 3], [0x01c0, 4],
    [0x01e7, 4], [0x01e8, 5], [0x0200, 5]]) {
    image[lo] = phase & 0xff;
    image[hi] = phase >> 8;
    run(image, "sector_update_capital_phase");
    assert.equal(image[state], expected, `phase $${phase.toString(16)}`);
  }

  run(image, "sector_begin_complete");
  assert.equal(image[state], 6);
  assert.equal(image[labels.get("ENTITY_SPAWN_TIMER_HI")], 27);
  image[0x80fe] = 0;
  for (let tick = 0; tick < 26; tick += 1) run(image, "sector_complete_scroll_tick");
  assert.equal(image[state], 6);
  run(image, "sector_complete_scroll_tick");
  assert.equal(image[state], 7);
  assert.equal(image[labels.get("ENTITY_SPAWN_TIMER_LO")], 32);
});

test("first-capital scheduling and future boss handoff stay high-level C decisions", () => {
  const image = memory();
  const state = labels.get("CAPITAL_SECTOR_STATE");
  const flags = 0x80fe;
  run(image, "director_init", { a: 0x6d });
  image[0x4ff8] = 599 & 0xff;
  image[0x4ff9] = 599 >> 8;
  assert.equal(run(image, "sector_update_first_capital").a, 0);
  assert.equal(image[state], 7);
  image[0x4ff8] = 600 & 0xff;
  image[0x4ff9] = 600 >> 8;
  image[labels.get("ENEMY_ACTIVE")] = 1;
  assert.equal(run(image, "sector_update_first_capital").a, 0);
  assert.deepEqual([image[state], image[flags]], [7, 0x80]);
  image[labels.get("ENEMY_ACTIVE")] = 0;
  assert.equal(run(image, "sector_update_first_capital").a, 1);
  assert.deepEqual([image[state], image[flags]], [0, 0x40]);

  image[state] = 2;
  image[flags] = 1;
  assert.equal(run(image, "sector_force_final_drain").a, 1);
  assert.equal(image[state], 5);
  image[state] = 6;
  assert.equal(run(image, "sector_force_final_drain").a, 0);
  assert.equal(image[state], 6);
  assert.match(fs.readFileSync(path.join(root, "src/c/lifecycle.h"), "utf8"),
    /SECTOR_BOSS_FUTURE = 8/);
});

test("C owns both Raider member lifecycles while ASM retains pending damage and effects", () => {
  const image = memory();
  run(image, "director_init", { a: 0x6d });
  run(image, "enemy_spawn_raiders");
  const member = labels.get("ENEMY_MEMBER_STATE");
  const hp = labels.get("ENEMY_HP");
  assert.deepEqual([...image.subarray(member, member + 2)], [1, 1]);
  assert.deepEqual([...image.subarray(hp, hp + 2)], [1, 1]);
  assert.deepEqual([image[labels.get("ENEMY_LIVE_COUNT")], image[labels.get("ENEMY_ACTIVE")]],
    [2, 1]);

  image[labels.get("ENEMY_TARGET_SLOT")] = 0;
  image[labels.get("ENEMY_PENDING_DAMAGE")] = 1;
  assert.equal(run(image, "enemy_apply_pending_damage").a, 1);
  assert.deepEqual([...image.subarray(member, member + 2)], [0, 1]);
  assert.deepEqual([...image.subarray(hp, hp + 2)], [0, 1]);
  image[labels.get("ENEMY_TARGET_SLOT")] = 1;
  image[labels.get("ENEMY_PENDING_DAMAGE") + 1] = 1;
  assert.equal(run(image, "enemy_apply_pending_damage").a, 1);
  assert.deepEqual([image[labels.get("ENEMY_LIVE_COUNT")], image[labels.get("ENEMY_ACTIVE")]],
    [0, 2]);
  run(image, "enemy_recycle");
  assert.equal(image[labels.get("ENEMY_ACTIVE")], 0);
});

test("ownership is singular and generated C requires neither software stack nor runtime helpers", () => {
  const ownerWrite = /\b(?:sta|stx|sty|inc|dec|asl|lsr|rol|ror)\s+(?:CAPITAL_SECTOR_STATE|ENEMY_ACTIVE|ENEMY_ARCHETYPE|ENEMY_MEMBER_STATE|ENEMY_HP|ENEMY_LIVE_COUNT)(?:\b|,)/;
  const releaseSource = mainSource.replace(
    /\.if ENEMY_REVIEW_HARNESS[\s\S]+?\.endif/g, "");
  assert.doesNotMatch(releaseSource, ownerWrite);
  for (const field of ["CAPITAL_SECTOR_STATE", "ENEMY_ACTIVE", "ENEMY_ARCHETYPE",
    "ENEMY_MEMBER_STATE_0", "ENEMY_MEMBER_STATE_1", "ENEMY_HP_0", "ENEMY_HP_1",
    "ENEMY_LIVE_COUNT"]) {
    assert.match(lifecycleSource, new RegExp(`${field}\\s*=`));
  }
  const executableGenerated = generatedSource.replace(/^\s*\.importzp.*$/gm, "");
  assert.doesNotMatch(executableGenerated,
    /\b(?:c_sp|sreg|regsave|regbank|tmp[1-4]|ptr[1-4])\b/);
  // _sector_c_drain_clear is 4.3 step 5: the capital entry's drain test, named
  // so roadmap 4.9's level boundary reuses it rather than writing a second one.
  // It is a C function in the arena calling out of the window composite, which
  // is why it appears here; it still needs no stack and no runtime helper.
  assert.deepEqual([...executableGenerated.matchAll(/\bjsr\s+([^\s;]+)/g)].map((match) => match[1]),
    ["_asm_sector_pressure_active", "_sector_c_drain_clear", "_heavy_publish_profile",
      "_encounter_light_admit",
      "_bomber_may_fire", "_bomber_turn", "_bomber_turn", "_bomber_turn", "_bomber_may_fire",
      "_bomber_colour", "_light_reload", "_encounter_light_schedule_advance"]);
});
