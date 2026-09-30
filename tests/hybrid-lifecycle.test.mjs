import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments, readRuntimeBytes } from "../scripts/runtime-image.mjs";
import {
  compileLevel, defaultHullAsset, LEVEL_CORE_ADDRESS,
} from "../scripts/level-compiler.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
const lifecycleSource = fs.readFileSync(path.join(root, "src/c/lifecycle.c"), "utf8");
const generatedSource = fs.readFileSync(
  path.join(root, "build/encounter-director-lifecycle-generated.s"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json"), "utf8"));

const labels = new Map();
for (const file of ["build/void-strike-65.lbl", "build/encounter-director.lbl",
  "build/integration-glue.lbl", "build/light-kernel.lbl"]) {
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
  // Light multiplicity step 1a (owner decision X): the whole Light C - tick,
  // admission, reload, schedule and hit - left the extension for the code
  // window at $B600, taking 332 B with it: 880 - 332 = 548. It had to: the SoA
  // slot indexing grew that code by 242 B, which overflowed LIGHT_CODE's run
  // window by 175 B. The freed tail is the point of the decision.
  // Step 1b then took light_publish and light_top out of LIGHT_CODE into the
  // kernel's own link, leaving only the shared debris publication: 548 - 136
  // = 412. What remains in LIGHT_CODE was never Light-only.
  // Step 2: lifecycle_c_init gained the appearance and ceiling reset, which is
  // the only Light-class code still in this composite: 412 + 36 = 448.
  // Step 3: the Light kernel's ASM grew past the 1,536-B code window by 143 B,
  // so the COLD admission path - free-slot search, appearance allocation,
  // light_admit, the escort admission, the ceiling and the live count - came
  // back here, into the tail owner decision X created. It runs on an admission
  // attempt, not every frame, so the window keeps the hot path: 448 + 417 = 865.
  // Step 4: the token primitive, the ceiling and the live count went to the
  // window with the hot path that asks them, taking the extension back to 829
  // and its free tail from 10 B - below the 16-B owner floor - to 70 B.
  // Then light_shot's gating needed window room, so light_ceiling came back
  // here beside light_admit, its only caller: 829 + 45 = 874, tail 25 B.
  // Owner fix (a), 2026-09-21: lifecycle_c_init clears the new published-slot
  // bound, which is three more bytes here - 874 + 3 = 877, tail 22 B. The
  // fix's own code went to the kernel and its byte to $8126; only the
  // initialiser lands in this composite.
  // Plan §4.6, 2026-09-21: the rotate gate's own byte went to $8127 the same
  // way, and lifecycle_c_init clears it too - 877 + 3 = 880, tail 19 B. The
  // gate's code (light_take_deferrable_token) is in the window, not here.
  // Heavy break-up, 2026-09-22 (plan-4.6-placement.md §7.4 variant 2): the
  // same shape a third time - its deferred-once bit went to $8128 and
  // lifecycle_c_init clears it, 880 + 3 = 883, tail 19 -> 16 B. The claim's own
  // code is in HYBRID_C_ARENA with the rest of the Heavy's C, and its ASM in
  // the pickup stream fill; only the initialiser lands in this composite.
  // Roadmap 4.6 step 2: the Light ceiling's three policy BYTES became the
  // armed wave's three, and light_ceiling itself became one call into the
  // Director's single answer, so lifecycle_c_init has less to restore and the
  // ceiling has less to decide: 883 - 9 = 874.
  assert.deepEqual(manifest.encounterDirector.director.placements.find(
    ({ name }) => name === "extension"), { name: "extension", runAddress: 0x8c7d, bytes: 874 });
  const window = manifest.residentCapacity.basicWindow;
  // Q-1 (owner, 2026-09-23): the window starts at $AE00, not $B600 - the level
  // buffer gave back 16 sectors and the window took them.
  assert.equal(window.address, 0xae00, "the Light C lives in the code window");
  assert.ok(window.usedBytes > 0 && window.usedBytes <= window.capacityBytes,
    `HYBRID_C_WINDOW holds ${window.usedBytes} of ${window.capacityBytes} B`);
  // 4.3 step 5: the drain clause left sector_c_update_first_capital for the
  // arena as sector_c_drain_clear, so the window composite loses 10 B.
  // Roadmap 4.6 step 2: sector_c_update_first_capital lost its frame gate -
  // the 16-bit compare against FIRST_CAPITAL_FRAME and the flag it raised -
  // because a CAPITAL sector raises CAPITAL_DUE when the row clock enters it:
  // 230 - 43 = 187.
  // RE-PINNED at roadmap 4.6 step 4 (plan §2.4, §8.2): the capital phase
  // machine reads its four phase starts from the level's HullGeometry page
  // instead of immediate constants, and capital entry starts the row clock at
  // 480 - hull_rows for a right-aligned short hull: 187 + 28 = 215 of the
  // segment's 248 B. It ships in an extension record, not the initial block.
  assert.deepEqual(manifest.encounterDirector.director.placements.find(
    ({ name }) => name === "window"), { name: "window", runAddress: 0x8602, bytes: 215 });
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

// RE-PINNED at roadmap 4.6 step 2. The capital used to become DUE at active
// gameplay frame 600 - a constant compiled into the runtime. It becomes DUE
// when the Director's ROW clock enters a CAPITAL sector (owner decision 3),
// and the entry half of the test - a drained playfield - is unchanged, which
// is the half that decides what the player sees.
test("first-capital scheduling and future boss handoff stay high-level C decisions", () => {
  const image = memory();
  const state = labels.get("CAPITAL_SECTOR_STATE");
  const flags = 0x80fe;
  run(image, "director_init", { a: 0x6d });
  // Level 1's first sector is 272 rows and the second is the capital.
  assert.equal(image[flags] & 0x80, 0, "the capital is not DUE while sector 1 runs");
  assert.equal(run(image, "sector_update_first_capital").a, 0);
  for (let row = 0; row < 271; row += 1) run(image, "director_world_row_tick");
  assert.equal(image[flags] & 0x80, 0, "not one row early");
  assert.equal(run(image, "sector_update_first_capital").a, 0);
  run(image, "director_world_row_tick");
  assert.equal(image[flags] & 0x80, 0x80, "row 272 enters the CAPITAL sector and raises DUE");
  // Unchanged: the entry still waits for a drained playfield.
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
  // Step 2 added _light_tick_body (so the appearance install can replace the
  // tick's return without swallowing the body) and the ceiling/live-count pair.
  // Step 3 adds _light_admit - THE one place a slot is filled, which plan §2.5
  // [C3] gates on the token at step 4 - and the free-slot and appearance-pair
  // searches it calls. _light_live_count appears twice: the wave stepper asks
  // it to decide when the lock lifts, and light_admit asks it against the
  // ceiling.
  // Step 4 adds _light_take_token, five times: the deferred breakup and the
  // appearance install in the tick, the admission, the fire cadence, and the
  // lethal hit. Those five ARE the consumer list of plan §2.5 with [C3]; a
  // sixth call here would be a consumer nobody reviewed.
  // Plan §4.6 (2026-09-21) re-shapes that list without lengthening it. The
  // DEFERRABLE two - the appearance install and the lethal hit's breakup spawn
  // - now claim through _light_take_deferrable_token, which adds the ring
  // -rotate test and then calls _light_take_token itself; the remaining three
  // direct claims are the admission, the fire cadence and light_admit's. The
  // deferred breakup's RETRY calls neither: the forcing rule makes the second
  // attempt ungated, which is what bounds the wait at two frames. So the
  // frozen list loses one claim site and gains none - four sites, the two
  // deferrable ones behind the gate wrapper, which tail-jumps into
  // _light_take_token rather than calling it.
  // 2026-09-22, plan-4.6-placement.md §7.4 variant 2, owner smoke 2026-09-21:
  // the HEAVY BREAK-UP is the FIFTH claim site and the THIRD deferrable one -
  // enemy_c_heavy_breakup_claim, in the arena. It is the consumer this pin
  // exists to make somebody review, and the owner reviewed it: visual only,
  // its position captured by begin_enemy_fighter_explosion_tail on the kill
  // frame, and forced within two frames by the ungated retry at
  // integration_update_enemy. Its own deferred-once bit is heavy_breakup_pending
  // at $8128. A SIXTH site would again be a consumer nobody reviewed.
  const jsrs = [...executableGenerated.matchAll(/\bjsr\s+([^\s;]+)/g)].map((match) => match[1]);
  // Owner fix (a): enemy_c_light_wave wraps _light_wave_step so the frame's
  // slot limit is derived on EVERY frame, not only while a wave is live.
  // RE-PINNED at roadmap 4.6 step 2, and the two changes are both retirements:
  // _encounter_light_schedule_advance is gone, because WHICH Light escorts a
  // formation is the WaveDef's escort byte and not a two-entry cycle; and
  // _encounter_light_admit no longer appears as a call because with the
  // schedule advance removed it is a single-caller leaf that cc65 inlines into
  // enemy_c_spawn_raiders. _light_ceiling is still called, and now tail-jumps
  // into the Director's one ceiling answer rather than choosing between three
  // policy bytes.
  assert.deepEqual(jsrs,
    ["_asm_sector_pressure_active", "_sector_c_drain_clear", "_heavy_publish_profile",
      "_bomber_may_fire", "_bomber_turn", "_bomber_turn", "_bomber_turn", "_bomber_may_fire",
      "_bomber_colour", "_light_tick_body",
      "_light_take_deferrable_token", "_light_take_deferrable_token",
      "_light_take_deferrable_token",
      "_light_wave_step", "_light_ceiling", "_light_live_count", "_light_free_slot",
      "_light_take_token", "_light_pair_for_record", "_light_reload",
      "_light_admit", "_light_live_count",
      "_light_take_token", "_light_reload"]);
  assert.equal(jsrs.filter((name) => name.startsWith("_light_take_")).length, 5,
    "exactly the five token claim sites of plan §2.5 with [C3], §4.6 and the Heavy break-up");
  assert.equal(jsrs.filter((name) => name === "_light_take_deferrable_token").length, 3,
    "exactly the three DEFERRABLE consumers: the install, the Light breakup spawn " +
    "and the Heavy break-up claim");
});

// ---------------------------------------------------------------------------
// Roadmap 4.6 step 2 - what a level file may ASK for, and what the runtime
// grants (docs/plans/director-4.6.md §5, §9 T5 and T6). The rule the whole
// format rests on is that a level may make the game easier than the runtime
// allows and never harder, and it is enforced three times: at build, at load
// and at admission. These two cover the admission half.
// ---------------------------------------------------------------------------

const hullAsset = defaultHullAsset();

function pokeSyntheticLevel(image, sectors) {
  const compiled = compileLevel({
    level: 1, seed: 109, hull: { length: 3, turrets: 3 }, sectors,
  }, { hullAsset, file: "synthetic.json" });
  image.set(compiled.pages.core, LEVEL_CORE_ADDRESS);
  return compiled;
}

test("T5: a SectorDef may ask for more Lights than its subtype admits, and the runtime clamps",
  () => {
    // ELITE admits one Light; the file asks for four. It is legal - the
    // compiler warns rather than rejecting - and the runtime grants one.
    const image = memory();
    const compiled = pokeSyntheticLevel(image, [{
      kind: "space", subtype: "elite", rows: 800,
      archetypes: ["interceptor"], lights: 4,
      hazards: { debris: 1 },
      waves: [{ row: 0, archetype: "interceptor", count: 8, spacing: 16, entry: 124 }],
    }]);
    assert.equal(compiled.warnings.length, 1, "the compiler warns about the clamped cap");
    assert.match(compiled.warnings[0], /asks for 4 Lights.*admits 1/);
    run(image, "director_init", { a: 0 });
    assert.equal(run(image, "director_light_ceiling").a, 1,
      "min(requested 4, ELITE ceiling 1)");

    // A SWARM sector asking for four gets the swarm ceiling of three - the
    // physical slot count is four, so the ceiling is doing the work.
    const swarm = memory();
    pokeSyntheticLevel(swarm, [{
      kind: "space", subtype: "swarm", rows: 800,
      archetypes: ["interceptor"], lights: 4,
      waves: [{ row: 0, archetype: "interceptor", count: 8, spacing: 16, entry: 124 }],
    }]);
    run(swarm, "director_init", { a: 0 });
    assert.equal(run(swarm, "director_light_ceiling").a, 3, "min(requested 4, SWARM ceiling 3)");

    // And a sector that asks for NONE gets none, however high the runtime
    // would have allowed: the clamp is a minimum, not an override.
    const quiet = memory();
    pokeSyntheticLevel(quiet, [{
      kind: "space", subtype: "swarm", rows: 800, archetypes: [], lights: 0,
    }]);
    run(quiet, "director_init", { a: 0 });
    assert.equal(run(quiet, "director_light_ceiling").a, 0);
  });

test("T6: a sector whose mask excludes an archetype never spawns it, and the validator agrees",
  () => {
    // The runtime half. Two sectors, the same Heavy wave; the first names the
    // Raider in its mask and the second does not. The wave's archetype byte is
    // identical, so the only thing deciding is the mask.
    const heavyWave = [{ row: 0, archetype: "raider", count: 4, spacing: 24, entry: 124 }];
    const image = memory();
    pokeSyntheticLevel(image, [
      { kind: "space", subtype: "elite", rows: 800, archetypes: ["raider"], heavies: 2,
        hazards: { debris: 1 }, waves: heavyWave },
    ]);
    image[labels.get("frame_counter")] = 10;
    image[labels.get("PLAYER_LIFECYCLE")] = 0;
    run(image, "director_init", { a: 0 });
    image[0x80ff] = 9;
    assert.equal(run(image, "director_request", { x: 0 }).x >= 0, true);
    assert.equal(image[0x80fc], 3, "the Raider wave spent one of its four formations");

    // Now the same wave in a sector whose mask holds only the Bomber. The
    // request is refused and the wave keeps all four: admission never spends a
    // formation it could not place.
    const masked = memory();
    pokeSyntheticLevel(masked, [
      { kind: "space", subtype: "elite", rows: 800, archetypes: ["bomber"], heavies: 2,
        hazards: { debris: 1 },
        waves: [{ row: 0, archetype: "bomber", count: 4, spacing: 24, entry: 124 }] },
    ]);
    run(masked, "director_init", { a: 0 });
    // Hand-edit the ARCHETYPE byte alone, leaving the mask as authored: this is
    // the state a corrupt or hostile page would present, and the runtime is the
    // last line that refuses it.
    masked[LEVEL_CORE_ADDRESS + 0x88] = 0;      // wave_archetype[0] -> Raider
    masked[labels.get("heavy_archetype_offset")] = 0;
    masked[labels.get("frame_counter")] = 10;
    masked[labels.get("PLAYER_LIFECYCLE")] = 0;
    masked[0x80ff] = 9;
    run(masked, "director_request", { x: 0 });
    assert.equal(masked[0x80fc], 4, "a masked archetype is refused and spends nothing");

    // The validator half: the same file is rejected at build time, so the
    // runtime's refusal is a backstop and not the only guard.
    assert.throws(() => compileLevel({
      level: 1, seed: 1, hull: { length: 3, turrets: 3 },
      sectors: [{ kind: "space", subtype: "elite", rows: 800, archetypes: ["bomber"],
        heavies: 2, waves: heavyWave }],
    }, { hullAsset, file: "masked.json" }), /outside the sector's archetype mask/);
  });
