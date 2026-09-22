// Owner rule (2026-09-18): destroying something awards score regardless of
// whether the player survives doing it, so a contact kill scores exactly what a
// shot kill scores. Interactive debris awards DEBRIS_SCORE,
// difficulty-independent, on the lethal player shot and on the lethal player
// contact alike. Every other release path — the despawn path, the fall past
// ENTITY_GAMEPLAY_BOTTOM and the sector DRAIN/COMPLETE release — must still
// leave the score untouched.
//
// OWNER DECISION 2026-09-22 — THE DEBRIS REWARD GOES UP. Debris is hard to hit
// and tough, and that stays; DEBRIS_SCORE is $05 -> $25, twenty-five points
// packed BCD, for a shot kill and a ram kill alike. Every pin below that
// carried the old $05 is re-recorded for that reason and no other. Nothing
// else about debris changes: HP, spawn rates and contact damage are untouched.
//
// The second half of the same decision is the weapon-pickup capsule: a debris
// SHOT kill now counts toward it exactly like a qualified enemy kill, a RAM
// kill does not, and a debris kill that completes the count spawns the capsule
// at the DEBRIS position rather than at the enemy explosion slot's X. Those
// four tests are at the foot of this file.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installBootArtifact } from "../scripts/runtime-image.mjs";
import { executeDebrisDestructionTrace } from "../scripts/debris-destruction-runtime.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const labels = new Map(
  fs.readFileSync(path.join(root, "build", "void-strike-65.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

const DEBRIS_SCORE = 0x25;   // owner decision 2026-09-22: 25 points
const PLAYER_ALIVE = 0;
const WEAPON_BOOSTER_SLOT = 2;   // build/entity-effects.inc
const BROAD_PLAYER_HEALTH = 0x4e5d;

function at(name) {
  const address = labels.get(name);
  assert.ok(Number.isInteger(address), `missing linked label ${name}`);
  return address;
}

function run(memory, name) {
  const cpu = new Nmos6502(memory, {});
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = at(name);
  for (let steps = 0; steps < 300_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
}

// Same resident expansion the debris destruction harness performs, so the C
// arena (DIRECTOR_RELEASE) and the ENTITY_CODE renderers are both live.
function bootedMemory() {
  const memory = new Uint8Array(0x10000);
  installBootArtifact(memory, root, "xex");
  run(memory, "stage_boot_streams");
  run(memory, "unpack_resident_runtime");
  run(memory, "unpack_entity_runtime");
  if (labels.has("publish_director_abi")) run(memory, "publish_director_abi");
  run(memory, "stage_a2_kernel");
  run(memory, "init_entity_effects");
  run(memory, "unpack_weapon_pickup_phase_runtime");
  run(memory, "unpack_starfield_runtime");
  memory.set(fs.readFileSync(path.join(root, "build", "integration-glue.bin")), 0x4efe);
  memory.fill(0, 0x80f4, 0x8110);
  memory[0x80fb] = 0x6d;
  memory[0x80fc] = 0xff;
  memory[0x80f6] = 3;
  memory[0x80f9] = 0;
  memory[0x80fa] = 0;
  memory[0x80ff] = 0xff;
  return memory;
}

function armDebris(memory, { hp }) {
  memory[at("ENTITY_ACTIVE_MASK")] = 1;
  memory[at("ENTITY_ACTIVE_COUNT")] = 1;
  memory[at("ENTITY_TYPE")] = 1;
  memory[at("ENTITY_STATE")] = 1;
  memory[at("ENTITY_FLAGS")] = 0x3f;
  memory[at("ENTITY_X")] = 124;
  memory[at("ENTITY_Y")] = 100;
  memory[at("ENTITY_HP")] = hp;
  memory[at("score_bcd_lo")] = 0x42;
  memory[at("score_bcd_hi")] = 0x07;
}

const score = (memory) => memory[at("score_bcd_hi")] << 8 | memory[at("score_bcd_lo")];

test("the lethal player shot awards DEBRIS_SCORE through the existing mechanism", () => {
  const trace = executeDebrisDestructionTrace({ artifact: "xex" });
  const pre = trace.records[0];
  assert.equal(pre.scoreHi << 8 | pre.scoreLo, 0x0742);

  // Non-lethal hits leave the score alone; only the destroying frame adds.
  const nonLethal = trace.records.filter((record) => record.phase.startsWith("HIT_"));
  assert.ok(nonLethal.length > 0);
  for (const record of nonLethal) {
    assert.equal(record.scoreHi << 8 | record.scoreLo, 0x0742,
      `${record.phase}/${record.frame} must not score`);
  }

  const final = trace.records.filter((record) => record.phase === "FINAL");
  assert.equal(final[0].debrisActive & 1, 0, "the third hit must destroy the debris");
  for (const record of final) {
    assert.equal(record.scoreHi << 8 | record.scoreLo, 0x0767,
      `${record.phase}/${record.frame} must hold exactly one DEBRIS_SCORE award`);
  }
  // Packed BCD, so the delta is the literal constant.
  assert.equal(0x0767 - 0x0742, DEBRIS_SCORE);
});

test("a non-lethal player shot on debris does not score", () => {
  const memory = bootedMemory();
  armDebris(memory, { hp: 2 });
  run(memory, "entity_debris_hit");
  assert.equal(memory[at("ENTITY_HP")], 1);
  assert.equal(score(memory), 0x0742);
});

// Inverted on 2026-09-18: the owner made scoring independent of the player
// surviving the kill. All four enemy archetypes already converged their shot
// and contact paths before the score call; debris was the last object that did
// not, so a contact kill awarded nothing. It now awards DEBRIS_SCORE.
test("player contact destroying the debris awards the same DEBRIS_SCORE", () => {
  const memory = bootedMemory();
  armDebris(memory, { hp: 1 });
  memory[at("player_x")] = 124;
  memory[at("player_y")] = 100;
  memory[at("DIFFICULTY_SETTING")] = 1;
  memory[at("PLAYER_LIFECYCLE")] = PLAYER_ALIVE;
  memory[BROAD_PLAYER_HEALTH] = 10;
  memory[at("BROAD_DAMAGE_COOLDOWN")] = 0;
  memory[at("BROAD_DAMAGE_APPLIED")] = 0;
  memory[at("ENTITY_STATE") + WEAPON_BOOSTER_SLOT] = 0;
  run(memory, "entity_collide_player");
  assert.equal(memory[at("ENTITY_ACTIVE_MASK")] & 1, 0, "contact must release the debris");
  assert.ok(memory[BROAD_PLAYER_HEALTH] < 10, "contact must still damage the player");
  assert.equal(score(memory), 0x0767, "a contact kill awards exactly one DEBRIS_SCORE");
  assert.equal(0x0767 - 0x0742, DEBRIS_SCORE);
});

test("the despawn path does not score", () => {
  const memory = bootedMemory();
  armDebris(memory, { hp: 3 });
  run(memory, "entity_despawn_debris");
  assert.equal(memory[at("ENTITY_ACTIVE_MASK")] & 1, 0);
  assert.equal(score(memory), 0x0742);
});

// Deliberate contract change (2026-09-18): the single-call-site assertion below
// became a two-call-site assertion when the owner rule added the contact award.
// The two sites are the only player-caused destructions of debris; the despawn,
// fall-through and sector-boundary releases reach integration_debris_release
// without passing either.
test("only the two player-caused destruction paths call add_debris_score", () => {
  const callers = source.split(/\r?\n/)
    .filter((line) => /\b(jsr|jmp)\s+add_debris_score\b/.test(line));
  assert.equal(callers.length, 2, "add_debris_score must have exactly two call sites");
  // Re-recorded 2026-09-22: the shot path reaches add_debris_score through
  // debris_shot_reward, which is where the capsule count lives. The contact
  // path is untouched, which is exactly what makes a ram kill not count.
  assert.match(source,
    /entity_debris_destroyed:\s*\n\s*jsr spawn_debris_destruction_effects\s*\n\s*jsr integration_debris_release\s*\n\s*jsr debris_shot_reward/);
  assert.match(source, /debris_shot_reward:\s*\n\s*jsr add_debris_score/);
  // The contact site is a three-byte BROADSIDE prologue that falls through into
  // the unchanged release wrapper, so ENTITY_CODE stays size-neutral.
  assert.match(source,
    /debris_contact_destroyed:\s*\n\s*jsr add_debris_score\s*\nintegration_debris_release:/);
  assert.match(source, /entity_damage_applied:(?:\s*\n\s*;[^\n]*)*\s*\n\s*jmp debris_contact_destroyed/);
  // The shared mechanism: packed-BCD add then the shared HUD refresh, exactly
  // as light_add_score / add_archetype_score_tail do.
  assert.match(source,
    /add_debris_score:\s*\n\s*sed\s*\n\s*clc\s*\n\s*lda score_bcd_lo\s*\n\s*adc #DEBRIS_SCORE\s*\n\s*sta score_bcd_lo\s*\n\s*lda score_bcd_hi\s*\n\s*adc #\$00\s*\n\s*sta score_bcd_hi\s*\n\s*cld\s*\n\s*jmp update_score_display/);
  assert.match(source, /^DEBRIS_SCORE = \$25$/m);
  // Difficulty-independent: no difficulty table feeds the debris award.
  assert.doesNotMatch(source, /add_debris_score:[\s\S]{0,200}?DIFFICULTY_SETTING/);
});

// ---------------------------------------------------------------------------
// THE DEBRIS REWARD'S SECOND HALF — the weapon-pickup capsule.
// Owner decision 2026-09-22: a debris SHOT kill counts toward the capsule
// exactly like a qualified enemy kill; a RAM kill does not. Every test below
// was RED before that decision was implemented — the debris paths did not
// touch the counter at all.
const WEAPON_PICKUP_SLOT = 1;            // build/entity-effects.inc
const WEAPON_PICKUP_QUALIFIED_KILLS = 3;
const WEAPON_PICKUP_STATE_PENDING = 1;
const WEAPON_PICKUP_WIDTH_HPOS = 8;
const WEAPON_PICKUP_SPAWN_TOP = 8;

const capsuleCount = (memory) => memory[at("ENTITY_HP") + WEAPON_PICKUP_SLOT];
const capsuleState = (memory) => memory[at("ENTITY_STATE") + WEAPON_PICKUP_SLOT];


function armedShotKill(memory, { x = 124 } = {}) {
  armDebris(memory, { hp: 1 });
  memory[at("ENTITY_X")] = x;
  run(memory, "entity_debris_destroyed");
}

function armedRamKill(memory, { x = 124 } = {}) {
  armDebris(memory, { hp: 1 });
  memory[at("ENTITY_X")] = x;
  memory[at("player_x")] = x;
  memory[at("player_y")] = 100;
  memory[at("DIFFICULTY_SETTING")] = 1;
  memory[at("PLAYER_LIFECYCLE")] = PLAYER_ALIVE;
  memory[BROAD_PLAYER_HEALTH] = 10;
  memory[at("BROAD_DAMAGE_COOLDOWN")] = 0;
  memory[at("BROAD_DAMAGE_APPLIED")] = 0;
  memory[at("ENTITY_STATE") + WEAPON_BOOSTER_SLOT] = 0;
  run(memory, "entity_collide_player");
}

test("a debris shot kill adds 25 points", () => {
  const memory = bootedMemory();
  armedShotKill(memory);
  assert.equal(memory[at("ENTITY_ACTIVE_MASK")] & 1, 0, "the shot must release the debris");
  assert.equal(score(memory) - 0x0742, DEBRIS_SCORE, "packed BCD: 25 points");
  assert.equal(DEBRIS_SCORE, 0x25);
});

test("a debris ram kill adds the same 25 points", () => {
  const memory = bootedMemory();
  armedRamKill(memory);
  assert.equal(memory[at("ENTITY_ACTIVE_MASK")] & 1, 0, "contact must release the debris");
  assert.ok(memory[BROAD_PLAYER_HEALTH] < 10, "contact must still damage the player");
  assert.equal(score(memory) - 0x0742, DEBRIS_SCORE,
    "the existing owner rule: a contact awards what a shot awards");
});

test("a debris SHOT kill counts toward the capsule and a RAM kill does not", () => {
  const shot = bootedMemory();
  assert.equal(capsuleCount(shot), 0, "the harness starts with an empty count");
  armedShotKill(shot);
  assert.equal(capsuleCount(shot), 1, "a shot kill is a qualified kill");

  const ram = bootedMemory();
  armedRamKill(ram);
  assert.equal(capsuleCount(ram), 0, "a ram kill must not advance the capsule count");
  assert.equal(capsuleState(ram), 0, "and must not spawn a capsule");
});

test("a debris kill that completes the count spawns the capsule at the debris X", () => {
  const memory = bootedMemory();
  const debrisX = 124;
  for (let kill = 1; kill <= WEAPON_PICKUP_QUALIFIED_KILLS; kill += 1) {
    armedShotKill(memory, { x: debrisX });
    if (kill < WEAPON_PICKUP_QUALIFIED_KILLS) {
      assert.equal(capsuleCount(memory), kill, `kill ${kill} advances the count`);
      assert.equal(capsuleState(memory), 0, `kill ${kill} must not spawn yet`);
    }
  }
  assert.equal(capsuleState(memory), WEAPON_PICKUP_STATE_PENDING,
    "the third qualified kill spawns one pending capsule");
  assert.equal(capsuleCount(memory), 0, "and resets the count");
  assert.equal(memory[at("ENTITY_Y") + WEAPON_PICKUP_SLOT], WEAPON_PICKUP_SPAWN_TOP);
  // Debris is two cells wide, so the shared +4 centring is its exact centre.
  // Before the decision the spawn read FIGHTER_EXPLOSION_X + ENEMY_SLOT, which
  // a debris kill never writes, so it landed wherever the last enemy died.
  assert.equal(memory[at("ENTITY_X") + WEAPON_PICKUP_SLOT], debrisX + 4,
    "the capsule must spawn at the debris, not at the enemy explosion slot");
  assert.notEqual(memory[at("FIGHTER_EXPLOSION_X") + 1], debrisX + 4,
    "and the Heavy kill snapshot must be untouched by a debris kill");
});

test("the capsule is clamped into the entity corridor at both edges", () => {
  // Same clamp the enemy path has always used; only the X fed into it is new.
  const clamped = (debrisX) => {
    const memory = bootedMemory();
    for (let kill = 0; kill < WEAPON_PICKUP_QUALIFIED_KILLS; kill += 1) {
      armedShotKill(memory, { x: debrisX });
    }
    assert.equal(capsuleState(memory), WEAPON_PICKUP_STATE_PENDING);
    return memory[at("ENTITY_X") + WEAPON_PICKUP_SLOT];
  };
  const left = clamped(0x00);
  const right = clamped(0xf0);
  assert.ok(left > 0x04, `a far-left debris must be clamped inward, got ${left}`);
  assert.ok(right < 0xf4, `a far-right debris must be clamped inward, got ${right}`);
  assert.ok(left + WEAPON_PICKUP_WIDTH_HPOS <= right + WEAPON_PICKUP_WIDTH_HPOS);
  // The clamp is a real one: neither edge is the raw debris position.
  assert.notEqual(left, 0x04);
  assert.notEqual(right, 0xf4);
});

test("nothing else about debris changed: HP, contact damage and the one-capsule rule", () => {
  // HP: three PlayerFighter hits, as before.
  const memory = bootedMemory();
  armDebris(memory, { hp: 3 });
  run(memory, "entity_debris_hit");
  assert.equal(memory[at("ENTITY_HP")], 2, "debris HP policy is unchanged");
  assert.equal(score(memory), 0x0742, "a non-lethal hit still scores nothing");
  assert.equal(capsuleCount(memory), 0, "a non-lethal hit is not a qualified kill");

  // The one-capsule-at-a-time rule: a live or pending capsule refuses the count,
  // the same test resolve_enemy_damage makes before its own call.
  const busy = bootedMemory();
  busy[at("ENTITY_STATE") + WEAPON_PICKUP_SLOT] = WEAPON_PICKUP_STATE_PENDING;
  armedShotKill(busy);
  assert.equal(capsuleCount(busy), 0,
    "a shot kill while a capsule is pending must not advance the count");
  assert.equal(score(busy) - 0x0742, DEBRIS_SCORE, "but it still scores");
});
